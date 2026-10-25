// Encryption and hashing for stored user data.
//   encrypt/decrypt  AES-256-GCM. A fresh random IV for every value, and the table name is bound in as authenticated data,
//                    so a value cannot be moved to another table, and any tampering makes decrypt throw.
//   hash             HMAC-SHA256 with a server secret. Used for the anonymous session id, so the database never holds it raw.
import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'node:crypto';

type Env = Record<string, string | undefined>;
const b64u = (b: Buffer): string => b.toString('base64url');

export interface Crypto {
  encrypt(plain: string, context: string): string;
  decrypt(token: string, context: string): string;
  hash(value: string): string;
  ephemeral: boolean; // true when keys were not configured, so stored data cannot be read after a restart
}

export function createCrypto(env: Env = process.env): Crypto {
  let key: Buffer;
  let secret: string;
  let ephemeral = false;
  if (env.DATA_ENCRYPTION_KEY) {
    key = Buffer.from(env.DATA_ENCRYPTION_KEY, 'base64');
    if (key.length !== 32) throw new Error('DATA_ENCRYPTION_KEY must be 32 bytes, base64 encoded');
  } else { key = randomBytes(32); ephemeral = true; }
  if (env.HASH_SECRET) {
    if (env.HASH_SECRET.length < 16) throw new Error('HASH_SECRET must be at least 16 characters');
    secret = env.HASH_SECRET;
  } else { secret = randomBytes(32).toString('hex'); ephemeral = true; }

  return {
    ephemeral,
    encrypt(plain, context) {
      const iv = randomBytes(12);
      const cipher = createCipheriv('aes-256-gcm', key, iv);
      cipher.setAAD(Buffer.from(context));
      const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
      return ['v1', b64u(iv), b64u(cipher.getAuthTag()), b64u(ct)].join('.');
    },
    decrypt(token, context) {
      const [v, iv, tag, ct] = token.split('.');
      if (v !== 'v1' || !iv || !tag || ct === undefined) throw new Error('Unrecognised encrypted value');
      const d = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64url'));
      d.setAAD(Buffer.from(context));
      d.setAuthTag(Buffer.from(tag, 'base64url'));
      return Buffer.concat([d.update(Buffer.from(ct, 'base64url')), d.final()]).toString('utf8');
    },
    hash: (value) => createHmac('sha256', secret).update(value).digest('hex'),
  };
}
