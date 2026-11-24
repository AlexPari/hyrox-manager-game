// Every tunable number of the game lives here. The same shape can later come from Remote Config.

export type DivisionName = "Open" | "Pro" | "Elite 15";

/** The 8 Hyrox stations plus the 8 x 1 km of running. */
export type StatId = "run" | "ski" | "sledPush" | "sledPull" | "burpees" | "row" | "farmers" | "lunges" | "wallBalls";
export const STAT_IDS: StatId[] = ["run", "ski", "sledPush", "sledPull", "burpees", "row", "farmers", "lunges", "wallBalls"];

/** Weekly training block chosen by the player. "balanced" is the autopilot choice. */
export type TrainingFocus = "balanced" | "run" | "engine" | "strength" | "hybrid";
export type Intensity = "light" | "normal" | "hard";
export type Pacing = "conservative" | "even" | "aggressive";

/** What staff and facilities can improve. */
export type Effect =
  | "trainingGains" // multiplies all training gains (+0.3 = +30%)
  | "runGains" // multiplies running gains only
  | "knockChance" // multiplies the weekly knock chance (-0.3 = -30%)
  | "recovery" // extra fatigue recovered per week
  | "raceDay" // flat race-day bonus, in rating points
  | "consistency" // lowers race-day randomness and pacing blow-ups (0.3 = -30%)
  | "decline"; // slows the age decline (0.3 = -30%)

export type Effects = Partial<Record<Effect, number>>;

export interface DivisionConfig {
  /** Athletes in the field, including the player. */
  size: number;
  /** Rival level: mean and spread of the field's overall rating. */
  mean: number;
  sd: number;
  prizeMult: number;
  entryFee: number;
  /** Share of races held abroad (travel cost applies). */
  abroadShare: number;
  /** Pro: top N of the season ranking are invited to Elite 15. */
  promoteTop?: number;
  /** Elite 15: top N keep their spot, the rest are relegated to Pro. */
  keepTop?: number;
  /** Cap on the end-of-season bonus in this division. */
  bonusCap?: number;
}

export interface SeasonConfig {
  season: number;
  phase: "Rookie" | "Build" | "Peak" | "Decline";
  weeks: number;
  races: number;
  /** Reference real days to play the season for an active free player (informational, used by the tools). */
  targetDays: number;
  bonus: number;
}

export interface StaffRoleConfig {
  id: "headCoach" | "physio" | "nutritionist" | "runningCoach" | "psychologist";
  salary: [number, number, number];
  unlockSeason: number;
  /** Only available once the athlete has reached Elite 15. */
  eliteOnly?: boolean;
  /** Effect values for tiers Bronze, Silver, Gold. */
  effects: Partial<Record<Effect, [number, number, number]>>;
}

export interface FacilityConfig {
  id: "homeGym" | "recoveryRoom" | "altitudeTent" | "cryoChamber";
  cost: number;
  effects: Effects;
  /** Season in the reference plan (used by auto-play). */
  planSeason: number;
}

export interface GearConfig {
  id: "carbonRacers" | "gripGloves" | "kneeSleeves";
  cost: number;
  raceBonus: number;
}

export interface Config {
  /** perWeek: fixed cost of one week (races cost nothing extra). regenPerDay: real-time refill. */
  energy: { cap: number; perWeek: number; regenPerDay: number; vipCapBonus: number; adEnergy: number; adEnergyMaxPerDay: number; plus20Gems: number; refillGems: number };
  coins: { start: number; adCoins: number; adCoinsMaxPerDay: number; physio: number; travelPerRaceAbroad: number };
  gems: { start: number; vipGemsPerDay: number; iceBath: number; booster: number; coachCall: number; fastHeal: number };
  prices: { vipUsd: number; passUsd: number; gemPacks: Array<{ gems: number; usd: number }> };
  injury: {
    /** Weekly knock chance at zero fatigue, plus the extra chance at fatigue 50 (grows with the square of fatigue). */
    knockBase: number; knockAtFatigue50: number;
    /** Chance that a knock turns into an injury when the athlete races or trains hard on it. */
    injuryIfStrained: number; injuryWeeks: number; knockWeeks: number; knockPenalty: number; knockGains: number;
  };
  boosts: { boosterMult: number; iceBathFatigue: number; coachCallBonus: number };
  /** Race time model. Segment time = refSec x (1 + (100 - stat) x timePerPoint). Rating 100 = world record pace. */
  race: {
    stations: Array<{ id: StatId; label: string; refSec: number }>;
    roxzoneRefSec: number;
    timePerPoint: number;
    /** Race-day randomness, in rating points (shared part and per-segment part). */
    noise: number;
    segmentNoise: number;
    pacing: Record<Pacing, { offset: number; noiseMult: number; blowUpChance: number; blowUpCost: number }>;
  };
  training: {
    /** Share of the gap to 100 closed per week by a fully focused block, before multipliers. */
    rate: number;
    balancedEfficiency: number;
    focus: Record<Exclude<TrainingFocus, "balanced">, Partial<Record<StatId, number>>>;
    intensity: Record<Intensity, { gains: number; load: number }>;
    raceWeekGains: number;
    trainability: Array<{ toAge: number; mult: number }>;
    declineFromAge: number;
    declinePerWeek: number;
    startSpread: number;
  };
  fatigue: { recoveryPerWeek: number; raceLoad: number; racePenaltyPerPoint: number; max: number };
  pass: {
    days: number; tiers: number; xpPerTier: number; coinsPerTier: number; premiumGemsPerTier: number; lastTierGems: number;
    vaultCoinsPer100Xp: number; missionXpPerDay: number; unlockSeason: number;
    raceXp: { win: number; top3: number; top8: number; finish: number };
  };
  /** Pro base prize by place: 1..8, then 9-16, then 17+. */
  prizes: { top8: number[]; place9to16: number; place17plus: number; worldsMult: number };
  ranking: { points: number[]; pointsBeyond: number; bestOf: number };
  divisions: Record<DivisionName, DivisionConfig>;
  athlete: { startOvr: number; startAge: number };
  career: SeasonConfig[];
  staff: StaffRoleConfig[];
  hireFees: [number, number, number];
  /** Reference staff plan per season (tiers 0-3 per role, same order as `staff`). Used by auto-play. */
  staffPlan: number[][];
  facilities: FacilityConfig[];
  camps: {
    altitude: { cost: number; weeks: number; mult: number; planSeasons: number[] };
    heat: { cost: number; raceBonus: number; planSeasons: number[] };
  };
  gear: GearConfig[];
  raceCities: string[];
}

/** v2: station stats, training choices, fatigue and pacing (23 Nov 2026). Economy values from the balancing sheet. */
export const defaultConfig: Config = {
  energy: { cap: 50, perWeek: 10, regenPerDay: 24, vipCapBonus: 15, adEnergy: 5, adEnergyMaxPerDay: 3, plus20Gems: 25, refillGems: 50 },
  coins: { start: 1000, adCoins: 200, adCoinsMaxPerDay: 3, physio: 300, travelPerRaceAbroad: 500 },
  gems: { start: 120, vipGemsPerDay: 10, iceBath: 20, booster: 30, coachCall: 15, fastHeal: 40 },
  prices: { vipUsd: 9.99, passUsd: 9.99, gemPacks: [{ gems: 80, usd: 0.99 }, { gems: 450, usd: 4.99 }, { gems: 1200, usd: 9.99 }] },
  injury: { knockBase: 0.01, knockAtFatigue50: 0.1, injuryIfStrained: 0.25, injuryWeeks: 3, knockWeeks: 2, knockPenalty: 3, knockGains: 0.5 },
  boosts: { boosterMult: 1.5, iceBathFatigue: 20, coachCallBonus: 0.5 },
  race: {
    // Rating 100 on every station = 53:20, about the world record.
    stations: [
      { id: "run", label: "Running 8 x 1 km", refSec: 1560 },
      { id: "ski", label: "SkiErg 1000 m", refSec: 230 },
      { id: "sledPush", label: "Sled Push 50 m", refSec: 140 },
      { id: "sledPull", label: "Sled Pull 50 m", refSec: 195 },
      { id: "burpees", label: "Burpee Broad Jumps 80 m", refSec: 170 },
      { id: "row", label: "Row 1000 m", refSec: 245 },
      { id: "farmers", label: "Farmers Carry 200 m", refSec: 80 },
      { id: "lunges", label: "Sandbag Lunges 100 m", refSec: 180 },
      { id: "wallBalls", label: "Wall Balls x 100", refSec: 210 },
    ],
    roxzoneRefSec: 190,
    timePerPoint: 0.011,
    noise: 2.2,
    segmentNoise: 2,
    pacing: {
      conservative: { offset: -0.8, noiseMult: 0.6, blowUpChance: 0, blowUpCost: 0 },
      even: { offset: 0, noiseMult: 1, blowUpChance: 0, blowUpCost: 0 },
      aggressive: { offset: 1.4, noiseMult: 1.2, blowUpChance: 0.15, blowUpCost: 5 },
    },
  },
  training: {
    rate: 0.056,
    balancedEfficiency: 0.85,
    focus: {
      run: { run: 1 },
      engine: { ski: 0.35, row: 0.35, burpees: 0.3 },
      strength: { sledPush: 0.3, sledPull: 0.3, farmers: 0.2, lunges: 0.2 },
      hybrid: { wallBalls: 0.4, lunges: 0.2, burpees: 0.2, run: 0.2 },
    },
    intensity: { light: { gains: 0.4, load: 0 }, normal: { gains: 1, load: 10 }, hard: { gains: 1.4, load: 22 } },
    raceWeekGains: 0.65,
    trainability: [{ toAge: 24, mult: 1 }, { toAge: 27, mult: 0.75 }, { toAge: 31, mult: 0.3 }, { toAge: 99, mult: 0.15 }],
    declineFromAge: 32,
    declinePerWeek: 0.08,
    startSpread: 5,
  },
  fatigue: { recoveryPerWeek: 14, raceLoad: 12, racePenaltyPerPoint: 0.05, max: 100 },
  pass: {
    days: 30, tiers: 40, xpPerTier: 100, coinsPerTier: 150, premiumGemsPerTier: 12, lastTierGems: 100,
    vaultCoinsPer100Xp: 200, missionXpPerDay: 100, unlockSeason: 2,
    raceXp: { win: 100, top3: 80, top8: 60, finish: 30 },
  },
  prizes: { top8: [3000, 2000, 1500, 1200, 1000, 900, 800, 700], place9to16: 300, place17plus: 150, worldsMult: 2 },
  ranking: { points: [100, 85, 75, 65, 58, 52, 47, 43, 40, 36, 32, 28, 24, 20, 16, 12], pointsBeyond: 5, bestOf: 5 },
  divisions: {
    Open: { size: 40, mean: 44, sd: 5, prizeMult: 0.2, entryFee: 60, abroadShare: 0 },
    Pro: { size: 30, mean: 66, sd: 9, prizeMult: 1, entryFee: 180, abroadShare: 0.2, promoteTop: 3, bonusCap: 2000 },
    "Elite 15": { size: 15, mean: 86, sd: 4, prizeMult: 2, entryFee: 250, abroadShare: 0.6, keepTop: 12 },
  },
  athlete: { startOvr: 50, startAge: 21 },
  career: [
    { season: 1, phase: "Rookie", weeks: 12, races: 6, targetDays: 4, bonus: 1000 },
    { season: 2, phase: "Build", weeks: 30, races: 13, targetDays: 7, bonus: 2000 },
    { season: 3, phase: "Build", weeks: 30, races: 13, targetDays: 10, bonus: 2000 },
    { season: 4, phase: "Build", weeks: 30, races: 15, targetDays: 10, bonus: 2000 },
    { season: 5, phase: "Build", weeks: 30, races: 15, targetDays: 10, bonus: 2000 },
    { season: 6, phase: "Build", weeks: 30, races: 15, targetDays: 10, bonus: 3000 },
    { season: 7, phase: "Build", weeks: 30, races: 15, targetDays: 10, bonus: 3000 },
    { season: 8, phase: "Peak", weeks: 30, races: 15, targetDays: 14, bonus: 5000 },
    { season: 9, phase: "Peak", weeks: 30, races: 15, targetDays: 14, bonus: 5000 },
    { season: 10, phase: "Peak", weeks: 30, races: 15, targetDays: 14, bonus: 5000 },
    { season: 11, phase: "Peak", weeks: 30, races: 15, targetDays: 14, bonus: 5000 },
    { season: 12, phase: "Decline", weeks: 30, races: 15, targetDays: 10, bonus: 3000 },
    { season: 13, phase: "Decline", weeks: 30, races: 15, targetDays: 10, bonus: 3000 },
    { season: 14, phase: "Decline", weeks: 30, races: 15, targetDays: 10, bonus: 3000 },
    { season: 15, phase: "Decline", weeks: 30, races: 15, targetDays: 10, bonus: 3000 },
  ],
  staff: [
    { id: "headCoach", salary: [120, 200, 320], unlockSeason: 1, effects: { trainingGains: [0.15, 0.3, 0.5] } },
    { id: "physio", salary: [130, 190, 280], unlockSeason: 2, effects: { knockChance: [-0.2, -0.35, -0.5], recovery: [2, 3, 4] } },
    { id: "nutritionist", salary: [100, 150, 220], unlockSeason: 3, effects: { recovery: [3, 5, 7], raceDay: [0.3, 0.6, 1] } },
    { id: "runningCoach", salary: [120, 170, 250], unlockSeason: 2, eliteOnly: true, effects: { runGains: [0.2, 0.4, 0.6] } },
    { id: "psychologist", salary: [100, 150, 230], unlockSeason: 2, eliteOnly: true, effects: { raceDay: [0.5, 1, 1.5], consistency: [0.15, 0.3, 0.45] } },
  ],
  hireFees: [500, 1500, 4000],
  staffPlan: [
    [0, 0, 0, 0, 0], [1, 0, 0, 0, 0], [1, 0, 0, 0, 0], [1, 1, 0, 0, 0], [1, 1, 0, 0, 0],
    [2, 1, 0, 0, 0], [2, 1, 1, 0, 0], [2, 2, 1, 1, 0], [3, 2, 1, 1, 0], [3, 2, 2, 1, 1],
    [3, 3, 2, 1, 1], [3, 2, 1, 1, 0], [2, 2, 1, 0, 0], [2, 1, 1, 0, 0], [1, 1, 1, 0, 0],
  ],
  facilities: [
    { id: "homeGym", cost: 6000, effects: { trainingGains: 0.1 }, planSeason: 8 },
    { id: "recoveryRoom", cost: 12000, effects: { recovery: 4, knockChance: -0.1 }, planSeason: 10 },
    { id: "altitudeTent", cost: 20000, effects: { trainingGains: 0.1 }, planSeason: 11 },
    { id: "cryoChamber", cost: 30000, effects: { recovery: 4, knockChance: -0.2, decline: 0.3 }, planSeason: 12 },
  ],
  camps: {
    altitude: { cost: 5000, weeks: 4, mult: 1.3, planSeasons: [7, 8, 9, 10, 11] },
    heat: { cost: 7000, raceBonus: 2, planSeasons: [10, 11] },
  },
  gear: [
    { id: "carbonRacers", cost: 2500, raceBonus: 0.5 },
    { id: "gripGloves", cost: 800, raceBonus: 0.3 },
    { id: "kneeSleeves", cost: 1200, raceBonus: 0.3 },
  ],
  raceCities: ["Lyon", "Paris", "London", "Milan", "Valencia", "Lille", "Munich", "Stockholm", "Berlin", "Amsterdam", "Madrid", "Nice", "Barcelona", "Turin", "Bordeaux", "Marseille"],
};
