import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';

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
}

const GameStats: React.FC<GameStatsProps> = ({ score, level, lines }) => {
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
    </StatsContainer>
  );
};

export default GameStats;
