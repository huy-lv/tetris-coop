#!/usr/bin/env node

/**
 * Workaround script to launch bot in truly visible mode
 * This script uses a different approach to avoid WebSocket issues
 */

const { spawn } = require("child_process");
const path = require("path");

console.log("🚀 Starting Tetris Bot in VISIBLE mode...");
console.log("📝 This script works around WebSocket connection issues.");

// Set environment variables to force visible mode
process.env.PUPPETEER_HEADLESS = "false";
process.env.PUPPETEER_ARGS =
  "--no-sandbox,--disable-setuid-sandbox,--disable-dev-shm-usage,--remote-debugging-port=0";

// Launch the main bot script
const botProcess = spawn(
  "yarn",
  ["tsx", "src/index.ts", "test", "--create-room", "--debug"],
  {
    cwd: __dirname + "/..",
    stdio: "inherit",
    env: {
      ...process.env,
      FORCE_VISIBLE: "true",
    },
  }
);

// Handle process events
botProcess.on("close", (code) => {
  console.log(`Bot exited with code ${code}`);
  process.exit(code);
});

botProcess.on("error", (error) => {
  console.error("Failed to start bot:", error);
  process.exit(1);
});

// Handle Ctrl+C
process.on("SIGINT", () => {
  console.log("\n🛑 Stopping bot...");
  botProcess.kill("SIGINT");
});
