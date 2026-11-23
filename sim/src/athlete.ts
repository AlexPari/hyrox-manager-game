// Athlete model: station stats, training gains, fatigue and race times.
// Pure functions over the config and plain stat objects, so the app can preview choices without touching the state.
import { STAT_IDS, type Config, type Effects, type Intensity, type Pacing, type StatId, type TrainingFocus } from "./config";
import { gauss, random, type HasRng } from "./rng";

export type Stats = Record<StatId, number>;

/** Weight of each station in the overall rating = its share of the reference race time. */
export function statWeights(c: Config): Stats {
  const total = c.race.stations.reduce((t, st) => t + st.refSec, 0);
  const w = {} as Stats;
  for (const st of c.race.stations) w[st.id] = st.refSec / total;
  return w;
}

/** Overall rating (OVR): time-weighted average of the station stats. Exactly what the race model rewards. */
export function overall(c: Config, stats: Stats): number {
  const w = statWeights(c);
  return STAT_IDS.reduce((t, id) => t + w[id] * stats[id], 0);
}

export function startingStats(c: Config, rng: HasRng): Stats {
  const st = {} as Stats;
  for (const id of STAT_IDS) st[id] = c.athlete.startOvr + (random(rng) * 2 - 1) * c.training.startSpread;
  // Re-centre so every new athlete starts at exactly the configured OVR.
  const shift = c.athlete.startOvr - overall(c, st);
  for (const id of STAT_IDS) st[id] += shift;
  return st;
}

/** Share of the week's training that goes to each stat for a focus. */
export function focusShares(c: Config, focus: TrainingFocus): Partial<Stats> {
  if (focus !== "balanced") return c.training.focus[focus];
  // Balanced follows each station's share of race time, so every stat closes the same share of its gap.
  return { ...statWeights(c) };
}

export function trainability(c: Config, age: number): number {
  for (const t of c.training.trainability) if (age <= t.toAge) return t.mult;
  return 0;
}

export interface TrainingInput {
  focus: TrainingFocus;
  intensity: Intensity;
  age: number;
  effects: Effects;
  /** Extra multiplier: booster, altitude camp, race week, knock. */
  mult: number;
}

/**
 * Stat gains for one week. Each stat closes a share of its gap to 100, so the weakest stations improve fastest.
 * Gains are scaled by 1/weight so that every block moves the OVR by the same amount when gaps are equal:
 * the best block is simply the one that targets the biggest gaps.
 */
export function trainingGains(c: Config, stats: Stats, t: TrainingInput): Partial<Stats> {
  const T = c.training;
  const w = statWeights(c);
  const avgW = 1 / STAT_IDS.length;
  const shares = focusShares(c, t.focus);
  const eff = t.focus === "balanced" ? T.balancedEfficiency : 1;
  const base = T.rate * eff * T.intensity[t.intensity].gains * trainability(c, t.age) * (1 + (t.effects.trainingGains ?? 0)) * t.mult;
  const out: Partial<Stats> = {};
  for (const id of STAT_IDS) {
    const share = shares[id] ?? 0;
    if (!share) continue;
    const runBoost = id === "run" ? 1 + (t.effects.runGains ?? 0) : 1;
    out[id] = base * runBoost * share * (avgW / w[id]) * Math.max(0, 100 - stats[id]);
  }
  return out;
}

/** OVR the given training week would add (used by the app to preview blocks and by auto-play to pick one). */
export function ovrGain(c: Config, stats: Stats, t: TrainingInput): number {
  const g = trainingGains(c, stats, t);
  const w = statWeights(c);
  return STAT_IDS.reduce((sum, id) => sum + w[id] * (g[id] ?? 0), 0);
}

/** The block that adds the most OVR this week. */
export function bestFocus(c: Config, stats: Stats, t: Omit<TrainingInput, "focus">): TrainingFocus {
  const options: TrainingFocus[] = ["run", "engine", "strength", "hybrid", "balanced"];
  let best: TrainingFocus = "balanced";
  let bestGain = -1;
  for (const focus of options) {
    const g = ovrGain(c, stats, { ...t, focus });
    if (g > bestGain) {
      bestGain = g;
      best = focus;
    }
  }
  return best;
}

/** Weekly stat loss from age, applied to every stat. */
export function declinePerWeek(c: Config, age: number, effects: Effects): number {
  if (age < c.training.declineFromAge) return 0;
  return c.training.declinePerWeek * (1 + (age - c.training.declineFromAge) * 0.25) * (1 - (effects.decline ?? 0));
}

/** Weekly knock chance from fatigue (0-100). */
export function knockChanceFor(c: Config, fatigue: number, effects: Effects): number {
  const I = c.injury;
  const k = I.knockBase + I.knockAtFatigue50 * (fatigue / 50) ** 2;
  return Math.max(0, Math.min(0.9, k * (1 + (effects.knockChance ?? 0))));
}

/** Rating to finish time, in seconds (all stations at the same rating). */
export function timeForRating(c: Config, rating: number): number {
  const ref = c.race.stations.reduce((t, st) => t + st.refSec, 0) + c.race.roxzoneRefSec;
  return ref * (1 + (100 - rating) * c.race.timePerPoint);
}

/** Finish time to equivalent rating (inverse of timeForRating). */
export function ratingForTime(c: Config, sec: number): number {
  const ref = c.race.stations.reduce((t, st) => t + st.refSec, 0) + c.race.roxzoneRefSec;
  return 100 - (sec / ref - 1) / c.race.timePerPoint;
}

export interface RaceDayInput {
  stats: Stats;
  /** Flat bonus or penalty in rating points: gear, staff, fatigue, knock, boosts, heat camp. */
  offset: number;
  pacing: Pacing;
  effects: Effects;
}

export interface Split {
  id: StatId | "roxzone";
  sec: number;
}

export interface RaceDayResult {
  timeSec: number;
  /** Equivalent rating of the day, to compare with the rivals. */
  rating: number;
  splits: Split[];
  blewUp: boolean;
}

/** Simulates the player's race: one time per station and for the Roxzone. */
export function raceDay(c: Config, rng: HasRng, r: RaceDayInput): RaceDayResult {
  const R = c.race;
  const p = R.pacing[r.pacing];
  const consistency = 1 - (r.effects.consistency ?? 0);
  const blewUp = p.blowUpChance > 0 && random(rng) < p.blowUpChance * consistency;
  const day = r.offset + p.offset - (blewUp ? p.blowUpCost : 0) + gauss(rng) * R.noise * p.noiseMult * consistency;
  const splits: Split[] = [];
  let total = 0;
  R.stations.forEach((st) => {
    const level = r.stats[st.id] + day + gauss(rng) * R.segmentNoise * consistency;
    const sec = st.refSec * (1 + (100 - level) * R.timePerPoint);
    splits.push({ id: st.id, sec: Math.round(sec) });
    total += sec;
  });
  const rox = R.roxzoneRefSec * (1 + (100 - overall(c, r.stats) - day) * R.timePerPoint);
  splits.push({ id: "roxzone", sec: Math.round(rox) });
  total += rox;
  return { timeSec: Math.round(total), rating: ratingForTime(c, total), splits, blewUp };
}

export function nextFatigue(c: Config, fatigue: number, intensity: Intensity, racing: boolean, effects: Effects): number {
  const F = c.fatigue;
  const load = c.training.intensity[intensity].load + (racing ? F.raceLoad : 0);
  return Math.max(0, Math.min(F.max, fatigue + load - F.recoveryPerWeek - (effects.recovery ?? 0)));
}
