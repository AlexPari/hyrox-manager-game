import { View } from "react-native";
import { raceLog } from "@sim";
import { Hud } from "@/components/Hud";
import { PatchWall } from "@/components/PatchWall";
import { Card, Label, Screen, T } from "@/components/ui";
import { useGame } from "@/game/store";

export default function FullWall() {
  const { s } = useGame();
  const log = [...raceLog(s)].reverse();
  return (
    <Screen>
      <Hud back />
      <View style={{ gap: 2 }}>
        <Label>{`${log.length} patches · newest first`}</Label>
        <T variant="h1">Full wall</T>
      </View>
      <Card>{log.length ? <PatchWall entries={log} width={104} highlightNewest /> : <T variant="meta" tone="muted">No patches yet.</T>}</Card>
    </Screen>
  );
}
