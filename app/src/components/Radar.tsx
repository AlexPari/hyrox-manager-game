import { View } from "react-native";
import Svg, { Circle, Line, Polygon, Text as SvgText } from "react-native-svg";
import { color } from "@/theme";

/** Spider chart of 0-100 values. The scale starts at `floor` so differences between stations stay visible. */
export function Radar({ items, size = 280, floor = 30 }: { items: Array<{ label: string; value: number; tone?: string }>; size?: number; floor?: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const R = size * 0.32;
  const n = items.length;
  const pt = (i: number, f: number) => {
    const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
    return [cx + Math.cos(a) * R * f, cy + Math.sin(a) * R * f];
  };
  const frac = (v: number) => Math.max(0.05, Math.min(1, (v - floor) / (100 - floor)));
  const poly = items.map((it, i) => pt(i, frac(it.value)).join(",")).join(" ");
  return (
    <View style={{ alignItems: "center" }} accessibilityLabel={items.map((it) => `${it.label} ${Math.round(it.value)}`).join(", ")}>
      <Svg width={size} height={size}>
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <Polygon key={f} points={items.map((_, i) => pt(i, f).join(",")).join(" ")} fill="none" stroke={color.hairline} strokeWidth={1} />
        ))}
        {items.map((_, i) => {
          const [x, y] = pt(i, 1);
          return <Line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke={color.hairline} strokeWidth={1} />;
        })}
        <Polygon points={poly} fill="rgba(255,106,43,0.35)" stroke={color.accent} strokeWidth={2} />
        {items.map((it, i) => {
          const [x, y] = pt(i, frac(it.value));
          return <Circle key={i} cx={x} cy={y} r={3.5} fill={color.accent} />;
        })}
        {items.map((it, i) => {
          const [x, y] = pt(i, 1.28);
          return (
            <SvgText key={i} x={x} y={y} fill={it.tone ?? color.ink2} fontSize={10} fontWeight="700" textAnchor="middle">
              {`${it.label} ${Math.round(it.value)}`}
            </SvgText>
          );
        })}
      </Svg>
    </View>
  );
}
