export const GAME_CONTROLS = {
  MOVE_LEFT: "a",
  MOVE_RIGHT: "d",
  SOFT_DROP: "s",
  ROTATE: "n",
  HARD_DROP: "j",
  HOLD: "b",
} as const;

export const CONTROL_DESCRIPTIONS = {
  [GAME_CONTROLS.MOVE_LEFT]: "Move Left",
  [GAME_CONTROLS.MOVE_RIGHT]: "Move Right",
  [GAME_CONTROLS.SOFT_DROP]: "Soft Drop",
  [GAME_CONTROLS.ROTATE]: "Rotate",
  [GAME_CONTROLS.HARD_DROP]: "Hard Drop",
  [GAME_CONTROLS.HOLD]: "Hold/Swap",
} as const;

// Actions that should repeat when held down
export const REPEATABLE_ACTIONS = [
  GAME_CONTROLS.MOVE_LEFT,
  GAME_CONTROLS.MOVE_RIGHT,
  GAME_CONTROLS.SOFT_DROP,
] as const;
