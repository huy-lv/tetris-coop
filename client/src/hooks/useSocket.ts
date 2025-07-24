import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import type { ServerToClientEvents, ClientToServerEvents } from '../types';

type SocketType = Socket<ServerToClientEvents, ClientToServerEvents>;

export const useSocket = (serverUrl: string = 'http://localhost:3001') => {
  const socketRef = useRef<SocketType | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    console.log('Attempting to connect to:', serverUrl);
    
    const socket = io(serverUrl, {
      transports: ['websocket', 'polling'], // Try websocket first, fallback to polling
      timeout: 20000, // 20 second timeout
      forceNew: true,
      autoConnect: true,
      reconnection: true, // Enable reconnection
      reconnectionAttempts: 5, // Try 5 times
      reconnectionDelay: 1000, // Start with 1 second delay
      reconnectionDelayMax: 5000, // Max 5 seconds between attempts
      randomizationFactor: 0.5, // Randomize reconnection delay
      upgrade: true, // Allow transport upgrades
      rememberUpgrade: false, // Don't remember the upgrade
      withCredentials: true // Include credentials
    });
    
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('✅ Connected to server with ID:', socket.id);
      console.log('🔌 Transport used:', socket.io.engine.transport.name);
      setIsConnected(true);
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from server. Reason:', reason);
      setIsConnected(false);
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log(`🔄 Reconnected after ${attemptNumber} attempts`);
      setIsConnected(true);
    });

    socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`🔄 Reconnection attempt ${attemptNumber}`);
    });

    socket.on('reconnect_error', (error) => {
      console.error('🔥 Reconnection error:', error);
    });

    socket.on('reconnect_failed', () => {
      console.error('💥 Reconnection failed after all attempts');
    });

    socket.on('connect_error', (error) => {
      console.error('🔥 Connection error:', error.message);
      console.error('Error details:', error);
      console.error('Error type:', error.type);
      console.error('Error description:', error.description);
    });

    socket.io.on('error', (error) => {
      console.error('🔥 Socket.IO error:', error);
    });

    // Listen for transport errors
    socket.io.engine.on('upgradeError', (error) => {
      console.error('⬆️ Transport upgrade error:', error);
    });

    socket.io.engine.on('upgrade', () => {
      console.log('⬆️ Transport upgraded to:', socket.io.engine.transport.name);
    });

    socket.io.engine.on('close', (reason) => {
      console.log('🔒 Engine closed. Reason:', reason);
    });

    return () => {
      if (socketRef.current) {
        console.log('🧹 Cleaning up socket connection');
        socketRef.current.disconnect();
      }
    };
  }, [serverUrl]);

  return { socket: socketRef.current, isConnected };
};
