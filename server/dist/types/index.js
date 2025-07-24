"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TetrominoType = exports.GameState = void 0;
var GameState;
(function (GameState) {
    GameState["WAITING"] = "waiting";
    GameState["READY"] = "ready";
    GameState["PLAYING"] = "playing";
    GameState["PAUSED"] = "paused";
    GameState["FINISHED"] = "finished";
})(GameState || (exports.GameState = GameState = {}));
var TetrominoType;
(function (TetrominoType) {
    TetrominoType["I"] = "I";
    TetrominoType["O"] = "O";
    TetrominoType["T"] = "T";
    TetrominoType["S"] = "S";
    TetrominoType["Z"] = "Z";
    TetrominoType["J"] = "J";
    TetrominoType["L"] = "L";
})(TetrominoType || (exports.TetrominoType = TetrominoType = {}));
//# sourceMappingURL=index.js.map