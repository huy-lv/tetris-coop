export const DEFAULT_CONTROLS = {
  MOVE_LEFT: "a",
  MOVE_RIGHT: "d",
  SOFT_DROP: "s",
  ROTATE: "n",
  HARD_DROP: "j",
  HOLD: "b",
} as const;

export const CONTROL_DESCRIPTIONS = {
  [DEFAULT_CONTROLS.MOVE_LEFT]: "Move Left",
  [DEFAULT_CONTROLS.MOVE_RIGHT]: "Move Right",
  [DEFAULT_CONTROLS.SOFT_DROP]: "Soft Drop",
  [DEFAULT_CONTROLS.ROTATE]: "Rotate",
  [DEFAULT_CONTROLS.HARD_DROP]: "Hard Drop",
  [DEFAULT_CONTROLS.HOLD]: "Hold/Swap",
} as const;

// Control name to description mapping for settings UI
export const CONTROL_NAME_DESCRIPTIONS = {
  MOVE_LEFT: "Move Left",
  MOVE_RIGHT: "Move Right",
  SOFT_DROP: "Soft Drop",
  ROTATE: "Rotate",
  HARD_DROP: "Hard Drop",
  HOLD: "Hold/Swap",
} as const;

// Actions that should repeat when held down
export const REPEATABLE_ACTIONS = [
  DEFAULT_CONTROLS.MOVE_LEFT,
  DEFAULT_CONTROLS.MOVE_RIGHT,
  DEFAULT_CONTROLS.SOFT_DROP,
] as const;
