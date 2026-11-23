import { router } from "expo-router";
import { useState } from "react";
import { Alert, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import {
  STAT_IDS,
  buyFacility,
  isStaffLocked,
  knockChance,
  ovr,
  profileOf,
  raceLog,
  readiness,
  releaseStaff,
  salaryPerWeek,
  seasonConfig,
  upgradeStaff,
  type ActionResult,
  type StatId,
} from "@sim";
import { Hud, initials } from "@/components/Hud";
import { Icon } from "@/components/Icon";
import { Radar } from "@/components/Radar";
import { Ring } from "@/components/Ring";
import { Bar, Button, Card, Chip, Divider, Label, Row, Screen, T } from "@/components/ui";
import { countryName, flag, placeOf } from "@/data/places";
import { useGame } from "@/game/store";
import { effectsText, facilityName, gearName, staffName, tierName } from "@/names";
import { num, ordinal, raceTime, statLabel, statShort } from "@/format";
import { color, fatigueColor, radius, space } from "@/theme";
import { riskLabel } from "./training";

function confirmAction(title: string, message: string, onYes: () => void) {
  if (Platform.OS === "web") {
    // eslint-disable-next-line no-alert
    if (globalThis.confirm?.(message)) onYes();
    return;
  }
  Alert.alert(title, message, [
    { text: "Cancel", style: "cancel" },
    { text: "OK", style: "destructive", onPress: onYes },
  ]);
}

export function errorText(r: ActionResult): string | null {
  if (r.ok) return null;
  switch (r.error) {
    case "notEnoughCoins":
      return "Not enough coins.";
    case "notEnoughGems":
      return "Not enough gems.";
    case "locked":
      return "Not unlocked yet.";
    case "alreadyOwned":
      return "Already owned.";
    case "limitReached":
      return "Limit reached for today.";
    default:
      return "Not available right now.";
  }
}

export default function Athlete() {
  const { s, run, newCareer } = useGame();
  const [msg, setMsg] = useState<string | null>(null);
  const c = s.config;
  const p = profileOf(s);
  const ready = readiness(s);
  const risk = riskLabel(knockChance(s));
  const sorted = [...STAT_IDS].sort((a, b) => s.stats[b] - s.stats[a]);
  const strongest = sorted[0];
  const weakest = sorted[sorted.length - 1];
  const log = raceLog(s);
  const pb = log.length ? log.reduce((a, b) => (b.timeSec < a.timeSec ? b : a)) : null;
  const bestSplit = (id: StatId | "roxzone") => {
    let bestSec = Infinity;
    let city = "";
    for (const r of log) {
      const sp = r.splits.find((x) => x.id === id);
      if (sp && sp.sec < bestSec) {
        bestSec = sp.sec;
        city = r.city;
      }
    }
    return Number.isFinite(bestSec) ? { sec: bestSec, city } : null;
  };
  const act = (fn: Parameters<typeof run>[0]) => setMsg(errorText(run(fn) as ActionResult));

  return (
    <Screen>
      <Hud back />
      <View style={{ gap: 2 }}>
        <Label>{`${s.division} · season ${s.season}`}</Label>
        <T variant="h1">Athlete</T>
      </View>

      <Card>
        <Row gap={space.lg}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials(p.first, p.last)}</Text>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <T variant="h2" numberOfLines={1}>{`${p.first} ${p.last}`}</T>
            <T variant="meta" tone="ink2">{`${s.age} · ${flag(p.country)} ${countryName(p.country)}`}</T>
            <T variant="meta" tone="muted">{`${seasonConfig(s).phase} · peak years 28–31`}</T>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <T variant="displayTitle" tone="accent">
              {ovr(s).toFixed(0)}
            </T>
            <Label>Overall</Label>
          </View>
        </Row>
      </Card>

      <Card>
        <Label>Condition</Label>
        <Row gap={space.lg}>
          <Ring value={ready} size={84} />
          <View style={styles.cond}>
            <T variant="small" tone="muted">
              Fatigue
            </T>
            <T variant="numberM" style={{ color: fatigueColor(s.fatigue) }}>
              {Math.round(s.fatigue)}
            </T>
          </View>
          <View style={styles.cond}>
            <T variant="small" tone="muted">
              Knock risk
            </T>
            <T variant="numberM" style={{ color: risk.tone }}>
              {risk.text}
            </T>
          </View>
          <View style={styles.cond}>
            <T variant="small" tone="muted">
              Status
            </T>
            <T variant="numberM" style={{ color: s.status === "fit" ? color.ink : s.status === "knock" ? color.warning : color.dangerText }}>
              {s.status === "fit" ? "Fit" : s.status === "knock" ? "Knock" : "Injured"}
            </T>
          </View>
        </Row>
      </Card>

      <Card>
        <Label>Physical stats</Label>
        <Radar
          items={STAT_IDS.map((id) => ({
            label: statShort[id],
            value: s.stats[id],
            tone: id === strongest ? color.success : id === weakest ? color.dangerText : undefined,
          }))}
        />
        {STAT_IDS.map((id) => (
          <View key={id} style={{ gap: 4 }}>
            <Row style={{ justifyContent: "space-between" }}>
              <Row gap={6}>
                <T variant="bodyStrong">{statLabel[id]}</T>
                {id === strongest ? (
                  <Chip fg={color.success} bg={color.successTint}>
                    Strongest
                  </Chip>
                ) : null}
                {id === weakest ? (
                  <Chip fg={color.dangerText} bg={color.dangerTint}>
                    Weakest
                  </Chip>
                ) : null}
              </Row>
              <T variant="bodyStrong">{s.stats[id].toFixed(0)}</T>
            </Row>
            <Bar value={s.stats[id]} fill={id === weakest ? color.dangerText : id === strongest ? color.success : color.accent} />
          </View>
        ))}
        <T variant="caption" tone="muted">
          Station times come from these stats. Running counts for about half of the overall rating. From age 32 every stat slowly drops.
        </T>
      </Card>

      <Card>
        <Row style={{ justifyContent: "space-between" }}>
          <Label>Staff</Label>
          <Row gap={4}>
            <T variant="small" tone="coin">
              Salaries
            </T>
            <Icon name="coin" size={12} color={color.coin} />
            <T variant="small" tone="coin">{`${num(salaryPerWeek(s))} / week`}</T>
          </Row>
        </Row>
        {msg ? (
          <T variant="caption" tone="dangerText">
            {msg}
          </T>
        ) : null}
        {c.staff.map((role, i) => {
          const tier = s.staff[i];
          const locked = isStaffLocked(s, i);
          const fee = tier < 3 ? c.hireFees[tier] : 0;
          const current = tier ? Object.fromEntries(Object.entries(role.effects).map(([k, v]) => [k, v![tier - 1]])) : null;
          const next = tier < 3 ? Object.fromEntries(Object.entries(role.effects).map(([k, v]) => [k, v![tier]])) : null;
          return (
            <View key={role.id} style={[styles.staff, locked ? { opacity: 0.6 } : null]}>
              <Row style={{ justifyContent: "space-between" }}>
                <T variant="bodyStrong">{staffName[role.id]}</T>
                <Chip fg={tier ? color.bronze : color.muted} bg={tier ? "#3A2A1C" : color.surface3}>
                  {tierName[tier]}
                </Chip>
              </Row>
              <T variant="caption" tone="muted">
                {current ? `${effectsText(current)} · ${num(role.salary[tier - 1])} coins / week` : "Not hired"}
              </T>
              <Row gap={0} style={{ marginVertical: 4 }}>
                {[1, 2, 3].map((t) => (
                  <Row key={t} gap={0} style={{ flex: t === 1 ? 0 : 1 }}>
                    {t > 1 ? <View style={[styles.tierLine, tier >= t ? { backgroundColor: color.warning } : null]} /> : null}
                    <View style={[styles.tierDot, tier >= t ? styles.tierOn : null]}>{tier >= t ? <Icon name="check" size={12} color={color.accentInk} strokeWidth={3} /> : null}</View>
                  </Row>
                ))}
              </Row>
              {locked ? (
                <Row gap={6}>
                  <Icon name="lock" size={14} color={color.muted} />
                  <T variant="caption" tone="muted">
                    {s.season < role.unlockSeason ? `Unlocks in season ${role.unlockSeason}` : "Unlocks when you reach Elite 15"}
                  </T>
                </Row>
              ) : next ? (
                <Row style={{ justifyContent: "space-between" }}>
                  <T variant="caption" tone="ink2" style={{ flex: 1 }}>
                    {`Next · ${tierName[tier + 1]}: ${effectsText(next)} · ${num(role.salary[tier])} / week`}
                  </T>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${tier ? "Upgrade" : "Hire"} ${staffName[role.id]} for ${fee} coins`}
                    onPress={() => act((st) => upgradeStaff(st, i))}
                    style={[styles.price, s.coins < fee ? { opacity: 0.5 } : null]}
                  >
                    <Icon name="coin" size={14} color={color.coin} />
                    <T variant="bodyStrong" tone="coin">
                      {num(fee)}
                    </T>
                  </Pressable>
                </Row>
              ) : (
                <T variant="caption" tone="success">
                  Top tier
                </T>
              )}
              {tier ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => confirmAction("Release", `Release your ${staffName[role.id].toLowerCase()}? No refund.`, () => act((st) => releaseStaff(st, i)))}
                  hitSlop={8}
                >
                  <T variant="caption" tone="dangerText">
                    Release
                  </T>
                </Pressable>
              ) : null}
            </View>
          );
        })}
        <T variant="caption" tone="muted">
          Hiring costs a one-time fee, then a salary every week. If you can't pay the salaries, the week is blocked.
        </T>
      </Card>

      <Card>
        <Label>Training base</Label>
        {c.facilities.map((f, i) => (
          <Row key={f.id} style={{ justifyContent: "space-between" }}>
            <View style={{ flex: 1 }}>
              <T variant="bodyStrong">{facilityName[f.id]}</T>
              <T variant="caption" tone="muted">
                {effectsText(f.effects)}
              </T>
            </View>
            {s.facilities[i] ? (
              <Chip fg={color.success} bg={color.successTint}>
                Owned
              </Chip>
            ) : (
              <Pressable accessibilityRole="button" onPress={() => act((st) => buyFacility(st, i))} style={[styles.price, s.coins < f.cost ? { opacity: 0.5 } : null]}>
                <Icon name="coin" size={14} color={color.coin} />
                <T variant="bodyStrong" tone="coin">
                  {num(f.cost)}
                </T>
              </Pressable>
            )}
          </Row>
        ))}
      </Card>

      <Card>
        <Row style={{ justifyContent: "space-between" }}>
          <Label>Gear</Label>
          <Pressable accessibilityRole="button" onPress={() => router.push("/shop")} hitSlop={8}>
            <T variant="bodyStrong" tone="accent">
              {"Shop ›"}
            </T>
          </Pressable>
        </Row>
        {c.gear.map((g, i) => (
          <Row key={g.id} style={{ justifyContent: "space-between" }}>
            <T variant="body">{gearName[g.id]}</T>
            <T variant="meta" tone={s.gear[i] ? "success" : "muted"}>
              {s.gear[i] ? `Owned · +${g.raceBonus} rating` : "Not owned"}
            </T>
          </Row>
        ))}
      </Card>

      <Card>
        <Label>Personal bests</Label>
        {pb ? (
          <>
            <View style={styles.pb}>
              <T variant="label" tone="accent">
                Race PB
              </T>
              <T variant="displayTitle">{raceTime(pb.timeSec)}</T>
              <T variant="meta" tone="ink2">{`${flag(placeOf(pb.city).country)} ${pb.worlds ? "Worlds" : pb.city} · ${ordinal(pb.place)} · season ${pb.season}`}</T>
            </View>
            <T variant="caption" tone="muted">
              Best split per station, from any race
            </T>
            <View style={styles.grid}>
              {[...STAT_IDS, "roxzone" as const].map((id) => {
                const b = bestSplit(id);
                return (
                  <View key={id} style={styles.split}>
                    <T variant="small" tone="muted">
                      {id === "roxzone" ? "Roxzone total" : id === "run" ? "Running 8 km" : statLabel[id]}
                    </T>
                    <T variant="numberM">{b ? raceTime(b.sec) : "–"}</T>
                    <T variant="small" tone="muted" numberOfLines={1}>
                      {b ? `${flag(placeOf(b.city).country)} ${b.city === "World Championships" ? "Worlds" : b.city}` : ""}
                    </T>
                  </View>
                );
              })}
            </View>
          </>
        ) : (
          <T variant="meta" tone="muted">
            Race once to set your first personal bests.
          </T>
        )}
      </Card>

      <Card>
        <Label>Career</Label>
        <Button variant="secondary" label="Edit name and country" onPress={() => router.push("/onboarding")} />
        <Divider />
        <Button
          variant="outline"
          label="Start a new career"
          onPress={() =>
            confirmAction("New career", "Start a new career? This one will be lost.", () => {
              newCareer();
              router.replace("/");
            })
          }
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: color.surface2, alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: "BarlowCondensed_700Bold", fontSize: 26, color: color.ink },
  cond: { flex: 1, gap: 2 },
  staff: { backgroundColor: color.surface2, borderRadius: radius.lg, padding: space.lg, gap: 4 },
  tierDot: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: color.border, alignItems: "center", justifyContent: "center" },
  tierOn: { backgroundColor: color.warning, borderColor: color.warning },
  tierLine: { flex: 1, height: 2, backgroundColor: color.border },
  price: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    minHeight: 40,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.coin,
  },
  pb: { backgroundColor: color.trophyTint, borderRadius: radius.lg, padding: space.lg, gap: 2 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  split: { width: "48.5%", flexGrow: 1, flexBasis: "45%", backgroundColor: color.surface2, borderRadius: radius.md, padding: space.md, gap: 2 },
});
