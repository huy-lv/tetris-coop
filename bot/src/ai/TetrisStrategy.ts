import { GameState, PieceType } from "../browser/PlaywrightGameVision";
import { Move } from "../utils/types";

interface Position {
  x: number;
  y: number;
  rotation: number;
}

interface PlacementEvaluation {
  position: Position;
  score: number;
  move: Move;
}

export class TetrisStrategy {
  private readonly BOARD_WIDTH = 10;
  private readonly BOARD_HEIGHT = 20;

  // Piece shapes in different rotations
  private readonly PIECE_SHAPES: Record<PieceType, number[][][]> = {
    I: [
      [[1, 1, 1, 1]], // horizontal
      [[1], [1], [1], [1]], // vertical
    ],
    O: [
      [
        [1, 1],
        [1, 1],
      ], // only one rotation
    ],
    T: [
      [
        [0, 1, 0],
        [1, 1, 1],
      ], // normal
      [
        [1, 0],
        [1, 1],
        [1, 0],
      ], // right
      [
        [1, 1, 1],
        [0, 1, 0],
      ], // upside down
      [
        [0, 1],
        [1, 1],
        [0, 1],
      ], // left
    ],
    S: [
      [
        [0, 1, 1],
        [1, 1, 0],
      ], // normal
      [
        [1, 0],
        [1, 1],
        [0, 1],
      ], // vertical
    ],
    Z: [
      [
        [1, 1, 0],
        [0, 1, 1],
      ], // normal
      [
        [0, 1],
        [1, 1],
        [1, 0],
      ], // vertical
    ],
    J: [
      [
        [1, 0, 0],
        [1, 1, 1],
      ], // normal
      [
        [1, 1],
        [1, 0],
        [1, 0],
      ], // right
      [
        [1, 1, 1],
        [0, 0, 1],
      ], // upside down
      [
        [0, 1],
        [0, 1],
        [1, 1],
      ], // left
    ],
    L: [
      [
        [0, 0, 1],
        [1, 1, 1],
      ], // normal
      [
        [1, 0],
        [1, 0],
        [1, 1],
      ], // right
      [
        [1, 1, 1],
        [1, 0, 0],
      ], // upside down
      [
        [1, 1],
        [0, 1],
        [0, 1],
      ], // left
    ],
  };

  calculateBestMove(gameState: GameState): Move {
    const { board, currentPiece } = gameState;

    console.log(`🤖 Calculating best move for piece: ${currentPiece}`);
    console.log(`📊 Board state:`);

    // Debug board - show only bottom few rows and count filled cells
    let totalFilledCells = 0;
    for (let y = Math.max(0, board.length - 8); y < board.length; y++) {
      const row = board[y]
        .map((cell) => {
          if (cell === 1) {
            totalFilledCells++;
            return "#";
          }
          return ".";
        })
        .join("");
      const filledInRow = board[y].filter((cell) => cell === 1).length;
      console.log(
        `Row ${y.toString().padStart(2)}: ${row} (${filledInRow}/10 filled)`
      );
    }
    console.log(`📊 Total filled cells on board: ${totalFilledCells}`);

    // Check for any rows that are almost complete
    for (let y = 0; y < board.length; y++) {
      const filledInRow = board[y].filter((cell) => cell === 1).length;
      if (filledInRow >= 8) {
        console.log(
          `🎯 Row ${y} has ${filledInRow}/10 cells - almost complete!`
        );
      }
      if (filledInRow === 10) {
        console.log(`🔥 Row ${y} is COMPLETE and should be cleared!`);
      }
    }

    const bestPlacement = this.findBestPlacement(board, currentPiece);

    if (!bestPlacement) {
      console.log("❌ No valid placement found, using hard drop");
      return {
        hardDrop: true,
        horizontalMoves: 0,
        rotations: 0,
        softDrop: false,
        useHold: false,
      };
    }

    console.log(
      `✅ Best placement found: x=${bestPlacement.position.x}, y=${bestPlacement.position.y}, rotation=${bestPlacement.position.rotation}, score=${bestPlacement.score}`
    );

    return bestPlacement.move;
  }

  private findBestPlacement(
    board: number[][],
    pieceType: PieceType
  ): PlacementEvaluation | null {
    console.log(`� Finding best placement for piece: ${pieceType}`);
    const shapes = this.PIECE_SHAPES[pieceType];
    let bestPlacement: PlacementEvaluation | null = null;
    let bestScore = -Infinity;
    let totalPlacements = 0;

    // Try all rotations
    for (let rotation = 0; rotation < shapes.length; rotation++) {
      const shape = shapes[rotation];
      console.log(`📐 Testing rotation ${rotation}:`, shape);

      // Try all horizontal positions
      for (let x = 0; x < this.BOARD_WIDTH; x++) {
        // Find the lowest valid y position for this x and rotation
        const dropY = this.findDropPosition(board, shape, x);

        if (dropY === -1) {
          console.log(`❌ Invalid placement at x=${x}, rotation=${rotation}`);
          continue; // Invalid placement
        }

        totalPlacements++;
        console.log(
          `✅ Valid placement found: x=${x}, y=${dropY}, rotation=${rotation}`
        );

        // Evaluate this placement
        const score = this.evaluatePlacement(board, shape, x, dropY);

        if (score > bestScore) {
          bestScore = score;
          bestPlacement = {
            position: { x, y: dropY, rotation },
            score,
            move: this.createMoveFromPosition(x, rotation),
          };
          console.log(
            `🎯 New best placement: x=${x}, y=${dropY}, rotation=${rotation}, score=${score}`
          );
        }
      }
    }

    console.log(`📊 Total valid placements found: ${totalPlacements}`);
    return bestPlacement;
  }

  private findDropPosition(
    board: number[][],
    shape: number[][],
    x: number
  ): number {
    const shapeHeight = shape.length;
    const shapeWidth = shape[0].length;

    // Check if piece fits horizontally
    if (x + shapeWidth > this.BOARD_WIDTH) {
      return -1;
    }

    // Start from the bottom and work our way up to find the lowest valid position
    for (let y = this.BOARD_HEIGHT - shapeHeight; y >= 0; y--) {
      if (this.canPlacePiece(board, shape, x, y)) {
        return y;
      }
    }

    return -1; // No valid position found
  }

  private canPlacePiece(
    board: number[][],
    shape: number[][],
    x: number,
    y: number
  ): boolean {
    for (let dy = 0; dy < shape.length; dy++) {
      for (let dx = 0; dx < shape[dy].length; dx++) {
        if (shape[dy][dx] === 1) {
          const boardX = x + dx;
          const boardY = y + dy;

          // Check bounds
          if (
            boardX < 0 ||
            boardX >= this.BOARD_WIDTH ||
            boardY < 0 ||
            boardY >= this.BOARD_HEIGHT
          ) {
            return false;
          }

          // Check collision with existing pieces
          if (board[boardY] && board[boardY][boardX] === 1) {
            return false;
          }
        }
      }
    }
    return true;
  }

  private evaluatePlacement(
    board: number[][],
    shape: number[][],
    x: number,
    y: number
  ): number {
    // Create a copy of the board with the piece placed
    const testBoard = board.map((row) => [...row]);

    // Place the piece
    for (let dy = 0; dy < shape.length; dy++) {
      for (let dx = 0; dx < shape[dy].length; dx++) {
        if (shape[dy][dx] === 1) {
          testBoard[y + dy][x + dx] = 1;
        }
      }
    }

    let score = 0;

    // 1. Lines cleared (HIGHEST PRIORITY) - massive bonus for clearing lines
    const linesCleared = this.countLinesCleared(testBoard);
    if (linesCleared > 0) {
      // Exponential bonus for multiple lines (Tetris > Triple > Double > Single)
      score += Math.pow(linesCleared, 3) * 100000; // 100k, 800k, 2.7M, 6.4M
      console.log(
        `🎉 LINES CLEARED: ${linesCleared} lines! Bonus: ${
          Math.pow(linesCleared, 3) * 100000
        }`
      );
    }

    // 2. Setup for line clearing - bonus for almost-complete rows
    const almostCompleteLines = this.countAlmostCompleteLines(testBoard);
    score += almostCompleteLines * 5000; // Significant bonus for setting up line clears

    // 2b. MASSIVE bonus for completing existing almost-complete rows
    const completionBonus = this.calculateCompletionBonus(board, testBoard);
    score += completionBonus;
    if (completionBonus > 0) {
      console.log(
        `🎯 COMPLETION BONUS: +${completionBonus} for helping complete existing rows!`
      );
    }

    // 2c. Specific bonus for filling gaps in rows with 6+ cells already filled
    const gapFillingBonus = this.calculateGapFillingBonus(board, testBoard);
    score += gapFillingBonus;
    if (gapFillingBonus > 0) {
      console.log(
        `🎯 GAP FILLING BONUS: +${gapFillingBonus} for filling gaps in promising rows!`
      );
    }

    // 2d. MASSIVE bonus for building up from bottom - prioritize bottom rows
    const bottomBuildingBonus = this.calculateBottomBuildingBonus(
      board,
      testBoard,
      y
    );
    score += bottomBuildingBonus;
    if (bottomBuildingBonus > 0) {
      console.log(
        `🎯 BOTTOM BUILDING BONUS: +${bottomBuildingBonus} for building from bottom up!`
      );
    }

    // 3. Lower placement bonus - encourage placing pieces low on the board
    const placementHeight = this.BOARD_HEIGHT - y;
    score += placementHeight * 100; // Higher bonus for lower placement

    // 4. Height penalty (keep stack low to enable more line clears)
    const maxHeight = this.calculateHeight(testBoard);
    score -= Math.pow(maxHeight, 2) * 10; // Quadratic penalty for height

    // 5. Holes penalty (VERY HIGH) - holes prevent line clearing
    const holes = this.countHoles(testBoard);
    let holesPenalty = holes * 2000; // Base penalty

    // Reduce holes penalty if we're making progress toward completing rows
    if (completionBonus > 0 || gapFillingBonus > 0) {
      holesPenalty = holes * 500; // Much lower penalty when completing rows
      console.log(
        `🎯 Reduced holes penalty due to row completion progress: ${holes} holes = -${holesPenalty}`
      );
    }

    score -= holesPenalty;

    // 6. Bumpiness penalty - smooth surface helps with future placements
    const bumpiness = this.calculateBumpiness(testBoard);
    score -= bumpiness * 50;

    // 7. Row completion potential - bonus for rows that are mostly filled
    const rowCompletionPotential =
      this.calculateRowCompletionPotential(testBoard);
    score += rowCompletionPotential * 1000;

    // 8. Avoid creating isolated cells that can't be filled easily
    const isolatedCells = this.countIsolatedCells(testBoard);
    score -= isolatedCells * 1500;

    // 9. Center placement bonus (more movement options)
    if (x >= 3 && x <= 6) {
      score += 200;
    }

    // 10. Tetris well bonus - reward creating wells for I pieces (4-high)
    const tetrisWells = this.countTetrisWells(testBoard);
    score += tetrisWells * 3000;

    console.log(
      `🎯 Placement evaluation: x=${x}, y=${y}, score=${score} (lines=${linesCleared}, almostComplete=${almostCompleteLines}, height=${maxHeight}, holes=${holes}, completion=${completionBonus}, gapFill=${gapFillingBonus}, bottomBuild=${bottomBuildingBonus})`
    );

    return score;
  }

  private countLinesCleared(board: number[][]): number {
    let lines = 0;
    for (let y = 0; y < this.BOARD_HEIGHT; y++) {
      if (board[y].every((cell) => cell === 1)) {
        lines++;
        console.log(`🎯 Line ${y} is complete and will be cleared!`);
      }
    }
    return lines;
  }

  private calculateHeight(board: number[][]): number {
    for (let y = 0; y < this.BOARD_HEIGHT; y++) {
      if (board[y].some((cell) => cell === 1)) {
        return this.BOARD_HEIGHT - y;
      }
    }
    return 0;
  }

  private countHoles(board: number[][]): number {
    let holes = 0;
    for (let x = 0; x < this.BOARD_WIDTH; x++) {
      let foundBlock = false;
      for (let y = 0; y < this.BOARD_HEIGHT; y++) {
        if (board[y][x] === 1) {
          foundBlock = true;
        } else if (foundBlock && board[y][x] === 0) {
          holes++;
        }
      }
    }
    return holes;
  }

  private calculateBumpiness(board: number[][]): number {
    const heights: number[] = [];

    for (let x = 0; x < this.BOARD_WIDTH; x++) {
      let height = 0;
      for (let y = 0; y < this.BOARD_HEIGHT; y++) {
        if (board[y][x] === 1) {
          height = this.BOARD_HEIGHT - y;
          break;
        }
      }
      heights.push(height);
    }

    let bumpiness = 0;
    for (let i = 0; i < heights.length - 1; i++) {
      bumpiness += Math.abs(heights[i] - heights[i + 1]);
    }

    return bumpiness;
  }

  private calculateAggregateHeight(board: number[][]): number {
    let totalHeight = 0;
    for (let x = 0; x < this.BOARD_WIDTH; x++) {
      for (let y = 0; y < this.BOARD_HEIGHT; y++) {
        if (board[y][x] === 1) {
          totalHeight += this.BOARD_HEIGHT - y;
          break;
        }
      }
    }
    return totalHeight;
  }

  private countWells(board: number[][]): number {
    let wells = 0;
    for (let x = 0; x < this.BOARD_WIDTH; x++) {
      for (let y = 0; y < this.BOARD_HEIGHT - 1; y++) {
        if (board[y][x] === 0) {
          const leftWall = x === 0 || board[y][x - 1] === 1;
          const rightWall = x === this.BOARD_WIDTH - 1 || board[y][x + 1] === 1;

          if (leftWall && rightWall) {
            // Count depth of well
            let depth = 0;
            for (
              let dy = y;
              dy < this.BOARD_HEIGHT && board[dy][x] === 0;
              dy++
            ) {
              depth++;
            }
            wells += depth;
            break;
          }
        }
      }
    }
    return wells;
  }

  private calculateRowTransitions(board: number[][]): number {
    let transitions = 0;
    for (let y = 0; y < this.BOARD_HEIGHT; y++) {
      for (let x = 0; x < this.BOARD_WIDTH - 1; x++) {
        if (board[y][x] !== board[y][x + 1]) {
          transitions++;
        }
      }
    }
    return transitions;
  }

  private calculateColumnTransitions(board: number[][]): number {
    let transitions = 0;
    for (let x = 0; x < this.BOARD_WIDTH; x++) {
      for (let y = 0; y < this.BOARD_HEIGHT - 1; y++) {
        if (board[y][x] !== board[y + 1][x]) {
          transitions++;
        }
      }
    }
    return transitions;
  }
  private createMoveFromPosition(targetX: number, rotation: number): Move {
    // Assume current piece starts at x=4 (center of 10-wide board)
    const startX = 4;
    const horizontalMoves = targetX - startX;

    return {
      horizontalMoves,
      rotations: rotation,
      hardDrop: true,
      softDrop: false,
      useHold: false,
    };
  }

  // New helper methods for line clearing optimization
  private countAlmostCompleteLines(board: number[][]): number {
    let almostComplete = 0;
    for (let y = 0; y < this.BOARD_HEIGHT; y++) {
      const filledCells = board[y].filter((cell) => cell === 1).length;
      // Count rows that are 7, 8 or 9 cells filled (almost complete)
      if (filledCells >= 7 && filledCells < 10) {
        almostComplete++;
        console.log(
          `🎯 Row ${y} is almost complete with ${filledCells}/10 cells filled`
        );

        // Show which cells are missing for completion
        const missingPositions = [];
        for (let x = 0; x < this.BOARD_WIDTH; x++) {
          if (board[y][x] === 0) {
            missingPositions.push(x);
          }
        }
        console.log(
          `   Missing cells at positions: [${missingPositions.join(", ")}]`
        );
      }
    }
    return almostComplete;
  }

  private calculateRowCompletionPotential(board: number[][]): number {
    let potential = 0;
    for (let y = 0; y < this.BOARD_HEIGHT; y++) {
      const filledCells = board[y].filter((cell) => cell === 1).length;
      // Higher bonus for more filled rows (potential for line clearing)
      if (filledCells >= 6) {
        potential += filledCells - 5; // 1 point for 6 cells, 2 for 7, etc.
      }
    }
    return potential;
  }

  private countIsolatedCells(board: number[][]): number {
    let isolated = 0;
    for (let y = 1; y < this.BOARD_HEIGHT - 1; y++) {
      for (let x = 1; x < this.BOARD_WIDTH - 1; x++) {
        if (board[y][x] === 0) {
          // Count empty cells that are surrounded by filled cells
          const surrounded =
            board[y - 1][x] !== 0 &&
            board[y + 1][x] !== 0 &&
            board[y][x - 1] !== 0 &&
            board[y][x + 1] !== 0;
          if (surrounded) {
            isolated++;
          }
        }
      }
    }
    return isolated;
  }

  private countTetrisWells(board: number[][]): number {
    let tetrisWells = 0;
    for (let x = 0; x < this.BOARD_WIDTH; x++) {
      let wellDepth = 0;
      let inWell = false;

      for (let y = 0; y < this.BOARD_HEIGHT; y++) {
        if (board[y][x] === 0) {
          const leftWall = x === 0 || board[y][x - 1] === 1;
          const rightWall = x === this.BOARD_WIDTH - 1 || board[y][x + 1] === 1;

          if (leftWall && rightWall) {
            if (!inWell) {
              inWell = true;
              wellDepth = 1;
            } else {
              wellDepth++;
            }
          } else {
            if (inWell && wellDepth >= 4) {
              tetrisWells++; // Found a well deep enough for Tetris (I-piece)
            }
            inWell = false;
            wellDepth = 0;
          }
        } else {
          if (inWell && wellDepth >= 4) {
            tetrisWells++;
          }
          inWell = false;
          wellDepth = 0;
        }
      }

      // Check if well extends to bottom
      if (inWell && wellDepth >= 4) {
        tetrisWells++;
      }
    }
    return tetrisWells;
  }

  private calculateCompletionBonus(
    originalBoard: number[][],
    testBoard: number[][]
  ): number {
    let bonus = 0;

    // Check each row in the original board to see if it was almost complete
    for (let y = 0; y < this.BOARD_HEIGHT; y++) {
      const originalFilledCount = originalBoard[y].filter(
        (cell) => cell === 1
      ).length;
      const testFilledCount = testBoard[y].filter((cell) => cell === 1).length;

      // If original row was almost complete (7-9 cells) and test board made it closer/complete
      if (originalFilledCount >= 7 && originalFilledCount < 10) {
        const improvement = testFilledCount - originalFilledCount;
        if (improvement > 0) {
          // Exponential bonus for each cell added to almost-complete rows
          const rowBonus =
            Math.pow(improvement, 2) * 10000 * (originalFilledCount - 6);
          bonus += rowBonus;
          console.log(
            `🎯 Row ${y} was ${originalFilledCount}/10, now ${testFilledCount}/10 (+${improvement} cells) = +${rowBonus} bonus`
          );
        }
      }
    }

    return bonus;
  }

  private calculateGapFillingBonus(
    originalBoard: number[][],
    testBoard: number[][]
  ): number {
    let bonus = 0;

    // Check each row to see if we're filling strategic gaps
    for (let y = 0; y < this.BOARD_HEIGHT; y++) {
      const originalFilledCount = originalBoard[y].filter(
        (cell) => cell === 1
      ).length;
      const testFilledCount = testBoard[y].filter((cell) => cell === 1).length;

      // If row had 6+ cells and we're adding more, give huge bonus
      if (originalFilledCount >= 6 && testFilledCount > originalFilledCount) {
        const improvement = testFilledCount - originalFilledCount;
        // Exponential bonus based on how close we get to completion
        const completionProgress = testFilledCount / 10.0; // 0.6 to 1.0
        const progressBonus =
          Math.pow(completionProgress, 3) * improvement * 50000;
        bonus += progressBonus;
        console.log(
          `🎯 Gap filling in row ${y}: ${originalFilledCount}→${testFilledCount} (+${improvement}) = +${progressBonus} bonus`
        );
      }
    }

    return bonus;
  }

  private calculateBottomBuildingBonus(
    originalBoard: number[][],
    testBoard: number[][],
    pieceY: number
  ): number {
    let bonus = 0;

    // Prioritize filling bottom rows first - exponential bonus for lower rows
    for (let y = this.BOARD_HEIGHT - 1; y >= 0; y--) {
      const originalFilledCount = originalBoard[y].filter(
        (cell) => cell === 1
      ).length;
      const testFilledCount = testBoard[y].filter((cell) => cell === 1).length;

      if (testFilledCount > originalFilledCount) {
        // Exponential bonus based on how low the row is (bottom rows get much higher bonus)
        const distanceFromBottom = this.BOARD_HEIGHT - 1 - y;
        const bottomPriority = Math.pow(2, Math.max(0, 6 - distanceFromBottom)); // 64x bonus for bottom, 32x for second bottom, etc.
        const improvement = testFilledCount - originalFilledCount;
        const rowBonus = improvement * bottomPriority * 10000;
        bonus += rowBonus;
        console.log(
          `🎯 Building at row ${y} (${distanceFromBottom} from bottom): +${improvement} cells = +${rowBonus} bonus (priority=${bottomPriority}x)`
        );
      }
    }

    return bonus;
  }
}
