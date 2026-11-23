import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Polyline } from "react-native-svg";
import { profileOf, raceLog, type RaceLogEntry } from "@sim";
import { Hud } from "@/components/Hud";
import { Icon } from "@/components/Icon";
import { PatchWall } from "@/components/PatchWall";
import { Card, Chip, Label, Row, Screen, T } from "@/components/ui";
import { countryName, flag, placeOf } from "@/data/places";
import { useGame } from "@/game/store";
import { ordinal, raceTime } from "@/format";
import { color, font, radius, space } from "@/theme";

const MEDAL = [color.gold, color.silver, color.bronze];

export default function Wall() {
  const { s } = useGame();
  const p = profileOf(s);
  const log = raceLog(s);
  const newest = [...log].reverse();
  const wins = log.filter((r) => r.place === 1).length;
  const podiums = log.filter((r) => r.place <= 3).length;
  const titles = s.seasons.filter((r) => r.worlds === 1);
  const perf = [
    { label: "SUB 90", sub: "minutes", n: log.filter((r) => r.timeSec < 5400).length },
    { label: "SUB 80", sub: "minutes", n: log.filter((r) => r.timeSec < 4800).length },
    { label: "SUB 70", sub: "minutes", n: log.filter((r) => r.timeSec < 4200).length },
    { label: "SUB 60", sub: "minutes", n: log.filter((r) => r.timeSec < 3600).length },
    { label: "WIN", sub: "races", n: wins },
    { label: "WORLD", sub: "titles", n: titles.length },
  ];
  const trophies: Array<{ title: string; sub: string; gold: boolean }> = [];
  for (const r of s.seasons) {
    if (r.worlds === 1) trophies.push({ title: "World Champion", sub: `Season ${r.season} · age ${r.age}`, gold: true });
    if (r.division === "Open" && r.rank === 1) trophies.push({ title: "Open Champion", sub: `Season ${r.season} · ${r.wins} wins`, gold: false });
    if (r.outcome === "qualified") trophies.push({ title: "Elite 15 qualifier", sub: `Season ${r.season} · ${ordinal(r.rank)} in Pro`, gold: false });
  }
  const countries = new Map<string, number>();
  for (const r of log) {
    const code = placeOf(r.city).country || "WORLD";
    countries.set(code, (countries.get(code) ?? 0) + 1);
  }

  return (
    <Screen>
      <Hud back />
      <View style={{ gap: 2 }}>
        <Label>{`${p.first} ${p.last} · ${s.age} · ${countryName(p.country)}`}</Label>
        <T variant="h1">Wall of fame</T>
      </View>

      <Card>
        <Row style={{ justifyContent: "space-between" }}>
          <Label>{`My wall · ${log.length} patch${log.length === 1 ? "" : "es"}`}</Label>
          <T variant="small" tone="muted">
            Newest first
          </T>
        </Row>
        {log.length ? (
          <>
            <PatchWall entries={newest.slice(0, 8)} highlightNewest />
            {log.length > 8 ? (
              <Pressable accessibilityRole="button" onPress={() => router.push("/fullwall")} style={{ alignItems: "center", paddingVertical: space.sm }}>
                <T variant="bodyStrong" tone="accent">{`See full wall · ${log.length} patches ›`}</T>
              </Pressable>
            ) : null}
          </>
        ) : (
          <T variant="meta" tone="muted">
            Finish a race to earn your first patch.
          </T>
        )}
      </Card>

      <Card>
        <Label>Performance patches</Label>
        <View style={styles.perfRow}>
          {perf.map((x) => (
            <View key={x.label} style={[styles.perf, x.n ? null : { opacity: 0.35 }]}>
              <View style={[styles.medal, { borderColor: x.n ? color.gold : color.border }]}>
                <Icon name={x.label === "WIN" || x.label === "WORLD" ? "rank" : "clock"} size={22} color={x.n ? color.gold : color.muted} />
              </View>
              <T variant="chip" tone={x.n ? "warning" : "muted"}>
                {x.label}
              </T>
              <T variant="small" tone="muted">
                {x.sub}
              </T>
              <T variant="bodyStrong" tone={x.n ? "warning" : "muted"}>{`×${x.n}`}</T>
            </View>
          ))}
        </View>
      </Card>

      <Row>
        <Stat label="Races" value={log.length} />
        <Stat label="Wins" value={wins} />
        <Stat label="Podiums" value={podiums} />
        <Stat label="Seasons" value={s.seasons.length} />
      </Row>

      {log.length >= 2 ? <TimeChart log={log} /> : null}

      {trophies.length ? (
        <View style={{ gap: space.sm }}>
          {[...trophies].reverse().map((t, i) => (
            <Card key={i} tint={color.trophyTint} style={{ borderWidth: 1, borderColor: t.gold ? color.gold : "#5A4A20" }}>
              <Row gap={space.md}>
                <View style={styles.trophy}>
                  <Icon name="rank" size={24} color={color.gold} />
                </View>
                <View style={{ flex: 1 }}>
                  <T variant="label" tone="gold">
                    Trophy
                  </T>
                  <T variant="h2">{t.title}</T>
                  <T variant="meta" tone="ink2">
                    {t.sub}
                  </T>
                </View>
              </Row>
            </Card>
          ))}
        </View>
      ) : null}

      {log.length ? (
        <Card style={{ gap: 0 }}>
          <Label style={{ marginBottom: space.sm }}>Timeline · newest first</Label>
          {newest.map((r) => (
            <TimelineRow key={`${r.season}-${r.week}`} r={r} />
          ))}
        </Card>
      ) : null}

      {countries.size ? (
        <Card>
          <Label>Countries raced</Label>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
            {[...countries.entries()].map(([code, n]) => (
              <View key={code} style={styles.country}>
                <Text style={{ fontSize: 16 }}>{flag(code === "WORLD" ? "" : code)}</Text>
                <T variant="bodyStrong">{code === "WORLD" ? "Worlds" : countryName(code)}</T>
                <T variant="meta" tone="muted">{`×${n}`}</T>
              </View>
            ))}
          </View>
        </Card>
      ) : null}
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card style={{ flex: 1, alignItems: "center", padding: space.md, gap: 2 }}>
      <T variant="numberL">{value}</T>
      <T variant="small" tone="muted">
        {label}
      </T>
    </Card>
  );
}

function TimelineRow({ r }: { r: RaceLogEntry }) {
  const medal = r.place <= 3 ? MEDAL[r.place - 1] : null;
  return (
    <Row style={styles.tl}>
      <Text style={{ fontSize: 18 }}>{flag(placeOf(r.city).country)}</Text>
      <View style={{ flex: 1, gap: 2 }}>
        <Row gap={6}>
          <T variant="bodyStrong" numberOfLines={1}>
            {r.worlds ? "Worlds" : r.city}
          </T>
          <Chip>{r.division}</Chip>
        </Row>
        <T variant="small" tone="muted">{`S${r.season} · week ${r.week} · ${ordinal(r.place)} of ${r.fieldSize}`}</T>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <T variant="bodyStrong">{raceTime(r.timeSec)}</T>
        <T variant="small" tone="success">{`${r.points} pts`}</T>
      </View>
      <View style={[styles.placeBadge, medal ? { backgroundColor: medal } : null]}>
        <Text style={{ fontFamily: font.display, fontSize: 15, color: medal ? color.accentInk : color.ink }}>{r.place}</Text>
      </View>
    </Row>
  );
}

function TimeChart({ log }: { log: RaceLogEntry[] }) {
  const W = 320;
  const H = 150;
  const pad = 14;
  const times = log.map((r) => r.timeSec);
  const min = Math.min(...times);
  const max = Math.max(...times);
  const span = Math.max(60, max - min);
  const pts = log.map((r, i) => {
    const x = pad + (i / Math.max(1, log.length - 1)) * (W - 2 * pad);
    const y = pad + ((r.timeSec - min) / span) * (H - 2 * pad);
    return [x, y];
  });
  return (
    <Card>
      <Row style={{ justifyContent: "space-between" }}>
        <Label>Finish time by race</Label>
        <T variant="small" tone="success">{`Best ${raceTime(min)}`}</T>
      </Row>
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
        <Polyline points={pts.map((p) => p.join(",")).join(" ")} fill="none" stroke={color.accent} strokeWidth={2.5} strokeLinejoin="round" />
        {pts.map(([x, y], i) => (
          <Circle key={i} cx={x} cy={y} r={2.5} fill={color.accent} />
        ))}
      </Svg>
      <Row style={{ justifyContent: "space-between" }}>
        <T variant="small" tone="muted">{`Slowest ${raceTime(max)}`}</T>
        <T variant="small" tone="muted">
          Faster is higher
        </T>
      </Row>
    </Card>
  );
}

const styles = StyleSheet.create({
  perfRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: space.md },
  perf: { width: "31%", alignItems: "center", gap: 2 },
  medal: { width: 52, height: 52, borderRadius: 26, borderWidth: 2.5, alignItems: "center", justifyContent: "center", backgroundColor: color.surface2 },
  trophy: { width: 52, height: 52, borderRadius: radius.lg, backgroundColor: "#2A2210", alignItems: "center", justifyContent: "center" },
  tl: { minHeight: 56, borderTopWidth: 1, borderTopColor: color.hairline, gap: space.md },
  placeBadge: { width: 30, height: 30, borderRadius: 15, backgroundColor: color.surface3, alignItems: "center", justifyContent: "center" },
  country: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: color.surface2, borderRadius: radius.md, paddingHorizontal: space.md, minHeight: 40 },
});
