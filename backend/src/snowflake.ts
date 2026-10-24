// Optional Snowflake engine. Same output shape as engine.planOptions, but the ranking is
// computed INSIDE Snowflake (SQL, HAVERSINE, the SURVIVAL_SCORE function from 01_setup.sql).
// Env: SNOWFLAKE_ACCOUNT, SNOWFLAKE_USER, SNOWFLAKE_PASSWORD, and optionally
// SNOWFLAKE_WAREHOUSE (default FC_WH), SNOWFLAKE_DATABASE (FOURCORNERS), SNOWFLAKE_SCHEMA (APP), SNOWFLAKE_ROLE.
import snowflake, { type Bind } from 'snowflake-sdk';
import { CITIES } from './cities.ts';
import type { PlanInput, PlanRow } from './types.ts';

export const PLAN_SQL = `
WITH m AS (SELECT * FROM GROUP_MEMBERS WHERE GROUP_CODE = ?),
n AS (SELECT COUNT(*) AS C FROM m),
free AS (
  SELECT WEEKEND_START FROM GROUP_FREE_WEEKENDS WHERE GROUP_CODE = ?
  GROUP BY WEEKEND_START HAVING COUNT(DISTINCT MEMBER_ID) = (SELECT C FROM n)
),
legs AS (
  SELECT c.CITY AS DEST, m.MEMBER_ID, m.MAX_TRAVEL_HOURS AS LIMIT_H,
         HAVERSINE(m.LAT, m.LON, c.LAT, c.LON) AS KM
  FROM m CROSS JOIN APP_CITIES c
),
legs2 AS (
  SELECT DEST, MEMBER_ID, LIMIT_H,
         IFF(KM < 50, 0, 1.5 + KM / 700) AS HOURS,
         IFF(KM < 50, 0, ROUND(80 + 0.12 * KM, 0)) AS COST
  FROM legs
),
agg AS (
  SELECT DEST, MAX(HOURS) AS MAX_HOURS, AVG(COST) AS AVG_COST,
         MAX(COST) - MIN(COST) AS COST_GAP, BOOLAND_AGG(HOURS <= LIMIT_H) AS FEASIBLE
  FROM legs2 GROUP BY DEST
)
SELECT TO_VARCHAR(f.WEEKEND_START) AS WEEKEND, a.DEST AS CITY,
       ROUND(a.MAX_HOURS, 1) AS MAX_TRAVEL_HOURS, ROUND(a.AVG_COST) AS EST_COST_PP,
       ROUND(a.COST_GAP) AS COST_GAP,
       DATEDIFF(day, TO_DATE(?), f.WEEKEND_START) AS LEAD_DAYS,
       a.FEASIBLE AS FEASIBLE,
       ROUND(SURVIVAL_SCORE((SELECT C FROM n), ?, a.MAX_HOURS, a.AVG_COST,
             DATEDIFF(day, TO_DATE(?), f.WEEKEND_START)), 2) AS SURVIVAL
FROM free f CROSS JOIN agg a
WHERE DATEDIFF(day, TO_DATE(?), f.WEEKEND_START) > 0
ORDER BY FEASIBLE DESC, SURVIVAL DESC, COST_GAP ASC, WEEKEND, CITY
`;

// Placeholders appear in this order: group (members), group (weekends), today (LEAD_DAYS),
// nights (SURVIVAL_SCORE), today (SURVIVAL_SCORE), today (WHERE). A test guards this order.
export const PLAN_BINDS = (
  { code, nights, today }: { code: string; nights: number; today: string },
): Bind[] => [code, code, today, nights, today, today];

export interface SnowflakeEngine {
  kind: 'snowflake';
  planOptions(input: PlanInput): Promise<PlanRow[]>;
  complete(prompt: string, model?: string): Promise<string>;
  close(): Promise<void>;
}

type Env = Record<string, string | undefined>;
interface PlanDbRow {
  WEEKEND: string; CITY: string; MAX_TRAVEL_HOURS: number | string; EST_COST_PP: number | string;
  COST_GAP: number | string; LEAD_DAYS: number | string; FEASIBLE: boolean; SURVIVAL: number | string;
}

export async function createSnowflakeEngine(env: Env = process.env): Promise<SnowflakeEngine> {
  snowflake.configure({ logLevel: 'ERROR' });
  const conn = snowflake.createConnection({
    account: env.SNOWFLAKE_ACCOUNT ?? '', username: env.SNOWFLAKE_USER ?? '', password: env.SNOWFLAKE_PASSWORD,
    warehouse: env.SNOWFLAKE_WAREHOUSE || 'FC_WH', database: env.SNOWFLAKE_DATABASE || 'FOURCORNERS',
    schema: env.SNOWFLAKE_SCHEMA || 'APP', role: env.SNOWFLAKE_ROLE,
  });
  await new Promise<void>((res, rej) => { conn.connect((err) => (err ? rej(err) : res())); });

  const run = <T = unknown>(sqlText: string, binds: Bind[] = []): Promise<T[]> => new Promise((res, rej) => {
    conn.execute({ sqlText, binds, complete: (err, _stmt, rows) => (err ? rej(err) : res((rows ?? []) as T[])) });
  });

  // App tables are created if missing; the survival function comes from 01_setup.sql.
  await run(`CREATE TABLE IF NOT EXISTS GROUP_MEMBERS (GROUP_CODE STRING, MEMBER_ID STRING, NAME STRING,
    CITY STRING, LAT FLOAT, LON FLOAT, MAX_TRAVEL_HOURS FLOAT)`);
  await run('CREATE TABLE IF NOT EXISTS GROUP_FREE_WEEKENDS (GROUP_CODE STRING, MEMBER_ID STRING, WEEKEND_START DATE)');
  await run('CREATE TABLE IF NOT EXISTS APP_CITIES (CITY STRING, LAT FLOAT, LON FLOAT)');
  await run('TRUNCATE TABLE APP_CITIES');
  for (const c of CITIES) await run('INSERT INTO APP_CITIES VALUES (?, ?, ?)', [c.name, c.lat, c.lon]);

  return {
    kind: 'snowflake',
    async planOptions({ code = '', members, availability, today, nights = 2 }) {
      // Push the group's current state into Snowflake, then let SQL do the ranking.
      await run('DELETE FROM GROUP_MEMBERS WHERE GROUP_CODE = ?', [code]);
      await run('DELETE FROM GROUP_FREE_WEEKENDS WHERE GROUP_CODE = ?', [code]);
      for (const m of members) {
        await run('INSERT INTO GROUP_MEMBERS VALUES (?, ?, ?, ?, ?, ?, ?)',
          [code, m.id, m.name, m.city, m.lat, m.lon, m.maxTravelHours ?? 8]);
        for (const d of availability[m.id] || []) {
          await run('INSERT INTO GROUP_FREE_WEEKENDS VALUES (?, ?, ?)', [code, m.id, d]);
        }
      }
      const rows = await run<PlanDbRow>(PLAN_SQL, PLAN_BINDS({ code, nights, today }));
      return rows.map((r) => ({
        weekend: r.WEEKEND, city: r.CITY, nights, maxTravelHours: Number(r.MAX_TRAVEL_HOURS),
        estCostPp: Number(r.EST_COST_PP), costGap: Number(r.COST_GAP), leadDays: Number(r.LEAD_DAYS),
        feasible: Boolean(r.FEASIBLE), survival: Number(r.SURVIVAL),
      }));
    },
    // Optional: plain-English explanation written by Cortex inside Snowflake.
    async complete(prompt, model = 'mistral-large2') {
      const rows = await run<{ R: string }>('SELECT SNOWFLAKE.CORTEX.COMPLETE(?, ?) AS R', [model, prompt]);
      return rows[0].R;
    },
    close: () => new Promise<void>((res) => { conn.destroy(() => res()); }),
  };
}
