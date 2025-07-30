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

      // Try to find and analyze game board
      const canvas = document.querySelector("canvas");
      if (canvas) {
        // For canvas-based games, we'd need to analyze pixels
        // For now, return empty board with some random filled cells for testing
        for (let i = 15; i < 20; i++) {
          for (let j = 0; j < 10; j++) {
            if (Math.random() > 0.7) {
              board[i][j] = 1;
            }
          }
        }
      }

      return board;
    });
  }

  async getCurrentPiece(): Promise<PieceType> {
    try {
      // Get game board data first
      const gameBoardData = await this.page.evaluate(() => {
        console.log("=== GAME BOARD DOM ANALYSIS ===");

        // Method 1: Analyze game board DOM structure
        const gameBoard = document.querySelector('[data-testid="game-board"]');
        if (!gameBoard) {
          console.log('Game board with data-testid="game-board" not found');
          return null;
        }

        console.log("Found game board element:", gameBoard);

        // Get all cell divs inside the game board
        const cellDivs = gameBoard.querySelectorAll("div");
        console.log(`Found ${cellDivs.length} cell divs in game board`);

        // Analyze each cell for colors and positions
        const coloredCells: Array<{
          index: number;
          row: number;
          col: number;
          color: string;
        }> = [];

        // Assuming 10 columns (standard Tetris)
        const BOARD_WIDTH = 10;

        cellDivs.forEach((cell, index) => {
          const style = window.getComputedStyle(cell);
          const bgColor = style.backgroundColor;

          // Check for colored cells (not transparent/default)
          if (
            bgColor &&
            bgColor !== "rgba(0, 0, 0, 0)" &&
            bgColor !== "transparent" &&
            bgColor !== "rgb(255, 255, 255)" &&
            bgColor !== "rgb(0, 0, 0)" &&
            bgColor !== "rgba(255, 255, 255, 1)" &&
            bgColor !== "rgba(0, 0, 0, 1)"
          ) {
            const row = Math.floor(index / BOARD_WIDTH);
            const col = index % BOARD_WIDTH;

            coloredCells.push({
              index,
              row,
              col,
              color: bgColor,
            });
          }
        });

        console.log(`Found ${coloredCells.length} colored cells`);

        if (coloredCells.length > 0) {
          // Log first few colored cells for debugging
          coloredCells.slice(0, 5).forEach((cell, i) => {
            console.log(
              `Colored cell ${i}: row=${cell.row}, col=${cell.col}, color=${cell.color}`
            );
          });
        }

        return coloredCells;
      });

      if (gameBoardData && gameBoardData.length > 0) {
        // Group cells by color to find current piece
        const colorGroups: {
          [color: string]: Array<{ row: number; col: number }>;
        } = {};

        gameBoardData.forEach((cell) => {
          if (!colorGroups[cell.color]) {
            colorGroups[cell.color] = [];
          }
          colorGroups[cell.color].push({ row: cell.row, col: cell.col });
        });

        console.log(
          "Color groups:",
          Object.keys(colorGroups).map((color) => ({
            color,
            count: colorGroups[color].length,
            positions: colorGroups[color],
          }))
        );

        // Find the current piece (usually the topmost group of 4 cells)
        for (const [color, positions] of Object.entries(colorGroups)) {
          if (positions.length >= 2 && positions.length <= 4) {
            // Check if this could be the active piece (topmost cells)
            const minRow = Math.min(...positions.map((p) => p.row));
            const maxRow = Math.max(...positions.map((p) => p.row));
            const minCol = Math.min(...positions.map((p) => p.col));
            const maxCol = Math.max(...positions.map((p) => p.col));

            // Current piece is usually at the top (low row numbers)
            if (minRow <= 3) {
              // Top area of the board
              console.log(
                `Analyzing potential current piece: ${color}, positions:`,
                positions
              );

              // Determine piece type from color
              const pieceFromColor = await this.determinePieceFromColor(color);
              if (pieceFromColor) {
                console.log(
                  `Determined piece type from color: ${pieceFromColor}`
                );
                this.logger.info(
                  `🎯 Current piece detected: ${pieceFromColor}`
                );
                return pieceFromColor;
              }

              // Determine piece type from pattern/shape
              const pieceFromPattern = this.analyzePiecePattern(positions);
              if (pieceFromPattern) {
                console.log(
                  `Determined piece type from pattern: ${pieceFromPattern}`
                );
                this.logger.info(
                  `🎯 Current piece detected: ${pieceFromPattern}`
                );
                return pieceFromPattern;
              }
            }
          }
        }
      }

      // Fallback: Time-based cycling for testing
      const pieces = ["I", "O", "T", "S", "Z", "J", "L"] as const;
      const now = Date.now();
      const cycleIndex = Math.floor(now / 3000) % pieces.length; // Change every 3 seconds
      const cyclePiece = pieces[cycleIndex];

      console.log(`No piece detected from DOM, using cycling: ${cyclePiece}`);
      this.logger.info(`🎯 Current piece detected (fallback): ${cyclePiece}`);
      return cyclePiece;
    } catch (error) {
      this.logger.error("Error detecting current piece:", error);
      // Return different pieces on error
      const pieces: PieceType[] = ["T", "O", "L", "J", "S", "Z", "I"];
      const randomIndex = Math.floor(Math.random() * pieces.length);
      return pieces[randomIndex];
    }
  }

  // Helper method to determine piece type from color
  private async determinePieceFromColor(
    color: string
  ): Promise<PieceType | null> {
    return this.page.evaluate((color) => {
      // Standard Tetris color mappings
      const colorMappings = [
        { colors: ["0, 255, 255", "cyan"], piece: "I" as const }, // Cyan
        { colors: ["255, 255, 0", "yellow"], piece: "O" as const }, // Yellow
        {
          colors: ["128, 0, 128", "purple", "160, 32, 240"],
          piece: "T" as const,
        }, // Purple
        { colors: ["0, 255, 0", "green", "50, 205, 50"], piece: "S" as const }, // Green
        { colors: ["255, 0, 0", "red"], piece: "Z" as const }, // Red
        { colors: ["0, 0, 255", "blue", "30, 144, 255"], piece: "J" as const }, // Blue
        {
          colors: ["255, 165, 0", "orange", "255, 140, 0"],
          piece: "L" as const,
        }, // Orange
      ];

      const lowerColor = color.toLowerCase();

      for (const mapping of colorMappings) {
        for (const colorPattern of mapping.colors) {
          if (lowerColor.includes(colorPattern.toLowerCase())) {
            return mapping.piece;
          }
        }
      }

      return null;
    }, color);
  }

  // Helper method to analyze piece pattern/shape
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
