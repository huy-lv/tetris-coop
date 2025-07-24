"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoomManager = void 0;
const uuid_1 = require("uuid");
const types_1 = require("../types");
const tetris_1 = require("../game/tetris");
class RoomManager {
    constructor() {
        this.rooms = new Map();
        this.roomCodes = new Map(); // code -> roomId
    }
    generateRoomCode() {
        let code;
        do {
            code = Math.random().toString(36).substring(2, 8).toUpperCase();
        } while (this.roomCodes.has(code));
        return code;
    }
    createRoom(creatorName) {
        const roomId = (0, uuid_1.v4)();
        const roomCode = this.generateRoomCode();
        const creator = (0, tetris_1.initializePlayer)((0, uuid_1.v4)(), creatorName);
        const room = {
            id: roomId,
            code: roomCode,
            players: new Map([[creator.id, creator]]),
            gameState: types_1.GameState.WAITING,
            isGameActive: false,
            maxPlayers: 4,
            createdAt: new Date()
        };
        this.rooms.set(roomId, room);
        this.roomCodes.set(roomCode, roomId);
        return room;
    }
    joinRoom(roomCode, playerName) {
        const roomId = this.roomCodes.get(roomCode);
        if (!roomId) {
            return { success: false, error: 'Room not found' };
        }
        const room = this.rooms.get(roomId);
        if (!room) {
            return { success: false, error: 'Room not found' };
        }
        // Check if a player with the same name already exists in the room
        const existingPlayer = Array.from(room.players.values()).find(p => p.name === playerName);
        if (existingPlayer) {
            console.log(`🔄 Player "${playerName}" rejoining room ${room.code}`);
            return { success: true, room, player: existingPlayer };
        }
        if (room.players.size >= room.maxPlayers) {
            return { success: false, error: 'Room is full' };
        }
        if (room.gameState === types_1.GameState.PLAYING) {
            return { success: false, error: 'Game is already in progress' };
        }
        const player = (0, tetris_1.initializePlayer)((0, uuid_1.v4)(), playerName);
        room.players.set(player.id, player);
        console.log(`👥 Player "${playerName}" joined room ${room.code} (${room.players.size}/${room.maxPlayers} players)`);
        if (room.players.size >= 2) {
            console.log(`✅ Room ${room.code} now has enough players to start! Players need to click "Ready" to begin.`);
        }
        return { success: true, room, player };
    }
    leaveRoom(roomId, playerId) {
        const room = this.rooms.get(roomId);
        if (!room)
            return false;
        room.players.delete(playerId);
        // If room is empty, clean it up
        if (room.players.size === 0) {
            this.roomCodes.delete(room.code);
            this.rooms.delete(roomId);
        }
        return true;
    }
    getRoom(roomId) {
        return this.rooms.get(roomId);
    }
    getRoomByCode(roomCode) {
        const roomId = this.roomCodes.get(roomCode);
        return roomId ? this.rooms.get(roomId) : undefined;
    }
    setPlayerReady(roomId, playerId, isReady) {
        const room = this.rooms.get(roomId);
        if (!room)
            return false;
        const player = room.players.get(playerId);
        if (!player)
            return false;
        player.isReady = isReady;
        // Check if all players are ready and room has at least 2 players
        if (room.players.size >= 2 && this.areAllPlayersReady(room)) {
            room.gameState = types_1.GameState.READY;
            console.log(`🎮 Room ${room.code}: All ${room.players.size} players are ready! Game will start automatically.`);
        }
        else {
            room.gameState = types_1.GameState.WAITING;
            const readyCount = Array.from(room.players.values()).filter(p => p.isReady).length;
            console.log(`⏳ Room ${room.code}: ${readyCount}/${room.players.size} players ready (minimum 2 needed to start)`);
        }
        return true;
    }
    startGame(roomId) {
        const room = this.rooms.get(roomId);
        if (!room)
            return false;
        // Allow starting if room has at least 2 players (regardless of ready state for manual start)
        if (room.players.size < 2)
            return false;
        // Don't allow starting if game is already active
        if (room.gameState === types_1.GameState.PLAYING)
            return false;
        room.gameState = types_1.GameState.PLAYING;
        room.isGameActive = true;
        console.log(`🎮 Starting game in room ${room.code} with ${room.players.size} players`);
        // Reset all players' game state
        room.players.forEach(player => {
            const newPlayer = (0, tetris_1.initializePlayer)(player.id, player.name);
            newPlayer.isReady = true;
            room.players.set(player.id, newPlayer);
        });
        return true;
    }
    endGame(roomId, winnerId) {
        const room = this.rooms.get(roomId);
        if (!room)
            return false;
        room.gameState = types_1.GameState.FINISHED;
        room.isGameActive = false;
        // Reset players' ready state
        room.players.forEach(player => {
            player.isReady = false;
        });
        return true;
    }
    areAllPlayersReady(room) {
        return Array.from(room.players.values()).every(player => player.isReady);
    }
    // Get room stats for cleanup
    getRoomStats() {
        return {
            totalRooms: this.rooms.size,
            totalPlayers: Array.from(this.rooms.values()).reduce((sum, room) => sum + room.players.size, 0)
        };
    }
    // Clean up old empty rooms (could be called periodically)
    cleanupOldRooms(maxAgeHours = 24) {
        const cutoffTime = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
        for (const [roomId, room] of this.rooms.entries()) {
            if (room.players.size === 0 && room.createdAt < cutoffTime) {
                this.roomCodes.delete(room.code);
                this.rooms.delete(roomId);
            }
        }
    }
}
exports.RoomManager = RoomManager;
//# sourceMappingURL=RoomManager.js.map