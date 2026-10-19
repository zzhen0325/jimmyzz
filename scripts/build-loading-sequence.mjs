import sharp from 'sharp';

const tiles = await Promise.all(Array.from({ length: 21 }, async (_, i) => ({
  input: await sharp(`public/assets/loading/frame-${String(i + 1).padStart(2, '0')}.png`).resize(600, 600).toBuffer(),
  left: i * 600,
  top: 0,
})));
await sharp({ create: { width: 12600, height: 600, channels: 4, background: '#ffffff' } })
  .composite(tiles).webp({ quality: 78 }).toFile('public/assets/loading/sequence.webp');
