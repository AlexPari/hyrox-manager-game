import * as Haptics from "expo-haptics";
import { Redirect, router } from "expo-router";
import { useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import {
  decideWeek,
  divisionConfig,
  effects,
  expectedPlace,
  expectedRaceRating,
  fastHeal,
  isWorldsWeek,
  physio,
  placeRewards,
  profiles,
  raceCity,
  raceIndexForWeek,
  readiness,
  timeForRating,
  type Pacing,
  type WeekChoices,
} from "@sim";
import { Hud } from "@/components/Hud";
import { Icon, type IconName } from "@/components/Icon";
import { Ring } from "@/components/Ring";
import { Button, Card, Label, Row, Screen, T } from "@/components/ui";
import { flag, placeOf } from "@/data/places";
import { useGame } from "@/game/store";
import { num, ordinal, pacingInfo, raceTime } from "@/format";
import { Coach } from "@/components/Coach";
import { raceDayExtras } from "@/game/rules";
import { color, radius, space } from "@/theme";

export default function RacePlan() {
  const { s, play, draft, setDraft, run, ftue, markSeen } = useGame();
  const tip = ftue.active && !ftue.seen.includes("raceplan:first");
  const [error, setError] = useState<string | null>(null);
  // Set while the week is being played, so the re-render before leaving doesn't redirect.
  const leaving = useRef(false);
  const week = s.week + 1;
  if (leaving.current) return null;
  if (!raceIndexForWeek(s, week)) return <Redirect href="/" />;

  const c = s.config;
  const d = divisionConfig(s);
  const worlds = isWorldsWeek(s, week);
  const city = raceCity(s, week);
  const where = placeOf(city);
  const injured = s.status === "injured";
  const plan: WeekChoices = { pacing: "even", ...(draft ?? decideWeek(s, profiles.active, !injured)) };
  const setPlan = (p: Partial<WeekChoices>) => setDraft({ ...plan, ...p });
  const pacing = plan.pacing ?? "even";
  const abroad = s.abroadRoll < d.abroadShare;
  const fee = d.entryFee + (abroad ? c.coins.travelPerRaceAbroad : 0);
  const { fatigueRace, extra } = raceDayExtras(s, plan, week);
  const rating = expectedRaceRating(s, pacing, extra);
  const estPlace = expectedPlace(s, rating);
  const best = placeRewards(s, 1, worlds);
  const est = placeRewards(s, estPlace, worlds);
  const consistency = 1 - (effects(s).consistency ?? 0);

  function go(race: boolean) {
    const choice: WeekChoices = { ...plan, race, iceBath: race && !!plan.iceBath, coachCall: race && !!plan.coachCall };
    leaving.current = true;
    if (tip) markSeen("raceplan:first");
    const r = play(choice);
    if (!r.ok) {
      leaving.current = false;
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
    router.replace(race ? "/race" : "/progress");
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
            <View style={{ flex: 1.6 }}>
              <Button hero icon="play" label="Start race" sub={`Entry ${num(fee)} coins`} disabled={injured} onPress={() => go(true)} />
            </View>
            <View style={{ flex: 1 }}>
              <Button hero variant="secondary" label="Skip race" sub="Full training" onPress={() => go(false)} />
            </View>
          </Row>
        </>
      }
    >
      <Hud back />
      <View style={{ gap: 2 }}>
        <Label>{`Week ${week} · ${worlds ? "World Championships" : "race day"}`}</Label>
        <T variant="h1">Race plan</T>
      </View>

      {tip ? <Coach>Even races at your level. Attack is faster but can blow up. Boosts are optional: you can race without them.</Coach> : null}

      <Card style={{ borderWidth: 1.5, borderColor: worlds ? color.gold : color.accent }} tint={worlds ? color.trophyTint : undefined}>
        <Row gap={space.lg}>
          <View style={{ flex: 1, gap: 2 }}>
            <T variant="label" tone="accent">{`${s.division} · ${d.size} athletes${abroad ? " · abroad" : ""}`}</T>
            <T variant="displayTitle" numberOfLines={1}>
              {worlds ? "Worlds" : city}
            </T>
            <T variant="meta" tone="ink2">{`${flag(where.country)}  ${where.countryName}${where.region ? `, ${where.region}` : ""}`}</T>
          </View>
          <Ring value={readiness(s, fatigueRace)} size={76} />
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
              Status
            </T>
            <T variant="bodyStrong" style={{ color: s.status === "fit" ? color.success : s.status === "knock" ? color.warning : color.dangerText }}>
              {`${s.status === "fit" ? "Fit" : s.status === "knock" ? "Knock" : "Injured"} · fatigue ${Math.round(fatigueRace)}`}
            </T>
          </View>
        </Row>
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
      </Card>

      <Card>
        <Label>Pacing plan</Label>
        {PACING.map((p) => {
          const on = p === pacing;
          const r = expectedRaceRating(s, p, extra);
          const place = Math.min(expectedPlace(s, r), d.size);
          const cfg = c.race.pacing[p];
          const risky = cfg.blowUpChance > 0;
          return (
            <Pressable
              key={p}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              onPress={() => setPlan({ pacing: p })}
              style={({ pressed }) => [styles.option, on ? styles.optionOn : null, pressed ? { opacity: 0.85 } : null]}
            >
              <View style={{ flex: 1, gap: 2 }}>
                <T variant="bodyStrong" style={on ? { color: color.accent } : null}>
                  {pacingInfo[p].label}
                </T>
                <T variant="caption" style={{ color: risky ? color.warning : color.muted }}>
                  {risky ? `${Math.round(cfg.blowUpChance * consistency * 100)}% chance to blow up` : pacingInfo[p].detail}
                </T>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <T variant="bodyStrong" style={{ fontVariant: ["tabular-nums"] }}>
                  {raceTime(timeForRating(c, r))}
                </T>
                <T variant="caption" tone="muted">{`~${ordinal(place)}`}</T>
              </View>
            </Pressable>
          );
        })}
      </Card>

      {!injured ? (
        <Card>
          <Label>Race day boosts</Label>
          <Boost
            icon="snow"
            label="Ice bath"
            detail={`Fatigue −${c.boosts.iceBathFatigue} before the race`}
            cost={c.gems.iceBath}
            on={!!plan.iceBath}
            disabled={!plan.iceBath && s.gems < c.gems.iceBath}
            onPress={() => setPlan({ iceBath: !plan.iceBath })}
          />
          <Boost
            icon="pulse"
            label="Coach call"
            detail={`+${c.boosts.coachCallBonus} race-day rating`}
            cost={c.gems.coachCall}
            on={!!plan.coachCall}
            disabled={!plan.coachCall && s.gems < c.gems.coachCall}
            onPress={() => setPlan({ coachCall: !plan.coachCall })}
          />
        </Card>
      ) : null}

      <Card tint={color.accentTint} style={{ borderWidth: 1, borderColor: color.accent }}>
        <Row>
          <View style={{ flex: 1, gap: 2 }}>
            <Label>Predicted time</Label>
            <T variant="numberL" style={{ fontVariant: ["tabular-nums"] }}>
              {raceTime(timeForRating(c, rating))}
            </T>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Label>Predicted place</Label>
            <T variant="numberL">{`${ordinal(Math.min(estPlace, d.size))} · ${est.points} pts`}</T>
          </View>
        </Row>
      </Card>
    </Screen>
  );
}

function Boost({ icon, label, detail, cost, on, disabled, onPress }: { icon: IconName; label: string; detail: string; cost: number; on: boolean; disabled: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: on, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.offer, on ? { borderColor: color.gem, backgroundColor: "#16303A" } : null]}
    >
      <View style={styles.offerIcon}>
        <Icon name={icon} size={22} color={color.gem} />
      </View>
      <View style={{ flex: 1 }}>
        <T variant="bodyStrong">{label}</T>
        <T variant="caption" tone="muted">
          {disabled ? "Not enough gems" : detail}
        </T>
      </View>
      <View style={[styles.gemPrice, on ? { backgroundColor: color.gem } : null]}>
        <Icon name={on ? "check" : "gem"} size={15} color={on ? color.accentInk : color.gem} />
        <T variant="bodyStrong" style={{ color: on ? color.accentInk : color.gem }}>
          {on ? "On" : `${cost}`}
        </T>
      </View>
    </Pressable>
  );
}

const PACING: Pacing[] = ["conservative", "even", "aggressive"];

const styles = StyleSheet.create({
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    minHeight: 60,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderRadius: radius.lg,
    backgroundColor: color.surface2,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  optionOn: { borderColor: color.accent, backgroundColor: color.accentTint },
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
