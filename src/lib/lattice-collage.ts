import { createLatticeFilters } from '@/vendor/lattice/filters.js';
import { heroVideoRect } from './hero-video-geometry';
import { getHeroPalette, paletteGrade, paletteRgb } from './hero-palettes';

// Adapter for effect/vendor/lattice's actual Canvas2D filters. Keep their
// palettes, sampling, bloom branches and contour annotations intact.
export function createLatticeCollage(context: CanvasRenderingContext2D) {
  const source = document.createElement('canvas');
  source.width = 512;
  source.height = 384;
  const sourceContext = source.getContext('2d');
  const sample = document.createElement('canvas');
  const sampleContext = sample.getContext('2d', { willReadFrequently: true });
  if (!sourceContext || !sampleContext) return null;
  let time = 0;
  const gridUpdatesPerSecond = 6;
  let drawingGrid = false;
  let gridSample: { cols: number; rows: number; time: number; data: Uint8ClampedArray } | null = null;
  const sampleGrid = (_source: number, _width: number, _height: number, cols: number, rows: number) => {
    // Hold S04's sampled colours between updates while its geometry stays smooth.
    if (drawingGrid && gridSample && gridSample.cols === cols && gridSample.rows === rows &&
        time >= gridSample.time && time - gridSample.time < 1000 / gridUpdatesPerSecond) {
      return gridSample.data;
    }
    sample.width = cols;
    sample.height = rows;
    sampleContext.drawImage(source, 0, 0, cols, rows);
    const data = sampleContext.getImageData(0, 0, cols, rows).data;
    if (drawingGrid) gridSample = { cols, rows, time, data };
    return data;
  };
  const filters = createLatticeFilters(context, {
    sampleGrid,
    echoSlot: () => ({ cv: source }),
    time: () => time,
  });
  const palette = getHeroPalette();
  const dotInk = Array.from({ length: 32 }, () => palette.main);
  const gridPlate = { f: paletteRgb(palette.main), k: paletteRgb(palette.accent) };
  const mainGrade = paletteGrade(palette, 'main');
  const softPastelGrade = paletteGrade(palette, 'soft');
  const accentGrade = paletteGrade(palette, 'accent');
  return {
    draw(video: HTMLVideoElement, positions: Float32Array, width: number, height: number, seconds: number, fitProgress = 0, rotations = new Float32Array(positions.length / 4), drawPanelLabels?: (index: number) => void) {
      time = seconds * 1000;
      const boxes = Array.from({ length: positions.length / 4 }, (_, i) => {
        const [cx, cy, w, h] = positions.subarray(i * 4, i * 4 + 4);
        return { x: (cx - w / 2) * width, y: (1 - cy - h / 2) * height, w: w * width, h: h * height };
      });
      // Match the background's object-fit: cover and object-position: center top.
      // All panels share this mapping, so dragging reveals the video underneath.
      const videoRect = heroVideoRect(width, height, video.videoWidth, video.videoHeight, fitProgress);
      const capture = (box: typeof boxes[number]) => {
        sourceContext.fillStyle = '#000';
        sourceContext.fillRect(0, 0, source.width, source.height);
        sourceContext.drawImage(video, (box.x - videoRect.x) / videoRect.scale, (box.y - videoRect.y) / videoRect.scale,
          box.w / videoRect.scale, box.h / videoRect.scale, 0, 0, source.width, source.height);
      };
      filters.configure();
      filters.begin();
      boxes.forEach((box, i) => {
        if (box.w < 1 || box.h < 1) return;
        if (i !== 1) capture(box);
        context.save();
        const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
        context.translate(cx, cy);
        context.rotate(rotations[i]);
        context.translate(-cx, -cy);
        context.beginPath();
        context.rect(box.x, box.y, box.w, box.h);
        context.clip();
        if (i === 0) {
          filters.drawEchoGrade(0, box.x, box.y, box.w, box.h, mainGrade, 0.5);
        } else if (i === 1) {
          // S02's original Riso treatment is rendered in the WebGL layer below.
          context.clearRect(box.x, box.y, box.w, box.h);
        } else if (i === 2) {
          context.drawImage(source, box.x, box.y, box.w, box.h);
        } else if (i === 4) {
          filters.configure({ bloomFocus: 2, bloomRadius: 6 });
          filters.drawEchoGrade(0, box.x, box.y, box.w, box.h, softPastelGrade, 0.5);
          filters.configure({ bloomFocus: 2, bloomRadius: 6 });
        } else if (i === 5) {
          // High-key paper keeps the original circular halftone legible over dark footage.
          context.fillStyle = palette.paper;
          context.fillRect(box.x, box.y, box.w, box.h);
          const cell = box.w < 100 ? 6 : 8;
          const cols = Math.max(1, Math.round(box.w / cell));
          const rows = Math.max(1, Math.round(box.h / cell));
          const data = sampleGrid(0, source.width, source.height, cols, rows);
          // Dark source tones print larger ink dots, highlights retain bright paper.
          for (let pixel = 0; pixel < data.length; pixel += 4) {
            data[pixel] = 255 - data[pixel];
            data[pixel + 1] = 255 - data[pixel + 1];
            data[pixel + 2] = 255 - data[pixel + 2];
          }
          filters.configure({ floor: 0.05, exponent: 1.4, contrast: 1.1 });
          filters.stampIsectMarks(box.x, box.y, cols, rows, box.w / cols, box.h / rows, data, dotInk);
          filters.configure();
        } else if (i === 6) {
          // Draw glyphs only: the video stays visible between the letters.
          filters.configure({ overlay: true, cell: box.w < 100 ? 10 : 12,
            asciiInk: palette.accent, asciiWeight: 700, contrast: 1.15, stretch: 0.8 });
          filters.runFilter('ascii', gridPlate, box.x, box.y, box.w, box.h,
            0, source.width, source.height);
          filters.configure();
        } else if (i >= 7) {
          filters.drawEchoGrade(0, box.x, box.y, box.w, box.h,
            accentGrade, 0.5);
        } else {
          // Apply the two-colour plate at a slower sampling cadence.
          filters.configure({ annotations: false, stretch: 1 });
          drawingGrid = true;
          try {
            filters.runFilter('mosaic', gridPlate, box.x, box.y, box.w, box.h,
              0, source.width, source.height);
          } finally {
            drawingGrid = false;
          }
          filters.configure();
        }
        context.strokeStyle = 'rgba(255,255,255,0.7)';
        context.lineWidth = 1.75;
        context.strokeRect(box.x, box.y, box.w, box.h);
        context.restore();
        // Labels belong to this panel and are covered by later panels in the same pass.
        drawPanelLabels?.(i);
      });
    },
  };
}
