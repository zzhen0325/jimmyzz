import { test } from 'node:test';
import assert from 'node:assert/strict';
import { retryHomeAsset } from '../src/lib/retry-home-asset.ts';

async function flush() { for (let i = 0; i < 8; i++) await Promise.resolve(); }

test('transient network failures retry with backoff and recover', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let calls = 0;
  const result = retryHomeAsset(async () => {
    if (++calls < 4) throw new TypeError('Failed to fetch');
    return 'model bytes';
  });
  await flush();
  for (const delay of [1000, 2000, 4000]) { t.mock.timers.tick(delay); await flush(); }
  assert.equal(await result, 'model bytes');
  assert.equal(calls, 4);
});

test('a slow healthy transfer is not timed out or duplicated', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let calls = 0, complete;
  const result = retryHomeAsset(() => { calls++; return new Promise(resolve => { complete = resolve; }); });
  t.mock.timers.tick(120_000);
  assert.equal(calls, 1);
  complete('slow model');
  assert.equal(await result, 'slow model');
});

test('404 fails immediately instead of retrying', async () => {
  let calls = 0;
  const error = Object.assign(new Error('Not found'), { response: { status: 404 } });
  await assert.rejects(retryHomeAsset(async () => { calls++; throw error; }), error);
  assert.equal(calls, 1);
});

test('disposing a scene stops pending retries', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let disposed = false, calls = 0;
  const result = retryHomeAsset(async () => { calls++; throw new TypeError('offline'); }, () => disposed);
  const rejected = assert.rejects(result, /disposed/);
  await flush();
  disposed = true;
  t.mock.timers.tick(1000);
  await rejected;
  assert.equal(calls, 1);
});

test('persistent network failure ends after four attempts', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let calls = 0;
  const result = retryHomeAsset(async () => { calls++; throw new Error('offline'); });
  const rejected = assert.rejects(result, /offline/);
  await flush();
  for (const delay of [1000, 2000, 4000]) { t.mock.timers.tick(delay); await flush(); }
  await rejected;
  assert.equal(calls, 4);
});
