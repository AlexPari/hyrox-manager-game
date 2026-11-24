// Read-only helpers for the app: race history, readiness, predictions, the season calendar.
// Nothing here changes the rules; it summarises the game state for the screens.
import { ratingForTime, timeForRating, type Split } from "./athlete";
import type { Config, DivisionName, Pacing, StatId } from "./config";
import { divisionConfig, effects, gearBonus, isWorldsWeek, ovr, raceCity, raceIndexForWeek, rankingPoints, seasonConfig } from "./game";
import type { GameEvent, GameState } from "./types";

export interface AthleteProfile {
  first: string;
  last: string;
  /** ISO 3166 alpha-2 country code, e.g. "FR". */
  country: string;
}

/** One finished race, kept for the calendar, the wall of fame and personal bests. */
export interface RaceLogEntry {
  season: number;
  week: number;
  raceIndex: number;
  city: string;
  worlds: boolean;
  division: DivisionName;
  age: number;
  place: number;
  fieldSize: number;
  timeSec: number;
  winnerSec: number;
  prize: number;
  points: number;
  pacing: Pacing;
  splits: Split[];
}

export const DEFAULT_PROFILE: AthleteProfile = { first: "Lucas", last: "Martin", country: "FR" };

export function profileOf(s: GameState): AthleteProfile {
  return s.profile ?? DEFAULT_PROFILE;
}

export function raceLog(s: GameState): RaceLogEntry[] {
  return s.raceLog ?? [];
}

/**
 * Records the races of a week in the history. Call it with the events returned by playWeek, before anything else
 * changes the state (the division and age must still be those of the race).
 */
export function recordWeek(s: GameState, events: GameEvent[], division: DivisionName, age: number): void {
  for (const e of events) {
    if (e.type !== "race") continue;
    if (!s.raceLog) s.raceLog = [];
    s.raceLog.push({
      season: e.season, week: e.week, raceIndex: e.raceIndex, city: e.city, worlds: e.worlds, division, age,
      place: e.place, fieldSize: e.fieldSize, timeSec: e.timeSec, winnerSec: e.winnerSec, prize: e.prize,
      points: rankingPoints(s.config, e.place), pacing: e.pacing, splits: e.splits,
    });
  }
}

/** Race readiness, 0-100: fresh and fit is 100; fatigue, a knock or an injury lower it. */
export function readiness(s: GameState, fatigue = s.fatigue): number {
  const status = s.status === "injured" ? 50 : s.status === "knock" ? 15 : 0;
  return Math.max(0, Math.min(100, Math.round(100 - fatigue * 0.6 - status)));
}

/** Expected race-day rating with the current form, gear and staff (before race-day randomness). */
export function expectedRaceRating(s: GameState, pacing: Pacing = "even", extra = 0): number {
  const c = s.config;
  const fx = effects(s);
  return (
    ovr(s) + gearBonus(s) + (fx.raceDay ?? 0) + c.race.pacing[pacing].offset - s.fatigue * c.fatigue.racePenaltyPerPoint -
    (s.status === "knock" ? c.injury.knockPenalty : 0) + extra
  );
}

/** Place the athlete would get if everyone raced exactly at their level. */
export function expectedPlace(s: GameState, rating: number): number {
  return 1 + s.field.rivals.filter((r) => r.level > rating).length;
}

export interface ScheduledRace {
  week: number;
  raceIndex: number;
  city: string;
  worlds: boolean;
  /** Result if the athlete raced it this season. */
  result: RaceLogEntry | null;
  /** "next" is the first race still to come (it may be several weeks away). */
  status: "done" | "skipped" | "next" | "upcoming";
}

/** The current season's races, in order, with results so far. */
export function seasonRaces(s: GameState): ScheduledRace[] {
  const out: ScheduledRace[] = [];
  const log = raceLog(s).filter((r) => r.season === s.season);
  for (let w = 1; w <= seasonConfig(s).weeks; w++) {
    const raceIndex = raceIndexForWeek(s, w);
    if (!raceIndex) continue;
    const result = log.find((r) => r.week === w) ?? null;
    const upcoming = w > s.week;
    const status = result ? "done" : !upcoming ? "skipped" : out.some((x) => x.status === "next") ? "upcoming" : "next";
    out.push({ week: w, raceIndex, city: raceCity(s, w), worlds: isWorldsWeek(s, w), result, status });
  }
  return out;
}

/** Ranking points for a place and the prize money of that place in the current division. */
export function placeRewards(s: GameState, place: number, worlds = false): { points: number; prize: number } {
  const c = s.config;
  const base = place <= c.prizes.top8.length ? c.prizes.top8[place - 1] : place <= 16 ? c.prizes.place9to16 : c.prizes.place17plus;
  return { points: rankingPoints(c, place), prize: Math.round(base * divisionConfig(s).prizeMult * (worlds ? c.prizes.worldsMult : 1)) };
}

// ---------------------------------------------------------------- live race playback

/** Hyrox order: Run 1, SkiErg, Run 2, Sled Push ... Run 8, Wall Balls. */
export const RACE_STATIONS: StatId[] = ["ski", "sledPush", "sledPull", "burpees", "row", "farmers", "lunges", "wallBalls"];
/** Runs slow down a little as the race goes on (shape only: the 8 runs add up to the run split). */
const RUN_SHAPE = [0.94, 0.97, 0.99, 1.0, 1.01, 1.02, 1.03, 1.04];

/** The 16 segments (8 runs, 8 stations) of a race from its splits. The Roxzone is spread over every segment. */
export function segmentTimes(splits: Split[]): number[] {
  const by = Object.fromEntries(splits.map((x) => [x.id, x.sec])) as Record<string, number>;
  const shapeSum = RUN_SHAPE.reduce((t, x) => t + x, 0);
  const rox = (by.roxzone ?? 0) / 16;
  const out: number[] = [];
  RACE_STATIONS.forEach((id, i) => {
    out.push(((by.run ?? 0) * RUN_SHAPE[i]) / shapeSum + rox);
    out.push((by[id] ?? 0) + rox);
  });
  return out;
}

export interface RaceRunner {
  /** -1 for the player, otherwise the rival's index in the division field. */
  id: number;
  /** Seconds per segment (16) and the cumulative time at each segment boundary (17 values, from 0). */
  seg: number[];
  cum: number[];
  total: number;
  /** Finishing place. */
  place: number;
}

/**
 * Everyone in a finished race, segment by segment, for the live playback. The player's segments are the real
 * splits; each rival's total comes from their race-day rating, spread over the segments with a personal
 * runner/station profile. The finishing order is exactly the race result.
 */
export function raceRunners(c: Config, race: Extract<GameEvent, { type: "race" }>): RaceRunner[] {
  // The splits are rounded one by one: scale them so they add up to the official time.
  const raw = segmentTimes(race.splits);
  const rawSum = raw.reduce((a, b) => a + b, 0);
  const me = raw.map((t) => (t * race.timeSec) / rawSum);
  const field = race.field ?? [];
  // Rivals in finishing order around the player's place.
  const order: Array<{ id: number; total: number; seg?: number[] }> = [];
  let r = 0;
  for (let place = 1; place <= field.length + 1; place++) {
    if (place === race.place) order.push({ id: -1, total: race.timeSec, seg: me });
    else {
      const f = field[r++];
      order.push({ id: f.rival, total: timeForRating(c, f.rating) });
    }
  }
  // Keep the finishing order strict even after rounding.
  for (let i = 1; i < order.length; i++) if (order[i].total <= order[i - 1].total) order[i].total = order[i - 1].total + 0.5;
  for (let i = order.length - 2; i >= 0; i--) if (order[i].id !== -1 && order[i].total >= order[i + 1].total) order[i].total = order[i + 1].total - 0.5;

  return order.map((o, i) => {
    let seg = o.seg;
    if (!seg) {
      let h = (race.season * 92821 + race.week * 6151 + (o.id + 1) * 104729) >>> 0;
      const rnd = () => {
        h ^= h << 13;
        h >>>= 0;
        h ^= h >>> 17;
        h ^= h << 5;
        h >>>= 0;
        return h / 4294967296;
      };
      const runBias = (rnd() - 0.5) * 0.14; // + = weaker runner, stronger on stations
      // An even athlete at this level, then a personal profile and a little noise per segment.
      const rating = ratingForTime(c, o.total);
      const flat = segmentTimes([
        ...c.race.stations.map((st) => ({ id: st.id, sec: st.refSec * (1 + (100 - rating) * c.race.timePerPoint) })),
        { id: "roxzone" as const, sec: c.race.roxzoneRefSec * (1 + (100 - rating) * c.race.timePerPoint) },
      ]);
      const raw = flat.map((t, k) => t * (1 + (k % 2 === 0 ? runBias : -runBias)) * (1 + (rnd() - 0.5) * 0.06));
      const sum = raw.reduce((a, b) => a + b, 0);
      seg = raw.map((t) => (t * o.total) / sum);
    }
    const cum = [0];
    for (const t of seg) cum.push(cum[cum.length - 1] + t);
    return { id: o.id, seg, cum, total: o.total, place: i + 1 };
  });
}
