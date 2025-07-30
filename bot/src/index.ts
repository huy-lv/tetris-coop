#!/usr/bin/env node

import { Command } from "commander";
import { config } from "dotenv";
import { TetrisBot } from "./bot/TetrisBot";
import { BotOptions } from "./utils/types";
import { Logger } from "./utils/helpers";

// Load environment variables
config();

const logger = new Logger();

const program = new Command();

program
  .name("tetris-bot")
  .description("Browser automation bot for Tetris multiplayer game")
  .version("1.0.0");

program
  .option(
    "-u, --url <url>",
    "Game URL",
    process.env.GAME_URL || "http://localhost:5173"
  )
  .option("-r, --room <code>", "Room code to join")
  .option("--create-room", "Create new room instead of joining")
  .option("-n, --name <n>", "Player name", "TetrisBot")
  .option(
    "-s, --speed <speed>",
    "Bot speed (slow/medium/fast/instant)",
    "medium"
  )
  .option("--debug", "Enable debug mode with detailed logging")
  .option("--screenshots", "Enable screenshot capture")
  .option("--headless", "Run browser in headless mode (invisible)")
  .option("--visible", "Force browser to run in visible mode (no fallback)")
  .option(
    "--playwright",
    "Use Playwright instead of Puppeteer for browser automation"
  )
  .action(async (options) => {
    // Validate speed option
    const validSpeeds = ["slow", "medium", "fast", "instant"];
    if (!validSpeeds.includes(options.speed)) {
      logger.error("Invalid speed. Must be one of:", validSpeeds.join(", "));
      process.exit(1);
    }

    // Create bot options
    const botOptions: BotOptions = {
      gameUrl: options.url,
      roomCode: options.room,
      createRoom: options.createRoom,
      playerName: options.name,
      speed: options.speed as "slow" | "medium" | "fast" | "instant",
      debug: options.debug || options.screenshots,
    };

    // Validate options
    if (options.room && options.createRoom) {
      logger.error(
        "Cannot both join a room and create a room. Choose one option."
      );
      process.exit(1);
    }

    if (!options.room && !options.createRoom) {
      logger.warn("No room specified. Will attempt to create a new room.");
      botOptions.createRoom = true;
    }

    // Create bot with headless option
    // If --visible is specified, force non-headless mode
    // If --headless is specified, force headless mode
    // Otherwise, default to non-headless with fallback
    let headlessMode = false;
    let allowFallback = true;

    if (options.visible) {
      headlessMode = false;
      allowFallback = false; // Force visible mode, no fallback
    } else if (options.headless) {
      headlessMode = true;
      allowFallback = false; // Force headless mode
    }

    // Use Playwright bot if specified
    if (options.playwright) {
      const { PlaywrightTetrisBot } = await import("./bot/PlaywrightTetrisBot");
      const playwrightBot = new PlaywrightTetrisBot(
        botOptions.debug,
        headlessMode,
        allowFallback
      );

      // Handle graceful shutdown for Playwright bot
      const playwrightShutdown = async () => {
        logger.info("Shutting down Playwright bot...");
        await playwrightBot.stop();
        process.exit(0);
      };

      process.on("SIGINT", playwrightShutdown);
      process.on("SIGTERM", playwrightShutdown);
      process.on("uncaughtException", (error) => {
        logger.error("Uncaught exception:", error);
        playwrightShutdown();
      });

      try {
        logger.info("Starting Playwright Tetris bot...");
        await playwrightBot.start(botOptions);
        logger.info("Playwright bot finished");
      } catch (error) {
        logger.error("Error running Playwright bot:", error);
        await playwrightBot.stop();
        process.exit(1);
      }
      return;
    }

    const bot = new TetrisBot(botOptions.debug, headlessMode, allowFallback);

    // Handle graceful shutdown
    const shutdown = async () => {
      logger.info("Shutting down...");
      await bot.stop();
      process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
    process.on("uncaughtException", (error) => {
      logger.error("Uncaught exception:", error);
      shutdown();
    });

    try {
      logger.info("🚀 Starting Tetris Bot");
      logger.info(`Browser mode: ${options.headless ? "headless" : "visible"}`);
      logger.info("Press Ctrl+C to stop the bot");

      await bot.start(botOptions);
    } catch (error) {
      logger.error("Bot error:", error);
      process.exit(1);
    }
  });

// Test command for quick debugging
program
  .command("test")
  .description("Test bot connection and basic functionality")
  .option("--headless", "Run test in headless mode")
  .option("--visible", "Force visible mode (no fallback)")
  .option("--playwright", "Use Playwright instead of Puppeteer")
  .action(async (options) => {
    logger.info("Testing bot connection...");
    logger.info(`Debug: Playwright option = ${options.playwright}`);
    logger.info(`Debug: All options = ${JSON.stringify(options)}`);

    const testOptions: BotOptions = {
      gameUrl: "http://localhost:5173",
      createRoom: true,
      speed: "medium",
      debug: true,
      playerName: "TestBot",
    };

    // Use Playwright bot if specified
    if (options.playwright) {
      logger.info("🎭 Using Playwright for browser automation");
      const { PlaywrightTetrisBot } = await import("./bot/PlaywrightTetrisBot");

      // Determine headless mode and fallback for Playwright too
      let headlessMode = false;
      let allowFallback = true;

      if (options.visible) {
        headlessMode = false;
        allowFallback = false;
      } else if (options.headless) {
        headlessMode = true;
        allowFallback = false;
      }

      const playwrightBot = new PlaywrightTetrisBot(
        true,
        headlessMode,
        allowFallback
      );

      try {
        logger.info("🚀 Starting Playwright Tetris bot test");
        await playwrightBot.start(testOptions);
        logger.success("✅ Playwright test completed successfully!");
      } catch (error) {
        logger.error("Playwright test failed:", error);
        process.exit(1);
      } finally {
        await playwrightBot.stop();
      }
      return;
    }

    logger.info("🤖 Using Puppeteer for browser automation");

    // Determine headless mode and fallback
    let headlessMode = false;
    let allowFallback = true;

    if (options.visible) {
      headlessMode = false;
      allowFallback = false;
    } else if (options.headless) {
      headlessMode = true;
      allowFallback = false;
    }

    const bot = new TetrisBot(true, headlessMode, allowFallback);

    try {
      await bot.start(testOptions);
      logger.success("✅ Test completed successfully!");
    } catch (error) {
      logger.error("Test failed:", error);
      process.exit(1);
    }

    await bot.stop();
  });

// Auto command for autonomous play
program
  .command("auto")
  .description("Run bot in autonomous mode")
  .option("-u, --url <url>", "Game URL", "http://localhost:5173")
  .option("-s, --speed <speed>", "Bot speed", "medium")
  .option("--headless", "Run in headless mode")
  .option("--visible", "Force visible mode (no fallback)")
  .action(async (options) => {
    logger.info("Starting autonomous mode...");

    const autoOptions: BotOptions = {
      gameUrl: options.url,
      createRoom: true,
      speed: options.speed as "slow" | "medium" | "fast" | "instant",
      debug: false,
      playerName: "AutoBot",
    };

    // Determine headless mode and fallback
    let headlessMode = false;
    let allowFallback = true;

    if (options.visible) {
      headlessMode = false;
      allowFallback = false;
    } else if (options.headless) {
      headlessMode = true;
      allowFallback = false;
    }

    const bot = new TetrisBot(false, headlessMode, allowFallback);

    const shutdown = async () => {
      logger.info("Shutting down autonomous mode...");
      await bot.stop();
      process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);

    try {
      logger.info(
        `🤖 Starting autonomous Tetris bot (${
          options.headless ? "headless" : "visible"
        } mode)`
      );
      logger.info("Press Ctrl+C to stop");

      await bot.start(autoOptions);
    } catch (error) {
      logger.error("Autonomous mode error:", error);
      process.exit(1);
    }
  });

program.parse();
