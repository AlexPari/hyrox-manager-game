import { router } from "expo-router";
import { Alert, Platform, View } from "react-native";
import { cutInfo, energyPerWeek, ovr, raceCity, seasonConfig, weeksToNextRace, type GameState } from "@sim";
import { ATHLETE, Hud } from "@/components/Hud";
import { Bar, Button, Card, Chip, Divider, Label, Row, Screen, T } from "@/components/ui";
import { useGame } from "@/game/store";
import { num, ordinal, outcomeTitle, signed } from "@/format";
import { color, fatigueColor, space } from "@/theme";

function confirm(message: string, onYes: () => void) {
  if (Platform.OS === "web") {
    // eslint-disable-next-line no-alert
    if (globalThis.confirm?.(message)) onYes();
    return;
  }
  Alert.alert("New career", message, [
    { text: "Cancel", style: "cancel" },
    { text: "Start over", style: "destructive", onPress: onYes },
  ]);
}

function statusChip(s: GameState) {
  if (s.status === "injured") return <Chip fg={color.dangerText} bg={color.dangerTint}>{`Injured · ${s.injuryWeeksLeft} wk`}</Chip>;
  if (s.status === "knock") return <Chip fg={color.warning} bg={color.warningTint}>{`Knock · ${s.injuryWeeksLeft} wk`}</Chip>;
  return (
    <Chip fg={color.success} bg={color.successTint}>
      Fit
    </Chip>
  );
}

export default function Home() {
  const { s, watchAd, skipHours, newCareer } = useGame();

  if (s.ended) return <CareerOver />;

  const z = seasonConfig(s);
  const need = energyPerWeek(s);
  const enough = s.energy >= need;
  const toRace = weeksToNextRace(s);
  const raceWeek = toRace === null ? null : s.week + toRace;
  const ci = cutInfo(s);
  const st = ci.standings;

  return (
    <Screen
      footer={
        <>
          <Button
            hero
            label={enough ? (toRace === 1 ? "Plan race week" : "Plan week") : "Not enough energy"}
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
                  disabled={s.adsEnergyToday >= s.config.energy.adEnergyMaxPerDay}
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
        <Label>{`Season ${s.season} · ${z.phase}`}</Label>
        <T variant="h1">{`Week ${Math.min(s.week + 1, z.weeks)} of ${z.weeks}`}</T>
      </View>

      <Card>
        <Row style={{ justifyContent: "space-between" }}>
          <View style={{ gap: 4 }}>
            <T variant="h2">{`${ATHLETE.first} ${ATHLETE.last}`}</T>
            <Row gap={6}>
              <Chip fg={color.accent} bg={color.accentTint}>
                {s.division}
              </Chip>
              {statusChip(s)}
              <T variant="meta" tone="muted">{`Age ${s.age}`}</T>
            </Row>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <T variant="numberL">{ovr(s).toFixed(1)}</T>
            <Label>Overall</Label>
          </View>
        </Row>
        <Divider />
        <View style={{ gap: 6 }}>
          <Row style={{ justifyContent: "space-between" }}>
            <Label>Fatigue</Label>
            <T variant="bodyStrong" style={{ color: fatigueColor(s.fatigue) }}>{`${Math.round(s.fatigue)}%`}</T>
          </Row>
          <Bar value={s.fatigue} fill={fatigueColor(s.fatigue)} />
          <T variant="caption" tone="muted">
            {s.fatigue >= 35 ? "Tired: slower races and more knocks. Plan a light week." : "Fresh enough to train hard or race."}
          </T>
        </View>
      </Card>

      <Card>
        <Label>Next race</Label>
        {raceWeek ? (
          <Row style={{ justifyContent: "space-between" }}>
            <View style={{ gap: 2, flex: 1 }}>
              <T variant="bodyStrong">{raceCity(s, raceWeek)}</T>
              <T variant="meta" tone="muted">
                {toRace === 1 ? "This coming week" : `In ${toRace} weeks · week ${raceWeek}`}
              </T>
            </View>
            <Chip fg={toRace === 1 ? color.accentInk : color.ink2} bg={toRace === 1 ? color.accent : color.surface3}>
              {toRace === 1 ? "Race week" : `${toRace} wk`}
            </Chip>
          </Row>
        ) : (
          <T variant="meta" tone="muted">
            No race left this season.
          </T>
        )}
      </Card>

      <Card>
        <Row style={{ justifyContent: "space-between" }}>
          <Label>{`${s.division} ranking · best ${s.config.ranking.bestOf}`}</Label>
          <T variant="meta" tone="muted">{`${num(st.points)} pts`}</T>
        </Row>
        <Row style={{ alignItems: "flex-end" }} gap={6}>
          <T variant="numberL">{st.points ? ordinal(st.rank) : "–"}</T>
          <T variant="meta" tone="muted" style={{ marginBottom: 3 }}>{`of ${st.fieldSize}`}</T>
        </Row>
        {ci.cut ? (
          <T variant="caption" style={{ color: ci.gap >= 0 ? color.success : color.warning }}>
            {s.division === "Pro"
              ? ci.gap >= 0
                ? `Inside the top ${ci.cut}: Elite 15 invitation (${signed(ci.gap, 0)} pts)`
                : `Top ${ci.cut} go to Elite 15 · ${Math.abs(ci.gap)} pts behind the cut`
              : ci.gap >= 0
                ? `Keeping your spot: top ${ci.cut} stay (${signed(ci.gap, 0)} pts)`
                : `Bottom 3 are relegated · ${Math.abs(ci.gap)} pts behind`}
          </T>
        ) : (
          <T variant="caption" tone="muted">
            Rookie season: everyone turns Pro at the end.
          </T>
        )}
        <Bar value={s.week} max={z.weeks} fill={color.surface3} extra={0} height={4} />
        <T variant="small" tone="muted">{`${z.weeks - s.week} weeks left in the season`}</T>
      </Card>

      {s.seasons.length ? (
        <Card>
          <Label>Last season</Label>
          <T variant="bodyStrong">{outcomeTitle(s.seasons.at(-1)!.outcome, s.seasons.at(-1)!.nextDivision)}</T>
          <T variant="meta" tone="muted">
            {`${s.seasons.at(-1)!.division} · ${ordinal(s.seasons.at(-1)!.rank)} of ${s.seasons.at(-1)!.fieldSize} · ${s.seasons.at(-1)!.wins} wins`}
          </T>
        </Card>
      ) : null}

      <View style={{ paddingTop: space.sm }}>
        <Button variant="outline" label="New career" onPress={() => confirm("Start a new career? This one will be lost.", newCareer)} />
      </View>
    </Screen>
  );
}

function CareerOver() {
  const { s, newCareer } = useGame();
  const titles = s.seasons.filter((r) => r.worlds === 1).length;
  const best = Math.max(...s.seasons.map((r) => r.ovr));
  return (
    <Screen footer={<Button hero label="New career" onPress={newCareer} />}>
      <Hud />
      <Card tint={color.trophyTint} style={{ alignItems: "center", paddingVertical: space.xxl }}>
        <Label>Retired at {s.age - 1}</Label>
        <T variant="displayTitle" style={{ textAlign: "center" }}>
          {titles ? `${titles}x World Champion` : "Career over"}
        </T>
        <T variant="meta" tone="ink2">{`Peak overall ${best.toFixed(1)} · ${s.seasons.reduce((t, r) => t + r.wins, 0)} race wins`}</T>
      </Card>
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
