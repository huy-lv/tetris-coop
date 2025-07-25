import { TetrisPiece, TetrominoType, Player, TestMode } from "../types";

export const BOARD_WIDTH = 10;
export const BOARD_HEIGHT = 20;

export const TETROMINOES: { [key in TetrominoType]: number[][][] } = {
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

export function createEmptyBoard(): number[][] {
  return Array(BOARD_HEIGHT)
    .fill(null)
    .map(() => Array(BOARD_WIDTH).fill(0));
}

export function generateRandomPiece(): TetrisPiece {
  // In test mode, always generate O pieces
  const randomType = TestMode
    ? TetrominoType.O
    : (() => {
        const types = Object.values(TetrominoType);
        return types[Math.floor(Math.random() * types.length)];
      })();

  const shape = TETROMINOES[randomType][0];

  return {
    type: randomType,
    x: Math.floor(BOARD_WIDTH / 2) - Math.floor(shape[0].length / 2),
    y: 0,
    rotation: 0,
    shape,
  };
}

export function isValidPosition(
  board: number[][],
  piece: TetrisPiece,
  newX?: number,
  newY?: number,
  newRotation?: number
): boolean {
  const x = newX !== undefined ? newX : piece.x;
  const y = newY !== undefined ? newY : piece.y;
  const rotation = newRotation !== undefined ? newRotation : piece.rotation;

  const shape =
    TETROMINOES[piece.type][rotation % TETROMINOES[piece.type].length];

  for (let row = 0; row < shape.length; row++) {
    for (let col = 0; col < shape[row].length; col++) {
      if (shape[row][col]) {
        const newRow = y + row;
        const newCol = x + col;

        if (
          newRow < 0 ||
          newRow >= BOARD_HEIGHT ||
          newCol < 0 ||
          newCol >= BOARD_WIDTH
        ) {
          return false;
        }

        if (board[newRow][newCol]) {
          return false;
        }
      }
    }
  }

  return true;
}

export function placePiece(board: number[][], piece: TetrisPiece): number[][] {
  const newBoard = board.map((row) => [...row]);
  const shape = piece.shape;

  for (let row = 0; row < shape.length; row++) {
    for (let col = 0; col < shape[row].length; col++) {
      if (shape[row][col]) {
        const boardRow = piece.y + row;
        const boardCol = piece.x + col;

        if (
          boardRow >= 0 &&
          boardRow < BOARD_HEIGHT &&
          boardCol >= 0 &&
          boardCol < BOARD_WIDTH
        ) {
          newBoard[boardRow][boardCol] = getTetrominoNumber(piece.type);
        }
      }
    }
  }

  return newBoard;
}

function getTetrominoNumber(type: TetrominoType): number {
  const typeMap = {
    [TetrominoType.I]: 1,
    [TetrominoType.O]: 2,
    [TetrominoType.T]: 3,
    [TetrominoType.S]: 4,
    [TetrominoType.Z]: 5,
    [TetrominoType.J]: 6,
    [TetrominoType.L]: 7,
  };
  return typeMap[type];
}

export function clearLines(board: number[][]): {
  newBoard: number[][];
  linesCleared: number;
} {
  const newBoard = board.filter((row) => row.some((cell) => cell === 0));
  const linesCleared = BOARD_HEIGHT - newBoard.length;

  while (newBoard.length < BOARD_HEIGHT) {
    newBoard.unshift(Array(BOARD_WIDTH).fill(0));
  }

  return { newBoard, linesCleared };
}

export function detectClearableLines(board: number[][]): {
  clearedRowIndices: number[];
} {
  const clearedRowIndices: number[] = [];

  for (let row = 0; row < BOARD_HEIGHT; row++) {
    if (board[row].every((cell) => cell !== 0)) {
      clearedRowIndices.push(row);
    }
  }

  return { clearedRowIndices };
}

export function calculateScore(linesCleared: number, level: number): number {
  const baseScores = [0, 40, 100, 300, 1200];
  return baseScores[linesCleared] * (level + 1);
}

export function calculateGhostPiecePosition(
  board: number[][],
  piece: TetrisPiece
): TetrisPiece {
  if (!piece) return piece;
  
  const ghostPiece = {
    ...piece,
    y: piece.y
  };
  
  // Drop the ghost piece to the lowest valid position
  while (isValidPosition(board, ghostPiece, undefined, ghostPiece.y + 1)) {
    ghostPiece.y++;
  }
  
  return ghostPiece;
}

export function holdPiece(player: Player): boolean {
  if (!player.currentPiece || !player.canHold) {
    return false;
  }

  // If there's no hold piece, save current piece and spawn new one
  if (!player.holdPiece) {
    player.holdPiece = {
      ...player.currentPiece,
      x: Math.floor(BOARD_WIDTH / 2) - Math.floor(player.currentPiece.shape[0].length / 2),
      y: 0,
      rotation: 0,
      shape: TETROMINOES[player.currentPiece.type][0]
    };
    player.currentPiece = player.nextPiece;
    player.nextPiece = generateRandomPiece();
  } else {
    // Swap current piece with hold piece
    const tempPiece = {
      ...player.holdPiece,
      x: Math.floor(BOARD_WIDTH / 2) - Math.floor(player.holdPiece.shape[0].length / 2),
      y: 0,
      rotation: 0,
      shape: TETROMINOES[player.holdPiece.type][0]
    };
    
    player.holdPiece = {
      ...player.currentPiece,
      x: Math.floor(BOARD_WIDTH / 2) - Math.floor(player.currentPiece.shape[0].length / 2),
      y: 0,
      rotation: 0,
      shape: TETROMINOES[player.currentPiece.type][0]
    };
    
    player.currentPiece = tempPiece;
  }

  // Disable hold until next piece locks
  player.canHold = false;

  // Check if game is over with the new piece
  if (player.currentPiece && !isValidPosition(player.gameBoard, player.currentPiece)) {
    player.isGameOver = true;
    return false;
  }

  return true;
}

export function movePiece(
  player: Player,
  direction: "left" | "right" | "down"
): boolean {
  if (!player.currentPiece) return false;

  let newX = player.currentPiece.x;
  let newY = player.currentPiece.y;

  switch (direction) {
    case "left":
      newX--;
      break;
    case "right":
      newX++;
      break;
    case "down":
      newY++;
      break;
  }

  if (isValidPosition(player.gameBoard, player.currentPiece, newX, newY)) {
    player.currentPiece.x = newX;
    player.currentPiece.y = newY;
    return true;
  }

  return false;
}

export function rotatePiece(player: Player): boolean {
  if (!player.currentPiece) return false;

  const newRotation =
    (player.currentPiece.rotation + 1) %
    TETROMINOES[player.currentPiece.type].length;

  // First try rotation at current position
  if (
    isValidPosition(
      player.gameBoard,
      player.currentPiece,
      undefined,
      undefined,
      newRotation
    )
  ) {
    player.currentPiece.rotation = newRotation;
    player.currentPiece.shape =
      TETROMINOES[player.currentPiece.type][newRotation];
    return true;
  }

  // If rotation fails, try wall kicks (small position adjustments)
  const wallKickOffsets = [
    { x: -1, y: 0 }, // Try one step left
    { x: 1, y: 0 }, // Try one step right
    { x: -2, y: 0 }, // Try two steps left
    { x: 2, y: 0 }, // Try two steps right
    { x: 0, y: -1 }, // Try one step up
    { x: -1, y: -1 }, // Try one step left and up
    { x: 1, y: -1 }, // Try one step right and up
  ];

  for (const offset of wallKickOffsets) {
    const testX = player.currentPiece.x + offset.x;
    const testY = player.currentPiece.y + offset.y;

    if (
      isValidPosition(
        player.gameBoard,
        player.currentPiece,
        testX,
        testY,
        newRotation
      )
    ) {
      // Found a valid position with wall kick
      player.currentPiece.x = testX;
      player.currentPiece.y = testY;
      player.currentPiece.rotation = newRotation;
      player.currentPiece.shape =
        TETROMINOES[player.currentPiece.type][newRotation];
      return true;
    }
  }

  // If all wall kicks fail, rotation is not possible
  return false;
}

export function hardDrop(
  player: Player,
  roomId: string,
  io: any,
  onAnimationComplete?: () => void
): {
  gameOver: boolean;
  clearedRows?: number[];
  dropX?: number;
} {
  if (!player.currentPiece) return { gameOver: false };

  let newY = player.currentPiece.y;

  while (
    isValidPosition(player.gameBoard, player.currentPiece, undefined, newY + 1)
  ) {
    newY++;
  }

  player.currentPiece.y = newY;
  return lockPiece(player, roomId, io, onAnimationComplete);
}

export function lockPiece(
  player: Player,
  roomId: string,
  io: any,
  onAnimationComplete?: () => void
): {
  gameOver: boolean;
  clearedRows?: number[];
  dropX?: number;
} {
  if (!player.currentPiece) return { gameOver: false };

  const dropX = player.currentPiece.x;

  // Place the piece on the board
  player.gameBoard = placePiece(player.gameBoard, player.currentPiece);

  // First detect which lines need to be cleared
  const { clearedRowIndices } = detectClearableLines(player.gameBoard);

  if (clearedRowIndices.length > 0) {
    // Emit animation start event
    io.to(roomId).emit("lines_clearing", {
      playerId: player.id,
      clearedRows: clearedRowIndices,
      dropX: dropX,
    });

    // Delay the actual clearing to allow animation to play
    setTimeout(() => {
      // Now actually clear the lines
      const { newBoard, linesCleared } = clearLines(player.gameBoard);
      player.gameBoard = newBoard;
      player.lines += linesCleared;
      player.score += calculateScore(linesCleared, player.level);

      // Update level (every 10 lines)
      player.level = Math.floor(player.lines / 10);

      // Emit completion event
      io.to(roomId).emit("lines_cleared", {
        playerId: player.id,
        clearedRows: clearedRowIndices,
        dropX: dropX,
      });

      // Call the callback to trigger game state update
      if (onAnimationComplete) {
        onAnimationComplete();
      }
    }, 650); // Wait for animation to complete (600ms + 50ms buffer)
  }

  // Set next piece as current and generate new next piece
  player.currentPiece = player.nextPiece;
  player.nextPiece = generateRandomPiece();
  
  // Reset hold ability for next piece
  player.canHold = true;

  // Check if game is over
  if (
    player.currentPiece &&
    !isValidPosition(player.gameBoard, player.currentPiece)
  ) {
    player.isGameOver = true;
    return {
      gameOver: true,
      clearedRows: clearedRowIndices.length > 0 ? clearedRowIndices : undefined,
      dropX: clearedRowIndices.length > 0 ? dropX : undefined,
    };
  }

  return {
    gameOver: false,
    clearedRows: clearedRowIndices.length > 0 ? clearedRowIndices : undefined,
    dropX: clearedRowIndices.length > 0 ? dropX : undefined,
  };
}

export function initializePlayer(id: string, name: string): Player {
  const currentPiece = generateRandomPiece();
  const nextPiece = generateRandomPiece();

  return {
    id,
    name,
    isReady: false,
    gameBoard: createEmptyBoard(),
    score: 0,
    level: 0,
    lines: 0,
    currentPiece,
    nextPiece,
    holdPiece: undefined,
    canHold: true,
    isGameOver: false,
  };
}
