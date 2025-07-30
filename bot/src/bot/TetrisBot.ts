import { BrowserManager } from "../browser/BrowserManager";
import { GameVision } from "./GameVision";
import { InputController } from "./InputController";
import { Strategy } from "../ai/Strategy";
import { BotOptions } from "../utils/types";
import { Logger, sleep } from "../utils/helpers";
import { BOT_SPEEDS } from "../utils/constants";

export class TetrisBot {
  private browserManager: BrowserManager;
  private gameVision!: GameVision;
  private inputController!: InputController;
  private strategy: Strategy;
  private logger: Logger;
  private isRunning = false;
  private gameCount = 0;

  constructor(debug = false, headless = false, allowFallback = true) {
    this.browserManager = new BrowserManager(debug, headless, allowFallback);
    this.strategy = new Strategy(debug);
    this.logger = new Logger(debug);
  }

  async start(options: BotOptions): Promise<void> {
    try {
      this.logger.bot("Starting Tetris Bot...");
      this.logger.info("Options:", JSON.stringify(options, null, 2));

      // Launch browser
      await this.browserManager.launch();

      // Navigate to game
      await this.browserManager.navigateToGame(options.gameUrl);

      // Enter player name if provided
      if (options.playerName) {
        await this.browserManager.enterPlayerName(options.playerName);
      }

      // Join or create room
      if (options.roomCode) {
        await this.browserManager.joinRoom(options.roomCode);
      } else if (options.createRoom) {
        const roomCode = await this.browserManager.createRoom();
        this.logger.success("Created room:", roomCode);
      }

      // Wait for game to start
      await this.browserManager.waitForGameToStart();

      // Initialize game components
      const page = this.browserManager.getPage();
      if (!page) throw new Error("Browser page not available");

      this.gameVision = new GameVision(page);
      this.inputController = new InputController(page, options.debug);

      // Start game loop
      this.isRunning = true;
      await this.gameLoop(options);
    } catch (error) {
      this.logger.error("Bot failed to start:", error);
      throw error;
    }
  }

  private async gameLoop(options: BotOptions): Promise<void> {
    this.logger.bot("Starting game loop...");

    const moveDelay = BOT_SPEEDS[options.speed];
    let consecutiveErrors = 0;

    while (this.isRunning) {
      try {
        // Take screenshot for debugging
        if (options.debug) {
          await this.browserManager.takeScreenshot(`game-${Date.now()}`);
        }

        // Get current game state
        const gameState = await this.gameVision.getCurrentGameState();

        if (!gameState) {
          this.logger.debug_("Game state not available, waiting...");
          await sleep(1000);
          continue;
        }

        // Check if game is over
        if (gameState.isGameOver) {
          this.logger.game(
            "Game Over! Score:",
            gameState.score,
            "Lines:",
            gameState.lines
          );
          this.gameCount++;

          // Wait a bit then try to start new game or restart
          await sleep(3000);
          await this.handleGameOver();
          continue;
        }

        // Check if game is active
        if (!gameState.isGameActive) {
          this.logger.debug_("Game not active, waiting...");
          await sleep(1000);
          continue;
        }

        // Log game state
        this.logger.debug_(
          "Game state - Score:",
          gameState.score,
          "Lines:",
          gameState.lines,
          "Level:",
          gameState.level
        );

        // Calculate best move
        const bestMove = await this.strategy.calculateBestMove(gameState);

        if (bestMove) {
          this.logger.debug_("Executing move:", JSON.stringify(bestMove));
          await this.inputController.executeMove(bestMove);
        } else {
          this.logger.debug_("No move calculated, waiting...");
        }

        // Reset error counter on successful iteration
        consecutiveErrors = 0;

        // Wait before next move
        await sleep(moveDelay);
      } catch (error) {
        consecutiveErrors++;
        this.logger.error("Game loop error:", error);

        if (consecutiveErrors >= 5) {
          this.logger.error("Too many consecutive errors, stopping bot");
          break;
        }

        await sleep(2000);
      }
    }
  }

  private async handleGameOver(): Promise<void> {
    try {
      // Look for restart/new game buttons
      const page = this.browserManager.getPage();
      if (!page) return;

      // Try to find and click restart button
      const restartSelectors = [
        'button:has-text("Try Again")',
        'button:has-text("Restart")',
        'button:has-text("New Game")',
        'button:has-text("Start New Game")',
        '[class*="restart"]',
        '[class*="try-again"]',
      ];

      for (const selector of restartSelectors) {
        try {
          await page.waitForSelector(selector, { timeout: 2000 });
          await page.click(selector);
          this.logger.info("Clicked restart button");
          await sleep(2000);
          return;
        } catch (error) {
          // Continue to next selector
        }
      }

      this.logger.warn(
        "Could not find restart button, game may need manual restart"
      );
    } catch (error) {
      this.logger.error("Error handling game over:", error);
    }
  }

  async stop(): Promise<void> {
    this.logger.bot("Stopping Tetris Bot...");
    this.isRunning = false;
    await this.browserManager.close();
    this.logger.success("Bot stopped successfully");
  }

  // Manual control methods for testing
  async testMove(
    direction: "left" | "right" | "down" | "rotate" | "drop" | "hold"
  ): Promise<void> {
    if (!this.inputController) {
      this.logger.error("Input controller not initialized");
      return;
    }

    switch (direction) {
      case "left":
        await this.inputController.moveLeft();
        break;
      case "right":
        await this.inputController.moveRight();
        break;
      case "down":
        await this.inputController.softDrop();
        break;
      case "rotate":
        await this.inputController.rotate();
        break;
      case "drop":
        await this.inputController.hardDrop();
        break;
      case "hold":
        await this.inputController.hold();
        break;
    }
  }

  getGameCount(): number {
    return this.gameCount;
  }

  isRunning_(): boolean {
    return this.isRunning;
  }
}
