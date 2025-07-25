import React from "react";
import styled from "styled-components";
import { GAME_CONTROLS, CONTROL_DESCRIPTIONS } from "../constants/gameControls";

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
          <KeyBadge>{GAME_CONTROLS.MOVE_LEFT.toUpperCase()}</KeyBadge>
          <ActionText>
            {CONTROL_DESCRIPTIONS[GAME_CONTROLS.MOVE_LEFT]}
          </ActionText>
        </ControlItem>
        <ControlItem>
          <KeyBadge>{GAME_CONTROLS.MOVE_RIGHT.toUpperCase()}</KeyBadge>
          <ActionText>
            {CONTROL_DESCRIPTIONS[GAME_CONTROLS.MOVE_RIGHT]}
          </ActionText>
        </ControlItem>
        <ControlItem>
          <KeyBadge>{GAME_CONTROLS.SOFT_DROP.toUpperCase()}</KeyBadge>
          <ActionText>
            {CONTROL_DESCRIPTIONS[GAME_CONTROLS.SOFT_DROP]}
          </ActionText>
        </ControlItem>
        <ControlItem>
          <KeyBadge>{GAME_CONTROLS.ROTATE.toUpperCase()}</KeyBadge>
          <ActionText>{CONTROL_DESCRIPTIONS[GAME_CONTROLS.ROTATE]}</ActionText>
        </ControlItem>
        <ControlItem>
          <KeyBadge>{GAME_CONTROLS.HARD_DROP.toUpperCase()}</KeyBadge>
          <ActionText>
            {CONTROL_DESCRIPTIONS[GAME_CONTROLS.HARD_DROP]}
          </ActionText>
        </ControlItem>
      </ControlsList>
    </ControlsContainer>
  );
};

export default Controls;
