// TigerData (Postgres + TimescaleDB) store.
//
//  - Live app state (groups, members, availability, feed, pact, stamps) lives in ordinary tables.
//  - fc_score_events is a hypertable: every time the group's best plan changes, one row is written,
//    so a group's "trip health" becomes a time series. Daily rollups use a continuous aggregate.
//  - Works on plain Postgres too (no hypertable, date_trunc instead of time_bucket), which is how
//    the tests run, because TimescaleDB itself isn't available in the test database.
import type { ChainRecord, FeedItem, Group, Member } from './types.ts';
import {
  newCode, newId, type Bucket, type ScoreEvent, type Store, type TrendPoint,
} from './store.ts';

// The only database features we need: run a query, get rows back. Both `pg` and PGlite fit.
export interface Db {
  query<T extends object = Record<string, unknown>>(text: string, params?: unknown[]): Promise<{ rows: T[] }>;
  close?(): Promise<void>;
}

const ISO = `'YYYY-MM-DD"T"HH24:MI:SS"Z"'`;
const iso = (col: string): string => `to_char(${col} AT TIME ZONE 'UTC', ${ISO})`;

const TABLES = [
  `CREATE TABLE IF NOT EXISTS fc_groups (
     code text PRIMARY KEY, name text NOT NULL,
     created_at timestamptz NOT NULL DEFAULT now(), pact jsonb)`,
  `CREATE TABLE IF NOT EXISTS fc_members (
     seq bigserial, id text PRIMARY KEY,
     group_code text NOT NULL REFERENCES fc_groups(code) ON DELETE CASCADE,
     token text NOT NULL, name text NOT NULL, describe text NOT NULL, city text NOT NULL,
     lat double precision NOT NULL, lon double precision NOT NULL, vibe text NOT NULL,
     traits jsonb NOT NULL, max_travel_hours double precision NOT NULL DEFAULT 8,
     is_demo boolean NOT NULL DEFAULT false, joined_at timestamptz NOT NULL DEFAULT now())`,
  'CREATE INDEX IF NOT EXISTS fc_members_group ON fc_members (group_code, seq)',
  `CREATE TABLE IF NOT EXISTS fc_availability (
     member_id text NOT NULL REFERENCES fc_members(id) ON DELETE CASCADE,
     weekend date NOT NULL, PRIMARY KEY (member_id, weekend))`,
  `CREATE TABLE IF NOT EXISTS fc_feed (
     id bigserial PRIMARY KEY,
     group_code text NOT NULL REFERENCES fc_groups(code) ON DELETE CASCADE,
     at timestamptz NOT NULL DEFAULT now(), system boolean NOT NULL DEFAULT false,
     from_member text, name text, text text NOT NULL)`,
  'CREATE INDEX IF NOT EXISTS fc_feed_group ON fc_feed (group_code, id)',
  `CREATE TABLE IF NOT EXISTS fc_stamps (
     id bigserial PRIMARY KEY,
     group_code text NOT NULL REFERENCES fc_groups(code) ON DELETE CASCADE,
     record jsonb NOT NULL, at timestamptz NOT NULL DEFAULT now())`,
  // The time series. No foreign key, because hypertables work best without them.
  `CREATE TABLE IF NOT EXISTS fc_score_events (
     time timestamptz NOT NULL, group_code text NOT NULL, city text, weekend date, nights int,
     survival real NOT NULL, reason text NOT NULL, seeded boolean NOT NULL DEFAULT false)`,
  'CREATE INDEX IF NOT EXISTS fc_score_events_group_time ON fc_score_events (group_code, time DESC)',
];

// Each statement runs on its own: continuous aggregates can't be created inside a transaction.
const TIMESCALE_STEPS = [
  'CREATE EXTENSION IF NOT EXISTS timescaledb',
  "SELECT create_hypertable('fc_score_events', 'time', if_not_exists => TRUE, migrate_data => TRUE)",
];
const CAGG_STEPS = [
  `CREATE MATERIALIZED VIEW IF NOT EXISTS fc_score_daily
     WITH (timescaledb.continuous) AS
     SELECT time_bucket(INTERVAL '1 day', time) AS bucket, group_code,
            avg(survival) AS avg_survival, max(survival) AS best_survival, count(*) AS samples
     FROM fc_score_events GROUP BY bucket, group_code WITH NO DATA`,
  `SELECT add_continuous_aggregate_policy('fc_score_daily',
     start_offset => INTERVAL '60 days', end_offset => INTERVAL '1 hour',
     schedule_interval => INTERVAL '1 hour', if_not_exists => TRUE)`,
];

interface GroupRow { code: string; name: string; created_at: string; pact: ChainRecord | null }
interface MemberRow {
  id: string; token: string; name: string; describe: string; city: string; lat: number; lon: number;
  vibe: string; traits: Member['character']; max_travel_hours: number; is_demo: boolean;
}
interface FeedRow { at: string; system: boolean; from_member: string | null; name: string | null; text: string }

export interface PgStore extends Store {
  /** true when TimescaleDB is active (hypertable + time_bucket); false on plain Postgres. */
  readonly timescale: boolean;
  /** true when the daily continuous aggregate was created. */
  readonly continuousAggregate: boolean;
}

export function createPostgresStore(db: Db): PgStore {
  let timescale = false;
  let cagg = false;
  const attempt = async (sql: string): Promise<boolean> => {
    try { await db.query(sql); return true; } catch { return false; }
  };

  const store: PgStore = {
    kind: 'postgres',
    get timescale() { return timescale; },
    get continuousAggregate() { return cagg; },

    async init() {
      for (const sql of TABLES) await db.query(sql);
      timescale = true;
      for (const sql of TIMESCALE_STEPS) {
        if (!(await attempt(sql))) { timescale = false; break; }
      }
      if (timescale) {
        cagg = true;
        for (const sql of CAGG_STEPS) {
          if (!(await attempt(sql))) { cagg = false; break; }
        }
      }
    },
    async close() { await db.close?.(); },

    async createGroup(name) {
      for (let tries = 0; tries < 10; tries++) {
        const code = newCode();
        const { rows } = await db.query<{ code: string }>(
          'INSERT INTO fc_groups (code, name) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING code', [code, name]);
        if (rows.length) return (await store.getGroup(code)) as Group;
      }
      throw new Error('Could not allocate an invite code');
    },
    async deleteGroup(code) {
      await db.query('DELETE FROM fc_score_events WHERE group_code = $1', [code]);
      await db.query('DELETE FROM fc_groups WHERE code = $1', [code]); // members, feed, stamps cascade
    },

    async getGroup(codeInput) {
      const code = String(codeInput ?? '').toUpperCase();
      const g = (await db.query<GroupRow>(
        `SELECT code, name, ${iso('created_at')} AS created_at, pact FROM fc_groups WHERE code = $1`, [code])).rows[0];
      if (!g) return null;
      const members = (await db.query<MemberRow>(
        `SELECT id, token, name, describe, city, lat, lon, vibe, traits, max_travel_hours, is_demo
         FROM fc_members WHERE group_code = $1 ORDER BY seq`, [code])).rows;
      const avail = (await db.query<{ member_id: string; weekend: string }>(
        `SELECT a.member_id, to_char(a.weekend, 'YYYY-MM-DD') AS weekend
         FROM fc_availability a JOIN fc_members m ON m.id = a.member_id
         WHERE m.group_code = $1 ORDER BY a.weekend`, [code])).rows;
      const feed = (await db.query<FeedRow>(
        `SELECT * FROM (SELECT id, ${iso('at')} AS at, system, from_member, name, text
           FROM fc_feed WHERE group_code = $1 ORDER BY id DESC LIMIT 50) recent ORDER BY id`, [code])).rows;
      const stamps = (await db.query<{ record: ChainRecord }>(
        'SELECT record FROM fc_stamps WHERE group_code = $1 ORDER BY id', [code])).rows;

      const availability: Record<string, string[]> = {};
      for (const a of avail) (availability[a.member_id] ??= []).push(a.weekend);
      const group: Group = {
        code: g.code, name: g.name, createdAt: g.created_at,
        members: members.map((m) => ({
          id: m.id, token: m.token, name: m.name, describe: m.describe, city: m.city, lat: m.lat, lon: m.lon,
          vibe: m.vibe, character: m.traits, maxTravelHours: m.max_travel_hours,
          ...(m.is_demo ? { isDemo: true } : {}),
        })),
        availability, pact: g.pact, stamps: stamps.map((s) => s.record),
        feed: feed.map((f) => ({
          at: f.at, text: f.text,
          ...(f.system ? { system: true } : {}),
          ...(f.from_member ? { from: f.from_member } : {}),
          ...(f.name ? { name: f.name } : {}),
        })),
      };
      return group;
    },

    async addMember(code, m) {
      await db.query(
        `INSERT INTO fc_members (id, group_code, token, name, describe, city, lat, lon, vibe, traits, max_travel_hours, is_demo)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [m.id, code, m.token, m.name, m.describe, m.city, m.lat, m.lon, m.vibe,
          JSON.stringify(m.character), m.maxTravelHours, Boolean(m.isDemo)]);
    },

    async setAvailability(_code, memberId, weekends, maxTravelHours) {
      // Dates are validated by the API before they get here; they are passed as one array literal.
      const literal = `{${[...new Set(weekends)].sort().join(',')}}`;
      await db.query('DELETE FROM fc_availability WHERE member_id = $1 AND weekend <> ALL($2::date[])', [memberId, literal]);
      await db.query(
        'INSERT INTO fc_availability (member_id, weekend) SELECT $1, d FROM unnest($2::date[]) AS d ON CONFLICT DO NOTHING',
        [memberId, literal]);
      if (maxTravelHours !== undefined) {
        await db.query('UPDATE fc_members SET max_travel_hours = $2 WHERE id = $1', [memberId, maxTravelHours]);
      }
    },

    async setPact(code, record) {
      await db.query('UPDATE fc_groups SET pact = $2::jsonb WHERE code = $1', [code, JSON.stringify(record)]);
    },
    async tamperPact(code, city) {
      await db.query(
        `UPDATE fc_groups SET pact = jsonb_set(pact, '{payload,city}', to_jsonb($2::text)) WHERE code = $1 AND pact IS NOT NULL`,
        [code, city]);
    },
    async addStamp(code, record) {
      await db.query('INSERT INTO fc_stamps (group_code, record) VALUES ($1, $2::jsonb)', [code, JSON.stringify(record)]);
    },
    async addFeed(code, item: FeedItem) {
      await db.query(
        'INSERT INTO fc_feed (group_code, at, system, from_member, name, text) VALUES ($1, $2::timestamptz, $3, $4, $5, $6)',
        [code, item.at, Boolean(item.system), item.from ?? null, item.name ?? null, item.text]);
    },

    async logScore(code, e: ScoreEvent) {
      await db.query(
        `INSERT INTO fc_score_events (time, group_code, city, weekend, nights, survival, reason, seeded)
         VALUES ($1::timestamptz, $2, $3, $4::date, $5, $6, $7, $8)`,
        [e.time, code, e.city ?? null, e.weekend ?? null, e.nights ?? null, e.survival, e.reason, Boolean(e.seeded)]);
    },

    async scoreTrend(code, bucket: Bucket = 'day') {
      const unit = bucket === 'hour' ? 'hour' : 'day'; // never taken from user text
      const floor = timescale ? `time_bucket(INTERVAL '1 ${unit}', time)` : `date_trunc('${unit}', time)`;
      const { rows } = await db.query<{ bucket: string; avg: number; best: number; samples: number; seeded: boolean }>(
        `SELECT ${iso('b')} AS bucket,
                round(avg(survival)::numeric, 2)::float8 AS avg,
                round(max(survival)::numeric, 2)::float8 AS best,
                count(*)::int AS samples, bool_or(seeded) AS seeded
         FROM (SELECT ${floor} AS b, survival, seeded FROM fc_score_events WHERE group_code = $1) s
         GROUP BY b ORDER BY b`, [code]);
      return rows as TrendPoint[];
    },

    newId,
  };
  return store;
}
