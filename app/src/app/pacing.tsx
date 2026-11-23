import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import {
  decideWeek,
  divisionConfig,
  effects,
  expectedPlace,
  expectedRaceRating,
  profiles,
  raceCity,
  raceIndexForWeek,
  seasonRaces,
  timeForRating,
  type Pacing,
  type WeekChoices,
} from "@sim";
import { Hud } from "@/components/Hud";
import { Icon } from "@/components/Icon";
import { Button, Card, Chip, Label, Row, Screen, T } from "@/components/ui";
import { useGame } from "@/game/store";
import { gearDetail, gearName } from "@/names";
import { ordinal, pacingInfo, raceTime } from "@/format";
import { color, radius, space } from "@/theme";
import { raceDayExtras } from "./raceday";

const PACING: Pacing[] = ["conservative", "even", "aggressive"];

export default function PacingPlan() {
  const { s, draft, setDraft } = useGame();
  const c = s.config;
  const week = s.week + 1;
  const raceThisWeek = raceIndexForWeek(s, week) > 0;
  const next = seasonRaces(s).find((r) => r.status === "next");
  const base: WeekChoices = draft ?? decideWeek(s, profiles.active, s.status !== "injured");
  const [pacing, setPacing] = useState<Pacing>(base.pacing ?? "even");
  const [coachCall, setCoachCall] = useState<boolean>(!!base.coachCall);
  const plan: WeekChoices = { ...base, pacing, coachCall };
  const { extra } = raceDayExtras(s, plan, week);
  const d = divisionConfig(s);
  const consistency = 1 - (effects(s).consistency ?? 0);
  const city = next ? next.city : raceThisWeek ? raceCity(s, week) : "Next race";

  function save() {
    setDraft(plan);
    router.back();
  }

  return (
    <Screen footer={<Button hero label="Save plan" onPress={save} />}>
      <Hud back />
      <View style={{ gap: 2 }}>
        <Label>Pacing plan · optional</Label>
        <T variant="h1">{city === "World Championships" ? "Worlds" : `${city} race`}</T>
        <T variant="meta" tone="muted">{`${s.division} · ${d.size} athletes${next ? ` · week ${next.week}` : ""}`}</T>
      </View>

      {PACING.map((p) => {
        const on = p === pacing;
        const rating = expectedRaceRating(s, p, extra);
        const place = Math.min(expectedPlace(s, rating), d.size);
        const cfg = c.race.pacing[p];
        const risk =
          cfg.blowUpChance > 0
            ? `${Math.round(cfg.blowUpChance * consistency * 100)}% chance to blow up (−${cfg.blowUpCost} rating)`
            : cfg.noiseMult < 1
              ? "Steadier result, a little slower"
              : "Race at your level";
        return (
          <Pressable key={p} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => setPacing(p)}>
            <Card style={[styles.option, on ? styles.optionOn : null]}>
              <Row style={{ justifyContent: "space-between" }}>
                <T variant="h2" style={on ? { color: color.accent } : null}>
                  {pacingInfo[p].label}
                </T>
                {on ? (
                  <Chip fg={color.accentInk} bg={color.accent}>
                    Selected
                  </Chip>
                ) : null}
              </Row>
              <Row>
                <View style={styles.tile}>
                  <T variant="small" tone="muted">
                    Predicted time
                  </T>
                  <T variant="numberM">{raceTime(timeForRating(c, rating))}</T>
                </View>
                <View style={styles.tile}>
                  <T variant="small" tone="muted">
                    Est. place
                  </T>
                  <T variant="numberM">{ordinal(place)}</T>
                </View>
              </Row>
              <T variant="caption" style={{ color: cfg.blowUpChance > 0 ? color.warning : color.muted }}>
                {risk}
              </T>
            </Card>
          </Pressable>
        );
      })}

      <Pressable
        accessibilityRole="switch"
        accessibilityState={{ checked: coachCall }}
        disabled={!coachCall && s.gems < c.gems.coachCall}
        onPress={() => setCoachCall(!coachCall)}
      >
        <Card style={[styles.option, coachCall ? { borderColor: color.gem } : null]}>
          <Row style={{ justifyContent: "space-between" }}>
            <View style={{ flex: 1, gap: 2 }}>
              <T variant="bodyStrong">Coach call during the race</T>
              <T variant="caption" tone="muted">{`+${c.boosts.coachCallBonus} race-day rating`}</T>
            </View>
            <Row gap={4}>
              <Icon name={coachCall ? "check" : "gem"} size={15} color={color.gem} />
              <T variant="bodyStrong" tone="gem">
                {coachCall ? "On" : `${c.gems.coachCall}`}
              </T>
            </Row>
          </Row>
        </Card>
      </Pressable>

      <Card>
        <Label>Gear</Label>
        {c.gear.map((g, i) => (
          <Row key={g.id} style={{ justifyContent: "space-between" }}>
            <View style={{ flex: 1 }}>
              <T variant="bodyStrong">{gearName[g.id]}</T>
              <T variant="caption" tone="muted">{`${gearDetail[g.id]} · +${g.raceBonus} rating`}</T>
            </View>
            {s.gear[i] ? (
              <Chip fg={color.success} bg={color.successTint}>
                Owned
              </Chip>
            ) : (
              <Pressable accessibilityRole="button" onPress={() => router.push("/shop")} hitSlop={8}>
                <T variant="bodyStrong" tone="accent">
                  {"Shop ›"}
                </T>
              </Pressable>
            )}
          </Row>
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  option: { borderWidth: 1.5, borderColor: "transparent" },
  optionOn: { borderColor: color.accent },
  tile: { flex: 1, backgroundColor: color.surface2, borderRadius: radius.md, padding: space.md, gap: 2 },
});
