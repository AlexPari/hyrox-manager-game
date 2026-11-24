// First-time experience: what a new player sees and unlocks during their first session.
import { raceLog, type GameState } from "@sim";

export interface Ftue {
  /** False for careers started before the guided start existed, and once everything is unlocked and seen. */
  active: boolean;
  /** Coach tips and unlock moments already shown. */
  seen: string[];
  /** The app was opened again after the first race: the first session is over. */
  secondSession: boolean;
}

export const FTUE_OFF: Ftue = { active: false, seen: [], secondSession: true };
export const FTUE_NEW: Ftue = { active: true, seen: [], secondSession: false };

export type Feature = "calendar" | "athlete" | "shop";

export interface Unlocks {
  calendar: boolean;
  athlete: boolean;
  /** Shop, season pass, wallet, energy and missions. While locked, weeks are free. */
  shop: boolean;
}

export const UNLOCK_GATE: Record<Feature, string> = {
  calendar: "Unlocks after week 1",
  athlete: "Unlocks after your first race",
  shop: "Opens next session",
};

export function unlocks(s: GameState, f: Ftue): Unlocks {
  if (!f.active || s.season > 1) return { calendar: true, athlete: true, shop: true };
  const races = raceLog(s).length;
  return {
    calendar: s.week >= 1,
    athlete: races >= 1,
    // The first session ends at the next app launch after the first race, or after the second race at the latest.
    shop: races >= 2 || (f.secondSession && races >= 1),
  };
}

/** The next unlock moment to show on Home, if any. */
export function pendingUnlock(s: GameState, f: Ftue): Feature | null {
  if (!f.active) return null;
  const u = unlocks(s, f);
  for (const k of ["calendar", "athlete", "shop"] as Feature[]) if (u[k] && !f.seen.includes(`unlock:${k}`)) return k;
  return null;
}
