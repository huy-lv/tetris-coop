import type { Player, TetrisPiece, TetrominoTypeValue } from "../types";
import { TetrominoType } from "../types";

export const BOARD_WIDTH = 10;
export const BOARD_HEIGHT = 20;

export const TETROMINOES: { [key in TetrominoTypeValue]: number[][][] } = {
  [TetrominoType.I]: [
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
  [TetrominoType.O]: [
    [
      [1, 1],
      [1, 1],
    ],
  ],
  [TetrominoType.T]: [
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
  [TetrominoType.S]: [
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
  [TetrominoType.Z]: [
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
  [TetrominoType.J]: [
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
  [TetrominoType.L]: [
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

// Check if a piece position is valid
export function isValidPosition(
  board: number[][],
  piece: TetrisPiece
): boolean {
  const shape = TETROMINOES[piece.type][piece.rotation];

  for (let row = 0; row < shape.length; row++) {
    for (let col = 0; col < shape[row].length; col++) {
      if (shape[row][col] !== 0) {
        const newRow = piece.y + row;
        const newCol = piece.x + col;

        // Check boundaries
        if (
          newRow < 0 ||
          newRow >= BOARD_HEIGHT ||
          newCol < 0 ||
          newCol >= BOARD_WIDTH
        ) {
          return false;
        }

        // Check collision with existing pieces
        if (board[newRow][newCol] !== 0) {
          return false;
        }
      }
    }
  }

  return true;
}

// Move piece in a direction
export function movePiece(
  player: Player,
  direction: "left" | "right" | "down"
): boolean {
  if (!player.currentPiece) return false;

  const newPiece = { ...player.currentPiece };

  switch (direction) {
    case "left":
      newPiece.x -= 1;
      break;
    case "right":
      newPiece.x += 1;
      break;
    case "down":
      newPiece.y += 1;
      break;
  }

  if (isValidPosition(player.gameBoard, newPiece)) {
    player.currentPiece = newPiece;
    return true;
  }

  return false;
}

// Rotate piece
export function rotatePiece(player: Player): boolean {
  if (!player.currentPiece) return false;

  const maxRotations = TETROMINOES[player.currentPiece.type].length;
  const newRotation = (player.currentPiece.rotation + 1) % maxRotations;
  const newPiece = {
    ...player.currentPiece,
    rotation: newRotation,
    shape: TETROMINOES[player.currentPiece.type][newRotation],
  };

  // Try rotation at current position first
  if (isValidPosition(player.gameBoard, newPiece)) {
    player.currentPiece = newPiece;
    return true;
  }

  // If rotation failed, try wall kicks
  // Try moving left and right by 1 and 2 positions
  const wallKickOffsets = [-1, 1, -2, 2];
  
  for (const offset of wallKickOffsets) {
    const kickedPiece = {
      ...newPiece,
      x: newPiece.x + offset,
    };
    
    if (isValidPosition(player.gameBoard, kickedPiece)) {
      player.currentPiece = kickedPiece;
      return true;
    }
  }

  // If all wall kicks failed, try moving up (for I-piece and some edge cases)
  const upKickPiece = {
    ...newPiece,
    y: newPiece.y - 1,
  };
  
  if (isValidPosition(player.gameBoard, upKickPiece)) {
    player.currentPiece = upKickPiece;
    return true;
  }

  return false;
}

// Hard drop piece
export function hardDrop(player: Player): {
  gameOver: boolean;
  linesCleared: number;
  clearedRows: number[];
} {
  if (!player.currentPiece) return { gameOver: false, linesCleared: 0, clearedRows: [] };

  // Move piece down as far as possible
  while (movePiece(player, "down")) {
    // Keep moving down
  }

  // Lock the piece
  return lockPiece(player);
}

// Lock piece to board and check for line clears
export function lockPiece(player: Player): {
  gameOver: boolean;
  linesCleared: number;
  clearedRows: number[];
} {
  if (!player.currentPiece) return { gameOver: false, linesCleared: 0, clearedRows: [] };

  const piece = player.currentPiece;
  const shape = TETROMINOES[piece.type][piece.rotation];

  // Place piece on board
  for (let row = 0; row < shape.length; row++) {
    for (let col = 0; col < shape[row].length; col++) {
      if (shape[row][col] !== 0) {
        const boardRow = piece.y + row;
        const boardCol = piece.x + col;

        if (
          boardRow >= 0 &&
          boardRow < BOARD_HEIGHT &&
          boardCol >= 0 &&
          boardCol < BOARD_WIDTH
        ) {
          player.gameBoard[boardRow][boardCol] = shape[row][col];
        }
      }
    }
  }

  // Check for clearable lines but don't clear them yet
  const clearedRows = getClearableLines(player.gameBoard);
  const linesCleared = clearedRows.length;

  // Generate next piece
  generateNextPiece(player);

  // Check game over
  const gameOver = player.currentPiece
    ? !isValidPosition(player.gameBoard, player.currentPiece)
    : false;
  if (gameOver) {
    player.isGameOver = true;
  }

  return { gameOver, linesCleared, clearedRows };
}

// Actually clear the lines from the board (called after animation)
export function executeLineClear(player: Player, rowsToClear: number[]): void {
  // Clear the lines
  for (let row = BOARD_HEIGHT - 1; row >= 0; row--) {
    if (rowsToClear.includes(row)) {
      // Remove the completed line
      player.gameBoard.splice(row, 1);
      // Add new empty line at top
      player.gameBoard.unshift(new Array(BOARD_WIDTH).fill(0));
      row++; // Check same row again since lines shifted down
    }
  }

  // Update score and stats
  const linesCleared = rowsToClear.length;
  if (linesCleared > 0) {
    const points = [0, 100, 300, 500, 800][linesCleared] || 800;
    player.score += points * (player.level + 1);
    player.lines += linesCleared;
    player.level = Math.floor(player.lines / 10) + 1;
  }
}

// Check which lines are complete and ready to be cleared
export function getClearableLines(board: number[][]): number[] {
  const clearableRows: number[] = [];
  
  for (let row = BOARD_HEIGHT - 1; row >= 0; row--) {
    if (board[row].every((cell) => cell !== 0)) {
      clearableRows.push(row);
    }
  }
  
  return clearableRows;
}

// Generate next piece
function generateNextPiece(player: Player): void {
  // Move next piece to current
  if (player.nextPiece) {
    const shape = TETROMINOES[player.nextPiece.type][0]; // Use first rotation
    player.currentPiece = {
      type: player.nextPiece.type,
      x: Math.floor(BOARD_WIDTH / 2) - 1,
      y: 0,
      rotation: 0,
      shape,
    };
  }

  // Generate new next piece
  const pieces = Object.values(TetrominoType);
  const randomType = pieces[Math.floor(Math.random() * pieces.length)];
  const shape = TETROMINOES[randomType][0]; // Use first rotation

  player.nextPiece = {
    type: randomType,
    x: 0,
    y: 0,
    rotation: 0,
    shape,
  };

  // Reset hold ability
  player.canHold = true;
}

// Hold piece
export function holdPiece(player: Player): boolean {
  if (!player.canHold || !player.currentPiece) return false;

  const currentPiece = player.currentPiece;

  if (player.holdPiece) {
    // Swap with held piece
    const shape = TETROMINOES[player.holdPiece.type][0]; // Use first rotation
    player.currentPiece = {
      type: player.holdPiece.type,
      x: Math.floor(BOARD_WIDTH / 2) - 1,
      y: 0,
      rotation: 0,
      shape,
    };
    player.holdPiece = currentPiece;
  } else {
    // Hold current piece and get next
    player.holdPiece = currentPiece;
    generateNextPiece(player);
  }

  player.canHold = false;
  return true;
}

// Initialize new game for player
export function initializePlayer(playerId: string, playerName: string): Player {
  const player: Player = {
    id: playerId,
    name: playerName,
    gameBoard: Array(BOARD_HEIGHT)
      .fill(null)
      .map(() => Array(BOARD_WIDTH).fill(0)),
    currentPiece: undefined,
    nextPiece: undefined,
    holdPiece: undefined,
    canHold: true,
    score: 0,
    level: 1,
    lines: 0,
    isReady: false,
    isGameOver: false,
  };

  // Generate initial pieces
  generateNextPiece(player);

  return player;
}
