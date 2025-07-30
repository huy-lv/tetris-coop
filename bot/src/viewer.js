#!/usr/bin/env node

/**
 * Bot Viewer - Opens screenshots in real-time to "watch" the bot play
 * This provides a visual experience even when using headless mode
 */

const fs = require("fs");
const path = require("path");
const { spawn, exec } = require("child_process");

const SCREENSHOTS_DIR = path.join(__dirname, "..", "screenshots");
const REFRESH_INTERVAL = 1000; // 1 second

console.log("🎮 Starting Tetris Bot Viewer...");
console.log("📸 Monitoring screenshots directory for real-time viewing");

// Ensure screenshots directory exists
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

let lastScreenshot = null;
let viewerProcess = null;

function findLatestScreenshot() {
  try {
    const files = fs
      .readdirSync(SCREENSHOTS_DIR)
      .filter((file) => file.endsWith(".png"))
      .map((file) => {
        const filePath = path.join(SCREENSHOTS_DIR, file);
        const stats = fs.statSync(filePath);
        return { file, path: filePath, mtime: stats.mtime };
      })
      .sort((a, b) => b.mtime - a.mtime);

    return files.length > 0 ? files[0] : null;
  } catch (error) {
    return null;
  }
}

function openScreenshot(screenshotPath) {
  console.log(`📱 Opening latest screenshot: ${path.basename(screenshotPath)}`);

  // Close previous viewer if exists
  if (viewerProcess) {
    try {
      viewerProcess.kill();
    } catch (e) {}
  }

  // Open with system default image viewer (Preview on macOS)
  viewerProcess = spawn("open", [screenshotPath], {
    stdio: "ignore",
    detached: true,
  });

  viewerProcess.unref();
}

function startWatching() {
  console.log("👀 Watching for bot activity...");

  const watcher = setInterval(() => {
    const latest = findLatestScreenshot();

    if (latest && latest.path !== lastScreenshot) {
      lastScreenshot = latest.path;
      openScreenshot(latest.path);
    }
  }, REFRESH_INTERVAL);

  // Handle Ctrl+C
  process.on("SIGINT", () => {
    console.log("\n🛑 Stopping viewer...");
    clearInterval(watcher);
    if (viewerProcess) {
      try {
        viewerProcess.kill();
      } catch (e) {}
    }
    process.exit(0);
  });

  console.log("ℹ️  Press Ctrl+C to stop watching");
  console.log("💡 Start the bot in another terminal: yarn bot:new-headless");
}

// Check if there are existing screenshots to show
const initial = findLatestScreenshot();
if (initial) {
  console.log("📂 Found existing screenshots");
  openScreenshot(initial.path);
  lastScreenshot = initial.path;
}

startWatching();
