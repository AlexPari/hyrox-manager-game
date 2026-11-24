import * as Haptics from "expo-haptics";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Platform, StyleSheet, View } from "react-native";
import { STAT_IDS, effects, nextFatigue, ovr, ovrGain, raceIndexForWeek, readiness, trainingGains, type GameEvent, type StatId } from "@sim";
import { readinessColor, readinessLabel } from "@/components/Ring";
import { Button, Card, Chip, Label, Row, Screen, T } from "@/components/ui";
import { Coach } from "@/components/Coach";
import { goHome } from "@/game/nav";
import { weekNotes, type WeekNote } from "@/game/notes";
import { weekMult } from "@/game/rules";
import { useGame } from "@/game/store";
import { focusInfo, intensityInfo, signed, statLabel } from "@/format";
import { color, fatigueColor, radius, space } from "@/theme";

type Ev<K extends GameEvent["type"]> = Extract<GameEvent, { type: K }>;

interface Reveal {
  week: number;
  label: string;
  ovrBefore: number;
  ovrGain: number;
  gains: Partial<Record<StatId, number>>;
  before: Record<StatId, number>;
  fatigueBefore: number;
  fatigueAfter: number;
  ready: number;
  notes: WeekNote[];
}

const DURATION = 1600;

/**
 * Progress reveal after confirming a week: the overall rating counts up and the trained stations fill.
 * `preview=1` (race weeks): shown before the race, from the planned week; the week is played at the start line.
 * Otherwise: the week that was just played.
 */
export default function Progress() {
  const { preview } = useLocalSearchParams<{ preview?: string }>();
  const { s, last, draft, ftue, markSeen } = useGame();
  const [tip] = useState(() => ftue.active && !ftue.seen.includes("progress:first"));
  const [reveal] = useState<Reveal | null>(() => (preview ? fromDraft() : fromLast()));

  function fromDraft(): Reveal | null {
    const week = s.week + 1;
    if (!draft || !raceIndexForWeek(s, week)) return null;
    const c = s.config;
    const fx = effects(s);
    const intensity = draft.intensity ?? "normal";
    const input = { focus: draft.focus ?? "balanced", intensity, age: s.age, effects: fx, mult: weekMult(s, true, !!draft.booster) };
    return {
      week,
      label: `${focusInfo[input.focus].label} · ${intensityInfo[intensity].label}`,
      ovrBefore: ovr(s),
      ovrGain: ovrGain(c, s.stats, input),
      gains: trainingGains(c, s.stats, input),
      before: { ...s.stats },
      fatigueBefore: s.fatigue,
      fatigueAfter: nextFatigue(c, s.fatigue, intensity, true, fx),
      ready: Math.round(readiness(s)),
      notes: [],
    };
  }

  function fromLast(): Reveal | null {
    const trained = last?.events.find((e): e is Ev<"trained"> => e.type === "trained");
    if (!last || !trained) return null;
    const before = { ...s.stats };
    for (const id of STAT_IDS) before[id] = s.stats[id] - (trained.gains[id] ?? 0);
    return {
      week: last.week,
      label: `${focusInfo[trained.focus].label} · ${intensityInfo[trained.intensity].label}`,
      ovrBefore: last.ovrBefore,
      ovrGain: trained.ovrGain,
      gains: trained.gains,
      before,
      fatigueBefore: last.fatigueBefore,
      fatigueAfter: trained.fatigue,
      ready: Math.round(readiness(s)),
      notes: weekNotes(last.events),
    };
  }

  const t = useRef(new Animated.Value(0)).current;
  const [k, setK] = useState(0);
  useEffect(() => {
    const id = t.addListener(({ value }) => setK(value));
    Animated.timing(t, { toValue: 1, duration: DURATION, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start(({ finished }) => {
      if (finished && Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    });
    return () => t.removeListener(id);
  }, [t]);

  if (!reveal) return <Redirect href="/" />;
  const ended = !preview && !!last?.events.some((e) => e.type === "seasonEnd");
  const rows = STAT_IDS.map((id) => ({ id, g: reveal.gains[id] ?? 0 }))
    .filter((x) => x.g > 0.005)
    .sort((a, b) => b.g - a.g)
    .slice(0, 4);
  const up = reveal.ovrGain >= 0.005;

  return (
    <Screen
      footer={
        preview ? (
          <Button
            hero
            label="Continue to race plan"
            onPress={() => {
              if (tip) markSeen("progress:first");
              router.push("/raceplan");
            }}
          />
        ) : (
          <Button
            hero
            label={ended ? "See your season" : `Back to Home · week ${reveal.week + 1}`}
            onPress={() => {
              if (tip) markSeen("progress:first");
              goHome();
            }}
          />
        )
      }
    >
      <View style={{ alignItems: "center", gap: 4, paddingTop: space.xl }}>
        <Label>{`Week ${reveal.week} ${preview ? "plan" : "done"} · ${reveal.label}`}</Label>
        <T variant="displayTitle">{up ? "Stronger" : "Recovered"}</T>
      </View>

      <Card style={{ alignItems: "center", paddingVertical: space.xxl }}>
        <Label>Overall</Label>
        <Row gap={10} style={{ alignItems: "flex-end" }}>
          <T variant="displayHero" style={{ fontVariant: ["tabular-nums"] }}>
            {(reveal.ovrBefore + reveal.ovrGain * k).toFixed(1)}
          </T>
          <View style={[styles.badge, { opacity: k >= 0.98 ? 1 : 0, backgroundColor: up ? color.success : color.surface3 }]}>
            <T variant="bodyStrong" style={{ color: up ? color.accentInk : color.ink }}>
              {signed(reveal.ovrGain, 2)}
            </T>
          </View>
        </Row>
        {preview ? (
          <T variant="meta" tone="muted">
            Training this week, before the race
          </T>
        ) : null}
      </Card>

      <Card>
        <Label>{rows.length ? "What improved" : "No training gains this week"}</Label>
        {rows.map(({ id, g }, i) => {
          // Staggered fills that all end with the count-up.
          const p = Math.max(0, Math.min(1, (k - i * 0.12) / (1 - (rows.length - 1) * 0.12)));
          const from = reveal.before[id];
          return (
            <View key={id} style={{ gap: 6 }}>
              <Row style={{ justifyContent: "space-between" }}>
                <T variant="bodyStrong">{statLabel[id]}</T>
                <T variant="bodyStrong" style={{ fontVariant: ["tabular-nums"] }}>
                  <T variant="bodyStrong" tone="muted">{`${from.toFixed(1)} → `}</T>
                  {(from + g * p).toFixed(1)}
                  <T variant="bodyStrong" tone="success">{p >= 1 ? `  +${g.toFixed(2)}` : ""}</T>
                </T>
              </Row>
              <View style={styles.track}>
                <View style={{ width: `${from}%`, backgroundColor: color.ink2 }} />
                <View style={{ width: `${Math.min(100 - from, g * 6 * p)}%`, backgroundColor: color.success }} />
              </View>
            </View>
          );
        })}
      </Card>

      <Row>
        <Card style={styles.tile}>
          <T variant="small" tone="muted">
            {preview ? "Readiness on race day" : "Race readiness"}
          </T>
          <T variant="numberM" style={{ color: readinessColor(reveal.ready) }}>{`${reveal.ready} · ${readinessLabel(reveal.ready)}`}</T>
        </Card>
        <Card style={styles.tile}>
          <T variant="small" tone="muted">
            Fatigue
          </T>
          <T variant="numberM" style={{ color: fatigueColor(reveal.fatigueAfter) }}>{`${Math.round(reveal.fatigueBefore)} → ${Math.round(reveal.fatigueAfter)}`}</T>
        </Card>
      </Row>

      {tip ? <Coach>That's your athlete getting better. Train every week: races are where it pays off.</Coach> : null}

      {reveal.notes.map((n, i) => (
        <Card key={i} tint={n.bg} style={{ padding: space.lg }}>
          <T variant="caption" style={{ color: n.tone }}>
            {n.text}
          </T>
        </Card>
      ))}
      {preview ? (
        <Chip fg={color.ink2} bg={color.surface}>
          Not played yet: you can still go back and change it
        </Chip>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  badge: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 10 },
  track: { height: 10, borderRadius: radius.pill, backgroundColor: color.surface3, flexDirection: "row", overflow: "hidden" },
  tile: { flex: 1, padding: space.md, gap: 2 },
});
