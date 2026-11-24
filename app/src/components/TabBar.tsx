import * as Haptics from "expo-haptics";
import type { BottomTabBarProps } from "expo-router/js-tabs";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGame } from "@/game/store";
import { useOpen } from "@/game/nav";
import { color, font, size } from "@/theme";
import { Icon, type IconName } from "./Icon";

const TABS: Record<string, { icon: IconName; label: string }> = {
  index: { icon: "home", label: "Home" },
  calendar: { icon: "season", label: "Calendar" },
  athlete: { icon: "athlete", label: "Athlete" },
};

function tap() {
  if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => undefined);
}

/** The 4 tabs: Home, Calendar and Athlete switch screens; Shop opens as a sheet over the current tab. */
export function TabBar({ state, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { s } = useGame();
  const open = useOpen();
  const badges: Record<string, true | undefined> = { athlete: s.status !== "fit" ? true : undefined };
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={styles.row} accessibilityRole="tablist">
        {state.routes.map((route, i) => {
          const t = TABS[route.name];
          if (!t) return null;
          const focused = state.index === i;
          return (
            <Item
              key={route.key}
              icon={t.icon}
              label={t.label}
              focused={focused}
              badge={badges[route.name]}
              onPress={() => {
                if (focused) return; // tapping the tab you're on does nothing
                tap();
                navigateToTab(route.key);
              }}
            />
          );
        })}
        <Item
          icon="bag"
          label="Shop"
          focused={false}
          onPress={() => {
            tap();
            open("/shop");
          }}
        />
      </View>
    </View>
  );
}

function Item({ icon, label, focused, badge, onPress }: { icon: IconName; label: string; focused: boolean; badge?: true; onPress: () => void }) {
  const tone = focused ? color.accent : color.ink2;
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: focused }}
      onPress={onPress}
      style={({ pressed }) => [styles.tab, pressed ? { opacity: 0.7 } : null]}
    >
      <View>
        <Icon name={icon} size={22} color={tone} />
        {badge ? <View style={styles.badge} /> : null}
      </View>
      <Text style={[styles.label, { color: tone }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: { backgroundColor: color.navBar, alignItems: "center", borderTopWidth: 1, borderTopColor: color.hairline },
  row: { flexDirection: "row", width: "100%", maxWidth: size.maxWidth, paddingTop: 6 },
  tab: { flex: 1, alignItems: "center", gap: 3, minHeight: 52, justifyContent: "center" },
  label: { fontFamily: font.semibold, fontSize: 11 },
  badge: { position: "absolute", top: -2, right: -4, width: 9, height: 9, borderRadius: 5, backgroundColor: color.accent },
});
