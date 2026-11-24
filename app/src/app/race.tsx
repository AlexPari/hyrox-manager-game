import * as Haptics from "expo-haptics";
import { Redirect, router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { BackHandler, Platform, StyleSheet, useWindowDimensions, View } from "react-native";
import { raceLog, raceRunners, type GameEvent, type RaceRunner } from "@sim";
import { Arena, segmentAt } from "@/components/Arena";
import { Button, Card, Chip, IconButton, Label, Row, Screen, Segmented, T } from "@/components/ui";
import { rivalIdentity } from "@/data/places";
import { useGame } from "@/game/store";
import { raceSegments } from "@/game/raceSegments";
import { gap, pacingInfo, raceTime } from "@/format";
import { color, radius, size, space } from "@/theme";

type RaceEvent = Extract<GameEvent, { type: "race" }>;
interface FeedItem {
  text: string;
  kind: "up" | "down" | "info";
}

/** Real seconds for the whole race at 1×. */
const PLAYBACK_SEC = 45;
const SPEEDS = ["1", "2", "4"] as const;
/** After each of your splits the race slows down for a moment so you can see what happened. */
const SLOW_MS = 900;

export default function Race() {
  const { s, last } = useGame();
  const race = last?.events.find((e): e is RaceEvent => e.type === "race");
  if (!race) return <Redirect href="/" />;
  const division = raceLog(s).find((r) => r.season === race.season && r.week === race.week)?.division ?? s.division;
  return <Playback race={race} division={division} />;
}

function Playback({ race, division }: { race: RaceEvent; division: string }) {
  const { s } = useGame();
  const { width } = useWindowDimensions();
  const arenaW = Math.min(width, size.maxWidth) - space.page * 2;
  const segments = useMemo(() => raceSegments(race.splits), [race]);
  const runners = useMemo(() => raceRunners(s.config, race), [s.config, race]);
  const me = runners.find((r) => r.id === -1) as RaceRunner;
  const end = me.total;
  const name = (r: RaceRunner) => (r.id === -1 ? "You" : rivalIdentity(race.season, division, r.id).name);

  const [t, setT] = useState(0);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>("1");
  const first = (raceLog(s).length ?? 0) <= 1;
  const startLine: FeedItem = { text: first ? "You're the orange dot. Positions and gaps update at every split." : `Start: ${race.fieldSize} athletes off on Run 1`, kind: "info" };
  const [feed, setFeed] = useState<FeedItem[]>([startLine]);
  const [banner, setBanner] = useState<string | null>(null);
  const state = useRef({ t: 0, seg: 0, slowUntil: 0, blew: false, won: false });
  const done = t >= end;

  // A split time for everyone at boundary c, and your place at it.
  const rankAt = (c: number) => runners.filter((r) => r.cum[c] < me.cum[c]).length + 1;

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (done) return;
    let lastTick = Date.now();
    const timer = setInterval(() => {
      const now = Date.now();
      const dt = (now - lastTick) / 1000;
      lastTick = now;
      const st = state.current;
      let rate = (Number(speed) * end) / PLAYBACK_SEC;
      if (now < st.slowUntil) rate *= 0.3;
      advance(Math.min(end, st.t + dt * rate), now);
    }, 40);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done, speed, end]);

  function advance(next: number, now: number) {
    const st = state.current;
    const added: FeedItem[] = [];
    const seg = segmentAt(me, next).k;
    for (let c = st.seg + 1; c <= seg; c++) {
      const r = rankAt(c);
      const d = c > 1 ? rankAt(c - 1) - r : 0;
      added.push({ text: `${segments[c - 1].label} done · P${r}${d > 0 ? `, up ${d}` : d < 0 ? `, down ${-d}` : ""}`, kind: d > 0 ? "up" : d < 0 ? "down" : "info" });
    }
    if (seg !== st.seg && seg < 16 && next < end) {
      st.slowUntil = now + SLOW_MS;
      setBanner(segments[seg].label.toUpperCase());
      if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => undefined);
    }
    st.seg = seg;
    if (race.blewUp && !st.blew && next > end * 0.55) {
      st.blew = true;
      added.push({ text: "You're blowing up: the pace was too hot", kind: "down" });
    }
    const winner = runners[0];
    if (!st.won && next >= winner.total) {
      st.won = true;
      added.push({ text: winner.id === -1 ? `You win in ${raceTime(winner.total)}!` : `${name(winner)} wins in ${raceTime(winner.total)}`, kind: "info" });
    }
    st.t = next;
    if (now >= st.slowUntil || next >= end) setBanner(null);
    if (added.length) setFeed((f) => [...added.reverse(), ...f].slice(0, 3));
    setT(next);
    if (next >= end && Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
  }

  function replay() {
    state.current = { t: 0, seg: 0, slowUntil: 0, blew: false, won: false };
    setFeed([startLine]);
    setBanner(null);
    setT(0);
  }

  // Live order: who is furthest along (finishers by time).
  const progress = (r: RaceRunner) => {
    const { k, u } = segmentAt(r, t);
    return k >= 16 ? 100 - r.total / 1e5 : k + u;
  };
  const order = [...runners].sort((a, b) => progress(b) - progress(a));
  const live = done ? race.place : order.findIndex((r) => r.id === -1) + 1;
  const leaderId = order[0].id;

  // Gaps at your last split, like the timing screens at a real race.
  const c = segmentAt(me, t).k;
  let gapLeader = "—";
  let gapAhead = "—";
  let aheadLabel = "Gap ahead";
  if (c > 0) {
    const times = runners.map((r) => r.cum[c]).sort((a, b) => a - b);
    const mine = me.cum[c];
    if (mine <= times[0]) {
      gapLeader = "Leader";
      aheadLabel = "Lead over 2nd";
      gapAhead = times.length > 1 ? gap(mine - times[1]) : "—";
    } else {
      gapLeader = gap(mine - times[0]);
      gapAhead = gap(mine - times.filter((x) => x < mine).pop()!);
    }
  }
  const k = Math.min(15, c);
  const u = done ? 1 : segmentAt(me, t).u;
  const segNow = segments[k];

  return (
    <Screen
      footer={
        done ? (
          <Row>
            <IconButton icon="replay" label="Replay the race" onPress={replay} />
            <View style={{ flex: 1 }}>
              <Button hero label="See result" onPress={() => router.replace("/result")} />
            </View>
          </Row>
        ) : (
          <Row>
            <View style={{ flex: 1 }}>
              <Segmented label="Playback speed" value={speed} onChange={setSpeed} options={SPEEDS.map((x) => ({ key: x, label: `${x}×` }))} />
            </View>
            <View style={{ width: 104 }}>
              <Button variant="outline" icon="skip" label="Skip" onPress={() => advance(end, Date.now())} />
            </View>
          </Row>
        )
      }
    >
      <Row style={{ justifyContent: "space-between", alignItems: "flex-end" }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Label>{`${division} · ${race.fieldSize} athletes · ${pacingInfo[race.pacing].label}`}</Label>
          <T variant="h1" numberOfLines={1}>
            {race.worlds ? "Worlds" : race.city}
          </T>
        </View>
        <T variant="h1" style={{ fontVariant: ["tabular-nums"] }}>
          {raceTime(t)}
        </T>
      </Row>

      <View>
        <Arena runners={runners} t={t} width={arenaW} leaderId={leaderId} />
        {banner ? (
          <View pointerEvents="none" style={styles.bannerWrap}>
            <View style={styles.banner}>
              <T variant="h2" style={{ color: color.accentInk, fontSize: 18 }}>
                {banner}
              </T>
            </View>
          </View>
        ) : null}
      </View>

      <Row>
        <Card style={[styles.tile, { backgroundColor: color.accentTint, borderWidth: 1, borderColor: color.accent }]}>
          <T variant="small" tone="muted">
            Position
          </T>
          <T variant="numberL">
            {`P${live}`}
            <T variant="meta" tone="muted">{` /${race.fieldSize}`}</T>
          </T>
        </Card>
        <Card style={styles.tile}>
          <T variant="small" tone="muted">
            Gap to leader
          </T>
          <T variant="numberL" style={{ fontVariant: ["tabular-nums"] }}>
            {gapLeader}
          </T>
        </Card>
        <Card style={styles.tile}>
          <T variant="small" tone="muted">
            {aheadLabel}
          </T>
          <T variant="numberL" style={{ fontVariant: ["tabular-nums"] }}>
            {gapAhead}
          </T>
        </Card>
      </Row>

      <Card style={{ gap: 8, padding: space.lg }}>
        <Row style={{ justifyContent: "space-between" }}>
          <T variant="bodyStrong">{done ? "Finished" : segNow.label}</T>
          <T variant="meta" tone="ink2" style={{ fontVariant: ["tabular-nums"] }}>
            {done ? raceTime(end) : `${Math.round(u * segNow.amount)} / ${segNow.amount} ${segNow.unit}`}
          </T>
        </Row>
        <View style={styles.track}>
          <View style={{ width: `${u * 100}%`, backgroundColor: color.accent }} />
        </View>
        <View style={styles.pips}>
          {segments.map((sg, j) => (
            <View key={sg.key} style={[styles.pip, { backgroundColor: j < c || done ? color.accent : j === c ? color.ink2 : color.surface3 }]} />
          ))}
        </View>
      </Card>

      <View style={{ gap: 4 }}>
        {feed.map((f, i) => (
          <View key={`${f.text}-${i}`} style={[styles.feed, i === 0 ? { backgroundColor: color.surface } : null, { opacity: 1 - i * 0.25 }]}>
            <T variant="meta" style={{ color: f.kind === "up" ? color.success : f.kind === "down" ? color.dangerText : color.ink2 }}>
              {f.text}
            </T>
          </View>
        ))}
      </View>
      {!race.field ? <Chip>Older race: rivals not recorded</Chip> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  tile: { flex: 1, padding: space.md, gap: 2 },
  bannerWrap: { position: "absolute", left: 0, right: 0, bottom: 10, alignItems: "center" },
  banner: { backgroundColor: color.accent, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 3 },
  track: { height: 8, borderRadius: radius.pill, backgroundColor: color.surface3, flexDirection: "row", overflow: "hidden" },
  pips: { flexDirection: "row", gap: 2 },
  pip: { flex: 1, height: 6, borderRadius: 3 },
  feed: { borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: 8 },
});
