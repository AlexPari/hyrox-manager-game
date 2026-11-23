import type { Split, StatId } from "@sim";
import { statLabel } from "@/format";

const STATION_ORDER: StatId[] = ["ski", "sledPush", "sledPull", "burpees", "row", "farmers", "lunges", "wallBalls"];
/** Runs slow down a little as the race goes on (shape only: the 8 runs add up to the run split). */
const RUN_SHAPE = [0.94, 0.97, 0.99, 1.0, 1.01, 1.02, 1.03, 1.04];

export interface Segment {
  key: string;
  label: string;
  sec: number;
  run: boolean;
}

/** Hyrox order: Run 1, SkiErg, Run 2, Sled Push, ... Run 8, Wall Balls. The Roxzone is spread over the transitions. */
export function raceSegments(splits: Split[]): Segment[] {
  const by = Object.fromEntries(splits.map((x) => [x.id, x.sec])) as Record<string, number>;
  const shapeSum = RUN_SHAPE.reduce((t, x) => t + x, 0);
  const rox = (by.roxzone ?? 0) / 16;
  const out: Segment[] = [];
  STATION_ORDER.forEach((id, i) => {
    out.push({ key: `run${i + 1}`, label: `Run ${i + 1}`, sec: ((by.run ?? 0) * RUN_SHAPE[i]) / shapeSum + rox, run: true });
    out.push({ key: id, label: statLabel[id], sec: (by[id] ?? 0) + rox, run: false });
  });
  return out;
}
