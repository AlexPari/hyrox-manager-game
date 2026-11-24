import { Tabs } from "expo-router/js-tabs";
import { TabBar } from "@/components/TabBar";
import { color } from "@/theme";

/** Home, Calendar and Athlete are real tabs: switching never stacks screens. Shop is a sheet (see TabBar). */
export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, animation: "fade", sceneStyle: { backgroundColor: color.ground } }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="calendar" />
      <Tabs.Screen name="athlete" />
    </Tabs>
  );
}
