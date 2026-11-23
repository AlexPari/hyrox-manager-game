import { router } from "expo-router";
import { Pressable, View } from "react-native";
import type { RaceLogEntry } from "@sim";
import { Patch } from "./Patch";

/** Honeycomb of race patches, 3 columns, odd columns shifted down half a patch. */
export function PatchWall({ entries, width = 108, columns = 3, highlightNewest }: { entries: RaceLogEntry[]; width?: number; columns?: number; highlightNewest?: boolean }) {
  const w = width;
  const h = w * 0.866 + 4;
  const rows = Math.ceil(entries.length / columns);
  const height = rows * h + (entries.length > 1 ? h / 2 : 0);
  return (
    <View style={{ width: w * (1 + 0.78 * (columns - 1)), height, alignSelf: "center" }}>
      {entries.map((e, i) => {
        const col = i % columns;
        const row = Math.floor(i / columns);
        const gold = e.place === 1;
        return (
          <Pressable
            key={`${e.season}-${e.week}`}
            accessibilityRole="button"
            onPress={() => router.push("/wall")}
            style={{ position: "absolute", left: col * w * 0.78, top: row * h + (col % 2 ? h / 2 : 0) }}
          >
            <Patch city={e.city} season={e.season} week={e.week} timeSec={e.timeSec} width={w} highlight={gold ? "gold" : highlightNewest && i === 0 ? "accent" : undefined} />
          </Pressable>
        );
      })}
    </View>
  );
}
