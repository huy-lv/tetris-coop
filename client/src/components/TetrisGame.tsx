import React, { useState, useEffect, useCallback, useRef } from "react";
import styled from "styled-components";
import { motion, AnimatePresence } from "framer-motion";
import { useSocket } from "../hooks/useSocket";
import type { Player, Room, GameAction } from "../types";
import { GameState } from "../types";
import GameBoard from "./GameBoard";
import PlayerList from "./PlayerList";
import GameStats from "./GameStats";
import NextPiece from "./NextPiece";
import HoldPiece from "./HoldPiece";
import Controls from "./Controls";
import TouchControls from "./TouchControls";
import { GAME_CONTROLS, REPEATABLE_ACTIONS } from "../constants/gameControls";

const GameContainer = styled.div`
  display: flex;
  min-height: 100vh;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  color: white;
  font-family: "Arial", sans-serif;

  @media (max-width: 768px) {
    flex-direction: column;
    padding-bottom: 200px; /* Space for touch controls */
  }
`;

const MainGameArea = styled.div`
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;

  @media (max-width: 768px) {
    padding: 10px;
    align-items: flex-start;
    overflow-x: auto;
  }
`;

const GameWrapper = styled(motion.div)`
  display: flex;
  gap: 30px;
  align-items: flex-start;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 15px;
    width: 100%;
    align-items: center;
  }
`;

const PlayerGameArea = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;

  @media (max-width: 768px) {
    width: 100%;
    max-width: 400px;
  }
`;

const PlayerName = styled.div`
  font-size: 18px;
  font-weight: bold;
  text-align: center;
  color: #ffd700;
  margin-bottom: 10px;
`;

const GameLayoutContainer = styled.div`
  display: flex;
  gap: 15px;
  align-items: flex-start;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: center;
  }
`;

const SideComponents = styled.div`
  display: flex;
  flex-direction: column;
  gap: 15px;

  @media (max-width: 768px) {
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: center;
    gap: 10px;
  }
`;

const Sidebar = styled.div`
  width: 300px;
  padding: 20px;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
  border-left: 1px solid rgba(255, 255, 255, 0.1);

  @media (max-width: 768px) {
    width: 100%;
    border-left: none;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    padding: 15px;
    order: -1; /* Show sidebar above game on mobile */
  }
`;

const RoomInfo = styled.div`
  background: rgba(255, 255, 255, 0.1);
  padding: 15px;
  border-radius: 10px;
  margin-bottom: 20px;
`;

const RoomCode = styled.div`
  font-size: 24px;
  font-weight: bold;
  text-align: center;
  color: #ffd700;
  margin-bottom: 10px;
  letter-spacing: 2px;
`;

const ReadyButton = styled(motion.button)`
  width: 100%;
  padding: 12px;
  font-size: 16px;
  font-weight: bold;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  margin-bottom: 20px;

  &.ready {
    background: #4caf50;
    color: white;
  }

  &.not-ready {
    background: #f44336;
    color: white;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const GameMessage = styled(motion.div)`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.9);
  color: white;
  padding: 30px;
  border-radius: 15px;
  font-size: 24px;
  font-weight: bold;
  text-align: center;
  z-index: 1000;
  border: 2px solid #ffd700;
`;

interface TetrisGameProps {
  room: Room;
  currentPlayer: Player;
  onLeaveRoom: () => void;
}

interface TetrisGameContainerProps {
  roomId: string;
}

const TetrisGame: React.FC<TetrisGameProps> = ({
  room,
  currentPlayer,
  onLeaveRoom,
}) => {
  const { socket } = useSocket();
  const [gameState, setGameState] = useState(room);
  const [showMessage, setShowMessage] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(currentPlayer.isReady);

  // Key repeat state management
  const pressedKeys = useRef<Set<string>>(new Set());
  const keyIntervals = useRef<Map<string, number>>(new Map());
  const initialDelayTimers = useRef<Map<string, number>>(new Map());

  // Update gameState when room prop changes
  useEffect(() => {
    console.log("TetrisGame: Room prop changed", {
      roomCode: room.code,
      playerCount: room.players.length,
      players: room.players.map((p) => ({ name: p.name, id: p.id })),
    });
    setGameState(room);
  }, [room]);

  // Check if current player is the room creator (first player)
  const isRoomCreator =
    gameState.players.length > 0 &&
    gameState.players[0].id === currentPlayer.id;

  console.log("TetrisGame: Render state", {
    gameStatePlayerCount: gameState.players.length,
    roomPropPlayerCount: room.players.length,
    currentPlayerId: currentPlayer.id,
    isRoomCreator,
  });

  // Function to send game action
  const sendGameAction = useCallback(
    (actionType: string) => {
      if (
        !socket ||
        gameState.gameState !== GameState.PLAYING ||
        currentPlayer.isGameOver
      ) {
        return;
      }

      const action: GameAction = {
        type: actionType as GameAction["type"],
        playerId: currentPlayer.id,
      };

      socket.emit("game_action", action);
    },
    [socket, gameState.gameState, currentPlayer.id, currentPlayer.isGameOver]
  );

  // Handle touch controls
  const handleAction = useCallback(
    (action: string) => {
      switch (action) {
        case "MOVE_LEFT":
          sendGameAction("MOVE_LEFT");
          break;
        case "MOVE_RIGHT":
          sendGameAction("MOVE_RIGHT");
          break;
        case "SOFT_DROP":
          sendGameAction("SOFT_DROP");
          break;
        case "MOVE_UP":
        case "ROTATE":
          sendGameAction("ROTATE");
          break;
        case "HARD_DROP":
          sendGameAction("HARD_DROP");
          break;
        case "HOLD":
          sendGameAction("HOLD");
          break;
        default:
          break;
      }
    },
    [sendGameAction]
  );

  // Clean up intervals and timers
  const clearKeyTimers = useCallback((key: string) => {
    const intervalId = keyIntervals.current.get(key);
    const timerId = initialDelayTimers.current.get(key);

    if (intervalId) {
      clearInterval(intervalId);
      keyIntervals.current.delete(key);
    }

    if (timerId) {
      clearTimeout(timerId);
      initialDelayTimers.current.delete(key);
    }
  }, []);

  // Start key repeat for movement keys
  const startKeyRepeat = useCallback(
    (key: string, actionType: string) => {
      // Clear any existing timers for this key
      clearKeyTimers(key);

      // Send initial action immediately
      sendGameAction(actionType);

      // Set up initial delay before repeat starts (150ms)
      const initialTimer = setTimeout(() => {
        // Start repeating with faster interval (50ms)
        const intervalId = setInterval(() => {
          if (pressedKeys.current.has(key)) {
            sendGameAction(actionType);
          } else {
            clearKeyTimers(key);
          }
        }, 50);

        keyIntervals.current.set(key, intervalId);
      }, 150);

      initialDelayTimers.current.set(key, initialTimer);
    },
    [sendGameAction, clearKeyTimers]
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (
        !socket ||
        gameState.gameState !== GameState.PLAYING ||
        currentPlayer.isGameOver
      ) {
        return;
      }

      const key = event.key.toLowerCase();

      // Only process if key is not already pressed (prevents browser key repeat)
      if (pressedKeys.current.has(key)) {
        return;
      }

      pressedKeys.current.add(key);

      // Check if this is a repeatable action
      if (
        REPEATABLE_ACTIONS.includes(key as (typeof REPEATABLE_ACTIONS)[number])
      ) {
        let actionType: string;
        switch (key) {
          case GAME_CONTROLS.MOVE_LEFT:
            actionType = "MOVE_LEFT";
            break;
          case GAME_CONTROLS.MOVE_RIGHT:
            actionType = "MOVE_RIGHT";
            break;
          case GAME_CONTROLS.SOFT_DROP:
            actionType = "MOVE_DOWN";
            break;
          default:
            pressedKeys.current.delete(key);
            return;
        }
        startKeyRepeat(key, actionType);
      } else {
        // Non-repeatable actions
        switch (key) {
          case GAME_CONTROLS.ROTATE:
            sendGameAction("ROTATE");
            break;
          case GAME_CONTROLS.HARD_DROP:
            sendGameAction("HARD_DROP");
            break;
          case GAME_CONTROLS.HOLD:
            sendGameAction("HOLD");
            break;
          default:
            pressedKeys.current.delete(key); // Remove key if not handled
            return;
        }
      }
    },
    [
      socket,
      gameState.gameState,
      currentPlayer.isGameOver,
      startKeyRepeat,
      sendGameAction,
    ]
  );

  const handleKeyUp = useCallback(
    (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();

      if (pressedKeys.current.has(key)) {
        pressedKeys.current.delete(key);
        clearKeyTimers(key);
      }
    },
    [clearKeyTimers]
  );

  useEffect(() => {
    if (!socket) return;

    const handleRoomJoined = (updatedRoom: Room) => {
      setGameState(updatedRoom);
    };

    const handleRoomLeft = (playerId: string) => {
      setGameState((prev) => ({
        ...prev,
        players: prev.players.filter((p) => p.id !== playerId),
      }));
    };

    const handlePlayerReady = (playerId: string, ready: boolean) => {
      setGameState((prev) => ({
        ...prev,
        players: prev.players.map((p) =>
          p.id === playerId ? { ...p, isReady: ready } : p
        ),
      }));
    };

    const handleGameStarted = () => {
      setShowMessage("Game Starting!");
      setTimeout(() => setShowMessage(null), 2000);
    };

    const handleGameStateUpdate = (update: { players: Player[] }) => {
      console.log("🎮 Game state update received:", {
        playerCount: update.players.length,
        players: update.players.map((p) => ({
          name: p.name,
          currentPiece: p.currentPiece
            ? {
                type: p.currentPiece.type,
                x: p.currentPiece.x,
                y: p.currentPiece.y,
              }
            : null,
          isGameOver: p.isGameOver,
        })),
      });
      setGameState((prev) => ({
        ...prev,
        players: update.players,
        gameState: GameState.PLAYING,
      }));
    };

    const handlePlayerLost = (playerId: string) => {
      const player = gameState.players.find((p) => p.id === playerId);
      if (player) {
        setShowMessage(`${player.name} is out!`);
        setTimeout(() => setShowMessage(null), 3000);
      }
    };

    const handleGameEnded = (winnerId?: string) => {
      const winner = winnerId
        ? gameState.players.find((p) => p.id === winnerId)
        : null;
      setShowMessage(winner ? `${winner.name} Wins!` : "Game Over!");
      setGameState((prev) => ({ ...prev, gameState: GameState.FINISHED }));
      setTimeout(() => setShowMessage(null), 5000);
    };

    socket.on("room_joined", handleRoomJoined);
    socket.on("room_left", handleRoomLeft);
    socket.on("player_ready", handlePlayerReady);
    socket.on("game_started", handleGameStarted);
    socket.on("game_state_update", handleGameStateUpdate);
    socket.on("player_lost", handlePlayerLost);
    socket.on("game_ended", handleGameEnded);

    return () => {
      socket.off("room_joined", handleRoomJoined);
      socket.off("room_left", handleRoomLeft);
      socket.off("player_ready", handlePlayerReady);
      socket.off("game_started", handleGameStarted);
      socket.off("game_state_update", handleGameStateUpdate);
      socket.off("player_lost", handlePlayerLost);
      socket.off("game_ended", handleGameEnded);
    };
  }, [socket, gameState.players]);

  useEffect(() => {
    const keyIntervalsRef = keyIntervals.current;
    const initialDelayTimersRef = initialDelayTimers.current;
    const pressedKeysRef = pressedKeys.current;

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);

      // Clean up all timers when component unmounts
      keyIntervalsRef.forEach((intervalId) => clearInterval(intervalId));
      initialDelayTimersRef.forEach((timerId) => clearTimeout(timerId));
      keyIntervalsRef.clear();
      initialDelayTimersRef.clear();
      pressedKeysRef.clear();
    };
  }, [handleKeyDown, handleKeyUp]);

  const handleReadyToggle = () => {
    if (!socket) return;

    const newReadyState = !isReady;
    setIsReady(newReadyState);
    socket.emit("player_ready", newReadyState);
  };

  const handleStartGame = () => {
    if (!socket) return;
    console.log("TetrisGame: Manual start game requested", {
      roomCode: gameState.code,
      playerCount: gameState.players.length,
      gameState: gameState.gameState,
      isRoomCreator,
      currentPlayerId: currentPlayer.id,
    });
    socket.emit("start_game");
  };

  const handleLeaveRoom = () => {
    if (socket) {
      socket.emit("leave_room");
    }
    onLeaveRoom();
  };

  return (
    <GameContainer>
      <MainGameArea>
        <GameWrapper
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          {gameState.players.map((player) => (
            <PlayerGameArea key={player.id}>
              <PlayerName>
                {player.name}
                {player.id === currentPlayer.id && " (You)"}
                {player.isGameOver && " - OUT"}
              </PlayerName>

              <GameLayoutContainer>
                <GameBoard
                  board={player.gameBoard}
                  currentPiece={player.currentPiece}
                  isCurrentPlayer={player.id === currentPlayer.id}
                  playerId={player.id}
                />

                <SideComponents>
                  <HoldPiece
                    piece={player.holdPiece}
                    canHold={player.canHold}
                  />
                  <NextPiece piece={player.nextPiece} />
                  <GameStats
                    score={player.score}
                    level={player.level}
                    lines={player.lines}
                    dropInterval={room?.dropInterval}
                  />
                  <Controls />
                </SideComponents>
              </GameLayoutContainer>
            </PlayerGameArea>
          ))}
        </GameWrapper>
      </MainGameArea>

      <Sidebar>
        <RoomInfo>
          <RoomCode>{gameState.code}</RoomCode>
          <div>
            Players: {gameState.players.length}/{gameState.maxPlayers}
          </div>
        </RoomInfo>

        {gameState.gameState === GameState.WAITING && (
          <>
            <ReadyButton
              className={isReady ? "ready" : "not-ready"}
              onClick={handleReadyToggle}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {isReady ? "Ready!" : "Not Ready"}
            </ReadyButton>

            {/* Show Start Game button for room creator when there are enough players */}
            {isRoomCreator && gameState.players.length >= 1 && (
              <ReadyButton
                className="ready"
                onClick={handleStartGame}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                style={{
                  background: "linear-gradient(45deg, #ffd700, #ffed4e)",
                  color: "#1a1a2e",
                  marginBottom: "10px",
                }}
              >
                🚀 Start Game
              </ReadyButton>
            )}

            {/* Show waiting message for non-creators */}
            {!isRoomCreator && gameState.players.length >= 1 && (
              <div
                style={{
                  padding: "12px",
                  background: "rgba(255, 255, 255, 0.1)",
                  borderRadius: "8px",
                  marginBottom: "15px",
                  textAlign: "center",
                  fontSize: "14px",
                  color: "#ffd700",
                }}
              >
                ⏳ Waiting for room creator to start the game
              </div>
            )}
          </>
        )}

        {/* Show ready state message */}
        {gameState.gameState === GameState.READY && (
          <div
            style={{
              padding: "12px",
              background: "rgba(76, 175, 80, 0.2)",
              borderRadius: "8px",
              marginBottom: "15px",
              textAlign: "center",
              fontSize: "14px",
              color: "#4caf50",
              border: "1px solid #4caf50",
            }}
          >
            🎮 Game starting soon...
          </div>
        )}

        {/* Show restart game button when game is finished */}
        {gameState.gameState === GameState.FINISHED && (
          <>
            <div
              style={{
                padding: "12px",
                background: "rgba(255, 255, 255, 0.1)",
                borderRadius: "8px",
                marginBottom: "15px",
                textAlign: "center",
                fontSize: "16px",
                color: "#ffd700",
                fontWeight: "bold",
              }}
            >
              🎯 Game Over!
            </div>

            {/* Show Start New Game button for room creator */}
            {isRoomCreator && (
              <ReadyButton
                className="ready"
                onClick={handleStartGame}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                style={{
                  background: "linear-gradient(45deg, #ffd700, #ffed4e)",
                  color: "#1a1a2e",
                  marginBottom: "10px",
                }}
              >
                🔄 Start New Game
              </ReadyButton>
            )}

            {/* Show waiting message for non-creators */}
            {!isRoomCreator && (
              <div
                style={{
                  padding: "12px",
                  background: "rgba(255, 255, 255, 0.1)",
                  borderRadius: "8px",
                  marginBottom: "15px",
                  textAlign: "center",
                  fontSize: "14px",
                  color: "#ffd700",
                }}
              >
                ⏳ Waiting for room creator to start a new game
              </div>
            )}
          </>
        )}

        <PlayerList
          players={gameState.players}
          currentPlayerId={currentPlayer.id}
        />

        <motion.button
          onClick={handleLeaveRoom}
          style={{
            width: "100%",
            padding: "12px",
            fontSize: "16px",
            fontWeight: "bold",
            border: "none",
            borderRadius: "8px",
            background: "#666",
            color: "white",
            cursor: "pointer",
            marginTop: "20px",
          }}
          whileHover={{ scale: 1.05, background: "#777" }}
          whileTap={{ scale: 0.95 }}
        >
          Leave Room
        </motion.button>
      </Sidebar>

      <AnimatePresence>
        {showMessage && (
          <GameMessage
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.3 }}
          >
            {showMessage}
          </GameMessage>
        )}
      </AnimatePresence>

      {/* Touch controls for mobile */}
      <TouchControls onAction={handleAction} isCurrentPlayer={true} />
    </GameContainer>
  );
};

// Container component that handles room joining
const TetrisGameContainer: React.FC<TetrisGameContainerProps> = ({
  roomId,
}) => {
  const { socket } = useSocket();
  const [room, setRoom] = useState<Room | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!socket) return;

    // Get player name from localStorage
    const playerName =
      localStorage.getItem("playerName") ||
      localStorage.getItem("tetris_player_name") ||
      "Anonymous";

    console.log("TetrisGameContainer: Joining room", { roomId, playerName });

    // Join the room using callback
    console.log("TetrisGameContainer: Attempting to join room", {
      roomId,
      playerName,
    });
    socket.emit("join_room", roomId, playerName, (response) => {
      console.log("TetrisGameContainer: Join room callback response", response);
      if (response.success) {
        console.log(
          "TetrisGameContainer: Successfully joined room via callback"
        );
      } else {
        console.error(
          "TetrisGameContainer: Failed to join room:",
          response.error
        );

        // Set specific error messages based on error type
        let errorMessage = response.error || "Failed to join room";
        if (response.error === "Room is full") {
          errorMessage = `Room ${roomId} is full! Please try another room or wait for someone to leave.`;
        } else if (response.error === "Game is already in progress") {
          errorMessage = `Game in room ${roomId} is already in progress. Please wait for the current game to finish or join another room.`;
        }

        setError(errorMessage);
        setIsConnected(false);
      }
    });

    const handleRoomJoined = (joinedRoom: Room) => {
      console.log("TetrisGameContainer: Room joined event received", {
        roomCode: joinedRoom.code,
        playerCount: joinedRoom.players.length,
      });
      setRoom(joinedRoom);

      // Find current player in the room
      const currentPlayerInRoom = joinedRoom.players.find(
        (player) => player.name === playerName // Match by name since we don't have player ID yet
      );

      if (currentPlayerInRoom) {
        setCurrentPlayer(currentPlayerInRoom);
        setIsConnected(true);
        setError(null);
      } else {
        setError("Player not found in room");
      }
    };

    const handleRoomLeft = () => {
      setRoom(null);
      setCurrentPlayer(null);
      setIsConnected(false);
    };

    const handleSpeedIncreased = (data: {
      dropInterval: number;
      speedLevel: number;
    }) => {
      console.log("🚀 Speed increased:", data);
      setRoom((prevRoom) =>
        prevRoom
          ? {
              ...prevRoom,
              dropInterval: data.dropInterval,
            }
          : null
      );
    };

    socket.on("room_joined", handleRoomJoined);
    socket.on("room_left", handleRoomLeft);
    socket.on("speed_increased", handleSpeedIncreased);

    return () => {
      socket.off("room_joined", handleRoomJoined);
      socket.off("room_left", handleRoomLeft);
      socket.off("speed_increased", handleSpeedIncreased);
    };
  }, [socket, roomId]);

  const handleLeaveRoom = () => {
    if (socket) {
      socket.emit("leave_room");
    }
    // Navigate back to home page
    window.location.href = "/";
  };

  if (error) {
    const isRoomFull = error.includes("is full");
    const isGameInProgress = error.includes("already in progress");

    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          background:
            "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
          color: "white",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div
          style={{
            background: isRoomFull
              ? "rgba(255, 193, 7, 0.2)"
              : "rgba(244, 67, 54, 0.2)",
            border: `2px solid ${isRoomFull ? "#ffc107" : "#f44336"}`,
            borderRadius: "10px",
            padding: "30px",
            textAlign: "center",
            maxWidth: "500px",
          }}
        >
          <h2
            style={{
              color: isRoomFull ? "#ffc107" : "#f44336",
              marginBottom: "20px",
              fontSize: "24px",
            }}
          >
            {isRoomFull
              ? "🏠 Room Full"
              : isGameInProgress
              ? "🎮 Game In Progress"
              : "❌ Error"}
          </h2>
          <p
            style={{
              fontSize: "16px",
              lineHeight: "1.5",
              marginBottom: "25px",
            }}
          >
            {error}
          </p>
          <div
            style={{ display: "flex", gap: "10px", justifyContent: "center" }}
          >
            <button
              onClick={() => (window.location.href = "/")}
              style={{
                background: "#ffd700",
                color: "#1a1a2e",
                border: "none",
                padding: "12px 24px",
                borderRadius: "5px",
                cursor: "pointer",
                fontWeight: "bold",
                fontSize: "14px",
              }}
            >
              🏠 Back to Home
            </button>
            {(isRoomFull || isGameInProgress) && (
              <button
                onClick={() => window.location.reload()}
                style={{
                  background: "rgba(255, 255, 255, 0.2)",
                  color: "white",
                  border: "2px solid rgba(255, 255, 255, 0.3)",
                  padding: "12px 24px",
                  borderRadius: "5px",
                  cursor: "pointer",
                  fontWeight: "bold",
                  fontSize: "14px",
                }}
              >
                🔄 Try Again
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!isConnected || !room || !currentPlayer) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          background:
            "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
          color: "white",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div
          style={{
            background: "rgba(255, 255, 255, 0.1)",
            borderRadius: "10px",
            padding: "30px",
            textAlign: "center",
          }}
        >
          <h2>Connecting to Room {roomId}...</h2>
          <div style={{ marginTop: "20px" }}>🔄 Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <TetrisGame
      room={room}
      currentPlayer={currentPlayer}
      onLeaveRoom={handleLeaveRoom}
    />
  );
};

export default TetrisGameContainer;
export { TetrisGame };
