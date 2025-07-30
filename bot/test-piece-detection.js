// Simple test for piece detection logic

const { chromium } = require("playwright");

async function testPieceDetection() {
  console.log("🧪 Testing simplified piece detection...");

  const browser = await chromium.launch({
    headless: false,
    slowMo: 1000,
  });

  const page = await browser.newPage();

  // Navigate to the game
  await page.goto("http://localhost:5173");

  // Wait for game to load
  await page.waitForTimeout(3000);

  // Click Play button
  try {
    await page.click("text=Play");
    console.log("✅ Clicked Play button");
    await page.waitForTimeout(2000);
  } catch (error) {
    console.log("❌ Could not click Play button:", error.message);
  }

  // Test simplified piece detection
  const pieceDetection = await page.evaluate(() => {
    console.log("=== SIMPLIFIED PIECE DETECTION TEST ===");

    // Method 1: Look for any canvas element
    const canvas = document.querySelector("canvas");
    if (canvas) {
      console.log("Found canvas element:", canvas);
      console.log("Canvas size:", canvas.width, "x", canvas.height);

      // Try to get context and analyze pixels
      const ctx = canvas.getContext("2d");
      if (ctx) {
        console.log("Got canvas context");

        // Sample some pixels from top area (where new pieces appear)
        const imageData = ctx.getImageData(
          0,
          0,
          canvas.width,
          Math.min(100, canvas.height)
        );
        const data = imageData.data;

        const colors = [];
        // Sample every 10th pixel to find colors
        for (let i = 0; i < data.length; i += 40) {
          // RGBA = 4 bytes, so every 10 pixels
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];

          // Only consider visible pixels with some color
          if (a > 0 && (r > 50 || g > 50 || b > 50)) {
            const color = `rgb(${r}, ${g}, ${b})`;
            if (!colors.includes(color)) {
              colors.push(color);
            }
          }
        }

        console.log("Found colors in canvas:", colors);

        // Simple color to piece mapping
        const colorMapping = {
          cyan: "I",
          yellow: "O",
          purple: "T",
          green: "S",
          red: "Z",
          blue: "J",
          orange: "L",
        };

        for (const color of colors) {
          for (const [colorName, piece] of Object.entries(colorMapping)) {
            // Very loose color matching
            if (
              color.includes("255, 255, 0") ||
              color.includes("255, 255, 255")
            ) {
              return "O"; // Yellow-ish
            }
            if (color.includes("0, 255, 255")) {
              return "I"; // Cyan
            }
            if (color.includes("255, 0, 0")) {
              return "Z"; // Red
            }
            if (color.includes("0, 255, 0")) {
              return "S"; // Green
            }
            if (color.includes("0, 0, 255")) {
              return "J"; // Blue
            }
          }
        }
      }
    }

    // Method 2: Look for any elements with background colors
    const allElements = document.querySelectorAll("*");
    console.log(`Checking ${allElements.length} elements for colors...`);

    const backgroundColors = [];
    for (let i = 0; i < Math.min(100, allElements.length); i++) {
      const element = allElements[i];
      const style = window.getComputedStyle(element);
      const bgColor = style.backgroundColor;

      if (
        bgColor &&
        bgColor !== "rgba(0, 0, 0, 0)" &&
        bgColor !== "transparent"
      ) {
        backgroundColors.push(bgColor);
        console.log(`Element ${i} has background: ${bgColor}`);
      }
    }

    console.log("All background colors found:", [...new Set(backgroundColors)]);

    // Method 3: Random for testing
    const pieces = ["I", "O", "T", "S", "Z", "J", "L"];
    const randomPiece = pieces[Math.floor(Math.random() * pieces.length)];
    console.log("Using random piece for test:", randomPiece);

    return randomPiece;
  });

  console.log("🎯 Piece detection result:", pieceDetection);

  // Keep browser open for manual inspection
  console.log(
    "⏳ Keeping browser open for 30 seconds for manual inspection..."
  );
  await page.waitForTimeout(30000);

  await browser.close();
}

testPieceDetection().catch(console.error);
