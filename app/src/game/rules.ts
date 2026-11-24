// Small game-rule helpers shared by several screens (kept out of route files).
import { isWorldsWeek, type ActionResult, type GameState, type WeekChoices } from "@sim";
import { color } from "@/theme";

/** Training multiplier for the week, mirroring playWeek (race week, knock, injury, altitude camp, booster). */
export function weekMult(s: GameState, racing: boolean, booster: boolean): number {
  const c = s.config;
  if (s.status === "injured") return 0;
  let m = s.campWeeksLeft > 0 ? c.camps.altitude.mult : 1;
  if (racing) m *= c.training.raceWeekGains;
  if (s.status === "knock") m *= c.injury.knockGains;
  if (booster) m *= c.boosts.boosterMult;
  return m;
}

export function riskLabel(k: number): { text: string; tone: string } {
  return k < 0.05 ? { text: "Low", tone: color.success } : k < 0.12 ? { text: "Medium", tone: color.warning } : { text: "High", tone: color.danger };
}

/** Race-day maths: fatigue after an optional ice bath, and the rating bonus the plan adds. */
export function raceDayExtras(s: GameState, plan: WeekChoices, week: number) {
  const c = s.config;
  const fatigueRace = Math.max(0, s.fatigue - (plan.iceBath ? c.boosts.iceBathFatigue : 0));
  const extra =
    (s.fatigue - fatigueRace) * c.fatigue.racePenaltyPerPoint +
    (plan.coachCall ? c.boosts.coachCallBonus : 0) +
    (isWorldsWeek(s, week) && s.heatCampBooked ? c.camps.heat.raceBonus : 0);
  return { fatigueRace, extra };
}

export function errorText(r: ActionResult): string | null {
  if (r.ok) return null;
  switch (r.error) {
    case "notEnoughCoins":
      return "Not enough coins.";
    case "notEnoughGems":
      return "Not enough gems.";
    case "notEnoughEnergy":
      return "Not enough energy for this week.";
    case "injured":
      return "Injured athletes can't race.";
    case "locked":
      return "Not unlocked yet.";
    case "alreadyOwned":
      return "Already owned.";
    case "limitReached":
      return "Limit reached for today.";
    default:
      return "Not available right now.";
  }
}
