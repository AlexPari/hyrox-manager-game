import * as Haptics from "expo-haptics";
import type { ReactNode } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { color, radius, size, space, type } from "../theme";
import { Icon, type IconName } from "./Icon";

/**
 * Screen frame: ground background, safe areas, centred column (phone width on web), optional sticky footer.
 * `tabbed`: the tab bar below already covers the bottom inset.
 */
export function Screen({ children, footer, tabbed }: { children: ReactNode; footer?: ReactNode; tabbed?: boolean }) {
  const insets = useSafeAreaInsets();
  const bottom = tabbed ? 0 : insets.bottom;
  return (
    <View style={styles.shell}>
      <View style={styles.column}>
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: insets.top + space.xl, paddingBottom: (footer ? space.lg : bottom) + 28 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
        {footer ? <View style={[styles.footer, { paddingBottom: bottom + space.lg }]}>{footer}</View> : null}
      </View>
    </View>
  );
}

export function Card({ children, style, tint }: { children: ReactNode; style?: StyleProp<ViewStyle>; tint?: string }) {
  return <View style={[styles.card, tint ? { backgroundColor: tint } : null, style]}>{children}</View>;
}

export function Label({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[type.label, { color: color.muted }, style]}>{children}</Text>;
}

export function T({
  children,
  style,
  variant = "body",
  tone = "ink",
  numberOfLines,
}: {
  children: ReactNode;
  style?: StyleProp<TextStyle>;
  variant?: keyof typeof type;
  tone?: keyof typeof color;
  numberOfLines?: number;
}) {
  return (
    <Text style={[type[variant], { color: color[tone] }, style]} numberOfLines={numberOfLines}>
      {children}
    </Text>
  );
}

export function Chip({ children, fg = color.ink2, bg = color.surface3 }: { children: ReactNode; fg?: string; bg?: string }) {
  return (
    <View style={[styles.chip, { backgroundColor: bg }]}>
      <Text style={[type.chip, { color: fg }]}>{children}</Text>
    </View>
  );
}

export function Button({
  label,
  onPress,
  variant = "primary",
  hero,
  icon,
  disabled,
  sub,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "outline";
  hero?: boolean;
  icon?: IconName;
  disabled?: boolean;
  sub?: string;
  accessibilityLabel?: string;
}) {
  const primary = variant === "primary";
  const fg = disabled ? color.muted : primary ? color.accentInk : color.ink;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => {
        if (hero && Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
        onPress();
      }}
      style={({ pressed }) => [
        styles.button,
        { minHeight: hero ? size.heroButton : size.button },
        primary ? { backgroundColor: disabled ? color.surface3 : color.accent } : null,
        variant === "secondary" ? { backgroundColor: color.surface2 } : null,
        variant === "outline" ? { borderWidth: 1, borderColor: color.border } : null,
        pressed && !disabled ? { opacity: 0.88, transform: [{ scale: 0.97 }] } : null,
      ]}
    >
      <View style={styles.row}>
        {icon ? <Icon name={icon} size={18} color={fg} /> : null}
        <Text style={[type.button, { color: fg }, hero ? { fontSize: 17, textTransform: "uppercase", letterSpacing: 0.5 } : null]}>
          {label}
        </Text>
      </View>
      {sub ? (
        <Text style={[type.caption, { color: primary && !disabled ? color.accentInk : color.muted, opacity: 0.85 }]}>{sub}</Text>
      ) : null}
    </Pressable>
  );
}

export function IconButton({ icon, onPress, label }: { icon: IconName; onPress: () => void; label: string }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.iconButton}>
      <Icon name={icon} size={20} />
    </Pressable>
  );
}

/** Segmented control: one choice among a few, each with an optional second line. */
export function Segmented<K extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: Array<{ key: K; label: string; sub?: string; subColor?: string }>;
  value: K;
  onChange: (k: K) => void;
  label: string;
}) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.segTrack}>
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable
            key={o.key}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            accessibilityLabel={`${o.label}${o.sub ? `, ${o.sub}` : ""}`}
            onPress={() => onChange(o.key)}
            style={[styles.segItem, on ? { backgroundColor: color.accent } : null]}
          >
            <Text style={[type.bodyStrong, { color: on ? color.accentInk : color.ink2 }]}>{o.label}</Text>
            {o.sub ? <Text style={[type.small, { color: on ? color.accentInk : (o.subColor ?? color.muted) }]}>{o.sub}</Text> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

export function Bar({
  value,
  max = 100,
  fill = color.accent,
  extra = 0,
  extraFill = color.success,
  height = 6,
}: {
  value: number;
  max?: number;
  fill?: string;
  extra?: number;
  extraFill?: string;
  height?: number;
}) {
  const pct = Math.max(0, Math.min(1, value / max));
  const ext = Math.max(0, Math.min(1 - pct, extra / max));
  return (
    <View style={[styles.barTrack, { height }]}>
      <View style={{ width: `${pct * 100}%`, backgroundColor: fill }} />
      {ext > 0 ? <View style={{ width: `${Math.max(ext * 100, 1.5)}%`, backgroundColor: extraFill }} /> : null}
    </View>
  );
}

export function Row({ children, style, gap = space.sm }: { children: ReactNode; style?: StyleProp<ViewStyle>; gap?: number }) {
  return <View style={[styles.row, { gap }, style]}>{children}</View>;
}

export function Divider() {
  return <View style={{ height: 1, backgroundColor: color.hairline }} />;
}

export const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: color.appShell, alignItems: "center" },
  column: { flex: 1, width: "100%", maxWidth: size.maxWidth, backgroundColor: color.ground },
  scroll: { paddingHorizontal: space.page, gap: space.lg },
  footer: {
    paddingHorizontal: space.page,
    paddingTop: space.lg,
    backgroundColor: color.navBar,
    borderTopWidth: 1,
    borderTopColor: color.hairline,
    gap: space.sm,
  },
  card: { backgroundColor: color.surface, borderRadius: radius.xl, padding: space.xl, gap: space.md },
  chip: { borderRadius: radius.xs, paddingHorizontal: 6, paddingVertical: 2, alignSelf: "flex-start" },
  button: {
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.xl,
    paddingVertical: space.sm,
    gap: 2,
  },
  iconButton: {
    width: size.touch,
    height: size.touch,
    borderRadius: radius.lg,
    backgroundColor: color.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  row: { flexDirection: "row", alignItems: "center", gap: space.sm },
  segTrack: { flexDirection: "row", backgroundColor: color.surface2, borderRadius: radius.md, padding: space.xxs, gap: space.xxs },
  segItem: {
    flex: 1,
    minHeight: size.touch,
    borderRadius: radius.md - 2,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
  },
  barTrack: { flexDirection: "row", backgroundColor: color.surface3, borderRadius: radius.pill, overflow: "hidden", width: "100%" },
});
