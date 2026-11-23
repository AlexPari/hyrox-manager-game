import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { raceLog, type GameEvent, type SeasonRecord } from "@sim";
import { Hud } from "@/components/Hud";
import { PatchWall } from "@/components/PatchWall";
import { Button, Card, Divider, Label, Row, Screen, T } from "@/components/ui";
import { useGame } from "@/game/store";
import { num, ordinal, outcomeTitle, raceTime } from "@/format";
import { color, radius, space } from "@/theme";

type Ev<K extends GameEvent["type"]> = Extract<GameEvent, { type: K }>;
const STEPS = ["Your season", "Ranking", "Earnings", "Next season"];

/** Season end, step by step: patches and stats, final ranking, money, what comes next. */
export default function Recap() {
  const { s, last, clearRecap } = useGame();
  const [step, setStep] = useState(0);
  const rec: SeasonRecord | undefined = last?.events.find((e): e is Ev<"seasonEnd"> => e.type === "seasonEnd")?.record ?? s.seasons.at(-1);

  function done() {
    clearRecap();
    router.replace("/");
  }

  if (!rec) {
    return (
      <Screen footer={<Button hero label="Continue" onPress={done} />}>
        <Hud />
      </Screen>
    );
  }

  const races = raceLog(s).filter((r) => r.season === rec.season);
  const prev = raceLog(s).filter((r) => r.season < rec.season);
  const best = races.length ? Math.min(...races.map((r) => r.timeSec)) : null;
  const prevBest = prev.length ? Math.min(...prev.map((r) => r.timeSec)) : null;
  const improved = best !== null && prevBest !== null ? prevBest - best : null;
  const vault = last?.events.find((e): e is Ev<"passEnded"> => e.type === "passEnded");
  const good = rec.outcome === "qualified" || rec.outcome === "keptSpot" || rec.outcome === "turnPro";
  const nextSeason = s.config.career[rec.season];
  const unlocks: string[] = [];
  if (rec.season + 1 === s.config.pass.unlockSeason) unlocks.push("Season pass: rewards for racing and daily missions");
  if (rec.outcome === "qualified" && s.seasons.filter((r) => r.outcome === "qualified").length === 1) unlocks.push("Running coach and sports psychologist can be hired");
  if (rec.outcome === "turnPro") unlocks.push("Pro races: bigger prizes and a top 3 invitation to Elite 15");
  const last3 = step === STEPS.length - 1;

  return (
    <Screen
      footer={
        <Button
          hero
          label={last3 ? (s.ended ? "See your career" : `Start season ${rec.season + 1}`) : "Next"}
          onPress={() => (last3 ? done() : setStep(step + 1))}
        />
      }
    >
      <Hud />
      <Row gap={6} style={{ justifyContent: "center" }}>
        {STEPS.map((_, i) => (
          <View key={i} style={{ width: i === step ? 24 : 8, height: 8, borderRadius: 4, backgroundColor: i === step ? color.accent : color.surface3 }} />
        ))}
      </Row>
      <Label style={{ textAlign: "center" }}>{`Season ${rec.season} recap · ${step + 1} of ${STEPS.length} · ${STEPS[step]}`}</Label>

      {step === 0 ? (
        <>
          <Card>
            <Row style={{ justifyContent: "space-between" }}>
              <Label>{`Your season · ${races.length} patch${races.length === 1 ? "" : "es"}`}</Label>
              <T variant="small" tone="muted">{`${rec.phase} · ${rec.division}`}</T>
            </Row>
            {races.length ? <PatchWall entries={[...races].reverse().slice(0, 9)} width={96} /> : <T variant="meta" tone="muted">No races this season.</T>}
          </Card>
          <Row>
            <Stat label="Wins" value={`${rec.wins}`} />
            <Stat label="Podiums" value={`${rec.podiums}`} />
            <Stat
              label={improved !== null ? "Time improved" : "Best time"}
              value={improved !== null ? `${improved >= 0 ? "−" : "+"}${raceTime(Math.abs(improved))}` : best !== null ? raceTime(best) : "–"}
              tone={improved !== null && improved > 0 ? color.success : color.ink}
            />
          </Row>
        </>
      ) : null}

      {step === 1 ? (
        <Card tint={good ? color.successTint : color.surface} style={{ alignItems: "center", paddingVertical: space.xxl }}>
          <Label>{`${rec.division} final ranking`}</Label>
          <T variant="displayHero" style={{ color: good ? color.success : color.ink }}>
            {ordinal(rec.rank)}
          </T>
          <T variant="meta" tone="ink2">{`of ${rec.fieldSize} · ${rec.points} points (best 5)`}</T>
          <T variant="displayTitle" style={{ textAlign: "center", color: good ? color.success : color.ink }}>
            {outcomeTitle(rec.outcome, rec.nextDivision)}
          </T>
          {rec.outcome === "missedCut" ? <T variant="meta" tone="warning">{`${Math.abs(rec.gapToCut)} points short of the invitation.`}</T> : null}
          {rec.outcome === "relegated" ? <T variant="meta" tone="warning">{`${Math.abs(rec.gapToCut)} points short of safety.`}</T> : null}
          {rec.worlds ? <T variant="bodyStrong" style={{ color: rec.worlds === 1 ? color.gold : color.ink }}>{`World Championships: ${ordinal(rec.worlds)}`}</T> : null}
        </Card>
      ) : null}

      {step === 2 ? (
        <Card>
          <Label>Earnings</Label>
          <Line label={`Prize money · ${rec.races} races`} value={num(rec.prizes)} />
          <Line label="Season bonus" value={num(rec.bonus)} />
          {vault ? <Line label={`Pass vault · ${vault.tiers} tiers`} value={num(vault.vault)} /> : null}
          <Divider />
          <Line label="Coins now" value={num(s.coins)} strong />
          <T variant="caption" tone="muted">
            Spend them on staff, your training base and camps from the Athlete and Shop screens.
          </T>
        </Card>
      ) : null}

      {step === 3 ? (
        <Card style={{ gap: space.md }}>
          {s.ended ? (
            <>
              <T variant="displayTitle">Time to retire</T>
              <T variant="body" tone="ink2">
                That was your last season. Your wall of fame keeps every patch.
              </T>
            </>
          ) : (
            <>
              <Label>{`Season ${rec.season + 1} · ${nextSeason?.phase ?? ""}`}</Label>
              <T variant="displayTitle">{rec.nextDivision}</T>
              <T variant="body" tone="ink2">{`Age ${rec.age + 1} · ${nextSeason?.weeks ?? 30} weeks · ${nextSeason?.races ?? 15} races. Fatigue is reset after the off-season.`}</T>
              {unlocks.map((u) => (
                <View key={u} style={{ backgroundColor: color.accentTint, borderRadius: radius.md, padding: space.md }}>
                  <T variant="caption" tone="accent">{`Unlocked: ${u}`}</T>
                </View>
              ))}
              {rec.age + 1 >= 28 && rec.age + 1 <= 31 ? (
                <T variant="bodyStrong" tone="gold">
                  Peak years: this is your window for a world title.
                </T>
              ) : null}
            </>
          )}
        </Card>
      ) : null}
    </Screen>
  );
}

function Stat({ label, value, tone = color.ink }: { label: string; value: string; tone?: string }) {
  return (
    <Card style={{ flex: 1, alignItems: "center", gap: 2, padding: space.md }}>
      <T variant="numberL" style={{ color: tone }}>
        {value}
      </T>
      <T variant="small" tone="muted">
        {label}
      </T>
    </Card>
  );
}

function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <Row style={{ justifyContent: "space-between" }}>
      <T variant={strong ? "bodyStrong" : "meta"} tone={strong ? "ink" : "muted"}>
        {label}
      </T>
      <T variant={strong ? "numberM" : "bodyStrong"} tone="coin">
        {value}
      </T>
    </Row>
  );
}
