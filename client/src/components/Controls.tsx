import React from "react";
import styled from "styled-components";

const ControlsContainer = styled.div`
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 15px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 215, 0, 0.3);
`;

const ControlsTitle = styled.div`
  font-size: 16px;
  font-weight: bold;
  color: #ffd700;
  margin-bottom: 10px;
  text-align: center;
`;

const ControlsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const ControlItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: white;
`;

const KeyBadge = styled.span`
  background: rgba(255, 215, 0, 0.2);
  border: 1px solid rgba(255, 215, 0, 0.5);
  border-radius: 4px;
  padding: 2px 6px;
  font-family: monospace;
  font-weight: bold;
  color: #ffd700;
  min-width: 24px;
  text-align: center;
`;

const ActionText = styled.span`
  color: rgba(255, 255, 255, 0.9);
`;

const Controls: React.FC = () => {
  return (
    <ControlsContainer>
      <ControlsTitle>🎮 Controls</ControlsTitle>
      <ControlsList>
        <ControlItem>
          <KeyBadge>A</KeyBadge>
          <ActionText>Move Left</ActionText>
        </ControlItem>
        <ControlItem>
          <KeyBadge>D</KeyBadge>
          <ActionText>Move Right</ActionText>
        </ControlItem>
        <ControlItem>
          <KeyBadge>S</KeyBadge>
          <ActionText>Soft Drop</ActionText>
        </ControlItem>
        <ControlItem>
          <KeyBadge>N</KeyBadge>
          <ActionText>Rotate</ActionText>
        </ControlItem>
        <ControlItem>
          <KeyBadge>J</KeyBadge>
          <ActionText>Hard Drop</ActionText>
        </ControlItem>
      </ControlsList>
    </ControlsContainer>
  );
};

export default Controls;
