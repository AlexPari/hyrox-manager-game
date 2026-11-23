import { Redirect, router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { cutInfo, decideWeek, effects, energyPerWeek, ovrGain, profileOf, profiles, readiness, seasonConfig, seasonRaces } from "@sim";
import { Hud } from "@/components/Hud";
import { Icon } from "@/components/Icon";
import { Ring } from "@/components/Ring";
import { TabBar } from "@/components/TabBar";
import { Button, Card, Chip, Divider, Label, Row, Screen, T } from "@/components/ui";
import { flag, placeOf } from "@/data/places";
import { useGame } from "@/game/store";
import { focusInfo, intensityInfo, ordinal, signed } from "@/format";
import { color, space } from "@/theme";

export default function Hub() {
  const { s, watchAd, skipHours, recapPending } = useGame();
  if (!s.profile) return <Redirect href="/onboarding" />;
  if (recapPending) return <Redirect href="/recap" />;
  if (s.ended) return <CareerOver />;

  const c = s.config;
  const z = seasonConfig(s);
  const need = energyPerWeek(s);
  const enough = s.energy >= need;
  const next = seasonRaces(s).find((r) => r.status === "next");
  const inWeeks = next ? next.week - s.week : 0;
  const where = next ? placeOf(next.city) : null;
  const coach = decideWeek(s, profiles.active, true);
  const focus = coach.focus ?? "balanced";
  const intensity = coach.intensity ?? "normal";
  const gain = ovrGain(c, s.stats, { focus, intensity, age: s.age, effects: effects(s), mult: 1 });
  const ci = cutInfo(s);
  const st = ci.standings;
  const inZone = !ci.cut || ci.gap >= 0;
  const scored = Math.min(s.field.mine.length, c.ranking.bestOf);
  const adsLeft = c.coins.adCoinsMaxPerDay - s.adsCoinsToday;
  const played = Math.min(s.weeksPlayedToday, 2);

  const roadTitle = s.division === "Pro" ? "Road to Elite 15" : s.division === "Elite 15" ? "Elite 15 · keep your spot" : "Rookie season · Open";
  const roadText = !ci.cut
    ? "Everyone turns Pro at the end of the season. Race to learn and earn."
    : s.division === "Pro"
      ? ci.gap >= 0
        ? `Top ${ci.cut} are invited to Elite 15. You're ${ci.gap} pts clear.`
        : `Top ${ci.cut} are invited to Elite 15. ${-ci.gap} pts to go.`
      : ci.gap >= 0
        ? `Top ${ci.cut} keep their spot. You're ${ci.gap} pts clear.`
        : `Bottom 3 go back to Pro. ${-ci.gap} pts to safety.`;
  const pos = st.fieldSize > 1 ? (st.rank - 1) / (st.fieldSize - 1) : 0;
  const cutPos = ci.cut && st.fieldSize > 1 ? (ci.cut - 0.5) / (st.fieldSize - 1) : 0;

  return (
    <Screen
      footer={
        <>
          <TabBar badges={{ Athlete: s.status !== "fit" ? true : undefined, Calendar: inWeeks === 1 ? true : undefined }} />
          <Button
            hero
            label={enough ? "Continue" : "Not enough energy"}
            sub={enough ? `Week ${s.week + 1} · uses ${need} energy` : `Needs ${need} · you have ${Math.floor(s.energy)}`}
            disabled={!enough}
            onPress={() => router.push("/training")}
          />
          {!enough ? (
            <Row>
              <View style={{ flex: 1 }}>
                <Button
                  variant="secondary"
                  icon="tv"
                  label="Ad +5 energy"
                  disabled={s.adsEnergyToday >= c.energy.adEnergyMaxPerDay}
                  onPress={() => watchAd("energy")}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button variant="outline" icon="skip" label="Skip 12 h (test)" onPress={() => skipHours(12)} />
              </View>
            </Row>
          ) : null}
        </>
      }
    >
      <Hud />

      <Card tint={next?.worlds ? color.trophyTint : undefined}>
        <Row style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
          <View style={{ flex: 1, gap: 6 }}>
            <Label>{`Week ${Math.min(s.week + 1, z.weeks)} of ${z.weeks} · Season ${s.season}`}</Label>
            {next ? (
              <Chip fg={color.accentInk} bg={color.accent}>
                {next.worlds ? "World Championships" : `Next race · ${s.division}`}
              </Chip>
            ) : null}
            <T variant="displayTitle" numberOfLines={1}>
              {next ? (next.worlds ? "Worlds" : next.city) : "Season done"}
            </T>
            <T variant="bodyStrong" style={{ color: inWeeks === 1 ? color.accent : color.ink2 }}>
              {next ? (inWeeks === 1 ? "This week" : `In ${inWeeks} weeks · week ${next.week}`) : "No race left this season"}
            </T>
          </View>
          <View style={{ alignItems: "center", gap: 4 }}>
            <Ring value={readiness(s)} size={92} />
            <Label>Readiness</Label>
          </View>
        </Row>
        {where ? (
          <Row style={{ justifyContent: "space-between" }}>
            <T variant="meta" tone="ink2">{`${flag(where.country)}  ${where.countryName}${where.region ? `, ${where.region}` : ""}`}</T>
            {inWeeks === 1 ? (
              <Pressable accessibilityRole="button" onPress={() => router.push("/pacing")} hitSlop={10}>
                <T variant="bodyStrong" tone="accent">
                  {"Pacing plan ›"}
                </T>
              </Pressable>
            ) : null}
          </Row>
        ) : null}
      </Card>

      <Pressable accessibilityRole="button" onPress={() => router.push("/training")}>
        <Card>
          <Row style={{ justifyContent: "space-between" }}>
            <Label>{`Week ${s.week + 1} · Training`}</Label>
            <T variant="bodyStrong" tone="warning">
              {"Plan ›"}
            </T>
          </Row>
          <T variant="bodyStrong">{`Coach suggests: ${focusInfo[focus].label} · ${intensityInfo[intensity].label}`}</T>
          <T variant="meta" tone="muted">{`About ${signed(gain, 2)} overall · fatigue ${Math.round(s.fatigue)}%`}</T>
        </Card>
      </Pressable>

      <Pressable accessibilityRole="button" onPress={() => router.push("/rankings")}>
        <Card>
          <Row style={{ justifyContent: "space-between" }}>
            <Label>{roadTitle}</Label>
            {ci.cut ? (
              <Row gap={4}>
                <Icon name={inZone ? "check" : "info"} size={14} color={inZone ? color.success : color.warning} />
                <T variant="small" style={{ color: inZone ? color.success : color.warning }}>
                  {inZone ? (s.division === "Pro" ? "Qualified zone" : "Safe zone") : "Below the cut"}
                </T>
              </Row>
            ) : null}
          </Row>
          <T variant="meta" tone="muted">
            {roadText}
          </T>
          {st.points ? (
            <View style={styles.track}>
              <View style={styles.line} />
              {ci.cut ? <View style={[styles.cut, { left: `${cutPos * 100}%` }]} /> : null}
              <View style={[styles.dot, { left: `${pos * 100}%`, backgroundColor: inZone ? color.success : color.warning }]} />
            </View>
          ) : null}
          <Row style={{ justifyContent: "space-between" }}>
            <Row gap={5}>
              <T variant="small" tone="muted">
                Best 5
              </T>
              {Array.from({ length: c.ranking.bestOf }, (_, i) => (
                <View key={i} style={[styles.slot, i < scored ? styles.slotOn : null]} />
              ))}
              <T variant="bodyStrong">{` ${st.points} pts`}</T>
            </Row>
            <T variant="meta" tone="muted">
              {st.points ? `${ordinal(st.rank)} of ${st.fieldSize}` : "No points yet"}
            </T>
          </Row>
        </Card>
      </Pressable>

      <Card>
        <Row style={{ justifyContent: "space-between" }}>
          <Label>Missions</Label>
          <T variant="small" tone="muted">
            Reset every day
          </T>
        </Row>
        <Row style={{ justifyContent: "space-between" }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Chip>Daily</Chip>
            <T variant="bodyStrong">Play 2 weeks today</T>
            <T variant="caption" tone="muted">
              {s.pass.active ? `+${c.pass.missionXpPerDay} season pass XP` : "Gives pass XP from season 2"}
            </T>
          </View>
          {played >= 2 ? (
            <Chip fg={color.success} bg={color.successTint}>
              Done
            </Chip>
          ) : (
            <T variant="numberM">{`${played}/2`}</T>
          )}
        </Row>
        <Divider />
        <Row style={{ justifyContent: "space-between" }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Chip>Sponsor ad</Chip>
            <T variant="bodyStrong">Watch an ad</T>
            <T variant="caption" tone="muted">{`+${c.coins.adCoins} coins · ${adsLeft} of ${c.coins.adCoinsMaxPerDay} left today`}</T>
          </View>
          <View style={{ width: 104 }}>
            <Button variant="secondary" icon="tv" label="Free" disabled={adsLeft <= 0} onPress={() => watchAd("coins")} />
          </View>
        </Row>
      </Card>
    </Screen>
  );
}

function CareerOver() {
  const { s, newCareer } = useGame();
  const p = profileOf(s);
  const titles = s.seasons.filter((r) => r.worlds === 1).length;
  const best = Math.max(...s.seasons.map((r) => r.ovr));
  return (
    <Screen footer={<Button hero label="New career" onPress={newCareer} />}>
      <Hud />
      <Card tint={color.trophyTint} style={{ alignItems: "center", paddingVertical: space.xxl }}>
        <Label>{`${p.first} ${p.last} · retired at ${s.age - 1}`}</Label>
        <T variant="displayTitle" style={{ textAlign: "center" }}>
          {titles ? `${titles}x World Champion` : "Career over"}
        </T>
        <T variant="meta" tone="ink2">{`Peak overall ${best.toFixed(1)} · ${s.seasons.reduce((t, r) => t + r.wins, 0)} race wins`}</T>
      </Card>
      <Button variant="secondary" icon="badge" label="Wall of fame" onPress={() => router.push("/wall")} />
      <Card>
        <Label>Seasons</Label>
        {s.seasons.map((r) => (
          <Row key={r.season} style={{ justifyContent: "space-between" }}>
            <T variant="meta" tone="muted">{`S${r.season} · age ${r.age}`}</T>
            <T variant="meta">{`${r.division} · ${ordinal(r.rank)}${r.worlds ? ` · Worlds ${ordinal(r.worlds)}` : ""}`}</T>
          </Row>
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  track: { height: 22, justifyContent: "center" },
  line: { height: 6, borderRadius: 3, backgroundColor: color.surface3 },
  cut: { position: "absolute", width: 2, height: 22, marginLeft: -1, backgroundColor: color.ink2 },
  dot: { position: "absolute", width: 16, height: 16, borderRadius: 8, marginLeft: -8, borderWidth: 3, borderColor: color.surface },
  slot: { width: 14, height: 14, borderRadius: 3, borderWidth: 1.5, borderColor: color.border },
  slotOn: { backgroundColor: color.accent, borderColor: color.accent },
});
