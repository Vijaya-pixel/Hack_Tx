// Database access. The app only needs two things: run a query, get rows back.
// Both the `pg` driver and PGlite (used in tests) fit this shape.
export interface Db {
  query<T extends object = Record<string, unknown>>(text: string, params?: unknown[]): Promise<{ rows: T[] }>;
  close?(): Promise<void>;
}

type Env = Record<string, string | undefined>;

// Connects to TigerData (or any Postgres) using DATABASE_URL. Returns null if it isn't set.
// PGSSL=insecure accepts any certificate; leave it unset to verify the server normally.
export async function createDbFromEnv(env: Env = process.env): Promise<Db | null> {
  if (!env.DATABASE_URL) return null;
  const pg = (await import('pg')).default;
  const pool = new pg.Pool({
    connectionString: env.DATABASE_URL,
    ...(env.PGSSL === 'insecure' ? { ssl: { rejectUnauthorized: false } } : {}),
  });
  // Hosted databases drop idle connections now and then. Without this, that error would crash the app.
  pool.on('error', (err) => console.error('Database connection error (will reconnect):', err.message));
  return {
    query: (text, params) => pool.query(text, params as unknown[]) as never,
    close: () => pool.end(),
  };
}
