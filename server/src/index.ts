import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
  GameAction,
  GameState,
} from "./types";
import { RoomManager } from "./models/RoomManager";
import {
  movePiece,
  rotatePiece,
  hardDrop,
  lockPiece,
  holdPiece,
  isValidPosition,
  addGarbageRow,
} from "./game/tetris";

const app = express();
const server = createServer(app);
const io = new Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>(server, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:5174"], // Vite dev server
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"], // Explicitly allow both transports
  allowEIO3: true, // Allow older Engine.IO clients
  pingTimeout: 60000, // 60 seconds
  pingInterval: 25000, // 25 seconds
  connectTimeout: 45000, // 45 seconds
  upgradeTimeout: 10000, // 10 seconds
  maxHttpBufferSize: 1e6, // 1MB
  allowRequest: (req, fn) => {
    // Accept all connections for now
    fn(null, true);
  },
});

app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:5174"],
  })
);

app.use(express.json());

const roomManager = new RoomManager();
const gameLoops = new Map<string, NodeJS.Timeout>();

// Basic health check endpoint
app.get("/health", (req, res) => {
  const stats = roomManager.getRoomStats();
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    ...stats,
  });
});

// Add error handling for Socket.IO server
io.on("connection", (socket) => {
  console.log(`✅ User connected: ${socket.id}`);
  console.log(`🔌 Transport: ${socket.conn.transport.name}`);

  // Handle transport upgrades
  socket.conn.on("upgrade", () => {
    console.log(
      `⬆️ Socket ${socket.id} upgraded to: ${socket.conn.transport.name}`
    );
  });

  // Handle transport errors
  socket.conn.on("error", (error) => {
    console.error(`🔥 Transport error for ${socket.id}:`, error);
  });

  // Handle socket errors
  socket.on("error", (error) => {
    console.error(`🔥 Socket error for ${socket.id}:`, error);
  });

  socket.on("create_room", (playerName, callback) => {
    try {
      const room = roomManager.createRoom(playerName);
      const creator = Array.from(room.players.values())[0];

      socket.data.playerId = creator.id;
      socket.data.roomId = room.id;

      socket.join(room.id);

      callback({
        success: true,
        roomCode: room.code,
      });

      // Send room state to the creator
      socket.emit("room_joined", {
        id: room.id,
        code: room.code,
        gameState: room.gameState,
        isGameActive: room.isGameActive,
        maxPlayers: room.maxPlayers,
        createdAt: room.createdAt,
        dropInterval: room.dropInterval,
        gameStartTime: room.gameStartTime,
        lastSpeedIncrease: room.lastSpeedIncrease,
        players: Array.from(room.players.values()),
      });

      console.log(
        `Room created: ${room.code} by ${playerName} (ID: ${room.id})`
      );
    } catch (error) {
      console.error("Error creating room:", error, "for player:", playerName);
      callback({
        success: false,
        error: "Failed to create room",
      });
    }
  });

  socket.on("join_room", (roomCode, playerName, callback) => {
    try {
      console.log(
        `🔍 Join room request: code="${roomCode}", player="${playerName}"`
      );

      // Debug: Show current rooms
      const roomStats = roomManager.getRoomStats();
      console.log(
        `📊 Current server state: ${roomStats.totalRooms} rooms, ${roomStats.totalPlayers} players`
      );

      const result = roomManager.joinRoom(roomCode, playerName);

      if (!result.success) {
        console.log(`❌ Join room failed: ${result.error}`);
        callback({ success: false, error: result.error });
        return;
      }

      const { room, player } = result;

      socket.data.playerId = player!.id;
      socket.data.roomId = room!.id;

      socket.join(room!.id);

      callback({ success: true });

      // Notify all players in the room
      io.to(room!.id).emit("room_joined", {
        id: room!.id,
        code: room!.code,
        gameState: room!.gameState,
        isGameActive: room!.isGameActive,
        maxPlayers: room!.maxPlayers,
        createdAt: room!.createdAt,
        dropInterval: room!.dropInterval,
        gameStartTime: room!.gameStartTime,
        lastSpeedIncrease: room!.lastSpeedIncrease,
        players: Array.from(room!.players.values()),
      });

      console.log(
        `✅ Player ${playerName} joined room ${roomCode} (ID: ${room!.id})`
      );
    } catch (error) {
      console.error("💥 Error joining room:", error, "for player:", playerName);
      callback({
        success: false,
        error: "Failed to join room",
      });
    }
  });

  socket.on("leave_room", () => {
    if (socket.data.roomId && socket.data.playerId) {
      const room = roomManager.getRoom(socket.data.roomId);

      roomManager.leaveRoom(socket.data.roomId, socket.data.playerId);
      socket.leave(socket.data.roomId);

      // Notify other players
      socket.to(socket.data.roomId).emit("room_left", socket.data.playerId);

      // Stop game loop if room is empty
      const gameLoop = gameLoops.get(socket.data.roomId);
      if (gameLoop && (!room || room.players.size === 0)) {
        clearInterval(gameLoop);
        gameLoops.delete(socket.data.roomId);
      }

      socket.data.roomId = "";
      socket.data.playerId = "";

      console.log(`Player left room`);
    }
  });

  socket.on("player_ready", (isReady) => {
    if (socket.data.roomId && socket.data.playerId) {
      const success = roomManager.setPlayerReady(
        socket.data.roomId,
        socket.data.playerId,
        isReady
      );

      if (success) {
        const room = roomManager.getRoom(socket.data.roomId);

        // Notify all players
        io.to(socket.data.roomId).emit(
          "player_ready",
          socket.data.playerId,
          isReady
        );

        // Start game if all players are ready
        if (room && room.gameState === GameState.READY) {
          console.log(
            `🚀 Auto-starting game in room ${room.code} in 1 second...`
          );
          setTimeout(() => {
            const currentRoom = roomManager.getRoom(socket.data.roomId);
            if (currentRoom && currentRoom.gameState === GameState.READY) {
              if (roomManager.startGame(socket.data.roomId)) {
                io.to(socket.data.roomId).emit("game_started");
                startGameLoop(socket.data.roomId);
                console.log(`✅ Game auto-started in room ${currentRoom.code}`);
              } else {
                console.log(
                  `❌ Failed to auto-start game in room ${currentRoom.code}`
                );
              }
            } else {
              console.log(
                `⚠️ Room state changed, canceling auto-start for room ${room.code}`
              );
            }
          }, 1000); // Small delay for UI feedback
        } else if (room) {
          console.log(
            `⏳ Room ${room.code} not ready yet (state: ${room.gameState}, players: ${room.players.size})`
          );
        }
      } else {
        console.log(
          `❌ Failed to set player ready state for ${socket.data.playerId}`
        );
      }
    }
  });

  // Add manual start game event
  socket.on("start_game", () => {
    if (socket.data.roomId && socket.data.playerId) {
      const room = roomManager.getRoom(socket.data.roomId);

      if (!room) {
        console.log(
          `❌ Room not found for manual start: ${socket.data.roomId}`
        );
        return;
      }

      // Check if player is allowed to start (room creator for new games or finished games)
      const playerIds = Array.from(room.players.keys());
      const isCreator = playerIds[0] === socket.data.playerId; // First player is creator
      const allReady = room.gameState === GameState.READY;
      const gameFinished = room.gameState === GameState.FINISHED;

      if (
        room.players.size >= 1 &&
        (allReady || isCreator || (gameFinished && isCreator))
      ) {
        console.log(
          `🎮 Manual game start/restart requested by ${socket.data.playerId} in room ${room.code}`
        );

        if (roomManager.startGame(socket.data.roomId)) {
          console.log(
            `🚀 Game started manually, emitting game_started event for room ${room.code}`
          );
          io.to(socket.data.roomId).emit("game_started");
          startGameLoop(socket.data.roomId);
          console.log(`✅ Game manually started in room ${room.code}`);
        } else {
          console.log(`❌ Failed to manually start game in room ${room.code}`);
        }
      } else {
        console.log(
          `⚠️ Manual start denied for room ${room.code}: minPlayers=${
            room.players.size >= 1
          }, allReady=${allReady}, isCreator=${isCreator}`
        );
      }
    }
  });

  // Add pause game event handler
  socket.on("pause_game", () => {
    if (socket.data.roomId && socket.data.playerId) {
      const room = roomManager.getRoom(socket.data.roomId);

      if (!room) {
        console.log(`❌ Room not found for pause: ${socket.data.roomId}`);
        return;
      }

      // Only allow pausing if the game is in playing state
      if (room.gameState !== GameState.PLAYING) {
        console.log(
          `⚠️ Cannot pause game in room ${room.code}: current state is ${room.gameState}`
        );
        return;
      }

      if (roomManager.pauseGame(socket.data.roomId)) {
        console.log(
          `⏸️ Game paused in room ${room.code} by ${socket.data.playerId}`
        );

        // Notify all players in the room
        io.to(socket.data.roomId).emit("game_paused");

        // Pause the game loop by not scheduling the next tick
        const gameLoop = gameLoops.get(socket.data.roomId);
        if (gameLoop) {
          clearTimeout(gameLoop);
          gameLoops.delete(socket.data.roomId);
          console.log(`⏸️ Game loop paused for room ${room.code}`);
        }
      } else {
        console.log(`❌ Failed to pause game in room ${room.code}`);
      }
    }
  });

  // Add resume game event handler
  socket.on("resume_game", () => {
    if (socket.data.roomId && socket.data.playerId) {
      const room = roomManager.getRoom(socket.data.roomId);

      if (!room) {
        console.log(`❌ Room not found for resume: ${socket.data.roomId}`);
        return;
      }

      // Only allow resuming if the game is in paused state
      if (room.gameState !== GameState.PAUSED) {
        console.log(
          `⚠️ Cannot resume game in room ${room.code}: current state is ${room.gameState}`
        );
        return;
      }

      if (roomManager.resumeGame(socket.data.roomId)) {
        console.log(
          `▶️ Game resumed in room ${room.code} by ${socket.data.playerId}`
        );

        // Notify all players in the room
        io.to(socket.data.roomId).emit("game_resumed");

        // Restart the game loop
        startGameLoop(socket.data.roomId);
        console.log(`▶️ Game loop resumed for room ${room.code}`);
      } else {
        console.log(`❌ Failed to resume game in room ${room.code}`);
      }
    }
  });

  // Handler for adding garbage rows to players after another player clears lines
  socket.on("apply_garbage", () => {
    if (socket.data.roomId && socket.data.playerId) {
      const room = roomManager.getRoom(socket.data.roomId);

      if (!room || room.gameState !== GameState.PLAYING) return;

      const currentPlayer = room.players.get(socket.data.playerId);
      if (!currentPlayer || currentPlayer.isGameOver) return;

      // Add a garbage row to the player's board
      currentPlayer.gameBoard = addGarbageRow(currentPlayer.gameBoard);

      // Check if the garbage row causes game over for the player
      if (
        currentPlayer.currentPiece &&
        !isValidPosition(currentPlayer.gameBoard, currentPlayer.currentPiece)
      ) {
        currentPlayer.isGameOver = true;
        io.to(socket.data.roomId).emit("player_lost", currentPlayer.id);

        // Check if game should end
        const alivePlayers = Array.from(room.players.values()).filter(
          (p) => !p.isGameOver
        );
        if (alivePlayers.length <= 1) {
          const winner = alivePlayers[0];
          roomManager.endGame(socket.data.roomId, winner?.id);

          const gameLoop = gameLoops.get(socket.data.roomId);
          if (gameLoop) {
            clearInterval(gameLoop);
            gameLoops.delete(socket.data.roomId);
          }

          io.to(socket.data.roomId).emit("game_ended", winner?.id);
          console.log(
            `Game ended in room ${room.code}, winner: ${winner?.name || "none"}`
          );
        }
      }

      // Update all players with the new game state
      io.to(socket.data.roomId).emit("game_state_update", {
        players: Array.from(room.players.values()),
      });
    }
  });

  socket.on("game_action", (action: GameAction) => {
    if (socket.data.roomId && socket.data.playerId) {
      const room = roomManager.getRoom(socket.data.roomId);

      if (!room || room.gameState !== GameState.PLAYING) return;

      const player = room.players.get(socket.data.playerId);
      if (!player || player.isGameOver) return;

      let actionResult = false;

      switch (action.type) {
        case "MOVE_LEFT":
          actionResult = movePiece(player, "left");
          break;
        case "MOVE_RIGHT":
          actionResult = movePiece(player, "right");
          break;
        case "MOVE_DOWN":
          actionResult = movePiece(player, "down");
          if (!actionResult) {
            // Piece couldn't move down, lock it
            const lockResult = lockPiece(player, socket.data.roomId, io, () => {
              // Send updated game state after animation completes
              const room = roomManager.getRoom(socket.data.roomId);
              if (room) {
                io.to(socket.data.roomId).emit("game_state_update", {
                  players: Array.from(room.players.values()),
                });
              }
            });
            actionResult = !lockResult.gameOver;
          }
          break;
        case "ROTATE":
          actionResult = rotatePiece(player);
          break;
        case "HARD_DROP":
          const dropResult = hardDrop(player, socket.data.roomId, io, () => {
            // Send updated game state after animation completes
            const room = roomManager.getRoom(socket.data.roomId);
            if (room) {
              io.to(socket.data.roomId).emit("game_state_update", {
                players: Array.from(room.players.values()),
              });
            }
          });
          actionResult = !dropResult.gameOver;
          break;
        case "HOLD":
          actionResult = holdPiece(player);
          break;
      }

      // Send updated game state to all players
      io.to(socket.data.roomId).emit("game_state_update", {
        players: Array.from(room.players.values()),
      });

      // Check if player lost
      if (player.isGameOver) {
        io.to(socket.data.roomId).emit("player_lost", player.id);

        // Check if game should end
        const alivePlayers = Array.from(room.players.values()).filter(
          (p) => !p.isGameOver
        );
        if (alivePlayers.length <= 1) {
          const winner = alivePlayers[0];
          roomManager.endGame(socket.data.roomId, winner?.id);

          const gameLoop = gameLoops.get(socket.data.roomId);
          if (gameLoop) {
            clearInterval(gameLoop);
            gameLoops.delete(socket.data.roomId);
          }

          io.to(socket.data.roomId).emit("game_ended", winner?.id);
          console.log(
            `Game ended in room ${room.code}, winner: ${winner?.name || "none"}`
          );
        }
      }
    }
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);

    // Clean up player from room
    if (socket.data.roomId && socket.data.playerId) {
      roomManager.leaveRoom(socket.data.roomId, socket.data.playerId);
      socket.to(socket.data.roomId).emit("room_left", socket.data.playerId);

      // Stop game loop if room is empty
      const room = roomManager.getRoom(socket.data.roomId);
      const gameLoop = gameLoops.get(socket.data.roomId);
      if (gameLoop && (!room || room.players.size === 0)) {
        clearInterval(gameLoop);
        gameLoops.delete(socket.data.roomId);
      }
    }
  });
});

function startGameLoop(roomId: string) {
  console.log(`🎮 Starting game loop for room ${roomId}`);

  let gameLoop: NodeJS.Timeout;
  let currentInterval = 1000; // Start with 1 second

  const runGameTick = () => {
    const room = roomManager.getRoom(roomId);
    if (
      !room ||
      (room.gameState !== GameState.PLAYING &&
        room.gameState !== GameState.PAUSED)
    ) {
      console.log(
        `🛑 Game loop stopping for room ${roomId}: room=${!!room}, gameState=${
          room?.gameState
        }`
      );
      if (gameLoop) clearTimeout(gameLoop);
      gameLoops.delete(roomId);
      return;
    }

    // If game is paused, just maintain the loop without processing
    if (room.gameState === GameState.PAUSED) {
      console.log(`⏸️ Game is paused in room ${room.code}, skipping tick`);
      gameLoop = setTimeout(runGameTick, 1000); // Check again after 1 second
      gameLoops.set(roomId, gameLoop);
      return;
    }

    // Check if speed should be increased
    const speedIncreased = roomManager.checkAndUpdateDropSpeed(roomId);
    if (speedIncreased) {
      // Update current interval to match room's new drop interval
      currentInterval = room.dropInterval;
      console.log(
        `🚀 Game loop speed updated for room ${room.code}: ${currentInterval}ms`
      );

      // Notify clients about speed increase
      const speedLevel = Math.max(
        1,
        Math.min(10, Math.round((1000 - room.dropInterval) / 100) + 1)
      );
      io.to(roomId).emit("speed_increased", {
        dropInterval: room.dropInterval,
        speedLevel: speedLevel,
      });

      // Also send updated room data
      io.to(roomId).emit("room_joined", {
        id: room.id,
        code: room.code,
        gameState: room.gameState,
        isGameActive: room.isGameActive,
        maxPlayers: room.maxPlayers,
        createdAt: room.createdAt,
        dropInterval: room.dropInterval,
        gameStartTime: room.gameStartTime,
        lastSpeedIncrease: room.lastSpeedIncrease,
        players: Array.from(room.players.values()),
      });
    }

    console.log(
      `🔄 Game loop tick for room ${room.code}, players:`,
      room.players.size
    );
    let gameStateChanged = false;

    // Move pieces down for all players
    room.players.forEach((player) => {
      if (!player.isGameOver && player.currentPiece) {
        console.log(
          `🧱 Moving piece down for ${
            player.name
          }: currentPiece=${!!player.currentPiece}, type=${
            player.currentPiece?.type
          }, pos=(${player.currentPiece?.x}, ${player.currentPiece?.y})`
        );
        const moved = movePiece(player, "down");
        console.log(`🧱 Move result for ${player.name}: moved=${moved}`);
        if (!moved) {
          // Piece couldn't move down, lock it
          console.log(`🔒 Locking piece for ${player.name}`);
          const lockResult = lockPiece(player, roomId, io, () => {
            // Send updated game state after animation completes
            const room = roomManager.getRoom(roomId);
            if (room) {
              io.to(roomId).emit("game_state_update", {
                players: Array.from(room.players.values()),
              });
            }
          });
          gameStateChanged = true;
        } else {
          gameStateChanged = true; // Also mark as changed when piece moves
        }
      } else {
        console.log(
          `⏭️ Skipping ${player.name}: gameOver=${
            player.isGameOver
          }, hasPiece=${!!player.currentPiece}`
        );
      }
    });

    if (gameStateChanged) {
      console.log(`📡 Sending game state update for room ${room.code}`);
      // Send updated game state
      io.to(roomId).emit("game_state_update", {
        players: Array.from(room.players.values()),
      });

      // Check for game over conditions
      const alivePlayers = Array.from(room.players.values()).filter(
        (p) => !p.isGameOver
      );

      // For single player: end when player is game over
      // For multiplayer: end when 1 or fewer players remain
      const shouldEndGame =
        room.players.size === 1
          ? alivePlayers.length === 0 // Single player: end when they're game over
          : alivePlayers.length <= 1; // Multiplayer: end when 1 or fewer remain

      if (shouldEndGame) {
        const winner = alivePlayers[0];
        roomManager.endGame(roomId, winner?.id);

        if (gameLoop) clearTimeout(gameLoop);
        gameLoops.delete(roomId);

        io.to(roomId).emit("game_ended", winner?.id);
        console.log(
          `🏁 Game loop ended for room ${room.code} - alivePlayers: ${alivePlayers.length}, totalPlayers: ${room.players.size}`
        );
        return;
      }
    } else {
      console.log(`⏸️ No game state changes for room ${room.code}`);
    }

    // Schedule next tick with current interval (may have changed)
    gameLoop = setTimeout(runGameTick, currentInterval);
  };

  // Start the first tick
  gameLoop = setTimeout(runGameTick, currentInterval);
  gameLoops.set(roomId, gameLoop);
}

// Cleanup old rooms every hour
setInterval(() => {
  roomManager.cleanupOldRooms(24);
}, 60 * 60 * 1000);

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
