import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMediaRange } from '../src/lib/media-range.ts';
import { mediaImageUrl, isUploadedImage, MEDIA_IMAGE_WIDTHS } from '../src/lib/media-image.ts';

test('byte range clamp, open end and suffix match browser seeking', () => {
  assert.deepEqual(parseMediaRange('bytes=0-1023', 2000), { start: 0, end: 1023 });
  assert.deepEqual(parseMediaRange('bytes=1000-', 2000), { start: 1000, end: 1999 });
  assert.deepEqual(parseMediaRange('bytes=-128', 2000), { start: 1872, end: 1999 });
  assert.deepEqual(parseMediaRange('bytes=0-9999', 2000), { start: 0, end: 1999 });
});
test('invalid or unsatisfiable ranges do not allocate giant buffers', () => {
  for (const header of ['bytes=2000-', 'bytes=-0', 'bytes=2-1', 'bytes=-', 'bytes=0-1,3-4', 'bytes=9007199254740992-']) assert.equal(parseMediaRange(header, 2000), null);
  assert.equal(parseMediaRange('bytes=0-', 0), null);
});
test('uploaded image requests stay within fixed variants; other assets unchanged', () => {
  const src='/media/abcd-1234.png';
  assert.equal(mediaImageUrl(src,700),`${src}?w=750&v=v1`);
  assert.equal(mediaImageUrl(src,999999),`${src}?w=${MEDIA_IMAGE_WIDTHS.at(-1)}&v=v1`);
  for (const src of ['/media/abcd.gif','/media/abcd.webm','/assets/photo.png','https://example.com/image.jpg']) {
    assert.equal(isUploadedImage(src),false);assert.equal(mediaImageUrl(src,750),src);
  }
});
