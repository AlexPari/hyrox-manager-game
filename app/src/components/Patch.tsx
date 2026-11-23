import { Text, View } from "react-native";
import Svg, { Polygon } from "react-native-svg";
import { flag, placeOf } from "@/data/places";
import { raceTime } from "@/format";
import { color, font } from "@/theme";

/** Hexagonal finisher patch: date, city card, season and finish time, like the mockups' wall of fame. */
export function Patch({
  city,
  season,
  week,
  timeSec,
  width = 150,
  highlight,
}: {
  city: string;
  season: number;
  week: number;
  timeSec: number;
  width?: number;
  /** "gold" for world titles and wins, "accent" for the newest patch. */
  highlight?: "gold" | "accent";
}) {
  const w = width;
  const h = w * 0.866;
  const hex = (inset: number) =>
    [
      [w * 0.25 + inset * 0.5, inset],
      [w * 0.75 - inset * 0.5, inset],
      [w - inset, h / 2],
      [w * 0.75 - inset * 0.5, h - inset],
      [w * 0.25 + inset * 0.5, h - inset],
      [inset, h / 2],
    ]
      .map((p) => p.join(","))
      .join(" ");
  const rim = highlight === "gold" ? color.gold : highlight === "accent" ? color.accent : color.ink;
  const worlds = city === "World Championships";
  const name = worlds ? "WORLDS" : city.toUpperCase();
  const k = w / 150;
  return (
    <View style={{ width: w, height: h }} accessibilityLabel={`${city} patch, season ${season}, ${raceTime(timeSec)}`}>
      <Svg width={w} height={h} style={{ position: "absolute" }}>
        <Polygon points={hex(0)} fill={rim} />
        <Polygon points={hex(5 * k)} fill={color.appShell} />
      </Svg>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 3 * k }}>
        <Text style={{ fontFamily: font.bold, fontSize: 9 * k, color: color.ink }}>{`Week ${week}`}</Text>
        <View style={{ backgroundColor: color.ink, borderRadius: 3 * k, paddingHorizontal: 8 * k, paddingVertical: 3 * k, alignItems: "center", minWidth: w * 0.55 }}>
          <Text style={{ fontSize: 10 * k }}>{flag(placeOf(city).country)}</Text>
          <Text numberOfLines={1} style={{ fontFamily: font.display, fontSize: (name.length > 9 ? 12 : 15) * k, letterSpacing: 1.5 * k, color: color.appShell }}>
            {name}
          </Text>
          <Text style={{ fontFamily: font.bold, fontSize: 6 * k, letterSpacing: 0.8 * k, color: color.surface3 }}>{`SEASON ${season}`}</Text>
        </View>
        <Text style={{ fontFamily: font.display, fontSize: 20 * k, color: color.ink }}>{raceTime(timeSec)}</Text>
      </View>
    </View>
  );
}
