import { BotConfig } from "../utils/types";
import { BOT_SPEEDS, AI_WEIGHTS } from "../utils/constants";

export const DEFAULT_CONFIG: BotConfig = {
  speeds: BOT_SPEEDS,
  keys: {
    moveLeft: "ArrowLeft",
    moveRight: "ArrowRight",
    softDrop: "ArrowDown",
    hardDrop: "Space",
    rotate: "ArrowUp",
    hold: "KeyC",
  },
  evaluation: AI_WEIGHTS,
};

export function getConfig(): BotConfig {
  return DEFAULT_CONFIG;
}
