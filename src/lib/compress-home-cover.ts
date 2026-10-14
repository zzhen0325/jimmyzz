/** Runs only in the admin browser, so uploads also work on Cloudflare Workers. */
export async function compressHomeCover(file: File): Promise<File | null> {
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.type)) return null;
  // Canvas flattens animations. Preserve APNG and animated WebP as originals.
  const bytes = new Uint8Array(await file.arrayBuffer());
  const marker = file.type === 'image/png' ? 'acTL' : file.type === 'image/webp' ? 'ANIM' : file.type === 'image/avif' ? 'avis' : '';
  if (marker) {
    const codes = [...marker].map(char => char.charCodeAt(0));
    for (let i = 0; i <= bytes.length - 4; i++) {
      if (bytes[i] === codes[0] && bytes[i + 1] === codes[1] && bytes[i + 2] === codes[2] && bytes[i + 3] === codes[3]) return null;
    }
  }
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 1920 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) return null;
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/webp', .9));
    if (!blob || blob.type !== 'image/webp' || blob.size >= file.size) return null;
    return new File([blob], 'home-cover.webp', { type: 'image/webp' });
  } finally { bitmap.close(); }
}
