import { chromium, Browser, Page, BrowserContext } from "playwright";
import { Logger, sleep } from "../utils/helpers";
import { SELECTORS } from "../utils/constants";

export class PlaywrightBrowserManager {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private logger: Logger;
  private headless: boolean;
  private allowFallback: boolean;

  constructor(debug = false, headless = false, allowFallback = true) {
    this.logger = new Logger(debug);
    // ALWAYS use visible mode - never headless
    this.headless = false;
    this.allowFallback = false;
  }

  async launch(): Promise<void> {
    this.logger.info("🎭 Launching browser with Playwright...");

    // ALWAYS visible mode - no headless option
    this.logger.info("🔧 Launching in visible mode with Playwright (ALWAYS)");

    const launchOptions = {
      headless: false,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-web-security",
        "--window-size=1000,800", // Set specific window size
        "--window-position=0,0", // Position at left edge of screen
      ],
      // Playwright specific options
      slowMo: 100, // Add slight delay to see actions
      timeout: 60000,
    };

    try {
      this.browser = await chromium.launch(launchOptions);

      // Create context with specific viewport for 1000px width
      this.context = await this.browser.newContext({
        viewport: { width: 800, height: 800 },
        userAgent:
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      });

      this.page = await this.context.newPage();

      this.logger.success(
        `✨ Playwright browser launched successfully (visible mode - 1000px width)`
      );
    } catch (error) {
      this.logger.error(
        "❌ Failed to launch Playwright browser in visible mode:",
        error
      );
      this.logger.error("💡 No fallback allowed - must run in visible mode");
      throw error;
    }
  }

  async navigateToGame(gameUrl: string): Promise<void> {
    if (!this.page) throw new Error("Browser not launched");

    this.logger.info("Navigating to game:", gameUrl);
    await this.page.goto(gameUrl, { waitUntil: "networkidle" });
    await sleep(2000); // Wait for page to fully load
    this.logger.success("Navigated to game successfully");
  }

  async enterPlayerName(playerName: string): Promise<void> {
    if (!this.page) throw new Error("Browser not launched");

    try {
      // Wait for name input field
      await this.page.waitForSelector(SELECTORS.playerNameInput, {
        timeout: 5000,
      });

      // Clear existing text and enter name - Playwright way
      await this.page.click(SELECTORS.playerNameInput);
      await this.page.fill(SELECTORS.playerNameInput, playerName);

      this.logger.success("Player name entered:", playerName);
    } catch (error) {
      this.logger.debug_("Player name input not found or not needed");
    }
  }

  async createRoom(): Promise<string> {
    if (!this.page) throw new Error("Browser not launched");

    this.logger.info("Creating new room...");

    // Take screenshot before attempting to create room
    // await this.takeScreenshot("debug-before-create.png");

    // Look for buttons
    const buttons = await this.page.$$eval("button", (btns) =>
      btns.map((btn) => ({
        text: btn.textContent?.trim() || "",
        className: btn.className || "",
        id: btn.id || "",
        type: btn.type || "",
        outerHTML: btn.outerHTML.substring(0, 200),
      }))
    );

    this.logger.info("Found buttons:", buttons);

    // Try multiple selectors to find the create button
    const createSelectors = [
      'button:has-text("Create Room")',
      'button:has-text("Create")',
      'button[class*="primary"]',
      "button:first-of-type",
    ];

    let roomCode = "UNKNOWN";
    let buttonFound = false;

    for (const selector of createSelectors) {
      try {
        this.logger.info(`Trying Playwright selector: ${selector}`);
        const button = this.page.locator(selector).first();

        if (await button.isVisible()) {
          await button.click();
          buttonFound = true;
          this.logger.success(
            `✓ Found create button with selector: ${selector}`
          );
          break;
        }
      } catch (error) {
        this.logger.warn(`⚠ Selector failed: ${selector}`);
        continue;
      }
    }

    if (!buttonFound) {
      throw new Error("Could not find create room button");
    }

    // Wait for room creation and try to get room code
    await sleep(3000);
    // await this.takeScreenshot("debug-after-create.png");

    try {
      // Try to find room code in various places
      const codeSelectors = [
        '[class*="room-code"]',
        '[class*="code"]',
        "h1, h2, h3, h4",
        '[data-testid*="room"]',
      ];

      for (const selector of codeSelectors) {
        try {
          const element = await this.page.locator(selector).first();
          if (await element.isVisible()) {
            const text = await element.textContent();
            const match = text?.match(/[A-Z0-9]{4,6}/);
            if (match) {
              roomCode = match[0];
              break;
            }
          }
        } catch (e) {
          continue;
        }
      }
    } catch (error) {
      this.logger.debug_("Could not extract room code");
    }

    this.logger.success("✓ Room created with code:", roomCode);
    return roomCode;
  }

  async waitForGameStart(): Promise<void> {
    if (!this.page) throw new Error("Browser not launched");

    this.logger.info("Waiting for game to start...");

    // First click Ready button if present
    try {
      await this.page.waitForSelector(SELECTORS.readyButton, { timeout: 5000 });
      await this.page.click(SELECTORS.readyButton);
      this.logger.success("✓ Ready button clicked");

      // Then wait for and click Start button if present
      try {
        await this.page.waitForSelector(SELECTORS.startButton, {
          timeout: 10000,
        });
        await this.page.click(SELECTORS.startButton);
        this.logger.success("✓ Start button clicked");
      } catch (error) {
        this.logger.debug_("Start button not found or not clickable");
      }
    } catch (error) {
      this.logger.debug_("Ready button not found");
    }

    // Wait for game canvas or game area to appear
    try {
      await this.page.waitForSelector(SELECTORS.gameBoard, { timeout: 30000 });
      this.logger.success("✓ Game started!");
    } catch (error) {
      // Fallback - wait for any game-related elements
      await this.page.waitForSelector('[class*="game"], canvas, [id*="game"]', {
        timeout: 30000,
      });
      this.logger.success("✓ Game area detected!");
    }
  }

  async takeScreenshot(filename?: string): Promise<string> {
    if (!this.page) throw new Error("Browser not launched");

    const screenshotPath = filename || `game-${Date.now()}.png`;
    const fullPath = `screenshots/${screenshotPath}`;

    try {
      await this.page.screenshot({
        path: fullPath,
        fullPage: true,
      });
      this.logger.info(`ℹ Screenshot saved: ${screenshotPath}`);
      return fullPath;
    } catch (error) {
      this.logger.error(`✗ Failed to take screenshot: ${error}`);
      throw error;
    }
  }

  async pressKey(key: string): Promise<void> {
    if (!this.page) throw new Error("Browser not launched");

    // Playwright key mapping for WASD controls
    const keyMap: { [key: string]: string } = {
      ArrowLeft: "KeyA", // Left = A
      ArrowRight: "KeyD", // Right = D
      ArrowUp: "KeyN", // Rotate = N
      ArrowDown: "KeyS", // Soft drop = S
      Space: "Space",
      KeyZ: "KeyZ",
      KeyX: "KeyX",
      KeyC: "KeyC",
      KeyJ: "KeyJ", // Hard drop = J
      KeyA: "KeyA", // Direct A
      KeyD: "KeyD", // Direct D
      KeyS: "KeyS", // Direct S
      KeyN: "KeyN", // Direct N
    };

    const playwrightKey = keyMap[key] || key;
    await this.page.keyboard.press(playwrightKey);
  }

  getPage(): Page | null {
    return this.page;
  }

  async close(): Promise<void> {
    if (this.context) {
      await this.context.close();
    }
    if (this.browser) {
      await this.browser.close();
    }
  }
}
