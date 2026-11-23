import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { energyCap, minutesToNextEnergy } from "@sim";
import { useGame } from "@/game/store";
import { num } from "@/format";
import { color, font, radius, size, type } from "@/theme";
import { Icon } from "./Icon";
import { IconButton } from "./ui";

export const ATHLETE = { first: "Lucas", last: "Martin", initials: "LM" };

/** Persistent top bar: back or avatar on the left, energy, then the wallet (coins + gems) on the right. */
export function Hud({ back }: { back?: boolean }) {
  const { s } = useGame();
  const cap = energyCap(s);
  const next = minutesToNextEnergy(s);
  return (
    <View accessibilityRole="summary" style={styles.bar}>
      {back ? (
        <IconButton icon="back" label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} />
      ) : (
        <View style={styles.avatar} accessibilityLabel={`${ATHLETE.first} ${ATHLETE.last}`}>
          <Text style={{ fontFamily: font.display, fontSize: 18, color: color.ink }}>{ATHLETE.initials}</Text>
        </View>
      )}
      <View style={[styles.pill, { gap: 6 }]} accessibilityLabel={`Energy ${Math.floor(s.energy)} of ${cap}`}>
        <Icon name="bolt" size={15} color={color.accent} />
        <Text style={styles.pillText}>
          {Math.floor(s.energy)}/{cap}
        </Text>
        {next > 0 ? <Text style={[type.small, { color: color.muted }]}>+1 in {next}m</Text> : null}
      </View>
      <View style={{ flex: 1 }} />
      <View style={[styles.pill, { paddingHorizontal: 10 }]} accessibilityLabel={`${num(s.coins)} coins, ${num(s.gems)} gems`}>
        <Icon name="coin" size={15} color={color.coin} />
        <Text style={styles.pillText}>{num(s.coins)}</Text>
        <View style={styles.sep} />
        <Icon name="gem" size={15} color={color.gem} />
        <Text style={styles.pillText}>{num(s.gems)}</Text>
      </View>
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
});
