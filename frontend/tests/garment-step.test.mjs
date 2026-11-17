import test from 'node:test';
import assert from 'node:assert/strict';
import { stepGarment } from '../lib/garment-step.ts';
const list = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
test('steps forward and back with wrap-around', () => {
  assert.equal(stepGarment(list, 'a', 1).id, 'b');
  assert.equal(stepGarment(list, 'c', 1).id, 'a');
  assert.equal(stepGarment(list, 'a', -1).id, 'c');
});
test('unknown current starts from the first item; empty list gives null', () => {
  assert.equal(stepGarment(list, 'zzz', 1).id, 'a');
  assert.equal(stepGarment([], 'a', 1), null);
});
