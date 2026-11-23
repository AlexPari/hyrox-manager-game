// Seeded random numbers (mulberry32). The generator state lives in the game state,
// so a saved game resumes the exact same sequence.

export interface HasRng {
  rng: number;
}

export function seedFrom(seed: number): number {
  return seed >>> 0;
}

/** Uniform number in [0, 1). Advances the state. */
export function random(s: HasRng): number {
  s.rng = (s.rng + 0x6d2b79f5) >>> 0;
  let t = s.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Standard normal number (mean 0, sd 1). */
export function gauss(s: HasRng): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = random(s);
  while (v === 0) v = random(s);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
