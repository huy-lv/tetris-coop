import { GameState, Move, Placement, TetrisPiece } from "../utils/types";
import { BOARD_WIDTH, BOARD_HEIGHT, TETROMINOES } from "../utils/constants";
import { getConfig } from "../config/config";
import { Logger } from "../utils/helpers";

export class Strategy {
  private logger: Logger;
  private config = getConfig();

  constructor(debug = false) {
    this.logger = new Logger(debug);
  }

  async calculateBestMove(gameState: GameState): Promise<Move | null> {
    if (!gameState.currentPiece || !gameState.isGameActive) {
      return null;
    }

    this.logger.debug_(
      "Calculating best move for piece:",
      gameState.currentPiece.type
    );

    // Generate all possible placements
    const allPlacements = this.generateAllPlacements(
      gameState.board,
      gameState.currentPiece
    );

    if (allPlacements.length === 0) {
      this.logger.warn("No valid placements found!");
      return null;
    }

    // Evaluate each placement
    let bestPlacement: Placement | null = null;
    let bestScore = -Infinity;

    for (const placement of allPlacements) {
      const score = this.evaluatePlacement(gameState.board, placement);

      if (score > bestScore) {
        bestScore = score;
        bestPlacement = placement;
      }
    }

    if (!bestPlacement) {
      this.logger.warn("No best placement found!");
      return null;
    }

    this.logger.debug_(
      "Best placement score:",
      bestScore,
      "at position:",
      bestPlacement.x,
      bestPlacement.y
    );

    // Convert placement to move
    return this.convertPlacementToMove(gameState.currentPiece, bestPlacement);
  }

  private generateAllPlacements(
    board: number[][],
    piece: TetrisPiece
  ): Placement[] {
    const placements: Placement[] = [];

    // Try all rotations
    for (let rotation = 0; rotation < 4; rotation++) {
      const rotatedShape = this.getRotatedShape(piece.type, rotation);
      if (!rotatedShape) continue;

      // Try all horizontal positions
      for (let x = 0; x < BOARD_WIDTH; x++) {
        const placement = this.dropPieceToBottom(
          board,
          piece.type,
          x,
          rotation,
          rotatedShape
        );

        if (placement && placement.isValid) {
          placements.push(placement);
        }
      }
    }

    return placements;
  }

  private dropPieceToBottom(
    board: number[][],
    pieceType: TetrisPiece["type"],
    x: number,
    rotation: number,
    shape: number[][]
  ): Placement | null {
    // Start from top and drop down until collision
    for (let y = 0; y < BOARD_HEIGHT; y++) {
      if (!this.isValidPosition(board, shape, x, y)) {
        // Previous position was the lowest valid
        const finalY = y - 1;

        if (finalY < 0) return null; // Can't place piece

        return {
          x,
          y: finalY,
          rotation,
          piece: {
            type: pieceType,
            x,
            y: finalY,
            rotation,
            shape,
          },
          isValid: true,
          score: 0, // Will be calculated later
        };
      }
    }

    // Piece can be placed at bottom
    return {
      x,
      y: BOARD_HEIGHT - shape.length,
      rotation,
      piece: {
        type: pieceType,
        x,
        y: BOARD_HEIGHT - shape.length,
        rotation,
        shape,
      },
      isValid: true,
      score: 0,
    };
  }

  private isValidPosition(
    board: number[][],
    shape: number[][],
    x: number,
    y: number
  ): boolean {
    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (shape[row][col]) {
          const boardX = x + col;
          const boardY = y + row;

          // Check boundaries
          if (
            boardX < 0 ||
            boardX >= BOARD_WIDTH ||
            boardY < 0 ||
            boardY >= BOARD_HEIGHT
          ) {
            return false;
          }

          // Check collision with existing pieces
          if (board[boardY][boardX] !== 0) {
            return false;
          }
        }
      }
    }
    return true;
  }

  private evaluatePlacement(board: number[][], placement: Placement): number {
    // Create a copy of the board with the piece placed
    const testBoard = this.placePieceOnBoard(board, placement);

    let score = 0;
    const weights = this.config.evaluation;

    // 1. Lines cleared (very positive)
    const linesCleared = this.calculateLinesCleared(testBoard);
    score += linesCleared * weights.linesWeight;

    // 2. Height penalty (negative - prefer lower pieces)
    const height = this.calculateHeight(testBoard);
    score += height * weights.heightWeight;

    // 3. Holes penalty (very negative - avoid creating holes)
    const holes = this.calculateHoles(testBoard);
    score += holes * weights.holesWeight;

    // 4. Bumpiness penalty (negative - prefer flat surface)
    const bumpiness = this.calculateBumpiness(testBoard);
    score += bumpiness * weights.bumpinessWeight;

    return score;
  }

  private placePieceOnBoard(
    board: number[][],
    placement: Placement
  ): number[][] {
    const newBoard = board.map((row) => [...row]);
    const { x, y } = placement;
    const shape = placement.piece.shape;

    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (shape[row][col]) {
          const boardY = y + row;
          const boardX = x + col;

          if (
            boardY >= 0 &&
            boardY < BOARD_HEIGHT &&
            boardX >= 0 &&
            boardX < BOARD_WIDTH
          ) {
            newBoard[boardY][boardX] = 1; // Mark as filled
          }
        }
      }
    }

    return newBoard;
  }

  private calculateLinesCleared(board: number[][]): number {
    let linesCleared = 0;

    for (let row = 0; row < BOARD_HEIGHT; row++) {
      if (board[row].every((cell) => cell !== 0)) {
        linesCleared++;
      }
    }

    return linesCleared;
  }

  private calculateHeight(board: number[][]): number {
    for (let row = 0; row < BOARD_HEIGHT; row++) {
      if (board[row].some((cell) => cell !== 0)) {
        return BOARD_HEIGHT - row;
      }
    }
    return 0;
  }

  private calculateHoles(board: number[][]): number {
    let holes = 0;

    for (let col = 0; col < BOARD_WIDTH; col++) {
      let foundBlock = false;

      for (let row = 0; row < BOARD_HEIGHT; row++) {
        if (board[row][col] !== 0) {
          foundBlock = true;
        } else if (foundBlock && board[row][col] === 0) {
          holes++;
        }
      }
    }

    return holes;
  }

  private calculateBumpiness(board: number[][]): number {
    const heights: number[] = [];

    // Calculate height of each column
    for (let col = 0; col < BOARD_WIDTH; col++) {
      let height = 0;
      for (let row = 0; row < BOARD_HEIGHT; row++) {
        if (board[row][col] !== 0) {
          height = BOARD_HEIGHT - row;
          break;
        }
      }
      heights.push(height);
    }

    // Calculate bumpiness (difference between adjacent columns)
    let bumpiness = 0;
    for (let i = 0; i < heights.length - 1; i++) {
      bumpiness += Math.abs(heights[i] - heights[i + 1]);
    }

    return bumpiness;
  }

  private getRotatedShape(
    pieceType: TetrisPiece["type"],
    rotation: number
  ): number[][] | null {
    const shapes = TETROMINOES[pieceType];
    if (!shapes || shapes.length === 0) return null;

    return shapes[rotation % shapes.length];
  }

  private convertPlacementToMove(
    currentPiece: TetrisPiece,
    targetPlacement: Placement
  ): Move {
    const horizontalMoves = targetPlacement.x - currentPiece.x;
    const rotations =
      (targetPlacement.rotation - currentPiece.rotation + 4) % 4;

    return {
      horizontalMoves,
      rotations,
      hardDrop: true, // Always use hard drop for now
      softDrop: false,
      useHold: false,
    };
  }
}
