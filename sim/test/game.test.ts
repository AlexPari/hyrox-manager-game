import { describe, expect, it } from "vitest";
import {
  advanceTime, autoPlay, buyPassPremium, defaultConfig, deserialize, energyPerWeek, fastHeal, isStaffLocked,
  newGame, physio, playWeek, profiles, raceIndexForWeek, serialize, upgradeStaff, type GameState,
} from "../src";

function freshEnergy(s: GameState) {
  s.energy = 999;
}

describe("determinism", () => {
  it("replays the exact same career from the same seed", () => {
    const a = newGame(42);
    const b = newGame(42);
    autoPlay(a, profiles.active, "career");
    autoPlay(b, profiles.active, "career");
    expect(serialize(a)).toEqual(serialize(b));
  });

  it("gives a different career with another seed", () => {
    const a = newGame(1);
    const b = newGame(2);
    autoPlay(a, profiles.active, "career");
    autoPlay(b, profiles.active, "career");
    expect(serialize(a)).not.toEqual(serialize(b));
  });
});

describe("energy and time", () => {
  it("derives the week cost from each season's target real days", () => {
    const s = newGame(1);
    expect(energyPerWeek(s)).toBe(27); // S1: 4 days x 82 energy / 12 weeks
    s.season = 8;
    expect(energyPerWeek(s)).toBe(38); // S8: 14 days x 82 / 30 weeks
  });

  it("refuses a week without enough energy and leaves the state untouched", () => {
    const s = newGame(1);
    s.energy = 5;
    const before = serialize(s);
    expect(playWeek(s, { race: false })).toEqual({ ok: false, error: "notEnoughEnergy" });
    expect(serialize(s)).toEqual(before);
  });

  it("caps regeneration at the energy cap but keeps rewards above it", () => {
    const s = newGame(1);
    s.energy = 60;
    advanceTime(s, 12);
    expect(s.energy).toBe(60);
    s.energy = 10;
    advanceTime(s, 24, 1);
    expect(s.energy).toBe(defaultConfig.energy.cap);
  });
});

describe("season pass", () => {
  it("has no pass in the Rookie season and starts one with season 2", () => {
    const s = newGame(3);
    expect(s.pass.active).toBe(false);
    autoPlay(s, profiles.active, "season");
    expect(s.season).toBe(2);
    expect(s.pass.active).toBe(true);
    expect(s.pass.number).toBe(1);
  });

  it("opens the vault when the pass ends: extra XP becomes coins", () => {
    const s = newGame(4);
    s.season = 2;
    s.pass = { active: true, number: 1, startDay: 0, xp: 4250, tiers: 40, premium: false };
    const coins = s.coins;
    for (let d = 0; d < 30; d++) advanceTime(s, 24);
    const ended = s.passHistory[0];
    expect(ended.vault).toBe(500); // 250 extra XP x 200 coins per 100 XP
    expect(s.coins).toBeGreaterThanOrEqual(coins + 500);
    expect(s.pass.number).toBe(2); // the next pass starts right away
  });

  it("grants premium gems retroactively for tiers already reached", () => {
    const s = newGame(5);
    s.pass = { active: true, number: 1, startDay: 0, xp: 1000, tiers: 10, premium: false };
    const gems = s.gems;
    expect(buyPassPremium(s).ok).toBe(true);
    expect(s.gems).toBe(gems + 10 * defaultConfig.pass.premiumGemsPerTier);
  });
});

describe("Elite 15 qualification", () => {
  function lastWeekOf(s: GameState) {
    s.week = s.config.career[s.season - 1].weeks - 1;
    freshEnergy(s);
  }

  it("invites the top 3 of the Pro ranking to Elite 15", () => {
    const s = newGame(6);
    s.season = 3;
    s.division = "Pro";
    s.field.rivals.forEach((r) => (r.points = []));
    s.field.mine = [100, 100, 100, 100, 100];
    lastWeekOf(s);
    const r = playWeek(s, { race: false });
    expect(r.ok).toBe(true);
    expect(s.seasons.at(-1)!.outcome).toBe("qualified");
    expect(s.division).toBe("Elite 15");
    expect(s.everElite).toBe(true);
  });

  it("keeps a Pro athlete outside the top 3 in Pro", () => {
    const s = newGame(7);
    s.season = 3;
    s.division = "Pro";
    s.field.rivals.forEach((r, i) => (r.points = i < 5 ? [100, 100, 100, 100, 100] : []));
    s.field.mine = [40];
    lastWeekOf(s);
    playWeek(s, { race: false });
    expect(s.seasons.at(-1)!.outcome).toBe("missedCut");
    expect(s.division).toBe("Pro");
  });

  it("relegates the bottom 3 of Elite 15", () => {
    const s = newGame(8);
    s.season = 9;
    s.division = "Elite 15";
    s.everElite = true;
    s.field.rivals.forEach((r) => (r.points = [50, 50, 50, 50, 50]));
    s.field.mine = [];
    lastWeekOf(s);
    playWeek(s, { race: false });
    expect(s.seasons.at(-1)!.outcome).toBe("relegated");
    expect(s.division).toBe("Pro");
  });

  it("locks the Elite-only staff until the athlete has reached Elite 15", () => {
    const s = newGame(9);
    s.season = 5;
    s.coins = 99999;
    const running = s.config.staff.findIndex((r) => r.id === "runningCoach");
    expect(isStaffLocked(s, running)).toBe(true);
    expect(upgradeStaff(s, running)).toEqual({ ok: false, error: "locked" });
    s.everElite = true;
    expect(upgradeStaff(s, running).ok).toBe(true);
  });
});

describe("weekly rules", () => {
  it("blocks the week when salaries can't be paid", () => {
    const s = newGame(10);
    s.season = 3;
    s.staff[0] = 3;
    s.coins = 100;
    freshEnergy(s);
    expect(playWeek(s, { race: false })).toEqual({ ok: false, error: "cannotPaySalaries" });
  });

  it("returns a race result with a valid place on race weeks", () => {
    const s = newGame(11);
    freshEnergy(s);
    let week = 1;
    while (!raceIndexForWeek(s, week)) week++;
    s.week = week - 1;
    const r = playWeek(s, { race: true });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const race = r.events.find((e) => e.type === "race");
    expect(race).toBeDefined();
    if (race?.type !== "race") return;
    expect(race.place).toBeGreaterThanOrEqual(1);
    expect(race.place).toBeLessThanOrEqual(race.fieldSize);
  });

  it("clears a knock with the physio and an injury with fast heal", () => {
    const s = newGame(12);
    s.status = "knock";
    expect(physio(s).ok).toBe(true);
    expect(s.status).toBe("fit");
    s.status = "injured";
    s.injuryWeeksLeft = 3;
    expect(fastHeal(s).ok).toBe(true);
    expect(s.status).toBe("fit");
  });
});

describe("saves", () => {
  it("round-trips through serialize and deserialize", () => {
    const s = newGame(13);
    autoPlay(s, profiles.casual, "season");
    expect(deserialize(serialize(s))).toEqual(s);
  });

  it("refuses a save from a newer game version", () => {
    expect(() => deserialize(JSON.stringify({ version: 99 }))).toThrow(/newer/);
  });
});

describe("career", () => {
  it("runs a full career to retirement at 35 for every profile", () => {
    for (const p of Object.values(profiles)) {
      const s = newGame(100);
      autoPlay(s, p, "career");
      expect(s.ended).toBe(true);
      expect(s.seasons).toHaveLength(15);
      expect(s.seasons.at(-1)!.age).toBe(35);
    }
  });
});
