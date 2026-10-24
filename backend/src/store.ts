// Tiny state store: in memory, optionally saved to a JSON file so a restart keeps the demo.
import fs from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import type { Group } from './types.ts';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no look-alike characters

export interface Store {
  createGroup(name: string): Group;
  deleteGroup(code: string): void;
  getGroup(code: unknown): Group | null;
  save(): void;
  newId(): string;
}

export function createStore({ file = null }: { file?: string | null } = {}): Store {
  let state: { groups: Record<string, Group> } = { groups: {} };
  if (file && fs.existsSync(file)) {
    try { state = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { /* start fresh */ }
  }
  const save = () => {
    if (!file) return;
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(state, null, 2));
  };
  const newCode = (): string => {
    for (;;) {
      const code = Array.from(randomBytes(6), (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
      if (!state.groups[code]) return code;
    }
  };
  return {
    createGroup(name: string): Group {
      const code = newCode();
      state.groups[code] = {
        code, name, createdAt: new Date().toISOString(), members: [], availability: {},
        pact: null, stamps: [], feed: [],
      };
      save();
      return state.groups[code];
    },
    deleteGroup(code: string): void { delete state.groups[code]; save(); },
    getGroup: (code: unknown): Group | null => state.groups[String(code || '').toUpperCase()] || null,
    save,
    newId: (): string => randomBytes(8).toString('hex'),
  };
}
