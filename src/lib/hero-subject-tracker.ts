// Track the blue monitor in the current hero footage from decoded source pixels.
// Sampling the video (not the filtered canvas) keeps this independent of ink colours.
export function createHeroSubjectTracker() {
  const canvas = document.createElement('canvas');
  canvas.width = 160;
  canvas.height = 90;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  const mask = new Uint8Array(canvas.width * canvas.height);
  const queue = new Int32Array(mask.length);
  return {
    sample(video: HTMLVideoElement): { x: number; y: number } | null {
      if (!context || video.seeking || video.readyState < 2) return null;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      for (let i = 0; i < mask.length; i++) {
        const r = pixels[i * 4], g = pixels[i * 4 + 1], b = pixels[i * 4 + 2];
        mask[i] = b > 65 && b > r * 1.7 && b > g * 1.2 ? 1 : 0;
      }
      let bestScore = 0;
      let subject: { x: number; y: number } | null = null;
      for (let start = 0; start < mask.length; start++) {
        if (!mask[start]) continue;
        let head = 0, tail = 1, sumX = 0, sumY = 0;
        queue[0] = start;
        mask[start] = 0;
        while (head < tail) {
          const cell = queue[head++];
          const x = cell % canvas.width, y = Math.floor(cell / canvas.width);
          sumX += x + 0.5;
          sumY += y + 0.5;
          const add = (next: number) => {
            if (mask[next]) { mask[next] = 0; queue[tail++] = next; }
          };
          if (x > 0) add(cell - 1);
          if (x < canvas.width - 1) add(cell + 1);
          if (y > 0) add(cell - canvas.width);
          if (y < canvas.height - 1) add(cell + canvas.width);
        }
        if (tail < 6) continue;
        const x = sumX / tail / canvas.width, y = sumY / tail / canvas.height;
        // The opening wide shot also has a large blue reflection at the right
        // edge and a blue poster above it. The monitor stays in the lower
        // central focus region during this camera move.
        if (x < 0.28 || x > 0.72 || y < 0.38 || y > 0.75) continue;
        // Prefer the large central screen over small blue wall-poster accents.
        const score = tail / (1 + 12 * ((x - 0.5) ** 2 + (y - 0.5) ** 2));
        if (score > bestScore) { bestScore = score; subject = { x, y }; }
      }
      return subject;
    },
  };
}
