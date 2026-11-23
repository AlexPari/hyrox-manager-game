import { Redirect, router } from "expo-router";
import { View } from "react-native";
import type { GameEvent } from "@sim";
import { Patch } from "@/components/Patch";
import { Button, Screen, T } from "@/components/ui";
import { useGame } from "@/game/store";
import { ordinal } from "@/format";
import { color, space } from "@/theme";

type RaceEvent = Extract<GameEvent, { type: "race" }>;

/** The new finisher patch, shown right after the race, before the full report. */
export default function NewPatch() {
  const { last } = useGame();
  const race = last?.events.find((e): e is RaceEvent => e.type === "race");
  if (!race) return <Redirect href="/" />;
  const win = race.place === 1;
  return (
    <Screen footer={<Button hero label="See race report" onPress={() => router.replace("/report")} />}>
      <View style={{ alignItems: "center", gap: space.lg, paddingTop: 80 }}>
        <T variant="label" tone="accent">
          {race.worlds && win ? "World champion" : "New patch"}
        </T>
        <Patch city={race.city} season={race.season} week={race.week} timeSec={race.timeSec} width={250} highlight={win ? "gold" : "accent"} />
        <T variant="displayTitle" style={{ textAlign: "center", color: win ? color.gold : color.ink }}>
          {`${ordinal(race.place)} in ${race.worlds ? "the world" : race.city}`}
        </T>
        <T variant="meta" tone="muted">{`${race.fieldSize} athletes · ${race.place <= 3 ? "podium!" : "patch added to your wall"}`}</T>
      </View>
    </Screen>
  );
}
