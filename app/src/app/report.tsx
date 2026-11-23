import { Redirect, router } from "expo-router";
import { View } from "react-native";
import { STAT_IDS, rankingPoints, type GameEvent, type SeasonRecord, type StatId } from "@sim";
import { Button, Card, Chip, Divider, Label, Row, Screen, T } from "@/components/ui";
import { useGame } from "@/game/store";
import { focusInfo, gap, intensityInfo, num, ordinal, outcomeTitle, pacingInfo, raceTime, signed, statLabel } from "@/format";
import { color, fatigueColor, space } from "@/theme";

type Ev<K extends GameEvent["type"]> = Extract<GameEvent, { type: K }>;

function find<K extends GameEvent["type"]>(events: GameEvent[], type: K): Ev<K> | undefined {
  return events.find((e): e is Ev<K> => e.type === type);
}

function medal(place: number): string {
  return place === 1 ? color.gold : place === 2 ? color.silver : place === 3 ? color.bronze : color.ink;
}

export default function Report() {
  const { s, last } = useGame();
  if (!last) return <Redirect href="/" />;
  const ev = last.events;
  const race = find(ev, "race");
  const trained = find(ev, "trained");
  const season = find(ev, "seasonEnd");
  const champion = find(ev, "worldChampion");
  const tiers = ev.filter((e) => e.type === "passTier").length;

  return (
    <Screen footer={<Button hero label={s.ended ? "See career" : "Continue"} onPress={() => router.replace("/")} />}>
      <View style={{ gap: 2 }}>
        <Label>{`Season ${last.season} · week ${last.week}`}</Label>
        <T variant="h1">{race ? "Race report" : "Week report"}</T>
      </View>

      {season ? <SeasonCard record={season.record} over={s.ended} /> : null}

      {champion ? (
        <Card tint={color.trophyTint} style={{ alignItems: "center" }}>
          <T variant="displayTitle" style={{ color: color.gold, textAlign: "center" }}>
            World Champion
          </T>
          <T variant="meta" tone="ink2">{`At ${champion.age}, the best Hyrox athlete on the planet.`}</T>
        </Card>
      ) : null}

      {race ? <RaceCard race={race} /> : null}

      {trained ? (
        <Card>
          <Row style={{ justifyContent: "space-between" }}>
            <Label>Training</Label>
            <Chip>{`${focusInfo[trained.focus].label} · ${intensityInfo[trained.intensity].label}`}</Chip>
          </Row>
          <Row style={{ alignItems: "flex-end" }} gap={6}>
            <T variant="numberL">{(last.ovrBefore + trained.ovrGain).toFixed(1)}</T>
            <T
              variant="bodyStrong"
              style={{ color: trained.ovrGain >= 0 ? color.success : color.dangerText, marginBottom: 3 }}
            >{`${signed(trained.ovrGain, 2)} overall`}</T>
          </Row>
          <GainList gains={trained.gains} />
          <Divider />
          <Row style={{ justifyContent: "space-between" }}>
            <T variant="meta" tone="muted">
              Fatigue
            </T>
            <T
              variant="bodyStrong"
              style={{ color: fatigueColor(trained.fatigue) }}
            >{`${Math.round(last.fatigueBefore)}% → ${Math.round(trained.fatigue)}%`}</T>
          </Row>
        </Card>
      ) : null}

      <Notes events={ev} tiers={tiers} />
    </Screen>
  );
}

function RaceCard({ race }: { race: Ev<"race"> }) {
  const { s } = useGame();
  const by = Object.fromEntries(race.splits.map((x) => [x.id, x.sec])) as Record<string, number>;
  return (
    <>
      <Card style={{ alignItems: "center", paddingVertical: space.xxl }} tint={race.place <= 3 ? color.trophyTint : undefined}>
        <Label>{race.city}</Label>
        <Row style={{ alignItems: "flex-end" }} gap={6}>
          <T variant="displayHero" style={{ color: medal(race.place) }}>
            {ordinal(race.place)}
          </T>
          <T variant="meta" tone="muted" style={{ marginBottom: 10 }}>{`of ${race.fieldSize}`}</T>
        </Row>
        <T variant="numberL" style={{ fontVariant: ["tabular-nums"] }}>
          {raceTime(race.timeSec)}
        </T>
        <T variant="meta" tone="muted">
          {race.place === 1 ? "You won the race" : `Winner ${raceTime(race.winnerSec)} · ${gap(race.timeSec - race.winnerSec)}`}
        </T>
        <Row gap={6} style={{ marginTop: space.sm }}>
          <Chip>{pacingInfo[race.pacing].label}</Chip>
          {race.blewUp ? (
            <Chip fg={color.dangerText} bg={color.dangerTint}>
              Blew up
            </Chip>
          ) : null}
          {race.abroad ? <Chip>Abroad</Chip> : null}
        </Row>
      </Card>

      <Row>
        <Tile label="Prize" value={`${num(race.prize)}`} tone={color.coin} />
        <Tile label="Ranking pts" value={`${rankingPoints(s.config, race.place)}`} />
        <Tile label="Pass XP" value={race.xp ? `+${race.xp}` : "–"} />
      </Row>

      <Card style={{ gap: 6 }}>
        <Label>Splits</Label>
        {(["run", "ski", "sledPush", "sledPull", "burpees", "row", "farmers", "lunges", "wallBalls"] as StatId[]).map((id) => (
          <Row key={id} style={{ justifyContent: "space-between" }}>
            <T variant="meta" tone={id === "run" ? "ink" : "ink2"}>
              {id === "run" ? "Running (8 x 1 km)" : statLabel[id]}
            </T>
            <T variant="meta" style={{ fontVariant: ["tabular-nums"] }}>
              {raceTime(by[id] ?? 0)}
            </T>
          </Row>
        ))}
        <Row style={{ justifyContent: "space-between" }}>
          <T variant="meta" tone="muted">
            Roxzone
          </T>
          <T variant="meta" tone="muted" style={{ fontVariant: ["tabular-nums"] }}>
            {raceTime(by.roxzone ?? 0)}
          </T>
        </Row>
      </Card>
    </>
  );
}

function Tile({ label, value, tone = color.ink }: { label: string; value: string; tone?: string }) {
  return (
    <Card style={{ flex: 1, padding: space.md, gap: 2, alignItems: "center" }}>
      <T variant="numberM" style={{ color: tone }}>
        {value}
      </T>
      <T variant="small" tone="muted">
        {label}
      </T>
    </Card>
  );
}

function GainList({ gains }: { gains: Partial<Record<StatId, number>> }) {
  const list = STAT_IDS.map((id) => ({ id, g: gains[id] ?? 0 }))
    .filter((x) => x.g > 0.005)
    .sort((a, b) => b.g - a.g);
  if (!list.length)
    return (
      <T variant="meta" tone="muted">
        No gains this week.
      </T>
    );
  return (
    <View style={{ gap: 4 }}>
      {list.map(({ id, g }) => (
        <Row key={id} style={{ justifyContent: "space-between" }}>
          <T variant="meta" tone="ink2">
            {statLabel[id]}
          </T>
          <T variant="meta" style={{ color: color.success }}>{`+${g.toFixed(2)}`}</T>
        </Row>
      ))}
    </View>
  );
}

function Notes({ events, tiers }: { events: GameEvent[]; tiers: number }) {
  const notes: Array<{ text: string; tone: string; bg: string }> = [];
  for (const e of events) {
    if (e.type === "knock")
      notes.push({
        text: "Knock: training gains halved and slower races for 2 weeks. Racing or training hard on it can cause an injury.",
        tone: color.warning,
        bg: color.warningTint,
      });
    if (e.type === "injured")
      notes.push({ text: `Injured for ${e.weeks} weeks: no racing, no training gains.`, tone: color.dangerText, bg: color.dangerTint });
    if (e.type === "recovered") notes.push({ text: "Back to full fitness.", tone: color.success, bg: color.successTint });
    if (e.type === "raceSkipped")
      notes.push({ text: "You skipped this week's race. Your rivals still scored points.", tone: color.ink2, bg: color.surface });
    if (e.type === "passComplete") notes.push({ text: `Season pass complete: +${e.gems} gems.`, tone: color.gem, bg: color.surface });
  }
  if (tiers) notes.push({ text: `Season pass: +${tiers} tier${tiers > 1 ? "s" : ""}.`, tone: color.ink2, bg: color.surface });
  if (!notes.length) return null;
  return (
    <View style={{ gap: space.sm }}>
      {notes.map((n, i) => (
        <Card key={i} tint={n.bg} style={{ padding: space.lg }}>
          <T variant="caption" style={{ color: n.tone }}>
            {n.text}
          </T>
        </Card>
      ))}
    </View>
  );
}

function SeasonCard({ record: r, over }: { record: SeasonRecord; over: boolean }) {
  const { s } = useGame();
  const cut = s.config.divisions.Pro.promoteTop ?? 3;
  const good = r.outcome === "qualified" || r.outcome === "keptSpot" || r.outcome === "turnPro";
  return (
    <Card tint={good ? color.successTint : color.surface}>
      <Label>{`Season ${r.season} complete · age ${r.age}`}</Label>
      <T variant="displayTitle" style={{ color: good ? color.success : color.ink }}>
        {outcomeTitle(r.outcome, r.nextDivision)}
      </T>
      <T variant="meta" tone="ink2">
        {r.gapToCut && r.outcome === "missedCut"
          ? `${Math.abs(r.gapToCut)} points short of the top ${cut}.`
          : `${r.division}: ${ordinal(r.rank)} of ${r.fieldSize} with ${r.points} points.`}
      </T>
      <Divider />
      <Row style={{ justifyContent: "space-between" }}>
        <T variant="meta" tone="muted">
          Races · wins · podiums
        </T>
        <T variant="meta">{`${r.races} · ${r.wins} · ${r.podiums}`}</T>
      </Row>
      <Row style={{ justifyContent: "space-between" }}>
        <T variant="meta" tone="muted">
          Prize money + season bonus
        </T>
        <T variant="meta" style={{ color: color.coin }}>{`${num(r.prizes)} + ${num(r.bonus)}`}</T>
      </Row>
      {r.worlds ? (
        <Row style={{ justifyContent: "space-between" }}>
          <T variant="meta" tone="muted">
            World Championships
          </T>
          <T variant="meta">{ordinal(r.worlds)}</T>
        </Row>
      ) : null}
      <T variant="bodyStrong">{over ? "That was the last season: time to retire." : `Next season: ${r.nextDivision}, age ${r.age + 1}.`}</T>
    </Card>
  );
}
