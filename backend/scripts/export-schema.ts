// Writes backend/tigerdata/schema.sql from src/tigerdata.ts. Run: npm run schema:export
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderSchemaSql } from '../src/tigerdata.ts';

const out = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'tigerdata', 'schema.sql');
fs.writeFileSync(out, renderSchemaSql());
console.log(`wrote ${out}`);
