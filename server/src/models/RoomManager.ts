import { v4 as uuidv4 } from "uuid";
import { Room, Player, GameState } from "../types";
import { initializePlayer } from "../game/tetris";

export class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private roomCodes: Map<string, string> = new Map(); // code -> roomId

  generateRoomCode(): string {
    let code: string;
    do {
      code = Math.random().toString(36).substring(2, 8).toUpperCase();
    } while (this.roomCodes.has(code));
    return code;
  }

  createRoom(creatorName: string): Room {
    const roomId = uuidv4();
    const roomCode = this.generateRoomCode();
    const creator = initializePlayer(uuidv4(), creatorName);

    const room: Room = {
      id: roomId,
      code: roomCode,
      players: new Map([[creator.id, creator]]),
      gameState: GameState.WAITING,
      isGameActive: false,
      maxPlayers: 4,
      createdAt: new Date(),
    };

    this.rooms.set(roomId, room);
    this.roomCodes.set(roomCode, roomId);

    return room;
  }

  joinRoom(
    roomCode: string,
    playerName: string
  ): { success: boolean; room?: Room; player?: Player; error?: string } {
    console.log(`🔍 RoomManager.joinRoom: Looking for room code "${roomCode}"`);
    console.log(
      `📋 Available room codes: [${Array.from(this.roomCodes.keys()).join(
        ", "
      )}]`
    );

    const roomId = this.roomCodes.get(roomCode);
    if (!roomId) {
      console.log(`❌ Room code "${roomCode}" not found in roomCodes map`);
      return { success: false, error: "Room not found" };
    }

    console.log(`✅ Found room ID: ${roomId} for code: ${roomCode}`);

    const room = this.rooms.get(roomId);
    if (!room) {
      console.log(`❌ Room ID "${roomId}" not found in rooms map`);
      return { success: false, error: "Room not found" };
    }

    // Check if a player with the same name already exists in the room
    const existingPlayer = Array.from(room.players.values()).find(
      (p) => p.name === playerName
    );
    if (existingPlayer) {
      console.log(`🔄 Player "${playerName}" rejoining room ${room.code}`);
      return { success: true, room, player: existingPlayer };
    }

    if (room.players.size >= room.maxPlayers) {
      return { success: false, error: "Room is full" };
    }

    if (room.gameState === GameState.PLAYING) {
      return { success: false, error: "Game is already in progress" };
    }

    const player = initializePlayer(uuidv4(), playerName);
    room.players.set(player.id, player);

    console.log(
      `👥 Player "${playerName}" joined room ${room.code} (${room.players.size}/${room.maxPlayers} players)`
    );

    if (room.players.size >= 1) {
      console.log(
        `✅ Room ${room.code} now has enough players to start! Players need to click "Ready" to begin.`
      );
    }

    return { success: true, room, player };
  }

  leaveRoom(roomId: string, playerId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    room.players.delete(playerId);

    // If room is empty, clean it up
    if (room.players.size === 0) {
      this.roomCodes.delete(room.code);
      this.rooms.delete(roomId);
    }

    return true;
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  getRoomByCode(roomCode: string): Room | undefined {
    const roomId = this.roomCodes.get(roomCode);
    return roomId ? this.rooms.get(roomId) : undefined;
  }

  setPlayerReady(roomId: string, playerId: string, isReady: boolean): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    const player = room.players.get(playerId);
    if (!player) return false;

    player.isReady = isReady;

    // Check if all players are ready and room has at least 1 player
    if (room.players.size >= 1 && this.areAllPlayersReady(room)) {
      room.gameState = GameState.READY;
      console.log(
        `🎮 Room ${room.code}: All ${room.players.size} players are ready! Game will start automatically.`
      );
    } else {
      room.gameState = GameState.WAITING;
      const readyCount = Array.from(room.players.values()).filter(
        (p) => p.isReady
      ).length;
      console.log(
        `⏳ Room ${room.code}: ${readyCount}/${room.players.size} players ready (minimum 1 needed to start)`
      );
    }

    return true;
  }

  startGame(roomId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    // Allow starting with at least 1 player for testing
    if (room.players.size < 1) return false;

    // Don't allow starting if game is already active
    if (room.gameState === GameState.PLAYING) return false;

    room.gameState = GameState.PLAYING;
    room.isGameActive = true;

    console.log(
      `🎮 Starting game in room ${room.code} with ${room.players.size} players`
    );

    // Reset all players' game state
    room.players.forEach((player) => {
      console.log(`🔄 Resetting player ${player.name}`);
      const newPlayer = initializePlayer(player.id, player.name);
      newPlayer.isReady = true;
      console.log(
        `🧱 New player state for ${
          player.name
        }: currentPiece=${!!newPlayer.currentPiece}, type=${
          newPlayer.currentPiece?.type
        }`
      );
      room.players.set(player.id, newPlayer);
    });

    return true;
  }

  endGame(roomId: string, winnerId?: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    room.gameState = GameState.FINISHED;
    room.isGameActive = false;

    // Reset players' ready state
    room.players.forEach((player) => {
      player.isReady = false;
    });

    return true;
  }

  private areAllPlayersReady(room: Room): boolean {
    return Array.from(room.players.values()).every((player) => player.isReady);
  }

  // Get room stats for cleanup
  getRoomStats() {
    return {
      totalRooms: this.rooms.size,
      totalPlayers: Array.from(this.rooms.values()).reduce(
        (sum, room) => sum + room.players.size,
        0
      ),
    };
  }

  // Clean up old empty rooms (could be called periodically)
  cleanupOldRooms(maxAgeHours: number = 24) {
    const cutoffTime = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);

    for (const [roomId, room] of this.rooms.entries()) {
      if (room.players.size === 0 && room.createdAt < cutoffTime) {
        this.roomCodes.delete(room.code);
        this.rooms.delete(roomId);
      }
    }
  }
}
