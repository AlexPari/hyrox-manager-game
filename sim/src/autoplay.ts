import { bestFocus } from "./athlete";
import type { Intensity, Pacing } from "./config";
import {
  advanceTime, buyCamp, buyFacility, cutInfo, divisionConfig, downgradeStaff, effects, energyPerWeek, isWorldsWeek, ovr,
  physio, playWeek, raceIndexForWeek, releaseStaff, salaryPerWeek, seasonConfig, upgradeStaff, watchAd, type WeekChoices,
} from "./game";
import { random } from "./rng";
import type { GameEvent, GameState } from "./types";

/** How a type of player behaves. Used for balancing, never in the real game. */
export interface PlayerProfile {
  id: string;
  label: string;
  /** 1 = logs in once a day (energy above the cap is lost); 2 = twice a day. */
  sessionsPerDay: 1 | 2;
  coinAdsPerDay: number;
  energyAdsPerDay: number;
  /** Share of races entered (World Championships are always entered). */
  raceRate: number;
  /** Follows the reference staff, facility and camp plan from the config. */
  followPlan: boolean;
  /** "smart" picks the best training block, manages fatigue and pacing. "autopilot" keeps the defaults. */
  decisions: "smart" | "autopilot";
}

export const profiles: Record<"casual" | "autopilot" | "active" | "hardcore", PlayerProfile> = {
  casual: { id: "casual", label: "Casual · free", sessionsPerDay: 1, coinAdsPerDay: 1, energyAdsPerDay: 0, raceRate: 0.5, followPlan: true, decisions: "autopilot" },
  autopilot: { id: "autopilot", label: "Active · autopilot", sessionsPerDay: 2, coinAdsPerDay: 3, energyAdsPerDay: 2, raceRate: 0.75, followPlan: true, decisions: "autopilot" },
  active: { id: "active", label: "Active · free", sessionsPerDay: 2, coinAdsPerDay: 3, energyAdsPerDay: 2, raceRate: 0.75, followPlan: true, decisions: "smart" },
  hardcore: { id: "hardcore", label: "Hardcore · free", sessionsPerDay: 2, coinAdsPerDay: 3, energyAdsPerDay: 3, raceRate: 1, followPlan: true, decisions: "smart" },
};

/** The week's choices a profile would make. Exported so the app can offer a "Recommended" button. */
export function decideWeek(s: GameState, profile: PlayerProfile, wantsRace: boolean): WeekChoices {
  const next = s.week + 1;
  const raceWeek = raceIndexForWeek(s, next) > 0;
  const worlds = isWorldsWeek(s, next);
  if (profile.decisions === "autopilot") {
    const intensity: Intensity = s.fatigue >= 50 || s.status !== "fit" ? "light" : "normal";
    return { race: wantsRace, focus: "balanced", intensity, pacing: "even" };
  }
  // Smart: skip ordinary races when knocked or very tired, taper before the World Championships.
  const race = wantsRace && (worlds || (s.status === "fit" && s.fatigue < 45));
  const worldsNext = isWorldsWeek(s, next + 1);
  let intensity: Intensity = "normal";
  if (s.status !== "fit" || s.fatigue >= 35 || worldsNext || worlds) intensity = "light";
  else if (s.fatigue <= 12 && !(raceWeek && race)) intensity = "hard";
  const fx = effects(s);
  const focus = bestFocus(s.config, s.stats, { intensity, age: s.age, effects: fx, mult: 1 });
  let pacing: Pacing = "even";
  if (s.status === "knock") pacing = "conservative";
  else if (worlds) {
    const best = Math.max(...s.field.rivals.map((r) => r.level));
    pacing = ovr(s) < best ? "aggressive" : "even";
  } else if (s.division === "Pro" && s.week > seasonConfig(s).weeks * 0.6 && cutInfo(s).gap < 0) pacing = "aggressive";
  return { race, focus, intensity, pacing };
}

function applyPlan(s: GameState): void {
  const c = s.config;
  if (s.week === 0) {
    const target = c.staffPlan[s.season - 1] ?? s.staff;
    for (let i = 0; i < s.staff.length; i++) {
      while (s.staff[i] < target[i]) {
        const reserve = salaryPerWeek(s) * 6;
        if (s.coins - c.hireFees[s.staff[i]] < reserve) break;
        if (!upgradeStaff(s, i).ok) break;
      }
      while (s.staff[i] > target[i]) downgradeStaff(s, i);
    }
  }
  c.facilities.forEach((f, i) => {
    if (!s.facilities[i] && s.season >= f.planSeason && s.coins - f.cost > salaryPerWeek(s) * 8) buyFacility(s, i);
  });
  const camps = c.camps;
  if (camps.altitude.planSeasons.includes(s.season) && s.week === 2 && s.campWeeksLeft === 0 && s.coins - camps.altitude.cost > salaryPerWeek(s) * 6) {
    buyCamp(s, "altitude");
  }
  if (camps.heat.planSeasons.includes(s.season) && s.week === seasonConfig(s).weeks - 4 && !s.heatCampBooked && s.coins - camps.heat.cost > salaryPerWeek(s) * 6) {
    buyCamp(s, "heat");
  }
}

/** Plays automatically like the given profile until the season (or the whole career) ends. Returns all events. */
export function autoPlay(s: GameState, profile: PlayerProfile, until: "season" | "career"): GameEvent[] {
  const events: GameEvent[] = [];
  const startSeason = s.season;
  let guard = 0;
  while (!s.ended && guard++ < 50000) {
    if (until === "season" && s.season !== startSeason) break;
    if (s.adsCoinsToday < profile.coinAdsPerDay) {
      watchAd(s, "coins");
      continue;
    }
    if (s.energy < energyPerWeek(s)) {
      if (s.adsEnergyToday < profile.energyAdsPerDay) {
        watchAd(s, "energy");
        continue;
      }
      const r = advanceTime(s, profile.sessionsPerDay === 1 ? 24 : 12, profile.sessionsPerDay);
      if (r.ok) events.push(...r.events);
      continue;
    }
    if (profile.followPlan) applyPlan(s);
    if (s.status === "knock" && s.coins >= s.config.coins.physio + salaryPerWeek(s) * 3) physio(s);
    if (s.coins < salaryPerWeek(s)) {
      // Can't pay salaries: release the most expensive staff member (the game's validated rule).
      let worst = -1;
      let worstSalary = 0;
      s.staff.forEach((tier, i) => {
        if (tier && s.config.staff[i].salary[tier - 1] > worstSalary) {
          worstSalary = s.config.staff[i].salary[tier - 1];
          worst = i;
        }
      });
      if (worst >= 0) {
        const r = releaseStaff(s, worst);
        if (r.ok) events.push(...r.events);
        continue;
      }
    }
    const next = s.week + 1;
    const raceIndex = raceIndexForWeek(s, next);
    const canAfford = s.coins - salaryPerWeek(s) >= divisionConfig(s).entryFee + s.config.coins.travelPerRaceAbroad;
    const wantsRace = raceIndex > 0 && s.status !== "injured" && (isWorldsWeek(s, next) || random(s) < profile.raceRate) && canAfford;
    const r = playWeek(s, decideWeek(s, profile, wantsRace));
    if (r.ok) events.push(...r.events);
    else {
      const t = advanceTime(s, 12, 2);
      if (t.ok) events.push(...t.events);
    }
  }
  return events;
}
