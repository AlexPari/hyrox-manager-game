import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { energyCap, isVip, minutesToNextEnergy, profileOf } from "@sim";
import { useGame } from "@/game/store";
import { num } from "@/format";
import { color, font, radius, size, type } from "@/theme";
import { Icon } from "./Icon";
import { IconButton } from "./ui";

export function initials(first: string, last: string): string {
  return `${first.trim()[0] ?? ""}${last.trim()[0] ?? ""}`.toUpperCase() || "?";
}

/** Persistent top bar: back or avatar on the left, energy, then the wallet (coins + gems, opens the shop). */
export function Hud({ back }: { back?: boolean }) {
  const { s } = useGame();
  const cap = energyCap(s);
  const next = minutesToNextEnergy(s);
  const p = profileOf(s);
  const gold = s.pass.premium || isVip(s);
  return (
    <View accessibilityRole="summary" style={styles.bar}>
      {back ? (
        <IconButton icon="back" label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} />
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${p.first} ${p.last}: athlete profile`}
          onPress={() => router.push("/athlete")}
          style={[styles.avatar, gold ? { borderWidth: 2.5, borderColor: color.gold } : null]}
        >
          <Text style={{ fontFamily: font.display, fontSize: 18, color: gold ? color.gold : color.ink }}>{initials(p.first, p.last)}</Text>
        </Pressable>
      )}
      <View style={[styles.pill, { gap: 6 }]} accessibilityLabel={`Energy ${Math.floor(s.energy)} of ${cap}`}>
        <Icon name="bolt" size={15} color={color.accent} />
        <Text style={styles.pillText}>
          {Math.floor(s.energy)}/{cap}
        </Text>
        {next > 0 ? <Text style={[type.small, { color: color.muted }]}>+1 in {next}m</Text> : null}
      </View>
      <View style={{ flex: 1 }} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${num(s.coins)} coins, ${num(s.gems)} gems. Open the shop`}
        onPress={() => router.push("/shop")}
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
