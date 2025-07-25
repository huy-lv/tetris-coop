import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import type { TetrisPiece } from "../types";
import { BOARD_COLORS } from "../types";
import { useSocket } from "../hooks/useSocket";

const BoardContainer = styled.div`
  border: 3px solid #ffd700;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.5);
  padding: 5px;
  box-shadow: 0 0 20px rgba(255, 215, 0, 0.3);
  display: inline-block;
`;

const Board = styled.div`
  display: grid;
  grid-template-columns: repeat(10, 25px);
  grid-template-rows: repeat(20, 25px);
  gap: 1px;
  background: #111;
  border-radius: 4px;
  width: fit-content;
  height: fit-content;
`;

const Cell = styled(motion.div)<{
  cellValue: number;
  isCurrentPlayer: boolean;
  isCurrentPiece?: boolean;
  isGhostPiece?: boolean;
  isClearing?: boolean;
  clearingDelay?: number;
}>`
  width: 25px;
  height: 25px;
  border-radius: 2px;
  background-color: ${(props) => BOARD_COLORS[props.cellValue]};
  border: ${(props) =>
    props.cellValue > 0 ? "1px solid rgba(255, 255, 255, 0.2)" : "none"};
  opacity: ${(props) => (props.isCurrentPlayer ? 1 : 0.7)};

  ${(props) =>
    props.cellValue > 0 &&
    `
    box-shadow: inset 0 0 10px rgba(255, 255, 255, 0.1);
  `}

  ${(props) =>
    props.isCurrentPiece &&
    `
    box-shadow: 0 0 15px rgba(255, 255, 255, 0.6), inset 0 0 10px rgba(255, 255, 255, 0.2);
    animation: pulse 1.5s ease-in-out infinite alternate;
  `}

  ${(props) =>
    props.isGhostPiece &&
    `
    background-color: rgba(128, 128, 128) !important;
    border: 1px solid rgba(128, 128, 128, 0.6);
    opacity: 0.6;
    box-shadow: none;
  `}
  
  ${(props) =>
    props.isClearing &&
    `
    animation: clearExpand 0.6s ease-out forwards;
    animation-delay: ${props.clearingDelay || 0}ms;
  `}
  
  @keyframes pulse {
    from {
      box-shadow: 0 0 15px rgba(255, 255, 255, 0.6),
        inset 0 0 10px rgba(255, 255, 255, 0.2);
    }
    to {
      box-shadow: 0 0 25px rgba(255, 255, 255, 0.8),
        inset 0 0 15px rgba(255, 255, 255, 0.3);
    }
  }

  @keyframes clearExpand {
    0% {
      background-color: ${(props) => BOARD_COLORS[props.cellValue]};
      transform: scale(1);
      box-shadow: inset 0 0 10px rgba(255, 255, 255, 0.1);
    }
    20% {
      background-color: #ff6b6b;
      transform: scale(1.2);
      box-shadow: 0 0 20px rgba(255, 107, 107, 0.8);
    }
    40% {
      background-color: #ffd93d;
      transform: scale(1.3);
      box-shadow: 0 0 25px rgba(255, 217, 61, 1);
    }
    70% {
      background-color: #ffffff;
      transform: scale(1.4);
      box-shadow: 0 0 35px rgba(255, 255, 255, 1);
    }
    100% {
      background-color: transparent;
      transform: scale(0);
      box-shadow: 0 0 50px rgba(255, 255, 255, 0);
      opacity: 0;
    }
  }
`;

interface GameBoardProps {
  board: number[][];
  currentPiece?: TetrisPiece;
  isCurrentPlayer: boolean;
  playerId: string;
}

const GameBoard: React.FC<GameBoardProps> = ({
  board,
  currentPiece,
  isCurrentPlayer,
  playerId,
}) => {
  const { socket } = useSocket();
  const [clearingRows, setClearingRows] = useState<Set<number>>(new Set());
  const [dropPosition, setDropPosition] = useState<number>(5);

  // Listen for line clear events
  useEffect(() => {
    if (!socket) return;

    const handleLinesClearing = (data: {
      playerId: string;
      clearedRows: number[];
      dropX: number;
    }) => {
      if (data.playerId === playerId) {
        // Start the clearing animation
        setClearingRows(new Set(data.clearedRows));
        setDropPosition(data.dropX);
      }
    };

    const handleLinesCleared = (data: {
      playerId: string;
      clearedRows: number[];
      dropX: number;
    }) => {
      if (data.playerId === playerId) {
        // Clear the animation after board has been updated
        setTimeout(() => {
          setClearingRows(new Set());
        }, 50); // Small delay to ensure board state is updated
      }
    };

    socket.on("lines_clearing", handleLinesClearing);
    socket.on("lines_cleared", handleLinesCleared);

    return () => {
      socket.off("lines_clearing", handleLinesClearing);
      socket.off("lines_cleared", handleLinesCleared);
    };
  }, [socket, playerId]);

  // Helper function to check if a position is valid (client-side validation)
  const isValidPosition = (
    board: number[][],
    piece: TetrisPiece,
    testX?: number,
    testY?: number
  ): boolean => {
    const x = testX !== undefined ? testX : piece.x;
    const y = testY !== undefined ? testY : piece.y;
    const shape = piece.shape;

    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (shape[row][col]) {
          const newRow = y + row;
          const newCol = x + col;

          if (newRow < 0 || newRow >= 20 || newCol < 0 || newCol >= 10) {
            return false;
          }

          if (board[newRow][newCol]) {
            return false;
          }
        }
      }
    }

    return true;
  };

  // Calculate ghost piece position
  const calculateGhostPiece = React.useCallback(
    (board: number[][], piece: TetrisPiece): TetrisPiece | null => {
      if (!piece) return null;

      const ghostPiece = {
        ...piece,
        y: piece.y,
      };

      // Drop the ghost piece to the lowest valid position
      while (isValidPosition(board, ghostPiece, undefined, ghostPiece.y + 1)) {
        ghostPiece.y++;
      }

      // Only show ghost if it's different from current position
      return ghostPiece.y !== piece.y ? ghostPiece : null;
    },
    []
  );

  // Create a copy of the board to render with the current piece and ghost piece
  const { renderBoard, currentPiecePositions, ghostPiecePositions } =
    React.useMemo(() => {
      const newBoard = board.map((row) => [...row]);
      const piecePositions = new Set<string>();
      const ghostPositions = new Set<string>();

      // Calculate and add ghost piece first (so it appears behind the current piece)
      if (currentPiece && isCurrentPlayer) {
        const ghostPiece = calculateGhostPiece(board, currentPiece);

        if (ghostPiece) {
          const { x, y, shape } = ghostPiece;

          for (let row = 0; row < shape.length; row++) {
            for (let col = 0; col < shape[row].length; col++) {
              if (shape[row][col]) {
                const boardRow = y + row;
                const boardCol = x + col;

                if (
                  boardRow >= 0 &&
                  boardRow < 20 &&
                  boardCol >= 0 &&
                  boardCol < 10
                ) {
                  ghostPositions.add(`${boardRow}-${boardCol}`);
                }
              }
            }
          }
        }
      }

      // Add current piece to the board for rendering
      if (currentPiece && isCurrentPlayer) {
        const { x, y, shape, type } = currentPiece;

        // Map piece type to color index
        const pieceColorIndex = (() => {
          switch (type) {
            case "I":
              return 1;
            case "O":
              return 2;
            case "T":
              return 3;
            case "S":
              return 4;
            case "Z":
              return 5;
            case "J":
              return 6;
            case "L":
              return 7;
            default:
              return 8; // fallback to white
          }
        })();

        for (let row = 0; row < shape.length; row++) {
          for (let col = 0; col < shape[row].length; col++) {
            if (shape[row][col]) {
              const boardRow = y + row;
              const boardCol = x + col;

              if (
                boardRow >= 0 &&
                boardRow < 20 &&
                boardCol >= 0 &&
                boardCol < 10
              ) {
                // Use the piece-specific color index instead of generic 8
                newBoard[boardRow][boardCol] = pieceColorIndex;
                // Track positions of current piece
                piecePositions.add(`${boardRow}-${boardCol}`);
              }
            }
          }
        }
      }

      return {
        renderBoard: newBoard,
        currentPiecePositions: piecePositions,
        ghostPiecePositions: ghostPositions,
      };
    }, [board, currentPiece, isCurrentPlayer, calculateGhostPiece]);

  return (
    <BoardContainer>
      <Board>
        {renderBoard.map((row, rowIndex) =>
          row.map((cell, colIndex) => {
            const cellKey = `${rowIndex}-${colIndex}`;
            const isCurrentPiece = currentPiecePositions.has(cellKey);
            const isGhostPiece =
              !isCurrentPiece && ghostPiecePositions.has(cellKey);
            const isClearing = clearingRows.has(rowIndex);

            // Calculate animation delay based on distance from drop point
            const distanceFromDrop = Math.abs(colIndex - dropPosition);
            const clearingDelay = isClearing ? distanceFromDrop * 20 : 0; // 20ms per column

            return (
              <Cell
                key={cellKey}
                cellValue={cell}
                isCurrentPlayer={isCurrentPlayer}
                isCurrentPiece={isCurrentPiece}
                isGhostPiece={isGhostPiece}
                isClearing={isClearing}
                clearingDelay={clearingDelay}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: (rowIndex + colIndex) * 0.01 }}
                whileHover={isCurrentPlayer ? { scale: 1.1 } : {}}
              />
            );
          })
        )}
      </Board>
    </BoardContainer>
  );
};

export default GameBoard;
