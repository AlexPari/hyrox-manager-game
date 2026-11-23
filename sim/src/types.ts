import type { Stats, Split } from "./athlete";
import type { AthleteProfile, RaceLogEntry } from "./view";
import type { Config, DivisionName, Intensity, Pacing, TrainingFocus } from "./config";

export type Status = "fit" | "knock" | "injured";

export interface Rival {
  level: number;
  points: number[];
}

export interface PassState {
  active: boolean;
  number: number;
  startDay: number;
  xp: number;
  tiers: number;
  premium: boolean;
}

export interface PassRecord {
  number: number;
  tiers: number;
  premium: boolean;
  vault: number;
  endDay: number;
  season: number;
}

export type SeasonOutcome = "turnPro" | "qualified" | "missedCut" | "keptSpot" | "relegated";

export interface SeasonRecord {
  season: number;
  age: number;
  phase: string;
  division: DivisionName;
  rank: number;
  fieldSize: number;
  points: number;
  outcome: SeasonOutcome;
  /** Points above (positive) or behind (negative) the cut line. 0 for the Rookie season. */
  gapToCut: number;
  nextDivision: DivisionName;
  realDays: number;
  races: number;
  wins: number;
  podiums: number;
  best: number | null;
  worlds: number | null;
  prizes: number;
  bonus: number;
  coins: number;
  gems: number;
  ovr: number;
  usd: number;
}

export interface CurrentSeason {
  races: number;
  wins: number;
  podiums: number;
  best: number | null;
  prizes: number;
  worlds: number | null;
  startDay: number;
}

/** The whole game is one plain JSON object: easy to save, sync and migrate. */
export interface GameState {
  version: 2;
  config: Config;
  /** Seeded random generator state: the same seed and actions replay the same career. */
  rng: number;
  season: number;
  /** In-game weeks played this season. */
  week: number;
  /** Real days elapsed since the career started (half-day steps). */
  day: number;
  age: number;
  /** Station stats (0-100). The overall rating is derived from them, see overall(). */
  stats: Stats;
  /** 0-100. Rises with hard training and races, falls with recovery. Costs race performance and raises the knock chance. */
  fatigue: number;
  energy: number;
  coins: number;
  gems: number;
  usd: number;
  division: DivisionName;
  everElite: boolean;
  field: { rivals: Rival[]; mine: number[] };
  /** Tier per staff role (0 = none, 1 Bronze, 2 Silver, 3 Gold), same order as config.staff. */
  staff: number[];
  facilities: boolean[];
  gear: boolean[];
  campWeeksLeft: number;
  heatCampBooked: boolean;
  status: Status;
  /** Weeks until a knock or an injury clears on its own. */
  injuryWeeksLeft: number;
  adsCoinsToday: number;
  adsEnergyToday: number;
  weeksPlayedToday: number;
  vipUntilDay: number;
  pass: PassState;
  passHistory: PassRecord[];
  /** Pre-rolled for the next race week so the UI can show "abroad" before the player decides. */
  abroadRoll: number;
  current: CurrentSeason;
  seasons: SeasonRecord[];
  ended: boolean;
  /** Name and country chosen at the start of the career (set by the app; optional for older saves). */
  profile?: AthleteProfile;
  /** Every finished race (filled by recordWeek; optional for older saves). */
  raceLog?: RaceLogEntry[];
}

export type GameEvent =
  | { type: "trained"; focus: TrainingFocus; intensity: Intensity; gains: Partial<Stats>; ovrGain: number; fatigue: number }
  | {
      type: "race"; season: number; week: number; raceIndex: number; city: string; worlds: boolean; abroad: boolean;
      place: number; fieldSize: number; prize: number; xp: number; travel: number;
      pacing: Pacing; blewUp: boolean; timeSec: number; winnerSec: number; splits: Split[];
    }
  | { type: "raceSkipped"; raceIndex: number }
  | { type: "worldChampion"; age: number }
  | { type: "knock" }
  | { type: "injured"; weeks: number }
  | { type: "recovered" }
  | { type: "passStarted"; number: number }
  | { type: "passTier"; tier: number }
  | { type: "passComplete"; gems: number }
  | { type: "passEnded"; number: number; tiers: number; premium: boolean; vault: number }
  | { type: "seasonEnd"; record: SeasonRecord }
  | { type: "careerOver" }
  | { type: "staffHired"; role: string; tier: number; fee: number }
  | { type: "staffReleased"; role: string };

export type ErrorCode =
  | "careerOver"
  | "notEnoughEnergy"
  | "notEnoughCoins"
  | "notEnoughGems"
  | "cannotPaySalaries"
  | "injured"
  | "locked"
  | "alreadyOwned"
  | "limitReached"
  | "notAvailable";

export type ActionResult = { ok: true; events: GameEvent[] } | { ok: false; error: ErrorCode };
