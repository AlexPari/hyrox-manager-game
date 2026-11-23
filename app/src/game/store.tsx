// Game store: one GameState from sim/, saved on the device after every action, with a real-time energy clock.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { AppState } from "react-native";
import {
  advanceRealTime,
  deserialize,
  newGame,
  ovr,
  playWeek,
  serialize,
  watchAd as simWatchAd,
  type ActionResult,
  type GameEvent,
  type GameState,
  type WeekChoices,
} from "@sim";

const SAVE_KEY = "hyrox-manager/career";
const CLOCK_EVERY_MS = 30_000;

/** What the Report screen needs about the week just played. */
export interface LastWeek {
  season: number;
  week: number;
  choices: WeekChoices;
  events: GameEvent[];
  ovrBefore: number;
  fatigueBefore: number;
}

interface SaveFile {
  state: string;
  /** Wall-clock time of the last clock update, so energy keeps regenerating while the app is closed. */
  clockAt: number;
  last: LastWeek | null;
}

interface GameApi {
  s: GameState;
  last: LastWeek | null;
  play: (choices: WeekChoices) => ActionResult;
  watchAd: (kind: "coins" | "energy") => ActionResult;
  /** Test helper: lets real time pass (energy, new day). */
  skipHours: (hours: number) => void;
  newCareer: () => void;
}

const GameContext = createContext<GameApi | null>(null);

function freshSeed(): number {
  return Math.floor(Math.random() * 2 ** 31);
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [loaded, setLoaded] = useState(false);
  const [, setTick] = useState(0);
  const ref = useRef<{ s: GameState; clockAt: number; last: LastWeek | null } | null>(null);

  const persist = useCallback(() => {
    const g = ref.current;
    if (!g) return;
    const file: SaveFile = { state: serialize(g.s), clockAt: g.clockAt, last: g.last };
    AsyncStorage.setItem(SAVE_KEY, JSON.stringify(file)).catch(() => undefined);
  }, []);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  /** Brings energy and the day counter up to the current time. */
  const syncClock = useCallback(() => {
    const g = ref.current;
    if (!g) return;
    const now = Date.now();
    const hours = (now - g.clockAt) / 3_600_000;
    if (hours <= 0) return;
    advanceRealTime(g.s, hours);
    g.clockAt = now;
    persist();
    refresh();
  }, [persist, refresh]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let restored: typeof ref.current = null;
      try {
        const raw = await AsyncStorage.getItem(SAVE_KEY);
        if (raw) {
          const file = JSON.parse(raw) as SaveFile;
          restored = { s: deserialize(file.state), clockAt: file.clockAt, last: file.last };
        }
      } catch {
        restored = null; // unreadable save: start a new career rather than crash
      }
      if (cancelled) return;
      ref.current = restored ?? { s: newGame(freshSeed()), clockAt: Date.now(), last: null };
      setLoaded(true);
      syncClock();
      persist();
    })();
    return () => {
      cancelled = true;
    };
  }, [persist, syncClock]);

  useEffect(() => {
    if (!loaded) return;
    const timer = setInterval(syncClock, CLOCK_EVERY_MS);
    const sub = AppState.addEventListener("change", (st) => st === "active" && syncClock());
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [loaded, syncClock]);

  // sim/ mutates the game state in place: the API is rebuilt on every render tick so screens always read fresh values.
  const g = ref.current;
  const api: GameApi | null =
    !loaded || !g
      ? null
      : {
          s: g.s,
          last: g.last,
          play: (choices) => {
            syncClock();
            const before = { season: g.s.season, week: g.s.week + 1, ovrBefore: ovr(g.s), fatigueBefore: g.s.fatigue };
            const r = playWeek(g.s, choices);
            if (r.ok) g.last = { ...before, choices, events: r.events };
            persist();
            refresh();
            return r;
          },
          watchAd: (kind) => {
            const r = simWatchAd(g.s, kind);
            persist();
            refresh();
            return r;
          },
          skipHours: (hours) => {
            syncClock();
            advanceRealTime(g.s, hours);
            persist();
            refresh();
          },
          newCareer: () => {
            ref.current = { s: newGame(freshSeed()), clockAt: Date.now(), last: null };
            persist();
            refresh();
          },
        };

  if (!api) return null;
  return <GameContext.Provider value={api}>{children}</GameContext.Provider>;
}

export function useGame(): GameApi {
  const g = useContext(GameContext);
  if (!g) throw new Error("useGame must be used inside GameProvider");
  return g;
}
