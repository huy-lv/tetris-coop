import React, { useState } from "react";
import styled from "styled-components";
import { motion, AnimatePresence } from "framer-motion";
import {
  DEFAULT_CONTROLS,
  CONTROL_NAME_DESCRIPTIONS,
} from "../constants/gameControls";
import { getSavedControls, saveControls } from "../constants/controlsUtils";

const DialogOverlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  backdrop-filter: blur(5px);
`;

const DialogContainer = styled(motion.div)`
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  border: 2px solid #ffd700;
  border-radius: 15px;
  width: 90%;
  max-width: 600px;
  overflow: hidden;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
`;

const DialogHeader = styled.div`
  padding: 20px;
  border-bottom: 1px solid rgba(255, 215, 0, 0.3);
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const DialogTitle = styled.h2`
  color: #ffd700;
  margin: 0;
  font-size: 24px;
  font-weight: bold;
`;

const CloseButton = styled(motion.button)`
  background: transparent;
  border: 2px solid #ffd700;
  color: #ffd700;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: rgba(255, 215, 0, 0.1);
  }
`;

const TabContainer = styled.div`
  display: flex;
  border-bottom: 1px solid rgba(255, 215, 0, 0.3);
`;

const Tab = styled(motion.button)<{ active: boolean }>`
  flex: 1;
  padding: 15px 20px;
  background: ${(props) =>
    props.active ? "rgba(255, 215, 0, 0.2)" : "transparent"};
  border: none;
  color: ${(props) => (props.active ? "#ffd700" : "#ccc")};
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  border-bottom: ${(props) =>
    props.active ? "3px solid #ffd700" : "3px solid transparent"};
  transition: all 0.3s ease;

  &:hover {
    background: rgba(255, 215, 0, 0.1);
    color: #ffd700;
  }
`;

const TabContent = styled.div`
  padding: 20px;
  overflow-y: auto;
`;

const ControlItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);

  &:last-child {
    border-bottom: none;
  }
`;

const ControlLabel = styled.div`
  color: white;
  font-size: 14px;
  font-weight: 500;
`;

const KeyButton = styled(motion.button)<{ listening: boolean }>`
  background: ${(props) =>
    props.listening ? "#ff6b6b" : "rgba(255, 215, 0, 0.2)"};
  border: 2px solid ${(props) => (props.listening ? "#ff6b6b" : "#ffd700")};
  color: ${(props) => (props.listening ? "white" : "#ffd700")};
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: bold;
  cursor: pointer;
  min-width: 50px;
  text-transform: uppercase;

  &:hover {
    background: ${(props) =>
      props.listening ? "#ff5252" : "rgba(255, 215, 0, 0.3)"};
  }
`;

const SaveButton = styled(motion.button)`
  background: linear-gradient(45deg, #4caf50, #45a049);
  border: none;
  color: white;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  margin-top: 20px;
  width: 100%;

  &:hover {
    background: linear-gradient(45deg, #45a049, #4caf50);
  }
`;

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

type GameControlsType = typeof DEFAULT_CONTROLS;
type ControlKey = keyof GameControlsType;

const SettingsDialog: React.FC<SettingsDialogProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<"controls" | "general">(
    "controls"
  );

  // Load controls from localStorage or use defaults
  const [controls, setControls] = useState<GameControlsType>(() =>
    getSavedControls()
  );

  // Reset controls to saved values when dialog opens
  React.useEffect(() => {
    if (isOpen) {
      setControls(getSavedControls());
    }
  }, [isOpen]);

  const [listeningFor, setListeningFor] = useState<ControlKey | null>(null);

  const handleKeyPress = React.useCallback(
    (event: KeyboardEvent) => {
      if (listeningFor) {
        event.preventDefault();
        const newKey = event.key.toLowerCase();

        setControls((prev) => ({
          ...prev,
          [listeningFor]: newKey,
        }));

        setListeningFor(null);
      }
    },
    [listeningFor]
  );

  React.useEffect(() => {
    if (listeningFor) {
      window.addEventListener("keydown", handleKeyPress);
      return () => window.removeEventListener("keydown", handleKeyPress);
    }
  }, [listeningFor, handleKeyPress]);

  const handleControlChange = (controlKey: ControlKey) => {
    setListeningFor(controlKey);
  };

  const handleSave = () => {
    try {
      // Save controls to localStorage
      saveControls(controls);

      // Dispatch custom event to notify other components about control changes
      window.dispatchEvent(
        new CustomEvent("tetris-controls-updated", {
          detail: { controls },
        })
      );

      onClose();
    } catch (error) {
      console.error("Failed to save controls to localStorage:", error);
      // You could show an error message to the user here
    }
  };

  const handleReset = () => {
    setControls(DEFAULT_CONTROLS);

    try {
      // Save default controls to localStorage
      saveControls(DEFAULT_CONTROLS);

      // Dispatch custom event to notify other components about control changes
      window.dispatchEvent(
        new CustomEvent("tetris-controls-updated", {
          detail: { controls: DEFAULT_CONTROLS },
        })
      );
    } catch (error) {
      console.error("Failed to save default controls to localStorage:", error);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <DialogOverlay
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <DialogContainer
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <DialogHeader>
              <DialogTitle>⚙️ Settings</DialogTitle>
              <CloseButton
                onClick={onClose}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                ✕
              </CloseButton>
            </DialogHeader>

            <TabContainer>
              <Tab
                active={activeTab === "controls"}
                onClick={() => setActiveTab("controls")}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                🎮 Controls
              </Tab>
              <Tab
                active={activeTab === "general"}
                onClick={() => setActiveTab("general")}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                🔧 General
              </Tab>
            </TabContainer>

            <TabContent>
              {activeTab === "controls" && (
                <div>
                  {Object.entries(controls).map(([key, value]) => (
                    <ControlItem key={key}>
                      <ControlLabel>
                        {
                          CONTROL_NAME_DESCRIPTIONS[
                            key as keyof typeof CONTROL_NAME_DESCRIPTIONS
                          ]
                        }
                      </ControlLabel>
                      <KeyButton
                        listening={listeningFor === key}
                        onClick={() => handleControlChange(key as ControlKey)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {listeningFor === key
                          ? "Press key..."
                          : value.toUpperCase()}
                      </KeyButton>
                    </ControlItem>
                  ))}

                  <div
                    style={{ display: "flex", gap: "10px", marginTop: "15px" }}
                  >
                    <SaveButton
                      onClick={handleSave}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      style={{ flex: 1 }}
                    >
                      💾 Save Changes
                    </SaveButton>
                    <SaveButton
                      onClick={handleReset}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      style={{
                        flex: 1,
                        background: "linear-gradient(45deg, #f44336, #d32f2f)",
                      }}
                    >
                      🔄 Reset to Default
                    </SaveButton>
                  </div>
                </div>
              )}

              {activeTab === "general" && (
                <div>
                  <p
                    style={{
                      color: "#ccc",
                      textAlign: "center",
                      padding: "40px 0",
                    }}
                  >
                    🚧 General settings coming soon!
                  </p>
                </div>
              )}
            </TabContent>
          </DialogContainer>
        </DialogOverlay>
      )}
    </AnimatePresence>
  );
};

export default SettingsDialog;
