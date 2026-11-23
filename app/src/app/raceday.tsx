import * as Haptics from "expo-haptics";
import { Redirect, router } from "expo-router";
import { useState } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import {
  STAT_IDS,
  decideWeek,
  divisionConfig,
  effects,
  expectedPlace,
  expectedRaceRating,
  fastHeal,
  isWorldsWeek,
  nextFatigue,
  physio,
  placeRewards,
  profiles,
  raceCity,
  raceIndexForWeek,
  readiness,
  timeForRating,
  trainingGains,
  type GameState,
  type WeekChoices,
} from "@sim";
import { Hud } from "@/components/Hud";
import { Icon } from "@/components/Icon";
import { Ring } from "@/components/Ring";
import { Button, Card, Divider, Label, Row, Screen, T } from "@/components/ui";
import { flag, placeOf } from "@/data/places";
import { useGame } from "@/game/store";
import { focusInfo, intensityInfo, num, ordinal, pacingInfo, raceTime, statShort } from "@/format";
import { color, fatigueColor, radius, space } from "@/theme";
import { weekMult } from "./training";

/** Race-day maths shared with the pacing plan: fatigue after an optional ice bath, and the bonus it all adds. */
export function raceDayExtras(s: GameState, plan: WeekChoices, week: number) {
  const c = s.config;
  const fatigueRace = Math.max(0, s.fatigue - (plan.iceBath ? c.boosts.iceBathFatigue : 0));
  const extra =
    (s.fatigue - fatigueRace) * c.fatigue.racePenaltyPerPoint +
    (plan.coachCall ? c.boosts.coachCallBonus : 0) +
    (isWorldsWeek(s, week) && s.heatCampBooked ? c.camps.heat.raceBonus : 0);
  return { fatigueRace, extra };
}

export default function RaceDay() {
  const { s, play, draft, setDraft, run } = useGame();
  const [error, setError] = useState<string | null>(null);
  const week = s.week + 1;
  if (!raceIndexForWeek(s, week)) return <Redirect href="/training" />;

  const c = s.config;
  const d = divisionConfig(s);
  const worlds = isWorldsWeek(s, week);
  const city = raceCity(s, week);
  const where = placeOf(city);
  const injured = s.status === "injured";
  const plan: WeekChoices = draft ?? decideWeek(s, profiles.active, !injured);
  const setPlan = (p: Partial<WeekChoices>) => setDraft({ ...plan, ...p });
  const pacing = plan.pacing ?? "even";
  const abroad = s.abroadRoll < d.abroadShare;
  const fee = d.entryFee + (abroad ? c.coins.travelPerRaceAbroad : 0);
  const { fatigueRace, extra } = raceDayExtras(s, plan, week);
  const rating = expectedRaceRating(s, pacing, extra);
  const estPlace = expectedPlace(s, rating);
  const best = placeRewards(s, 1, worlds);
  const est = placeRewards(s, estPlace, worlds);
  const fx = effects(s);
  const focus = plan.focus ?? "balanced";
  const intensity = plan.intensity ?? "normal";
  const gainsRace = trainingGains(c, s.stats, { focus, intensity, age: s.age, effects: fx, mult: weekMult(s, true, !!plan.booster) });
  const gainsSkip = trainingGains(c, s.stats, { focus, intensity, age: s.age, effects: fx, mult: weekMult(s, false, !!plan.booster) });
  const sum = (g: Partial<Record<string, number>>) => STAT_IDS.reduce((t, id) => t + (g[id] ?? 0), 0);
  const top = STAT_IDS.map((id) => ({ id, g: gainsRace[id] ?? 0 }))
    .filter((x) => x.g > 0.005)
    .sort((a, b) => b.g - a.g)
    .slice(0, 4);

  function go(race: boolean) {
    const choice: WeekChoices = { ...plan, race, iceBath: race && !!plan.iceBath, coachCall: race && !!plan.coachCall };
    const r = play(choice);
    if (!r.ok) {
      setError(
        r.error === "notEnoughCoins"
          ? "Not enough coins for the entry fee."
          : r.error === "notEnoughGems"
            ? "Not enough gems for your boosts."
            : r.error === "notEnoughEnergy"
              ? "Not enough energy for this week."
              : r.error === "injured"
                ? "Injured athletes can't race."
                : `Can't play this week (${r.error}).`,
      );
      return;
    }
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => undefined);
    router.replace(race ? "/race" : "/report");
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
          <Row>
            <View style={{ flex: 1.4 }}>
              <Button hero label="Race" sub={`Entry ${num(fee)} coins`} disabled={injured} onPress={() => go(true)} />
            </View>
            <View style={{ flex: 1 }}>
              <Button hero variant="secondary" label="Skip" sub="Full training" onPress={() => go(false)} />
            </View>
          </Row>
        </>
      }
    >
      <Hud back />
      <View style={{ gap: 2 }}>
        <Label>{`Week ${week} · ${worlds ? "World Championships" : "race week"}`}</Label>
        <T variant="h1">Race day</T>
        <T variant="meta" tone="muted">
          Your week is planned: race or skip.
        </T>
      </View>

      <Card style={{ borderWidth: 1.5, borderColor: worlds ? color.gold : color.accent }} tint={worlds ? color.trophyTint : undefined}>
        <T variant="label" tone="accent">{`${s.division} race · ${d.size} athletes${abroad ? " · abroad" : ""}`}</T>
        <T variant="displayTitle">{worlds ? "Worlds" : city}</T>
        <T variant="meta" tone="ink2">{`${flag(where.country)}  ${where.countryName}${where.region ? `, ${where.region}` : ""}`}</T>
        <Row gap={space.lg}>
          <Ring value={readiness(s, fatigueRace)} size={88} />
          <View style={{ flex: 1, gap: space.sm }}>
            <Label>Race readiness</Label>
            <Row style={{ justifyContent: "space-between" }}>
              <View>
                <T variant="small" tone="muted">
                  Fatigue
                </T>
                <T variant="numberM" style={{ color: fatigueColor(fatigueRace) }}>
                  {Math.round(fatigueRace)}
                </T>
              </View>
              <View>
                <T variant="small" tone="muted">
                  Status
                </T>
                <T variant="numberM" style={{ color: s.status === "fit" ? color.success : s.status === "knock" ? color.warning : color.dangerText }}>
                  {s.status === "fit" ? "Fit" : s.status === "knock" ? "Knock" : "Injured"}
                </T>
              </View>
            </Row>
          </View>
        </Row>
        <Row>
          <View style={styles.tile}>
            <T variant="small" tone="muted">
              If you win
            </T>
            <T variant="bodyStrong">{`${best.points} pts · ${num(best.prize)} coins`}</T>
          </View>
          <View style={styles.tile}>
            <T variant="small" tone="muted">
              Expected
            </T>
            <T variant="bodyStrong">{`${ordinal(Math.min(estPlace, d.size))} · ${est.points} pts`}</T>
          </View>
        </Row>
        <Pressable accessibilityRole="button" onPress={() => router.push("/pacing")} style={styles.row}>
          <T variant="bodyStrong">
            Pacing plan
            <T variant="meta" tone="muted">{`  ${pacingInfo[pacing].label} · ~${raceTime(timeForRating(c, rating))}`}</T>
          </T>
          <T variant="bodyStrong" tone="accent">
            {"Edit ›"}
          </T>
        </Pressable>
        {s.status === "knock" ? (
          <View style={[styles.box, { backgroundColor: color.warningTint }]}>
            <T variant="caption" tone="warning">{`Knock: racing on it costs about ${c.injury.knockPenalty} rating points and has a ${Math.round(c.injury.injuryIfStrained * 100)}% chance to turn into an injury.`}</T>
            <Pressable
              accessibilityRole="button"
              disabled={s.coins < c.coins.physio}
              onPress={() => run((st) => physio(st))}
              style={[styles.row, { backgroundColor: color.surface2 }]}
            >
              <T variant="bodyStrong">Physio session: clear it</T>
              <Row gap={4}>
                <Icon name="coin" size={15} color={color.coin} />
                <T variant="bodyStrong" tone="coin">
                  {num(c.coins.physio)}
                </T>
              </Row>
            </Pressable>
          </View>
        ) : null}
        {injured ? (
          <View style={[styles.box, { backgroundColor: color.dangerTint }]}>
            <T variant="caption" tone="dangerText">{`Injured for ${s.injuryWeeksLeft} more week${s.injuryWeeksLeft > 1 ? "s" : ""}: you can't race.`}</T>
            <Pressable
              accessibilityRole="button"
              disabled={s.gems < c.gems.fastHeal}
              onPress={() => run((st) => fastHeal(st))}
              style={[styles.row, { backgroundColor: color.surface2 }]}
            >
              <T variant="bodyStrong">Fast heal: back now</T>
              <Row gap={4}>
                <Icon name="gem" size={15} color={color.gem} />
                <T variant="bodyStrong" tone="gem">
                  {c.gems.fastHeal}
                </T>
              </Row>
            </Pressable>
          </View>
        ) : null}
        {!injured ? (
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: !!plan.iceBath }}
            disabled={!plan.iceBath && s.gems < c.gems.iceBath}
            onPress={() => setPlan({ iceBath: !plan.iceBath })}
            style={[styles.offer, plan.iceBath ? { borderColor: color.gem, backgroundColor: "#16303A" } : null]}
          >
            <View style={styles.offerIcon}>
              <Icon name="snow" size={22} color={color.gem} />
            </View>
            <View style={{ flex: 1 }}>
              <T variant="bodyStrong">Ice bath</T>
              <T variant="caption" tone="muted">{`Fatigue −${c.boosts.iceBathFatigue} before the race`}</T>
            </View>
            <View style={[styles.gemPrice, plan.iceBath ? { backgroundColor: color.gem } : null]}>
              <Icon name={plan.iceBath ? "check" : "gem"} size={15} color={plan.iceBath ? color.accentInk : color.gem} />
              <T variant="bodyStrong" style={{ color: plan.iceBath ? color.accentInk : color.gem }}>
                {plan.iceBath ? "On" : `${c.gems.iceBath}`}
              </T>
            </View>
          </Pressable>
        ) : null}
      </Card>

      <Card>
        <Label>Your week</Label>
        <Row style={{ justifyContent: "space-between" }}>
          <T variant="bodyStrong">{`${focusInfo[focus].label} · ${intensityInfo[intensity].label}${plan.booster ? " · booster" : ""}`}</T>
          <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={10}>
            <T variant="bodyStrong" tone="accent">
              Change
            </T>
          </Pressable>
        </Row>
        <T variant="caption" tone="success">
          {top.length ? top.map((x) => `${statShort[x.id]} +${x.g.toFixed(2)}`).join(" · ") : "No training gains"}
        </T>
        <Divider />
        <Row style={{ justifyContent: "space-between" }}>
          <T variant="meta" tone="muted">
            Fatigue after the week
          </T>
          <T variant="meta">{`Race ${Math.round(nextFatigue(c, s.fatigue, intensity, true, fx))} · skip ${Math.round(nextFatigue(c, s.fatigue, intensity, false, fx))}`}</T>
        </Row>
        <Row style={{ justifyContent: "space-between" }}>
          <T variant="meta" tone="muted">
            Training if you race
          </T>
          <T variant="meta">{`${Math.round((sum(gainsRace) / Math.max(1e-9, sum(gainsSkip))) * 100)}% of a full week`}</T>
        </Row>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  tile: { flex: 1, backgroundColor: color.surface2, borderRadius: radius.md, padding: space.md, gap: 2 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 48,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    backgroundColor: color.surface2,
  },
  box: { borderRadius: radius.md, padding: space.lg, gap: space.md },
  offer: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    backgroundColor: color.surface2,
    borderRadius: radius.lg,
    padding: space.md,
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
});
