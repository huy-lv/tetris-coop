import React, { useState, useEffect, useCallback, useRef } from "react";
import styled from "styled-components";
import { motion, AnimatePresence } from "framer-motion";
import { useSocket } from "../hooks/useSocket";
import type { Player, Room, GameAction } from "../types";
import { GameState } from "../types";
import GameBoard from "./GameBoard";
import PlayerList from "./PlayerList";
import GameStats from "./GameStats";
import NextPiece from "./NextPiece";
import HoldPiece from "./HoldPiece";
import Controls from "./Controls";
import TouchControls from "./TouchControls";
import FireballAnimation from "./FireballAnimation";
import SettingsDialog from "./SettingsDialog";
import { getSavedControls } from "../constants/controlsUtils";
import { FIREBALL_FLIGHT_MS } from "../constants/animations";
import { movePiece, rotatePiece, hardDrop, holdPiece, executeLineClear } from "../game/tetris";

const GameContainer = styled.div`
  position: relative;
  display: flex;
  min-height: 100vh;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  color: white;
  font-family: "Arial", sans-serif;

  @media (max-width: 768px) {
    flex-direction: column;
    padding-bottom: 200px; /* Space for touch controls */
  }
`;

const MainGameArea = styled.div`
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;

  @media (max-width: 768px) {
    padding: 10px;
    align-items: flex-start;
    overflow-x: auto;
  }
`;

const GameWrapper = styled(motion.div)`
  display: flex;
  gap: 30px;
  align-items: flex-start;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 15px;
    width: 100%;
    align-items: center;
  }
`;

const PlayerGameArea = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;

  @media (max-width: 768px) {
    width: 100%;
    max-width: 400px;
  }
`;

const PlayerName = styled.div`
  font-size: 18px;
  font-weight: bold;
  text-align: center;
  color: #ffd700;
  margin-bottom: 10px;
`;

const GameLayoutContainer = styled.div`
  display: flex;
  gap: 15px;
  align-items: flex-start;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: center;
  }
`;

const SideComponents = styled.div`
  display: flex;
  flex-direction: column;
  gap: 15px;

  @media (max-width: 768px) {
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: center;
    gap: 10px;
  }
`;

const Sidebar = styled.div`
  width: 300px;
  padding: 20px;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
  border-left: 1px solid rgba(255, 255, 255, 0.1);

  @media (max-width: 768px) {
    width: 100%;
    border-left: none;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    padding: 15px;
    order: -1; /* Show sidebar above game on mobile */
  }
`;

const RoomInfo = styled.div`
  background: rgba(255, 255, 255, 0.1);
  padding: 15px;
  border-radius: 10px;
  margin-bottom: 20px;
`;

const RoomCode = styled.div`
  font-size: 24px;
  font-weight: bold;
  text-align: center;
  color: #ffd700;
  margin-bottom: 10px;
  letter-spacing: 2px;
`;

const ReadyButton = styled(motion.button)`
  width: 100%;
  padding: 12px;
  font-size: 16px;
  font-weight: bold;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  margin-bottom: 20px;

  &.ready {
    background: #4caf50;
    color: white;
  }

  &.not-ready {
    background: #f44336;
    color: white;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const GameMessage = styled(motion.div)`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.9);
  color: white;
  padding: 30px;
  border-radius: 15px;
  font-size: 24px;
  font-weight: bold;
  text-align: center;
  z-index: 1000;
  border: 2px solid #ffd700;
`;

interface TetrisGameProps {
  room: Room;
  currentPlayer: Player;
  onLeaveRoom: () => void;
}

const TetrisGame: React.FC<TetrisGameProps> = ({
  room,
  currentPlayer,
  onLeaveRoom,
}) => {
  const { socket } = useSocket();
  const [gameState, setGameState] = useState(room);
  const [showMessage, setShowMessage] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(currentPlayer.isReady);
  const [showSettings, setShowSettings] = useState(false);

  // Current controls state (loads from localStorage)
  const [currentControls, setCurrentControls] = useState(() =>
    getSavedControls()
  );
  // Ref to always have fresh controls in event handlers
  const currentControlsRef = useRef(currentControls);

  // Update ref whenever state changes
  useEffect(() => {
    currentControlsRef.current = currentControls;
  }, [currentControls]);

  // Fireball animation state
  const [activeFireballs, setActiveFireballs] = useState<
    Array<{
      id: string;
      fromPlayerId: string;
      toPlayerId: string;
      playerName: string;
      fromPosition: { x: number; y: number };
      toPosition: { x: number; y: number };
    }>
  >([]);

  // Key repeat state management
  const pressedKeys = useRef<Set<string>>(new Set());
  const keyIntervals = useRef<Map<string, number>>(new Map());
  const initialDelayTimers = useRef<Map<string, number>>(new Map());

  // Function to calculate player game board bottom row positions for fireball animations
  const getPlayerBottomRowPosition = useCallback(
    (playerId: string) => {
      const playerIndex = gameState.players.findIndex((p) => p.id === playerId);

      // Try to find the actual game board element for this player
      const gameBoards = document.querySelectorAll(
        '[data-testid="game-board"], .game-board, [class*="Board"]'
      );

      if (gameBoards[playerIndex]) {
        const boardElement = gameBoards[playerIndex];
        const rect = boardElement.getBoundingClientRect();

        // Calculate the bottom center of the game board
        return {
          x: rect.left + rect.width / 2,
          y: rect.bottom - 10, // Slightly above the bottom border
        };
      }

      // Fallback: estimate position based on player index and layout
      const baseX = window.innerWidth / 2;
      const baseY = window.innerHeight / 2;
      const offset = 400; // Approximate distance between player boards
      const boardHeight = 500; // Approximate board height

      return {
        x: baseX + (playerIndex - 1) * offset,
        y: baseY + boardHeight / 2 - 20, // Bottom of estimated board
      };
    },
    [gameState.players]
  );

  // Function to handle fireball animation completion
  const handleFireballComplete = useCallback((fireballId: string) => {
    setActiveFireballs((prev) =>
      prev.filter((fireball) => fireball.id !== fireballId)
    );
  }, []);

  // Function to refresh controls from localStorage
  const refreshControls = useCallback(() => {
    setCurrentControls(getSavedControls());
  }, []);

  // Update gameState when room prop changes
  useEffect(() => {
    setGameState(room);
  }, [room]);

  // Listen for custom event when controls are updated
  useEffect(() => {
    const handleControlsUpdate = () => {
      refreshControls();
    };

    window.addEventListener("tetris-controls-updated", handleControlsUpdate);
    return () =>
      window.removeEventListener(
        "tetris-controls-updated",
        handleControlsUpdate
      );
  }, [refreshControls]);

  // Check if current player is the room creator (first player)
  const isRoomCreator =
    gameState.players.length > 0 &&
    gameState.players[0].id === currentPlayer.id;

  // Ref to always have fresh handleGameAction in event handlers
  const handleGameActionRef = useRef<(actionType: string) => void>();

  // Function to handle game actions locally and sync to server
  const handleGameAction = useCallback(
    (actionType: string) => {
      if (
        !socket ||
        gameState.gameState !== GameState.PLAYING ||
        currentPlayer.isGameOver
      ) {
        return;
      }

      // Find current player in game state
      const playerIndex = gameState.players.findIndex(
        (p) => p.id === currentPlayer.id
      );
      if (playerIndex === -1) return;

      const updatedPlayer = {
        ...gameState.players[playerIndex],
        gameBoard: gameState.players[playerIndex].gameBoard.map((row) => [
          ...row,
        ]),
        currentPiece: gameState.players[playerIndex].currentPiece
          ? {
              ...gameState.players[playerIndex].currentPiece,
              shape: gameState.players[playerIndex].currentPiece.shape.map(
                (row) => [...row]
              ),
            }
          : undefined,
      };
      let moved = false;
      let linesCleared = 0;
      let clearedRows: number[] = [];

      // Handle action locally
      switch (actionType) {
        case "MOVE_LEFT":
          moved = movePiece(updatedPlayer, "left");
          break;
        case "MOVE_RIGHT":
          moved = movePiece(updatedPlayer, "right");
          break;
        case "MOVE_DOWN":
        case "SOFT_DROP":
          moved = movePiece(updatedPlayer, "down");
          if (!moved) {
            // Piece couldn't move down, lock it
            const lockResult = hardDrop(updatedPlayer);
            linesCleared = lockResult.linesCleared;
            clearedRows = lockResult.clearedRows;
            if (lockResult.gameOver) {
              updatedPlayer.isGameOver = true;
            }
          }
          break;
        case "ROTATE":
          moved = rotatePiece(updatedPlayer);
          break;
        case "HARD_DROP": {
          const dropResult = hardDrop(updatedPlayer);
          linesCleared = dropResult.linesCleared;
          clearedRows = dropResult.clearedRows;
          if (dropResult.gameOver) {
            updatedPlayer.isGameOver = true;
          }
          moved = true;
          break;
        }
        case "HOLD":
          moved = holdPiece(updatedPlayer);
          break;
        default:
          return;
      }

      // Handle line clearing animation
      if (linesCleared > 0 && clearedRows.length > 0) {
        // Update local state immediately with piece placed (but lines not cleared yet)
        const updatedPlayers = [...gameState.players];
        updatedPlayers[playerIndex] = {
          ...updatedPlayer,
          currentPiece: updatedPlayer.currentPiece
            ? {
                ...updatedPlayer.currentPiece,
              }
            : undefined,
        };

        setGameState((prev) => ({
          ...prev,
          players: updatedPlayers,
        }));

        // Emit lines_clearing event to start animation
        socket.emit("lines_clearing", {
          playerId: currentPlayer.id,
          clearedRows,
          dropX: updatedPlayer.currentPiece?.x || 5,
        });

        // Wait for animation duration, then execute the actual line clear
        setTimeout(() => {
          // Execute the line clear to update board and score
          executeLineClear(updatedPlayer, clearedRows);
          
          // Update the game state with cleared lines
          const finalUpdatedPlayers = [...gameState.players];
          finalUpdatedPlayers[playerIndex] = {
            ...updatedPlayer,
          };

          setGameState((prev) => ({
            ...prev,
            players: finalUpdatedPlayers,
          }));

          // Emit lines_cleared event to end animation
          socket.emit("lines_cleared", {
            playerId: currentPlayer.id,
            clearedRows,
            dropX: updatedPlayer.currentPiece?.x || 5,
          });

          // Sync final state to server
          socket.emit("game_state_sync", {
            playerId: currentPlayer.id,
            playerState: finalUpdatedPlayers[playerIndex],
            linesCleared,
          });
        }, 600); // Match the animation duration
      } else {
        // Update local state immediately for movement/rotation/drops without line clears
        if (moved || linesCleared > 0 || actionType === "ROTATE") {
          const updatedPlayers = [...gameState.players];
          updatedPlayers[playerIndex] = {
            ...updatedPlayer,
            currentPiece: updatedPlayer.currentPiece
              ? {
                  ...updatedPlayer.currentPiece,
                }
              : undefined,
          };

          setGameState((prev) => ({
            ...prev,
            players: updatedPlayers,
          }));

          // Sync state to server
          socket.emit("game_state_sync", {
            playerId: currentPlayer.id,
            playerState: updatedPlayers[playerIndex],
            linesCleared,
          });
        }
      }
    },
    [
      socket,
      gameState.gameState,
      gameState.players,
      currentPlayer.id,
      currentPlayer.isGameOver,
    ]
  );

  // Update ref whenever handleGameAction changes
  useEffect(() => {
    handleGameActionRef.current = handleGameAction;
  }, [handleGameAction]);

  // Handle touch controls
  const handleAction = useCallback(
    (action: string) => {
      switch (action) {
        case "MOVE_LEFT":
          if (handleGameActionRef.current) {
            handleGameActionRef.current("MOVE_LEFT");
          }
          break;
        case "MOVE_RIGHT":
          if (handleGameActionRef.current) {
            handleGameActionRef.current("MOVE_RIGHT");
          }
          break;
        case "SOFT_DROP":
          if (handleGameActionRef.current) {
            handleGameActionRef.current("SOFT_DROP");
          }
          break;
        case "MOVE_UP":
        case "ROTATE":
          if (handleGameActionRef.current) {
            handleGameActionRef.current("ROTATE");
          }
          break;
        case "HARD_DROP":
          if (handleGameActionRef.current) {
            handleGameActionRef.current("HARD_DROP");
          }
          break;
        case "HOLD":
          if (handleGameActionRef.current) {
            handleGameActionRef.current("HOLD");
          }
          break;
        default:
          break;
      }
    },
    []
  );

  // Clean up intervals and timers
  const clearKeyTimers = useCallback((key: string) => {
    const intervalId = keyIntervals.current.get(key);
    const timerId = initialDelayTimers.current.get(key);

    if (intervalId) {
      clearInterval(intervalId);
      keyIntervals.current.delete(key);
    }

    if (timerId) {
      clearTimeout(timerId);
      initialDelayTimers.current.delete(key);
    }
  }, []);

  // Start key repeat for movement keys
  const startKeyRepeat = useCallback(
    (key: string, actionType: string) => {
      // Clear any existing timers for this key
      clearKeyTimers(key);

      console.log("Starting key repeat for:", key, actionType);

      // Send initial action immediately
      if (handleGameActionRef.current) {
        handleGameActionRef.current(actionType);
      }

      // Set up initial delay before repeat starts (150ms)
      const initialTimer = setTimeout(() => {
        console.log("Starting interval for:", key);
        // Start repeating with faster interval (50ms)
        const intervalId = setInterval(() => {
          if (pressedKeys.current.has(key)) {
            console.log("Repeating action:", actionType, "for key:", key);
            if (handleGameActionRef.current) {
              handleGameActionRef.current(actionType);
            }
          } else {
            console.log("Key no longer pressed, clearing timer for:", key);
            clearKeyTimers(key);
          }
        }, 50);

        keyIntervals.current.set(key, intervalId);
      }, 150);

      initialDelayTimers.current.set(key, initialTimer);
    },
    [clearKeyTimers]
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (
        !socket ||
        gameState.gameState !== GameState.PLAYING ||
        currentPlayer.isGameOver
      ) {
        return;
      }

      const key = event.key.toLowerCase();

      // Check if this is a repeatable action (move left, right, or soft drop)
      const currentControlsValues = currentControlsRef.current;
      const isRepeatableAction =
        key === currentControlsValues.MOVE_LEFT ||
        key === currentControlsValues.MOVE_RIGHT ||
        key === currentControlsValues.SOFT_DROP;

      const isGameKey =
        isRepeatableAction ||
        key === currentControlsValues.ROTATE ||
        key === currentControlsValues.HARD_DROP ||
        key === currentControlsValues.HOLD;

      // Prevent default for all game keys
      if (isGameKey) {
        event.preventDefault();
      }

      // For repeatable actions, only process if key is not already pressed
      if (isRepeatableAction) {
        if (pressedKeys.current.has(key)) {
          return; // Prevent browser key repeat for movement keys
        }
        pressedKeys.current.add(key);

        let actionType: string;
        switch (key) {
          case currentControlsRef.current.MOVE_LEFT:
            actionType = "MOVE_LEFT";
            break;
          case currentControlsRef.current.MOVE_RIGHT:
            actionType = "MOVE_RIGHT";
            break;
          case currentControlsRef.current.SOFT_DROP:
            actionType = "MOVE_DOWN";
            break;
          default:
            pressedKeys.current.delete(key);
            return;
        }
        startKeyRepeat(key, actionType);
      } else {
        // Non-repeatable actions can be triggered even if other keys are pressed
        switch (key) {
          case currentControlsRef.current.ROTATE:
            if (handleGameActionRef.current) {
              handleGameActionRef.current("ROTATE");
            }
            break;
          case currentControlsRef.current.HARD_DROP:
            if (handleGameActionRef.current) {
              handleGameActionRef.current("HARD_DROP");
            }
            break;
          case currentControlsRef.current.HOLD:
            if (handleGameActionRef.current) {
              handleGameActionRef.current("HOLD");
            }
            break;
          default:
            return; // Ignore unhandled keys
        }
      }
    },
    [
      socket,
      gameState.gameState,
      currentPlayer.isGameOver,
      startKeyRepeat,
    ]
  );

  const handleKeyUp = useCallback(
    (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();

      if (pressedKeys.current.has(key)) {
        pressedKeys.current.delete(key);
        clearKeyTimers(key);
        console.log("Key released:", key);
      }
    },
    [clearKeyTimers]
  );

  useEffect(() => {
    if (!socket) return;

    const handleRoomJoined = (updatedRoom: Room) => {
      setGameState(updatedRoom);
    };

    const handleRoomLeft = (playerId: string) => {
      setGameState((prev) => ({
        ...prev,
        players: prev.players.filter((p) => p.id !== playerId),
      }));
    };

    const handlePlayerReady = (playerId: string, ready: boolean) => {
      setGameState((prev) => ({
        ...prev,
        players: prev.players.map((p) =>
          p.id === playerId ? { ...p, isReady: ready } : p
        ),
      }));
    };

    const handleGameStarted = () => {
      setShowMessage("Game Starting!");
      setTimeout(() => setShowMessage(null), 2000);
    };

    const handleGamePaused = () => {
      setShowMessage("Game Paused");
      setGameState((prev) => ({ ...prev, gameState: GameState.PAUSED }));
      setTimeout(() => setShowMessage(null), 2000);
    };

    const handleGameResumed = () => {
      setShowMessage("Game Resumed");
      setGameState((prev) => ({ ...prev, gameState: GameState.PLAYING }));
      setTimeout(() => setShowMessage(null), 2000);
    };

    const handleGameStateUpdate = (update: { players: Player[] }) => {
      setGameState((prev) => ({
        ...prev,
        players: update.players,
        gameState: GameState.PLAYING,
      }));
    };

    const handlePlayerLost = (playerId: string) => {
      const player = gameState.players.find((p) => p.id === playerId);
      if (player) {
        setShowMessage(`${player.name} is out!`);
        setTimeout(() => setShowMessage(null), 3000);
      }
    };

    const handleGameEnded = (winnerId?: string) => {
      const winner = winnerId
        ? gameState.players.find((p) => p.id === winnerId)
        : null;
      setShowMessage(winner ? `${winner.name} Wins!` : "Game Over!");
      setGameState((prev) => ({ ...prev, gameState: GameState.FINISHED }));
      setTimeout(() => setShowMessage(null), 5000);
    };

    const handleFireballAttack = (data: {
      fromPlayerId: string;
      fromPlayerName: string;
      targetPlayerIds: string[];
      rowCount: number;
    }) => {
      // Show fireball animations to ALL players
      const fromPosition = getPlayerBottomRowPosition(data.fromPlayerId);

      // Create fireballs for each target player
      data.targetPlayerIds.forEach((targetPlayerId) => {
        const toPosition = getPlayerBottomRowPosition(targetPlayerId);
        const fireballId = `${
          data.fromPlayerId
        }-${targetPlayerId}-${Date.now()}`;

        setActiveFireballs((prev) => [
          ...prev,
          {
            id: fireballId,
            fromPlayerId: data.fromPlayerId,
            toPlayerId: targetPlayerId,
            playerName: data.fromPlayerName,
            fromPosition,
            toPosition,
          },
        ]);
      });
    };

    const handleGarbageIncoming = (data: {
      playerId: string;
      playerName: string;
      rowCount: number;
    }) => {
      // Only apply garbage to the receiving player (not the sender)
      if (
        data.playerId !== currentPlayer.id &&
        !currentPlayer.isGameOver &&
        gameState.gameState === GameState.PLAYING
      ) {
        // Apply the garbage to this player after a delay to sync with animation
        setTimeout(() => {
          socket.emit("apply_garbage");
        }, FIREBALL_FLIGHT_MS); // Use constant for consistent timing
      }
    };

    socket.on("room_joined", handleRoomJoined);
    socket.on("room_left", handleRoomLeft);
    socket.on("player_ready", handlePlayerReady);
    socket.on("game_started", handleGameStarted);
    socket.on("game_paused", handleGamePaused);
    socket.on("game_resumed", handleGameResumed);
    socket.on("game_state_update", handleGameStateUpdate);
    socket.on("player_lost", handlePlayerLost);
    socket.on("game_ended", handleGameEnded);
    socket.on("fireball_attack", handleFireballAttack);
    socket.on("garbage_incoming", handleGarbageIncoming);

    return () => {
      socket.off("room_joined", handleRoomJoined);
      socket.off("room_left", handleRoomLeft);
      socket.off("player_ready", handlePlayerReady);
      socket.off("game_started", handleGameStarted);
      socket.off("game_paused", handleGamePaused);
      socket.off("game_resumed", handleGameResumed);
      socket.off("game_state_update", handleGameStateUpdate);
      socket.off("player_lost", handlePlayerLost);
      socket.off("game_ended", handleGameEnded);
      socket.off("fireball_attack", handleFireballAttack);
      socket.off("garbage_incoming", handleGarbageIncoming);
    };
  }, [
    socket,
    gameState.players,
    currentPlayer.id,
    currentPlayer.isGameOver,
    gameState.gameState,
    getPlayerBottomRowPosition,
  ]);

  useEffect(() => {
    const keyIntervalsRef = keyIntervals.current;
    const initialDelayTimersRef = initialDelayTimers.current;
    const pressedKeysRef = pressedKeys.current;

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);

      // Clean up all timers when component unmounts
      keyIntervalsRef.forEach((intervalId) => clearInterval(intervalId));
      initialDelayTimersRef.forEach((timerId) => clearTimeout(timerId));
      keyIntervalsRef.clear();
      initialDelayTimersRef.clear();
      pressedKeysRef.clear();
    };
  }, [handleKeyDown, handleKeyUp]);

  const handleReadyToggle = () => {
    if (!socket) return;

    const newReadyState = !isReady;
    setIsReady(newReadyState);
    socket.emit("player_ready", newReadyState);
  };

  const handleStartGame = () => {
    if (!socket) return;
    socket.emit("start_game");
  };

  const handlePauseGame = () => {
    if (!socket) return;
    socket.emit("pause_game");
  };

  const handleResumeGame = () => {
    if (!socket) return;
    socket.emit("resume_game");
  };

  const handleLeaveRoom = () => {
    if (socket) {
      socket.emit("leave_room");
    }
    onLeaveRoom();
  };

  return (
    <GameContainer>
      <MainGameArea>
        <GameWrapper
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          {gameState.players.map((player) => (
            <PlayerGameArea key={player.id} data-player-id={player.id}>
              <PlayerName>
                {player.name}
                {player.id === currentPlayer.id && " (You)"}
                {player.isGameOver && " - OUT"}
              </PlayerName>

              <GameLayoutContainer>
                <div style={{ position: "relative" }}>
                  {(gameState.gameState === GameState.PLAYING ||
                    gameState.gameState === GameState.PAUSED) &&
                    player.id === currentPlayer.id && (
                      <motion.button
                        onClick={
                          gameState.gameState === GameState.PAUSED
                            ? handleResumeGame
                            : handlePauseGame
                        }
                        style={{
                          position: "absolute",
                          top: "10px",
                          right: "10px",
                          width: "40px",
                          height: "40px",
                          borderRadius: "50%",
                          background: "rgba(0, 0, 0, 0.5)",
                          border: "2px solid rgba(255, 215, 0, 0.5)",
                          color: "#ffd700",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          zIndex: 100,
                          padding: 0,
                          fontSize: "18px",
                        }}
                        whileHover={{
                          scale: 1.1,
                          background: "rgba(0, 0, 0, 0.7)",
                        }}
                        whileTap={{ scale: 0.9 }}
                      >
                        {gameState.gameState === GameState.PAUSED ? "▶️" : "⏸️"}
                      </motion.button>
                    )}
                  <GameBoard
                    board={player.gameBoard}
                    currentPiece={player.currentPiece}
                    isCurrentPlayer={player.id === currentPlayer.id}
                    playerId={player.id}
                  />
                </div>

                {/* Only show side components for the current player */}
                {player.id === currentPlayer.id && (
                  <SideComponents>
                    <HoldPiece
                      piece={player.holdPiece}
                      canHold={player.canHold}
                    />
                    <NextPiece piece={player.nextPiece} />
                    <GameStats
                      score={player.score}
                      level={player.level}
                      lines={player.lines}
                      dropInterval={room?.dropInterval}
                    />
                    <Controls />
                  </SideComponents>
                )}
              </GameLayoutContainer>
            </PlayerGameArea>
          ))}
        </GameWrapper>
      </MainGameArea>

      <Sidebar>
        <RoomInfo>
          <RoomCode>{gameState.code}</RoomCode>
          <div>
            Players: {gameState.players.length}/{gameState.maxPlayers}
          </div>
        </RoomInfo>

        {gameState.gameState === GameState.WAITING && (
          <>
            <ReadyButton
              className={isReady ? "ready" : "not-ready"}
              onClick={handleReadyToggle}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {isReady ? "Ready!" : "Not Ready"}
            </ReadyButton>

            {/* Show Start Game button for room creator when there are enough players */}
            {isRoomCreator && gameState.players.length >= 1 && (
              <ReadyButton
                className="ready"
                onClick={handleStartGame}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                style={{
                  background: "linear-gradient(45deg, #ffd700, #ffed4e)",
                  color: "#1a1a2e",
                  marginBottom: "10px",
                }}
              >
                🚀 Start Game
              </ReadyButton>
            )}

            {/* Show waiting message for non-creators */}
            {!isRoomCreator && gameState.players.length >= 1 && (
              <div
                style={{
                  padding: "12px",
                  background: "rgba(255, 255, 255, 0.1)",
                  borderRadius: "8px",
                  marginBottom: "15px",
                  textAlign: "center",
                  fontSize: "14px",
                  color: "#ffd700",
                }}
              >
                ⏳ Waiting for room creator to start the game
              </div>
            )}
          </>
        )}

        {/* Show ready state message */}
        {gameState.gameState === GameState.READY && (
          <div
            style={{
              padding: "12px",
              background: "rgba(76, 175, 80, 0.2)",
              borderRadius: "8px",
              marginBottom: "15px",
              textAlign: "center",
              fontSize: "14px",
              color: "#4caf50",
              border: "1px solid #4caf50",
            }}
          >
            🎮 Game starting soon...
          </div>
        )}

        {/* Show restart game button when game is finished */}
        {gameState.gameState === GameState.FINISHED && (
          <>
            <div
              style={{
                padding: "12px",
                background: "rgba(255, 255, 255, 0.1)",
                borderRadius: "8px",
                marginBottom: "15px",
                textAlign: "center",
                fontSize: "16px",
                color: "#ffd700",
                fontWeight: "bold",
              }}
            >
              🎯 Game Over!
            </div>

            {/* Show Start New Game button for room creator */}
            {isRoomCreator && (
              <ReadyButton
                className="ready"
                onClick={handleStartGame}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                style={{
                  background: "linear-gradient(45deg, #ffd700, #ffed4e)",
                  color: "#1a1a2e",
                  marginBottom: "10px",
                }}
              >
                🔄 Start New Game
              </ReadyButton>
            )}

            {/* Show waiting message for non-creators */}
            {!isRoomCreator && (
              <div
                style={{
                  padding: "12px",
                  background: "rgba(255, 255, 255, 0.1)",
                  borderRadius: "8px",
                  marginBottom: "15px",
                  textAlign: "center",
                  fontSize: "14px",
                  color: "#ffd700",
                }}
              >
                ⏳ Waiting for room creator to start a new game
              </div>
            )}
          </>
        )}

        <PlayerList
          players={gameState.players}
          currentPlayerId={currentPlayer.id}
        />

        <motion.button
          onClick={() => setShowSettings(true)}
          style={{
            width: "100%",
            padding: "12px",
            fontSize: "16px",
            fontWeight: "bold",
            border: "none",
            borderRadius: "8px",
            background: "linear-gradient(45deg, #4a90e2, #357abd)",
            color: "white",
            cursor: "pointer",
            marginTop: "20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
          }}
          whileHover={{
            scale: 1.05,
            background: "linear-gradient(45deg, #357abd, #2e6da4)",
          }}
          whileTap={{ scale: 0.95 }}
        >
          ⚙️ Settings
        </motion.button>

        <motion.button
          onClick={handleLeaveRoom}
          style={{
            width: "100%",
            padding: "12px",
            fontSize: "16px",
            fontWeight: "bold",
            border: "none",
            borderRadius: "8px",
            background: "#666",
            color: "white",
            cursor: "pointer",
            marginTop: "10px",
          }}
          whileHover={{ scale: 1.05, background: "#777" }}
          whileTap={{ scale: 0.95 }}
        >
          Leave Room
        </motion.button>
      </Sidebar>

      <AnimatePresence>
        {showMessage && (
          <GameMessage
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.3 }}
          >
            {showMessage}
          </GameMessage>
        )}
      </AnimatePresence>

      {/* Touch controls for mobile */}
      <TouchControls onAction={handleAction} isCurrentPlayer={true} />

      {/* Fireball animations */}
      {activeFireballs.map((fireball) => (
        <FireballAnimation
          key={fireball.id}
          isVisible={true}
          fromPosition={fireball.fromPosition}
          toPosition={fireball.toPosition}
          playerName={fireball.playerName}
          onComplete={() => handleFireballComplete(fireball.id)}
        />
      ))}

      {/* Settings Dialog */}
      <SettingsDialog
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </GameContainer>
  );
};

// Container component that handles room joining
export { TetrisGame };
