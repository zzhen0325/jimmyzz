import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDownloadProgress } from '../src/lib/home-download-progress.ts';

test('weights partial downloads by bytes, not file count', () => {
  const updates = [];
  const progress = createDownloadProgress(['/small', '/large'], {'/small':100,'/large':900}, value => updates.push(value));
  progress.update('/small', 100);
  progress.update('/large', 400);
  progress.update('/large', 900);
  assert.deepEqual(updates, [10, 50, 99]);
});
test('retries and versioned URLs never double-count bytes', () => {
  const updates = [];
  const progress = createDownloadProgress(['/a?v=1','/a?v=2'], {'/a':1000}, value => updates.push(value));
  progress.update('/a?v=1', 600);
  progress.update('/a?v=1', 100);
  progress.update('/a?v=1', 800);
  progress.complete('/a?v=1');
  assert.deepEqual(updates,[60,60,80,99]);
});
test('missing file sizes do not invent a percentage', () => {
  const updates = [];
  const progress = createDownloadProgress(['/a','/unknown'], {'/a':100}, value => updates.push(value));
  progress.complete('/a');
  assert.deepEqual(updates, []);
});
