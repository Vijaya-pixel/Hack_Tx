// Countdown and nudge messages. Template-based so they always work; an AI (such as Muse Spark)
// can rewrite them later, but the facts here come from code.
import { daysBetween } from './engine.ts';
import type { Group, Nudge } from './types.ts';

export function buildNudges(group: Group, today: string): Nudge[] {
  const out: Nudge[] = [];
  const missing = group.members.filter((m) => !(group.availability[m.id] || []).length);
  for (const m of missing) {
    out.push({ kind: 'availability', to: m.id,
      text: `${m.name} (${m.character.title}) hasn't tapped their free weekends yet. The group is waiting on you!` });
  }
  if (group.pact) {
    const days = daysBetween(today, group.pact.payload.weekend);
    const who = group.members[days % Math.max(1, group.members.length)];
    if (days > 0) {
      out.push({ kind: 'countdown', text: `${days} day${days === 1 ? '' : 's'} until ${group.pact.payload.city}. The flag is planted.` });
      if (who) out.push({ kind: 'prompt', to: who.id,
        text: `${who.name}, as ${who.character.title}, you get to pick the first thing the group does in ${group.pact.payload.city}.` });
    } else if (days === 0) {
      out.push({ kind: 'countdown', text: `It's today! ${group.pact.payload.city}, here you come.` });
    }
  }
  return out;
}
