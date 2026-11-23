import type { GameState } from "./types";

export const SAVE_VERSION = 1;

/** Saves are plain JSON. Each future format change adds a migration step below so old saves keep working. */
export function serialize(s: GameState): string {
  return JSON.stringify(s);
}

type AnySave = { version?: number } & Record<string, unknown>;

const migrations: Record<number, (save: AnySave) => AnySave> = {
  // Example for the next format change:
  // 1: (save) => ({ ...save, version: 2, newField: defaultValue }),
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
