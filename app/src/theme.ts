// Design tokens from the Hyrox Manager design system (dark theme).

export const color = {
  ground: "#0F1217",
  appShell: "#0B0E12",
  surface: "#1A1F27",
  surface2: "#232A34",
  surface3: "#2E3643",
  hairline: "#262D38",
  border: "#3A4352",
  navBar: "#141920",
  ink: "#F2F4F7",
  ink2: "#C9D1DC",
  muted: "#9AA4B2",
  faint: "#5B6575",
  accent: "#FF6A2B",
  accentInk: "#0F1217",
  accentTint: "#2A2219",
  success: "#3DD68C",
  successTint: "#1E3A2C",
  warning: "#FFC23D",
  warningTint: "#2A2419",
  danger: "#FF5A5A",
  dangerText: "#FF7A7A",
  dangerTint: "#2A1E1E",
  coin: "#FFC23D",
  gem: "#5FD3E8",
  gold: "#FFC23D",
  silver: "#C9D1DC",
  bronze: "#E0A36B",
  trophyTint: "#3A2E14",
  scrim: "rgba(5, 7, 10, 0.72)",
} as const;

export const font = {
  display: "BarlowCondensed_700Bold",
  displaySemi: "BarlowCondensed_600SemiBold",
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
} as const;

export const space = { xxs: 4, xs: 6, sm: 8, md: 10, lg: 14, xl: 16, page: 18, xxl: 24 } as const;
export const radius = { xs: 4, sm: 8, md: 10, lg: 12, xl: 16, sheet: 22, pill: 999 } as const;
export const size = { touch: 44, button: 48, heroButton: 56, maxWidth: 480 } as const;

/** Text styles (fontSize / lineHeight / family), named as in the design system. */
export const type = {
  displayHero: { fontFamily: font.display, fontSize: 72, lineHeight: 68 },
  displayTitle: { fontFamily: font.display, fontSize: 40, lineHeight: 40, textTransform: "uppercase" as const },
  h1: { fontFamily: font.display, fontSize: 32, lineHeight: 34, letterSpacing: 0.3, textTransform: "uppercase" as const },
  h2: { fontFamily: font.display, fontSize: 24, lineHeight: 26, textTransform: "uppercase" as const },
  numberL: { fontFamily: font.display, fontSize: 28, lineHeight: 30 },
  numberM: { fontFamily: font.display, fontSize: 22, lineHeight: 24 },
  bodyStrong: { fontFamily: font.semibold, fontSize: 14, lineHeight: 20 },
  body: { fontFamily: font.regular, fontSize: 14, lineHeight: 20 },
  meta: { fontFamily: font.regular, fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: font.medium, fontSize: 12, lineHeight: 16 },
  small: { fontFamily: font.semibold, fontSize: 11, lineHeight: 14 },
  label: { fontFamily: font.bold, fontSize: 11, lineHeight: 14, letterSpacing: 0.9, textTransform: "uppercase" as const },
  chip: { fontFamily: font.bold, fontSize: 10, lineHeight: 14, letterSpacing: 0.6, textTransform: "uppercase" as const },
  button: { fontFamily: font.bold, fontSize: 15, lineHeight: 20 },
} as const;

/** Fatigue colour: green when fresh, amber when building, red when risky. */
export function fatigueColor(f: number): string {
  return f < 35 ? color.success : f < 60 ? color.warning : color.danger;
}
