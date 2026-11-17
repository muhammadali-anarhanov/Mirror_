import test from 'node:test';
import assert from 'node:assert/strict';
import { hasTrustedOrigin } from '../lib/trusted-origin.ts';

const req = (origin, headers = {}, url = 'http://10.0.0.5:10000/api/v1/auth/login') =>
  new Request(url, { method: 'POST', headers: { ...(origin ? { origin } : {}), ...headers } });

test('accepts the public origin behind a TLS-terminating proxy (Render)', () => {
  assert.equal(hasTrustedOrigin(req('https://mirror-web.onrender.com', { host: '10.0.0.5:10000', 'x-forwarded-host': 'mirror-web.onrender.com', 'x-forwarded-proto': 'https' })), true);
  assert.equal(hasTrustedOrigin(req('https://mirror-web.onrender.com', { host: 'mirror-web.onrender.com', 'x-forwarded-proto': 'https' })), true);
});
test('accepts plain local development', () => {
  assert.equal(hasTrustedOrigin(req('http://localhost:3000', { host: 'localhost:3000' }, 'http://localhost:3000/api/v1/auth/login')), true);
});
test('rejects foreign, missing and protocol-mismatched origins', () => {
  assert.equal(hasTrustedOrigin(req('https://evil.example', { host: 'mirror-web.onrender.com', 'x-forwarded-proto': 'https' })), false);
  assert.equal(hasTrustedOrigin(req(null, { host: 'mirror-web.onrender.com' })), false);
  assert.equal(hasTrustedOrigin(req('null', { host: 'mirror-web.onrender.com' })), false);
  assert.equal(hasTrustedOrigin(req('http://mirror-web.onrender.com', { host: 'mirror-web.onrender.com', 'x-forwarded-proto': 'https' })), false);
});
