import { Page } from "puppeteer";
import { Move } from "../utils/types";
import { Logger, sleep } from "../utils/helpers";
import { getConfig } from "../config/config";

export class InputController {
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

      // Use hold if specified
      if (move.useHold) {
        await this.sendKey(this.config.keys.hold);
        await sleep(100);
        return; // Hold is a separate action
      }

      // Perform rotations first
      for (let i = 0; i < move.rotations; i++) {
        await this.sendKey(this.config.keys.rotate);
        await sleep(50);
      }

      // Perform horizontal movements
      const moveKey =
        move.horizontalMoves > 0
          ? this.config.keys.moveRight
          : this.config.keys.moveLeft;
      const moves = Math.abs(move.horizontalMoves);

      for (let i = 0; i < moves; i++) {
        await this.sendKey(moveKey);
        await sleep(30);
      }

      // Perform drop
      if (move.hardDrop) {
        await this.sendKey(this.config.keys.hardDrop);
      } else if (move.softDrop) {
        await this.sendKey(this.config.keys.softDrop);
      }
    } catch (error) {
      this.logger.error("Error executing move:", error);
    }
  }

  async sendKey(key: string): Promise<void> {
    try {
      await this.page.keyboard.press(key as any);
      this.logger.debug_("Key pressed:", key);
    } catch (error) {
      this.logger.error("Error sending key:", key, error);
    }
  }

  async sendKeys(keys: string[], delay = 50): Promise<void> {
    for (const key of keys) {
      await this.sendKey(key);
      if (delay > 0) {
        await sleep(delay);
      }
    }
  }

  // Direct movement methods for manual control
  async moveLeft(): Promise<void> {
    await this.sendKey(this.config.keys.moveLeft);
  }

  async moveRight(): Promise<void> {
    await this.sendKey(this.config.keys.moveRight);
  }

  async rotate(): Promise<void> {
    await this.sendKey(this.config.keys.rotate);
  }

  async softDrop(): Promise<void> {
    await this.sendKey(this.config.keys.softDrop);
  }

  async hardDrop(): Promise<void> {
    await this.sendKey(this.config.keys.hardDrop);
  }

  async hold(): Promise<void> {
    await this.sendKey(this.config.keys.hold);
  }
}
