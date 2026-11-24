import { RACE_STATIONS, segmentTimes, type Split, type StatId } from "@sim";
import { statLabel } from "@/format";

export interface Segment {
  key: string;
  label: string;
  sec: number;
  run: boolean;
  /** Distance or reps shown while the segment is live. */
  amount: number;
  unit: "m" | "reps";
}

const AMOUNT: Record<StatId, [number, "m" | "reps"]> = {
  run: [1000, "m"],
  ski: [1000, "m"],
  sledPush: [50, "m"],
  sledPull: [50, "m"],
  burpees: [80, "m"],
  row: [1000, "m"],
  farmers: [200, "m"],
  lunges: [100, "m"],
  wallBalls: [100, "reps"],
};

/** Hyrox order: Run 1, SkiErg, Run 2, Sled Push, ... Run 8, Wall Balls. The Roxzone is spread over the segments. */
export function raceSegments(splits: Split[]): Segment[] {
  return segmentTimes(splits).map((sec, k) => {
    const run = k % 2 === 0;
    const id: StatId = run ? "run" : RACE_STATIONS[(k - 1) / 2];
    const n = Math.floor(k / 2) + 1;
    return { key: run ? `run${n}` : id, label: run ? `Run ${n}` : statLabel[id], sec, run, amount: AMOUNT[id][0], unit: AMOUNT[id][1] };
  });
}
