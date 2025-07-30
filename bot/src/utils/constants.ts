// Game board dimensions
export const BOARD_WIDTH = 10;
export const BOARD_HEIGHT = 20;

// Tetromino shapes (same as in game)
export const TETROMINOES = {
  I: [
    [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    [
      [0, 0, 1, 0],
      [0, 0, 1, 0],
      [0, 0, 1, 0],
      [0, 0, 1, 0],
    ],
  ],
  O: [
    [
      [1, 1],
      [1, 1],
    ],
  ],
  T: [
    [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    [
      [0, 1, 0],
      [0, 1, 1],
      [0, 1, 0],
    ],
    [
      [0, 0, 0],
      [1, 1, 1],
      [0, 1, 0],
    ],
    [
      [0, 1, 0],
      [1, 1, 0],
      [0, 1, 0],
    ],
  ],
  S: [
    [
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0],
    ],
    [
      [0, 1, 0],
      [0, 1, 1],
      [0, 0, 1],
    ],
  ],
  Z: [
    [
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 0],
    ],
    [
      [0, 0, 1],
      [0, 1, 1],
      [0, 1, 0],
    ],
  ],
  J: [
    [
      [1, 0, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    [
      [0, 1, 1],
      [0, 1, 0],
      [0, 1, 0],
    ],
    [
      [0, 0, 0],
      [1, 1, 1],
      [0, 0, 1],
    ],
    [
      [0, 1, 0],
      [0, 1, 0],
      [1, 1, 0],
    ],
  ],
  L: [
    [
      [0, 0, 1],
      [1, 1, 1],
      [0, 0, 0],
    ],
    [
      [0, 1, 0],
      [0, 1, 0],
      [0, 1, 1],
    ],
    [
      [0, 0, 0],
      [1, 1, 1],
      [1, 0, 0],
    ],
    [
      [1, 1, 0],
      [0, 1, 0],
      [0, 1, 0],
    ],
  ],
};

// Piece colors mapping (based on game CSS)
export const PIECE_COLORS = {
  1: "I", // Cyan
  2: "O", // Yellow
  3: "T", // Purple
  4: "S", // Green
  5: "Z", // Red
  6: "J", // Blue
  7: "L", // Orange
  8: "GHOST", // Ghost piece
  9: "GARBAGE", // Garbage row
};

// CSS selectors for game elements
export const SELECTORS = {
  gameBoard: '[data-testid="game-board"], .game-board, [class*="Board"]',
  boardCell: '.cell, [class*="Cell"], [class*="cell"]',
  nextPiece: '[class*="NextPiece"], [class*="next-piece"]',
  holdPiece: '[class*="HoldPiece"], [class*="hold-piece"]',
  score: '[class*="score"], [data-testid="score"]',
  lines: '[class*="lines"], [data-testid="lines"]',
  level: '[class*="level"], [data-testid="level"]',
  roomInput:
    'input[placeholder*="room" i], input[placeholder*="code" i], #roomCode',
  joinButton:
    'button.sc-hjsuWn.hzXtJx.secondary, button:has-text("Join"), button[class*="join" i]',
  createButton:
    'button.sc-hjsuWn.hzXtJx.primary, button:has-text("Create"), button[class*="create" i]',
  readyButton: 'button:has-text("Ready"), button[class*="ready" i]',
  startButton: 'button:has-text("Start"), button[class*="start" i]',
  playerNameInput:
    'input[placeholder*="name" i], input[placeholder*="player" i], #playerName',
};

// Default bot speeds (milliseconds between moves)
export const BOT_SPEEDS = {
  slow: 800,
  medium: 400,
  fast: 200,
  instant: 50,
};

// AI evaluation weights
export const AI_WEIGHTS = {
  linesWeight: 1000,
  heightWeight: -10,
  holesWeight: -200,
  bumpinessWeight: -50,
};
