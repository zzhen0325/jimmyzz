import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const manifest = JSON.parse(await readFile(new URL('../src/lib/case-media-manifest.json', import.meta.url), 'utf8'));
test('prepared media URLs exist and image variants preserve proportions', async () => {
  assert.ok(Object.keys(manifest).length > 0);
  for (const entry of Object.values(manifest)) {
    if (entry.variants) {
      assert.ok(entry.width > 0 && entry.height > 0);
      let prior = 0;
      for (const variant of entry.variants) {
        assert.ok(variant.width > prior && variant.width <= entry.width);
        prior = variant.width;
        assert.equal((await stat(path.join('public', variant.src))).size, variant.bytes);
      }
    } else {
      assert.ok((await stat(path.join('public', entry.poster))).size > 0);
      assert.equal((await stat(path.join('public', entry.src))).size, entry.bytes);
    }
  }
});
test('every prepared MP4 has its playback index before media bytes', async () => {
  for (const entry of Object.values(manifest).filter(entry => entry.poster)) {
    const data = await readFile(path.join('public', entry.src));
    const atoms = [];
    let offset = 0;
    while (offset + 8 <= data.length) {
      let size = data.readUInt32BE(offset);
      atoms.push(data.toString('ascii', offset + 4, offset + 8));
      if (size === 1) size = Number(data.readBigUInt64BE(offset + 8));
      if (size === 0) break;
      assert.ok(size >= 8);
      offset += size;
    }
    assert.ok(atoms.includes('moov') && atoms.includes('mdat'), entry.src);
    assert.ok(atoms.indexOf('moov') < atoms.indexOf('mdat'), entry.src);
  }
});
