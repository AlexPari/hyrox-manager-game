// Display names for staff, facilities, gear and their effects.
import type { Effect, FacilityConfig, GearConfig, StaffRoleConfig } from "@sim";

export const staffName: Record<StaffRoleConfig["id"], string> = {
  headCoach: "Head coach",
  physio: "Physio",
  nutritionist: "Nutritionist",
  runningCoach: "Running coach",
  psychologist: "Sports psychologist",
};

export const tierName = ["Not hired", "Bronze", "Silver", "Gold"];

export const facilityName: Record<FacilityConfig["id"], string> = {
  homeGym: "Home gym",
  recoveryRoom: "Recovery room",
  altitudeTent: "Altitude tent",
  cryoChamber: "Cryo chamber",
};

export const gearName: Record<GearConfig["id"], string> = {
  carbonRacers: "Carbon racers",
  gripGloves: "Grip gloves",
  kneeSleeves: "Knee sleeves",
};

export const gearDetail: Record<GearConfig["id"], string> = {
  carbonRacers: "Faster runs",
  gripGloves: "Better grip on sleds and farmers",
  kneeSleeves: "Steadier lunges and burpees",
};

const pct = (v: number) => `${Math.round(Math.abs(v) * 100)}%`;

/** One effect as a short sentence, e.g. "+30% training gains". */
export function effectText(effect: Effect, v: number): string {
  switch (effect) {
    case "trainingGains":
      return `+${pct(v)} training gains`;
    case "runGains":
      return `+${pct(v)} running gains`;
    case "knockChance":
      return `${v < 0 ? "−" : "+"}${pct(v)} knock risk`;
    case "recovery":
      return `+${v} fatigue recovery / week`;
    case "raceDay":
      return `+${v} race-day rating`;
    case "consistency":
      return `−${pct(v)} race randomness`;
    case "decline":
      return `−${pct(v)} age decline`;
  }
}

export function effectsText(effects: Partial<Record<Effect, number>>): string {
  return Object.entries(effects)
    .map(([k, v]) => effectText(k as Effect, v as number))
    .join(" · ");
}
