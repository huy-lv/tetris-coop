import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import type { TetrisPiece } from '../types';
import { BOARD_COLORS } from '../types';

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

const Cell = styled(motion.div)<{ cellValue: number; isCurrentPlayer: boolean }>`
  width: 25px;
  height: 25px;
  border-radius: 2px;
  background-color: ${props => BOARD_COLORS[props.cellValue]};
  border: ${props => props.cellValue > 0 ? '1px solid rgba(255, 255, 255, 0.2)' : 'none'};
  opacity: ${props => props.isCurrentPlayer ? 1 : 0.7};
  
  ${props => props.cellValue > 0 && `
    box-shadow: inset 0 0 10px rgba(255, 255, 255, 0.1);
  `}
`;


interface GameBoardProps {
  board: number[][];
  currentPiece?: TetrisPiece;
  isCurrentPlayer: boolean;
}

const GameBoard: React.FC<GameBoardProps> = ({ board, currentPiece, isCurrentPlayer }) => {
  // Create a copy of the board to render with the current piece
  const renderBoard = React.useMemo(() => {
    const newBoard = board.map(row => [...row]);
    
    // Add current piece to the board for rendering
    if (currentPiece && isCurrentPlayer) {
      const { x, y, shape } = currentPiece;
      
      for (let row = 0; row < shape.length; row++) {
        for (let col = 0; col < shape[row].length; col++) {
          if (shape[row][col]) {
            const boardRow = y + row;
            const boardCol = x + col;
            
            if (boardRow >= 0 && boardRow < 20 && boardCol >= 0 && boardCol < 10) {
              // Use a special value for current piece (8) to distinguish from placed pieces
              newBoard[boardRow][boardCol] = 8;
            }
          }
        }
      }
    }
    
    return newBoard;
  }, [board, currentPiece, isCurrentPlayer]);

  return (
    <BoardContainer>
      <Board>
        {renderBoard.map((row, rowIndex) =>
          row.map((cell, colIndex) => (
            <Cell
              key={`${rowIndex}-${colIndex}`}
              cellValue={cell}
              isCurrentPlayer={isCurrentPlayer}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: (rowIndex + colIndex) * 0.01 }}
              whileHover={isCurrentPlayer ? { scale: 1.1 } : {}}
            />
          ))
        )}
      </Board>
    </BoardContainer>
  );
};

export default GameBoard;
