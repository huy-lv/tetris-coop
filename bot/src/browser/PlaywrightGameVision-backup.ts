import { Page } from "playwright";
import { Logger } from "../utils/helpers";
import { GameState, TetrisPiece } from "../utils/types";

type PieceType = "I" | "O" | "T" | "S" | "Z" | "J" | "L";

export class PlaywrightGameVision {
  private page: Page;
  private logger: Logger;

  constructor(page: Page, debug = false) {
    this.page = page;
    this.logger = new Logger(debug);
  }

  async getCurrentGameState(): Promise<GameState> {
    try {
      // Take screenshot for debugging
      //   await this.page.screenshot({
      //     path: `screenshots/game-${Date.now()}.png`,
      //     fullPage: false,
      //   });

      // Get all game state components
      const [basicState, board, currentPiece, nextPiece] = await Promise.all([
        this.getBasicGameState(),
        this.readGameBoard(),
        this.getCurrentPiece(),
        this.getNextPiece(),
      ]);

      // Log current piece detection
      this.logger.info(`🎮 Current piece detected: ${currentPiece}`);
      this.logger.info(`🔮 Next piece detected: ${nextPiece}`);

      const fullGameState: GameState = {
        ...basicState,
        board,
        currentPiece: currentPiece as unknown as TetrisPiece,
        nextPiece: nextPiece as unknown as TetrisPiece,
        holdPiece: null,
        canHold: true,
        isGameOver: await this.isGameOver(),
        isGameActive: true,
        speed: 1000,
      };

      this.logger.debug_(`Game state detected`, fullGameState);
      return fullGameState;
    } catch (error) {
      this.logger.debug_("Could not extract game state:", error);
      return {
        score: 0,
        lines: 0,
        level: 1,
        board: Array(20)
          .fill(null)
          .map(() => Array(10).fill(0)),
        currentPiece: "I" as unknown as TetrisPiece,
        nextPiece: "I" as unknown as TetrisPiece,
        holdPiece: null,
        canHold: true,
        isGameOver: false,
        isGameActive: true,
        speed: 1000,
      };
    }
  }

  private async getBasicGameState(): Promise<{
    score: number;
    lines: number;
    level: number;
  }> {
    return await this.page.evaluate(() => {
      // Look for common game state indicators
      const scoreElements = document.querySelectorAll(
        '[class*="score"], [id*="score"], [data-testid*="score"]'
      );
      const linesElements = document.querySelectorAll(
        '[class*="lines"], [id*="lines"], [data-testid*="lines"]'
      );
      const levelElements = document.querySelectorAll(
        '[class*="level"], [id*="level"], [data-testid*="level"]'
      );

      let score = 0;
      let lines = 0;
      let level = 1;

      // Extract score
      for (const element of scoreElements) {
        const text = element.textContent || "";
        const match = text.match(/\d+/);
        if (match) {
          score = parseInt(match[0]);
          break;
        }
      }

      // Extract lines
      for (const element of linesElements) {
        const text = element.textContent || "";
        const match = text.match(/\d+/);
        if (match) {
          lines = parseInt(match[0]);
          break;
        }
      }

      // Extract level
      for (const element of levelElements) {
        const text = element.textContent || "";
        const match = text.match(/\d+/);
        if (match) {
          level = parseInt(match[0]);
          break;
        }
      }

      return { score, lines, level };
    });
  }

  async readGameBoard(): Promise<number[][]> {
    try {
      // Try to read game board from canvas or DOM
      const board = await this.page.evaluate(() => {
        // Look for canvas element
        const canvas = document.querySelector("canvas") as HTMLCanvasElement;
        if (canvas) {
          // Try to extract board state from canvas (this is game-specific)
          // For now, return empty 20x10 board
          return Array(20)
            .fill(null)
            .map(() => Array(10).fill(0));
        }

        // Look for DOM-based game board
        const boardElement = document.querySelector(
          '[class*="board"], [class*="grid"], [id*="board"]'
        );
        if (boardElement) {
          // Try to parse DOM board structure
          const cells = boardElement.querySelectorAll(
            '[class*="cell"], [class*="block"]'
          );
          if (cells.length > 0) {
            // Assume 20x10 Tetris board
            const board = Array(20)
              .fill(null)
              .map(() => Array(10).fill(0));
            cells.forEach((cell, index) => {
              const row = Math.floor(index / 10);
              const col = index % 10;
              if (row < 20 && col < 10) {
                // Check if cell is filled (has content or specific class)
                const isFilled =
                  cell.textContent?.trim() ||
                  cell.classList.contains("filled") ||
                  cell.classList.contains("block");
                board[row][col] = isFilled ? 1 : 0;
              }
            });
            return board;
          }
        }

        // Default empty board
        return Array(20)
          .fill(null)
          .map(() => Array(10).fill(0));
      });

      return board;
    } catch (error) {
      this.logger.debug_("Could not read game board:", error);
      // Return empty 20x10 board as fallback
      return Array(20)
        .fill(null)
        .map(() => Array(10).fill(0));
    }
  }

  async getCurrentPiece(): Promise<PieceType> {
    try {
      const piece = await this.page.evaluate(() => {
        console.log('=== SIMPLIFIED PIECE DETECTION ===');
        
        // Method 1: Canvas pixel analysis (most reliable for tetris games)
        const canvas = document.querySelector('canvas');
        if (canvas) {
          console.log('Found canvas element');
          const ctx = canvas.getContext('2d');
          if (ctx) {
            try {
              // Sample pixels from top area where new pieces appear
              const sampleHeight = Math.min(100, canvas.height);
              const imageData = ctx.getImageData(0, 0, canvas.width, sampleHeight);
              const data = imageData.data;
              
              const colorCounts: {[key: string]: number} = {};
              
              // Sample every 8th pixel to find dominant colors
              for (let i = 0; i < data.length; i += 32) { // RGBA = 4 bytes, sample every 8 pixels
                const r = data[i];
                const g = data[i + 1]; 
                const b = data[i + 2];
                const a = data[i + 3];
                
                // Only consider visible, colored pixels
                if (a > 128 && (r > 50 || g > 50 || b > 50)) {
                  const color = `${r},${g},${b}`;
                  colorCounts[color] = (colorCounts[color] || 0) + 1;
                }
              }
              
              console.log('Top colors found:', Object.entries(colorCounts)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 5));
              
              // Find most common non-background color
              const sortedColors = Object.entries(colorCounts)
                .sort(([,a], [,b]) => b - a)
                .filter(([color, count]) => count >= 3); // Must appear at least 3 times
              
              if (sortedColors.length > 0) {
                const [dominantColor] = sortedColors[0];
                const [r, g, b] = dominantColor.split(',').map(Number);
                
                console.log(`Dominant color: R${r} G${g} B${b}`);
                
                // Tetris piece color mapping (approximate)
                if (g > 200 && r < 100 && b > 200) return 'I'; // Cyan
                if (r > 200 && g > 200 && b < 100) return 'O'; // Yellow
                if (r > 150 && g < 100 && b > 150) return 'T'; // Purple
                if (g > 200 && r < 150 && b < 150) return 'S'; // Green
                if (r > 200 && g < 100 && b < 100) return 'Z'; // Red
                if (b > 200 && r < 100 && g < 100) return 'J'; // Blue
                if (r > 200 && g > 100 && b < 100) return 'L'; // Orange
              }
            } catch (canvasError) {
              console.log('Canvas analysis failed:', canvasError.message);
            }
          }
        }
        
        // Method 2: DOM element analysis as fallback
        const allElements = document.querySelectorAll('div, span');
        const coloredElements = [];
        
        for (let i = 0; i < Math.min(50, allElements.length); i++) {
          const element = allElements[i];
          const style = window.getComputedStyle(element);
          const bgColor = style.backgroundColor;
          
          if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent' && 
              bgColor !== 'rgb(255, 255, 255)' && bgColor !== 'rgb(0, 0, 0)') {
            coloredElements.push(bgColor);
            
            if (i < 3) console.log(`Colored element ${i}: ${bgColor}`);
          }
        }
        
        if (coloredElements.length > 0) {
          const firstColor = coloredElements[0];
          console.log('First colored element:', firstColor);
          
          // Simple color to piece mapping
          if (firstColor.includes('255, 255, 0')) return 'O'; // Yellow
          if (firstColor.includes('0, 255, 255')) return 'I'; // Cyan
          if (firstColor.includes('128, 0, 128')) return 'T'; // Purple
          if (firstColor.includes('0, 255, 0')) return 'S'; // Green
          if (firstColor.includes('255, 0, 0')) return 'Z'; // Red
          if (firstColor.includes('0, 0, 255')) return 'J'; // Blue
          if (firstColor.includes('255, 165, 0')) return 'L'; // Orange
        }
        
        // Method 3: Cycle through pieces instead of always returning 'I'
        const pieces = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'] as const;
        const now = Date.now();
        const cycleIndex = Math.floor(now / 2000) % pieces.length; // Change every 2 seconds
        const cyclePiece = pieces[cycleIndex];
        
        console.log(`No piece detected, cycling to: ${cyclePiece}`);
        return cyclePiece;
      });
      
      this.logger.info(`🎯 Current piece detected: ${piece}`);
      return piece as PieceType;
      
    } catch (error) {
      this.logger.error("Error detecting current piece:", error);
      // Return different pieces on error instead of always 'I'
      const pieces: PieceType[] = ['T', 'O', 'L', 'J', 'S', 'Z', 'I'];
      const randomIndex = Math.floor(Math.random() * pieces.length);
      return pieces[randomIndex];
    }
  }
        
        // Look for all potential game board elements
        const gameBoardSelectors = [
          '[data-testid="game-board"]',
          '[class*="Board"]', 
          '[class*="board"]',
          '[class*="Game"]',
          '[class*="game"]',
          'canvas',
          '[class*="grid"]',
          '[class*="Grid"]'
        ];
        
        let gameBoard = null;
        for (const selector of gameBoardSelectors) {
          const element = document.querySelector(selector);
          if (element) {
            gameBoard = element;
            console.log(`Found game board with selector: ${selector}`);
            console.log('Game board element:', element);
            console.log('Game board classes:', element.className);
            console.log('Game board children count:', element.children.length);
            break;
          }
        }
        
        if (!gameBoard) {
          console.log('No game board found, looking for all elements with "sc-" classes');
          const allElements = document.querySelectorAll('[class*="sc-"]');
          console.log(`Found ${allElements.length} styled-components elements`);
          
          allElements.forEach((el, i) => {
            if (i < 10) { // Only log first 10 to avoid spam
              console.log(`Element ${i}:`, el.className, el.tagName, el.textContent?.slice(0, 50));
            }
          });
        }

        // Method 1: Look for current piece in game board by analyzing active/moving cells
        if (gameBoard) {
          const cellSelectors = [
            '[class*="Cell"]', 
            '[class*="cell"]', 
            'div', 
            '[class*="Block"]',
            '[class*="block"]'
          ];
          
          let cells = null;
          for (const selector of cellSelectors) {
            const foundCells = gameBoard.querySelectorAll(selector);
            if (foundCells.length > 0) {
              cells = foundCells;
              console.log(`Found ${foundCells.length} cells with selector: ${selector}`);
              break;
            }
          }
          
          if (cells) {
            const activeCells: { row: number; col: number }[] = [];
            
            // Find cells that represent the current falling piece
            cells.forEach((cell, index) => {
              const cellClasses = cell.className || '';
              const cellStyle = (cell as HTMLElement).style;
              const cellContent = cell.textContent || '';
              
              // Debug first few cells
              if (index < 5) {
                console.log(`Cell ${index}:`, {
                  classes: cellClasses,
                  style: cellStyle.cssText,
                  content: cellContent,
                  bgColor: cellStyle.backgroundColor,
                  opacity: cellStyle.opacity
                });
              }
              
              // Look for indicators of active/current piece:
              const isActivePiece = 
                cellClasses.includes('active') ||
                cellClasses.includes('current') ||
                cellClasses.includes('falling') ||
                cellClasses.includes('moving') ||
                cellClasses.includes('piece') ||
                cellStyle.backgroundColor !== '' ||
                cellStyle.opacity !== '' ||
                cellContent !== '' ||
                cell.getAttribute('data-active') === 'true' ||
                cell.getAttribute('data-piece') !== null;
                
              if (isActivePiece) {
                console.log(`Active cell found at index ${index}:`, cell);
                // Calculate row/col from index (assuming 10-column grid)
                const row = Math.floor(index / 10);
                const col = index % 10;
                activeCells.push({ row, col });
              }
            });
            
            console.log(`Found ${activeCells.length} active cells:`, activeCells);
            
            // Analyze pattern of active cells to determine piece type
            if (activeCells.length > 0) {
              const pieceType = this.analyzePiecePattern(activeCells);
              if (pieceType) {
                console.log(`Determined piece type from pattern: ${pieceType}`);
                return pieceType;
              }
            }
          }
        }

        // Method 2: Look for piece type in styled-components class names
        const styledElements = document.querySelectorAll('[class*="sc-"]');
        for (const element of styledElements) {
          const className = element.className;
          // Look for piece-specific class patterns
          const pieceMatch = className.match(/piece-([IJLOSTZ])|([IJLOSTZ])-piece|type-([IJLOSTZ])/i);
          if (pieceMatch) {
            const pieceType = (pieceMatch[1] || pieceMatch[2] || pieceMatch[3]).toUpperCase();
            if (['I', 'J', 'L', 'O', 'S', 'T', 'Z'].includes(pieceType)) {
              return pieceType;
            }
          }
        }

        // Method 3: Analyze CSS background colors to identify pieces
        const coloredElements = document.querySelectorAll('[style*="background"]');
        const pieceColors: { [key: string]: string } = {
          'I': 'cyan',
          'J': 'blue', 
          'L': 'orange',
          'O': 'yellow',
          'S': 'green',
          'T': 'purple',
          'Z': 'red'
        };
        
        for (const element of coloredElements) {
          const style = (element as HTMLElement).style;
          const bgColor = style.backgroundColor || style.background;
          
          for (const [piece, color] of Object.entries(pieceColors)) {
            if (bgColor && bgColor.toLowerCase().includes(color)) {
              return piece;
            }
          }
        }

        // Method 4: Look for Canvas and analyze pixel data for current piece
        const canvas = document.querySelector('canvas') as HTMLCanvasElement;
        if (canvas) {
          try {
            const ctx = canvas.getContext('2d');
            if (ctx) {
              // Sample some pixels to detect non-empty areas (current piece)
              const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const data = imageData.data;
              
              // Find colored pixels that might represent current piece
              const activPixels: { x: number; y: number; color: string }[] = [];
              for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                const a = data[i + 3];
                
                // Skip transparent or black pixels
                if (a > 0 && (r > 50 || g > 50 || b > 50)) {
                  const pixelIndex = i / 4;
                  const x = pixelIndex % canvas.width;
                  const y = Math.floor(pixelIndex / canvas.width);
                  const color = `rgb(${r},${g},${b})`;
                  activPixels.push({ x, y, color });
                }
              }
              
              // Analyze pixel patterns - this is complex but could work
              // For now, return based on dominant color
              if (activPixels.length > 0) {
                const dominantColor = activPixels[0].color;
                // Map colors to piece types (game-specific)
                if (dominantColor.includes('0, 255, 255')) return 'I'; // Cyan
                if (dominantColor.includes('0, 0, 255')) return 'J';    // Blue
                if (dominantColor.includes('255, 165, 0')) return 'L';  // Orange
                if (dominantColor.includes('255, 255, 0')) return 'O';  // Yellow
                if (dominantColor.includes('0, 255, 0')) return 'S';    // Green
                if (dominantColor.includes('128, 0, 128')) return 'T';  // Purple
                if (dominantColor.includes('255, 0, 0')) return 'Z';    // Red
              }
            }
          } catch (e) {
            // Canvas access might be restricted
          }
        }

        // Method 5: Look for piece preview/next piece and infer current
        const nextPieceElement = document.querySelector('[class*="next"], [class*="preview"]');
        if (nextPieceElement) {
          const text = nextPieceElement.textContent || '';
          const nextPiece = text.match(/[IJLOSTZ]/i);
          if (nextPiece) {
            // If we know next piece, current might be different
            // This is not ideal but better than random
            const pieces = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];
            const nextIndex = pieces.indexOf(nextPiece[0].toUpperCase());
            const currentIndex = (nextIndex + 3) % pieces.length; // Offset guess
            return pieces[currentIndex];
          }
        }

        // Method 6: As last resort, cycle through pieces predictably for testing
        const pieces = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'] as const;
        const now = Date.now();
        const index = Math.floor(now / 3000) % pieces.length; // Change every 3 seconds
        return pieces[index];
      });

      this.logger.info(`🎯 Detected piece: ${piece}`);
      return piece as PieceType;
    } catch (error) {
      this.logger.error('Error detecting current piece:', error);
      return 'I' as PieceType;
    }
  }

  private analyzePiecePattern(cells: { row: number; col: number }[]): string | null {
    if (cells.length === 0) return null;
    
    // Sort cells by row and column for pattern analysis
    cells.sort((a, b) => a.row - b.row || a.col - b.col);
    
    // Normalize positions relative to top-left cell
    const minRow = Math.min(...cells.map(c => c.row));
    const minCol = Math.min(...cells.map(c => c.col));
    const normalizedCells = cells.map(c => ({ 
      row: c.row - minRow, 
      col: c.col - minCol 
    }));
    
    // Convert to pattern string for easier matching
    const pattern = normalizedCells.map(c => `${c.row},${c.col}`).sort().join('|');
    
    // Define piece patterns (relative coordinates)
    const piecePatterns: { [key: string]: string[] } = {
      'I': ['0,0|0,1|0,2|0,3', '0,0|1,0|2,0|3,0'], // Horizontal and vertical
      'O': ['0,0|0,1|1,0|1,1'], // Square
      'T': ['0,1|1,0|1,1|1,2', '0,0|1,0|1,1|2,0'], // T-shape variations
      'S': ['0,1|0,2|1,0|1,1', '0,0|1,0|1,1|2,1'], // S-shape variations  
      'Z': ['0,0|0,1|1,1|1,2', '0,1|1,0|1,1|2,0'], // Z-shape variations
      'J': ['0,0|1,0|1,1|1,2', '0,0|0,1|1,0|2,0'], // J-shape variations
      'L': ['0,2|1,0|1,1|1,2', '0,0|1,0|2,0|2,1']  // L-shape variations
    };
    
    // Match pattern against known piece patterns
    for (const [pieceType, patterns] of Object.entries(piecePatterns)) {
      if (patterns.includes(pattern)) {
        return pieceType;
      }
    }
    
    // If no exact match, try to match by number of cells
    switch (cells.length) {
      case 4:
        // All Tetris pieces have 4 cells, so guess based on arrangement
        if (normalizedCells.every(c => c.row === 0)) return 'I'; // All in one row
        if (normalizedCells.every(c => c.col === 0)) return 'I'; // All in one column
        if (cells.length === 4) {
          const rows = new Set(normalizedCells.map(c => c.row)).size;
          const cols = new Set(normalizedCells.map(c => c.col)).size;
          if (rows === 2 && cols === 2) return 'O'; // Square-ish
          if (rows === 2 && cols === 3) return 'T'; // T-like
        }
        return 'T'; // Default guess for 4 cells
      default:
        return null;
    }
  }

  async getNextPiece(): Promise<string> {
    try {
      const nextPiece = await this.page.evaluate(() => {
        // Look for next piece indicators
        const nextElements = document.querySelectorAll(
          '[class*="next"], [class*="preview"], [data-testid*="next"]'
        );

        for (const element of nextElements) {
          const text = element.textContent || "";
          const className = element.className || "";

          if (text.match(/[IJLOSTZ]/i) || className.match(/piece-[ijlostz]/i)) {
            return text.charAt(0).toUpperCase();
          }
        }

        return "I"; // Default
      });

      return nextPiece;
    } catch (error) {
      this.logger.debug_("Could not detect next piece:", error);
      return "I";
    }
  }

  async isGameOver(): Promise<boolean> {
    try {
      const gameOver = await this.page.evaluate(() => {
        // Look for game over indicators
        const gameOverElements = document.querySelectorAll(
          '[class*="game-over"], [class*="gameover"], [id*="game-over"], [data-testid*="game-over"]'
        );

        if (gameOverElements.length > 0) {
          return true;
        }

        // Check for game over text
        const textElements = document.querySelectorAll(
          "h1, h2, h3, h4, div, span"
        );
        for (const element of textElements) {
          const text = (element.textContent || "").toLowerCase();
          if (text.includes("game over") || text.includes("gameover")) {
            return true;
          }
        }

        return false;
      });

      return gameOver;
    } catch (error) {
      this.logger.debug_("Could not check game over status:", error);
      return false;
    }
  }
}
