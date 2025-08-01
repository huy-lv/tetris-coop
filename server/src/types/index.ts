export interface Player {
  id: string;
  name: string;
  isReady: boolean;
  gameBoard: number[][];
  score: number;
  level: number;
  lines: number;
  currentPiece?: TetrisPiece;
  nextPiece?: TetrisPiece;
  holdPiece?: TetrisPiece;
  canHold: boolean;
  isGameOver: boolean;
}

export interface Room {
  id: string;
  code: string;
  players: Map<string, Player>;
  gameState: GameState;
  isGameActive: boolean;
  maxPlayers: number;
  createdAt: Date;
  gameStartTime?: Date;
  dropInterval: number; // milliseconds between drops
  lastSpeedIncrease?: Date;
}

export enum GameState {
  WAITING = "waiting",
  READY = "ready",
  PLAYING = "playing",
  PAUSED = "paused",
  FINISHED = "finished",
}

export interface TetrisPiece {
  type: TetrominoType;
  x: number;
  y: number;
  rotation: number;
  shape: number[][];
}

export enum TetrominoType {
  I = "I",
  O = "O",
  T = "T",
  S = "S",
  Z = "Z",
  J = "J",
  L = "L",
}

export interface GameAction {
  type:
    | "MOVE_LEFT"
    | "MOVE_RIGHT"
    | "MOVE_DOWN"
    | "ROTATE"
    | "HARD_DROP"
    | "HOLD";
  playerId: string;
}

export interface ServerToClientEvents {
  room_joined: (room: Omit<Room, "players"> & { players: Player[] }) => void;
  room_left: (playerId: string) => void;
  player_ready: (playerId: string, isReady: boolean) => void;
  game_started: () => void;
  game_paused: () => void;
  game_resumed: () => void;
  game_state_update: (gameState: { players: Player[] }) => void;
  speed_increased: (data: { dropInterval: number; speedLevel: number }) => void;
  lines_clearing: (data: {
    playerId: string;
    clearedRows: number[];
    dropX: number;
  }) => void;
  lines_cleared: (data: {
    playerId: string;
    clearedRows: number[];
    dropX: number;
  }) => void;
  garbage_incoming: (data: {
    playerId: string;
    playerName: string;
    rowCount: number;
  }) => void;
  fireball_attack: (data: {
    fromPlayerId: string;
    fromPlayerName: string;
    targetPlayerIds: string[];
    rowCount: number;
  }) => void;
  player_lost: (playerId: string) => void;
  game_ended: (winnerId?: string) => void;
  error: (message: string) => void;
}

export interface ClientToServerEvents {
  create_room: (
    playerName: string,
    callback: (response: {
      success: boolean;
      roomCode?: string;
      error?: string;
    }) => void
  ) => void;
  join_room: (
    roomCode: string,
    playerName: string,
    callback: (response: { success: boolean; error?: string }) => void
  ) => void;
  leave_room: () => void;
  player_ready: (isReady: boolean) => void;
  start_game: () => void;
  pause_game: () => void;
  resume_game: () => void;
  apply_garbage: () => void;
  game_action: (action: GameAction) => void;
  game_state_sync: (data: {
    playerId: string;
    playerState: Player;
    linesCleared: number;
  }) => void;
  lines_clearing: (data: {
    playerId: string;
    clearedRows: number[];
    dropX: number;
  }) => void;
  lines_cleared: (data: {
    playerId: string;
    clearedRows: number[];
    dropX: number;
  }) => void;
}

export interface InterServerEvents {}

export interface SocketData {
  playerId: string;
  roomId: string;
}

// Test mode constant - when true, only spawn O pieces for testing
export const TestMode = false;

// Game speed increase interval - speed increases every 10 seconds for testing
export const TimeToIncreaseSpeed = 120000; // 10 seconds in milliseconds
