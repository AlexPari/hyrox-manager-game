// Every tunable number of the game lives here. The same shape can later come from Remote Config.

export type DivisionName = "Open" | "Pro" | "Elite 15";

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
  /** Target real days to play the season for an active free player. Drives the energy cost of a week. */
  targetDays: number;
  bonus: number;
}

export interface StaffRoleConfig {
  id: "headCoach" | "physio" | "nutritionist" | "runningCoach" | "psychologist";
  salary: [number, number, number];
  unlockSeason: number;
  /** Only available once the athlete has reached Elite 15. */
  eliteOnly?: boolean;
  effect: "trainingGains" | "knockChance" | "raceDay";
  values: [number, number, number];
}

export interface FacilityConfig {
  id: "homeGym" | "recoveryRoom" | "altitudeTent" | "cryoChamber";
  cost: number;
  gains?: number;
  knock?: number;
  /** Season in the reference plan (used by auto-play). */
  planSeason: number;
}

export interface GearConfig {
  id: "carbonRacers" | "gripGloves" | "kneeSleeves";
  cost: number;
  raceBonus: number;
}

export interface Config {
  energy: { cap: number; regenPerDay: number; vipCapBonus: number; adEnergy: number; adEnergyMaxPerDay: number; plus20Gems: number; refillGems: number };
  coins: { start: number; adCoins: number; adCoinsMaxPerDay: number; physio: number; travelPerRaceAbroad: number };
  gems: { start: number; vipGemsPerDay: number; iceBath: number; booster: number; coachCall: number; fastHeal: number };
  prices: { vipUsd: number; passUsd: number; gemPacks: Array<{ gems: number; usd: number }> };
  injury: { knockChance: number; injuryIfRacingKnocked: number; injuryWeeks: number; knockPenalty: number };
  boosts: { boosterMult: number; iceBathBonus: number; coachCallBonus: number };
  pass: {
    days: number; tiers: number; xpPerTier: number; coinsPerTier: number; premiumGemsPerTier: number; lastTierGems: number;
    vaultCoinsPer100Xp: number; missionXpPerDay: number; unlockSeason: number;
    raceXp: { win: number; top3: number; top8: number; finish: number };
  };
  /** Pro base prize by place: 1..8, then 9-16, then 17+. */
  prizes: { top8: number[]; place9to16: number; place17plus: number; worldsMult: number };
  ranking: { points: number[]; pointsBeyond: number; bestOf: number };
  divisions: Record<DivisionName, DivisionConfig>;
  raceNoise: number;
  athlete: { startOvr: number; startAge: number; gainPerWeek: Array<{ toAge: number; gain: number }> };
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

/** Snapshot of the balancing sheet and simulator (23 Nov 2026). */
export const defaultConfig: Config = {
  energy: { cap: 50, regenPerDay: 72, vipCapBonus: 15, adEnergy: 5, adEnergyMaxPerDay: 3, plus20Gems: 25, refillGems: 50 },
  coins: { start: 1000, adCoins: 200, adCoinsMaxPerDay: 3, physio: 300, travelPerRaceAbroad: 500 },
  gems: { start: 120, vipGemsPerDay: 10, iceBath: 20, booster: 30, coachCall: 15, fastHeal: 40 },
  prices: { vipUsd: 9.99, passUsd: 9.99, gemPacks: [{ gems: 80, usd: 0.99 }, { gems: 450, usd: 4.99 }, { gems: 1200, usd: 9.99 }] },
  injury: { knockChance: 0.15, injuryIfRacingKnocked: 0.25, injuryWeeks: 3, knockPenalty: 3 },
  boosts: { boosterMult: 1.5, iceBathBonus: 1.5, coachCallBonus: 0.5 },
  pass: {
    days: 30, tiers: 40, xpPerTier: 100, coinsPerTier: 150, premiumGemsPerTier: 12, lastTierGems: 100,
    vaultCoinsPer100Xp: 200, missionXpPerDay: 100, unlockSeason: 2,
    raceXp: { win: 100, top3: 80, top8: 60, finish: 30 },
  },
  prizes: { top8: [3000, 2000, 1500, 1200, 1000, 900, 800, 700], place9to16: 300, place17plus: 150, worldsMult: 2 },
  ranking: { points: [100, 85, 75, 65, 58, 52, 47, 43, 40, 36, 32, 28, 24, 20, 16, 12], pointsBeyond: 5, bestOf: 5 },
  divisions: {
    Open: { size: 40, mean: 44, sd: 5, prizeMult: 0.2, entryFee: 60, abroadShare: 0 },
    Pro: { size: 30, mean: 64, sd: 9, prizeMult: 1, entryFee: 180, abroadShare: 0.2, promoteTop: 3, bonusCap: 2000 },
    "Elite 15": { size: 15, mean: 85, sd: 4, prizeMult: 2, entryFee: 250, abroadShare: 0.6, keepTop: 12 },
  },
  raceNoise: 2.5,
  athlete: {
    startOvr: 50, startAge: 21,
    gainPerWeek: [{ toAge: 24, gain: 0.2 }, { toAge: 27, gain: 0.12 }, { toAge: 31, gain: 0.05 }, { toAge: 99, gain: -0.08 }],
  },
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
    { id: "headCoach", salary: [120, 200, 320], unlockSeason: 1, effect: "trainingGains", values: [0.1, 0.2, 0.35] },
    { id: "physio", salary: [130, 190, 280], unlockSeason: 2, effect: "knockChance", values: [-0.2, -0.35, -0.5] },
    { id: "nutritionist", salary: [100, 150, 220], unlockSeason: 3, effect: "raceDay", values: [0.5, 1, 1.5] },
    { id: "runningCoach", salary: [120, 170, 250], unlockSeason: 2, eliteOnly: true, effect: "trainingGains", values: [0.05, 0.1, 0.15] },
    { id: "psychologist", salary: [100, 150, 230], unlockSeason: 2, eliteOnly: true, effect: "raceDay", values: [0.5, 1, 1.5] },
  ],
  hireFees: [500, 1500, 4000],
  staffPlan: [
    [0, 0, 0, 0, 0], [1, 0, 0, 0, 0], [1, 0, 0, 0, 0], [1, 1, 0, 0, 0], [1, 1, 0, 0, 0],
    [2, 1, 0, 0, 0], [2, 1, 1, 0, 0], [2, 2, 1, 1, 0], [3, 2, 1, 1, 0], [3, 2, 2, 1, 1],
    [3, 3, 2, 1, 1], [3, 2, 1, 1, 0], [2, 2, 1, 0, 0], [2, 1, 1, 0, 0], [1, 1, 1, 0, 0],
  ],
  facilities: [
    { id: "homeGym", cost: 6000, gains: 0.03, planSeason: 8 },
    { id: "recoveryRoom", cost: 12000, knock: -0.1, planSeason: 10 },
    { id: "altitudeTent", cost: 20000, gains: 0.05, planSeason: 11 },
    { id: "cryoChamber", cost: 30000, knock: -0.3, planSeason: 12 },
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
