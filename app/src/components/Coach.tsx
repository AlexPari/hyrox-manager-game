import { StyleSheet, Text, View } from "react-native";
import { color, font, radius, space, type } from "@/theme";
import { Button } from "./ui";

/** The coach's one-line tips during the first session: a light bubble that stands out from the dark cards. */
export function Coach({ children, onDismiss }: { children: string; onDismiss?: () => void }) {
  return (
    <View accessibilityRole="text" style={styles.bubble}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>CO</Text>
      </View>
      <Text style={[type.body, styles.text]}>{children}</Text>
      {onDismiss ? (
        <View style={{ width: 84 }}>
          <Button variant="secondary" label="Got it" onPress={onDismiss} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    backgroundColor: color.ink,
    borderRadius: radius.xl,
    padding: space.lg,
  },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: color.accent, alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: font.display, fontSize: 15, color: color.accentInk },
  text: { flex: 1, color: color.ground },
});
