import puppeteer, { Browser, Page } from "puppeteer";
import { Logger, sleep } from "../utils/helpers";
import { SELECTORS } from "../utils/constants";

export class BrowserManager {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private logger: Logger;
  private headless: boolean;
  private allowFallback: boolean;

  constructor(debug = false, headless = false, allowFallback = true) {
    this.logger = new Logger(debug);
    this.headless = headless;
    this.allowFallback = allowFallback;
  }

  async launch(): Promise<void> {
    this.logger.info("Launching browser...");

    // Check for force visible environment variable
    const forceVisible = process.env.FORCE_VISIBLE === "true";
    if (forceVisible) {
      this.logger.info("🌟 Force visible mode detected from environment");
      this.headless = false;
      this.allowFallback = false;
    }

    try {
      let launchOptions: any;

      if (this.headless) {
        // Traditional headless mode
        launchOptions = {
          headless: true,
          defaultViewport: { width: 1200, height: 800 },
          args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
          ],
        };
      } else {
        // Check if user wants new headless (more stable) or true visible mode
        if (this.allowFallback) {
          // Use "new" headless mode - more stable and acts like visible
          this.logger.info(
            "🔧 Using 'new' headless mode - stable visible-like experience"
          );
          launchOptions = {
            headless: "new", // This is the key - new headless mode
            defaultViewport: null,
            timeout: 60000,
            args: [
              "--no-sandbox",
              "--disable-setuid-sandbox",
              "--disable-dev-shm-usage",
              "--window-size=1200,800",
              "--disable-blink-features=AutomationControlled",
              "--no-first-run",
            ],
            ignoreHTTPSErrors: true,
          };
        } else {
          // Force true visible mode (may fail due to WebSocket issues)
          this.logger.info("🔧 Launching in true visible mode");
          launchOptions = {
            headless: false,
            defaultViewport: null,
            timeout: 60000,
            devtools: false,
            args: [
              "--no-sandbox",
              "--disable-setuid-sandbox",
              "--disable-dev-shm-usage",
              "--remote-debugging-port=0",
              "--window-size=1200,800",
              "--no-first-run",
              "--disable-web-security",
              "--start-maximized",
            ],
            ignoreDefaultArgs: [
              "--enable-automation",
              "--remote-debugging-port",
            ],
            ignoreHTTPSErrors: true,
          };
        }
      }

      this.browser = await puppeteer.launch(launchOptions);
      this.page = await this.browser.newPage();

      // Set user agent
      await this.page.setUserAgent(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      );

      const modeDescription = this.headless
        ? "headless"
        : launchOptions.headless === "new"
        ? "new-headless (visible-like)"
        : launchOptions.headless === false
        ? "visible"
        : "new-headless";

      this.logger.success(
        `✨ Browser launched successfully (${modeDescription} mode)`
      );
    } catch (error) {
      this.logger.error("Failed to launch browser:", error);

      // Only fallback if allowed and not in force visible mode
      if (!this.headless && this.allowFallback && !forceVisible) {
        this.logger.info(
          "Retrying with traditional headless mode as fallback..."
        );
        this.headless = true;
        this.browser = await puppeteer.launch({
          headless: true,
          args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
          ],
        });

        this.page = await this.browser.newPage();
        await this.page.setUserAgent(
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        );

        this.logger.success(
          "Browser launched in traditional headless mode (fallback)"
        );
      } else {
        this.logger.error(
          "❌ No fallback allowed - browser launch failed completely."
        );
        this.logger.error("💡 Try one of these alternatives:");
        this.logger.error("   • yarn bot:new-headless (for new headless mode)");
        this.logger.error(
          "   • yarn bot:headless (for traditional headless mode)"
        );
        throw error;
      }
    }
  }

  async navigateToGame(gameUrl: string): Promise<void> {
    if (!this.page) throw new Error("Browser not launched");

    this.logger.info("Navigating to game:", gameUrl);
    await this.page.goto(gameUrl, { waitUntil: "networkidle2" });
    // await sleep(2000); // Wait for page to fully load
    this.logger.success("Navigated to game successfully");
  }

  async enterPlayerName(playerName: string): Promise<void> {
    if (!this.page) throw new Error("Browser not launched");

    try {
      // Wait for name input field
      await this.page.waitForSelector(SELECTORS.playerNameInput, {
        timeout: 5000,
      });

      // Clear existing text and enter name
      await this.page.click(SELECTORS.playerNameInput);
      await this.page.keyboard.down("Control");
      await this.page.keyboard.press("KeyA");
      await this.page.keyboard.up("Control");
      await this.page.type(SELECTORS.playerNameInput, playerName);

      this.logger.success("Player name entered:", playerName);
    } catch (error) {
      this.logger.debug_("Player name input not found or not needed");
    }
  }

  async joinRoom(roomCode: string): Promise<void> {
    if (!this.page) throw new Error("Browser not launched");

    try {
      this.logger.info("Joining room:", roomCode);

      // Wait for room input field
      await this.page.waitForSelector(SELECTORS.roomInput, { timeout: 10000 });

      // Enter room code
      await this.page.click(SELECTORS.roomInput);
      await this.page.keyboard.down("Control");
      await this.page.keyboard.press("KeyA");
      await this.page.keyboard.up("Control");
      await this.page.type(SELECTORS.roomInput, roomCode);

      // Click join button
      await this.page.click(SELECTORS.joinButton);
      await sleep(2000);

      this.logger.success("Room joined successfully");
    } catch (error) {
      this.logger.error("Failed to join room:", error);
      throw error;
    }
  }

  async createRoom(): Promise<string> {
    if (!this.page) throw new Error("Browser not launched");

    try {
      this.logger.info("Creating new room...");

      // Take a screenshot for debugging
      //   await this.page.screenshot({
      //     path: "debug-before-create.png",
      //     fullPage: true,
      //   });
      //   this.logger.info("Screenshot saved: debug-before-create.png");

      // Debug: Get all button elements
      const buttons = await this.page.evaluate(() => {
        const allButtons = Array.from(document.querySelectorAll("button"));
        return allButtons.map((btn) => ({
          text: btn.textContent?.trim() || "",
          className: btn.className,
          id: btn.id,
          type: btn.type,
          outerHTML: btn.outerHTML.substring(0, 200),
        }));
      });

      this.logger.info("Found buttons:", JSON.stringify(buttons, null, 2));

      // Debug: Get all clickable elements that might be create buttons
      const clickableElements = await this.page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll("*"));
        return elements
          .filter((el) => {
            const text = el.textContent?.toLowerCase() || "";
            return (
              text.includes("create") ||
              text.includes("new") ||
              text.includes("room") ||
              el.className.toLowerCase().includes("create") ||
              el.id.toLowerCase().includes("create")
            );
          })
          .map((el) => ({
            tag: el.tagName,
            text: el.textContent?.trim() || "",
            className: el.className,
            id: el.id,
            outerHTML: el.outerHTML.substring(0, 300),
          }));
      });

      this.logger.info(
        "Found potential create elements:",
        JSON.stringify(clickableElements, null, 2)
      );

      // Try multiple selector strategies
      const createSelectors = [
        SELECTORS.createButton,
        'button:contains("Create")',
        'button:contains("New")',
        'button:contains("Room")',
        '[class*="create" i]',
        '[class*="new-room" i]',
        'button[class*="create"]',
        'button[class*="Create"]',
        ".create-button",
        ".create-room",
        "#create-room",
        "#createRoom",
        "button",
      ];

      let createButton = null;
      for (const selector of createSelectors) {
        try {
          this.logger.info(`Trying selector: ${selector}`);
          await this.page.waitForSelector(selector, { timeout: 2000 });
          createButton = selector;
          this.logger.success(`Found create button with selector: ${selector}`);
          break;
        } catch (e) {
          this.logger.warn(`Selector failed: ${selector}`);
        }
      }

      if (!createButton) {
        throw new Error("Could not find create room button with any selector");
      }

      // Click the create button
      await this.page.click(createButton);
      //   await sleep(2000);
      // Take screenshot after clicking
      //   await this.page.screenshot({
      //     path: "debug-after-create.png",
      //     fullPage: true,
      //   });
      //   this.logger.info("Screenshot saved: debug-after-create.png");

      // Try to get room code from page
      const roomCode = await this.page.evaluate(() => {
        // Look for room code display
        const roomCodeElement = document.querySelector(
          '[class*="room-code"], [class*="RoomCode"]'
        );
        return roomCodeElement?.textContent?.trim() || "UNKNOWN";
      });

      this.logger.success("Room created with code:", roomCode);
      return roomCode;
    } catch (error) {
      this.logger.error("Failed to create room:", error);
      throw error;
    }
  }

  async waitForGameToStart(): Promise<void> {
    if (!this.page) throw new Error("Browser not launched");

    this.logger.info("Waiting for game to start...");

    // Click ready button if available

    try {
      await this.page.waitForSelector(SELECTORS.startButton, {
        timeout: 5000,
      });
      await this.page.click(SELECTORS.startButton);
      this.logger.info("Clicked start button");
    } catch (error) {
      this.logger.debug_("Start button not found either");
    }

    // Wait for game board to appear
    await this.page.waitForSelector(SELECTORS.gameBoard, { timeout: 30000 });
    // await sleep(2000);
    this.logger.success("Game started!");
  }

  async takeScreenshot(filename: string): Promise<void> {
    if (!this.page) return;

    try {
      await this.page.screenshot({
        path: `screenshots/${filename}.png`,
        fullPage: false,
      });
      this.logger.debug_("Screenshot saved:", filename);
    } catch (error) {
      this.logger.error("Failed to take screenshot:", error);
    }
  }

  getPage(): Page | null {
    return this.page;
  }

  async close(): Promise<void> {
    if (this.browser) {
      this.logger.info("Closing browser...");
      await this.browser.close();
      this.browser = null;
      this.page = null;
      this.logger.success("Browser closed");
    }
  }
}
