import React from "react";
import styled from "styled-components";
import { motion, AnimatePresence } from "framer-motion";

const FireballContainer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  overflow: hidden;
`;

const Fireball = styled(motion.div)`
  position: absolute;
  width: 40px;
  height: 40px;
  background: radial-gradient(
    circle,
    #ffff00 0%,
    #ff6600 25%,
    #ff3300 50%,
    #cc0000 75%,
    rgba(204, 0, 0, 0.3) 100%
  );
  border-radius: 50%;
  box-shadow: 0 0 30px #ff3300, 0 0 60px #ff6600, 0 0 90px #ffaa00,
    inset 0 0 20px rgba(255, 255, 0, 0.8);

  &::before {
    content: "";
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 30px;
    height: 30px;
    background: radial-gradient(
      circle,
      #ffffff 0%,
      #ffff00 30%,
      #ff6600 70%,
      transparent 100%
    );
    border-radius: 50%;
    animation: fireCore 0.1s ease-in-out infinite alternate;
  }

  @keyframes fireCore {
    0% {
      opacity: 0.9;
      transform: translate(-50%, -50%) scale(0.9);
    }
    100% {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1.1);
    }
  }
`;

const ImpactEffect = styled(motion.div)`
  position: absolute;
  width: 80px;
  height: 80px;
  background: radial-gradient(
    circle,
    rgba(255, 255, 255, 0.9) 0%,
    rgba(255, 255, 0, 0.7) 20%,
    rgba(255, 102, 0, 0.5) 40%,
    rgba(255, 51, 0, 0.3) 70%,
    transparent 100%
  );
  border-radius: 50%;
  filter: blur(2px);
`;

interface FireballAnimationProps {
  isVisible: boolean;
  fromPosition: { x: number; y: number };
  toPosition: { x: number; y: number };
  onComplete: () => void;
  playerName: string;
}

const FireballAnimation: React.FC<FireballAnimationProps> = ({
  isVisible,
  fromPosition,
  toPosition,
  onComplete,
  playerName,
}) => {
  const [showImpact, setShowImpact] = React.useState(false);
  const duration = 0.6; // Faster animation duration

  const handleFireballComplete = () => {
    // Show impact effect
    setShowImpact(true);
    // Hide impact and call completion after a short delay
    setTimeout(() => {
      setShowImpact(false);
      onComplete();
    }, 300);
  };

  const fireballVariants = {
    initial: {
      x: fromPosition.x,
      y: fromPosition.y,
      scale: 0,
      opacity: 0,
    },
    animate: {
      x: toPosition.x,
      y: toPosition.y,
      scale: [0, 1.2, 1],
      opacity: [0, 1, 1],
      transition: {
        duration: duration,
        ease: "easeOut" as const,
        times: [0, 0.3, 1],
      },
    },
    exit: {
      scale: 0,
      opacity: 0,
      transition: {
        duration: 0.1,
      },
    },
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <FireballContainer>
          {/* Main fireball */}
          <Fireball
            variants={fireballVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            onAnimationComplete={handleFireballComplete}
          />

          {/* Impact effect */}
          {showImpact && (
            <ImpactEffect
              initial={{ scale: 0, opacity: 1 }}
              animate={{ scale: 2, opacity: 0 }}
              style={{
                left: toPosition.x - 40,
                top: toPosition.y - 40,
              }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            />
          )}

          {/* Player name label */}
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.8 }}
            animate={{
              opacity: [0, 1, 1, 0],
              y: [0, -10, -20, -30],
              scale: [0.8, 1.2, 1, 0.8],
            }}
            style={{
              position: "absolute",
              left: fromPosition.x - 50,
              top: fromPosition.y - 50,
              color: "#ffd700",
              fontSize: "16px",
              fontWeight: "bold",
              textShadow:
                "2px 2px 4px rgba(0,0,0,0.8), 0 0 10px rgba(255,215,0,0.8)",
              pointerEvents: "none",
              textAlign: "center",
              width: "100px",
              zIndex: 1000,
            }}
            transition={{
              duration: 1,
              times: [0, 0.3, 0.7, 1],
              ease: "easeOut",
            }}
          >
            🔥 {playerName}
          </motion.div>
        </FireballContainer>
      )}
    </AnimatePresence>
  );
};

export default FireballAnimation;
