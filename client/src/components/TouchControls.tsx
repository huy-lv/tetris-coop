import React, { useCallback } from "react";
import styled from "styled-components";
import { motion } from "framer-motion";

interface TouchControlsProps {
  onAction: (action: string) => void;
  isCurrentPlayer: boolean;
}

const TouchControlsContainer = styled.div`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.8);
  padding: 2vw;
  display: none;
  z-index: 1000;

  @media (max-width: 768px) {
    display: block;
  }
`;

const ControlsGrid = styled.div`
  display: grid;
  grid-template-columns: 3fr 1fr;
  gap: 2vw;
  max-width: 100%;
  margin: 0 auto;
`;

const LeftControls = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 1.5vw;
  height: 48vw;
`;

const RightControls = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1vw;
  height: 48vw;
`;

const TouchButton = styled(motion.button)<{
  variant?: "primary" | "secondary";
}>`
  background: ${(props) =>
    props.variant === "primary" ? "#ffd700" : "rgba(255, 255, 255, 0.2)"};
  color: ${(props) => (props.variant === "primary" ? "#000" : "#fff")};
  border: 2px solid
    ${(props) =>
      props.variant === "primary" ? "#ffd700" : "rgba(255, 255, 255, 0.3)"};
  border-radius: 1.5vw;
  padding: 1.5vw;
  font-size: 2vw;
  font-weight: bold;
  cursor: pointer;
  user-select: none;
  transition: all 0.2s ease;
  min-height: 8vw;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;

  &:active {
    transform: scale(0.95);
    background: ${(props) =>
      props.variant === "primary" ? "#e6c200" : "rgba(255, 255, 255, 0.3)"};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const DirectionButton = styled(TouchButton)`
  font-size: 2.5vw;
  min-height: 8vw;
  width: 100%;
  height: 100%;
`;

const ActionButton = styled(TouchButton)`
  font-size: 1.8vw;
  min-height: 8vw;
  flex: 1;
`;

const EmptyGridCell = styled.div`
  /* Invisible placeholder to maintain grid structure */
`;

const TouchControls: React.FC<TouchControlsProps> = ({
  onAction,
  isCurrentPlayer,
}) => {
  const handleTouchStart = useCallback(
    (action: string) => {
      if (!isCurrentPlayer) return;
      onAction(action);
    },
    [onAction, isCurrentPlayer]
  );

  // Prevent default touch behavior to avoid scrolling
  const handleTouchEvent = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
  }, []);

  return (
    <TouchControlsContainer>
      <ControlsGrid>
        <LeftControls>
          <EmptyGridCell />
          <DirectionButton
            variant="primary"
            onTouchStart={() => handleTouchStart("MOVE_UP")}
            onTouchEnd={handleTouchEvent}
            disabled={!isCurrentPlayer}
            whileTap={{ scale: 0.9 }}
          >
            ↑<br />
            ROTATE
          </DirectionButton>
          <EmptyGridCell />

          <DirectionButton
            variant="primary"
            onTouchStart={() => handleTouchStart("MOVE_LEFT")}
            onTouchEnd={handleTouchEvent}
            disabled={!isCurrentPlayer}
            whileTap={{ scale: 0.9 }}
          >
            ← LEFT
          </DirectionButton>
          <DirectionButton
            variant="primary"
            onTouchStart={() => handleTouchStart("SOFT_DROP")}
            onTouchEnd={handleTouchEvent}
            disabled={!isCurrentPlayer}
            whileTap={{ scale: 0.9 }}
          >
            ↓ DOWN
          </DirectionButton>
          <DirectionButton
            variant="primary"
            onTouchStart={() => handleTouchStart("MOVE_RIGHT")}
            onTouchEnd={handleTouchEvent}
            disabled={!isCurrentPlayer}
            whileTap={{ scale: 0.9 }}
          >
            RIGHT →
          </DirectionButton>
        </LeftControls>

        <RightControls>
          <ActionButton
            variant="secondary"
            onTouchStart={() => handleTouchStart("ROTATE")}
            onTouchEnd={handleTouchEvent}
            disabled={!isCurrentPlayer}
            whileTap={{ scale: 0.9 }}
          >
            ROTATE
            <br />
            (N)
          </ActionButton>
          <ActionButton
            variant="secondary"
            onTouchStart={() => handleTouchStart("HOLD")}
            onTouchEnd={handleTouchEvent}
            disabled={!isCurrentPlayer}
            whileTap={{ scale: 0.9 }}
          >
            HOLD
            <br />
            (B)
          </ActionButton>
          <ActionButton
            variant="secondary"
            onTouchStart={() => handleTouchStart("HARD_DROP")}
            onTouchEnd={handleTouchEvent}
            disabled={!isCurrentPlayer}
            whileTap={{ scale: 0.9 }}
          >
            DROP
            <br />
            (J)
          </ActionButton>
        </RightControls>
      </ControlsGrid>
    </TouchControlsContainer>
  );
};

export default TouchControls;
