import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import {
  STAT_IDS,
  decideWeek,
  effects,
  energyPerWeek,
  knockChanceFor,
  nextFatigue,
  ovr,
  ovrGain,
  profiles,
  raceIndexForWeek,
  readiness,
  seasonConfig,
  trainingGains,
  type GameState,
  type Intensity,
  type TrainingFocus,
  type WeekChoices,
} from "@sim";
import { Hud } from "@/components/Hud";
import { Icon } from "@/components/Icon";
import { Ring, readinessColor, readinessLabel } from "@/components/Ring";
import { Bar, Button, Card, Chip, Label, Row, Screen, Segmented, T } from "@/components/ui";
import { useGame } from "@/game/store";
import { focusInfo, intensityInfo, pacingInfo, signed, statShort } from "@/format";
import { color, fatigueColor, radius, space } from "@/theme";

const FOCUS: TrainingFocus[] = ["run", "engine", "strength", "hybrid", "balanced"];
const INTENSITY: Intensity[] = ["light", "normal", "hard"];

/** Training multiplier for the week, mirroring playWeek (race week, knock, injury, altitude camp, booster). */
export function weekMult(s: GameState, racing: boolean, booster: boolean): number {
  const c = s.config;
  if (s.status === "injured") return 0;
  let m = s.campWeeksLeft > 0 ? c.camps.altitude.mult : 1;
  if (racing) m *= c.training.raceWeekGains;
  if (s.status === "knock") m *= c.injury.knockGains;
  if (booster) m *= c.boosts.boosterMult;
  return m;
}

export function riskLabel(k: number): { text: string; tone: string } {
  return k < 0.05 ? { text: "Low", tone: color.success } : k < 0.12 ? { text: "Medium", tone: color.warning } : { text: "High", tone: color.danger };
}

export default function Training() {
  const { s, play, draft, setDraft } = useGame();
  const c = s.config;
  const week = s.week + 1;
  const raceWeek = raceIndexForWeek(s, week) > 0;
  const injured = s.status === "injured";
  const coach = useMemo(() => decideWeek(s, profiles.active, raceWeek && !injured), [s, raceWeek, injured]);
  const base = draft ?? coach;

  const [focus, setFocus] = useState<TrainingFocus>(base.focus ?? "balanced");
  const [intensity, setIntensity] = useState<Intensity>(base.intensity ?? "normal");
  const [booster, setBooster] = useState<boolean>(!!base.booster);
  const [error, setError] = useState<string | null>(null);

  const racing = raceWeek && !injured && (base.race ?? true);
  const fx = effects(s);
  const input = { focus, intensity, age: s.age, effects: fx, mult: weekMult(s, racing, booster) };
  const gains = trainingGains(c, s.stats, input);
  const fatigueAfter = nextFatigue(c, s.fatigue, intensity, racing, fx);
  const knock = knockChanceFor(c, fatigueAfter, fx);
  const risk = riskLabel(knock);
  const readyAfter = readiness(s, fatigueAfter);
  const top = STAT_IDS.map((id) => ({ id, g: gains[id] ?? 0 }))
    .filter((x) => x.g > 0.005)
    .sort((a, b) => b.g - a.g)
    .slice(0, 3);
  const boosterCost = c.gems.booster;
  const plan: WeekChoices = { ...base, focus, intensity, booster, race: base.race ?? (raceWeek && !injured) };
  const isCoachPlan = focus === coach.focus && intensity === coach.intensity;

  function applyCoach() {
    setFocus(coach.focus ?? "balanced");
    setIntensity(coach.intensity ?? "normal");
  }

  function next() {
    if (raceWeek) {
      setDraft(plan);
      router.push("/raceday");
      return;
    }
    const r = play({ ...plan, race: false });
    if (!r.ok) {
      setError(r.error === "notEnoughEnergy" ? "Not enough energy for this week." : r.error === "notEnoughGems" ? "Not enough gems for the booster." : `Can't play this week (${r.error}).`);
      return;
    }
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
    router.replace("/report");
  }

  return (
    <Screen
      footer={
        <>
          {error ? (
            <T variant="caption" tone="dangerText">
              {error}
            </T>
          ) : null}
          <Row style={{ justifyContent: "space-between" }}>
            <T variant="caption" tone="ink2">{`Week cost ${energyPerWeek(s)} energy`}</T>
            <T variant="caption" tone="muted">
              {raceWeek ? "Race decision next" : "Spent when you confirm"}
            </T>
          </Row>
          <Button hero label={raceWeek ? "Continue to race day" : "Confirm week"} onPress={next} />
        </>
      }
    >
      <Hud back />
      <View style={{ gap: 2 }}>
        <Label>{`Week ${week} of ${seasonConfig(s).weeks} · ${raceWeek ? "race this week" : "no race this week"}`}</Label>
        <T variant="h1">Training</T>
      </View>

      <Card>
        <Label>{raceWeek ? "On race day" : "End of the week"}</Label>
        <Row gap={space.lg}>
          <Ring value={readyAfter} size={84} showLabel={false} />
          <View style={{ flex: 1, gap: 2 }}>
            <T variant="label" style={{ color: readinessColor(readyAfter) }}>
              {readinessLabel(readyAfter)}
            </T>
            <T variant="bodyStrong">Race readiness</T>
            <T variant="caption" tone="muted">{`Fatigue ${Math.round(s.fatigue)} → ${Math.round(fatigueAfter)}${s.status !== "fit" ? ` · ${s.status}` : ""}`}</T>
          </View>
        </Row>
        <Row>
          <View style={styles.tile}>
            <T variant="small" tone="muted">
              Fatigue
            </T>
            <T variant="numberL" style={{ color: fatigueColor(fatigueAfter) }}>
              {Math.round(fatigueAfter)}
            </T>
          </View>
          <View style={styles.tile}>
            <T variant="small" tone="muted">
              Injury risk
            </T>
            <T variant="numberL" style={{ color: risk.tone }}>
              {risk.text}
            </T>
          </View>
        </Row>
        <T variant="caption" tone="muted">
          {top.length ? `Gains this week: ${top.map((x) => `${statShort[x.id]} +${x.g.toFixed(2)}`).join(" · ")}` : "No training gains this week."}
        </T>
      </Card>

      <Pressable
        accessibilityRole="switch"
        accessibilityState={{ checked: booster }}
        disabled={!booster && s.gems < boosterCost}
        onPress={() => setBooster(!booster)}
        style={[styles.offer, booster ? { borderColor: color.gem, backgroundColor: "#16303A" } : null]}
      >
        <View style={styles.offerIcon}>
          <Icon name="bolt" size={22} color={color.gem} />
        </View>
        <View style={{ flex: 1 }}>
          <T variant="bodyStrong">Training booster</T>
          <T variant="caption" tone="muted">
            {s.gems < boosterCost && !booster ? "Not enough gems" : `×${c.boosts.boosterMult} on every gain this week`}
          </T>
        </View>
        <View style={[styles.gemPrice, booster ? { backgroundColor: color.gem } : null]}>
          <Icon name={booster ? "check" : "gem"} size={15} color={booster ? color.accentInk : color.gem} />
          <T variant="bodyStrong" style={{ color: booster ? color.accentInk : color.gem }}>
            {booster ? "On" : `${boosterCost}`}
          </T>
        </View>
      </Pressable>

      <Pressable accessibilityRole="button" onPress={applyCoach} style={[styles.coach, isCoachPlan ? { borderColor: color.success } : null]}>
        <View style={{ flex: 1, gap: 2 }}>
          <T variant="bodyStrong">{isCoachPlan ? "Following your coach's plan" : "Use your coach's plan"}</T>
          <T variant="caption" tone="muted">
            {`${focusInfo[coach.focus ?? "balanced"].label} · ${intensityInfo[coach.intensity ?? "normal"].label}${raceWeek ? (coach.race ? ` · race ${pacingInfo[coach.pacing ?? "even"].label.toLowerCase()}` : " · skip the race") : ""}`}
          </T>
        </View>
        <Chip fg={isCoachPlan ? color.success : color.accent} bg={isCoachPlan ? color.successTint : color.accentTint}>
          {isCoachPlan ? "On" : "Apply"}
        </Chip>
      </Pressable>

      <Card>
        <Label>Week plan · training block</Label>
        <View style={styles.grid}>
          {FOCUS.map((f) => {
            const on = f === focus;
            const g = ovrGain(c, s.stats, { ...input, focus: f });
            return (
              <Pressable
                key={f}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`${focusInfo[f].label}, ${focusInfo[f].detail}, plus ${g.toFixed(2)} overall`}
                onPress={() => setFocus(f)}
                style={[styles.block, f === "balanced" ? { width: "100%" } : null, on ? styles.blockOn : null]}
              >
                <Row style={{ justifyContent: "space-between" }}>
                  <T variant="bodyStrong" style={on ? { color: color.accent } : null}>
                    {focusInfo[f].label}
                  </T>
                  <T variant="small" style={{ color: g > 0 ? color.success : color.muted }}>{`${signed(g, 2)} OVR`}</T>
                </Row>
                <T variant="caption" tone="muted" numberOfLines={1}>
                  {focusInfo[f].detail}
                </T>
              </Pressable>
            );
          })}
        </View>
        <Label style={{ marginTop: space.xs }}>Intensity</Label>
        <Segmented
          label="Intensity"
          value={intensity}
          onChange={setIntensity}
          options={INTENSITY.map((i) => {
            const f = nextFatigue(c, s.fatigue, i, racing, fx);
            return { key: i, label: intensityInfo[i].label, sub: `Fatigue ${Math.round(f)}`, subColor: fatigueColor(f) };
          })}
        />
        {s.status === "knock" ? (
          <View style={[styles.banner, { backgroundColor: color.warningTint }]}>
            <T variant="caption" tone="warning">
              Knock: gains are halved this week, and racing or training hard on it can turn it into an injury.
            </T>
          </View>
        ) : null}
        {injured ? (
          <View style={[styles.banner, { backgroundColor: color.dangerTint }]}>
            <T variant="caption" tone="dangerText">{`Injured for ${s.injuryWeeksLeft} more week${s.injuryWeeksLeft > 1 ? "s" : ""}: rest only, no gains.`}</T>
          </View>
        ) : null}
        {fatigueAfter >= 50 ? (
          <View style={[styles.banner, { backgroundColor: color.dangerTint }]}>
            <T variant="caption" tone="dangerText">
              High fatigue: slower races and a much higher knock risk. A light week brings it down.
            </T>
          </View>
        ) : null}
      </Card>

      <Card>
        <Row style={{ justifyContent: "space-between" }}>
          <Label>Stations</Label>
          <T variant="small" tone="muted">{`Overall ${ovr(s).toFixed(1)}`}</T>
        </Row>
        {STAT_IDS.map((id) => {
          const g = gains[id] ?? 0;
          return (
            <View key={id} style={styles.statRow} accessibilityLabel={`${statShort[id]} ${s.stats[id].toFixed(1)}${g > 0 ? `, plus ${g.toFixed(2)}` : ""}`}>
              <T variant="small" tone="ink2" style={{ width: 42 }}>
                {statShort[id]}
              </T>
              <View style={{ flex: 1 }}>
                <Bar value={s.stats[id]} fill={color.ink2} extra={g * 6} extraFill={color.success} />
              </View>
              <T variant="small" style={{ width: 30, textAlign: "right" }}>
                {s.stats[id].toFixed(0)}
              </T>
              <T variant="small" style={{ width: 40, textAlign: "right", color: g > 0 ? color.success : color.faint }}>
                {g > 0.005 ? `+${g.toFixed(2)}` : "·"}
              </T>
            </View>
          );
        })}
        <T variant="caption" tone="muted">
          Green = this week's gain (shown x6). The weakest stations improve fastest.
        </T>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  tile: { flex: 1, backgroundColor: color.surface2, borderRadius: radius.md, padding: space.md, gap: 2 },
  offer: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    backgroundColor: color.surface,
    borderRadius: radius.xl,
    padding: space.lg,
    borderWidth: 1,
    borderColor: "#2B5966",
  },
  offerIcon: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: color.appShell, alignItems: "center", justifyContent: "center" },
  gemPrice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    minHeight: 44,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.gem,
  },
  coach: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    borderWidth: 1,
    borderColor: color.border,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  block: {
    width: "48.5%",
    flexGrow: 1,
    flexBasis: "45%",
    backgroundColor: color.surface2,
    borderRadius: radius.md,
    padding: space.md,
    gap: 2,
    borderWidth: 1.5,
    borderColor: "transparent",
    minHeight: 60,
  },
  blockOn: { borderColor: color.accent, backgroundColor: color.accentTint },
  banner: { borderRadius: radius.md, padding: space.md },
  statRow: { flexDirection: "row", alignItems: "center", gap: space.sm, minHeight: 20 },
});
