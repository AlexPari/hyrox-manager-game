import { Text, View } from "react-native";
import { cutInfo, placeRewards, seasonConfig, seasonRaces } from "@sim";
import { Hud } from "@/components/Hud";
import { Icon } from "@/components/Icon";
import { Card, Chip, Label, Row, Screen, T } from "@/components/ui";
import { flag, placeOf } from "@/data/places";
import { useGame } from "@/game/store";
import { num, ordinal } from "@/format";
import { color, space } from "@/theme";

export default function Calendar() {
  const { s } = useGame();
  const c = s.config;
  const races = seasonRaces(s);
  const left = races.filter((r) => r.status === "next" || r.status === "upcoming").length;
  const next = races.find((r) => r.status === "next");
  const ci = cutInfo(s);
  const pts = c.ranking.points;
  return (
    <Screen tabbed>
      <Hud />
      <View style={{ gap: 2 }}>
        <Label>{`Season ${s.season} · ${s.division} · ${seasonConfig(s).weeks} weeks`}</Label>
        <T variant="h1">Calendar</T>
        <T variant="meta" tone="muted">
          {`${left} race${left === 1 ? "" : "s"} left${next ? ` · next: ${next.worlds ? "Worlds" : next.city}, ${next.week - s.week === 1 ? "this week" : `in ${next.week - s.week} weeks`}` : ""}. You set each race plan in race week, after confirming your training.`}
        </T>
      </View>
      <Card style={{ gap: 6 }}>
        <Row gap={6}>
          <Icon name="info" size={16} color={color.accent} />
          <T variant="bodyStrong" tone="accent">
            How points work
          </T>
        </Row>
        <T variant="caption" tone="ink2">
          {`Each race gives points by place: 1st ${pts[0]}, 2nd ${pts[1]}, 3rd ${pts[2]} … 16th ${pts[15]}, then ${c.ranking.pointsBeyond}. Only your best ${c.ranking.bestOf} results count, and your rivals score even when you skip.`}
          {ci.cut ? (s.division === "Pro" ? ` Top ${ci.cut} at the end are invited to Elite 15.` : ` Top ${ci.cut} keep their Elite 15 spot.`) : " Everyone turns Pro after the rookie season."}
        </T>
      </Card>
      {races.map((r) => {
        const where = placeOf(r.city);
        const best = placeRewards(s, 1, r.worlds);
        const isNext = r.status === "next";
        return (
          <View key={r.week}>
            <Card
              tint={r.worlds ? color.trophyTint : undefined}
              style={[{ paddingVertical: space.lg }, isNext ? { borderWidth: 1.5, borderColor: color.accent } : null, r.status === "skipped" ? { opacity: 0.55 } : null]}
            >
              <Row gap={space.md}>
                <Text style={{ fontSize: 30 }}>{flag(where.country)}</Text>
                <View style={{ flex: 1, gap: 3 }}>
                  <T variant="bodyStrong">{r.worlds ? "World Championships" : r.city}</T>
                  <T variant="meta" tone="muted">{`Week ${r.week} · ${where.countryName}`}</T>
                  <Chip>{r.worlds ? "Championship" : s.division}</Chip>
                </View>
                <View style={{ alignItems: "flex-end", gap: 3 }}>
                  {r.status === "done" && r.result ? (
                    <T variant="bodyStrong" style={{ color: r.result.place <= 3 ? color.gold : color.success }}>{`${ordinal(r.result.place)} · ${r.result.points} pts`}</T>
                  ) : r.status === "skipped" ? (
                    <T variant="meta" tone="muted">
                      Skipped
                    </T>
                  ) : isNext ? (
                    <Chip fg={color.accentInk} bg={color.accent}>
                      {r.week - s.week === 1 ? "This week" : `In ${r.week - s.week} wk`}
                    </Chip>
                  ) : null}
                  {r.status === "next" || r.status === "upcoming" ? (
                    <Row gap={4}>
                      <T variant="small" tone="ink2">{`${best.points} pts ·`}</T>
                      <Icon name="coin" size={12} color={color.coin} />
                      <T variant="small" tone="coin">
                        {num(best.prize)}
                      </T>
                    </Row>
                  ) : null}
                </View>
              </Row>
            </Card>
          </View>
        );
      })}
    </Screen>
  );
}
