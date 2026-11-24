import { BarlowCondensed_600SemiBold, BarlowCondensed_700Bold } from "@expo-google-fonts/barlow-condensed";
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from "@expo-google-fonts/inter";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GameProvider } from "@/game/store";
import { color } from "@/theme";

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    BarlowCondensed_600SemiBold,
    BarlowCondensed_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  // If the fonts can't load (offline, missing file), start anyway with the system fonts rather than a blank screen.
  if (!fontsLoaded && !fontError) return null;
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <GameProvider>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.ground }, animation: "slide_from_right" }}>
          {/* Tabs (Home, Calendar, Athlete) sit at the bottom of the stack; everything else opens over them. */}
          <Stack.Screen name="(tabs)" options={{ animation: "fade" }} />
          {/* The week flow: Plan week → Progress → (race weeks) Race plan → Live race → Result. */}
          <Stack.Screen name="training" />
          <Stack.Screen name="progress" />
          <Stack.Screen name="raceplan" />
          <Stack.Screen name="race" options={{ animation: "fade", gestureEnabled: false }} />
          <Stack.Screen name="result" options={{ animation: "fade", gestureEnabled: false }} />
          <Stack.Screen name="recap" options={{ animation: "fade", gestureEnabled: false }} />
          <Stack.Screen name="onboarding" options={{ animation: "fade" }} />
          <Stack.Screen name="unlock" options={{ animation: "fade", gestureEnabled: false }} />
          {/* Sheets: one tap closes them, opening one from another swaps them (see useOpen). */}
          <Stack.Screen name="shop" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
          <Stack.Screen name="pass" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
        </Stack>
      </GameProvider>
    </SafeAreaProvider>
  );
}
