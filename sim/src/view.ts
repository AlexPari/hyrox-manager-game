// Read-only helpers for the app: race history, readiness, predictions, the season calendar.
// Nothing here changes the rules; it summarises the game state for the screens.
import type { Split } from "./athlete";
import type { DivisionName, Pacing } from "./config";
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
