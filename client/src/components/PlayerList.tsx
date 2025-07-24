import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import type { Player } from '../types';

const PlayerListContainer = styled.div`
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 20px;
`;

const Title = styled.div`
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 15px;
  color: #ffd700;
  text-align: center;
`;

const PlayerItem = styled(motion.div)<{ isCurrentPlayer: boolean }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  
  &:last-child {
    border-bottom: none;
  }
  
  ${props => props.isCurrentPlayer && `
    background: rgba(255, 215, 0, 0.1);
    border-radius: 4px;
    padding: 8px;
    margin: 0 -8px;
  `}
`;

const PlayerName = styled.div<{ isGameOver: boolean }>`
  font-weight: bold;
  color: ${props => props.isGameOver ? '#f44336' : 'white'};
  text-decoration: ${props => props.isGameOver ? 'line-through' : 'none'};
`;

const PlayerStatus = styled.div<{ isReady: boolean; isGameOver: boolean }>`
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 4px;
  font-weight: bold;
  
  ${props => {
    if (props.isGameOver) {
      return `
        background: #f44336;
        color: white;
      `;
    }
    
    if (props.isReady) {
      return `
        background: #4caf50;
        color: white;
      `;
    }
    
    return `
      background: #ff9800;
      color: white;
    `;
  }}
`;

interface PlayerListProps {
  players: Player[];
  currentPlayerId: string;
}

const PlayerList: React.FC<PlayerListProps> = ({ players, currentPlayerId }) => {
  console.log('PlayerList: Rendering with data', {
    playerCount: players.length,
    players: players.map(p => ({ name: p.name, id: p.id, isReady: p.isReady })),
    currentPlayerId
  });
  
  const getPlayerStatus = (player: Player) => {
    if (player.isGameOver) return 'OUT';
    if (player.isReady) return 'READY';
    return 'NOT READY';
  };

  return (
    <PlayerListContainer>
      <Title>Players</Title>
      {players.map((player, index) => (
        <PlayerItem
          key={player.id}
          isCurrentPlayer={player.id === currentPlayerId}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
        >
          <PlayerName isGameOver={player.isGameOver}>
            {player.name}
            {player.id === currentPlayerId && ' (You)'}
          </PlayerName>
          <PlayerStatus 
            isReady={player.isReady} 
            isGameOver={player.isGameOver}
          >
            {getPlayerStatus(player)}
          </PlayerStatus>
        </PlayerItem>
      ))}
    </PlayerListContainer>
  );
};

export default PlayerList;
