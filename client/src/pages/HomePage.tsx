import { useNavigate } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import MainMenu from '../components/MainMenu';

const HomePage = () => {
  const navigate = useNavigate();
  const { socket } = useSocket();


  const handleCreateRoom = async (playerName: string) => {
    if (!socket) {
      throw new Error('Socket not connected');
    }
    
    return new Promise<void>((resolve, reject) => {
      socket.emit('create_room', playerName, (response) => {
        if (response.success && response.roomCode) {
          console.log('HomePage: Room created successfully:', response.roomCode);
          navigate(`/room?id=${response.roomCode}`);
          resolve();
        } else {
          console.error('HomePage: Room creation error:', response.error);
          reject(new Error(response.error || 'Failed to create room'));
        }
      });
    });
  };

  const handleJoinRoom = async (roomCode: string, playerName: string) => {
    if (!socket) {
      throw new Error('Socket not connected');
    }
    
    return new Promise<void>((resolve, reject) => {
      socket.emit('join_room', roomCode, playerName, (response) => {
        if (response.success) {
          console.log('HomePage: Room joined successfully:', roomCode);
          navigate(`/room?id=${roomCode}`);
          resolve();
        } else {
          console.error('HomePage: Room join error:', response.error);
          reject(new Error(response.error || 'Failed to join room'));
        }
      });
    });
  };

  return (
    <MainMenu 
      onCreateRoom={handleCreateRoom}
      onJoinRoom={handleJoinRoom}
    />
  );
};

export default HomePage;

