import * as Haptics from "expo-haptics";
import type { BottomTabBarProps } from "expo-router/js-tabs";
import { useEffect, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGame } from "@/game/store";
import { UNLOCK_GATE, unlocks, type Feature } from "@/game/ftue";
import { useOpen } from "@/game/nav";
import { color, font, radius, size } from "@/theme";
import { Icon, type IconName } from "./Icon";

const TABS: Record<string, { icon: IconName; label: string; feature?: Feature }> = {
  index: { icon: "home", label: "Home" },
  calendar: { icon: "season", label: "Calendar", feature: "calendar" },
  athlete: { icon: "athlete", label: "Athlete", feature: "athlete" },
};

function tap() {
  if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => undefined);
}

/**
 * The 4 tabs: Home, Calendar and Athlete switch screens; Shop opens as a sheet over the current tab.
 * During the first session, tabs that aren't unlocked yet show a padlock and say when they open.
 */
export function TabBar({ state, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { s, ftue } = useGame();
  const open = useOpen();
  const u = unlocks(s, ftue);
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => (timer.current ? clearTimeout(timer.current) : undefined), []);
  const badges: Record<string, true | undefined> = { athlete: s.status !== "fit" ? true : undefined };
  const locked = (label: string, f: Feature) => {
    if (timer.current) clearTimeout(timer.current);
    setToast(`${label}: ${UNLOCK_GATE[f].toLowerCase()}`);
    timer.current = setTimeout(() => setToast(null), 2000);
  };
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {toast ? (
        <View pointerEvents="none" accessibilityLiveRegion="polite" style={styles.toast}>
          <Icon name="lock" size={16} color={color.muted} />
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      ) : null}
      <View style={styles.row} accessibilityRole="tablist">
        {state.routes.map((route, i) => {
          const t = TABS[route.name];
          if (!t) return null;
          const focused = state.index === i;
          const isLocked = !!t.feature && !u[t.feature];
          return (
            <Item
              key={route.key}
              icon={t.icon}
              label={t.label}
              focused={focused}
              locked={isLocked}
              badge={badges[route.name]}
              onPress={() => {
                if (isLocked) return locked(t.label, t.feature!);
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
          locked={!u.shop}
          onPress={() => {
            if (!u.shop) return locked("Shop", "shop");
            tap();
            open("/shop");
          }}
        />
      </View>
    </View>
  );
}

function Item({
  icon,
  label,
  focused,
  locked,
  badge,
  onPress,
}: {
  icon: IconName;
  label: string;
  focused: boolean;
  locked?: boolean;
  badge?: true;
  onPress: () => void;
}) {
  const tone = focused ? color.accent : locked ? color.muted : color.ink2;
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={locked ? `${label}, locked` : label}
      accessibilityState={{ selected: focused, disabled: locked }}
      onPress={onPress}
      style={({ pressed }) => [styles.tab, pressed ? { opacity: 0.7 } : null]}
    >
      <View>
        <Icon name={locked ? "lock" : icon} size={22} color={tone} />
        {badge && !locked ? <View style={styles.badge} /> : null}
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
  toast: {
    position: "absolute",
    bottom: "100%",
    marginBottom: 8,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: color.surface2,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  toastText: { fontFamily: font.semibold, fontSize: 13, color: color.ink },
});
