export const GAME_CONFIG = {
  BOARD_WIDTH: 10,
  BOARD_HEIGHT: 20,
  BLOCK_SIZE: 25,
  INITIAL_SPEED: 800,
  SPEED_INCREASE: 40,
  LINES_PER_LEVEL: 10,
} as const;

// Number of cleared rows required to add 1 garbage row to opponent
export const ROW_TO_GARBAGE = 2 as const;

export const TEST_MODE = false; // Set to true to always spawn O pieces for testing

// Default animation settings - can be overridden by user preferences
export const DEFAULT_ANIMATION_SETTINGS = {
  ENABLE_SHAKE: true, // Enable/disable shake animation
  ENABLE_FIREBALL: true, // Enable/disable fireball animation
} as const;

// Current animation settings (will be updated by user preferences)
export let ANIMATION_SETTINGS: {
  ENABLE_SHAKE: boolean;
  ENABLE_FIREBALL: boolean;
} = { ...DEFAULT_ANIMATION_SETTINGS };

// Global audio settings
export const DEFAULT_AUDIO_SETTINGS = {
  ENABLE_SFX: true,
  VOLUME: 0.25,
} as const;

export let AUDIO_SETTINGS: {
  ENABLE_SFX: boolean;
  VOLUME: number;
} = { ...DEFAULT_AUDIO_SETTINGS };

// Load animation settings from localStorage on app start
if (typeof window !== "undefined") {
  const savedAnimationSettings = localStorage.getItem(
    "tetris-animation-settings"
  );
  if (savedAnimationSettings) {
    try {
      const parsedSettings = JSON.parse(savedAnimationSettings);
      ANIMATION_SETTINGS = {
        ENABLE_SHAKE: parsedSettings.enableShake ?? true,
        ENABLE_FIREBALL: parsedSettings.enableFireball ?? true,
      };
    } catch (error) {
      console.error("Failed to parse saved animation settings:", error);
    }
  }

  const savedAudioSettings = localStorage.getItem("tetris-audio-settings");
  if (savedAudioSettings) {
    try {
      const parsed = JSON.parse(savedAudioSettings);
      AUDIO_SETTINGS = {
        ENABLE_SFX: parsed.enableSfx ?? true,
        VOLUME: typeof parsed.volume === "number" ? parsed.volume : 0.25,
      };
    } catch (error) {
      console.error("Failed to parse saved audio settings:", error);
    }
  }
}

// Function to update animation settings
export const updateAnimationSettings = (settings: {
  ENABLE_SHAKE?: boolean;
  ENABLE_FIREBALL?: boolean;
}) => {
  ANIMATION_SETTINGS = { ...ANIMATION_SETTINGS, ...settings };
};

export const updateAudioSettings = (settings: {
  ENABLE_SFX?: boolean;
  VOLUME?: number;
}) => {
  AUDIO_SETTINGS = { ...AUDIO_SETTINGS, ...settings };
};

export const CONTROLS = {
  MOVE_LEFT: "a",
  MOVE_RIGHT: "d",
  MOVE_DOWN: "s",
  MOVE_UP: "w",
  ROTATE: "n",
  ROTATE_LEFT: "q",
  ROTATE_RIGHT: "e",
  HARD_DROP: "j",
  HOLD: "b",
} as const;

export const TETROMINO_SHAPES = {
  I: [[[1, 1, 1, 1]], [[1], [1], [1], [1]]],
  O: [
    [
      [1, 1],
      [1, 1],
    ],
  ],
  T: [
    [
      [0, 1, 0],
      [1, 1, 1],
    ],
    [
      [1, 0],
      [1, 1],
      [1, 0],
    ],
    [
      [1, 1, 1],
      [0, 1, 0],
    ],
    [
      [0, 1],
      [1, 1],
      [0, 1],
    ],
  ],
  S: [
    [
      [0, 1, 1],
      [1, 1, 0],
    ],
    [
      [1, 0],
      [1, 1],
      [0, 1],
    ],
  ],
  Z: [
    [
      [1, 1, 0],
      [0, 1, 1],
    ],
    [
      [0, 1],
      [1, 1],
      [1, 0],
    ],
  ],
  J: [
    [
      [1, 0, 0],
      [1, 1, 1],
    ],
    [
      [1, 1],
      [1, 0],
      [1, 0],
    ],
    [
      [1, 1, 1],
      [0, 0, 1],
    ],
    [
      [0, 1],
      [0, 1],
      [1, 1],
    ],
  ],
  L: [
    [
      [0, 0, 1],
      [1, 1, 1],
    ],
    [
      [1, 0],
      [1, 0],
      [1, 1],
    ],
    [
      [1, 1, 1],
      [1, 0, 0],
    ],
    [
      [1, 1],
      [0, 1],
      [0, 1],
    ],
  ],
} as const;

export const TETROMINO_COLORS = {
  I: "#00f0f0",
  O: "#f0f000",
  T: "#a000f0",
  S: "#00f000",
  Z: "#f00000",
  J: "#0000f0",
  L: "#f0a000",
} as const;

export const GAME_STATES = {
  WELCOME: "welcome",
  WAITING: "waiting",
  PLAYING: "playing",
  PAUSED: "paused",
  GAME_OVER: "game_over",
} as const;
