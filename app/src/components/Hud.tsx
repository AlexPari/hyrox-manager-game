import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { energyCap, energyPerWeek, isVip, minutesToNextEnergy, profileOf } from "@sim";
import { unlocks } from "@/game/ftue";
import { useOpen } from "@/game/nav";
import { useGame } from "@/game/store";
import { num } from "@/format";
import { color, font, radius, size, type } from "@/theme";
import { Icon } from "./Icon";
import { IconButton } from "./ui";

export function initials(first: string, last: string): string {
  return `${first.trim()[0] ?? ""}${last.trim()[0] ?? ""}`.toUpperCase() || "?";
}

/**
 * Persistent top bar: back, close (sheets) or the avatar on the left, energy, then the wallet (coins + gems, opens
 * the shop; does nothing when the shop is already open).
 */
export function Hud({ back, close }: { back?: boolean; close?: boolean }) {
  const { s, ftue } = useGame();
  const open = useOpen();
  // First session: no energy or wallet yet (weeks are free), and the athlete screen is still locked.
  const u = unlocks(s, ftue);
  const cap = energyCap(s);
  const next = minutesToNextEnergy(s);
  const p = profileOf(s);
  const gold = s.pass.premium || isVip(s);
  const weeks = Math.floor(s.energy / energyPerWeek(s));
  return (
    <View accessibilityRole="summary" style={styles.bar}>
      {back || close ? (
        <IconButton
          icon={close ? "close" : "back"}
          label={close ? "Close" : "Back"}
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
        />
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${p.first} ${p.last}: athlete profile`}
          disabled={!u.athlete}
          onPress={() => router.navigate("/athlete")}
          style={[styles.avatar, gold ? { borderWidth: 2.5, borderColor: color.gold } : null]}
        >
          <Text style={{ fontFamily: font.display, fontSize: 18, color: gold ? color.gold : color.ink }}>{initials(p.first, p.last)}</Text>
        </Pressable>
      )}
      {u.shop ? (
      <View style={[styles.pill, { gap: 6 }]} accessibilityLabel={`Energy for ${weeks} week${weeks === 1 ? "" : "s"}: ${Math.floor(s.energy)} of ${cap}`}>
        <Icon name="bolt" size={15} color={color.accent} />
        <Text style={styles.pillText}>{`${weeks} wk${weeks === 1 ? "" : "s"}`}</Text>
        <Text style={[type.small, { color: color.muted }]}>{next > 0 ? `${Math.floor(s.energy)}/${cap} · +1 in ${next}m` : `${Math.floor(s.energy)}/${cap}`}</Text>
      </View>
      ) : null}
      <View style={{ flex: 1 }} />
      {u.shop ? (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${num(s.coins)} coins, ${num(s.gems)} gems. Open the shop`}
        onPress={() => open("/shop")}
        style={[styles.pill, { paddingLeft: 10, paddingRight: 4 }]}
      >
        <Icon name="coin" size={15} color={color.coin} />
        <Text style={styles.pillText}>{num(s.coins)}</Text>
        <View style={styles.sep} />
        <Icon name="gem" size={15} color={color.gem} />
        <Text style={styles.pillText}>{num(s.gems)}</Text>
        <View style={styles.plus}>
          <Icon name="plus" size={16} color={color.accentInk} strokeWidth={3} />
        </View>
      </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: "row", alignItems: "center", gap: 8 },
  avatar: {
    width: size.touch,
    height: size.touch,
    borderRadius: radius.pill,
    backgroundColor: color.surface2,
    alignItems: "center",
    justifyContent: "center",
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: color.surface,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    minHeight: size.touch,
  },
  pillText: { fontFamily: font.bold, fontSize: 13, color: color.ink },
  sep: { width: 1, height: 18, backgroundColor: color.border, marginHorizontal: 6 },
  plus: { width: 28, height: 28, marginLeft: 8, borderRadius: 14, backgroundColor: color.accent, alignItems: "center", justifyContent: "center" },
});
