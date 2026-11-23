import {
  advanceTime, buyCamp, buyFacility, divisionConfig, downgradeStaff, energyPerWeek, isWorldsWeek, physio,
  playWeek, raceIndexForWeek, releaseStaff, salaryPerWeek, seasonConfig, upgradeStaff, watchAd,
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
}

export const profiles: Record<"casual" | "active" | "hardcore", PlayerProfile> = {
  casual: { id: "casual", label: "Casual · free", sessionsPerDay: 1, coinAdsPerDay: 1, energyAdsPerDay: 0, raceRate: 0.5, followPlan: false },
  active: { id: "active", label: "Active · free", sessionsPerDay: 2, coinAdsPerDay: 3, energyAdsPerDay: 2, raceRate: 0.75, followPlan: true },
  hardcore: { id: "hardcore", label: "Hardcore · free", sessionsPerDay: 2, coinAdsPerDay: 3, energyAdsPerDay: 3, raceRate: 1, followPlan: true },
};

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
    const race = raceIndex > 0 && s.status !== "injured" && (isWorldsWeek(s, next) || random(s) < profile.raceRate) && canAfford;
    const r = playWeek(s, { race });
    if (r.ok) events.push(...r.events);
    else {
      const t = advanceTime(s, 12, 2);
      if (t.ok) events.push(...t.events);
    }
  }
  return events;
}
