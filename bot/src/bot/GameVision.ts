import { Page } from "puppeteer";
import { Logger } from "../utils/helpers";
import { GameState, TetrisPiece } from "../utils/types";
import { BOARD_WIDTH, BOARD_HEIGHT } from "../utils/constants";

export class GameVision {
  private logger: Logger;

  constructor(private page: Page) {
    this.logger = new Logger(true); // Enable debug mode
  }

  async getCurrentGameState(): Promise<GameState | null> {
    try {
      const gameState = await this.page.evaluate(() => {
        // Try to find the game board
        const boardElement = document.querySelector(
          '[data-testid="game-board"], .game-board, [class*="Board"], [class*="board"]'
        );

        if (!boardElement) {
          return null;
        }

        // Initialize board
        const board: number[][] = Array(20)
          .fill(0)
          .map(() => Array(10).fill(0));

        // Try to read board state from cells
        const cells = boardElement.querySelectorAll(
          '.cell, [class*="Cell"], [class*="cell"], [class*="block"]'
        );

        cells.forEach((cell: Element, index: number) => {
          const row = Math.floor(index / 10);
          const col = index % 10;
          if (row < 20 && col < 10) {
            // Check if cell is filled (has color, different background, etc.)
            const style = window.getComputedStyle(cell);
            const isEmpty =
              style.backgroundColor === "transparent" ||
              style.backgroundColor === "rgba(0, 0, 0, 0)" ||
              cell.classList.contains("empty") ||
              !cell.classList.contains("filled");

            board[row][col] = isEmpty ? 0 : 1;
          }
        });

        // Try to get current piece info
        const currentPiece = {
          type: "I" as const, // Default, would need more complex detection
          x: 4,
          y: 0,
          rotation: 0,
          shape: [[1, 1, 1, 1]], // Default I piece shape
        };

        // Try to get next piece
        const nextPieceElement = document.querySelector(
          '[class*="NextPiece"], [class*="next-piece"], [class*="preview"]'
        );
        const nextPiece = nextPieceElement
          ? {
              type: "I" as const,
              x: 0,
              y: 0,
              rotation: 0,
              shape: [[1, 1, 1, 1]],
            }
          : null;

        // Try to get game stats
        const scoreElement = document.querySelector(
          '[class*="score"], [data-testid="score"]'
        );
        const linesElement = document.querySelector(
          '[class*="lines"], [data-testid="lines"]'
        );
        const levelElement = document.querySelector(
          '[class*="level"], [data-testid="level"]'
        );

        const score = scoreElement?.textContent
          ? parseInt(scoreElement.textContent.replace(/\D/g, "")) || 0
          : 0;
        const lines = linesElement?.textContent
          ? parseInt(linesElement.textContent.replace(/\D/g, "")) || 0
          : 0;
        const level = levelElement?.textContent
          ? parseInt(levelElement.textContent.replace(/\D/g, "")) || 1
          : 1;

        return {
          board,
          currentPiece,
          nextPiece,
          holdPiece: null,
          score,
          lines,
          level,
          isGameActive: true,
          isGameOver: false,
          canHold: true,
          speed: 1000 - level * 50,
        };
      });

      if (!gameState) {
        this.logger.warn("Could not detect game state");
        return null;
      }

      this.logger.debug_("Game state detected", {
        score: gameState.score,
        lines: gameState.lines,
        level: gameState.level,
      });

      return gameState;
    } catch (error) {
      this.logger.error("Failed to get game state:", error);
      return null;
    }
  }

  async isGameActive(): Promise<boolean> {
    try {
      const isActive = await this.page.evaluate(() => {
        // Check if game board is visible and active
        const board = document.querySelector(
          '[data-testid="game-board"], .game-board, [class*="Board"], [class*="board"]'
        );

        if (!board) return false;

        // Check if game over screen is showing
        const gameOverElements = document.querySelectorAll(
          '[class*="game-over"], [class*="GameOver"], .game-over, #game-over'
        );

        if (gameOverElements.length > 0) {
          return !Array.from(gameOverElements).some(
            (el) => window.getComputedStyle(el).display !== "none"
          );
        }

        return true;
      });

      return isActive;
    } catch (error) {
      this.logger.error("Failed to check if game is active:", error);
      return false;
    }
  }

  async isGameOver(): Promise<boolean> {
    try {
      const isOver = await this.page.evaluate(() => {
        // Look for game over indicators
        const gameOverSelectors = [
          '[class*="game-over"]',
          '[class*="GameOver"]',
          ".game-over",
          "#game-over",
          '[data-testid="game-over"]',
          'button:contains("Play Again")',
          'button:contains("Restart")',
        ];

        return gameOverSelectors.some((selector) => {
          const elements = document.querySelectorAll(selector);
          return Array.from(elements).some(
            (el) =>
              window.getComputedStyle(el).display !== "none" &&
              window.getComputedStyle(el).visibility !== "hidden"
          );
        });
      });

      return isOver;
    } catch (error) {
      this.logger.error("Failed to check game over state:", error);
      return false;
    }
  }

  async detectCurrentPiece(): Promise<TetrisPiece | null> {
    try {
      // This would require more sophisticated computer vision
      // For now, return a default piece
      return {
        type: "I",
        x: 4,
        y: 0,
        rotation: 0,
        shape: [[1, 1, 1, 1]],
      };
    } catch (error) {
      this.logger.error("Failed to detect current piece:", error);
      return null;
    }
  }

  async getNextPiece(): Promise<string | null> {
    try {
      const nextPiece = await this.page.evaluate(() => {
        const nextElement = document.querySelector(
          '[class*="NextPiece"], [class*="next-piece"], [class*="preview"]'
        );

        if (!nextElement) return null;

        // Would need more complex logic to determine piece type from preview
        return "I"; // Default
      });

      return nextPiece;
    } catch (error) {
      this.logger.error("Failed to get next piece:", error);
      return null;
    }
  }

  async takeScreenshot(filename: string): Promise<void> {
    try {
      await this.page.screenshot({
        path: filename,
        fullPage: true,
      });
      this.logger.info(`Screenshot saved: ${filename}`);
    } catch (error) {
      this.logger.error(`Failed to take screenshot: ${filename}`, error);
    }
  }
}
