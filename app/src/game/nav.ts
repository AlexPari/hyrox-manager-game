// Navigation helpers: never stack the same screen twice, and always find the way back to Home.
import { router, usePathname, type Href } from "expo-router";

/** Screens that open as sheets over the current screen. */
const SHEETS = ["/shop", "/pass"];

/**
 * Returns an `open(href)` that does nothing when that screen is already showing, swaps one sheet for another
 * instead of piling them up, and otherwise pushes the screen.
 */
export function useOpen(): (href: Href & string) => void {
  const path = usePathname();
  return (href) => {
    if (path === href) return;
    if (SHEETS.includes(path) && SHEETS.includes(href)) {
      router.replace(href);
      return;
    }
    router.push(href);
  };
}

/** Back to Home, closing every screen of the week flow on the way. */
export function goHome(): void {
  if (router.canDismiss()) router.dismissTo("/");
  else router.replace("/");
}
