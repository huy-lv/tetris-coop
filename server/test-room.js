const io = require('socket.io-client');

const socket = io('http://localhost:3001');

socket.on('connect', () => {
  console.log('Connected to server');
  
  // Create a room
  socket.emit('create_room', 'TestPlayer', (response) => {
    console.log('Create room response:', response);
    
    if (response.success) {
      const roomCode = response.roomCode;
      console.log(`Room created with code: ${roomCode}`);
      
      // Try to join the room with another socket
      const socket2 = io('http://localhost:3001');
      
      socket2.on('connect', () => {
        console.log('Second socket connected');
        
        socket2.emit('join_room', roomCode, 'TestPlayer2', (response2) => {
          console.log('Join room response:', response2);
          
          if (response2.success) {
            console.log('Successfully joined room');
          } else {
            console.error('Failed to join room:', response2.error);
          }
          
          // Cleanup
          socket.disconnect();
          socket2.disconnect();
          process.exit(0);
        });
      });
    } else {
      console.error('Failed to create room:', response.error);
      socket.disconnect();
      process.exit(1);
    }
  });
});

socket.on('disconnect', () => {
  console.log('Disconnected from server');
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
  process.exit(1);
});
