import { Room, Player } from '../types';
export declare class RoomManager {
    private rooms;
    private roomCodes;
    generateRoomCode(): string;
    createRoom(creatorName: string): Room;
    joinRoom(roomCode: string, playerName: string): {
        success: boolean;
        room?: Room;
        player?: Player;
        error?: string;
    };
    leaveRoom(roomId: string, playerId: string): boolean;
    getRoom(roomId: string): Room | undefined;
    getRoomByCode(roomCode: string): Room | undefined;
    setPlayerReady(roomId: string, playerId: string, isReady: boolean): boolean;
    startGame(roomId: string): boolean;
    endGame(roomId: string, winnerId?: string): boolean;
    private areAllPlayersReady;
    getRoomStats(): {
        totalRooms: number;
        totalPlayers: number;
    };
    cleanupOldRooms(maxAgeHours?: number): void;
}
//# sourceMappingURL=RoomManager.d.ts.map