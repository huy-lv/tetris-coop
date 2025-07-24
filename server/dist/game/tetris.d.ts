import { TetrisPiece, TetrominoType, Player } from '../types';
export declare const BOARD_WIDTH = 10;
export declare const BOARD_HEIGHT = 20;
export declare const TETROMINOES: {
    [key in TetrominoType]: number[][][];
};
export declare function createEmptyBoard(): number[][];
export declare function generateRandomPiece(): TetrisPiece;
export declare function isValidPosition(board: number[][], piece: TetrisPiece, newX?: number, newY?: number, newRotation?: number): boolean;
export declare function placePiece(board: number[][], piece: TetrisPiece): number[][];
export declare function clearLines(board: number[][]): {
    newBoard: number[][];
    linesCleared: number;
};
export declare function calculateScore(linesCleared: number, level: number): number;
export declare function movePiece(player: Player, direction: 'left' | 'right' | 'down'): boolean;
export declare function rotatePiece(player: Player): boolean;
export declare function hardDrop(player: Player): boolean;
export declare function lockPiece(player: Player): boolean;
export declare function initializePlayer(id: string, name: string): Player;
//# sourceMappingURL=tetris.d.ts.map