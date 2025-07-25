import React from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import type { TetrisPiece } from "../types";
import { BOARD_COLORS } from "../types";

const BoardContainer = styled.div`
  border: 3px solid #ffd700;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.5);
  padding: 5px;
  box-shadow: 0 0 20px rgba(255, 215, 0, 0.3);
`;

const Board = styled.div`
  display: grid;
  grid-template-columns: repeat(10, 25px);
  grid-template-rows: repeat(20, 25px);
  gap: 1px;
  background: #111;
  border-radius: 4px;
`;

const Cell = styled(motion.div)<{
  cellValue: number;
  isCurrentPlayer: boolean;
  isCurrentPiece?: boolean;
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
`;

interface GameBoardProps {
  board: number[][];
  currentPiece?: TetrisPiece;
  isCurrentPlayer: boolean;
}

const GameBoard: React.FC<GameBoardProps> = ({
  board,
  currentPiece,
  isCurrentPlayer,
}) => {
  // Create a copy of the board to render with the current piece
  const { renderBoard, currentPiecePositions } = React.useMemo(() => {
    const newBoard = board.map((row) => [...row]);
    const piecePositions = new Set<string>();

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

    return { renderBoard: newBoard, currentPiecePositions: piecePositions };
  }, [board, currentPiece, isCurrentPlayer]);

  return (
    <BoardContainer>
      <Board>
        {renderBoard.map((row, rowIndex) =>
          row.map((cell, colIndex) => {
            const cellKey = `${rowIndex}-${colIndex}`;
            const isCurrentPiece = currentPiecePositions.has(cellKey);

            return (
              <Cell
                key={cellKey}
                cellValue={cell}
                isCurrentPlayer={isCurrentPlayer}
                isCurrentPiece={isCurrentPiece}
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
