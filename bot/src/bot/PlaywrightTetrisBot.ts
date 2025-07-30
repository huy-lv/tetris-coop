import { PlaywrightBrowserManager } from "../browser/PlaywrightBrowserManager";
import { PlaywrightGameVision } from "../browser/PlaywrightGameVision";
import { PlaywrightInputController } from "./PlaywrightInputController";
import { Strategy } from "../ai/Strategy";
import { Logger, sleep } from "../utils/helpers";
import { BotOptions, GameState } from "../utils/types";

export class PlaywrightTetrisBot {
  private browserManager: PlaywrightBrowserManager;
  private gameVision: PlaywrightGameVision | null = null;
  private inputController: PlaywrightInputController | null = null;
  private strategy: Strategy;
  private logger: Logger;
  private isRunning: boolean = false;
  private options: BotOptions;
  private debug: boolean;

  constructor(debug = false, headless = false, allowFallback = true) {
    this.debug = debug;
    this.logger = new Logger(debug);
    // ALWAYS use visible mode (non-headless) with no fallback
    this.browserManager = new PlaywrightBrowserManager(
      debug,
      false, // never headless
      false // no fallback allowed
    );
    this.strategy = new Strategy(debug);
    this.options = {
      gameUrl: "http://localhost:5173",
      createRoom: true,
      speed: "medium",
      debug,
      playerName: "PlaywrightBot",
    };
  }

  async start(options: BotOptions): Promise<void> {
    try {
      this.options = { ...this.options, ...options };
      this.logger.success("🤖 Starting Playwright Tetris Bot...");
      this.logger.info("ℹ Options:", this.options);

      // Launch browser
      await this.browserManager.launch();

      // Navigate to game
      await this.browserManager.navigateToGame(this.options.gameUrl);

      // Enter player name
      if (this.options.playerName) {
        await this.browserManager.enterPlayerName(this.options.playerName);
      }

      // Create or join room
      if (this.options.createRoom) {
        const roomCode = await this.browserManager.createRoom();
        this.logger.success("✓ Created room:", roomCode);
      } else if (this.options.roomCode) {
        // TODO: Implement join room functionality
        this.logger.info("Joining room:", this.options.roomCode);
      }

      // Wait for game to start
      await this.browserManager.waitForGameStart();

      // Initialize game components
      const page = this.browserManager.getPage();
      if (!page) throw new Error("Page not available");

      this.gameVision = new PlaywrightGameVision(page);
      this.inputController = new PlaywrightInputController(page, this.debug);

      // Start game loop
      this.isRunning = true;
      await this.gameLoop();
    } catch (error) {
      this.logger.error("Bot failed to start:", error);
      throw error;
    }
  }

  private async gameLoop(): Promise<void> {
    this.logger.info("🎮 Starting game loop...");

    const speedMap = {
      slow: 2000,
      medium: 1000,
      fast: 500,
      instant: 100,
    };

    const loopDelay = speedMap[this.options.speed] || 1000;

    while (this.isRunning) {
      try {
        if (!this.gameVision || !this.inputController) {
          throw new Error("Game vision or input controller not initialized");
        }

        // Get current game state
        const gameState = await this.gameVision.getCurrentGameState();

        // Check if game is over using vision method
        const isGameOver = await this.gameVision.isGameOver();
        if (isGameOver) {
          this.logger.info("🎯 Game Over detected!");
          break;
        }

        this.logger.debug_(
          `Game state - Score: ${gameState.score} Lines: ${gameState.lines} Level: ${gameState.level}`
        );

        // TODO: Integrate strategy with PlaywrightGameVision GameState type
        // const bestMove = await this.strategy.calculateBestMove(gameState);

        this.logger.debug_(`Current piece: ${gameState.currentPiece}`);

        // Temporary: just hard drop for now
        this.logger.info(
          `🎯 Current piece: ${gameState.currentPiece}, Score: ${gameState.score}`
        );
        await sleep(1000);
        await this.inputController.hardDrop();

        // Wait before next iteration
        await sleep(loopDelay);
      } catch (error) {
        this.logger.error("Error in game loop:", error);

        // Try to continue after error
        await sleep(2000);
        continue;
      }
    }

    this.logger.info("🏁 Game loop ended");
  }

  async stop(): Promise<void> {
    this.logger.info("🛑 Stopping Playwright Tetris Bot...");
    this.isRunning = false;

    try {
      await this.browserManager.close();
    } catch (error) {
      this.logger.error("Error closing browser:", error);
    }
  }

  // Test method for connectivity
  async test(options: Partial<BotOptions> = {}): Promise<void> {
    const testOptions: BotOptions = {
      gameUrl: "http://localhost:5173",
      createRoom: true,
      speed: "medium",
      debug: true,
      playerName: "PlaywrightTestBot",
      ...options,
    };

    this.logger.info("ℹ Testing Playwright bot connection...");

    try {
      await this.start(testOptions);
    } catch (error) {
      this.logger.error("✗ Test failed:", error);
      throw error;
    }
  }
}
