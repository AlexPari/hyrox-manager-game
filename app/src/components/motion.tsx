// Small motion kit: entrances, pops, count-ups and a confetti burst for rewards.
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Animated, Easing, Platform, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

const native = Platform.OS !== "web";

/** Slides up and fades in on mount. Use `delay` to stagger a list of cards. */
export function FadeIn({ children, delay = 0, dy = 14, duration = 380, style }: { children: ReactNode; delay?: number; dy?: number; duration?: number; style?: StyleProp<ViewStyle> }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration, delay, easing: Easing.out(Easing.cubic), useNativeDriver: native }).start();
  }, [v, delay, duration]);
  return (
    <Animated.View style={[style, { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [dy, 0] }) }] }]}>
      {children}
    </Animated.View>
  );
}

/** Springs in from small, with an optional tilt: badges, patches, icons. */
export function PopIn({ children, delay = 0, from = 0.5, tilt = 0, style }: { children: ReactNode; delay?: number; from?: number; tilt?: number; style?: StyleProp<ViewStyle> }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.sequence([Animated.delay(delay), Animated.spring(v, { toValue: 1, friction: 5, tension: 80, useNativeDriver: native })]).start();
  }, [v, delay]);
  return (
    <Animated.View
      style={[
        style,
        {
          opacity: v.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] }),
          transform: [
            { scale: v.interpolate({ inputRange: [0, 1], outputRange: [from, 1] }) },
            { rotate: v.interpolate({ inputRange: [0, 1], outputRange: [`${tilt}deg`, "0deg"] }) },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

/** A number that eases from `from` to `to`; calls onDone once at the end. */
export function useCountUp(to: number, { from = 0, duration = 1200, delay = 0, onDone }: { from?: number; duration?: number; delay?: number; onDone?: () => void } = {}): number {
  const [value, setValue] = useState(from);
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    const v = new Animated.Value(0);
    const id = v.addListener(({ value: k }) => setValue(from + (to - from) * k));
    Animated.timing(v, { toValue: 1, duration, delay, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start(({ finished }) => {
      if (finished) done.current?.();
    });
    return () => v.removeListener(id);
  }, [from, to, duration, delay]);
  return value;
}

/** Confetti burst from the centre of its parent. Renders nothing interactive; mount it when the reward lands. */
export function Burst({ colors, count = 22, spread = 150, delay = 0 }: { colors: string[]; count?: number; spread?: number; delay?: number }) {
  const t = useRef(new Animated.Value(0)).current;
  const key = colors.join(",");
  const parts = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const a = (i / count) * Math.PI * 2 + Math.random() * 0.5;
        const d = spread * (0.55 + Math.random() * 0.45);
        return { dx: Math.cos(a) * d, dy: Math.sin(a) * d * 0.8 - 20, spin: (Math.random() - 0.5) * 720, w: 5 + Math.random() * 5, h: 8 + Math.random() * 6, c: colors[i % colors.length] };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [count, spread, key],
  );
  useEffect(() => {
    Animated.timing(t, { toValue: 1, duration: 1100, delay, easing: Easing.out(Easing.quad), useNativeDriver: native }).start();
  }, [t, delay]);
  return (
    <View pointerEvents="none" style={styles.burst}>
      {parts.map((p, i) => (
        <Animated.View
          key={i}
          style={{
            position: "absolute",
            width: p.w,
            height: p.h,
            borderRadius: 2,
            backgroundColor: p.c,
            opacity: t.interpolate({ inputRange: [0, 0.05, 0.7, 1], outputRange: [0, 1, 1, 0] }),
            transform: [
              { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [0, p.dx] }) },
              // Out fast, then a little gravity at the end.
              { translateY: t.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, p.dy, p.dy + 40] }) },
              { rotate: t.interpolate({ inputRange: [0, 1], outputRange: ["0deg", `${p.spin}deg`] }) },
            ],
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  burst: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" },
});
