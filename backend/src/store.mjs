// Tiny state store: in memory, optionally saved to a JSON file so a restart keeps the demo.
import fs from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no look-alike characters

export function createStore({ file = null } = {}) {
  let state = { groups: {} };
  if (file && fs.existsSync(file)) {
    try { state = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { /* start fresh */ }
  }
  const save = () => {
    if (!file) return;
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(state, null, 2));
  };
  const newCode = () => {
    for (;;) {
      const code = Array.from(randomBytes(6), (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
      if (!state.groups[code]) return code;
    }
  };
  return {
    createGroup(name) {
      const code = newCode();
      state.groups[code] = {
        code, name, createdAt: new Date().toISOString(), members: [], availability: {},
        pact: null, stamps: [], feed: [],
      };
      save();
      return state.groups[code];
    },
    deleteGroup(code) { delete state.groups[code]; save(); },
    getGroup: (code) => state.groups[String(code || '').toUpperCase()] || null,
    save,
    newId: () => randomBytes(8).toString('hex'),
  };
}
