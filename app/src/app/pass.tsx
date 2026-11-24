import { Fragment } from "react";
import { StyleSheet, View } from "react-native";
import { buyPassPremium } from "@sim";
import { Hud } from "@/components/Hud";
import { Icon } from "@/components/Icon";
import { Bar, Button, Card, Label, Row, Screen, T } from "@/components/ui";
import { useGame } from "@/game/store";
import { num } from "@/format";
import { color, font, radius, space } from "@/theme";

export default function Pass() {
  const { s, run } = useGame();
  const c = s.config;
  const P = c.pass;
  const p = s.pass;
  const unlock = () => run((st) => buyPassPremium(st));

  if (!p.active) {
    const lastPass = s.passHistory.at(-1);
    return (
      <Screen>
        <Hud close />
        <T variant="h1">Season pass</T>
        <Card>
          <T variant="bodyStrong">{s.season < P.unlockSeason ? `The season pass starts in season ${P.unlockSeason}.` : "The next pass starts soon."}</T>
          <T variant="meta" tone="muted">{`Each pass runs ${P.days} real days and has ${P.tiers} tiers. Races and daily missions give XP.`}</T>
          {lastPass ? <T variant="meta" tone="ink2">{`Last pass: tier ${lastPass.tiers}, vault ${num(lastPass.vault)} coins.`}</T> : null}
        </Card>
      </Screen>
    );
  }

  const inTier = p.tiers >= P.tiers ? P.xpPerTier : p.xp - p.tiers * P.xpPerTier;
  const daysLeft = Math.max(0, Math.ceil(P.days - (s.day - p.startDay)));
  const vault = Math.floor((Math.max(0, p.xp - P.tiers * P.xpPerTier) / 100) * P.vaultCoinsPer100Xp);

  return (
    <Screen footer={!p.premium ? <Button hero label={`Unlock premium · $${c.prices.passUsd.toFixed(2)}`} sub="Test build: simulated purchase" onPress={unlock} /> : undefined}>
      <Hud close />
      <View style={{ gap: 2 }}>
        <Label>{`Pass ${p.number} · ${daysLeft} day${daysLeft === 1 ? "" : "s"} left`}</Label>
        <T variant="h1">Season pass</T>
      </View>

      <Card>
        <Row gap={space.lg}>
          <View style={styles.tierBox}>
            <T variant="chip" tone="muted">
              Tier
            </T>
            <T variant="displayTitle">{p.tiers}</T>
          </View>
          <View style={{ flex: 1, gap: 6 }}>
            <Row style={{ justifyContent: "space-between" }}>
              <T variant="bodyStrong">{p.tiers >= P.tiers ? "All tiers done" : `${inTier} / ${P.xpPerTier} XP`}</T>
              <T variant="small" tone="muted">
                {p.tiers >= P.tiers ? "Vault filling" : `Tier ${p.tiers + 1} next`}
              </T>
            </Row>
            <Bar value={inTier} max={P.xpPerTier} />
            <T variant="caption" tone="muted">{`A race gives up to +${P.raceXp.win} XP, playing 2 weeks a day +${P.missionXpPerDay}.`}</T>
          </View>
        </Row>
        {!p.premium ? (
          <View style={styles.premiumNote}>
            <T variant="caption" tone="ink2">{`Premium keeps every free reward and adds ${P.premiumGemsPerTier} gems per tier, including the ${p.tiers} you've already reached, plus the gold avatar frame.`}</T>
          </View>
        ) : (
          <T variant="caption" tone="gold">
            Premium active: gems are added as you reach each tier.
          </T>
        )}
      </Card>

      <Row style={{ paddingHorizontal: space.sm }}>
        <T variant="label" tone="muted" style={{ flex: 1, textAlign: "center" }}>
          Free
        </T>
        <View style={{ width: 44 }} />
        <Row gap={4} style={{ flex: 1, justifyContent: "center" }}>
          {!p.premium ? <Icon name="lock" size={12} color={color.accent} /> : null}
          <T variant="label" tone="accent">
            Premium
          </T>
        </Row>
      </Row>

      <View style={{ gap: space.sm }}>
        {Array.from({ length: P.tiers }, (_, i) => {
          const t = i + 1;
          const reached = t <= p.tiers;
          const lastTier = t === P.tiers;
          return (
            <Fragment key={t}>
              <Row gap={space.sm}>
                <View style={[styles.cell, reached ? styles.cellDone : null]}>
                  <Row gap={4}>
                    <Icon name="coin" size={14} color={color.coin} />
                    <T variant="bodyStrong">{num(P.coinsPerTier)}</T>
                  </Row>
                  {lastTier ? <T variant="small" tone="gem">{`+${P.lastTierGems} gems`}</T> : null}
                  {reached ? <Icon name="check" size={14} color={color.success} /> : null}
                </View>
                <View style={[styles.num, reached ? styles.numOn : null]}>
                  <T variant="bodyStrong" style={{ fontFamily: font.display, color: reached ? color.accentInk : color.ink2 }}>
                    {t}
                  </T>
                </View>
                <View style={[styles.cell, styles.premium, reached && p.premium ? styles.cellDone : null]}>
                  <Row gap={4}>
                    <Icon name="gem" size={14} color={color.gem} />
                    <T variant="bodyStrong">{P.premiumGemsPerTier}</T>
                  </Row>
                  {!p.premium ? <Icon name="lock" size={12} color={color.accent} /> : reached ? <Icon name="check" size={14} color={color.success} /> : null}
                </View>
              </Row>
              {t === p.tiers && t < P.tiers ? (
                <Row style={{ justifyContent: "center" }}>
                  <T variant="small" tone="accent">{`${inTier} / ${P.xpPerTier} XP to tier ${t + 1}`}</T>
                </Row>
              ) : null}
            </Fragment>
          );
        })}
      </View>

      <Card style={styles.vault}>
        <Row gap={space.md}>
          <Icon name="lock" size={22} color={color.warning} />
          <View style={{ flex: 1, gap: 2 }}>
            <T variant="bodyStrong">The vault</T>
            <T variant="caption" tone="ink2">{`After tier ${P.tiers}, every 100 XP adds ${P.vaultCoinsPer100Xp} coins to the vault. It opens when the pass ends.`}</T>
          </View>
          <T variant="numberM" tone="coin">
            {num(vault)}
          </T>
        </Row>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  tierBox: { width: 72, height: 72, borderRadius: radius.lg, borderWidth: 2, borderColor: color.accent, alignItems: "center", justifyContent: "center" },
  premiumNote: { backgroundColor: color.accentTint, borderRadius: radius.md, padding: space.md, borderWidth: 1, borderColor: "#5A3A20" },
  cell: {
    flex: 1,
    minHeight: 56,
    borderRadius: radius.lg,
    backgroundColor: color.surface,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    borderWidth: 1,
    borderColor: "transparent",
  },
  premium: { backgroundColor: color.accentTint, borderStyle: "dashed", borderColor: "#5A3A20" },
  cellDone: { borderColor: color.success, borderStyle: "solid" },
  num: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: color.border, alignItems: "center", justifyContent: "center", marginHorizontal: 4 },
  numOn: { backgroundColor: color.accent, borderColor: color.accent },
  vault: { borderWidth: 1, borderStyle: "dashed", borderColor: color.warning },
});
