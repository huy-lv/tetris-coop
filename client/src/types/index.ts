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
  isGameOver: boolean;
}

export interface Room {
  id: string;
  code: string;
  players: Player[];
  gameState: GameStateType;
  isGameActive: boolean;
  maxPlayers: number;
  createdAt: Date;
}

export const GameState = {
  WAITING: 'waiting',
  READY: 'ready',
  PLAYING: 'playing',
  PAUSED: 'paused',
  FINISHED: 'finished'
} as const;

export type GameStateType = typeof GameState[keyof typeof GameState];

export interface TetrisPiece {
  type: TetrominoTypeValue;
  x: number;
  y: number;
  rotation: number;
  shape: number[][];
}

export const TetrominoType = {
  I: 'I',
  O: 'O',
  T: 'T',
  S: 'S',
  Z: 'Z',
  J: 'J',
  L: 'L'
} as const;

export type TetrominoTypeValue = typeof TetrominoType[keyof typeof TetrominoType];

export interface GameAction {
  type: 'MOVE_LEFT' | 'MOVE_RIGHT' | 'MOVE_DOWN' | 'ROTATE' | 'HARD_DROP';
  playerId: string;
}

export interface ServerToClientEvents {
  room_joined: (room: Room) => void;
  room_left: (playerId: string) => void;
  player_ready: (playerId: string, isReady: boolean) => void;
  game_started: () => void;
  game_state_update: (gameState: { players: Player[] }) => void;
  lines_clearing: (data: { playerId: string; clearedRows: number[]; dropX: number }) => void;
  lines_cleared: (data: { playerId: string; clearedRows: number[]; dropX: number }) => void;
  player_lost: (playerId: string) => void;
  game_ended: (winnerId?: string) => void;
  error: (message: string) => void;
}

export interface ClientToServerEvents {
  create_room: (playerName: string, callback: (response: { success: boolean, roomCode?: string, error?: string }) => void) => void;
  join_room: (roomCode: string, playerName: string, callback: (response: { success: boolean, error?: string }) => void) => void;
  leave_room: () => void;
  player_ready: (isReady: boolean) => void;
  start_game: () => void;
  game_action: (action: GameAction) => void;
}

export const TETROMINO_COLORS: { [key in TetrominoTypeValue]: string } = {
  [TetrominoType.I]: '#00f0f0',
  [TetrominoType.O]: '#f0f000',
  [TetrominoType.T]: '#a000f0',
  [TetrominoType.S]: '#00f000',
  [TetrominoType.Z]: '#f00000',
  [TetrominoType.J]: '#0000f0',
  [TetrominoType.L]: '#f0a000'
};

export const BOARD_COLORS = [
  '#2a2a2a', // Empty cell
  '#00f0f0', // I piece
  '#f0f000', // O piece
  '#a000f0', // T piece
  '#00f000', // S piece
  '#f00000', // Z piece
  '#0000f0', // J piece
  '#f0a000', // L piece
  '#ffffff'  // Current falling piece
];
