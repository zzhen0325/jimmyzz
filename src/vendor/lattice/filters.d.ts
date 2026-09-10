import type { PASTEL_GRADES } from './palettes.js';
type Plate = { f: number[]; k: number[] };
export function createLatticeFilters(context: CanvasRenderingContext2D, deps: {
  sampleGrid: (source: number, width: number, height: number, cols: number, rows: number) => Uint8ClampedArray;
  echoSlot: (delay: number) => { cv: HTMLCanvasElement };
  time: () => number;
}): {
  GRADES: typeof PASTEL_GRADES;
  PLATES: Plate[];
  configure(options?: { overlay?: boolean; cell?: number; asciiInk?: string; asciiWeight?: number; bloomFocus?: number; bloomRadius?: number; annotations?: boolean; contrast?: number; stretch?: number; floor?: number; exponent?: number }): void;
  begin(): void;
  drawMosaicAnnotations(): void;
  runFilter(name: string, plate: Plate, x: number, y: number, width: number, height: number, source: number, sourceWidth: number, sourceHeight: number): void;
  drawEchoGrade(delay: number, x: number, y: number, width: number, height: number, grade: typeof PASTEL_GRADES[number], angle: number): void;
  stampIsectMarks(x: number, y: number, cols: number, rows: number, cellWidth: number, cellHeight: number, data: Uint8ClampedArray, lut: string[]): void;
  makeLUT(stops: [number, number[]][], count: number): string[];
  grain(x: number, y: number, width: number, height: number, alpha: number): void;
};
