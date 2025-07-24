import { TetrisPiece, TetrominoType, Player } from '../types';

export const BOARD_WIDTH = 10;
export const BOARD_HEIGHT = 20;

export const TETROMINOES: { [key in TetrominoType]: number[][][] } = {
  [TetrominoType.I]: [
    [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ],
    [
      [0, 0, 1, 0],
      [0, 0, 1, 0],
      [0, 0, 1, 0],
      [0, 0, 1, 0]
    ]
  ],
  [TetrominoType.O]: [
    [
      [1, 1],
      [1, 1]
    ]
  ],
  [TetrominoType.T]: [
    [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0]
    ],
    [
      [0, 1, 0],
      [0, 1, 1],
      [0, 1, 0]
    ],
    [
      [0, 0, 0],
      [1, 1, 1],
      [0, 1, 0]
    ],
    [
      [0, 1, 0],
      [1, 1, 0],
      [0, 1, 0]
    ]
  ],
  [TetrominoType.S]: [
    [
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0]
    ],
    [
      [0, 1, 0],
      [0, 1, 1],
      [0, 0, 1]
    ]
  ],
  [TetrominoType.Z]: [
    [
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 0]
    ],
    [
      [0, 0, 1],
      [0, 1, 1],
      [0, 1, 0]
    ]
  ],
  [TetrominoType.J]: [
    [
      [1, 0, 0],
      [1, 1, 1],
      [0, 0, 0]
    ],
    [
      [0, 1, 1],
      [0, 1, 0],
      [0, 1, 0]
    ],
    [
      [0, 0, 0],
      [1, 1, 1],
      [0, 0, 1]
    ],
    [
      [0, 1, 0],
      [0, 1, 0],
      [1, 1, 0]
    ]
  ],
  [TetrominoType.L]: [
    [
      [0, 0, 1],
      [1, 1, 1],
      [0, 0, 0]
    ],
    [
      [0, 1, 0],
      [0, 1, 0],
      [0, 1, 1]
    ],
    [
      [0, 0, 0],
      [1, 1, 1],
      [1, 0, 0]
    ],
    [
      [1, 1, 0],
      [0, 1, 0],
      [0, 1, 0]
    ]
  ]
};

export function createEmptyBoard(): number[][] {
  return Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(0));
}

export function generateRandomPiece(): TetrisPiece {
  const types = Object.values(TetrominoType);
  const randomType = types[Math.floor(Math.random() * types.length)];
  const shape = TETROMINOES[randomType][0];
  
  return {
    type: randomType,
    x: Math.floor(BOARD_WIDTH / 2) - Math.floor(shape[0].length / 2),
    y: 0,
    rotation: 0,
    shape
  };
}

export function isValidPosition(board: number[][], piece: TetrisPiece, newX?: number, newY?: number, newRotation?: number): boolean {
  const x = newX !== undefined ? newX : piece.x;
  const y = newY !== undefined ? newY : piece.y;
  const rotation = newRotation !== undefined ? newRotation : piece.rotation;
  
  const shape = TETROMINOES[piece.type][rotation % TETROMINOES[piece.type].length];
  
  for (let row = 0; row < shape.length; row++) {
    for (let col = 0; col < shape[row].length; col++) {
      if (shape[row][col]) {
        const newRow = y + row;
        const newCol = x + col;
        
        if (newRow < 0 || newRow >= BOARD_HEIGHT || newCol < 0 || newCol >= BOARD_WIDTH) {
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
  const newBoard = board.map(row => [...row]);
  const shape = piece.shape;
  
  for (let row = 0; row < shape.length; row++) {
    for (let col = 0; col < shape[row].length; col++) {
      if (shape[row][col]) {
        const boardRow = piece.y + row;
        const boardCol = piece.x + col;
        
        if (boardRow >= 0 && boardRow < BOARD_HEIGHT && boardCol >= 0 && boardCol < BOARD_WIDTH) {
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
    [TetrominoType.L]: 7
  };
  return typeMap[type];
}

export function clearLines(board: number[][]): { newBoard: number[][]; linesCleared: number } {
  const newBoard = board.filter(row => row.some(cell => cell === 0));
  const linesCleared = BOARD_HEIGHT - newBoard.length;
  
  while (newBoard.length < BOARD_HEIGHT) {
    newBoard.unshift(Array(BOARD_WIDTH).fill(0));
  }
  
  return { newBoard, linesCleared };
}

export function calculateScore(linesCleared: number, level: number): number {
  const baseScores = [0, 40, 100, 300, 1200];
  return baseScores[linesCleared] * (level + 1);
}

export function movePiece(player: Player, direction: 'left' | 'right' | 'down'): boolean {
  if (!player.currentPiece) return false;
  
  let newX = player.currentPiece.x;
  let newY = player.currentPiece.y;
  
  switch (direction) {
    case 'left':
      newX--;
      break;
    case 'right':
      newX++;
      break;
    case 'down':
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
  
  const newRotation = (player.currentPiece.rotation + 1) % TETROMINOES[player.currentPiece.type].length;
  
  if (isValidPosition(player.gameBoard, player.currentPiece, undefined, undefined, newRotation)) {
    player.currentPiece.rotation = newRotation;
    player.currentPiece.shape = TETROMINOES[player.currentPiece.type][newRotation];
    return true;
  }
  
  return false;
}

export function hardDrop(player: Player): boolean {
  if (!player.currentPiece) return false;
  
  let newY = player.currentPiece.y;
  
  while (isValidPosition(player.gameBoard, player.currentPiece, undefined, newY + 1)) {
    newY++;
  }
  
  player.currentPiece.y = newY;
  return lockPiece(player);
}

export function lockPiece(player: Player): boolean {
  if (!player.currentPiece) return false;
  
  // Place the piece on the board
  player.gameBoard = placePiece(player.gameBoard, player.currentPiece);
  
  // Clear lines and update score
  const { newBoard, linesCleared } = clearLines(player.gameBoard);
  player.gameBoard = newBoard;
  player.lines += linesCleared;
  player.score += calculateScore(linesCleared, player.level);
  
  // Update level (every 10 lines)
  player.level = Math.floor(player.lines / 10);
  
  // Set next piece as current and generate new next piece
  player.currentPiece = player.nextPiece;
  player.nextPiece = generateRandomPiece();
  
  // Check if game is over
  if (player.currentPiece && !isValidPosition(player.gameBoard, player.currentPiece)) {
    player.isGameOver = true;
    return false;
  }
  
  return true;
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
    isGameOver: false
  };
}
