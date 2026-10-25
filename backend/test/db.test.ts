import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createDbFromEnv, sslSettings } from '../src/db.ts';

const URL_WITH_MODE = 'postgres://u:p@host.example:5432/db?sslmode=require';

describe('database TLS settings', () => {
  test('with no setting the URL is used as given', () => {
    assert.deepEqual(sslSettings(URL_WITH_MODE, {}), { connectionString: URL_WITH_MODE });
  });
  test('PGSSL=insecure skips verification and drops sslmode from the URL', () => {
    const r = sslSettings(URL_WITH_MODE, { PGSSL: 'insecure' });
    assert.deepEqual(r.ssl, { rejectUnauthorized: false });
    assert.equal(r.connectionString, 'postgres://u:p@host.example:5432/db');
  });
  test('PGSSL_CA_PATH trusts that CA and still verifies the server', () => {
    const file = join(mkdtempSync(join(tmpdir(), 'ca-')), 'ca.pem');
    writeFileSync(file, '-----BEGIN CERTIFICATE-----\nTEST\n-----END CERTIFICATE-----\n');
    const r = sslSettings('postgres://u:p@h:1/db?sslmode=require&application_name=x', { PGSSL_CA_PATH: file });
    assert.equal(r.ssl?.rejectUnauthorized, true);
    assert.match(r.ssl!.ca!, /BEGIN CERTIFICATE/);
    assert.equal(r.connectionString, 'postgres://u:p@h:1/db?application_name=x');
  });
  test('a missing CA file is an error, not a silent downgrade', () => {
    assert.throws(() => sslSettings(URL_WITH_MODE, { PGSSL_CA_PATH: '/no/such/file.pem' }));
  });
  test('insecure wins only when asked for explicitly; the CA is not ignored otherwise', () => {
    assert.equal(sslSettings(URL_WITH_MODE, { PGSSL_CA_PATH: '/dev/null' }).ssl?.rejectUnauthorized, true);
  });
});

describe('database setup messages', () => {
  test('a leftover password placeholder is reported clearly', async () => {
    await assert.rejects(() => createDbFromEnv({ DATABASE_URL: 'postgres://u:PASTE_PASSWORD_HERE@h:1/db' }), /Replace it with your TigerData password/);
  });
  test('no DATABASE_URL means no database', async () => {
    assert.equal(await createDbFromEnv({}), null);
  });
});
