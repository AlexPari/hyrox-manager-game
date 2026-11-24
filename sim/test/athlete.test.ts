import { describe, expect, it } from "vitest";
import {
  STAT_IDS, autoPlay, bestFocus, decideWeek, defaultConfig, deserialize, expectedPlace, expectedRaceRating, knockChanceFor,
  newGame, nextFatigue, ovr, ovrGain, overall, playWeek, profiles, raceDay, raceIndexForWeek, raceLog, readiness, recordWeek,
  seasonRaces, timeForRating, ratingForTime, raceRunners, type GameEvent, type GameState, type Stats,
} from "../src";

const c = defaultConfig;
const flat = (v: number): Stats => Object.fromEntries(STAT_IDS.map((id) => [id, v])) as Stats;
const noFx = {};

describe("station stats", () => {
  it("starts every athlete at the configured overall rating, with uneven stations", () => {
    const s = newGame(1);
    expect(ovr(s)).toBeCloseTo(c.athlete.startOvr, 6);
    const values = STAT_IDS.map((id) => s.stats[id]);
    expect(Math.max(...values) - Math.min(...values)).toBeGreaterThan(1);
  });

  it("weights running as about half of the overall rating", () => {
    const st = flat(60);
    st.run = 80;
    expect(overall(c, st)).toBeGreaterThan(69);
    expect(overall(c, st)).toBeLessThan(71);
  });

  it("maps rating to finish time and back", () => {
    expect(Math.round(timeForRating(c, 100))).toBe(3200); // 53:20
    expect(ratingForTime(c, timeForRating(c, 86.4))).toBeCloseTo(86.4, 6);
  });
});

describe("training", () => {
  const base = { intensity: "normal" as const, age: 22, effects: noFx, mult: 1 };

  it("rewards training the weakest block over the balanced autopilot", () => {
    const st = flat(70);
    st.ski = st.row = st.burpees = 50;
    expect(bestFocus(c, st, base)).toBe("engine");
    expect(ovrGain(c, st, { ...base, focus: "engine" })).toBeGreaterThan(ovrGain(c, st, { ...base, focus: "balanced" }));
  });

  it("gives every block the same OVR gain when all gaps are equal", () => {
    const st = flat(60);
    const run = ovrGain(c, st, { ...base, focus: "run" });
    for (const focus of ["engine", "strength", "hybrid"] as const) expect(ovrGain(c, st, { ...base, focus })).toBeCloseTo(run, 6);
  });

  it("builds faster with hard weeks and staff, slower with age", () => {
    const st = flat(60);
    const normal = ovrGain(c, st, { ...base, focus: "run" });
    expect(ovrGain(c, st, { ...base, focus: "run", intensity: "hard" })).toBeGreaterThan(normal);
    expect(ovrGain(c, st, { ...base, focus: "run", effects: { trainingGains: 0.5 } })).toBeCloseTo(normal * 1.5, 6);
    expect(ovrGain(c, st, { ...base, focus: "run", age: 30 })).toBeLessThan(normal / 2);
  });

  it("raises fatigue with hard weeks and races, lowers it with light weeks", () => {
    expect(nextFatigue(c, 20, "hard", false, noFx)).toBeGreaterThan(20);
    expect(nextFatigue(c, 20, "normal", true, noFx)).toBeGreaterThan(20);
    expect(nextFatigue(c, 20, "light", false, noFx)).toBeLessThan(20);
    expect(nextFatigue(c, 5, "light", false, { recovery: 10 })).toBe(0);
  });

  it("makes knocks more likely as fatigue rises, less likely with a physio", () => {
    expect(knockChanceFor(c, 60, noFx)).toBeGreaterThan(knockChanceFor(c, 20, noFx) * 4);
    expect(knockChanceFor(c, 60, { knockChance: -0.5 })).toBeCloseTo(knockChanceFor(c, 60, noFx) / 2, 6);
  });

  it("applies the chosen block to the athlete's stats", () => {
    const s = newGame(2);
    s.energy = 999;
    const before = { ...s.stats };
    const r = playWeek(s, { race: false, focus: "strength", intensity: "hard" });
    expect(r.ok).toBe(true);
    expect(s.stats.sledPush).toBeGreaterThan(before.sledPush);
    expect(s.stats.run).toBe(before.run);
    expect(s.fatigue).toBeGreaterThan(0);
  });
});

describe("race day", () => {
  const sample = (pacing: "conservative" | "even" | "aggressive") => {
    const rng = { rng: 7 };
    const xs = Array.from({ length: 4000 }, () => raceDay(c, rng, { stats: flat(85), offset: 0, pacing, effects: noFx }).rating);
    const mean = xs.reduce((t, x) => t + x, 0) / xs.length;
    const sd = Math.sqrt(xs.reduce((t, x) => t + (x - mean) ** 2, 0) / xs.length);
    return { mean, sd };
  };

  it("returns splits for 9 segments plus the Roxzone that add up to the finish time", () => {
    const r = raceDay(c, { rng: 1 }, { stats: flat(80), offset: 0, pacing: "even", effects: noFx });
    expect(r.splits).toHaveLength(10);
    const sum = r.splits.reduce((t, x) => t + x.sec, 0);
    expect(Math.abs(sum - r.timeSec)).toBeLessThanOrEqual(6);
  });

  it("makes conservative pacing safer and aggressive pacing riskier", () => {
    const cons = sample("conservative");
    const even = sample("even");
    const aggr = sample("aggressive");
    expect(cons.sd).toBeLessThan(even.sd);
    expect(aggr.sd).toBeGreaterThan(even.sd);
    expect(cons.mean).toBeLessThan(even.mean);
  });

  it("reports the race time, the winner's time and the pacing in the race event", () => {
    const s = newGame(3);
    s.energy = 999;
    let week = 1;
    while (!raceIndexForWeek(s, week)) week++;
    s.week = week - 1;
    const r = playWeek(s, { race: true, pacing: "aggressive" });
    if (!r.ok) throw new Error(r.error);
    const race = r.events.find((e) => e.type === "race");
    if (race?.type !== "race") throw new Error("no race");
    expect(race.pacing).toBe("aggressive");
    expect(race.winnerSec).toBeLessThanOrEqual(race.timeSec);
    expect(race.timeSec).toBeGreaterThan(50 * 60);
  });
});

describe("decisions matter", () => {
  function peak(profile: (typeof profiles)[keyof typeof profiles], runs = 12) {
    let total = 0;
    for (let i = 0; i < runs; i++) {
      const s = newGame(500 + i);
      autoPlay(s, profile, "career");
      total += Math.max(...s.seasons.map((r) => r.ovr));
    }
    return total / runs;
  }

  it("gives a smart player a higher peak than autopilot, and staff a higher peak than none", () => {
    const smart = peak(profiles.active);
    expect(smart).toBeGreaterThan(peak(profiles.autopilot) + 2);
    expect(smart).toBeGreaterThan(peak({ ...profiles.active, followPlan: false }) + 3);
  });

  it("recommends a light taper week before the World Championships", () => {
    const s = newGame(4);
    s.season = 9;
    s.division = "Elite 15";
    const worldsWeek = s.config.career[8].weeks; // last race week of the season
    s.week = worldsWeek - 2;
    expect(decideWeek(s, profiles.active, false).intensity).toBe("light");
  });
});

describe("save migration", () => {
  it("upgrades a version 1 save to station stats", () => {
    const v2: GameState = newGame(9);
    const { stats, fatigue, ...rest } = v2;
    void stats;
    void fatigue;
    const v1 = { ...rest, version: 1, ovr: 64.5 };
    const s = deserialize(JSON.stringify(v1));
    expect(s.version).toBe(3);
    expect(s.fatigue).toBe(0);
    expect(ovr(s)).toBeCloseTo(64.5, 6);
    s.energy = 999;
    expect(playWeek(s, { race: false }).ok).toBe(true);
  });

  it("moves a version 2 save to the fixed 10 energy week", () => {
    const old = JSON.parse(JSON.stringify(newGame(9)));
    old.version = 2;
    old.config.energy = { ...old.config.energy, regenPerDay: 72 };
    delete old.config.energy.perWeek;
    const s = deserialize(JSON.stringify(old));
    expect(s.version).toBe(3);
    expect(s.config.energy.perWeek).toBe(10);
    expect(s.config.energy.regenPerDay).toBe(24);
  });
});

describe("live race playback", () => {
  it("gives every runner 16 segments and keeps the real finishing order", () => {
    const s = newGame(5);
    s.energy = 9999;
    s.coins = 99999;
    let race: Extract<GameEvent, { type: "race" }> | undefined;
    for (let w = 0; w < 12 && !race; w++) {
      const r = playWeek(s, { race: true, pacing: "even" });
      if (r.ok) race = r.events.find((e): e is Extract<GameEvent, { type: "race" }> => e.type === "race");
    }
    expect(race).toBeDefined();
    const rr = raceRunners(s.config, race!);
    expect(rr).toHaveLength(race!.fieldSize);
    const me = rr.find((x) => x.id === -1)!;
    expect(me.place).toBe(race!.place);
    expect(me.total).toBe(race!.timeSec);
    expect(Math.round(rr[0].total)).toBe(race!.place === 1 ? race!.timeSec : race!.winnerSec);
    for (const x of rr) {
      expect(x.seg).toHaveLength(16);
      expect(x.cum[16]).toBeCloseTo(x.total, 6);
    }
    for (let i = 1; i < rr.length; i++) expect(rr[i].total).toBeGreaterThan(rr[i - 1].total);
  });
});

describe("app helpers", () => {
  it("records raced weeks in the history and builds the season calendar", () => {
    const s = newGame(31);
    s.energy = 999;
    let week = 1;
    while (!raceIndexForWeek(s, week)) week++;
    s.week = week - 1;
    const r = playWeek(s, { race: true });
    if (!r.ok) throw new Error(r.error);
    recordWeek(s, r.events, s.division, s.age);
    expect(raceLog(s)).toHaveLength(1);
    const cal = seasonRaces(s);
    expect(cal[0].status).toBe("done");
    expect(cal[0].result?.place).toBe(raceLog(s)[0].place);
    expect(cal[1].status).toBe("next");
  });

  it("lowers readiness with fatigue and a knock, and predicts a place from rival levels", () => {
    const s = newGame(32);
    expect(readiness(s)).toBe(100);
    s.fatigue = 50;
    s.status = "knock";
    expect(readiness(s)).toBe(55);
    expect(expectedPlace(s, 999)).toBe(1);
    expect(expectedPlace(s, -999)).toBe(s.field.rivals.length + 1);
    expect(expectedRaceRating(s, "aggressive")).toBeGreaterThan(expectedRaceRating(s, "conservative"));
  });
});
