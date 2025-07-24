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
  players: Map<string, Player>;
  gameState: GameState;
  isGameActive: boolean;
  maxPlayers: number;
  createdAt: Date;
}

export enum GameState {
  WAITING = 'waiting',
  READY = 'ready',
  PLAYING = 'playing',
  PAUSED = 'paused',
  FINISHED = 'finished'
}

export interface TetrisPiece {
  type: TetrominoType;
  x: number;
  y: number;
  rotation: number;
  shape: number[][];
}

export enum TetrominoType {
  I = 'I',
  O = 'O',
  T = 'T',
  S = 'S',
  Z = 'Z',
  J = 'J',
  L = 'L'
}

export interface GameAction {
  type: 'MOVE_LEFT' | 'MOVE_RIGHT' | 'MOVE_DOWN' | 'ROTATE' | 'HARD_DROP';
  playerId: string;
}

export interface ServerToClientEvents {
  room_joined: (room: Omit<Room, 'players'> & { players: Player[] }) => void;
  room_left: (playerId: string) => void;
  player_ready: (playerId: string, isReady: boolean) => void;
  game_started: () => void;
  game_state_update: (gameState: { players: Player[] }) => void;
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

export interface InterServerEvents {}

export interface SocketData {
  playerId: string;
  roomId: string;
}
