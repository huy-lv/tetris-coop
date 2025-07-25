import React from "react";
import styled from "styled-components";
import { motion } from "framer-motion";

const StatsContainer = styled.div`
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 15px;
  min-width: 100px;
`;

const StatItem = styled(motion.div)`
  margin-bottom: 10px;
  text-align: center;

  &:last-child {
    margin-bottom: 0;
  }
`;

const StatLabel = styled.div`
  font-size: 12px;
  color: #ffd700;
  font-weight: bold;
`;

const StatValue = styled.div`
  font-size: 16px;
  color: white;
  font-weight: bold;
  margin-top: 2px;
`;

interface GameStatsProps {
  score: number;
  level: number;
  lines: number;
  dropInterval?: number; // Drop interval in milliseconds
}

const GameStats: React.FC<GameStatsProps> = ({
  score,
  level,
  lines,
  dropInterval,
}) => {
  // Calculate speed level based on drop interval (1000ms = level 1, 100ms = level 10)
  const getSpeedLevel = (interval?: number) => {
    if (!interval) return 1;
    return Math.max(1, Math.min(10, Math.round((1000 - interval) / 100) + 1));
  };

  const speedLevel = getSpeedLevel(dropInterval);

  return (
    <StatsContainer>
      <StatItem
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
      >
        <StatLabel>Score</StatLabel>
        <StatValue>{score.toLocaleString()}</StatValue>
      </StatItem>

      <StatItem
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <StatLabel>Level</StatLabel>
        <StatValue>{level}</StatValue>
      </StatItem>

      <StatItem
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <StatLabel>Lines</StatLabel>
        <StatValue>{lines}</StatValue>
      </StatItem>

      <StatItem
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
      >
        <StatLabel>Speed</StatLabel>
        <StatValue>{speedLevel}</StatValue>
      </StatItem>
    </StatsContainer>
  );
};

export default GameStats;
