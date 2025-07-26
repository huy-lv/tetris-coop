import { DEFAULT_CONTROLS } from "./gameControls";

type GameControlsType = typeof DEFAULT_CONTROLS;

// Utility function to get saved controls from localStorage
export const getSavedControls = (): GameControlsType => {
  const savedControls = localStorage.getItem("tetris-controls");
  if (savedControls) {
    try {
      const parsed = JSON.parse(savedControls) as GameControlsType;
      return parsed;
    } catch (error) {
      console.warn("Failed to parse saved controls from localStorage:", error);
      return DEFAULT_CONTROLS;
    }
  }
  return DEFAULT_CONTROLS;
};

// Utility function to save controls to localStorage
export const saveControls = (controls: GameControlsType): void => {
  try {
    localStorage.setItem("tetris-controls", JSON.stringify(controls));
    console.log("Controls saved to localStorage:", controls);
  } catch (error) {
    console.error("Failed to save controls to localStorage:", error);
    throw error;
  }
};
