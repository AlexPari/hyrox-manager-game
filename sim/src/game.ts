import { defaultConfig, type Config, type DivisionConfig, type SeasonConfig } from "./config";
import { gauss, random, seedFrom } from "./rng";
import type { ActionResult, CurrentSeason, ErrorCode, GameEvent, GameState, SeasonOutcome, SeasonRecord } from "./types";

const clone = <T>(o: T): T => JSON.parse(JSON.stringify(o));
const fail = (error: ErrorCode): ActionResult => ({ ok: false, error });
const done = (events: GameEvent[] = []): ActionResult => ({ ok: true, events });

// ---------------------------------------------------------------- read helpers

export function seasonConfig(s: GameState): SeasonConfig {
  return s.config.career[Math.min(s.season, s.config.career.length) - 1];
}

export function divisionConfig(s: GameState): DivisionConfig {
  return s.config.divisions[s.division];
}

/** Daily energy of an active free player (2 sessions, 2 energy ads): the reference for season length. */
export function referenceEnergyPerDay(c: Config): number {
  return Math.min(c.energy.regenPerDay, c.energy.cap * 2) + c.energy.adEnergy * 2;
}

export function energyPerWeek(s: GameState, season: SeasonConfig = seasonConfig(s)): number {
  return Math.round((season.targetDays * referenceEnergyPerDay(s.config)) / season.weeks);
}

export function isVip(s: GameState): boolean {
  return s.vipUntilDay > s.day;
}

export function energyCap(s: GameState): number {
  return s.config.energy.cap + (isVip(s) ? s.config.energy.vipCapBonus : 0);
}

export function raceInterval(s: GameState): number {
  const z = seasonConfig(s);
  return Math.max(1, Math.floor(z.weeks / z.races));
}

/** Race number (1-based) held in the given week of the season, or 0 for a training week. */
export function raceIndexForWeek(s: GameState, week: number): number {
  const iv = raceInterval(s);
  if (week % iv !== 0) return 0;
  const i = week / iv;
  return i <= seasonConfig(s).races ? i : 0;
}

export function isWorldsWeek(s: GameState, week: number): boolean {
  return s.division === "Elite 15" && raceIndexForWeek(s, week) === seasonConfig(s).races;
}

export function salaryPerWeek(s: GameState): number {
  return s.staff.reduce((t, tier, i) => t + (tier ? s.config.staff[i].salary[tier - 1] : 0), 0);
}

function staffValue(s: GameState, index: number): number {
  const tier = s.staff[index];
  return tier ? s.config.staff[index].values[tier - 1] : 0;
}

function staffEffectSum(s: GameState, effect: "trainingGains" | "knockChance" | "raceDay"): number {
  return s.config.staff.reduce((t, role, i) => t + (role.effect === effect ? staffValue(s, i) : 0), 0);
}

export function gearBonus(s: GameState): number {
  return s.gear.reduce((t, owned, i) => t + (owned ? s.config.gear[i].raceBonus : 0), 0);
}

export function prizeForPlace(c: Config, place: number): number {
  if (place <= c.prizes.top8.length) return c.prizes.top8[place - 1];
  return place <= 16 ? c.prizes.place9to16 : c.prizes.place17plus;
}

export function rankingPoints(c: Config, place: number): number {
  return place <= c.ranking.points.length ? c.ranking.points[place - 1] : c.ranking.pointsBeyond;
}

function bestOf(c: Config, results: number[]): number {
  return [...results].sort((a, b) => b - a).slice(0, c.ranking.bestOf).reduce((t, v) => t + v, 0);
}

function baseGainForAge(c: Config, age: number): number {
  for (const g of c.athlete.gainPerWeek) if (age <= g.toAge) return g.gain;
  return 0;
}

export function knockChance(s: GameState): number {
  let k = s.config.injury.knockChance * (1 + staffEffectSum(s, "knockChance"));
  s.config.facilities.forEach((f, i) => {
    if (s.facilities[i] && f.knock) k *= 1 + f.knock;
  });
  return Math.max(0, k);
}

export interface Standings {
  points: number;
  rank: number;
  fieldSize: number;
  /** Rivals' Best-N totals, highest first. */
  rivals: number[];
}

export function standings(s: GameState): Standings {
  const points = bestOf(s.config, s.field.mine);
  const rivals = s.field.rivals.map((r) => bestOf(s.config, r.points)).sort((a, b) => b - a);
  return { points, rank: 1 + rivals.filter((t) => t > points).length, fieldSize: rivals.length + 1, rivals };
}

export interface CutInfo {
  standings: Standings;
  /** Promotion cut (Pro) or keep-the-spot cut (Elite 15). 0 when there is none (Rookie season). */
  cut: number;
  /** Positive: points above the first athlete outside the cut. Negative: points behind the cut line. */
  gap: number;
}

export function cutInfo(s: GameState): CutInfo {
  const st = standings(s);
  const d = divisionConfig(s);
  const cut = s.division === "Pro" ? d.promoteTop ?? 0 : s.division === "Elite 15" ? d.keepTop ?? 0 : 0;
  if (!cut) return { standings: st, cut: 0, gap: 0 };
  return { standings: st, cut, gap: st.points - (st.rivals[cut - 1] ?? 0) };
}

// ---------------------------------------------------------------- setup

function newCurrentSeason(day: number): CurrentSeason {
  return { races: 0, wins: 0, podiums: 0, best: null, prizes: 0, worlds: null, startDay: day };
}

function createField(s: GameState): void {
  const d = divisionConfig(s);
  s.field = {
    rivals: Array.from({ length: d.size - 1 }, () => ({ level: d.mean + gauss(s) * d.sd, points: [] })),
    mine: [],
  };
}

export function newGame(seed: number, config: Config = defaultConfig): GameState {
  const c = clone(config);
  const s: GameState = {
    version: 1,
    config: c,
    rng: seedFrom(seed),
    season: 1,
    week: 0,
    day: 0,
    age: c.athlete.startAge,
    ovr: c.athlete.startOvr,
    energy: c.energy.cap,
    coins: c.coins.start,
    gems: c.gems.start,
    usd: 0,
    division: "Open",
    everElite: false,
    field: { rivals: [], mine: [] },
    staff: c.staff.map(() => 0),
    facilities: c.facilities.map(() => false),
    gear: c.gear.map(() => false),
    campWeeksLeft: 0,
    heatCampBooked: false,
    status: "fit",
    injuryWeeksLeft: 0,
    adsCoinsToday: 0,
    adsEnergyToday: 0,
    weeksPlayedToday: 0,
    vipUntilDay: -1,
    pass: { active: false, number: 0, startDay: 0, xp: 0, tiers: 0, premium: false },
    passHistory: [],
    abroadRoll: 0,
    current: newCurrentSeason(0),
    seasons: [],
    ended: false,
  };
  s.abroadRoll = random(s);
  createField(s);
  return s;
}

// ---------------------------------------------------------------- season pass

function startPass(s: GameState, ev: GameEvent[]): void {
  if (s.season < s.config.pass.unlockSeason || s.ended) return;
  s.pass = { active: true, number: s.pass.number + 1, startDay: s.day, xp: 0, tiers: 0, premium: false };
  ev.push({ type: "passStarted", number: s.pass.number });
}

function grantTiers(s: GameState, ev: GameEvent[]): void {
  const p = s.pass;
  const P = s.config.pass;
  const target = Math.min(P.tiers, Math.floor(p.xp / P.xpPerTier));
  while (p.tiers < target) {
    p.tiers++;
    s.coins += P.coinsPerTier;
    if (p.premium) s.gems += P.premiumGemsPerTier;
    ev.push({ type: "passTier", tier: p.tiers });
    if (p.tiers === P.tiers) {
      s.gems += P.lastTierGems;
      ev.push({ type: "passComplete", gems: P.lastTierGems });
    }
  }
}

function endPass(s: GameState, ev: GameEvent[]): void {
  const p = s.pass;
  const P = s.config.pass;
  const extra = Math.max(0, p.xp - P.tiers * P.xpPerTier);
  const vault = Math.floor((extra / 100) * P.vaultCoinsPer100Xp);
  s.coins += vault;
  s.passHistory.push({ number: p.number, tiers: p.tiers, premium: p.premium, vault, endDay: s.day, season: s.season });
  ev.push({ type: "passEnded", number: p.number, tiers: p.tiers, premium: p.premium, vault });
  p.active = false;
}

// ---------------------------------------------------------------- time

function endOfDay(s: GameState, ev: GameEvent[]): void {
  const p = s.pass;
  if (p.active) {
    const share = s.weeksPlayedToday >= 2 ? 1 : s.weeksPlayedToday === 1 ? 0.5 : 0;
    const xp = s.config.pass.missionXpPerDay * share;
    if (xp > 0) {
      p.xp += xp;
      grantTiers(s, ev);
    }
  }
  s.weeksPlayedToday = 0;
  s.adsCoinsToday = 0;
  s.adsEnergyToday = 0;
  if (isVip(s)) s.gems += s.config.gems.vipGemsPerDay;
  if (p.active && s.day - p.startDay >= s.config.pass.days) {
    endPass(s, ev);
    startPass(s, ev);
  }
}

/**
 * Lets real time pass. 12 h = one session's regen. 24 h with one session models a player who logs in once a day
 * (energy above the cap is lost); 24 h with two sessions is two 12 h steps.
 */
export function advanceTime(s: GameState, hours: 12 | 24, sessions: 1 | 2 = 2): ActionResult {
  const ev: GameEvent[] = [];
  const steps = hours === 24 && sessions === 1 ? [24] : hours === 24 ? [12, 12] : [12];
  for (const h of steps) {
    const regen = (s.config.energy.regenPerDay * h) / 24;
    s.energy = Math.max(s.energy, Math.min(energyCap(s), s.energy + regen));
    const before = s.day;
    s.day = Math.round((s.day + h / 24) * 2) / 2;
    for (let k = Math.floor(before) + 1; k <= Math.floor(s.day); k++) endOfDay(s, ev);
  }
  return done(ev);
}

// ---------------------------------------------------------------- the week

export interface WeekChoices {
  /** Enter this week's race (ignored on training weeks). */
  race: boolean;
  booster?: boolean;
  iceBath?: boolean;
  coachCall?: boolean;
}

export function playWeek(s: GameState, choice: WeekChoices): ActionResult {
  if (s.ended) return fail("careerOver");
  const c = s.config;
  const E = energyPerWeek(s);
  if (s.energy < E) return fail("notEnoughEnergy");
  const salaries = salaryPerWeek(s);
  if (s.coins < salaries) return fail("cannotPaySalaries");
  const week = s.week + 1;
  const raceIndex = raceIndexForWeek(s, week);
  const racing = raceIndex > 0 && choice.race;
  const gemCost = (choice.booster ? c.gems.booster : 0) + (racing ? (choice.iceBath ? c.gems.iceBath : 0) + (choice.coachCall ? c.gems.coachCall : 0) : 0);
  if (s.gems < gemCost) return fail("notEnoughGems");
  const d = divisionConfig(s);
  const abroad = racing && s.abroadRoll < d.abroadShare;
  const fee = racing ? d.entryFee : 0;
  const travel = abroad ? c.coins.travelPerRaceAbroad : 0;
  if (racing && s.status === "injured") return fail("injured");
  if (racing && s.coins - salaries < fee + travel) return fail("notEnoughCoins");

  const ev: GameEvent[] = [];
  s.energy -= E;
  s.coins -= salaries;
  s.gems -= gemCost;
  s.week = week;
  s.weeksPlayedToday++;

  // Training
  let gain = baseGainForAge(c, s.age);
  let mult = 1 + staffEffectSum(s, "trainingGains");
  c.facilities.forEach((f, i) => {
    if (s.facilities[i] && f.gains) mult += f.gains;
  });
  if (gain > 0) gain *= mult * (choice.booster ? c.boosts.boosterMult : 1) * (s.campWeeksLeft > 0 ? c.camps.altitude.mult : 1);
  else gain *= 1 - (mult - 1) / 2; // staff and facilities slow the decline
  s.ovr += gain;
  if (s.campWeeksLeft > 0) s.campWeeksLeft--;
  if (s.status === "injured") {
    s.injuryWeeksLeft--;
    if (s.injuryWeeksLeft <= 0) {
      s.status = "fit";
      ev.push({ type: "recovered" });
    }
  }

  if (racing) {
    s.coins -= fee + travel;
    const worlds = isWorldsWeek(s, week);
    const score =
      s.ovr + gearBonus(s) + staffEffectSum(s, "raceDay") +
      (choice.iceBath ? c.boosts.iceBathBonus : 0) + (choice.coachCall ? c.boosts.coachCallBonus : 0) +
      (worlds && s.heatCampBooked ? c.camps.heat.raceBonus : 0) - (s.status === "knock" ? c.injury.knockPenalty : 0) +
      gauss(s) * c.raceNoise;
    const place = runRace(s, score)!;
    const prize = Math.round(prizeForPlace(c, place) * d.prizeMult * (worlds ? c.prizes.worldsMult : 1));
    s.coins += prize;
    let xp = 0;
    if (s.pass.active) {
      const X = c.pass.raceXp;
      xp = place === 1 ? X.win : place <= 3 ? X.top3 : place <= 8 ? X.top8 : X.finish;
      s.pass.xp += xp;
    }
    const cs = s.current;
    cs.races++;
    cs.prizes += prize;
    if (place === 1) cs.wins++;
    if (place <= 3) cs.podiums++;
    cs.best = cs.best === null ? place : Math.min(cs.best, place);
    if (worlds) {
      cs.worlds = place;
      s.heatCampBooked = false;
    }
    const city = worlds ? "World Championships" : c.raceCities[(s.season * 7 + raceIndex) % c.raceCities.length];
    ev.push({ type: "race", season: s.season, week, raceIndex, city, worlds, abroad, place, fieldSize: d.size, prize, xp, travel });
    if (xp) grantTiers(s, ev);
    if (worlds && place === 1) ev.push({ type: "worldChampion", age: s.age });
    if (s.status === "knock" && random(s) < c.injury.injuryIfRacingKnocked) {
      s.status = "injured";
      s.injuryWeeksLeft = c.injury.injuryWeeks;
      ev.push({ type: "injured", weeks: c.injury.injuryWeeks });
    } else if (s.status === "fit" && random(s) < knockChance(s)) {
      s.status = "knock";
      ev.push({ type: "knock" });
    }
  } else if (raceIndex > 0) {
    runRace(s, null); // rivals still race and score ranking points
    ev.push({ type: "raceSkipped", raceIndex });
  }

  s.abroadRoll = random(s);
  if (s.week >= seasonConfig(s).weeks) endSeason(s, ev);
  return done(ev);
}

/** Runs one race for the persistent field. Returns the player's place, or null if the player didn't race. */
function runRace(s: GameState, myScore: number | null): number | null {
  const n = s.config.raceNoise;
  const perf: Array<{ i: number; v: number }> = s.field.rivals.map((r, i) => ({ i, v: r.level + gauss(s) * n }));
  if (myScore !== null) perf.push({ i: -1, v: myScore });
  perf.sort((a, b) => b.v - a.v);
  let mine: number | null = null;
  perf.forEach((x, idx) => {
    const pts = rankingPoints(s.config, idx + 1);
    if (x.i === -1) {
      mine = idx + 1;
      s.field.mine.push(pts);
    } else s.field.rivals[x.i].points.push(pts);
  });
  return mine;
}

function endSeason(s: GameState, ev: GameEvent[]): void {
  const z = seasonConfig(s);
  const d = divisionConfig(s);
  const ci = cutInfo(s);
  const st = ci.standings;
  const bonus = d.bonusCap !== undefined ? Math.min(z.bonus, d.bonusCap) : z.bonus;
  s.coins += bonus;
  let next = s.division;
  let outcome: SeasonOutcome;
  if (s.division === "Open") {
    next = "Pro";
    outcome = "turnPro";
  } else if (s.division === "Pro") {
    if (st.rank <= (d.promoteTop ?? 0)) {
      next = "Elite 15";
      outcome = "qualified";
    } else outcome = "missedCut";
  } else if (st.rank > (d.keepTop ?? d.size)) {
    next = "Pro";
    outcome = "relegated";
  } else outcome = "keptSpot";
  const cs = s.current;
  const record: SeasonRecord = {
    season: s.season, age: s.age, phase: z.phase, division: s.division, rank: st.rank, fieldSize: st.fieldSize,
    points: st.points, outcome, gapToCut: ci.gap, nextDivision: next, realDays: +(s.day - cs.startDay).toFixed(1),
    races: cs.races, wins: cs.wins, podiums: cs.podiums, best: cs.best, worlds: cs.worlds, prizes: cs.prizes, bonus,
    coins: Math.round(s.coins), gems: Math.round(s.gems), ovr: +s.ovr.toFixed(1), usd: +s.usd.toFixed(2),
  };
  s.seasons.push(record);
  ev.push({ type: "seasonEnd", record });
  s.season++;
  s.age++;
  s.week = 0;
  s.division = next;
  if (next === "Elite 15") s.everElite = true;
  if (s.season > s.config.career.length) {
    s.ended = true;
    if (s.pass.active) endPass(s, ev);
    ev.push({ type: "careerOver" });
    return;
  }
  s.current = newCurrentSeason(s.day);
  createField(s);
  if (s.season >= s.config.pass.unlockSeason && !s.pass.active) startPass(s, ev);
}

// ---------------------------------------------------------------- economy actions

export function watchAd(s: GameState, kind: "coins" | "energy"): ActionResult {
  const c = s.config;
  if (kind === "coins") {
    if (s.adsCoinsToday >= c.coins.adCoinsMaxPerDay) return fail("limitReached");
    s.adsCoinsToday++;
    s.coins += c.coins.adCoins;
  } else {
    if (s.adsEnergyToday >= c.energy.adEnergyMaxPerDay) return fail("limitReached");
    s.adsEnergyToday++;
    s.energy += c.energy.adEnergy; // can go above the cap
  }
  return done();
}

export function buyEnergy(s: GameState, kind: "plus20" | "refill"): ActionResult {
  const c = s.config.energy;
  if (kind === "plus20") {
    if (s.gems < c.plus20Gems) return fail("notEnoughGems");
    s.gems -= c.plus20Gems;
    s.energy += 20;
  } else {
    if (s.energy >= energyCap(s)) return fail("notAvailable");
    if (s.gems < c.refillGems) return fail("notEnoughGems");
    s.gems -= c.refillGems;
    s.energy = energyCap(s);
  }
  return done();
}

export function isStaffLocked(s: GameState, index: number): boolean {
  const role = s.config.staff[index];
  return s.season < role.unlockSeason || (!!role.eliteOnly && !s.everElite);
}

export function upgradeStaff(s: GameState, index: number): ActionResult {
  const role = s.config.staff[index];
  const tier = s.staff[index];
  if (tier >= 3) return fail("limitReached");
  if (isStaffLocked(s, index)) return fail("locked");
  const fee = s.config.hireFees[tier];
  if (s.coins < fee) return fail("notEnoughCoins");
  s.coins -= fee;
  s.staff[index] = tier + 1;
  return done([{ type: "staffHired", role: role.id, tier: tier + 1, fee }]);
}

/** Immediate, no refund. Releasing the head coach falls back to the free club coach. */
export function releaseStaff(s: GameState, index: number): ActionResult {
  if (!s.staff[index]) return fail("notAvailable");
  s.staff[index] = 0;
  return done([{ type: "staffReleased", role: s.config.staff[index].id }]);
}

/** Moves a role down one tier (used by the reference plan in the decline years). */
export function downgradeStaff(s: GameState, index: number): ActionResult {
  if (!s.staff[index]) return fail("notAvailable");
  s.staff[index]--;
  return done();
}

export function buyFacility(s: GameState, index: number): ActionResult {
  const f = s.config.facilities[index];
  if (s.facilities[index]) return fail("alreadyOwned");
  if (s.coins < f.cost) return fail("notEnoughCoins");
  s.coins -= f.cost;
  s.facilities[index] = true;
  return done();
}

export function buyCamp(s: GameState, kind: "altitude" | "heat"): ActionResult {
  const camp = s.config.camps[kind];
  if (kind === "altitude" && s.campWeeksLeft > 0) return fail("notAvailable");
  if (kind === "heat" && (s.heatCampBooked || s.division !== "Elite 15")) return fail("notAvailable");
  if (s.coins < camp.cost) return fail("notEnoughCoins");
  s.coins -= camp.cost;
  if (kind === "altitude") s.campWeeksLeft = s.config.camps.altitude.weeks;
  else s.heatCampBooked = true;
  return done();
}

export function buyGear(s: GameState, index: number): ActionResult {
  const g = s.config.gear[index];
  if (s.gear[index]) return fail("alreadyOwned");
  if (s.coins < g.cost) return fail("notEnoughCoins");
  s.coins -= g.cost;
  s.gear[index] = true;
  return done();
}

export function physio(s: GameState): ActionResult {
  if (s.status !== "knock") return fail("notAvailable");
  if (s.coins < s.config.coins.physio) return fail("notEnoughCoins");
  s.coins -= s.config.coins.physio;
  s.status = "fit";
  return done();
}

export function fastHeal(s: GameState): ActionResult {
  if (s.status === "fit") return fail("notAvailable");
  if (s.gems < s.config.gems.fastHeal) return fail("notEnoughGems");
  s.gems -= s.config.gems.fastHeal;
  s.status = "fit";
  s.injuryWeeksLeft = 0;
  return done();
}

// Real-money purchases: the store flow happens outside the sim; these apply the reward.

export function buyGemPack(s: GameState, index: number): ActionResult {
  const pack = s.config.prices.gemPacks[index];
  if (!pack) return fail("notAvailable");
  s.gems += pack.gems;
  s.usd += pack.usd;
  return done();
}

export function buyVip(s: GameState): ActionResult {
  s.vipUntilDay = Math.max(s.vipUntilDay, s.day) + 30;
  s.usd += s.config.prices.vipUsd;
  return done();
}

/** Premium gems are granted retroactively for tiers already reached. */
export function buyPassPremium(s: GameState): ActionResult {
  if (!s.pass.active || s.pass.premium) return fail("notAvailable");
  s.pass.premium = true;
  s.usd += s.config.prices.passUsd;
  s.gems += s.pass.tiers * s.config.pass.premiumGemsPerTier;
  return done();
}
