import { StyleSheet, Text, View } from "react-native";
import Svg, { Ellipse, Rect } from "react-native-svg";
import type { RaceRunner } from "@sim";
import { color, font, radius } from "@/theme";

const TILES = ["SKI", "PUSH", "PULL", "BURPEES", "ROW", "FARMERS", "LUNGES", "WALL BALLS"];

/** Which segment a runner is on at race time t (16 once finished), and how far through it (0..1). */
export function segmentAt(r: RaceRunner, t: number): { k: number; u: number } {
  if (t >= r.total) return { k: 16, u: 1 };
  let k = 0;
  while (k < 15 && t >= r.cum[k + 1]) k++;
  return { k, u: Math.max(0, Math.min(1, (t - r.cum[k]) / r.seg[k])) };
}

/**
 * Top-down Hyrox arena: the running loop around the outside, the 8 stations in the middle, every athlete as a dot.
 * You are the orange dot, the current leader is gold.
 */
export function Arena({ runners, t, width, leaderId }: { runners: RaceRunner[]; t: number; width: number; leaderId: number }) {
  const W = width;
  const H = Math.round(W * 0.74);
  const cx = W / 2;
  const cy = H / 2;
  const rx = W / 2 - 17;
  const ry = H / 2 - 16;
  const TW = W * 0.153;
  const TH = H * 0.183;
  const GAP = 6;
  const x0 = cx - (4 * TW + 3 * GAP) / 2;
  const y0 = cy - (2 * TH + GAP) / 2;
  const tile = (i: number) => ({ x: x0 + (i % 4) * (TW + GAP), y: y0 + Math.floor(i / 4) * (TH + GAP) });

  const me = runners.find((r) => r.id === -1);
  const mine = me ? segmentAt(me, t) : { k: 16, u: 1 };
  const activeTile = mine.k < 16 && mine.k % 2 === 1 ? (mine.k - 1) / 2 : -1;

  const pos = (r: RaceRunner) => {
    const { k, u } = segmentAt(r, t);
    const lane = Math.abs(r.id + 1) % 5;
    if (k >= 16) return { x: cx - 24 + ((r.place - 1) % 10) * 5, y: cy - ry + 4 + (Math.floor((r.place - 1) / 10) % 2) * 5 };
    if (k % 2 === 0) {
      const th = -Math.PI / 2 + 2 * Math.PI * u;
      const off = (lane - 2) * 3;
      return { x: cx + (rx + off) * Math.cos(th), y: cy + (ry + off) * Math.sin(th) };
    }
    const p = tile((k - 1) / 2);
    return { x: p.x + 8 + u * (TW - 16), y: p.y + TH * 0.42 + (lane % 4) * (TH * 0.13) };
  };

  // Others first, then the leader, then you on top.
  const ordered = [...runners].sort((a, b) => (a.id === -1 ? 1 : b.id === -1 ? -1 : a.id === leaderId ? 1 : b.id === leaderId ? -1 : 0));

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel="Arena: the running loop around the 8 stations, every athlete as a dot"
      style={[styles.arena, { width: W, height: H }]}
    >
      <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
        <Ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="none" stroke={color.surface2} strokeWidth={22} />
        <Ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="none" stroke={color.surface3} strokeWidth={1} strokeDasharray="4 6" />
        <Rect x={cx - 2} y={cy - ry - 11} width={4} height={22} fill={color.ink} opacity={0.7} />
      </Svg>
      {TILES.map((label, i) => {
        const p = tile(i);
        const on = i === activeTile;
        return (
          <View key={label} style={[styles.tile, { left: p.x, top: p.y, width: TW, height: TH, borderColor: on ? color.accent : color.hairline }]}>
            <Text numberOfLines={1} style={[styles.tileText, { color: on ? color.accent : color.muted }]}>
              {label}
            </Text>
          </View>
        );
      })}
      {ordered.map((r) => {
        const p = pos(r);
        const isMe = r.id === -1;
        const isLead = r.id === leaderId && !isMe;
        const d = isMe ? 14 : isLead ? 10 : 8;
        return (
          <View
            key={r.id}
            style={{
              position: "absolute",
              left: p.x - d / 2,
              top: p.y - d / 2,
              width: d,
              height: d,
              borderRadius: d / 2,
              backgroundColor: isMe ? color.accent : isLead ? color.gold : color.faint,
              borderWidth: isMe ? 2 : 0,
              borderColor: color.ink,
            }}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  arena: { backgroundColor: color.navBar, borderRadius: radius.xl, overflow: "hidden", alignSelf: "center" },
  tile: { position: "absolute", borderRadius: 8, borderWidth: 1, backgroundColor: color.surface, alignItems: "center", paddingTop: 4 },
  tileText: { fontFamily: font.bold, fontSize: 8, letterSpacing: 0.5 },
});
