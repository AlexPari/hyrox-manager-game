import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import * as Haptics from "expo-haptics";
import { BackHandler, Platform, Pressable, View } from "react-native";
import { raceLog, rankingPoints, ratingForTime, type GameEvent, type SeasonRecord, type StatId, type TrainingFocus } from "@sim";
import { Burst, FadeIn, PopIn, useCountUp } from "@/components/motion";
import { Patch } from "@/components/Patch";
import { Button, Card, Chip, Divider, Label, Row, Screen, T } from "@/components/ui";
import { goHome } from "@/game/nav";
import { weekNotes } from "@/game/notes";
import { useGame } from "@/game/store";
import { focusInfo, gap, intensityInfo, num, ordinal, outcomeTitle, pacingInfo, raceTime, signed, statLabel } from "@/format";
import { color, space } from "@/theme";

type Ev<K extends GameEvent["type"]> = Extract<GameEvent, { type: K }>;

function find<K extends GameEvent["type"]>(events: GameEvent[], type: K): Ev<K> | undefined {
  return events.find((e): e is Ev<K> => e.type === type);
}

function medal(place: number): string {
  return place === 1 ? color.gold : place === 2 ? color.silver : place === 3 ? color.bronze : color.ink;
}

/** The training block that works each station. */
const BLOCK_FOR: Record<StatId, TrainingFocus> = {
  run: "run",
  ski: "engine",
  row: "engine",
  burpees: "engine",
  sledPush: "strength",
  sledPull: "strength",
  farmers: "strength",
  lunges: "strength",
  wallBalls: "hybrid",
};

/** Race result: place, time, the new patch, rewards and what decided the race, with the full splits on demand. */
export default function Result() {
  const { s, last } = useGame();
  const [open, setOpen] = useState(false);
  const race0 = last ? find(last.events, "race") : undefined;
  // The place counts down from the back of the field to the real result, then the reward lands.
  const [landed, setLanded] = useState(false);
  const shownPlace = useCountUp(race0?.place ?? 1, {
    from: race0?.fieldSize ?? 1,
    duration: 1400,
    delay: 250,
    onDone: () => {
      setLanded(true);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    },
  });
  const prizeShown = useCountUp(race0?.prize ?? 0, { duration: 900, delay: 1500 });

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      goHome();
      return true;
    });
    return () => sub.remove();
  }, []);

  const race = race0;
  if (!last || !race) return <Redirect href="/" />;
  const ev = last.events;
  const trained = find(ev, "trained");
  const season = find(ev, "seasonEnd");
  const champion = find(ev, "worldChampion");
  const c = s.config;
  const win = race.place === 1;
  const before = raceLog(s).filter((r) => !(r.season === race.season && r.week === race.week));
  const pb = before.length > 0 && race.timeSec < Math.min(...before.map((r) => r.timeSec));
  const podium = race.place <= 3;

  // Time lost on each station against an even race at the winner's level.
  const winnerRating = ratingForTime(c, race.winnerSec);
  const by = Object.fromEntries(race.splits.map((x) => [x.id, x.sec])) as Record<string, number>;
  const losses = c.race.stations
    .map((st) => ({ id: st.id, lost: (by[st.id] ?? 0) - st.refSec * (1 + (100 - winnerRating) * c.race.timePerPoint) }))
    .sort((a, b) => b.lost - a.lost);
  const worst = losses[0];
  const best = losses[losses.length - 1];

  return (
    <Screen footer={<Button hero label={season ? "See your season" : `Back to Home · week ${last.week + 1}`} onPress={goHome} />}>
      <Card style={{ paddingVertical: space.xl }} tint={podium ? color.trophyTint : undefined}>
        <Row gap={space.lg} style={{ alignItems: "center" }}>
          <View style={{ flex: 1, gap: 4 }}>
            <Label>{`${race.worlds ? "World Championships" : race.city} · ${race.fieldSize} athletes`}</Label>
            <T variant="displayHero" style={{ color: landed ? medal(race.place) : color.ink2, fontVariant: ["tabular-nums"] }}>
              {ordinal(Math.round(shownPlace))}
            </T>
            <T variant="numberM" style={{ fontVariant: ["tabular-nums"] }}>
              {raceTime(race.timeSec)}
            </T>
            <T variant="meta" tone="muted">
              {win ? "You won the race" : `${gap(race.timeSec - race.winnerSec)} on the winner`}
            </T>
          </View>
          <PopIn delay={1700} tilt={-12} from={0.3}>
            <Patch city={race.city} season={race.season} week={race.week} timeSec={race.timeSec} width={116} highlight={win ? "gold" : "accent"} />
          </PopIn>
        </Row>
        <Row gap={6}>
          {landed && pb ? (
            <PopIn>
              <Chip fg={color.accentInk} bg={color.accent}>
                New PB
              </Chip>
            </PopIn>
          ) : null}
          <Chip>{pacingInfo[race.pacing].label}</Chip>
          {race.blewUp ? (
            <Chip fg={color.dangerText} bg={color.dangerTint}>
              Blew up
            </Chip>
          ) : null}
          {race.abroad ? <Chip>Abroad</Chip> : null}
        </Row>
        {landed && (podium || pb) ? <Burst colors={podium ? [color.gold, color.accent, color.ink] : [color.accent, color.success, color.ink]} count={podium ? 30 : 20} /> : null}
      </Card>

      {champion ? (
        <Card tint={color.trophyTint} style={{ alignItems: "center" }}>
          <T variant="displayTitle" style={{ color: color.gold, textAlign: "center" }}>
            World Champion
          </T>
          <T variant="meta" tone="ink2">{`At ${champion.age}, the best Hyrox athlete on the planet.`}</T>
        </Card>
      ) : null}

      <FadeIn delay={1500}>
        <Row>
          <Tile label="Prize" value={num(Math.round(prizeShown))} tone={color.coin} />
          <Tile label="Ranking pts" value={`${rankingPoints(c, race.place)}`} />
          <Tile label="Pass XP" value={race.xp ? `+${race.xp}` : "–"} />
        </Row>
      </FadeIn>

      <FadeIn delay={1800}>
      <Card>
        <Label>What decided it</Label>
        <Line dot={color.success} title={`Best: ${statLabel[best.id]}`} text={best.lost <= 0 ? "as fast as the winner's pace" : `${gap(best.lost)} on the winner's pace`} />
        <Line dot={color.dangerText} title={`Most time lost: ${statLabel[worst.id]}`} text={`${gap(worst.lost)} on the winner's pace`} />
        <Line dot={color.accent} title="Coach" text={`A ${focusInfo[BLOCK_FOR[worst.id]].label} block works on ${statLabel[worst.id]}.`} />
        {trained ? (
          <>
            <Divider />
            <Row style={{ justifyContent: "space-between" }}>
              <T variant="meta" tone="muted">{`Training · ${focusInfo[trained.focus].label} · ${intensityInfo[trained.intensity].label}`}</T>
              <T variant="meta" style={{ color: trained.ovrGain >= 0 ? color.success : color.dangerText }}>{`${signed(trained.ovrGain, 2)} overall`}</T>
            </Row>
          </>
        ) : null}
      </Card>
      </FadeIn>

      {season ? <SeasonCard record={season.record} over={s.ended} /> : null}

      {weekNotes(ev).map((n, i) => (
        <Card key={i} tint={n.bg} style={{ padding: space.lg }}>
          <T variant="caption" style={{ color: n.tone }}>
            {n.text}
          </T>
        </Card>
      ))}

      <FadeIn delay={2000}>
      <Card style={{ gap: 6 }}>
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen(!open)} style={{ minHeight: 44, justifyContent: "center" }}>
          <Row style={{ justifyContent: "space-between" }}>
            <T variant="bodyStrong">Full race report · splits</T>
            <T variant="meta" tone="accent">
              {open ? "Hide" : "Show"}
            </T>
          </Row>
        </Pressable>
        {open ? (
          <>
            {c.race.stations.map((st) => (
              <Row key={st.id} style={{ justifyContent: "space-between" }}>
                <T variant="meta" tone={st.id === "run" ? "ink" : "ink2"}>
                  {st.id === "run" ? "Running (8 x 1 km)" : statLabel[st.id]}
                </T>
                <T variant="meta" style={{ fontVariant: ["tabular-nums"] }}>
                  {raceTime(by[st.id] ?? 0)}
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
          </>
        ) : null}
      </Card>
      </FadeIn>
    </Screen>
  );
}

function Line({ dot, title, text }: { dot: string; title: string; text: string }) {
  return (
    <Row gap={10} style={{ alignItems: "flex-start" }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dot, marginTop: 6 }} />
      <T variant="body" style={{ flex: 1 }}>
        <T variant="bodyStrong">{`${title}: `}</T>
        {text}
      </T>
    </Row>
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
      <T variant="bodyStrong">{over ? "That was the last season: time to retire." : `Next season: ${r.nextDivision}, age ${r.age + 1}.`}</T>
    </Card>
  );
}
