// Runs many simulated careers per player profile and summarises the economy.
// Usage: npm run batch -- --runs 500 --seed 1 --profiles casual,active,hardcore
import { mkdirSync, writeFileSync } from "node:fs";
import { autoPlay, newGame, profiles, type PlayerProfile, type SeasonRecord } from "../sim/src";

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const runs = Number(arg("runs", "300"));
const seed = Number(arg("seed", "1"));
const chosen = arg("profiles", "casual,autopilot,active,hardcore").split(",") as Array<keyof typeof profiles>;

const pct = (xs: number[], p: number) => {
  if (!xs.length) return NaN;
  const v = [...xs].sort((a, b) => a - b);
  return v[Math.min(v.length - 1, Math.floor((p / 100) * v.length))];
};
const avg = (xs: number[]) => (xs.length ? xs.reduce((t, x) => t + x, 0) / xs.length : NaN);
const fmt = (n: number) => (Number.isFinite(n) ? Math.round(n).toLocaleString("en-US") : "–");

interface Career {
  profile: string;
  seed: number;
  realDays: number;
  firstElite: number | null;
  firstTitle: number | null;
  titles: number;
  coinsEnd: number;
  lowestSeasonEndCoins: number;
  seasons: SeasonRecord[];
}

function runProfile(p: PlayerProfile): Career[] {
  const out: Career[] = [];
  for (let i = 0; i < runs; i++) {
    const s = newGame(seed + i);
    autoPlay(s, p, "career");
    const elite = s.seasons.find((r) => r.division === "Elite 15");
    const title = s.seasons.find((r) => r.worlds === 1);
    out.push({
      profile: p.id,
      seed: seed + i,
      realDays: s.day,
      firstElite: elite ? elite.season : null,
      firstTitle: title ? title.season : null,
      titles: s.seasons.filter((r) => r.worlds === 1).length,
      coinsEnd: Math.round(s.coins),
      lowestSeasonEndCoins: Math.min(...s.seasons.map((r) => r.coins)),
      seasons: s.seasons,
    });
  }
  return out;
}

mkdirSync("tools/out", { recursive: true });
const careerRows = ["profile,seed,real_days,first_elite_season,first_title_season,titles,coins_end,lowest_season_end_coins"];
const seasonRows = ["profile,seed,season,age,division,rank,outcome,real_days,races,wins,best,worlds,prizes,coins,gems,ovr"];

for (const key of chosen) {
  const p = profiles[key];
  const careers = runProfile(p);
  for (const c of careers) {
    careerRows.push([c.profile, c.seed, c.realDays, c.firstElite ?? "", c.firstTitle ?? "", c.titles, c.coinsEnd, c.lowestSeasonEndCoins].join(","));
    for (const r of c.seasons) {
      seasonRows.push([c.profile, c.seed, r.season, r.age, r.division, r.rank, r.outcome, r.realDays, r.races, r.wins, r.best ?? "", r.worlds ?? "", r.prizes, r.coins, r.gems, r.ovr].join(","));
    }
  }
  const reachedElite = careers.filter((c) => c.firstElite !== null);
  const champions = careers.filter((c) => c.titles > 0);
  console.log(`\n${p.label} · ${runs} careers`);
  console.log(`  Real days per career     median ${fmt(pct(careers.map((c) => c.realDays), 50))}`);
  console.log(`  Reached Elite 15         ${Math.round((reachedElite.length / runs) * 100)}% · first Elite season median S${fmt(pct(reachedElite.map((c) => c.firstElite!), 50))}`);
  console.log(`  World champion           ${Math.round((champions.length / runs) * 100)}% · first title median S${fmt(pct(champions.map((c) => c.firstTitle!), 50))} · avg titles ${avg(careers.map((c) => c.titles)).toFixed(1)}`);
  console.log(`  Coins at retirement      p10 ${fmt(pct(careers.map((c) => c.coinsEnd), 10))} · median ${fmt(pct(careers.map((c) => c.coinsEnd), 50))} · p90 ${fmt(pct(careers.map((c) => c.coinsEnd), 90))}`);
  console.log(`  Lowest season-end coins  median ${fmt(pct(careers.map((c) => c.lowestSeasonEndCoins), 50))}`);
  const line = Array.from({ length: 15 }, (_, i) => fmt(pct(careers.map((c) => c.seasons[i]?.coins ?? NaN).filter(Number.isFinite), 50)));
  console.log(`  Median coins by season   ${line.join(" | ")}`);
  const ovrLine = Array.from({ length: 15 }, (_, i) => pct(careers.map((c) => c.seasons[i]?.ovr ?? NaN).filter(Number.isFinite), 50).toFixed(1));
  console.log(`  Median OVR by season     ${ovrLine.join(" | ")}`);
  const divLine = Array.from({ length: 15 }, (_, i) => {
    const n = careers.filter((c) => c.seasons[i]?.division === "Elite 15").length;
    return `${Math.round((n / careers.length) * 100)}%`;
  });
  console.log(`  In Elite 15 by season    ${divLine.join(" | ")}`);
}

writeFileSync("tools/out/careers.csv", careerRows.join("\n"));
writeFileSync("tools/out/seasons.csv", seasonRows.join("\n"));
console.log("\nCSV written to tools/out/careers.csv and tools/out/seasons.csv");
