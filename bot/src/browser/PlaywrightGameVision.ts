import { Page } from "playwright";

export interface GameState {
  board: number[][];
  currentPiece: PieceType;
  nextPiece: string;
  score: number;
  level: number;
  lines: number;
}

export type PieceType = "I" | "O" | "T" | "S" | "Z" | "J" | "L";

export class PlaywrightGameVision {
  private logger = console;

  constructor(private page: Page) {}

  async getCurrentGameState(): Promise<GameState> {
    try {
      const gameState = await this.getBasicGameState();

      this.logger.info(`🎯 Current piece: ${gameState.currentPiece}`);
      this.logger.info(`🔄 Next piece: ${gameState.nextPiece}`);

      return gameState;
    } catch (error) {
      this.logger.error("Error getting current game state:", error);
      return {
        board: Array(20)
          .fill(null)
          .map(() => Array(10).fill(0)),
        currentPiece: "I" as PieceType,
        nextPiece: "O",
        score: 0,
        level: 1,
        lines: 0,
      };
    }
  }

  private async getBasicGameState(): Promise<{
    board: number[][];
    currentPiece: PieceType;
    nextPiece: string;
    score: number;
    level: number;
    lines: number;
  }> {
    const gameData = await this.page.evaluate(() => {
      // Look for game stats
      const scoreElement = document.querySelector(
        '[class*="score"], [data-testid*="score"]'
      );
      const levelElement = document.querySelector(
        '[class*="level"], [data-testid*="level"]'
      );
      const linesElement = document.querySelector(
        '[class*="lines"], [data-testid*="lines"]'
      );

      return {
        score: scoreElement ? parseInt(scoreElement.textContent || "0") : 0,
        level: levelElement ? parseInt(levelElement.textContent || "1") : 1,
        lines: linesElement ? parseInt(linesElement.textContent || "0") : 0,
      };
    });

    const board = await this.readGameBoard();
    const currentPiece = await this.getCurrentPiece();
    const nextPiece = await this.getNextPiece();

    return {
      board,
      currentPiece,
      nextPiece,
      score: gameData.score,
      level: gameData.level,
      lines: gameData.lines,
    };
  }

  async readGameBoard(): Promise<number[][]> {
    return this.page.evaluate(() => {
      // Create empty 20x10 board
      const board = Array(20)
        .fill(null)
        .map(() => Array(10).fill(0));

      // Find the game board element
      const gameBoard = document.querySelector('[data-testid="game-board"]');
      if (!gameBoard) {
        console.log("🔍 Game board element not found");
        return board;
      }

      // Get all child divs (cells)
      const cells = gameBoard.children;
      console.log(`📊 Found ${cells.length} cells in game board`);

      // We need to identify what colors represent placed pieces vs empty cells
      // Let's first analyze all the colors
      const colorCounts = new Map<string, number>();
      for (let i = 0; i < cells.length && i < 200; i++) {
        const cell = cells[i] as HTMLElement;
        const style = window.getComputedStyle(cell);
        const backgroundColor = style.backgroundColor;
        colorCounts.set(
          backgroundColor,
          (colorCounts.get(backgroundColor) || 0) + 1
        );
      }

      console.log("📊 Background color analysis:");
      colorCounts.forEach((count, color) => {
        console.log(`  ${color}: ${count} cells`);
      });

      // Find the most common color - this is likely the empty cell color
      let mostCommonColor = "";
      let maxCount = 0;
      colorCounts.forEach((count, color) => {
        if (count > maxCount) {
          maxCount = count;
          mostCommonColor = color;
        }
      });

      console.log(
        `📊 Most common background color (likely empty): ${mostCommonColor} (${maxCount} cells)`
      );

      // Iterate through cells and populate board
      for (let i = 0; i < cells.length && i < 200; i++) {
        const cell = cells[i] as HTMLElement;
        const style = window.getComputedStyle(cell);
        const backgroundColor = style.backgroundColor;

        // Calculate row and column
        const row = Math.floor(i / 10);
        const col = i % 10;

        // Cell is filled if:
        // 1. It's not the most common color (not empty)
        // 2. It's not ghost piece color
        // 3. It's not transparent
        if (
          backgroundColor &&
          backgroundColor !== mostCommonColor &&
          backgroundColor !== "rgba(128, 128, 128, 1)" &&
          backgroundColor !== "rgb(128, 128, 128)" &&
          backgroundColor !== "rgba(0, 0, 0, 0)" &&
          backgroundColor !== "transparent" &&
          !backgroundColor.includes("128, 128, 128")
        ) {
          board[row][col] = 1;
          console.log(
            `📍 Filled cell at row ${row}, col ${col}, color: ${backgroundColor}`
          );
        }
      }

      // Count filled cells for debugging
      let filledCount = 0;
      for (let row = 0; row < 20; row++) {
        for (let col = 0; col < 10; col++) {
          if (board[row][col] === 1) filledCount++;
        }
      }
      console.log(`📊 Board has ${filledCount} filled cells`);

      return board;
    });
  }

  async getCurrentPiece(): Promise<PieceType> {
    try {
      // Get ghost piece data from game board
      const ghostPieceData = await this.page.evaluate(() => {
        console.log("=== GHOST PIECE DETECTION ===");

        // Find the game board
        const gameBoard = document.querySelector('[data-testid="game-board"]');
        if (!gameBoard) {
          console.log('Game board with data-testid="game-board" not found');
          return null;
        }

        console.log("Found game board element:", gameBoard);

        // Get all cell divs inside the game board
        const cellDivs = gameBoard.querySelectorAll("div");
        console.log(`Found ${cellDivs.length} cell divs in game board`);

        // Look specifically for ghost piece cells (rgba(128, 128, 128))
        const ghostCells: Array<{
          index: number;
          row: number;
          col: number;
          color: string;
        }> = [];

        // Game board dimensions: 10 columns x 20 rows
        const BOARD_WIDTH = 10;
        const BOARD_HEIGHT = 20;

        cellDivs.forEach((cell, index) => {
          const style = window.getComputedStyle(cell);
          const bgColor = style.backgroundColor;

          // Look specifically for ghost piece color: rgba(128, 128, 128) with any opacity
          if (
            bgColor === "rgba(128, 128, 128, 0.6)" ||
            bgColor === "rgb(128, 128, 128)" ||
            bgColor === "rgba(128, 128, 128, 1)" ||
            bgColor.includes("128, 128, 128")
          ) {
            const row = Math.floor(index / BOARD_WIDTH);
            const col = index % BOARD_WIDTH;

            // Make sure it's within valid board bounds
            if (
              row >= 0 &&
              row < BOARD_HEIGHT &&
              col >= 0 &&
              col < BOARD_WIDTH
            ) {
              ghostCells.push({
                index,
                row,
                col,
                color: bgColor,
              });
            }
          }
        });

        console.log(`Found ${ghostCells.length} ghost piece cells`);

        if (ghostCells.length > 0) {
          // Log ghost piece cells for debugging
          ghostCells.forEach((cell, i) => {
            console.log(
              `Ghost cell ${i}: row=${cell.row}, col=${cell.col}, color=${cell.color}`
            );
          });
        }

        return ghostCells;
      });

      if (ghostPieceData && ghostPieceData.length > 0) {
        console.log(`Processing ${ghostPieceData.length} ghost piece cells`);

        // Convert ghost cells to positions for pattern analysis
        const ghostPositions = ghostPieceData.map((cell) => ({
          row: cell.row,
          col: cell.col,
        }));

        console.log("Ghost piece positions:", ghostPositions);

        // Determine piece type from ghost piece pattern
        const pieceFromPattern = this.analyzePiecePattern(ghostPositions);
        if (pieceFromPattern) {
          console.log(
            `✅ Determined piece type from ghost pattern: ${pieceFromPattern}`
          );
          this.logger.info(
            `🎯 Current piece detected from ghost: ${pieceFromPattern}`
          );
          return pieceFromPattern;
        }

        // If pattern analysis fails, try to infer from count and arrangement
        const pieceFromCount = this.inferPieceFromCellCount(ghostPositions);
        if (pieceFromCount) {
          console.log(
            `✅ Determined piece type from ghost count: ${pieceFromCount}`
          );
          this.logger.info(
            `🎯 Current piece detected from ghost count: ${pieceFromCount}`
          );
          return pieceFromCount;
        }

        console.log("❌ Could not determine piece type from ghost piece");
      } else {
        console.log("❌ No ghost piece cells found");
      }

      // Fallback: Time-based cycling for testing
      const pieces = ["I", "O", "T", "S", "Z", "J", "L"] as const;
      const now = Date.now();
      const cycleIndex = Math.floor(now / 3000) % pieces.length; // Change every 3 seconds
      const cyclePiece = pieces[cycleIndex];

      console.log(`No ghost piece detected, using cycling: ${cyclePiece}`);
      this.logger.info(`🎯 Current piece detected (fallback): ${cyclePiece}`);
      return cyclePiece;
    } catch (error) {
      this.logger.error("Error detecting current piece from ghost:", error);
      // Return different pieces on error
      const pieces: PieceType[] = ["T", "O", "L", "J", "S", "Z", "I"];
      const randomIndex = Math.floor(Math.random() * pieces.length);
      return pieces[randomIndex];
    }
  }

  // Helper method to analyze piece pattern/shape from ghost piece positions
  private analyzePiecePattern(
    positions: Array<{ row: number; col: number }>
  ): PieceType | null {
    if (positions.length < 2 || positions.length > 4) {
      return null;
    }

    // Sort positions by row, then by column
    const sorted = positions.sort((a, b) => a.row - b.row || a.col - b.col);

    // Calculate relative positions (normalized to start from 0,0)
    const minRow = Math.min(...sorted.map((p) => p.row));
    const minCol = Math.min(...sorted.map((p) => p.col));

    const normalized = sorted.map((p) => ({
      row: p.row - minRow,
      col: p.col - minCol,
    }));

    // Pattern matching for different piece shapes
    const pattern = normalized.map((p) => `${p.row},${p.col}`).join("|");

    console.log(`Ghost piece pattern: ${pattern}`);

    // Known piece patterns (there might be rotations)
    const patterns: { [key: string]: PieceType } = {
      // I piece (line) - various orientations
      "0,0|0,1|0,2|0,3": "I", // horizontal
      "0,0|1,0|2,0|3,0": "I", // vertical

      // O piece (square)
      "0,0|0,1|1,0|1,1": "O",

      // T piece - various orientations
      "0,1|1,0|1,1|1,2": "T", // T pointing up
      "0,0|1,0|1,1|2,0": "T", // T pointing right
      "0,0|0,1|0,2|1,1": "T", // T pointing down
      "0,1|1,0|1,1|2,1": "T", // T pointing left

      // L piece - various orientations
      "0,0|1,0|2,0|2,1": "L",
      "0,0|0,1|0,2|1,0": "L",
      "0,0|0,1|1,1|2,1": "L",
      "0,2|1,0|1,1|1,2": "L",

      // J piece - various orientations
      "0,1|1,1|2,0|2,1": "J",
      "0,0|1,0|1,1|1,2": "J",
      "0,0|0,1|1,0|2,0": "J",
      "0,0|0,1|0,2|1,2": "J",

      // S piece - various orientations
      "0,1|0,2|1,0|1,1": "S",
      "0,0|1,0|1,1|2,1": "S",

      // Z piece - various orientations
      "0,0|0,1|1,1|1,2": "Z",
      "0,1|1,0|1,1|2,0": "Z",
    };

    return patterns[pattern] || null;
  }

  // Helper method to infer piece type from cell count and rough arrangement
  private inferPieceFromCellCount(
    positions: Array<{ row: number; col: number }>
  ): PieceType | null {
    const count = positions.length;

    if (count === 4) {
      // Most pieces have 4 cells
      const rows = [...new Set(positions.map((p) => p.row))].length;
      const cols = [...new Set(positions.map((p) => p.col))].length;

      console.log(`Ghost piece spans ${rows} rows and ${cols} columns`);

      // Simple heuristics based on dimensions
      if (rows === 1 && cols === 4) return "I"; // Horizontal line
      if (rows === 4 && cols === 1) return "I"; // Vertical line
      if (rows === 2 && cols === 2) return "O"; // Square
      if (rows === 2 && cols === 3) return "T"; // T-like shape
      if (rows === 3 && cols === 2) return "L"; // L or J-like shape

      // Default to T for 4-cell pieces
      return "T";
    }

    // For non-standard counts, return null
    return null;
  }

  async getNextPiece(): Promise<string> {
    try {
      const nextPiece = await this.page.evaluate(() => {
        // Look for next piece indicators
        const nextElements = document.querySelectorAll(
          '[class*="next"], [class*="preview"], [data-testid*="next"]'
        );

        for (const element of nextElements) {
          const text = element.textContent?.toLowerCase() || "";
          const pieceTypes = ["i", "o", "t", "s", "z", "j", "l"];

          for (const type of pieceTypes) {
            if (text.includes(type)) {
              return type.toUpperCase();
            }
          }
        }

        return "O"; // Default next piece
      });

      return nextPiece;
    } catch (error) {
      this.logger.error("Error getting next piece:", error);
      return "O";
    }
  }

  async isGameOver(): Promise<boolean> {
    try {
      return await this.page.evaluate(() => {
        const gameOverElements = document.querySelectorAll(
          '[class*="game-over"], [class*="gameover"], [data-testid*="game-over"]'
        );

        return (
          gameOverElements.length > 0 ||
          document.body.textContent?.toLowerCase().includes("game over") ||
          false
        );
      });
    } catch (error) {
      this.logger.error("Error checking if game is over:", error);
      return false;
    }
  }
}
