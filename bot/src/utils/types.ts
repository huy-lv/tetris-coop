export interface TetrisPiece {
  type: "I" | "O" | "T" | "S" | "Z" | "J" | "L";
  x: number;
  y: number;
  rotation: number;
  shape: number[][];
}

export interface GameState {
  board: number[][];
  currentPiece: TetrisPiece | null;
  nextPiece: TetrisPiece | null;
  holdPiece: TetrisPiece | null;
  score: number;
  lines: number;
  level: number;
  isGameActive: boolean;
  isGameOver: boolean;
  canHold: boolean;
  speed: number;
}

export interface Move {
  horizontalMoves: number; // Negative = left, positive = right
  rotations: number; // Number of rotations needed
  hardDrop: boolean;
  softDrop: boolean;
  useHold: boolean;
}

export interface Placement {
  x: number;
  y: number;
  rotation: number;
  piece: TetrisPiece;
  isValid: boolean;
  score: number;
}

export interface BotOptions {
  gameUrl: string;
  roomCode?: string;
  createRoom?: boolean;
  speed: "slow" | "medium" | "fast" | "instant";
  debug: boolean;
  playerName?: string;
}

export interface BotConfig {
  speeds: {
    slow: number;
    medium: number;
    fast: number;
    instant: number;
  };
  keys: {
    moveLeft: string;
    moveRight: string;
    softDrop: string;
    hardDrop: string;
    rotate: string;
    hold: string;
  };
  evaluation: {
    linesWeight: number;
    heightWeight: number;
    holesWeight: number;
    bumpinessWeight: number;
  };
}
