import { STAT_IDS, defaultConfig } from "./config";
import type { GameState } from "./types";

export const SAVE_VERSION = 2;

/** Saves are plain JSON. Each future format change adds a migration step below so old saves keep working. */
export function serialize(s: GameState): string {
  return JSON.stringify(s);
}

type AnySave = { version?: number } & Record<string, unknown>;

const migrations: Record<number, (save: AnySave) => AnySave> = {
  // v1 -> v2: a single overall rating becomes station stats; fatigue and knock duration are added.
  1: (save) => {
    const { ovr, ...rest } = save as AnySave & { ovr: number; status: string; injuryWeeksLeft: number };
    const stats = Object.fromEntries(STAT_IDS.map((id) => [id, ovr]));
    const injuryWeeksLeft = rest.status === "knock" ? defaultConfig.injury.knockWeeks : rest.injuryWeeksLeft;
    // v1 saves always used the default config; the v2 defaults add the new model's numbers.
    return { ...rest, version: 2, config: JSON.parse(JSON.stringify(defaultConfig)), stats, fatigue: 0, injuryWeeksLeft };
  },
};

export function deserialize(text: string): GameState {
  let save = JSON.parse(text) as AnySave;
  if (typeof save.version !== "number") throw new Error("Not a Hyrox Manager save");
  while (save.version! < SAVE_VERSION) {
    const step = migrations[save.version!];
    if (!step) throw new Error(`No migration from save version ${save.version}`);
    save = step(save);
  }
  if (save.version! > SAVE_VERSION) throw new Error(`Save version ${save.version} is newer than this game (${SAVE_VERSION})`);
  return save as unknown as GameState;
}
