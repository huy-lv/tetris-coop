import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import type { TetrisPiece } from '../types';
import { TETROMINO_COLORS } from '../types';

const NextPieceContainer = styled.div`
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 15px;
  min-width: 100px;
  text-align: center;
`;

const Title = styled.div`
  font-size: 14px;
  font-weight: bold;
  margin-bottom: 10px;
  color: #ffd700;
`;

const PieceGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 20px);
  grid-template-rows: repeat(4, 20px);
  gap: 1px;
  justify-content: center;
`;

const PieceCell = styled(motion.div)<{ hasBlock: boolean; pieceType?: string }>`
  width: 20px;
  height: 20px;
  border-radius: 2px;
  background-color: ${props => 
    props.hasBlock && props.pieceType ? TETROMINO_COLORS[props.pieceType as keyof typeof TETROMINO_COLORS] : 'transparent'
  };
  border: ${props => props.hasBlock ? '1px solid rgba(255, 255, 255, 0.2)' : 'none'};
  
  ${props => props.hasBlock && `
    box-shadow: inset 0 0 5px rgba(255, 255, 255, 0.1);
  `}
`;

interface NextPieceProps {
  piece?: TetrisPiece;
}

const NextPiece: React.FC<NextPieceProps> = ({ piece }) => {
  const renderGrid = () => {
    if (!piece) {
      return Array.from({ length: 16 }, (_, index) => (
        <PieceCell key={index} hasBlock={false} />
      ));
    }

    const grid = Array(4).fill(null).map(() => Array(4).fill(false));
    
    // Center the piece in the 4x4 grid
    const offsetX = Math.floor((4 - piece.shape[0].length) / 2);
    const offsetY = Math.floor((4 - piece.shape.length) / 2);
    
    for (let row = 0; row < piece.shape.length; row++) {
      for (let col = 0; col < piece.shape[row].length; col++) {
        if (piece.shape[row][col]) {
          const gridRow = row + offsetY;
          const gridCol = col + offsetX;
          if (gridRow >= 0 && gridRow < 4 && gridCol >= 0 && gridCol < 4) {
            grid[gridRow][gridCol] = true;
          }
        }
      }
    }

    return grid.flat().map((hasBlock, index) => (
      <PieceCell
        key={index}
        hasBlock={hasBlock}
        pieceType={piece.type}
        initial={{ scale: 0 }}
        animate={{ scale: hasBlock ? 1 : 0 }}
        transition={{ duration: 0.2, delay: index * 0.02 }}
      />
    ));
  };

  return (
    <NextPieceContainer>
      <Title>Next</Title>
      <PieceGrid>
        {renderGrid()}
      </PieceGrid>
    </NextPieceContainer>
  );
};

export default NextPiece;
