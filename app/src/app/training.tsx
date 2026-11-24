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
  type Intensity,
  type TrainingFocus,
  type WeekChoices,
} from "@sim";
import { Hud } from "@/components/Hud";
import { Icon } from "@/components/Icon";
import { readinessColor, readinessLabel } from "@/components/Ring";
import { Bar, Button, Card, Chip, Label, Row, Screen, Segmented, T } from "@/components/ui";
import { Coach } from "@/components/Coach";
import { unlocks } from "@/game/ftue";
import { riskLabel, weekMult } from "@/game/rules";
import { useGame } from "@/game/store";
import { focusInfo, intensityInfo, signed, statShort } from "@/format";
import { color, fatigueColor, radius, space } from "@/theme";

const FOCUS: TrainingFocus[] = ["run", "engine", "strength", "hybrid", "balanced"];
const INTENSITY: Intensity[] = ["light", "normal", "hard"];

export default function Training() {
  const { s, play, draft, setDraft, ftue, markSeen } = useGame();
  const free = !unlocks(s, ftue).shop;
  const tip = ftue.active && !ftue.seen.includes("plan:first");
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
  // Race weeks: the race is run on the fatigue carried into the week.
  const readyAfter = Math.round(raceWeek ? readiness(s) : readiness(s, fatigueAfter));
  const gainOvr = ovrGain(c, s.stats, input);
  const boosterCost = c.gems.booster;
  const plan: WeekChoices = { ...base, focus, intensity, booster, race: base.race ?? (raceWeek && !injured) };
  const isCoachPlan = focus === coach.focus && intensity === coach.intensity;

  function applyCoach() {
    setFocus(coach.focus ?? "balanced");
    setIntensity(coach.intensity ?? "normal");
  }

  function next() {
    if (tip) markSeen("plan:first");
    if (raceWeek) {
      // Race weeks: show the training effect, then the race plan. The week is played when the race starts.
      setDraft(plan);
      router.push("/progress?preview=1");
      return;
    }
    const r = play({ ...plan, race: false });
    if (!r.ok) {
      setError(r.error === "notEnoughEnergy" ? "Not enough energy for this week." : r.error === "notEnoughGems" ? "Not enough gems for the booster." : `Can't play this week (${r.error}).`);
      return;
    }
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
    router.replace("/progress");
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
          <Button hero label="Confirm week" sub={`${free ? "Free in your first session" : `${energyPerWeek(s)} energy`}${raceWeek ? " · race plan next" : ""}`} onPress={next} />
        </>
      }
    >
      <Hud back />
      <View style={{ gap: 2 }}>
        <Label>{`Week ${week} of ${seasonConfig(s).weeks} · ${raceWeek ? "race this week" : "no race"}`}</Label>
        <T variant="h1">{`Plan week ${week}`}</T>
      </View>

      {tip ? (
        <Coach>
          Pick a training block and an intensity: the green bars show what you gain this week. Hard gives more but tires you. My plan at the top is always a safe choice.
        </Coach>
      ) : null}

      <Pressable accessibilityRole="button" onPress={applyCoach} style={[styles.coach, isCoachPlan ? { borderColor: color.success, backgroundColor: color.surface } : null]}>
        <View style={styles.coachAvatar}>
          <T variant="bodyStrong" style={{ color: color.accentInk }}>
            CO
          </T>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <T variant="bodyStrong">{isCoachPlan ? "Following your coach's plan" : `Coach: ${focusInfo[coach.focus ?? "balanced"].label} · ${intensityInfo[coach.intensity ?? "normal"].label}`}</T>
          <T variant="caption" tone="muted">
            {isCoachPlan ? "The biggest overall gain this week" : "Tap to use it: the biggest overall gain this week"}
          </T>
        </View>
        <Chip fg={isCoachPlan ? color.success : color.accent} bg={isCoachPlan ? color.successTint : color.accentTint}>
          {isCoachPlan ? "On" : "Use"}
        </Chip>
      </Pressable>

      <Card>
        <Label>Training block</Label>
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
        <Row style={{ justifyContent: "space-between", alignItems: "flex-end" }}>
          <Label>This week you get</Label>
          <T variant="numberM">
            {`${ovr(s).toFixed(1)} → ${(ovr(s) + gainOvr).toFixed(1)} `}
            <T variant="numberM" style={{ color: gainOvr > 0 ? color.success : color.muted }}>
              {signed(gainOvr, 2)}
            </T>
          </T>
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
        <Row>
          <View style={styles.tile}>
            <T variant="small" tone="muted">
              {raceWeek ? "Readiness on race day" : "Readiness after"}
            </T>
            <T variant="numberM" style={{ color: readinessColor(readyAfter) }}>{`${readyAfter} · ${readinessLabel(readyAfter)}`}</T>
          </View>
          <View style={styles.tile}>
            <T variant="small" tone="muted">
              Knock risk
            </T>
            <T variant="numberM" style={{ color: risk.tone }}>
              {risk.text}
            </T>
          </View>
        </Row>
        {raceWeek ? (
          <T variant="caption" tone="muted">{`Race week: training counts ${Math.round(c.training.raceWeekGains * 100)}% if you race.`}</T>
        ) : null}
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
  coachAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: color.accent, alignItems: "center", justifyContent: "center" },
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
