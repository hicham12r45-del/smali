import { Vector3 } from 'three';
import { clamp, lerp, smoothstep } from '../lib/math';
import {
  DOOR_CLOSE_END, DOOR_CLOSE_START, DOOR_OPEN_END, DOOR_OPEN_START, ENTER_END,
  ENTER_START, GREET_END, GREET_START, START_X, STOP_X, WALK_END, WALK_START,
  WAVE_END, walkDistance,
} from '../lib/timeline';

// ---- World layout (3D units; Coralo is about 3.6 units tall) ---------------
export const K = 1 / 105; // 2D pixels -> 3D units
export const STEP_3D = 2.4; // distance of one full two-legged step cycle
export const HOUSE_X = (STOP_X - START_X) * K;
export const HOUSE_Z = -10.1;
export const DOOR_FRONT_Z = HOUSE_Z + 7.9;
export const ENTER_DEPTH = 3.2;
export const FACE_CAM = 0.45; // yaw (rad) when Coralo faces the camera

export type Vec = { x: number; y: number; z: number };

export const charPos = (f: number): Vec => ({
  x: walkDistance(f) * K,
  y: 0,
  z: -ENTER_DEPTH * smoothstep(ENTER_START + 4, ENTER_END, f),
});

export const charSpeed = (f: number): number => {
  const a = charPos(f);
  const b = charPos(Math.max(0, f - 1));
  return Math.hypot(a.x - b.x, a.z - b.z);
};

/** Direction Coralo faces (radians around Y). 0 = toward +Z (camera). */
export const charYaw = (f: number): number => {
  const start = smoothstep(WALK_START - 14, WALK_START + 8, f);
  const arrive = smoothstep(WALK_END - 6, WALK_END + 24, f);
  const door = smoothstep(ENTER_START - 10, ENTER_START + 8, f);
  return (
    FACE_CAM +
    (Math.PI / 2 - FACE_CAM) * (start - arrive) +
    (Math.PI - FACE_CAM) * door
  );
};

export const doorAmount = (f: number): number =>
  clamp(
    smoothstep(DOOR_OPEN_START, DOOR_OPEN_END, f) -
      smoothstep(DOOR_CLOSE_START, DOOR_CLOSE_END, f),
  );

const BLINKS = [38, 150, 262, 380, 492, 596, 640];
export const blinkAmount = (f: number): number => {
  let b = 0;
  for (const s of BLINKS) {
    const t = (f - s) / 7;
    if (t >= 0 && t <= 1) b = Math.max(b, Math.sin(t * Math.PI));
  }
  return b;
};

const hop = (f: number, start: number, len = 16, h = 1.1): number => {
  const t = (f - start) / len;
  return t >= 0 && t <= 1 ? h * Math.sin(t * Math.PI) : 0;
};

export type Pose3D = {
  phase: number;
  walk: number;
  wave: number;
  wavePhase: number;
  mouth: number;
  blink: number;
  hop: number;
  sway: number;
};

export const poseAt = (f: number): Pose3D => {
  const p = charPos(f);
  const dist = p.x + Math.abs(p.z);
  const wave1 = smoothstep(2, 12, f) - smoothstep(WAVE_END - 14, WAVE_END, f);
  const wave2 =
    smoothstep(GREET_START - 6, GREET_START + 8, f) -
    smoothstep(GREET_END - 12, GREET_END, f);
  const wave = clamp(Math.max(wave1, wave2));
  const happy =
    smoothstep(GREET_START, GREET_START + 10, f) *
    (1 - smoothstep(GREET_END, GREET_END + 8, f));
  return {
    phase: (2 * Math.PI * dist) / STEP_3D,
    walk: clamp(charSpeed(f) / 0.075),
    wave,
    wavePhase: f * 0.55,
    mouth: clamp(wave * 0.7 + happy * 0.6),
    blink: blinkAmount(f),
    hop: hop(f, 612) + hop(f, 632),
    sway: Math.sin(f * 0.09),
  };
};

// ---- Camera ----------------------------------------------------------------
const mix = (a: Vector3, b: Vector3, t: number): Vector3 =>
  new Vector3(lerp(a.x, b.x, t), lerp(a.y, b.y, t), lerp(a.z, b.z, t));

export type CameraShot = { position: Vector3; target: Vector3; fov: number };

export const cameraAt = (f: number): CameraShot => {
  const c = charPos(Math.min(f, ENTER_START));
  const chest = new Vector3(c.x, 1.9, c.z);

  // 1) intro: close and friendly, then pulls back into a side-tracking shot
  const intro = new Vector3(c.x + 1.4, 2.4, 10.8);
  const walkOffset = new Vector3(
    4.6 + 1.8 * Math.sin(f / 85),
    2.3 + 0.45 * Math.sin(f / 120 + 1),
    8.8 + 1.0 * Math.cos(f / 105),
  );
  const tracking = new Vector3(c.x + walkOffset.x, walkOffset.y, walkOffset.z);
  let pos = mix(intro, tracking, smoothstep(14, WALK_START + 70, f));
  let target = mix(
    new Vector3(c.x + 0.2, 2.9, 0),
    new Vector3(c.x + 2.0, 1.9, 0),
    smoothstep(14, WALK_START + 70, f),
  );

  // 2) arrival: swing around in front of the house
  const arrive = smoothstep(WALK_END - 70, WALK_END + 36, f);
  pos = mix(pos, new Vector3(HOUSE_X + 2.2, 2.5, 10.6), arrive);
  target = mix(target, new Vector3(HOUSE_X, 2.5, -1.2), arrive);

  // 3) follow him through the door
  const push = smoothstep(GREET_END - 10, ENTER_END + 10, f);
  pos = mix(pos, new Vector3(HOUSE_X + 0.8, 2.9, 7.2), push);
  target = mix(target, new Vector3(HOUSE_X, 3.0, DOOR_FRONT_Z - 0.6), push);

  void chest;
  return { position: pos, target, fov: lerp(38, 34, push) };
};
