import { Page } from "playwright";
import { Move } from "../utils/types";
import { Logger, sleep } from "../utils/helpers";
import { getConfig } from "../config/config";
import { DEFAULT_CONTROLS } from "../utils/constants";

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

      // Use hold if specified (do this first)
      if (move.useHold) {
        await this.sendKey(DEFAULT_CONTROLS.HOLD);
        await sleep(100);
        return;
      }

      // Rotate first
      if (move.rotations > 0) {
        console.log(`🔄 Executing ${move.rotations} rotations`);
        for (let i = 0; i < move.rotations; i++) {
          await this.sendKey(DEFAULT_CONTROLS.ROTATE);
          await sleep(100); // Increase delay for rotation
        }
      }

      // Move horizontally
      if (move.horizontalMoves > 0) {
        console.log(`➡️ Moving right ${move.horizontalMoves} times`);
        for (let i = 0; i < move.horizontalMoves; i++) {
          await this.sendKey(DEFAULT_CONTROLS.MOVE_RIGHT);
          await sleep(80); // Increase delay for movement
        }
      } else if (move.horizontalMoves < 0) {
        console.log(`⬅️ Moving left ${Math.abs(move.horizontalMoves)} times`);
        for (let i = 0; i < Math.abs(move.horizontalMoves); i++) {
          await this.sendKey(DEFAULT_CONTROLS.MOVE_LEFT);
          await sleep(80); // Increase delay for movement
        }
      }

      // Small delay before hard drop to ensure all movements are processed
      if (move.horizontalMoves !== 0 || move.rotations > 0) {
        console.log(`⏳ Waiting for movements to complete...`);
        await sleep(150);
      }

      // Soft drop if needed
      if (move.softDrop) {
        await this.sendKey(DEFAULT_CONTROLS.SOFT_DROP);
        await sleep(50);
      }

      // Finally, hard drop to place the piece
      if (move.hardDrop) {
        console.log(`⬇️ Hard dropping piece`);
        await this.sendKey(DEFAULT_CONTROLS.HARD_DROP);
        await sleep(100);
      }
    } catch (error) {
      this.logger.error("Error executing move:", error);
    }
  }

  async sendKey(key: string): Promise<void> {
    try {
      // Map game controls to actual key presses
      const keyMap: { [key: string]: string } = {
        [DEFAULT_CONTROLS.MOVE_LEFT]: "KeyA", // a
        [DEFAULT_CONTROLS.MOVE_RIGHT]: "KeyD", // d
        [DEFAULT_CONTROLS.SOFT_DROP]: "KeyS", // s
        [DEFAULT_CONTROLS.ROTATE]: "KeyN", // n
        [DEFAULT_CONTROLS.HARD_DROP]: "KeyJ", // j
        [DEFAULT_CONTROLS.HOLD]: "KeyB", // b
        // Keep old keys for compatibility
        ArrowLeft: "KeyA",
        ArrowRight: "KeyD",
        ArrowUp: "KeyN",
        ArrowDown: "KeyS",
        Space: "KeyJ",
        KeyC: "KeyB",
      };

      const playwrightKey = keyMap[key] || key;
      await this.page.keyboard.press(playwrightKey);
      this.logger.debug_(
        "Key pressed:",
        playwrightKey,
        "(mapped from",
        key + ")"
      );
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

  async hardDrop(): Promise<void> {
    console.log(`⬇️ Hard dropping piece`);
    await this.sendKey(DEFAULT_CONTROLS.HARD_DROP);
  }
}
