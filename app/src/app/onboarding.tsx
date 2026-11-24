import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Coach } from "@/components/Coach";
import { Button, Card, Label, Screen, T } from "@/components/ui";
import { COUNTRIES, flag } from "@/data/places";
import { useGame } from "@/game/store";
import { color, font, radius, space } from "@/theme";

/** First screen of a career: the athlete's name and country (also reachable from the Athlete screen to rename). */
export default function Onboarding() {
  const { s, run } = useGame();
  const fresh = s.season === 1 && s.week === 0;
  const [first, setFirst] = useState(s.profile?.first ?? "");
  const [last, setLast] = useState(s.profile?.last ?? "");
  const [country, setCountry] = useState(s.profile?.country ?? "FR");
  const ok = first.trim().length > 0 && last.trim().length > 0;

  function save() {
    run((st) => {
      st.profile = { first: first.trim(), last: last.trim(), country };
    });
    router.replace("/");
  }

  return (
    <Screen footer={<Button hero label={fresh ? "Start my career" : "Save"} disabled={!ok} onPress={save} />}>
      <View style={{ gap: 6, paddingTop: space.xl }}>
        <Label>{fresh ? "New career · age 21" : "Your athlete"}</Label>
        <T variant="displayTitle">Name your athlete</T>
        <T variant="body" tone="ink2">
          A rookie season in Open, then Pro. Earn your place in Elite 15 and chase a world title in your peak years, 28 to 31.
        </T>
      </View>
      {fresh ? (
        <Coach>Hi, I'm your coach. Your rookie season in Open is 12 weeks and 6 races, then you turn Pro. I'll show you everything as we go.</Coach>
      ) : null}
      <Card>
        <Label>First name</Label>
        <TextInput
          value={first}
          onChangeText={setFirst}
          placeholder="Lucas"
          placeholderTextColor={color.faint}
          autoCapitalize="words"
          maxLength={16}
          style={styles.input}
          accessibilityLabel="First name"
        />
        <Label>Last name</Label>
        <TextInput
          value={last}
          onChangeText={setLast}
          placeholder="Martin"
          placeholderTextColor={color.faint}
          autoCapitalize="words"
          maxLength={20}
          style={styles.input}
          accessibilityLabel="Last name"
        />
      </Card>
      <Card>
        <Label>Country</Label>
        <View style={styles.grid}>
          {COUNTRIES.map((c) => {
            const on = c.code === country;
            return (
              <Pressable
                key={c.code}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                onPress={() => setCountry(c.code)}
                style={[styles.country, on ? styles.countryOn : null]}
              >
                <Text style={{ fontSize: 16 }}>{flag(c.code)}</Text>
                <Text style={[styles.countryText, on ? { color: color.accent } : null]}>{c.name}</Text>
              </Pressable>
            );
          })}
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: 48,
    borderRadius: radius.md,
    backgroundColor: color.surface2,
    color: color.ink,
    fontFamily: font.semibold,
    fontSize: 16,
    paddingHorizontal: space.lg,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  country: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 40,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    backgroundColor: color.surface2,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  countryOn: { borderColor: color.accent, backgroundColor: color.accentTint },
  countryText: { fontFamily: font.semibold, fontSize: 13, color: color.ink2 },
});
