import { Redirect, router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import {
  STAT_IDS,
  cutInfo,
  divisionConfig,
  energyPerWeek,
  expectedPlace,
  expectedRaceRating,
  ovr,
  profileOf,
  raceIndexForWeek,
  readiness,
  seasonConfig,
  seasonRaces,
} from "@sim";
import { Hud } from "@/components/Hud";
import { Icon } from "@/components/Icon";
import { Ring } from "@/components/Ring";
import { Button, Card, Chip, Divider, Label, Row, Screen, T } from "@/components/ui";
import { flag, placeOf } from "@/data/places";
import { Coach } from "@/components/Coach";
import { pendingUnlock, unlocks } from "@/game/ftue";
import { useOpen } from "@/game/nav";
import { useGame } from "@/game/store";
import { ordinal, statShort } from "@/format";
import { color, radius, space } from "@/theme";

export default function Hub() {
  const { s, watchAd, skipHours, recapPending, ftue, markSeen } = useGame();
  const open = useOpen();
  if (!s.profile) return <Redirect href="/onboarding" />;
  if (recapPending) return <Redirect href="/recap" />;
  if (s.ended) return <CareerOver />;
  const unlock = pendingUnlock(s, ftue);
  if (unlock) return <Redirect href={`/unlock?what=${unlock}`} />;

  const c = s.config;
  const z = seasonConfig(s);
  const p = profileOf(s);
  const week = Math.min(s.week + 1, z.weeks);
  const u = unlocks(s, ftue);
  const free = !u.shop; // first session: weeks are free and energy is hidden
  const need = energyPerWeek(s);
  const enough = free || s.energy >= need;
  const next = seasonRaces(s).find((r) => r.status === "next");
  const inWeeks = next ? next.week - s.week : 0;
  const raceWeek = raceIndexForWeek(s, s.week + 1) > 0;
  const where = next ? placeOf(next.city) : null;
  const ready = readiness(s);
  const sorted = [...STAT_IDS].sort((a, b) => s.stats[b] - s.stats[a]);
  const predicted = Math.min(expectedPlace(s, expectedRaceRating(s, "even", 0)), divisionConfig(s).size);
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
  const cta = raceWeek && next ? `Race week · ${next.worlds ? "Worlds" : next.city}` : `Plan week ${week}`;
  // Coach tips of the first session, each shown once.
  const tip =
    !ftue.active
      ? null
      : s.week === 0 && !ftue.seen.includes("home:first")
        ? { key: "home:first", text: `Every week you choose how ${p.first} trains. Your athlete improves, then races. Tap Plan week 1 below to start.` }
        : raceWeek && !ftue.seen.includes("home:race")
          ? { key: "home:race", text: "Race week! Plan your training as usual, then you set your race plan: pacing and boosts." }
          : null;
  const go = () => {
    if (tip) markSeen(tip.key);
    open("/training");
  };

  return (
    <Screen
      tabbed
      footer={
        <>
          <Button
            hero
            label={enough ? cta : "Not enough energy"}
            sub={free ? "Free in your first session" : enough ? `1 week of energy · ${Math.floor(s.energy / need)} left` : `A week needs ${need} energy · you have ${Math.floor(s.energy)}`}
            disabled={!enough}
            onPress={go}
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
      <View style={{ gap: 2 }}>
        <Label>{`Season ${s.season} · ${s.division}`}</Label>
        <T variant="h1">{`Week ${week} of ${z.weeks}`}</T>
      </View>

      {tip ? <Coach>{tip.text}</Coach> : null}

      <Pressable accessibilityRole="button" accessibilityLabel="Open your athlete" disabled={!u.athlete} onPress={() => router.navigate("/athlete")}>
        <Card>
          <Row gap={space.lg}>
            <View style={{ flex: 1, gap: 2 }}>
              <Label>{`${p.first} ${p.last} · ${s.age}`}</Label>
              <T variant="displayHero" style={{ fontSize: 56, lineHeight: 56 }}>
                {ovr(s).toFixed(0)}
              </T>
              <T variant="meta" tone="muted">{`Overall · strong on ${statShort[sorted[0]]}, weak on ${statShort[sorted[sorted.length - 1]]}`}</T>
            </View>
            <Ring value={ready} size={84} />
          </Row>
        </Card>
      </Pressable>

      {next ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Open the calendar" disabled={!u.calendar} onPress={() => router.navigate("/calendar")}>
          <Card tint={next.worlds ? color.trophyTint : undefined} style={inWeeks === 1 ? { borderWidth: 1.5, borderColor: color.accent } : null}>
            <Row style={{ justifyContent: "space-between" }}>
              <Label>{inWeeks === 1 ? "Race this week" : `Next race · in ${inWeeks} weeks`}</Label>
              <Chip>{next.worlds ? "Championship" : s.division}</Chip>
            </Row>
            <T variant="displayTitle" numberOfLines={1}>
              {next.worlds ? "Worlds" : next.city}
            </T>
            {where ? <T variant="meta" tone="ink2">{`${flag(where.country)}  ${where.countryName}${where.region ? `, ${where.region}` : ""} · week ${next.week}`}</T> : null}
            <Row>
              <View style={styles.tile}>
                <T variant="small" tone="muted">
                  Predicted
                </T>
                <T variant="numberM">{ordinal(predicted)}</T>
              </View>
              <View style={styles.tile}>
                <T variant="small" tone="muted">
                  Best 5 results
                </T>
                <T variant="numberM">{`${scored}/${c.ranking.bestOf} · ${st.points} pts`}</T>
              </View>
            </Row>
          </Card>
        </Pressable>
      ) : null}

      <Pressable accessibilityRole="button" onPress={() => open("/rankings")}>
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
          <T variant="meta" tone="muted">
            {st.points ? `${ordinal(st.rank)} of ${st.fieldSize} in the ranking ›` : "No points yet ›"}
          </T>
        </Card>
      </Pressable>

      {u.shop ? (
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
      ) : null}
    </Screen>
  );
}

function CareerOver() {
  const { s, newCareer } = useGame();
  const p = profileOf(s);
  const titles = s.seasons.filter((r) => r.worlds === 1).length;
  const best = Math.max(...s.seasons.map((r) => r.ovr));
  return (
    <Screen tabbed footer={<Button hero label="New career" onPress={newCareer} />}>
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
  tile: { flex: 1, backgroundColor: color.surface2, borderRadius: radius.md, padding: space.md, gap: 2 },
  track: { height: 22, justifyContent: "center" },
  line: { height: 6, borderRadius: 3, backgroundColor: color.surface3 },
  cut: { position: "absolute", width: 2, height: 22, marginLeft: -1, backgroundColor: color.ink2 },
  dot: { position: "absolute", width: 16, height: 16, borderRadius: 8, marginLeft: -8, borderWidth: 3, borderColor: color.surface },
});
