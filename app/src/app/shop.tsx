import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import {
  buyCamp,
  buyEnergy,
  buyFacility,
  buyGear,
  buyGemPack,
  buyPassPremium,
  buyVip,
  energyCap,
  fastHeal,
  isVip,
  physio,
  type ActionResult,
} from "@sim";
import { Hud } from "@/components/Hud";
import { Icon, type IconName } from "@/components/Icon";
import { Bar, Button, Card, Chip, Label, Row, Screen, T } from "@/components/ui";
import { useGame } from "@/game/store";
import { effectsText, facilityName, gearDetail, gearName } from "@/names";
import { num } from "@/format";
import { color, radius, space } from "@/theme";
import { useOpen } from "@/game/nav";
import { errorText } from "@/game/rules";

const usd = (v: number) => `$${v.toFixed(2)}`;

export default function Shop() {
  const { s, run, watchAd } = useGame();
  const open = useOpen();
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const c = s.config;
  const act = (fn: Parameters<typeof run>[0], okText: string) => {
    const r = run(fn) as ActionResult;
    const err = errorText(r);
    setMsg(err ? { text: err, ok: false } : { text: okText, ok: true });
  };
  const vip = isVip(s);
  const vipDays = Math.ceil(s.vipUntilDay - s.day);
  const coinAds = c.coins.adCoinsMaxPerDay - s.adsCoinsToday;
  const energyAds = c.energy.adEnergyMaxPerDay - s.adsEnergyToday;

  return (
    <Screen>
      <Hud close />
      <View style={{ gap: 2 }}>
        <Label>Offers · gems · energy · equipment</Label>
        <T variant="h1">Shop</T>
        <T variant="caption" tone="muted">
          Test build: real-money purchases are simulated, nothing is charged.
        </T>
      </View>
      {msg ? (
        <View style={[styles.toast, { backgroundColor: msg.ok ? color.successTint : color.dangerTint }]}>
          <T variant="bodyStrong" style={{ color: msg.ok ? color.success : color.dangerText }}>
            {msg.text}
          </T>
        </View>
      ) : null}

      <Card style={styles.vip}>
        <Row style={{ justifyContent: "space-between" }}>
          <T variant="h2">VIP</T>
          <Chip fg={color.accent} bg={color.accentTint}>
            {vip ? `Active · ${vipDays} days left` : "Best value"}
          </Chip>
        </Row>
        <Perk icon="bolt" text={`Energy cap +${c.energy.vipCapBonus}`} />
        <Perk icon="gem" text={`${c.gems.vipGemsPerDay} gems every day`} />
        <Perk icon="check" text="Gold avatar frame" />
        <Button label={vip ? `Extend 30 days · ${usd(c.prices.vipUsd)}` : `Start VIP · ${usd(c.prices.vipUsd)} / month`} onPress={() => act((st) => buyVip(st), "VIP active (test purchase).")} />
      </Card>

      <Card>
        <Row style={{ justifyContent: "space-between" }}>
          <T variant="h2">Season pass</T>
          <Pressable accessibilityRole="button" onPress={() => open("/pass")} hitSlop={8}>
            <T variant="bodyStrong" tone="accent">
              {"Open pass ›"}
            </T>
          </Pressable>
        </Row>
        {s.pass.active ? (
          <>
            <T variant="meta" tone="ink2">{`Tier ${s.pass.tiers} of ${c.pass.tiers}${s.pass.premium ? " · premium" : ""}`}</T>
            <Bar value={s.pass.tiers} max={c.pass.tiers} />
            {!s.pass.premium ? (
              <Button label={`Unlock premium · ${usd(c.prices.passUsd)}`} onPress={() => act((st) => buyPassPremium(st), "Premium pass unlocked (test purchase).")} />
            ) : null}
          </>
        ) : (
          <T variant="meta" tone="muted">{`The season pass starts in season ${c.pass.unlockSeason}.`}</T>
        )}
      </Card>

      <Section title="Gems">
        <Row>
          {c.prices.gemPacks.map((p, i) => (
            <Pressable key={i} accessibilityRole="button" onPress={() => act((st) => buyGemPack(st, i), `+${p.gems} gems (test purchase).`)} style={styles.pack}>
              <Icon name="gem" size={22} color={color.gem} />
              <T variant="numberM">{num(p.gems)}</T>
              <T variant="small" tone="muted">
                {usd(p.usd)}
              </T>
            </Pressable>
          ))}
        </Row>
      </Section>

      <Section title="Coins">
        <Item title="Watch an ad" sub={`+${c.coins.adCoins} coins · ${coinAds} of ${c.coins.adCoinsMaxPerDay} left today`}>
          <Button variant="secondary" icon="tv" label="Free" disabled={coinAds <= 0} onPress={() => setMsg(errorText(watchAd("coins")) ? { text: "No ads left today.", ok: false } : { text: `+${c.coins.adCoins} coins.`, ok: true })} />
        </Item>
      </Section>

      <Section title={`Energy · ${Math.floor(s.energy)} / ${energyCap(s)}`}>
        <T variant="caption" tone="muted">{`+1 every ${Math.round(1440 / c.energy.regenPerDay)} min.`}</T>
        <Item title="Watch an ad" sub={`+${c.energy.adEnergy} energy · ${energyAds} of ${c.energy.adEnergyMaxPerDay} left today`}>
          <Button variant="secondary" icon="tv" label="Free" disabled={energyAds <= 0} onPress={() => setMsg(errorText(watchAd("energy")) ? { text: "No ads left today.", ok: false } : { text: `+${c.energy.adEnergy} energy.`, ok: true })} />
        </Item>
        <Item title="Energy +20" sub="Can go above the cap">
          <Price gems={c.energy.plus20Gems} onPress={() => act((st) => buyEnergy(st, "plus20"), "+20 energy.")} />
        </Item>
        <Item title="Full refill" sub={`Back to ${energyCap(s)} now`}>
          <Price gems={c.energy.refillGems} onPress={() => act((st) => buyEnergy(st, "refill"), "Energy refilled.")} />
        </Item>
      </Section>

      <Section title="Boosts">
        <Item title="Ice bath" sub={`Fatigue −${c.boosts.iceBathFatigue} before a race · choose it in the race plan`}>
          <Info gems={c.gems.iceBath} />
        </Item>
        <Item title="Training booster" sub={`×${c.boosts.boosterMult} gains for a week · choose it when you plan the week`}>
          <Info gems={c.gems.booster} />
        </Item>
        <Item title="Coach call" sub={`+${c.boosts.coachCallBonus} race rating · choose it in the race plan`}>
          <Info gems={c.gems.coachCall} />
        </Item>
        <Item title="Physio session" sub={s.status === "knock" ? "Clears your knock now" : "Clears a knock (you're not knocked)"}>
          <Price coins={c.coins.physio} disabled={s.status !== "knock"} onPress={() => act((st) => physio(st), "Knock cleared.")} />
        </Item>
        <Item title="Fast heal" sub={s.status !== "fit" ? "Clears your knock or injury now" : "Clears a knock or injury (you're fit)"}>
          <Price gems={c.gems.fastHeal} disabled={s.status === "fit"} onPress={() => act((st) => fastHeal(st), "Back to full fitness.")} />
        </Item>
      </Section>

      <Section title="Equipment">
        {c.gear.map((g, i) => (
          <Item key={g.id} title={gearName[g.id]} sub={`${gearDetail[g.id]} · +${g.raceBonus} race rating`}>
            {s.gear[i] ? (
              <Chip fg={color.success} bg={color.successTint}>
                Owned
              </Chip>
            ) : (
              <Price coins={g.cost} onPress={() => act((st) => buyGear(st, i), `${gearName[g.id]} bought.`)} />
            )}
          </Item>
        ))}
      </Section>

      <Section title="Training base">
        {c.facilities.map((f, i) => (
          <Item key={f.id} title={facilityName[f.id]} sub={effectsText(f.effects)}>
            {s.facilities[i] ? (
              <Chip fg={color.success} bg={color.successTint}>
                Owned
              </Chip>
            ) : (
              <Price coins={f.cost} onPress={() => act((st) => buyFacility(st, i), `${facilityName[f.id]} built.`)} />
            )}
          </Item>
        ))}
      </Section>

      <Section title="Training camps">
        <Item
          title="Altitude camp"
          sub={s.campWeeksLeft > 0 ? `Active · ${s.campWeeksLeft} weeks left` : `${c.camps.altitude.weeks} weeks of ×${c.camps.altitude.mult} training gains`}
        >
          <Price coins={c.camps.altitude.cost} disabled={s.campWeeksLeft > 0} onPress={() => act((st) => buyCamp(st, "altitude"), "Altitude camp booked.")} />
        </Item>
        <Item
          title="Heat camp"
          sub={s.division !== "Elite 15" ? "Elite 15 only · prepares the World Championships" : s.heatCampBooked ? "Booked for the World Championships" : `+${c.camps.heat.raceBonus} rating at the World Championships`}
        >
          <Price coins={c.camps.heat.cost} disabled={s.division !== "Elite 15" || s.heatCampBooked} onPress={() => act((st) => buyCamp(st, "heat"), "Heat camp booked.")} />
        </Item>
      </Section>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <Label>{title}</Label>
      {children}
    </Card>
  );
}

function Item({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <Row style={styles.item}>
      <View style={{ flex: 1, gap: 2 }}>
        <T variant="bodyStrong">{title}</T>
        <T variant="caption" tone="muted">
          {sub}
        </T>
      </View>
      <View style={{ minWidth: 92, alignItems: "flex-end" }}>{children}</View>
    </Row>
  );
}

function Perk({ icon, text }: { icon: IconName; text: string }) {
  return (
    <Row gap={8}>
      <Icon name={icon} size={16} color={color.accent} />
      <T variant="body">{text}</T>
    </Row>
  );
}

function Price({ gems, coins, onPress, disabled }: { gems?: number; coins?: number; onPress: () => void; disabled?: boolean }) {
  const isGem = gems !== undefined;
  const tone = isGem ? color.gem : color.coin;
  return (
    <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={[styles.price, { borderColor: tone }, disabled ? { opacity: 0.4 } : null]}>
      <Icon name={isGem ? "gem" : "coin"} size={15} color={tone} />
      <T variant="bodyStrong" style={{ color: tone }}>
        {num(isGem ? gems! : coins!)}
      </T>
    </Pressable>
  );
}

function Info({ gems }: { gems: number }) {
  return (
    <Row gap={4}>
      <Icon name="gem" size={14} color={color.gem} />
      <T variant="bodyStrong" tone="gem">
        {gems}
      </T>
    </Row>
  );
}

const styles = StyleSheet.create({
  toast: { borderRadius: radius.md, padding: space.md },
  vip: { borderWidth: 1.5, borderColor: color.accent },
  pack: { flex: 1, alignItems: "center", gap: 4, paddingVertical: space.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: color.border, backgroundColor: color.surface2 },
  item: { minHeight: 56, backgroundColor: color.surface2, borderRadius: radius.lg, paddingHorizontal: space.lg, paddingVertical: space.sm, gap: space.md },
  price: { flexDirection: "row", alignItems: "center", gap: 4, minHeight: 44, paddingHorizontal: space.md, borderRadius: radius.md, borderWidth: 1 },
});
