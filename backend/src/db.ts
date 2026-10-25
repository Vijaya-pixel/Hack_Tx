import { readFileSync } from 'node:fs';

// Database access. The app only needs two things: run a query, get rows back.
// Both the `pg` driver and PGlite (used in tests) fit this shape.
export interface Db {
  query<T extends object = Record<string, unknown>>(text: string, params?: unknown[]): Promise<{ rows: T[] }>;
  close?(): Promise<void>;
}

type Env = Record<string, string | undefined>;

// How to secure the connection.
//   PGSSL_CA_PATH  path to a CA certificate to trust (for example Timescale's ca.timescale.com). The server is fully verified.
//   PGSSL=insecure accepts any certificate. Encrypted, but the server is not authenticated, so use it only for quick tests.
// With either setting, any sslmode in the URL is dropped so it cannot override these choices.
export function sslSettings(connectionString: string, env: Env): { connectionString: string; ssl?: { ca?: string; rejectUnauthorized: boolean } } {
  const ssl = env.PGSSL === 'insecure' ? { rejectUnauthorized: false }
    : env.PGSSL_CA_PATH ? { ca: readFileSync(env.PGSSL_CA_PATH, 'utf8'), rejectUnauthorized: true } : undefined;
  if (!ssl) return { connectionString };
  return { connectionString: connectionString.replace(/([?&])sslmode=[^&]*&?/, '$1').replace(/[?&]$/, ''), ssl };
}

// Connects to TigerData (or any Postgres) using DATABASE_URL. Returns null if it isn't set.
export async function createDbFromEnv(env: Env = process.env): Promise<Db | null> {
  if (!env.DATABASE_URL) return null;
  if (/PASTE_PASSWORD_HERE/.test(env.DATABASE_URL)) throw new Error('DATABASE_URL still contains PASTE_PASSWORD_HERE. Replace it with your TigerData password.');
  const pg = (await import('pg')).default;
  const { connectionString, ssl } = sslSettings(env.DATABASE_URL, env);
  const pool = new pg.Pool({
    connectionString,
    connectionTimeoutMillis: 8000, // an unreachable host fails fast instead of hanging the app
    ...(ssl ? { ssl } : {}),
  });
  // Hosted databases drop idle connections now and then. Without this, that error would crash the app.
  pool.on('error', (err) => console.error('Database connection error (will reconnect):', err.message));
  return {
    query: (text, params) => pool.query(text, params as unknown[]) as never,
    close: () => pool.end(),
  };
}
