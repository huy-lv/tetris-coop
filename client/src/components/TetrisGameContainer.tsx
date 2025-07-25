import { useState, useEffect } from "react";
import { useSocket } from "../hooks/useSocket";
import type { Room, Player } from "../types";
import { TetrisGame } from "./TetrisGame";

interface TetrisGameContainerProps {
  roomId: string;
}

export const TetrisGameContainer: React.FC<TetrisGameContainerProps> = ({
  roomId,
}) => {
  const { socket } = useSocket();
  const [room, setRoom] = useState<Room | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!socket) return;

    // Get player name from localStorage
    const playerName =
      localStorage.getItem("playerName") ||
      localStorage.getItem("tetris_player_name") ||
      "Anonymous";

    console.log("TetrisGameContainer: Joining room", { roomId, playerName });

    // Join the room using callback
    console.log("TetrisGameContainer: Attempting to join room", {
      roomId,
      playerName,
    });
    socket.emit("join_room", roomId, playerName, (response) => {
      console.log("TetrisGameContainer: Join room callback response", response);
      if (response.success) {
        console.log(
          "TetrisGameContainer: Successfully joined room via callback"
        );
      } else {
        console.error(
          "TetrisGameContainer: Failed to join room:",
          response.error
        );

        // Set specific error messages based on error type
        let errorMessage = response.error || "Failed to join room";
        if (response.error === "Room is full") {
          errorMessage = `Room ${roomId} is full! Please try another room or wait for someone to leave.`;
        } else if (response.error === "Game is already in progress") {
          errorMessage = `Game in room ${roomId} is already in progress. Please wait for the current game to finish or join another room.`;
        }

        setError(errorMessage);
        setIsConnected(false);
      }
    });

    const handleRoomJoined = (joinedRoom: Room) => {
      console.log("TetrisGameContainer: Room joined event received", {
        roomCode: joinedRoom.code,
        playerCount: joinedRoom.players.length,
      });
      setRoom(joinedRoom);

      // Find current player in the room
      const currentPlayerInRoom = joinedRoom.players.find(
        (player) => player.name === playerName // Match by name since we don't have player ID yet
      );

      if (currentPlayerInRoom) {
        setCurrentPlayer(currentPlayerInRoom);
        setIsConnected(true);
        setError(null);
      } else {
        setError("Player not found in room");
      }
    };

    const handleRoomLeft = () => {
      setRoom(null);
      setCurrentPlayer(null);
      setIsConnected(false);
    };

    const handleSpeedIncreased = (data: {
      dropInterval: number;
      speedLevel: number;
    }) => {
      console.log("🚀 Speed increased:", data);
      setRoom((prevRoom) =>
        prevRoom
          ? {
              ...prevRoom,
              dropInterval: data.dropInterval,
            }
          : null
      );
    };

    socket.on("room_joined", handleRoomJoined);
    socket.on("room_left", handleRoomLeft);
    socket.on("speed_increased", handleSpeedIncreased);

    return () => {
      socket.off("room_joined", handleRoomJoined);
      socket.off("room_left", handleRoomLeft);
      socket.off("speed_increased", handleSpeedIncreased);
    };
  }, [socket, roomId]);

  const handleLeaveRoom = () => {
    if (socket) {
      socket.emit("leave_room");
    }
    // Navigate back to home page
    window.location.href = "/";
  };

  if (error) {
    const isRoomFull = error.includes("is full");
    const isGameInProgress = error.includes("already in progress");

    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          background:
            "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
          color: "white",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div
          style={{
            background: isRoomFull
              ? "rgba(255, 193, 7, 0.2)"
              : "rgba(244, 67, 54, 0.2)",
            border: `2px solid ${isRoomFull ? "#ffc107" : "#f44336"}`,
            borderRadius: "10px",
            padding: "30px",
            textAlign: "center",
            maxWidth: "500px",
          }}
        >
          <h2
            style={{
              color: isRoomFull ? "#ffc107" : "#f44336",
              marginBottom: "20px",
              fontSize: "24px",
            }}
          >
            {isRoomFull
              ? "🏠 Room Full"
              : isGameInProgress
              ? "🎮 Game In Progress"
              : "❌ Error"}
          </h2>
          <p
            style={{
              fontSize: "16px",
              lineHeight: "1.5",
              marginBottom: "25px",
            }}
          >
            {error}
          </p>
          <div
            style={{ display: "flex", gap: "10px", justifyContent: "center" }}
          >
            <button
              onClick={() => (window.location.href = "/")}
              style={{
                background: "#ffd700",
                color: "#1a1a2e",
                border: "none",
                padding: "12px 24px",
                borderRadius: "5px",
                cursor: "pointer",
                fontWeight: "bold",
                fontSize: "14px",
              }}
            >
              🏠 Back to Home
            </button>
            {(isRoomFull || isGameInProgress) && (
              <button
                onClick={() => window.location.reload()}
                style={{
                  background: "rgba(255, 255, 255, 0.2)",
                  color: "white",
                  border: "2px solid rgba(255, 255, 255, 0.3)",
                  padding: "12px 24px",
                  borderRadius: "5px",
                  cursor: "pointer",
                  fontWeight: "bold",
                  fontSize: "14px",
                }}
              >
                🔄 Try Again
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!isConnected || !room || !currentPlayer) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          background:
            "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
          color: "white",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div
          style={{
            background: "rgba(255, 255, 255, 0.1)",
            borderRadius: "10px",
            padding: "30px",
            textAlign: "center",
          }}
        >
          <h2>Connecting to Room {roomId}...</h2>
          <div style={{ marginTop: "20px" }}>🔄 Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <TetrisGame
      room={room}
      currentPlayer={currentPlayer}
      onLeaveRoom={handleLeaveRoom}
    />
  );
};
