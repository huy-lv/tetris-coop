"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TETROMINOES = exports.BOARD_HEIGHT = exports.BOARD_WIDTH = void 0;
exports.createEmptyBoard = createEmptyBoard;
exports.generateRandomPiece = generateRandomPiece;
exports.isValidPosition = isValidPosition;
exports.placePiece = placePiece;
exports.clearLines = clearLines;
exports.calculateScore = calculateScore;
exports.movePiece = movePiece;
exports.rotatePiece = rotatePiece;
exports.hardDrop = hardDrop;
exports.lockPiece = lockPiece;
exports.initializePlayer = initializePlayer;
const types_1 = require("../types");
exports.BOARD_WIDTH = 10;
exports.BOARD_HEIGHT = 20;
exports.TETROMINOES = {
    [types_1.TetrominoType.I]: [
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
    [types_1.TetrominoType.O]: [
        [
            [1, 1],
            [1, 1]
        ]
    ],
    [types_1.TetrominoType.T]: [
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
    [types_1.TetrominoType.S]: [
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
    [types_1.TetrominoType.Z]: [
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
    [types_1.TetrominoType.J]: [
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
    [types_1.TetrominoType.L]: [
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
function createEmptyBoard() {
    return Array(exports.BOARD_HEIGHT).fill(null).map(() => Array(exports.BOARD_WIDTH).fill(0));
}
function generateRandomPiece() {
    const types = Object.values(types_1.TetrominoType);
    const randomType = types[Math.floor(Math.random() * types.length)];
    const shape = exports.TETROMINOES[randomType][0];
    return {
        type: randomType,
        x: Math.floor(exports.BOARD_WIDTH / 2) - Math.floor(shape[0].length / 2),
        y: 0,
        rotation: 0,
        shape
    };
}
function isValidPosition(board, piece, newX, newY, newRotation) {
    const x = newX !== undefined ? newX : piece.x;
    const y = newY !== undefined ? newY : piece.y;
    const rotation = newRotation !== undefined ? newRotation : piece.rotation;
    const shape = exports.TETROMINOES[piece.type][rotation % exports.TETROMINOES[piece.type].length];
    for (let row = 0; row < shape.length; row++) {
        for (let col = 0; col < shape[row].length; col++) {
            if (shape[row][col]) {
                const newRow = y + row;
                const newCol = x + col;
                if (newRow < 0 || newRow >= exports.BOARD_HEIGHT || newCol < 0 || newCol >= exports.BOARD_WIDTH) {
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
function placePiece(board, piece) {
    const newBoard = board.map(row => [...row]);
    const shape = piece.shape;
    for (let row = 0; row < shape.length; row++) {
        for (let col = 0; col < shape[row].length; col++) {
            if (shape[row][col]) {
                const boardRow = piece.y + row;
                const boardCol = piece.x + col;
                if (boardRow >= 0 && boardRow < exports.BOARD_HEIGHT && boardCol >= 0 && boardCol < exports.BOARD_WIDTH) {
                    newBoard[boardRow][boardCol] = getTetrominoNumber(piece.type);
                }
            }
        }
    }
    return newBoard;
}
function getTetrominoNumber(type) {
    const typeMap = {
        [types_1.TetrominoType.I]: 1,
        [types_1.TetrominoType.O]: 2,
        [types_1.TetrominoType.T]: 3,
        [types_1.TetrominoType.S]: 4,
        [types_1.TetrominoType.Z]: 5,
        [types_1.TetrominoType.J]: 6,
        [types_1.TetrominoType.L]: 7
    };
    return typeMap[type];
}
function clearLines(board) {
    const newBoard = board.filter(row => row.some(cell => cell === 0));
    const linesCleared = exports.BOARD_HEIGHT - newBoard.length;
    while (newBoard.length < exports.BOARD_HEIGHT) {
        newBoard.unshift(Array(exports.BOARD_WIDTH).fill(0));
    }
    return { newBoard, linesCleared };
}
function calculateScore(linesCleared, level) {
    const baseScores = [0, 40, 100, 300, 1200];
    return baseScores[linesCleared] * (level + 1);
}
function movePiece(player, direction) {
    if (!player.currentPiece)
        return false;
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
function rotatePiece(player) {
    if (!player.currentPiece)
        return false;
    const newRotation = (player.currentPiece.rotation + 1) % exports.TETROMINOES[player.currentPiece.type].length;
    if (isValidPosition(player.gameBoard, player.currentPiece, undefined, undefined, newRotation)) {
        player.currentPiece.rotation = newRotation;
        player.currentPiece.shape = exports.TETROMINOES[player.currentPiece.type][newRotation];
        return true;
    }
    return false;
}
function hardDrop(player) {
    if (!player.currentPiece)
        return false;
    let newY = player.currentPiece.y;
    while (isValidPosition(player.gameBoard, player.currentPiece, undefined, newY + 1)) {
        newY++;
    }
    player.currentPiece.y = newY;
    return lockPiece(player);
}
function lockPiece(player) {
    if (!player.currentPiece)
        return false;
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
function initializePlayer(id, name) {
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
//# sourceMappingURL=tetris.js.map