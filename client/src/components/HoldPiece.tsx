import React from "react";
import styled from "styled-components";
import type { TetrisPiece } from "../types";
import { BOARD_COLORS } from "../types";

const HoldContainer = styled.div`
  border: 2px solid #ffd700;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.7);
  padding: 10px;
  width: 80px;
  height: 80px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  @media (max-width: 768px) {
    width: 70px;
    height: 70px;
    padding: 8px;
  }
`;

const HoldTitle = styled.div`
  color: #ffd700;
  font-size: 12px;
  font-weight: bold;
  margin-bottom: 5px;
  text-align: center;

  @media (max-width: 768px) {
    font-size: 10px;
    margin-bottom: 3px;
  }
`;

const PiecePreview = styled.div<{ isDisabled?: boolean }>`
  display: grid;
  gap: 1px;
  opacity: ${(props) => (props.isDisabled ? 0.4 : 1)};
`;

const PreviewCell = styled.div<{ cellValue: number }>`
  width: 12px;
  height: 12px;
  border-radius: 1px;
  background-color: ${(props) => BOARD_COLORS[props.cellValue]};
  border: ${(props) =>
    props.cellValue > 0 ? "1px solid rgba(255, 255, 255, 0.3)" : "none"};
`;

interface HoldPieceProps {
  piece?: TetrisPiece;
  canHold: boolean;
}

const HoldPiece: React.FC<HoldPieceProps> = ({ piece, canHold }) => {
  const renderPiece = () => {
    if (!piece) {
      return (
        <div style={{ color: "#666", fontSize: "10px", textAlign: "center" }}>
          Empty
        </div>
      );
    }

    const { shape, type } = piece;

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

    return (
      <PiecePreview
        isDisabled={!canHold}
        style={{
          gridTemplateColumns: `repeat(${shape[0].length}, 12px)`,
        }}
      >
        {shape.map((row, rowIndex) =>
          row.map((cell, colIndex) => (
            <PreviewCell
              key={`${rowIndex}-${colIndex}`}
              cellValue={cell ? pieceColorIndex : 0}
            />
          ))
        )}
      </PiecePreview>
    );
  };

  return (
    <HoldContainer>
      <HoldTitle>HOLD</HoldTitle>
      {renderPiece()}
    </HoldContainer>
  );
};

export default HoldPiece;
