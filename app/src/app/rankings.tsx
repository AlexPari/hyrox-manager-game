import { Fragment } from "react";
import { StyleSheet, Text, View } from "react-native";
import { cutInfo, profileOf, raceLog } from "@sim";
import { Hud } from "@/components/Hud";
import { Card, Label, Row, Screen, T } from "@/components/ui";
import { flag, rivalIdentity } from "@/data/places";
import { useGame } from "@/game/store";
import { color, radius, space } from "@/theme";

interface Line {
  key: string;
  name: string;
  country: string;
  pts: number;
  results: number;
  you: boolean;
}

export default function Rankings() {
  const { s } = useGame();
  const c = s.config;
  const bestOf = c.ranking.bestOf;
  const best = (pts: number[]) => [...pts].sort((a, b) => b - a).slice(0, bestOf).reduce((t, v) => t + v, 0);
  const p = profileOf(s);
  const rows: Line[] = s.field.rivals.map((r, i) => ({
    key: `r${i}`,
    ...rivalIdentity(s.season, s.division, i),
    pts: best(r.points),
    results: Math.min(r.points.length, bestOf),
    you: false,
  }));
  rows.push({ key: "you", name: `${p.first} ${p.last}`, country: p.country, pts: best(s.field.mine), results: Math.min(s.field.mine.length, bestOf), you: true });
  rows.sort((a, b) => b.pts - a.pts || (a.you ? -1 : b.you ? 1 : 0));
  const ci = cutInfo(s);
  const st = ci.standings;
  const slots = raceLog(s)
    .filter((r) => r.season === s.season)
    .sort((a, b) => b.points - a.points)
    .slice(0, bestOf);
  const cutText =
    s.division === "Pro" ? `Top ${ci.cut} · invited to Elite 15` : s.division === "Elite 15" ? `Below: relegated to Pro` : "";
  const statusText = !ci.cut
    ? "Rookie season: everyone turns Pro at the end."
    : ci.gap >= 0
      ? `${ci.gap} pts above the cut. ${s.division === "Pro" ? `Top ${ci.cut} at the end of the season are invited to Elite 15.` : `Top ${ci.cut} keep their spot.`}`
      : `${-ci.gap} pts behind the cut. ${s.division === "Pro" ? `Top ${ci.cut} are invited to Elite 15.` : "The bottom 3 go back to Pro."}`;

  return (
    <Screen>
      <Hud back />
      <View style={{ gap: 2 }}>
        <Label>{`Season ${s.season} · ${s.division}`}</Label>
        <T variant="h1">Rankings</T>
      </View>

      <Card>
        <Row style={{ justifyContent: "space-between" }}>
          <Label>{`Your best ${bestOf} results`}</Label>
          <T variant="numberM">{`${st.points} pts`}</T>
        </Row>
        <Row gap={6}>
          {Array.from({ length: bestOf }, (_, i) => {
            const r = slots[i];
            return (
              <View key={i} style={[styles.slot, r ? styles.slotOn : null]}>
                <T variant="numberM">{r ? `${r.points}` : "–"}</T>
                <T variant="small" tone="muted" numberOfLines={1}>
                  {r ? (r.worlds ? "Worlds" : r.city) : "Empty"}
                </T>
              </View>
            );
          })}
        </Row>
        <T variant="caption" tone="muted">
          More races fill your slots faster, but add fatigue and knock risk.
        </T>
      </Card>

      <Card>
        <Label>{`${s.division} · ${st.fieldSize} athletes`}</Label>
        <Row gap={space.md} style={{ alignItems: "flex-end" }}>
          <T variant="displayHero" tone={ci.gap >= 0 || !ci.cut ? "accent" : "ink"} style={{ fontSize: 56, lineHeight: 56 }}>
            {st.points ? `#${st.rank}` : "–"}
          </T>
          <T variant="bodyStrong" style={{ marginBottom: 8, flex: 1 }}>
            {!ci.cut ? "Rookie season" : ci.gap >= 0 ? (s.division === "Pro" ? `Inside the top ${ci.cut}` : "Safe for now") : "Below the cut"}
          </T>
        </Row>
        <T variant="caption" style={{ color: ci.gap >= 0 || !ci.cut ? color.success : color.warning }}>
          {statusText}
        </T>
      </Card>

      <Card style={{ gap: 0, paddingVertical: space.md }}>
        <Row style={styles.head}>
          <T variant="small" tone="muted" style={{ width: 34 }}>
            Rank
          </T>
          <T variant="small" tone="muted" style={{ flex: 1 }}>
            Athlete
          </T>
          <T variant="small" tone="muted" style={{ width: 52, textAlign: "right" }}>
            Results
          </T>
          <T variant="small" tone="muted" style={{ width: 44, textAlign: "right" }}>
            Pts
          </T>
        </Row>
        {rows.map((r, i) => (
          <Fragment key={r.key}>
            <Row style={[styles.line, r.you ? styles.you : null]}>
              <T variant="bodyStrong" tone={r.you ? "accent" : "ink2"} style={{ width: 34 }}>
                {i + 1}
              </T>
              <Text style={{ fontSize: 15, marginRight: 6 }}>{flag(r.country)}</Text>
              <T variant={r.you ? "bodyStrong" : "body"} style={{ flex: 1 }} numberOfLines={1}>
                {r.name}
              </T>
              <T variant="meta" tone="muted" style={{ width: 52, textAlign: "right" }}>{`${r.results}/${bestOf}`}</T>
              <T variant="bodyStrong" style={{ width: 44, textAlign: "right" }}>
                {r.pts}
              </T>
            </Row>
            {ci.cut && i === ci.cut - 1 && i < rows.length - 1 ? (
              <Row style={styles.cutLine}>
                <View style={styles.dash} />
                <T variant="chip" tone="accent">
                  {cutText}
                </T>
                <View style={styles.dash} />
              </Row>
            ) : null}
          </Fragment>
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  slot: {
    flex: 1,
    minHeight: 58,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: color.border,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  slotOn: { borderStyle: "solid", borderColor: color.surface2, backgroundColor: color.surface2 },
  head: { paddingHorizontal: space.sm, paddingVertical: space.sm },
  line: { minHeight: 40, paddingHorizontal: space.sm, borderRadius: radius.md, borderWidth: 1, borderColor: "transparent" },
  you: { backgroundColor: color.accentTint, borderColor: color.accent },
  cutLine: { paddingVertical: space.sm, gap: space.sm },
  dash: { flex: 1, height: 0, borderTopWidth: 1.5, borderStyle: "dashed", borderColor: color.accent },
});
