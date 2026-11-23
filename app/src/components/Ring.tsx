import { Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { color, font } from "@/theme";

export function readinessLabel(v: number): string {
  return v >= 80 ? "Peak" : v >= 60 ? "Good" : v >= 40 ? "Tired" : "Drained";
}

export function readinessColor(v: number): string {
  return v >= 60 ? color.success : v >= 40 ? color.warning : color.danger;
}

/** Race readiness ring: a 0-100 arc with the value and its label in the middle. */
export function Ring({ value, size = 84, stroke = 8, showLabel = true }: { value: number; size?: number; stroke?: number; showLabel?: boolean }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const col = readinessColor(value);
  const v = Math.max(0, Math.min(100, value));
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }} accessibilityLabel={`Readiness ${v}, ${readinessLabel(v)}`}>
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={color.surface3} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={col}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${(c * v) / 100} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <Text style={{ fontFamily: font.display, fontSize: size * 0.36, lineHeight: size * 0.4, color: color.ink }}>{v}</Text>
      {showLabel ? (
        <Text style={{ fontFamily: font.bold, fontSize: Math.max(8, size * 0.1), letterSpacing: 0.6, color: col, textTransform: "uppercase" }}>
          {readinessLabel(v)}
        </Text>
      ) : null}
    </View>
  );
}
