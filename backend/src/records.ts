// What we remember about a visitor: the loans they tried, the questions they asked and the requests they sent.
// Sensitive parts are encrypted before they are stored; the visitor is known only by a hash of an anonymous session id.
import type { Db } from './db.ts';
import type { Crypto } from './crypto.ts';
import { enableHypertable } from './tigerdata.ts';

export interface LoanInputRecord { sessionHash: string; vehicle: string; balance: number; apr: number; months: number }
export interface ChatRecord { sessionHash: string; source: string; onTopic: boolean; message: string; reply: string }
export interface HardshipRecord { id: string; sessionHash: string; kind: string; status: string }
export interface LoanInputView { ts: string; vehicle: string; balance: number; apr: number; months: number }

export interface Records {
  mode: 'tigerdata' | 'postgres' | 'memory';
  saveLoanInput(r: LoanInputRecord): Promise<void>;
  saveChat(r: ChatRecord): Promise<void>;
  saveHardship(r: HardshipRecord): Promise<void>;
  recentLoanInputs(sessionHash: string, limit: number): Promise<LoanInputView[]>;
}

// Table names double as the "context" bound into each encrypted value.
const T = { loan: 'loan_inputs', chat: 'chat_messages', hardship: 'hardship_requests' } as const;

const loanPayload = (r: LoanInputRecord): string => JSON.stringify({ balance: r.balance, apr: r.apr, months: r.months });

export interface MemoryRows { loan_inputs: Record<string, unknown>[]; chat_messages: Record<string, unknown>[]; hardship_requests: Record<string, unknown>[] }

export function createMemoryRecords(crypto: Crypto): Records & { rows: MemoryRows } {
  const rows: MemoryRows = { loan_inputs: [], chat_messages: [], hardship_requests: [] };
  return {
    mode: 'memory',
    rows,
    async saveLoanInput(r) { rows.loan_inputs.push({ ts: new Date().toISOString(), session_hash: r.sessionHash, vehicle: r.vehicle, payload_enc: crypto.encrypt(loanPayload(r), T.loan) }); },
    async saveChat(r) {
      rows.chat_messages.push({ ts: new Date().toISOString(), session_hash: r.sessionHash, source: r.source, on_topic: r.onTopic, message_enc: crypto.encrypt(r.message, T.chat), reply_enc: crypto.encrypt(r.reply, T.chat) });
    },
    async saveHardship(r) { rows.hardship_requests.push({ id: r.id, ts: new Date().toISOString(), session_hash: r.sessionHash, kind: r.kind, status: r.status }); },
    async recentLoanInputs(sessionHash, limit) {
      return rows.loan_inputs.filter((x) => x.session_hash === sessionHash).slice(-limit).reverse().map((x) => ({
        ts: String(x.ts), vehicle: String(x.vehicle), ...(JSON.parse(crypto.decrypt(String(x.payload_enc), T.loan)) as { balance: number; apr: number; months: number }),
      }));
    },
  };
}

// Creates the tables (hypertables on TigerData, plain tables elsewhere) and stores to them.
export async function createDbRecords(db: Db, crypto: Crypto): Promise<Records> {
  await db.query(`CREATE TABLE IF NOT EXISTS ${T.loan} (seq bigserial, ts timestamptz NOT NULL DEFAULT clock_timestamp(), session_hash text NOT NULL, vehicle text NOT NULL, payload_enc text NOT NULL)`);
  await db.query(`CREATE TABLE IF NOT EXISTS ${T.chat} (ts timestamptz NOT NULL DEFAULT clock_timestamp(), session_hash text NOT NULL, source text NOT NULL, on_topic boolean NOT NULL, message_enc text NOT NULL, reply_enc text NOT NULL)`);
  await db.query(`CREATE TABLE IF NOT EXISTS ${T.hardship} (id text NOT NULL, ts timestamptz NOT NULL DEFAULT clock_timestamp(), session_hash text NOT NULL, kind text NOT NULL, status text NOT NULL)`);
  const hyper = [
    await enableHypertable(db, { table: T.loan, timeColumn: 'ts' }),
    await enableHypertable(db, { table: T.chat, timeColumn: 'ts' }),
    await enableHypertable(db, { table: T.hardship, timeColumn: 'ts' }),
  ].every(Boolean);
  await db.query(`CREATE INDEX IF NOT EXISTS loan_inputs_session ON ${T.loan} (session_hash, ts DESC)`);
  return {
    mode: hyper ? 'tigerdata' : 'postgres',
    async saveLoanInput(r) {
      await db.query(`INSERT INTO ${T.loan} (session_hash, vehicle, payload_enc) VALUES ($1, $2, $3)`, [r.sessionHash, r.vehicle, crypto.encrypt(loanPayload(r), T.loan)]);
    },
    async saveChat(r) {
      await db.query(`INSERT INTO ${T.chat} (session_hash, source, on_topic, message_enc, reply_enc) VALUES ($1, $2, $3, $4, $5)`,
        [r.sessionHash, r.source, r.onTopic, crypto.encrypt(r.message, T.chat), crypto.encrypt(r.reply, T.chat)]);
    },
    async saveHardship(r) {
      await db.query(`INSERT INTO ${T.hardship} (id, session_hash, kind, status) VALUES ($1, $2, $3, $4)`, [r.id, r.sessionHash, r.kind, r.status]);
    },
    async recentLoanInputs(sessionHash, limit) {
      const { rows } = await db.query<{ ts: Date | string; vehicle: string; payload_enc: string }>(
        `SELECT ts, vehicle, payload_enc FROM ${T.loan} WHERE session_hash = $1 ORDER BY ts DESC, seq DESC LIMIT $2`, [sessionHash, limit]);
      return rows.map((x) => ({ ts: new Date(x.ts).toISOString(), vehicle: x.vehicle, ...(JSON.parse(crypto.decrypt(x.payload_enc, T.loan)) as { balance: number; apr: number; months: number }) }));
    },
  };
}

// Falls back to memory when there is no database or setup fails. `reason` says why.
export async function createRecordsFromDb(db: Db | null, crypto: Crypto, timeoutMs = 20_000): Promise<{ records: Records; reason?: string }> {
  if (!db) return { records: createMemoryRecords(crypto), reason: 'DATABASE_URL not set' };
  try {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, rej) => { timer = setTimeout(() => rej(new Error('timed out')), timeoutMs); });
    return { records: await Promise.race([createDbRecords(db, crypto), timeout]).finally(() => clearTimeout(timer)) };
  } catch (e) { return { records: createMemoryRecords(crypto), reason: `database unavailable: ${(e as Error).message}` }; }
}
