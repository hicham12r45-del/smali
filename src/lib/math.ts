// Small pure helpers shared by every scene component.

export const clamp = (v: number, a = 0, b = 1): number =>
  Math.min(b, Math.max(a, v));

export const lerp = (a: number, b: number, t: number): number =>
  a + (b - a) * t;

/** 0 before `a`, 1 after `b`, smooth S-curve in between. */
export const smoothstep = (a: number, b: number, v: number): number => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/** Linear 0..1 progress between two frames. */
export const progress = (frame: number, a: number, b: number): number =>
  clamp((frame - a) / (b - a));

export const mod = (n: number, m: number): number => ((n % m) + m) % m;

export const deg = (d: number): number => (d * Math.PI) / 180;

/** Deterministic random generator (mulberry32) so every render is identical. */
export const makeRandom = (seed: number): (() => number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const pick = <T,>(rand: () => number, items: T[]): T =>
  items[Math.floor(rand() * items.length) % items.length];

/** Format a number for SVG attributes (keeps files small and tidy). */
export const n = (v: number): string => (Math.round(v * 100) / 100).toString();
