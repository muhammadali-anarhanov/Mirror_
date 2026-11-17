import test from 'node:test';
import assert from 'node:assert/strict';
import { safeNextPath } from '../lib/safe-next.ts';

test('returns same-site relative paths', () => {
  assert.equal(safeNextPath('?next=/mirror'), '/mirror');
  assert.equal(safeNextPath('?next=%2Fmirror%3Fx%3D1'), '/mirror?x=1');
});
test('rejects open redirects and junk', () => {
  for (const s of ['', '?next=', '?next=https://evil.example', '?next=//evil.example', '?next=/\\evil.example', '?next=javascript:alert(1)', '?next=mirror'])
    assert.equal(safeNextPath(s), null, s);
});
