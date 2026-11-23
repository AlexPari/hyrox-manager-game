import { Redirect, router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import type { GameEvent } from "@sim";
import { Bar, Button, Card, Chip, Label, Row, Screen, T } from "@/components/ui";
import { useGame } from "@/game/store";
import { raceSegments } from "@/game/raceSegments";
import { ordinal, pacingInfo, raceTime } from "@/format";
import { color, space } from "@/theme";

type RaceEvent = Extract<GameEvent, { type: "race" }>;

const PLAYBACK_MS = 12_000;
export default function Race() {
  const { last } = useGame();
  const race = last?.events.find((e): e is RaceEvent => e.type === "race");
  if (!race) return <Redirect href="/" />;
  return <Playback race={race} />;
}

function Playback({ race }: { race: RaceEvent }) {
  const segments = useMemo(() => raceSegments(race.splits), [race]);
  const total = segments.reduce((t, x) => t + x.sec, 0);
  const [elapsed, setElapsed] = useState(0);
  const start = useRef(Date.now());
  const done = elapsed >= total;

  useEffect(() => {
    if (done) return;
    const timer = setInterval(() => {
      const t = ((Date.now() - start.current) / PLAYBACK_MS) * total;
      setElapsed(Math.min(total, t));
    }, 50);
    return () => clearInterval(timer);
  }, [done, total]);

  let acc = 0;
  let current = segments.length - 1;
  for (let i = 0; i < segments.length; i++) {
    if (elapsed < acc + segments[i].sec) {
      current = i;
      break;
    }
    acc += segments[i].sec;
  }
  const progress = elapsed / total;
  // Live position: starts a few places back and settles on the final place (cosmetic, the result is already decided).
  const startPos = Math.min(race.fieldSize, race.place + 4 + (race.raceIndex % 3));
  const wobble = done ? 0 : Math.round(Math.sin(progress * 17 + race.week) * 1.2);
  const ease = 1 - (1 - progress) ** 2;
  const live = Math.max(1, Math.min(race.fieldSize, Math.round(startPos + (race.place - startPos) * ease) + wobble));

  let cum = 0;
  return (
    <Screen
      footer={
        done ? (
          <Button hero label="See result" onPress={() => router.replace("/patch")} />
        ) : (
          <Button variant="secondary" icon="skip" label="Skip to finish" onPress={() => setElapsed(total)} />
        )
      }
    >
      <View style={{ gap: 2 }}>
        <Row style={{ justifyContent: "space-between" }}>
          <Label>{race.worlds ? "World Championships" : `Race ${race.raceIndex} · season ${race.season}`}</Label>
          <Chip>{pacingInfo[race.pacing].label}</Chip>
        </Row>
        <T variant="h1">{race.city}</T>
      </View>

      <Card style={{ alignItems: "center", paddingVertical: space.xxl }}>
        <Label>{done ? "Finish" : segments[current].label}</Label>
        <T variant="displayHero" style={{ fontVariant: ["tabular-nums"] }}>
          {raceTime(elapsed)}
        </T>
        <Row gap={6}>
          <T variant="bodyStrong" tone="muted">
            {done ? "Finished" : "Position"}
          </T>
          <T variant="numberM" style={{ color: live <= 3 ? color.gold : color.ink }}>
            {ordinal(live)}
          </T>
          <T variant="meta" tone="muted">{`of ${race.fieldSize}`}</T>
        </Row>
        <View style={{ width: "100%", marginTop: space.md }}>
          <Bar value={progress} max={1} />
        </View>
        {race.blewUp && progress > 0.5 ? (
          <T variant="caption" tone="dangerText">
            Blew up! The pace was too hot.
          </T>
        ) : null}
      </Card>

      <Card style={{ gap: 6 }}>
        <Label>Splits</Label>
        {segments.map((seg, i) => {
          cum += seg.sec;
          const state = i < current || done ? "done" : i === current ? "now" : "next";
          return (
            <Row key={seg.key} style={styles.split}>
              <View
                style={[
                  styles.dot,
                  { backgroundColor: state === "done" ? color.success : state === "now" ? color.accent : color.surface3 },
                ]}
              />
              <T
                variant={seg.run ? "meta" : "bodyStrong"}
                tone={state === "next" ? "faint" : seg.run ? "muted" : "ink"}
                style={{ flex: 1 }}
              >
                {seg.label}
              </T>
              <T variant="meta" tone={state === "done" ? "ink2" : "faint"} style={{ fontVariant: ["tabular-nums"] }}>
                {state === "done" ? raceTime(seg.sec) : "–"}
              </T>
              <T variant="small" tone="muted" style={{ width: 56, textAlign: "right", fontVariant: ["tabular-nums"] }}>
                {state === "done" ? raceTime(cum) : ""}
              </T>
            </Row>
          );
        })}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  split: { minHeight: 22 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
