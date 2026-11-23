// Quick balancing loop: try config changes without editing the code.
// Usage: npm run tune -- 150 '{"training":{"rate":0.05},"divisions":{"Pro":{"mean":68}}}'
import { autoPlay, defaultConfig, newGame, profiles, type Config } from "../sim/src";

const runs = Number(process.argv[2] ?? 100);
const patch = JSON.parse(process.argv[3] ?? "{}");

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function merge(a: any, b: any) {
  for (const k in b) {
    if (b[k] && typeof b[k] === "object" && !Array.isArray(b[k])) merge(a[k], b[k]);
    else a[k] = b[k];
  }
  return a;
}
const cfg: Config = merge(structuredClone(defaultConfig), patch);
const med = (x: number[]) => [...x].sort((a, b) => a - b)[Math.floor(x.length / 2)];

const list = [profiles.casual, profiles.autopilot, profiles.active, { ...profiles.active, id: "nostaff", label: "Active · no staff", followPlan: false }, profiles.hardcore];
for (const p of list) {
  let elite = 0;
  let champ = 0;
  let titles = 0;
  const coins: number[] = [];
  const firstElite: number[] = [];
  const ovrBy: number[][] = Array.from({ length: cfg.career.length }, () => []);
  for (let i = 0; i < runs; i++) {
    const s = newGame(1 + i, cfg);
    autoPlay(s, p, "career");
    const e = s.seasons.find((r) => r.division === "Elite 15");
    if (e) {
      elite++;
      firstElite.push(e.season);
    }
    const t = s.seasons.filter((r) => r.worlds === 1).length;
    if (t) champ++;
    titles += t;
    coins.push(s.coins);
    s.seasons.forEach((r, j) => ovrBy[j].push(r.ovr));
  }
  console.log(
    `${p.label.padEnd(20)} Elite ${Math.round((elite / runs) * 100)}% (S${firstElite.length ? med(firstElite) : "-"})` +
      ` · champion ${Math.round((champ / runs) * 100)}% · titles ${(titles / runs).toFixed(1)} · coins ${Math.round(med(coins) / 1000)}k` +
      ` | OVR ${ovrBy.map((x) => med(x).toFixed(0)).join(" ")}`,
  );
}
