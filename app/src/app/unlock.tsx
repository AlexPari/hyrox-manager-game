import * as Haptics from "expo-haptics";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef } from "react";
import { Animated, Platform, StyleSheet, View } from "react-native";
import { energyCap } from "@sim";
import { Icon, type IconName } from "@/components/Icon";
import { Button, Card, Label, Row, Screen, T } from "@/components/ui";
import { UNLOCK_GATE, unlocks, type Feature } from "@/game/ftue";
import { useGame } from "@/game/store";
import { color, radius, space } from "@/theme";

const INFO: Record<Feature, { icon: IconName; title: string; href: "/calendar" | "/athlete" | "/shop"; name: string }> = {
  calendar: { icon: "season", title: "Calendar unlocked", href: "/calendar", name: "Calendar" },
  athlete: { icon: "athlete", title: "Athlete unlocked", href: "/athlete", name: "Athlete" },
  shop: { icon: "bag", title: "Shop & energy unlocked", href: "/shop", name: "Shop, season pass and energy" },
};

/** First session: a feature opens. Shown once, from Home, right after the moment that unlocked it. */
export default function Unlock() {
  const { what } = useLocalSearchParams<{ what?: Feature }>();
  const { s, ftue, markSeen } = useGame();
  const pop = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(pop, { toValue: 1, friction: 5, tension: 90, useNativeDriver: true }).start();
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
  }, [pop]);

  if (!what || !(what in INFO)) return <Redirect href="/" />;
  const info = INFO[what];
  const u = unlocks(s, ftue);
  const text =
    what === "calendar"
      ? "See every race of your season, where it takes place and the points it gives."
      : what === "athlete"
        ? "Your stats, staff, gear and personal bests. Rankings and the wall of fame with your first patch are in there too."
        : `From now on a week costs ${s.config.energy.perWeek} energy and races are free: a full bar is ${Math.floor(energyCap(s) / s.config.energy.perWeek)} weeks in a row, +1 every hour. Daily missions, the shop and the season pass are open.`;
  const next = (["calendar", "athlete", "shop"] as Feature[]).filter((f) => !u[f]);

  function later() {
    markSeen(`unlock:${what}`);
    router.replace("/");
  }
  function show() {
    markSeen(`unlock:${what}`);
    router.replace(info.href);
  }

  return (
    <Screen
      footer={
        <Row>
          <View style={{ flex: 1 }}>
            <Button hero variant="outline" label="Later" onPress={later} />
          </View>
          <View style={{ flex: 2 }}>
            <Button hero label="Show me" onPress={show} />
          </View>
        </Row>
      }
    >
      <View style={{ paddingTop: space.xxl * 2 }} />
      <Card style={{ alignItems: "center", paddingVertical: space.xxl, gap: space.lg }}>
        <Label>{what === "shop" ? "Your first session is done" : what === "calendar" ? "After week 1" : "After your first race"}</Label>
        <Animated.View style={[styles.icon, { opacity: pop, transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }] }]}>
          <Icon name={info.icon} size={44} color={color.accentInk} />
        </Animated.View>
        <T variant="displayTitle" style={{ textAlign: "center" }}>
          {info.title}
        </T>
        <T variant="body" tone="ink2" style={{ textAlign: "center", maxWidth: 300 }}>
          {text}
        </T>
      </Card>
      {next.length ? (
        <Card>
          <Label>Coming next</Label>
          {next.map((f) => (
            <Row key={f} style={styles.locked}>
              <Icon name="lock" size={18} color={color.muted} />
              <T variant="bodyStrong" style={{ flex: 1 }}>
                {INFO[f].name}
              </T>
              <T variant="caption" tone="muted">
                {UNLOCK_GATE[f]}
              </T>
            </Row>
          ))}
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  icon: { width: 88, height: 88, borderRadius: 24, backgroundColor: color.accent, alignItems: "center", justifyContent: "center" },
  locked: { minHeight: 44, borderWidth: 1, borderStyle: "dashed", borderColor: color.border, borderRadius: radius.lg, paddingHorizontal: space.md },
});
