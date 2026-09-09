import { createLatticeFilters } from '@/vendor/lattice/filters.js';
import { heroVideoRect } from './hero-video-geometry';

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
  const sampleGrid = (_source: number, _width: number, _height: number, cols: number, rows: number) => {
    sample.width = cols;
    sample.height = rows;
    sampleContext.drawImage(source, 0, 0, cols, rows);
    return sampleContext.getImageData(0, 0, cols, rows).data;
  };
  const filters = createLatticeFilters(context, {
    sampleGrid,
    echoSlot: () => ({ cv: source }),
    time: () => time,
  });
  const gridPlate = { f: [32, 96, 255], k: [255, 142, 48] };
  const softPastelGrade = {
    stops: [
      [0, [92, 76, 156]],
      [0.35, [176, 155, 232]],
      [0.65, [246, 187, 217]],
      [0.85, [255, 225, 225]],
      [1, [255, 250, 232]],
    ] as [number, number[]][],
    w0: [194, 175, 255],
    w1: [255, 221, 201],
  };
  return {
    draw(video: HTMLVideoElement, positions: Float32Array, width: number, height: number, seconds: number, fitProgress = 0) {
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
        context.beginPath();
        context.rect(box.x, box.y, box.w, box.h);
        context.clip();
        if (i === 0) {
          filters.drawEchoGrade(0, box.x, box.y, box.w, box.h, filters.GRADES[0], 0.5);
        } else if (i === 1) {
          // S02's original Riso treatment is rendered in the WebGL layer below.
          context.clearRect(box.x, box.y, box.w, box.h);
        } else if (i === 2) {
          context.drawImage(source, box.x, box.y, box.w, box.h);
        } else if (i === 4) {
          filters.drawEchoGrade(0, box.x, box.y, box.w, box.h, softPastelGrade, 0.5);
        } else {
          // Map the live footage to blue shadows and orange highlights on a cell grid.
          filters.configure({ annotations: false, stretch: 1 });
          filters.runFilter('mosaic', gridPlate, box.x, box.y, box.w, box.h,
            0, source.width, source.height);
          filters.configure();
        }
        context.restore();
        context.strokeStyle = 'rgba(255,255,255,0.7)';
        context.lineWidth = 0.75;
        context.strokeRect(box.x, box.y, box.w, box.h);
      });
    },
  };
}
