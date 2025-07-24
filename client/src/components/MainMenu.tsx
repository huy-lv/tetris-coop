import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';

const MenuContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  color: white;
  font-family: 'Arial', sans-serif;
`;

const MenuCard = styled(motion.div)`
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  padding: 40px;
  box-shadow: 0 0 30px rgba(255, 215, 0, 0.3);
  border: 2px solid rgba(255, 215, 0, 0.3);
  max-width: 400px;
  width: 100%;
`;

const Title = styled.h1`
  text-align: center;
  font-size: 48px;
  margin-bottom: 40px;
  background: linear-gradient(45deg, #ffd700, #ffed4e);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
`;

const InputGroup = styled.div`
  margin-bottom: 20px;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 8px;
  font-weight: bold;
  color: #ffd700;
`;

const Input = styled.input`
  width: 100%;
  padding: 12px;
  border: 2px solid rgba(255, 215, 0, 0.3);
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.3);
  color: white;
  font-size: 16px;
  transition: border-color 0.3s;
  
  &:focus {
    outline: none;
    border-color: #ffd700;
    box-shadow: 0 0 10px rgba(255, 215, 0, 0.3);
  }
  
  &::placeholder {
    color: rgba(255, 255, 255, 0.5);
  }
`;

const Button = styled(motion.button)`
  width: 100%;
  padding: 15px;
  margin-bottom: 15px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
  
  &.primary {
    background: linear-gradient(45deg, #ffd700, #ffed4e);
    color: #1a1a2e;
  }
  
  &.secondary {
    background: rgba(255, 255, 255, 0.1);
    color: white;
    border: 2px solid rgba(255, 215, 0, 0.3);
  }
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(255, 215, 0, 0.3);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
`;

const Divider = styled.div`
  text-align: center;
  margin: 30px 0;
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 0;
    right: 0;
    height: 1px;
    background: rgba(255, 215, 0, 0.3);
  }
  
  span {
    background: rgba(255, 255, 255, 0.1);
    padding: 0 20px;
    color: #ffd700;
    font-weight: bold;
  }
`;

const ErrorMessage = styled(motion.div)`
  background: rgba(244, 67, 54, 0.2);
  border: 1px solid #f44336;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 20px;
  color: #f44336;
  text-align: center;
  font-weight: bold;
`;

interface MainMenuProps {
  onCreateRoom: (playerName: string) => void;
  onJoinRoom: (roomCode: string, playerName: string) => void;
}

const MainMenu: React.FC<MainMenuProps> = ({ onCreateRoom, onJoinRoom }) => {
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Load saved player name from localStorage on component mount
  useEffect(() => {
    const savedPlayerName = localStorage.getItem('tetris_player_name');
    if (savedPlayerName) {
      setPlayerName(savedPlayerName);
      console.log('MainMenu: Restored player name from localStorage:', savedPlayerName);
    }
  }, []);
  
  // Save player name to localStorage whenever it changes
  const handlePlayerNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setPlayerName(newName);
    
    // Save to localStorage (only if not empty)
    if (newName.trim()) {
      localStorage.setItem('tetris_player_name', newName.trim());
      console.log('MainMenu: Saved player name to localStorage:', newName.trim());
    } else {
      // Clear localStorage if name is empty
      localStorage.removeItem('tetris_player_name');
      console.log('MainMenu: Cleared player name from localStorage');
    }
  };

  const handleCreateRoom = async () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }

    setIsLoading(true);
    setError('');
    
    try {
      await onCreateRoom(playerName.trim());
    } catch (err) {
      setError('Failed to create room. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }
    
    if (!roomCode.trim()) {
      setError('Please enter room code');
      return;
    }

    setIsLoading(true);
    setError('');
    
    try {
      await onJoinRoom(roomCode.trim().toUpperCase(), playerName.trim());
    } catch (err) {
      setError('Failed to join room. Please check the room code.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <MenuContainer>
      <MenuCard
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Title>TETRIS</Title>
        
        {error && (
          <ErrorMessage
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {error}
          </ErrorMessage>
        )}
        
        <InputGroup>
          <Label htmlFor="playerName">Your Name</Label>
          <Input
            id="playerName"
            type="text"
            placeholder="Enter your name"
            value={playerName}
            onChange={handlePlayerNameChange}
            maxLength={20}
          />
        </InputGroup>

        <Button
          className="primary"
          onClick={handleCreateRoom}
          disabled={isLoading}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {isLoading ? 'Creating...' : 'Create Room'}
        </Button>

        <Divider>
          <span>OR</span>
        </Divider>

        <InputGroup>
          <Label htmlFor="roomCode">Room Code</Label>
          <Input
            id="roomCode"
            type="text"
            placeholder="Enter room code"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            maxLength={6}
            style={{ textTransform: 'uppercase' }}
          />
        </InputGroup>

        <Button
          className="secondary"
          onClick={handleJoinRoom}
          disabled={isLoading}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {isLoading ? 'Joining...' : 'Join Room'}
        </Button>
      </MenuCard>
    </MenuContainer>
  );
};

export default MainMenu;
