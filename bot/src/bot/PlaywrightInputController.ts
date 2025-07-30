import { Page } from "playwright";
import { Move } from "../utils/types";
import { Logger, sleep } from "../utils/helpers";
import { getConfig } from "../config/config";

export class PlaywrightInputController {
  private page: Page;
  private logger: Logger;
  private config = getConfig();

  constructor(page: Page, debug = false) {
    this.page = page;
    this.logger = new Logger(debug);
  }

  async executeMove(move: Move): Promise<void> {
    if (!move) return;

    try {
      this.logger.debug_("Executing move:", JSON.stringify(move));

      // Hard drop first if specified
      if (move.hardDrop) {
        await this.sendKey("Space");
        await sleep(100);
        return;
      }

      // Rotate
      for (let i = 0; i < move.rotations; i++) {
        await this.sendKey("ArrowUp");
        await sleep(50);
      }

      // Move horizontally
      if (move.horizontalMoves > 0) {
        for (let i = 0; i < move.horizontalMoves; i++) {
          await this.sendKey("ArrowRight");
          await sleep(30);
        }
      } else if (move.horizontalMoves < 0) {
        for (let i = 0; i < Math.abs(move.horizontalMoves); i++) {
          await this.sendKey("ArrowLeft");
          await sleep(30);
        }
      }

      // Soft drop if needed
      if (move.softDrop) {
        await this.sendKey("ArrowDown");
        await sleep(30);
      }

      // Use hold if specified
      if (move.useHold) {
        await this.sendKey("KeyC");
        await sleep(100);
        return;
      }

      // Place the piece (hard drop if not already done)
      if (!move.hardDrop) {
        await this.sendKey("Space");
        await sleep(100);
      }
    } catch (error) {
      this.logger.error("Error executing move:", error);
    }
  }

  async sendKey(key: string): Promise<void> {
    try {
      await this.page.keyboard.press(key);
      this.logger.debug_("Key pressed:", key);
    } catch (error) {
      this.logger.error("Error sending key:", key, error);
    }
  }

  async clickButton(selector: string): Promise<void> {
    try {
      await this.page.click(selector);
      this.logger.debug_("Clicked button:", selector);
    } catch (error) {
      this.logger.error("Error clicking button:", selector, error);
    }
  }

  async typeText(selector: string, text: string): Promise<void> {
    try {
      await this.page.fill(selector, text);
      this.logger.debug_("Typed text:", text, "into", selector);
    } catch (error) {
      this.logger.error("Error typing text:", error);
    }
  }

  async pressEnter(): Promise<void> {
    await this.sendKey("Enter");
  }

  async pressEscape(): Promise<void> {
    await this.sendKey("Escape");
  }

  async waitAndClick(selector: string, timeout = 5000): Promise<void> {
    try {
      await this.page.waitForSelector(selector, { timeout });
      await this.page.click(selector);
      this.logger.debug_("Waited and clicked:", selector);
    } catch (error) {
      this.logger.error("Error waiting and clicking:", selector, error);
    }
  }
}
