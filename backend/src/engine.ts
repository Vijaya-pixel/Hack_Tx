// Local scoring engine. It mirrors the Snowflake SQL (snowflake/01_setup.sql and the
// query in snowflake.ts) so the app works with or without Snowflake.
import { CITIES } from './cities.ts';
import type { City, Member, PlanInput, PlanRow, SuggestedPlan } from './types.ts';

const R_KM = 6371; // Snowflake HAVERSINE uses km on a 6371 km sphere

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const rad = (x: number): number => (x * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R_KM * Math.asin(Math.sqrt(h));
}

// Synthetic travel model (no live flight data): hours and cost grow with distance.
export function leg(member: Pick<Member, 'lat' | 'lon'>, city: City): { km: number; hours: number; cost: number } {
  const km = haversineKm(member.lat, member.lon, city.lat, city.lon);
  if (km < 50) return { km, hours: 0, cost: 0 };
  return { km, hours: 1.5 + km / 700, cost: Math.round(80 + 0.12 * km) };
}

export interface SurvivalInput {
  groupSize: number; nights: number; maxTravelHours: number; estCostPp: number; leadDays: number;
}

// Trip Survival Score: logistic prototype fit to synthetic trips, not real behavior.
export function survivalScore({ groupSize, nights, maxTravelHours, estCostPp, leadDays }: SurvivalInput): number {
  const z = 1.8 - 0.25 * maxTravelHours - 0.002 * estCostPp - 0.15 * groupSize
    + 0.012 * Math.min(leadDays, 60) - 0.12 * nights;
  return 1 / (1 + Math.exp(-z));
}

const DAY_MS = 86400000;
export const daysBetween = (fromIso: string, toIso: string): number =>
  Math.round((Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) / DAY_MS);
export const addDays = (iso: string, n: number): string =>
  new Date(Date.parse(`${iso}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);

const round = (x: number, d = 0): number => { const p = 10 ** d; return Math.round(x * p) / p; };

// Weekends where every member is free.
export function sharedWeekends(members: Pick<Member, 'id'>[], availability: Record<string, string[]>): string[] {
  if (!members.length) return [];
  const lists = members.map((m) => new Set(availability[m.id] || []));
  return [...lists[0]].filter((d) => lists.every((s) => s.has(d))).sort();
}

type RowMetrics = Pick<PlanRow, 'maxTravelHours' | 'estCostPp' | 'leadDays'>;

export function scoreRow(row: RowMetrics, groupSize: number, nights: number): number {
  return round(survivalScore({
    groupSize, nights, maxTravelHours: row.maxTravelHours, estCostPp: row.estCostPp, leadDays: row.leadDays,
  }), 2);
}

// Every shared weekend x every candidate city, ranked.
export function planOptions({ members, availability, today, nights = 2, cities = CITIES }: PlanInput): PlanRow[] {
  const weekends = sharedWeekends(members, availability).filter((d) => daysBetween(today, d) > 0);
  const cityStats = cities.map((c) => {
    const legs = members.map((m) => ({ m, ...leg(m, c) }));
    const costs = legs.map((l) => l.cost);
    return {
      city: c.name,
      maxHours: Math.max(...legs.map((l) => l.hours)),
      avgCost: costs.reduce((a, b) => a + b, 0) / costs.length,
      costGap: Math.max(...costs) - Math.min(...costs),
      feasible: legs.every((l) => l.hours <= (l.m.maxTravelHours ?? 8)),
    };
  });
  const rows: PlanRow[] = [];
  for (const weekend of weekends) {
    const leadDays = daysBetween(today, weekend);
    for (const s of cityStats) {
      const row: PlanRow = {
        weekend, city: s.city, nights,
        maxTravelHours: round(s.maxHours, 1), estCostPp: Math.round(s.avgCost),
        costGap: Math.round(s.costGap), leadDays, feasible: s.feasible, survival: 0,
      };
      row.survival = scoreRow(row, members.length, nights);
      rows.push(row);
    }
  }
  return rows.sort((a, b) =>
    (Number(b.feasible) - Number(a.feasible)) || (b.survival - a.survival) || (a.costGap - b.costGap)
    || a.weekend.localeCompare(b.weekend) || a.city.localeCompare(b.city));
}

export interface SmallerResult {
  current: PlanRow & { nights: number };
  smaller: SuggestedPlan[];
}

// "Make it smaller": shorter stay and/or a closer city on the same weekend, only if it helps.
export function suggestSmaller(
  { rows, weekend, city, nights, groupSize }:
  { rows: PlanRow[]; weekend: string; city: string; nights: number; groupSize: number },
): SmallerResult | null {
  const current = rows.find((r) => r.weekend === weekend && r.city === city);
  if (!current) return null;
  const base = scoreRow(current, groupSize, nights);
  const candidates: SuggestedPlan[] = [];
  for (const r of rows.filter((x) => x.weekend === weekend && x.feasible)) {
    for (const n of new Set([nights, Math.max(1, nights - 1)])) {
      if (r.city === city && n === nights) continue;
      if (r.maxTravelHours > current.maxTravelHours && r.city !== city) continue;
      const score = scoreRow(r, groupSize, n);
      if (score > base) {
        candidates.push({
          weekend, city: r.city, nights: n, maxTravelHours: r.maxTravelHours,
          estCostPp: r.estCostPp, survival: score, delta: round(score - base, 2),
          label: `${n} night${n > 1 ? 's' : ''} in ${r.city}`,
        });
      }
    }
  }
  candidates.sort((a, b) => b.survival - a.survival || a.estCostPp - b.estCostPp);
  return { current: { ...current, nights, survival: base }, smaller: candidates.slice(0, 3) };
}
