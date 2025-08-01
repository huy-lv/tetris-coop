import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import type { ServerToClientEvents, ClientToServerEvents } from "../types";

type SocketType = Socket<ServerToClientEvents, ClientToServerEvents>;

// Global socket instance to persist across component unmounts
let globalSocket: SocketType | null = null;

// Get server URL based on environment
const getServerUrl = () => {
  // Use environment variable if provided
  if (import.meta.env.VITE_SERVER_URL) {
    return import.meta.env.VITE_SERVER_URL;
  }

  // In production, use your production backend
  if (import.meta.env.PROD) {
    return "https://tetris-server.huytrang.id.vn";
  }

  // In development, use localhost
  return "http://localhost:3001";
};

export const useSocket = (serverUrl: string = getServerUrl()) => {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // If we already have a global socket and it's connected, reuse it
    if (globalSocket && globalSocket.connected) {
      console.log("🔄 Reusing existing socket connection:", globalSocket.id);
      setIsConnected(true);
      return;
    }

    console.log("🆕 Creating new socket connection to:", serverUrl);

    const socket = io(serverUrl, {
      transports: ["websocket", "polling"], // Try websocket first, fallback to polling
      timeout: 20000, // 20 second timeout
      forceNew: false, // Don't force new connection - reuse existing if available
      autoConnect: true,
      reconnection: true, // Enable reconnection
      reconnectionAttempts: 5, // Try 5 times
      reconnectionDelay: 1000, // Start with 1 second delay
      reconnectionDelayMax: 5000, // Max 5 seconds between attempts
      randomizationFactor: 0.5, // Randomize reconnection delay
      upgrade: true, // Allow transport upgrades
      rememberUpgrade: false, // Don't remember the upgrade
      withCredentials: true, // Include credentials
    });

    globalSocket = socket;

    socket.on("connect", () => {
      console.log("✅ Connected to server with ID:", socket.id);
      console.log("🔌 Transport used:", socket.io.engine.transport.name);
      setIsConnected(true);
    });

    socket.on("disconnect", (reason) => {
      console.log("❌ Disconnected from server. Reason:", reason);
      setIsConnected(false);
    });

    socket.on("reconnect", (attemptNumber) => {
      console.log(`🔄 Reconnected after ${attemptNumber} attempts`);
      setIsConnected(true);
    });

    socket.on("reconnect_attempt", (attemptNumber) => {
      console.log(`🔄 Reconnection attempt ${attemptNumber}`);
    });

    socket.on("reconnect_error", (error) => {
      console.error("🔥 Reconnection error:", error);
    });

    socket.on("reconnect_failed", () => {
      console.error("💥 Reconnection failed after all attempts");
    });

    socket.on("connect_error", (error) => {
      console.error("🔥 Connection error:", error.message);
      console.error("Error details:", error);
    });

    socket.io.on("error", (error) => {
      console.error("🔥 Socket.IO error:", error);
    });

    // Listen for transport errors
    socket.io.engine.on("upgradeError", (error) => {
      console.error("⬆️ Transport upgrade error:", error);
    });

    socket.io.engine.on("upgrade", () => {
      console.log("⬆️ Transport upgraded to:", socket.io.engine.transport.name);
    });

    socket.io.engine.on("close", (reason) => {
      console.log("🔒 Engine closed. Reason:", reason);
    });

    // DON'T disconnect on cleanup - let the socket persist across page navigations
    return () => {
      console.log(
        "🧹 Component unmounting, but keeping socket connection alive"
      );
      // The socket will stay connected across page navigations
    };
  }, [serverUrl]);

  return { socket: globalSocket, isConnected };
};
