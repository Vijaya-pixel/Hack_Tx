// Same canonical JSON + SHA-256 fingerprint as solana/lib.ts, so receipts agree everywhere.
import { createHash } from 'node:crypto';

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

export function canonical(value: Json): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort()
      .map((k) => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}
export const fingerprint = (payload: Json): string => createHash('sha256').update(canonical(payload)).digest('hex');
