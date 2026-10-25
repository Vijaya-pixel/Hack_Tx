// Snowflake access. The rest of the app only sees SnowflakeClient, so tests use a fake and never touch the network.
type Env = Record<string, string | undefined>;

export interface SnowflakeClient {
  query<T extends object = Record<string, unknown>>(sql: string, binds?: unknown[]): Promise<T[]>;
  close(): Promise<void>;
}

export interface SnowflakeConfig {
  account: string;
  username: string;
  warehouse?: string;
  database?: string;
  schema?: string;
  role?: string;
  password?: string;
  privateKeyPath?: string;
  privateKeyPass?: string;
}

export const DEFAULT_CORTEX_MODEL = 'mistral-large2';
export const cortexModel = (env: Env = process.env): string => env.SNOWFLAKE_CORTEX_MODEL || DEFAULT_CORTEX_MODEL;

// Returns null unless there is an account, a user and either a password or a private key.
export function snowflakeConfigFromEnv(env: Env = process.env): SnowflakeConfig | null {
  const account = env.SNOWFLAKE_ACCOUNT, username = env.SNOWFLAKE_USER;
  const password = env.SNOWFLAKE_PASSWORD, privateKeyPath = env.SNOWFLAKE_PRIVATE_KEY_PATH;
  if (!account || !username || (!password && !privateKeyPath)) return null;
  return {
    account, username,
    warehouse: env.SNOWFLAKE_WAREHOUSE || undefined,
    database: env.SNOWFLAKE_DATABASE || undefined,
    schema: env.SNOWFLAKE_SCHEMA || undefined,
    role: env.SNOWFLAKE_ROLE || undefined,
    ...(privateKeyPath
      ? { privateKeyPath, privateKeyPass: env.SNOWFLAKE_PRIVATE_KEY_PASSPHRASE || undefined }
      : { password }),
  };
}

// Error text with any configured secret removed, so it is safe to print.
export function redact(message: string, env: Env = process.env): string {
  let out = message;
  for (const k of ['SNOWFLAKE_PASSWORD', 'SNOWFLAKE_PRIVATE_KEY_PASSPHRASE']) {
    const v = env[k];
    if (v) out = out.split(v).join('***');
  }
  return out;
}

export async function createSnowflakeClient(cfg: SnowflakeConfig): Promise<SnowflakeClient> {
  const sdk = (await import('snowflake-sdk')).default;
  const quiet = () => {};
  sdk.configure({ customLogger: { error: quiet, warn: quiet, info: quiet, debug: quiet, trace: quiet } });
  const conn = sdk.createConnection({
    account: cfg.account,
    username: cfg.username,
    warehouse: cfg.warehouse,
    database: cfg.database,
    schema: cfg.schema,
    role: cfg.role,
    ...(cfg.privateKeyPath
      ? { authenticator: 'SNOWFLAKE_JWT', privateKeyPath: cfg.privateKeyPath, privateKeyPass: cfg.privateKeyPass }
      : { password: cfg.password }),
  });
  await new Promise<void>((resolve, reject) => conn.connect((err) => (err ? reject(err) : resolve())));
  return {
    query: (sql, binds) => new Promise((resolve, reject) => {
      conn.execute({
        sqlText: sql,
        binds: binds as never,
        complete: (err, _stmt, rows) => (err ? reject(err) : resolve((rows ?? []) as never)),
      });
    }),
    close: () => new Promise<void>((resolve) => conn.destroy(() => resolve())),
  };
}

// Connects if configured. Returns the reason when it can't, so /api/health can say why.
export async function connectFromEnv(env: Env = process.env): Promise<{ client: SnowflakeClient | null; reason?: string }> {
  const cfg = snowflakeConfigFromEnv(env);
  if (!cfg) return { client: null, reason: 'Snowflake not configured' };
  try { return { client: await createSnowflakeClient(cfg) }; }
  catch (e) { return { client: null, reason: `Snowflake connection failed: ${redact((e as Error).message, env)}` }; }
}
