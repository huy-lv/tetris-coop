import { useState, useCallback, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  GameBoard,
  Tetromino,
  Position,
  TetrominoType,
  GameWinnerState,
  RoomJoinedData,
  PlayerJoinedData,
  PlayerLeftData,
  GameStartedData,
  GameWinnerData,
  GameEndedData,
} from "../types";
import { GAME_CONFIG, GAME_STATES } from "../constants";
import {
  createEmptyGrid,
  getRandomTetromino,
  createTetromino,
  rotateTetrominoCW,
  rotateTetrominoCCW,
  isValidPosition,
  placeTetromino,
  clearLines,
  findLinesToClear,
  calculateScore,
  addGarbageRows,
} from "../utils/gameUtils";
import { useBot } from "../bot";
import { getControlsFromStorage } from "../utils/controlsUtils";
import {
  getStoredPlayerNameOnly,
  storePlayerName,
} from "../utils/nameGenerator";
import gameService from "../services/gameService";
import soundService from "../services/soundService";
import { useNavigationGuard } from "./useNavigationGuard";

const createInitialGameBoard = (): GameBoard => ({
  grid: createEmptyGrid(),
  activePiece: null,
  nextPiece: getRandomTetromino(),
  ghostPiece: null, // Add ghost piece to GameBoard
  holdPiece: null, // Add hold piece
  canHold: true, // Allow holding on game start
  score: 0,
  lines: 0,
  level: 0,
  gameState: GAME_STATES.WELCOME,
  isPaused: false, // Add pause state
  clearingRows: [], // Add clearing rows for animation
  dropPosition: undefined, // Add drop position for animation
  isShaking: false, // Initialize shake state
});

export const useGameLogic = (settingsOpen: boolean = false) => {
  // Room navigation hooks
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Game states
  const [gameBoard, setGameBoard] = useState<GameBoard>(createInitialGameBoard);
  const [playerName, setPlayerName] = useState<string>(() => {
    // Load player name from localStorage on initialization
    return localStorage.getItem("tetris_player_name") || "";
  });
  const [gameWinner, setGameWinner] = useState<GameWinnerState>({
    hasWinner: false,
    winner: null,
    finalScores: [],
    totalPlayers: 0,
  });

  // Room navigation states
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);
  const [roomError, setRoomError] = useState<string | null>(null);
  const [showGameStartedPopup, setShowGameStartedPopup] = useState(false);
  const [gameStartedRoomCode, setGameStartedRoomCode] = useState<string>("");
  const [roomPlayers, setRoomPlayers] = useState<string[]>([]);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [awaitingPlayerName, setAwaitingPlayerName] = useState<boolean>(false);

  // Refs
  const gameLoopRef = useRef<number | null>(null);
  const lastDropTimeRef = useRef<number>(0);
  const keysPressed = useRef<Set<string>>(new Set());
  const lastMoveTimeRef = useRef<{ [key: string]: number }>({});
  const shouldSendGridRef = useRef<boolean>(false);
  const hasAttemptedJoinRef = useRef<string | null>(null);
  const pendingRoomCodeRef = useRef<string | null>(null);

  // Get room ID from URL and set as room code
  useEffect(() => {
    const roomCodeFromUrl = searchParams.get("id");
    if (roomCodeFromUrl && roomCodeFromUrl !== roomCode) {
      setRoomCode(roomCodeFromUrl.toUpperCase());
    }
  }, [searchParams, roomCode]);

  // Use navigation guard
  useNavigationGuard({
    gameState: gameBoard.gameState,
    roomCode,
    isInGame:
      gameBoard.gameState === GAME_STATES.PLAYING ||
      gameBoard.gameState === GAME_STATES.PAUSED,
    onPauseGame: () => {
      if (gameBoard.gameState === GAME_STATES.PLAYING) {
        gameService.pauseGame();
      }
    },
  });

  // Navigate to room URL
  const navigateToRoom = useCallback(
    (roomCode: string) => {
      navigate(`/room?id=${roomCode}`);
    },
    [navigate]
  );

  // Close game started popup
  const closeGameStartedPopup = useCallback(() => {
    setShowGameStartedPopup(false);
    setGameStartedRoomCode("");
  }, []);

  // Listen for successful room join to transition from WELCOME to WAITING
  useEffect(() => {
    // Setup event listener for successful room join
    const handleRoomJoined = (data: RoomJoinedData) => {
      console.log(
        "🎮 Room joined successfully, transitioning to WAITING state"
      );

      // Update players list from room_joined event
      if (data.players) {
        const playerNames = data.players.map((p) => p.name);
        console.log(`👥 Updated players list: ${playerNames.join(", ")}`);
        setRoomPlayers(playerNames);
      }

      setGameBoard((prev: GameBoard) => ({
        ...prev,
        gameState: GAME_STATES.WAITING,
      }));
    };

    // Setup event listener for game started by other player
    const handleGameStarted = (data: GameStartedData) => {
      console.log("🎮 Game started by other player:", data);
      setGameBoard((prev: GameBoard) => {
        if (prev.gameState === GAME_STATES.WAITING) {
          // Tạo new piece đơn giản mà không dùng spawnNewPiece callback
          const type = prev.nextPiece || getRandomTetromino();
          const newActivePiece = createTetromino(type, {
            x: Math.floor(GAME_CONFIG.BOARD_WIDTH / 2) - 1,
            y: -1,
          });

          return {
            ...prev,
            activePiece: newActivePiece,
            ghostPiece: null, // Sẽ được update trong useEffect khác
            gameState: GAME_STATES.PLAYING,
          };
        }
        return prev;
      });
      lastDropTimeRef.current = Date.now();
    };

    // Setup event listener for game restarted
    const handleGameRestarted = (data: GameStartedData) => {
      console.log("🔄 Game restarted by other player:", data);

      // Reset gameWinner state
      setGameWinner({
        hasWinner: false,
        winner: null,
        finalScores: [],
        totalPlayers: 0,
      });

      // Reset game board to initial state and start playing
      setGameBoard(() => {
        const initialBoard = createInitialGameBoard();
        const type = initialBoard.nextPiece || getRandomTetromino();
        const newActivePiece = createTetromino(type, {
          x: Math.floor(GAME_CONFIG.BOARD_WIDTH / 2) - 1,
          y: -1,
        });

        return {
          ...initialBoard,
          activePiece: newActivePiece,
          ghostPiece: null, // Sẽ được update trong useEffect khác
          gameState: GAME_STATES.PLAYING,
        };
      });
      lastDropTimeRef.current = Date.now();
    };

    // Setup event listener for player joined
    const handlePlayerJoined = (data: PlayerJoinedData) => {
      console.log("🎮 Player joined:", data);

      // Update players list from player_joined event
      if (data.players) {
        const playerNames = data.players.map((p) => p.name);
        console.log(
          `👥 Updated players list after join: ${playerNames.join(", ")}`
        );
        setRoomPlayers(playerNames);
      }
    };

    // Setup event listener for player left
    const handlePlayerLeft = (data: PlayerLeftData) => {
      console.log("🎮 Player left:", data);

      // Update players list from player_left event
      if (data.players) {
        const playerNames = data.players.map((p) => p.name);
        console.log(
          `👥 Updated players list after leave: ${playerNames.join(", ")}`
        );
        setRoomPlayers(playerNames);
      }
    };

    // Setup event listener for when someone wins
    const handleGameWinner = (data: GameWinnerData) => {
      console.log("🎮 Game winner detected, stopping game:", data);

      // Set gameWinner state cho tất cả người chơi
      setGameWinner({
        hasWinner: true,
        winner: data.winner,
        finalScores: data.finalScores,
        totalPlayers: data.totalPlayers,
      });

      // Set GAME_OVER cho tất cả người chơi (bao gồm cả winner)
      setGameBoard((prev: GameBoard) => {
        console.log("🏆 Setting GAME_OVER for all players including winner");
        return {
          ...prev,
          gameState: GAME_STATES.GAME_OVER,
          activePiece: null, // Remove active piece
          ghostPiece: null,
        };
      });
    };

    // Setup event listener for when game ends
    const handleGameEnded = (data: GameEndedData) => {
      console.log("🎮 Game ended, stopping game:", data);

      // Set gameWinner state cho tất cả người chơi
      setGameWinner({
        hasWinner: true,
        winner: data.winner,
        finalScores: data.finalScores,
        totalPlayers: data.totalPlayers,
      });

      // Khi game ended, tất cả đều set GAME_OVER
      setGameBoard((prev: GameBoard) => ({
        ...prev,
        gameState: GAME_STATES.GAME_OVER,
        activePiece: null, // Remove active piece
        ghostPiece: null,
      }));
    };

    // Setup event listener for when receiving garbage rows
    const handleReceiveGarbage = (data: { garbageRows: number }) => {
      console.log("📦 Receiving garbage rows:", data.garbageRows);

      setGameBoard((prev: GameBoard) => ({
        ...prev,
        grid: addGarbageRows(prev.grid, data.garbageRows),
      }));
    };

    // Assign the event handlers
    gameService.onRoomJoined = handleRoomJoined;
    gameService.onPlayerJoined = handlePlayerJoined;
    gameService.onPlayerLeft = handlePlayerLeft;
    gameService.onGameStarted = handleGameStarted;
    gameService.onGameRestarted = handleGameRestarted;
    gameService.onGameWinner = handleGameWinner;
    gameService.onGameEnded = handleGameEnded;
    gameService.onReceiveGarbage = handleReceiveGarbage;

    // Also check if we already have a room code (direct URL access case)
    const roomCode = gameService.getRoomCode();
    if (roomCode && gameBoard.gameState === GAME_STATES.WELCOME) {
      // If we have a room code but haven't transitioned yet, do it now
      setTimeout(() => {
        setGameBoard((prev: GameBoard) => {
          if (prev.gameState === GAME_STATES.WELCOME) {
            console.log(
              "🎮 Direct room access, transitioning to WAITING state"
            );
            return {
              ...prev,
              gameState: GAME_STATES.WAITING,
            };
          }
          return prev;
        });
      }, 1000); // Give some time for room join to complete
    }

    // Cleanup
    return () => {
      if (gameService.onRoomJoined === handleRoomJoined) {
        gameService.onRoomJoined = undefined;
      }
      if (gameService.onPlayerJoined === handlePlayerJoined) {
        gameService.onPlayerJoined = undefined;
      }
      if (gameService.onPlayerLeft === handlePlayerLeft) {
        gameService.onPlayerLeft = undefined;
      }
      if (gameService.onGameStarted === handleGameStarted) {
        gameService.onGameStarted = undefined;
      }
      if (gameService.onGameRestarted === handleGameRestarted) {
        gameService.onGameRestarted = undefined;
      }
      if (gameService.onGameWinner === handleGameWinner) {
        gameService.onGameWinner = undefined;
      }
      if (gameService.onGameEnded === handleGameEnded) {
        gameService.onGameEnded = undefined;
      }
      if (gameService.onReceiveGarbage === handleReceiveGarbage) {
        gameService.onReceiveGarbage = undefined;
      }
    };
  }, [gameBoard.gameState, playerName]); // Thêm playerName vào dependency

  // Send game state to server when game over
  useEffect(() => {
    if (
      gameBoard.gameState === GAME_STATES.GAME_OVER &&
      gameService.isConnected()
    ) {
      shouldSendGridRef.current = true;

      const gameState = {
        grid: gameBoard.grid,
        score: gameBoard.score,
        lines: gameBoard.lines,
        level: gameBoard.level,
        isGameOver: true,
      };

      console.log("🎮 Sending game over state to server:", gameState);
      gameService.updateGameState(gameState);
    }
  }, [
    gameBoard.gameState,
    gameBoard.score,
    gameBoard.lines,
    gameBoard.level,
    gameBoard.grid,
  ]);

  // Bot functionality
  const bot = useBot(
    (direction: "left" | "right") => moveActivePiece(direction),
    () => rotateActivePiece(),
    () => hardDrop()
  );

  const spawnNewPiece = useCallback((): Tetromino => {
    const type = gameBoard.nextPiece || getRandomTetromino();
    const startPosition: Position = {
      x: Math.floor(GAME_CONFIG.BOARD_WIDTH / 2) - 1,
      y: -1,
    };

    return createTetromino(type, startPosition);
  }, [gameBoard.nextPiece]);

  // Calculate and update ghost piece position
  const updateGhostPiece = useCallback(
    (board: GameBoard, activePiece: Tetromino): Tetromino | null => {
      if (!activePiece) return null;

      // Create a copy of the active piece for the ghost
      const ghostPiece: Tetromino = {
        ...activePiece,
        position: { ...activePiece.position },
      };

      // Drop the ghost piece as far as it can go
      while (
        isValidPosition(board.grid, ghostPiece, {
          x: ghostPiece.position.x,
          y: ghostPiece.position.y + 1,
        })
      ) {
        ghostPiece.position.y += 1;
      }

      return ghostPiece;
    },
    []
  );

  const moveActivePiece = useCallback(
    (direction: "left" | "right" | "down") => {
      setGameBoard((prev: GameBoard) => {
        if (!prev.activePiece || prev.gameState !== GAME_STATES.PLAYING)
          return prev;

        const offsets = {
          left: { x: -1, y: 0 },
          right: { x: 1, y: 0 },
          down: { x: 0, y: 1 },
        };

        const newPosition: Position = {
          x: prev.activePiece.position.x + offsets[direction].x,
          y: prev.activePiece.position.y + offsets[direction].y,
        };

        const canMove = isValidPosition(
          prev.grid,
          prev.activePiece,
          newPosition
        );

        if (canMove) {
          const updatedPiece = {
            ...prev.activePiece,
            position: newPosition,
          };

          // Update ghost piece based on new active piece position
          const updatedGhostPiece = updateGhostPiece(prev, updatedPiece);

          return {
            ...prev,
            activePiece: updatedPiece,
            ghostPiece: updatedGhostPiece,
          };
        }

        // If moving down failed, place the piece
        if (direction === "down") {
          const newGrid = placeTetromino(prev.grid, prev.activePiece);
          const linesToClear = findLinesToClear(newGrid);

          // Mark that we need to send grid update after piece placement
          shouldSendGridRef.current = true;

          // If there are lines to clear, start animation and shake
          if (linesToClear.length > 0) {
            // Trigger shake animation
            setTimeout(() => {
              setGameBoard((current) => ({
                ...current,
                isShaking: true,
              }));

              // Reset shake animation after 300ms
              setTimeout(() => {
                setGameBoard((current) => ({
                  ...current,
                  isShaking: false,
                }));
              }, 300);
            }, 0);
            // Spawn new piece immediately
            const newActivePiece = spawnNewPiece();
            const gameOver = !isValidPosition(
              newGrid,
              newActivePiece,
              newActivePiece.position
            );

            // After animation delay, actually clear the lines
            setTimeout(() => {
              setGameBoard((current) => {
                const { newGrid: clearedGrid, linesCleared } = clearLines(
                  current.grid
                );
                const scoreIncrease = calculateScore(
                  linesCleared,
                  current.level
                );
                const newLines = current.lines + linesCleared;
                const newLevel = Math.floor(
                  newLines / GAME_CONFIG.LINES_PER_LEVEL
                );

                return {
                  ...current,
                  grid: clearedGrid,
                  score: current.score + scoreIncrease,
                  lines: newLines,
                  level: newLevel,
                  clearingRows: [], // Clear the animation state
                  dropPosition: undefined, // Clear drop position
                };
              });
            }, 500); // 500ms animation delay

            // SFX line clear
            soundService.playLineClear(linesToClear.length);

            // Return immediately with animation state
            return {
              ...prev,
              grid: newGrid,
              activePiece: gameOver ? null : newActivePiece,
              ghostPiece: gameOver
                ? null
                : updateGhostPiece(
                    {
                      ...prev,
                      grid: newGrid,
                      activePiece: newActivePiece,
                    },
                    newActivePiece
                  ),
              nextPiece: getRandomTetromino(),
              canHold: true,
              clearingRows: linesToClear,
              dropPosition: prev.activePiece
                ? {
                    x:
                      prev.activePiece.position.x +
                      Math.floor(prev.activePiece.shape[0].length / 2),
                    y: prev.activePiece.position.y,
                  }
                : undefined,
              gameState: gameOver ? GAME_STATES.GAME_OVER : prev.gameState,
            };
          } else {
            // No lines to clear, proceed normally
            const { newGrid: clearedGrid, linesCleared } = clearLines(newGrid);
            const scoreIncrease = calculateScore(linesCleared, prev.level);
            const newLines = prev.lines + linesCleared;
            const newLevel = Math.floor(newLines / GAME_CONFIG.LINES_PER_LEVEL);

            // Check for game over
            const newActivePiece = spawnNewPiece();
            const gameOver = !isValidPosition(
              clearedGrid,
              newActivePiece,
              newActivePiece.position
            );

            // SFX line clear (possibly 0)
            if (linesCleared > 0) {
              soundService.playLineClear(linesCleared);
            }

            return {
              ...prev,
              grid: clearedGrid,
              activePiece: gameOver ? null : newActivePiece,
              nextPiece: getRandomTetromino(),
              score: prev.score + scoreIncrease,
              lines: newLines,
              level: newLevel,
              canHold: true, // Reset the ability to hold when a new piece appears
              gameState: gameOver ? GAME_STATES.GAME_OVER : prev.gameState,
              clearingRows: [], // No rows being cleared
            };
          }
        }

        return prev;
      });
    },
    [spawnNewPiece, updateGhostPiece]
  );

  const applyRotationWithWallKick = useCallback(
    (rotator: (t: Tetromino) => Tetromino) => {
      setGameBoard((prev: GameBoard) => {
        if (!prev.activePiece || prev.gameState !== GAME_STATES.PLAYING)
          return prev;

        const rotatedPiece = rotator(prev.activePiece);
        const currentPos = prev.activePiece.position;
        const boardWidth = GAME_CONFIG.BOARD_WIDTH;

        // Smart wall kick: determine direction based on piece position
        const isNearLeftWall = currentPos.x <= 2;
        const isNearRightWall = currentPos.x >= boardWidth - 3;

        let wallKickOffsets: Array<{ x: number; y: number }>;

        if (isNearLeftWall) {
          // Near left wall - prioritize moving right
          wallKickOffsets = [
            { x: 0, y: 0 }, // Original position
            { x: 1, y: 0 }, // Move right
            { x: 2, y: 0 }, // Move further right
            { x: 3, y: 0 }, // Move even further right (for I piece)
            { x: 0, y: -1 }, // Move up
            { x: 1, y: -1 }, // Move right and up
          ];
        } else if (isNearRightWall) {
          // Near right wall - prioritize moving left
          wallKickOffsets = [
            { x: 0, y: 0 }, // Original position
            { x: -1, y: 0 }, // Move left
            { x: -2, y: 0 }, // Move further left
            { x: -3, y: 0 }, // Move even further left (for I piece)
            { x: 0, y: -1 }, // Move up
            { x: -1, y: -1 }, // Move left and up
          ];
        } else {
          // Middle of board - try both directions
          wallKickOffsets = [
            { x: 0, y: 0 }, // Original position
            { x: -1, y: 0 }, // Try moving left first
            { x: 1, y: 0 }, // Try moving right
            { x: -2, y: 0 }, // Try moving further left
            { x: 2, y: 0 }, // Try moving further right
            { x: 0, y: -1 }, // Try moving up
            { x: -1, y: -1 }, // Try left and up
            { x: 1, y: -1 }, // Try right and up
          ];
        }

        // Try each wall kick offset
        for (const offset of wallKickOffsets) {
          const testPosition: Position = {
            x: rotatedPiece.position.x + offset.x,
            y: rotatedPiece.position.y + offset.y,
          };

          if (isValidPosition(prev.grid, rotatedPiece, testPosition)) {
            const updatedPiece = {
              ...rotatedPiece,
              position: testPosition,
            };

            // Update ghost piece after rotation
            const updatedGhostPiece = updateGhostPiece(prev, updatedPiece);

            // SFX rotate
            soundService.playRotate();

            return {
              ...prev,
              activePiece: updatedPiece,
              ghostPiece: updatedGhostPiece,
            };
          }
        }

        // If no wall kick worked, don't rotate
        return prev;
      });
    },
    []
  );

  const rotateActivePiece = useCallback(() => {
    applyRotationWithWallKick(rotateTetrominoCW);
  }, [applyRotationWithWallKick]);

  const rotateActivePieceLeft = useCallback(() => {
    applyRotationWithWallKick(rotateTetrominoCCW);
  }, [applyRotationWithWallKick]);

  const rotateActivePieceRight = useCallback(() => {
    applyRotationWithWallKick(rotateTetrominoCW);
  }, [applyRotationWithWallKick]);

  const hardDrop = useCallback(() => {
    setGameBoard((prev: GameBoard) => {
      if (!prev.activePiece || prev.gameState !== GAME_STATES.PLAYING)
        return prev;

      let dropDistance = 0;
      let testPosition = { ...prev.activePiece.position };

      // Find how far we can drop
      while (
        isValidPosition(prev.grid, prev.activePiece, {
          x: testPosition.x,
          y: testPosition.y + 1,
        })
      ) {
        testPosition.y += 1;
        dropDistance += 1;
      }

      const droppedPiece = {
        ...prev.activePiece,
        position: testPosition,
      };

      const newGrid = placeTetromino(prev.grid, droppedPiece);
      const linesToClear = findLinesToClear(newGrid);

      // SFX hard drop
      soundService.playHardDrop();

      // If there are lines to clear, start animation and shake
      if (linesToClear.length > 0) {
        // Trigger shake animation
        setTimeout(() => {
          setGameBoard((current) => ({
            ...current,
            isShaking: true,
          }));

          // Reset shake animation after 300ms
          setTimeout(() => {
            setGameBoard((current) => ({
              ...current,
              isShaking: false,
            }));
          }, 300);
        }, 0);
        // Spawn new piece immediately
        const newActivePiece = spawnNewPiece();
        const gameOver = !isValidPosition(
          newGrid,
          newActivePiece,
          newActivePiece.position
        );

        // After animation delay, actually clear the lines
        setTimeout(() => {
          setGameBoard((current) => {
            const { newGrid: clearedGrid, linesCleared } = clearLines(
              current.grid
            );
            const scoreIncrease =
              calculateScore(linesCleared, current.level) + dropDistance * 2;
            const newLines = current.lines + linesCleared;
            const newLevel = Math.floor(newLines / GAME_CONFIG.LINES_PER_LEVEL);

            return {
              ...current,
              grid: clearedGrid,
              score: current.score + scoreIncrease,
              lines: newLines,
              level: newLevel,
              clearingRows: [], // Clear the animation state
              dropPosition: undefined, // Clear drop position
            };
          });
        }, 500); // 500ms animation delay

        // Return immediately with animation state
        return {
          ...prev,
          grid: newGrid,
          activePiece: gameOver ? null : newActivePiece,
          ghostPiece: gameOver
            ? null
            : updateGhostPiece(
                {
                  ...prev,
                  grid: newGrid,
                  activePiece: newActivePiece,
                },
                newActivePiece
              ),
          nextPiece: getRandomTetromino(),
          canHold: true,
          clearingRows: linesToClear,
          dropPosition: droppedPiece
            ? {
                x:
                  droppedPiece.position.x +
                  Math.floor(droppedPiece.shape[0].length / 2),
                y: droppedPiece.position.y,
              }
            : undefined,
          gameState: gameOver ? GAME_STATES.GAME_OVER : prev.gameState,
        };
      } else {
        // No lines to clear, proceed normally
        const { newGrid: clearedGrid, linesCleared } = clearLines(newGrid);
        const scoreIncrease =
          calculateScore(linesCleared, prev.level) + dropDistance * 2;
        const newLines = prev.lines + linesCleared;
        const newLevel = Math.floor(newLines / GAME_CONFIG.LINES_PER_LEVEL);

        // Check for game over
        const newActivePiece = spawnNewPiece();
        const gameOver = !isValidPosition(
          clearedGrid,
          newActivePiece,
          newActivePiece.position
        );

        return {
          ...prev,
          grid: clearedGrid,
          activePiece: gameOver ? null : newActivePiece,
          ghostPiece: gameOver
            ? null
            : updateGhostPiece(
                {
                  ...prev,
                  grid: clearedGrid,
                  activePiece: newActivePiece,
                },
                newActivePiece
              ),
          nextPiece: getRandomTetromino(),
          score: prev.score + scoreIncrease,
          lines: newLines,
          level: newLevel,
          canHold: true, // Reset hold flag when a piece is placed
          gameState: gameOver ? GAME_STATES.GAME_OVER : prev.gameState,
          clearingRows: [], // No rows being cleared
        };
      }
    });

    // Mark that we need to send grid update after state change
    shouldSendGridRef.current = true;
  }, [spawnNewPiece, updateGhostPiece]);

  const holdActivePiece = useCallback(() => {
    setGameBoard((prev: GameBoard) => {
      if (
        !prev.activePiece ||
        prev.gameState !== GAME_STATES.PLAYING ||
        !prev.canHold
      ) {
        return prev;
      }

      // Get the current active piece type
      const currentType = prev.activePiece.type;

      // Determine which piece to spawn next
      let nextActiveType: TetrominoType;

      if (prev.holdPiece) {
        // If there's already a hold piece, swap with it
        nextActiveType = prev.holdPiece;
      } else {
        // If there's no hold piece yet, use the next piece and generate a new next piece
        nextActiveType = prev.nextPiece || getRandomTetromino();
      }

      // Create the new active piece
      const startPosition: Position = {
        x: Math.floor(GAME_CONFIG.BOARD_WIDTH / 2) - 1,
        y: -1,
      };

      const newActivePiece = createTetromino(nextActiveType, startPosition);

      // Update ghost piece based on new active piece
      const updatedGhostPiece = updateGhostPiece(
        {
          ...prev,
          activePiece: newActivePiece,
        },
        newActivePiece
      );

      return {
        ...prev,
        activePiece: newActivePiece,
        ghostPiece: updatedGhostPiece,
        holdPiece: currentType,
        nextPiece: prev.holdPiece ? prev.nextPiece : getRandomTetromino(),
        canHold: false, // Prevent holding again until the piece is placed
      };
    });
  }, [updateGhostPiece]);

  const startGame = useCallback(() => {
    // Bắn socket event để tất cả players cùng bắt đầu
    gameService.startGame();

    setGameBoard((prev: GameBoard) => {
      // If game over, reset the board completely
      if (prev.gameState === GAME_STATES.GAME_OVER) {
        const newActivePiece = spawnNewPiece();
        const initialBoard = createInitialGameBoard();

        return {
          ...initialBoard,
          gameState: GAME_STATES.PLAYING,
          activePiece: newActivePiece,
          ghostPiece: updateGhostPiece(
            {
              ...initialBoard,
              activePiece: newActivePiece,
            },
            newActivePiece
          ),
          holdPiece: null, // Reset hold piece
          canHold: true, // Allow holding on new game
        };
      }

      // Regular start from waiting state
      const newActivePiece = spawnNewPiece();
      return {
        ...prev,
        activePiece: newActivePiece,
        ghostPiece: updateGhostPiece(
          { ...prev, activePiece: newActivePiece },
          newActivePiece
        ),
        gameState: GAME_STATES.PLAYING,
      };
    });
    lastDropTimeRef.current = Date.now();
  }, [spawnNewPiece]);

  const pauseGame = useCallback(() => {
    // Always pause local game state immediately
    setGameBoard((prev: GameBoard) => ({
      ...prev,
      gameState: GAME_STATES.PAUSED,
    }));

    // If multiplayer, send pause event to all players
    if (gameService.isMultiplayer()) {
      gameService.pauseGame();
    }
  }, []);

  const resumeGame = useCallback(() => {
    // Always resume local game state immediately
    setGameBoard((prev: GameBoard) => ({
      ...prev,
      gameState: GAME_STATES.PLAYING,
    }));

    // If multiplayer, send resume event to all players
    if (gameService.isMultiplayer()) {
      gameService.resumeGame();
    }
  }, []);

  // Force set pause state without sending multiplayer event
  const forcePause = useCallback(() => {
    setGameBoard((prev: GameBoard) => ({
      ...prev,
      gameState: GAME_STATES.PAUSED,
    }));
  }, []);

  // Force set resume state without sending multiplayer event
  const forceResume = useCallback(() => {
    setGameBoard((prev: GameBoard) => ({
      ...prev,
      gameState: GAME_STATES.PLAYING,
    }));
  }, []);

  // Toggle pause/resume state
  const togglePause = useCallback(() => {
    if (gameBoard.gameState === GAME_STATES.PLAYING) {
      pauseGame();
    } else if (gameBoard.gameState === GAME_STATES.PAUSED) {
      resumeGame();
    }
  }, [gameBoard.gameState, pauseGame, resumeGame]);

  const resetGame = useCallback(() => {
    setGameBoard(createInitialGameBoard());
  }, []);

  const setWaitingState = useCallback(() => {
    setGameBoard((prev: GameBoard) => ({
      ...prev,
      gameState: GAME_STATES.WAITING,
    }));
  }, []);

  const createRoom = useCallback(async (name: string) => {
    // Save player name to localStorage
    localStorage.setItem("tetris_player_name", name);
    setPlayerName(name);

    try {
      // Tự động tạo phòng trên server
      const roomCode = await gameService.createRoom(name);
      console.log(`🏠 Room created: ${roomCode}`);

      // Setup multiplayer event handlers
      gameService.onPlayerJoined = (data) => {
        console.log(`👤 Player joined: ${data.player.name}`);
        // Có thể thêm notification ở đây
      };

      gameService.onGameStateUpdate = (data) => {
        console.log(`📊 Other player state updated:`, data);
        // Có thể sync game state ở đây
      };
    } catch (error) {
      console.error("Failed to create room:", error);
      // Fallback to offline mode
    }

    setGameBoard((prev: GameBoard) => ({
      ...prev,
      gameState: GAME_STATES.WAITING,
    }));
  }, []);

  const handleKeyPress = useCallback(
    (key: string) => {
      // Don't handle any game keys when settings is open
      if (settingsOpen) {
        return;
      }

      const lowerKey = key.toLowerCase();
      const currentControls = getControlsFromStorage();

      // Handle pause/resume with Escape key
      if (lowerKey === "escape") {
        togglePause();
        return;
      }

      // Auto-resume game if paused and movement key is pressed
      const movementKeys = [
        currentControls.MOVE_LEFT,
        currentControls.MOVE_RIGHT,
        currentControls.MOVE_DOWN,
        currentControls.ROTATE,
        currentControls.ROTATE_LEFT,
        currentControls.ROTATE_RIGHT,
        currentControls.HARD_DROP,
        currentControls.HOLD,
      ] as const;

      if (
        gameBoard.gameState === GAME_STATES.PAUSED &&
        movementKeys.includes(lowerKey as (typeof movementKeys)[number])
      ) {
        // Resume game for all players in multiplayer
        togglePause();
        // Don't process the key press further, just resume
        return;
      }

      // Handle rotation and hard drop immediately (non-continuous)
      if (lowerKey === currentControls.ROTATE) {
        rotateActivePiece();
        return;
      }

      if (lowerKey === currentControls.ROTATE_LEFT) {
        rotateActivePieceLeft();
        return;
      }

      if (lowerKey === currentControls.ROTATE_RIGHT) {
        rotateActivePieceRight();
        return;
      }

      if (lowerKey === currentControls.HARD_DROP) {
        hardDrop();
        return;
      }

      if (lowerKey === currentControls.HOLD) {
        holdActivePiece();
        return;
      }

      // Add continuous movement keys to pressed set
      if (
        lowerKey === currentControls.MOVE_LEFT ||
        lowerKey === currentControls.MOVE_RIGHT ||
        lowerKey === currentControls.MOVE_DOWN
      ) {
        keysPressed.current.add(lowerKey);

        // Execute immediate movement on first press
        const now = Date.now();
        // Record when key was first pressed (for acceleration)
        lastMoveTimeRef.current[lowerKey + "_start"] = now;

        if (!lastMoveTimeRef.current[lowerKey]) {
          if (lowerKey === currentControls.MOVE_LEFT) {
            moveActivePiece("left");
          } else if (lowerKey === currentControls.MOVE_RIGHT) {
            moveActivePiece("right");
          } else if (lowerKey === currentControls.MOVE_DOWN) {
            moveActivePiece("down");
          }
          lastMoveTimeRef.current[lowerKey] = now;
        }
      }
    },
    [
      moveActivePiece,
      rotateActivePiece,
      rotateActivePieceLeft,
      rotateActivePieceRight,
      hardDrop,
      holdActivePiece,
      togglePause,
      gameBoard.gameState,
      settingsOpen,
    ]
  );

  const handleKeyRelease = useCallback((key: string) => {
    const lowerKey = key.toLowerCase();
    keysPressed.current.delete(lowerKey);
    delete lastMoveTimeRef.current[lowerKey];
    delete lastMoveTimeRef.current[lowerKey + "_start"]; // Remove the start time as well
  }, []);

  // Game loop
  useEffect(() => {
    const gameLoop = () => {
      const now = Date.now();
      const dropSpeed =
        GAME_CONFIG.INITIAL_SPEED -
        gameBoard.level * GAME_CONFIG.SPEED_INCREASE;
      const minSpeed = 50;
      const actualDropSpeed = Math.max(dropSpeed, minSpeed);

      // Handle automatic piece dropping
      if (
        gameBoard.gameState === GAME_STATES.PLAYING &&
        gameBoard.activePiece &&
        now - lastDropTimeRef.current > actualDropSpeed
      ) {
        moveActivePiece("down");
        lastDropTimeRef.current = now;
      }

      // Handle continuous movement for held keys with acceleration
      keysPressed.current.forEach((key) => {
        if (gameBoard.gameState === GAME_STATES.PLAYING && !settingsOpen) {
          const lastMoveTime = lastMoveTimeRef.current[key] || 0;
          const holdDuration = now - lastMoveTime;
          const currentControls = getControlsFromStorage();

          // Calculate adaptive move speed: faster the longer the key is held
          // Initial speed: 150ms, reduces to 50ms after holding for 1 second
          const baseMoveSpeed = 150; // Initial delay in milliseconds
          const minMoveSpeed = 50; // Minimum delay in milliseconds (maximum speed)
          const accelerationTime = 1000; // Time to reach maximum speed in milliseconds

          // Calculate current move speed based on how long the key has been held
          const holdingTime =
            now - (lastMoveTimeRef.current[key + "_start"] || now);
          const speedReduction =
            Math.min(holdingTime / accelerationTime, 1) *
            (baseMoveSpeed - minMoveSpeed);
          const currentMoveSpeed = baseMoveSpeed - speedReduction;

          if (holdDuration > currentMoveSpeed) {
            if (key === currentControls.MOVE_LEFT) {
              moveActivePiece("left");
            } else if (key === currentControls.MOVE_RIGHT) {
              moveActivePiece("right");
            } else if (key === currentControls.MOVE_DOWN) {
              moveActivePiece("down");
            }
            lastMoveTimeRef.current[key] = now;
          }
        }
      });

      // Bot decision making
      if (
        bot.isEnabled &&
        gameBoard.gameState === GAME_STATES.PLAYING &&
        gameBoard.activePiece
      ) {
        bot.executeMove(gameBoard, gameBoard.activePiece);
      }

      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [
    gameBoard.gameState,
    gameBoard.level,
    gameBoard.activePiece,
    settingsOpen,
    moveActivePiece,
    bot,
  ]);

  // Keyboard event listeners
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle game keys when in game states (not welcome screen)
      if (
        gameBoard.gameState === GAME_STATES.WELCOME ||
        gameBoard.gameState === GAME_STATES.GAME_OVER
      ) {
        return;
      }

      // Prevent default for game keys to avoid browser shortcuts
      const lowerKey = event.key.toLowerCase();
      const currentControls = getControlsFromStorage();
      const gameKeys = [
        currentControls.MOVE_LEFT,
        currentControls.MOVE_RIGHT,
        currentControls.MOVE_DOWN,
        currentControls.ROTATE,
        currentControls.HARD_DROP,
        currentControls.HOLD,
      ] as const;

      if (gameKeys.includes(lowerKey as (typeof gameKeys)[number])) {
        event.preventDefault();
      }

      handleKeyPress(event.key);
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      // Only handle game keys when in game states (not welcome screen)
      if (
        gameBoard.gameState === GAME_STATES.WELCOME ||
        gameBoard.gameState === GAME_STATES.GAME_OVER
      ) {
        return;
      }

      handleKeyRelease(event.key);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [handleKeyPress, handleKeyRelease, gameBoard.gameState]);

  // Sync game state với server khi có thay đổi
  useEffect(() => {
    if (
      gameBoard.gameState === GAME_STATES.PLAYING ||
      gameBoard.gameState === GAME_STATES.GAME_OVER
    ) {
      // Tạo grid overlay với activePiece hiện tại để người khác thấy quân đang rơi
      let gridForBroadcast: (TetrominoType | null)[][] | undefined = undefined;
      if (gameService.isConnected()) {
        const baseGrid = gameBoard.grid;
        const activePiece = gameBoard.activePiece;
        const gridCopy: (TetrominoType | null)[][] = baseGrid.map((row) => [
          ...row,
        ]);

        if (activePiece) {
          const shape = activePiece.shape;
          for (let y = 0; y < shape.length; y += 1) {
            for (let x = 0; x < shape[y].length; x += 1) {
              if (shape[y][x]) {
                const gx = activePiece.position.x + x;
                const gy = activePiece.position.y + y;
                if (
                  gy >= 0 &&
                  gy < gridCopy.length &&
                  gx >= 0 &&
                  gx < gridCopy[0].length
                ) {
                  gridCopy[gy][gx] = activePiece.type;
                }
              }
            }
          }
        }

        // Chỉ gửi grid đầy đủ khi có request gửi grid hoặc có activePiece (hiển thị liên tục)
        gridForBroadcast =
          shouldSendGridRef.current || activePiece ? gridCopy : undefined;
      }

      const gameState = {
        grid: gridForBroadcast,
        score: gameBoard.score,
        lines: gameBoard.lines,
        level: gameBoard.level,
        isGameOver: gameBoard.gameState === GAME_STATES.GAME_OVER,
      };

      if (gameService.isConnected()) {
        gameService.updateGameState(gameState);
      }

      // Reset flag after sending
      shouldSendGridRef.current = false;
    }
  }, [
    gameBoard.score,
    gameBoard.lines,
    gameBoard.level,
    gameBoard.gameState,
    gameBoard.grid,
    gameBoard.activePiece,
  ]);

  const autoJoinRoom = async (roomCode: string) => {
    if (
      roomCode &&
      !gameService.getRoomCode() &&
      hasAttemptedJoinRef.current !== roomCode
    ) {
      // Nếu chưa có tên người chơi, yêu cầu nhập trước khi tiếp tục
      const existingNameOnly = getStoredPlayerNameOnly();
      if (!existingNameOnly) {
        setAwaitingPlayerName(true);
        pendingRoomCodeRef.current = roomCode;
        return;
      }

      hasAttemptedJoinRef.current = roomCode;
      const savedPlayerName = existingNameOnly;

      setIsJoiningRoom(true);
      setRoomError(null);

      // Setup event handlers
      gameService.onError = (data) => {
        console.error("Socket error:", data);
        setRoomError(data.message || "Unknown error");
        setIsJoiningRoom(false);
      };

      try {
        // Kiểm tra room trước khi join
        console.log(`🔍 Checking room: ${roomCode}`);
        const roomStatus = await gameService.checkRoom(roomCode);

        if (!roomStatus.exists) {
          // Room không tồn tại, thử tạo room mới với roomCode từ URL
          console.log(`🏗️ Room ${roomCode} not found, attempting to create...`);

          // Reset players list cho room mới
          setRoomPlayers([]);

          try {
            await gameService.createRoomWithCode(savedPlayerName, roomCode);
            console.log(`✅ Room ${roomCode} created successfully`);
            // Room đã được tạo với roomCode mong muốn, bây giờ join
            await gameService.joinRoom(roomCode, savedPlayerName);
          } catch (createError: unknown) {
            const err = createError as { message?: string };
            // Nếu tạo room thất bại (409 - room đã được tạo bởi người khác), thử join
            if (
              err.message?.includes("already exists") ||
              err.message?.includes("Room already exists")
            ) {
              console.log(
                `🔄 Room ${roomCode} was created by another user during our attempt, trying to join...`
              );
              // Kiểm tra lại trạng thái room trước khi join
              const updatedRoomStatus = await gameService.checkRoom(roomCode);
              if (updatedRoomStatus.isStarted) {
                console.log(
                  `⚠️ Room ${roomCode} started while we were creating, showing popup`
                );
                setShowGameStartedPopup(true);
                setGameStartedRoomCode(roomCode);
                setIsJoiningRoom(false);
                return;
              }
              await gameService.joinRoom(roomCode, savedPlayerName);
            } else {
              throw createError;
            }
          }
        } else if (roomStatus.isStarted) {
          // Room đã bắt đầu, hiện popup
          console.log(`⚠️ Room ${roomCode} already started`);
          setShowGameStartedPopup(true);
          setGameStartedRoomCode(roomCode);
          setIsJoiningRoom(false);
          return;
        } else {
          // Room tồn tại và chưa bắt đầu, join bình thường
          console.log(`✅ Room ${roomCode} exists and available, joining...`);

          // Lưu thông tin players hiện tại trước khi join
          if (roomStatus.players) {
            const playerNames = roomStatus.players.map((p) => p.name);
            console.log(
              `👥 Current players in room: ${playerNames.join(", ")}`
            );
            setRoomPlayers(playerNames);
          }

          await gameService.joinRoom(roomCode, savedPlayerName);
        }

        console.log(
          `🚪 Successfully joined room: ${roomCode} with player: ${savedPlayerName}`
        );

        // Set game state to WAITING after successful join
        setGameBoard((prev: GameBoard) => ({
          ...prev,
          gameState: GAME_STATES.WAITING,
        }));

        console.log("✅ Room join completed, game state set to WAITING");
      } catch (error) {
        console.error("Failed to auto-join room:", error);
        setRoomError(`Failed to join room ${roomCode}`);
        // Navigate back to home on error
        navigate("/");
      } finally {
        setIsJoiningRoom(false);
      }
    }
  };

  const submitPlayerName = useCallback(async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    storePlayerName(trimmed);
    setPlayerName(trimmed);
    setAwaitingPlayerName(false);

    const pending = pendingRoomCodeRef.current;
    if (pending) {
      // reset attempted flag to allow join now that we have name
      hasAttemptedJoinRef.current = null;
      await autoJoinRoom(pending);
    }
  }, []);

  // Auto join room from URL
  useEffect(() => {
    roomCode && autoJoinRoom(roomCode);
  }, [roomCode, playerName]);

  return {
    gameBoard,
    gameWinner,
    playerName,
    awaitingPlayerName,
    submitPlayerName,
    startGame,
    pauseGame,
    resumeGame,
    togglePause,
    forcePause,
    forceResume,
    resetGame,
    setWaitingState,
    createRoom,
    handleKeyPress,
    handleKeyRelease,
    rotateActivePieceLeft,
    rotateActivePieceRight,
    holdActivePiece,
    bot,
    // Room navigation functions
    roomCode,
    navigateToRoom,
    isJoiningRoom,
    roomError,
    showGameStartedPopup,
    gameStartedRoomCode,
    closeGameStartedPopup,
    roomPlayers,
  };
};
