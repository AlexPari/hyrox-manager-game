import { router, type Href } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { color, font } from "@/theme";
import { Icon, type IconName } from "./Icon";

const TABS: Array<{ icon: IconName; label: string; href: Href }> = [
  { icon: "athlete", label: "Athlete", href: "/athlete" },
  { icon: "season", label: "Calendar", href: "/calendar" },
  { icon: "rank", label: "Rankings", href: "/rankings" },
  { icon: "badge", label: "Wall", href: "/wall" },
  { icon: "pass", label: "Pass", href: "/pass" },
  { icon: "bag", label: "Shop", href: "/shop" },
];

/** Hub shortcuts to every other screen, above the Continue button. Badges flag something to look at. */
export function TabBar({ badges = {} }: { badges?: Partial<Record<string, number | true>> }) {
  return (
    <View style={styles.row} accessibilityRole="tablist">
      {TABS.map((t) => {
        const b = badges[t.label];
        return (
          <Pressable key={t.label} accessibilityRole="tab" accessibilityLabel={t.label} onPress={() => router.push(t.href)} style={styles.tab}>
            <View>
              <Icon name={t.icon} size={22} color={color.ink2} />
              {b ? (
                <View style={[styles.badge, typeof b === "number" ? styles.badgeNum : null]}>
                  {typeof b === "number" ? <Text style={styles.badgeText}>{b}</Text> : null}
                </View>
              ) : null}
            </View>
            <Text style={styles.label}>{t.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between" },
  tab: { flex: 1, alignItems: "center", gap: 3, minHeight: 44, justifyContent: "center" },
  label: { fontFamily: font.semibold, fontSize: 11, color: color.ink2 },
  badge: { position: "absolute", top: -2, right: -4, width: 9, height: 9, borderRadius: 5, backgroundColor: color.accent },
  badgeNum: { width: 18, height: 18, borderRadius: 9, top: -6, right: -10, alignItems: "center", justifyContent: "center", backgroundColor: color.danger },
  badgeText: { fontFamily: font.bold, fontSize: 10, color: color.ink },
});
