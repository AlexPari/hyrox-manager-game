import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import {
  STAT_IDS,
  decideWeek,
  divisionConfig,
  effects,
  energyPerWeek,
  gearBonus,
  isWorldsWeek,
  knockChanceFor,
  nextFatigue,
  ovr,
  ovrGain,
  profiles,
  raceCity,
  raceIndexForWeek,
  seasonConfig,
  timeForRating,
  trainingGains,
  type GameState,
  type Intensity,
  type Pacing,
  type TrainingFocus,
} from "@sim";
import { Hud } from "@/components/Hud";
import { Bar, Button, Card, Chip, Label, Row, Screen, Segmented, T } from "@/components/ui";
import { useGame } from "@/game/store";
import { focusInfo, intensityInfo, num, pacingInfo, raceTime, signed, statShort } from "@/format";
import { color, fatigueColor, radius, space } from "@/theme";

const FOCUS: TrainingFocus[] = ["run", "engine", "strength", "hybrid", "balanced"];
const INTENSITY: Intensity[] = ["light", "normal", "hard"];
const PACING: Pacing[] = ["conservative", "even", "aggressive"];

/** Training multiplier for this week, mirroring playWeek (race week, knock, injury, altitude camp). Boosters aside. */
function weekMult(s: GameState, racing: boolean): number {
  const c = s.config;
  if (s.status === "injured") return 0;
  let m = s.campWeeksLeft > 0 ? c.camps.altitude.mult : 1;
  if (racing) m *= c.training.raceWeekGains;
  if (s.status === "knock") m *= c.injury.knockGains;
  return m;
}

export default function Training() {
  const { s, play } = useGame();
  const c = s.config;
  const week = s.week + 1;
  const raceWeek = raceIndexForWeek(s, week) > 0;
  const worlds = isWorldsWeek(s, week);
  const d = divisionConfig(s);
  const injured = s.status === "injured";
  const coach = useMemo(() => decideWeek(s, profiles.active, raceWeek && !injured), [s, raceWeek, injured]);

  const [focus, setFocus] = useState<TrainingFocus>(coach.focus ?? "balanced");
  const [intensity, setIntensity] = useState<Intensity>(coach.intensity ?? "normal");
  const [race, setRace] = useState<boolean>(raceWeek && !injured && (coach.race || worlds));
  const [pacing, setPacing] = useState<Pacing>(coach.pacing ?? "even");
  const [error, setError] = useState<string | null>(null);

  const racing = raceWeek && race;
  const fx = effects(s);
  const mult = weekMult(s, racing);
  const input = { focus, intensity, age: s.age, effects: fx, mult };
  const gains = trainingGains(c, s.stats, input);
  const fatigueAfter = nextFatigue(c, s.fatigue, intensity, racing, fx);
  const knock = knockChanceFor(c, fatigueAfter, fx);
  const abroad = s.abroadRoll < d.abroadShare;
  const fee = d.entryFee + (abroad ? c.coins.travelPerRaceAbroad : 0);
  const raceOffset =
    gearBonus(s) + (fx.raceDay ?? 0) - s.fatigue * c.fatigue.racePenaltyPerPoint - (s.status === "knock" ? c.injury.knockPenalty : 0);
  const expected = timeForRating(c, ovr(s) + raceOffset + c.race.pacing[pacing].offset);
  const isCoachPlan =
    focus === coach.focus && intensity === coach.intensity && (!raceWeek || (race === coach.race && pacing === coach.pacing));

  function applyCoach() {
    setFocus(coach.focus ?? "balanced");
    setIntensity(coach.intensity ?? "normal");
    setRace(raceWeek && !injured && coach.race);
    setPacing(coach.pacing ?? "even");
  }

  function confirm() {
    const r = play({ race: racing, focus, intensity, pacing });
    if (!r.ok) {
      setError(
        r.error === "notEnoughEnergy"
          ? "Not enough energy for this week."
          : r.error === "notEnoughCoins"
            ? "Not enough coins for the entry fee."
            : r.error === "injured"
              ? "Injured athletes can't race."
              : `Can't play this week (${r.error}).`,
      );
      return;
    }
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
    router.replace(r.events.some((e) => e.type === "race") ? "/race" : "/report");
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
          <Button
            hero
            label={racing ? "Confirm & race" : "Confirm week"}
            sub={`Uses ${energyPerWeek(s)} energy${racing ? ` · entry ${num(fee)} coins` : ""}`}
            onPress={confirm}
          />
        </>
      }
    >
      <Hud back />
      <View style={{ gap: 2 }}>
        <Label>{`Season ${s.season} · ${s.division}`}</Label>
        <T variant="h1">{`Week ${week} of ${seasonConfig(s).weeks}`}</T>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={applyCoach}
        style={[styles.coach, isCoachPlan ? { borderColor: color.success } : null]}
      >
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

      {raceWeek ? (
        <Card tint={worlds ? color.trophyTint : undefined}>
          <Row style={{ justifyContent: "space-between" }}>
            <Label>{worlds ? "World Championships" : "Race week"}</Label>
            {abroad ? <Chip>Abroad</Chip> : null}
          </Row>
          <T variant="h2">{raceCity(s, week)}</T>
          <T
            variant="meta"
            tone="muted"
          >{`${d.size} athletes · entry ${num(d.entryFee)}${abroad ? ` + travel ${num(c.coins.travelPerRaceAbroad)}` : ""} coins`}</T>
          {injured ? (
            <T variant="caption" tone="dangerText">
              Injured: you can't race this week.
            </T>
          ) : (
            <>
              <Segmented
                label="Race entry"
                value={race ? "race" : "skip"}
                onChange={(k) => setRace(k === "race")}
                options={[
                  { key: "race", label: "Race", sub: "65% training" },
                  { key: "skip", label: "Skip", sub: "Full training" },
                ]}
              />
              {race ? (
                <>
                  <Label style={{ marginTop: space.xs }}>Pacing</Label>
                  <Segmented
                    label="Pacing"
                    value={pacing}
                    onChange={setPacing}
                    options={PACING.map((p) => ({ key: p, label: pacingInfo[p].label, sub: pacingInfo[p].detail }))}
                  />
                  <Row style={{ justifyContent: "space-between" }}>
                    <T variant="meta" tone="muted">
                      Expected time
                    </T>
                    <T variant="numberM">{`~${raceTime(expected)}`}</T>
                  </Row>
                  {s.fatigue >= 35 ? (
                    <T
                      variant="caption"
                      tone="warning"
                    >{`Fatigue ${Math.round(s.fatigue)}% will cost you about ${raceTime(timeForRating(c, 90) - timeForRating(c, 90 + s.fatigue * c.fatigue.racePenaltyPerPoint))}.`}</T>
                  ) : null}
                </>
              ) : null}
            </>
          )}
        </Card>
      ) : null}

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
                style={[styles.tile, f === "balanced" ? { width: "100%" } : null, on ? styles.tileOn : null]}
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
      </Card>

      <Card>
        <Label>Intensity</Label>
        <Segmented
          label="Intensity"
          value={intensity}
          onChange={setIntensity}
          options={INTENSITY.map((i) => {
            const f = nextFatigue(c, s.fatigue, i, racing, fx);
            return { key: i, label: intensityInfo[i].label, sub: `Fatigue ${Math.round(f)}%`, subColor: fatigueColor(f) };
          })}
        />
        <Row style={{ justifyContent: "space-between" }}>
          <T variant="meta" tone="muted">{`Fatigue ${Math.round(s.fatigue)}% → ${Math.round(fatigueAfter)}%`}</T>
          <T variant="meta" style={{ color: knock >= 0.08 ? color.warning : color.muted }}>{`Knock risk ${Math.round(knock * 100)}%`}</T>
        </Row>
        <Bar value={fatigueAfter} fill={fatigueColor(fatigueAfter)} />
      </Card>

      <Card>
        <Row style={{ justifyContent: "space-between" }}>
          <Label>Stations</Label>
          <T variant="small" tone="muted">{`Overall ${ovr(s).toFixed(1)}`}</T>
        </Row>
        {STAT_IDS.map((id) => {
          const g = gains[id] ?? 0;
          return (
            <View
              key={id}
              style={styles.statRow}
              accessibilityLabel={`${statShort[id]} ${s.stats[id].toFixed(1)}${g > 0 ? `, plus ${g.toFixed(2)}` : ""}`}
            >
              <T variant="small" tone="ink2" style={{ width: 42 }}>
                {statShort[id]}
              </T>
              <View style={{ flex: 1 }}>
                <Bar value={s.stats[id]} fill={color.ink2} extra={g * 6} extraFill={color.success} />
              </View>
              <T variant="small" style={{ width: 34, textAlign: "right" }}>
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
  tile: {
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
  tileOn: { borderColor: color.accent, backgroundColor: color.accentTint },
  statRow: { flexDirection: "row", alignItems: "center", gap: space.sm, minHeight: 20 },
});
