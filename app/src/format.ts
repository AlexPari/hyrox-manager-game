// Display helpers. All game text lives here and in the screens, never in sim/, so it can be localized later.
import type { DivisionName, Intensity, Pacing, SeasonOutcome, StatId, TrainingFocus } from "@sim";

export function raceTime(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const mm = String(m).padStart(h ? 2 : 1, "0");
  return `${h ? `${h}:` : ""}${mm}:${String(r).padStart(2, "0")}`;
}

export function gap(sec: number): string {
  return sec <= 0 ? "Winner" : `+${raceTime(sec)}`;
}

export function ordinal(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  return `${n}${({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th"}`;
}

export function num(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

export function signed(n: number, digits = 1): string {
  const v = n.toFixed(digits);
  return n >= 0 ? `+${v}` : v;
}

export const statLabel: Record<StatId, string> = {
  run: "Running",
  ski: "SkiErg",
  sledPush: "Sled Push",
  sledPull: "Sled Pull",
  burpees: "Burpee Broad Jumps",
  row: "Row",
  farmers: "Farmers Carry",
  lunges: "Sandbag Lunges",
  wallBalls: "Wall Balls",
};

export const statShort: Record<StatId, string> = {
  run: "Run",
  ski: "Ski",
  sledPush: "Push",
  sledPull: "Pull",
  burpees: "BBJ",
  row: "Row",
  farmers: "Farm",
  lunges: "Lunge",
  wallBalls: "WB",
};

export const focusInfo: Record<TrainingFocus, { label: string; detail: string }> = {
  run: { label: "Run", detail: "Intervals and long runs" },
  engine: { label: "Engine", detail: "SkiErg, Row, Burpees" },
  strength: { label: "Strength", detail: "Sleds, Farmers, Lunges" },
  hybrid: { label: "Hybrid", detail: "Wall Balls, Lunges, Burpees" },
  balanced: { label: "Balanced", detail: "A bit of everything (autopilot)" },
};

export const intensityInfo: Record<Intensity, { label: string; detail: string }> = {
  light: { label: "Light", detail: "Recover" },
  normal: { label: "Normal", detail: "Steady" },
  hard: { label: "Hard", detail: "+40% gains, tiring" },
};

export const pacingInfo: Record<Pacing, { label: string; detail: string }> = {
  conservative: { label: "Safe", detail: "Slower but steady" },
  even: { label: "Even", detail: "Race your level" },
  aggressive: { label: "Attack", detail: "Faster, risky" },
};

export const divisionShort: Record<DivisionName, string> = { Open: "Open", Pro: "Pro", "Elite 15": "Elite 15" };

export function outcomeTitle(o: SeasonOutcome, next: DivisionName): string {
  switch (o) {
    case "turnPro":
      return "You turn Pro";
    case "qualified":
      return "Qualified for Elite 15";
    case "missedCut":
      return "Missed the cut";
    case "keptSpot":
      return "Elite 15 spot kept";
    case "relegated":
      return `Relegated to ${next}`;
  }
}
