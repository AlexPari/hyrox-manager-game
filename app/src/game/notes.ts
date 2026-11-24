// Short banners for what happened during a week (knocks, injuries, pass tiers...), shared by Progress and Result.
import type { GameEvent } from "@sim";
import { color } from "@/theme";

export interface WeekNote {
  text: string;
  tone: string;
  bg: string;
}

export function weekNotes(events: GameEvent[]): WeekNote[] {
  const notes: WeekNote[] = [];
  for (const e of events) {
    if (e.type === "knock")
      notes.push({
        text: "Knock: training gains halved and slower races for 2 weeks. Racing or training hard on it can cause an injury.",
        tone: color.warning,
        bg: color.warningTint,
      });
    if (e.type === "injured") notes.push({ text: `Injured for ${e.weeks} weeks: no racing, no training gains.`, tone: color.dangerText, bg: color.dangerTint });
    if (e.type === "recovered") notes.push({ text: "Back to full fitness.", tone: color.success, bg: color.successTint });
    if (e.type === "raceSkipped") notes.push({ text: "You skipped this week's race. Your rivals still scored points.", tone: color.ink2, bg: color.surface });
    if (e.type === "passComplete") notes.push({ text: `Season pass complete: +${e.gems} gems.`, tone: color.gem, bg: color.surface });
  }
  const tiers = events.filter((e) => e.type === "passTier").length;
  if (tiers) notes.push({ text: `Season pass: +${tiers} tier${tiers > 1 ? "s" : ""}.`, tone: color.ink2, bg: color.surface });
  return notes;
}
