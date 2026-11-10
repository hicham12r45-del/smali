import { clamp, progress, smoothstep } from './math';

// ---- Canvas -------------------------------------------------------------
export const W = 1920;
export const H = 1080;
export const FPS = 30;
export const TOTAL = 720; // 24 seconds

// ---- World layout (world pixels) ----------------------------------------
export const GROUND_Y = 880; // where Coralo's feet touch the sand
export const START_X = 520;
export const DOOR_X = 6400;
export const STOP_X = DOOR_X - 270;
export const WORLD_WIDTH = DOOR_X + 1400;
export const CAM_MAX = DOOR_X - 1300;
export const CHAR_SCREEN_X = 560;

// ---- Story beats (frames) -----------------------------------------------
export const WAVE_END = 52; // intro wave finishes, Coralo turns and sets off
export const WALK_START = 52;
export const WALK_END = 560;
export const DOOR_OPEN_START = 572;
export const DOOR_OPEN_END = 608;
export const GREET_START = 604; // waves at the viewer, jumps for joy
export const GREET_END = 656;
export const ENTER_START = 656;
export const ENTER_END = 700;
export const DOOR_CLOSE_START = 700;
export const DOOR_CLOSE_END = 714;

// ---- Walking (trapezoid speed profile: ease in, cruise, ease out) --------
const WALK_FRAMES = WALK_END - WALK_START;
const RAMP_UP = 50;
const RAMP_DOWN = 110;
const WALK_DISTANCE = STOP_X - START_X;
const V_MAX = WALK_DISTANCE / (WALK_FRAMES - (RAMP_UP + RAMP_DOWN) / 2);

/** Distance travelled since the walk began, in world pixels. */
export const walkDistance = (frame: number): number => {
  const t = clamp(frame - WALK_START, 0, WALK_FRAMES);
  if (t < RAMP_UP) return (V_MAX * t * t) / (2 * RAMP_UP);
  if (t <= WALK_FRAMES - RAMP_DOWN) return V_MAX * (RAMP_UP / 2 + (t - RAMP_UP));
  const rest = WALK_FRAMES - t;
  return WALK_DISTANCE - (V_MAX * rest * rest) / (2 * RAMP_DOWN);
};

/** Current walking speed in world pixels per frame. */
export const walkSpeed = (frame: number): number => {
  const t = clamp(frame - WALK_START, 0, WALK_FRAMES);
  if (t <= 0 || t >= WALK_FRAMES) return 0;
  return V_MAX * Math.min(1, t / RAMP_UP, (WALK_FRAMES - t) / RAMP_DOWN);
};

export const STEP_CYCLE = 250; // world pixels per full two-legged step cycle

/** World X of Coralo, including the final walk through the door. */
export const charWorldX = (frame: number): number => {
  const walked = START_X + walkDistance(frame);
  const enter = smoothstep(ENTER_START, ENTER_END, frame);
  return walked + enter * 300;
};

export const cameraX = (frame: number): number =>
  Math.min(charWorldX(Math.min(frame, ENTER_START)) - CHAR_SCREEN_X, CAM_MAX);

// ---- Pose drivers ---------------------------------------------------------
/** 0 = facing the viewer, 1 = side view walking to the right. */
export const turnAmount = (frame: number): number => {
  const startTurn = smoothstep(WALK_START - 14, WALK_START + 8, frame);
  const faceViewer = smoothstep(WALK_END - 6, WALK_END + 24, frame);
  const toDoor = smoothstep(ENTER_START - 10, ENTER_START + 8, frame);
  return clamp(startTurn - faceViewer + toDoor);
};

export const doorOpen = (frame: number): number =>
  smoothstep(DOOR_OPEN_START, DOOR_OPEN_END, frame) -
  smoothstep(DOOR_CLOSE_START, DOOR_CLOSE_END, frame);

export const cameraZoom = (frame: number): number =>
  1 + 0.1 * smoothstep(WALK_END, GREET_END + 10, frame);

export const fadeToBlack = (frame: number): number =>
  progress(frame, TOTAL - 14, TOTAL);
