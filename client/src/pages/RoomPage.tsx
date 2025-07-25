import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { TetrisGameContainer } from "../components/TetrisGameContainer";

const RoomPage = () => {
  const [searchParams] = useSearchParams();
  const roomId = searchParams.get("id");

  useEffect(() => {
    console.log("RoomPage mounted for room:", roomId);
  }, [roomId]);

  if (!roomId) {
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
            background: "rgba(244, 67, 54, 0.2)",
            border: "2px solid #f44336",
            borderRadius: "10px",
            padding: "30px",
            textAlign: "center",
          }}
        >
          <h2>Invalid Room ID</h2>
          <button
            onClick={() => (window.location.href = "/")}
            style={{
              background: "#ffd700",
              color: "#1a1a2e",
              border: "none",
              padding: "10px 20px",
              borderRadius: "5px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return <TetrisGameContainer roomId={roomId} />;
};

export default RoomPage;
