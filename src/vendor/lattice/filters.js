import { PASTEL_GRADES } from "./palettes.js";
// Adapted from Ana Insomnia, https://www.anainsomnia.com/lattice (2026-09-09).
// One Canvas2D implementation shared by the live composition and atomic passes.
export function createLatticeFilters(sctx, deps) {
  let options = {};
  let CUR_OVERLAY = false;
  const sampleGrid = (...args) => deps.sampleGrid(...args);
  const echoSlot = (...args) => deps.echoSlot(...args);
  const animNow = () => deps.time();
  const ECHO_W = 512,
    ECHO_H = 384,
    CAN_FILTER = typeof sctx.filter === "string";
  const CASCADE_CYCLE = false,
    CC_LOAD_N = 0;
  const INK = {
    crimson: "#e864a8",
    cream: "#e8d5a3",
    graphite: "#3c3c3c",
    teal: "#22b6a0",
    bone: "#e6e1d6",
  };
  const PLATES = [
    { f: [242, 202, 212], k: [232, 100, 168] }, // blush pink / rose
    { f: [246, 224, 152], k: [214, 158, 74] }, // butter yellow / amber gold
    { f: [198, 214, 232], k: [148, 124, 40] }, // powder blue / olive gold
    { f: [184, 206, 176], k: [26, 40, 88] }, // sage / navy
    { f: [240, 234, 216], k: [255, 96, 190] }, // warm cream / hot pink
    { f: [222, 212, 236], k: [88, 88, 240] }, // lilac / ultramarine
    { f: [18, 22, 44], k: [242, 116, 188] }, // ink navy / hot pink (dark keeper)
    { f: [16, 58, 54], k: [126, 232, 186] }, // deep teal / mint (dark keeper)
  ];
  const mixC = (a, b, t) =>
    [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * t));
  const lumC = (c) => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
  const cssC = (c) => "rgb(" + c[0] + "," + c[1] + "," + c[2] + ")";
  const rgbaC = (c, a) =>
    "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")";
  function plateField(p) {
    return p.fieldCss || (p.fieldCss = cssC(p.f));
  }
  /* Per-plate LUTs, built lazily and cached on the plate. */
  function plateLut32(p) {
    return (
      p.lut32 ||
      (p.lut32 = makeLUT(
        [
          [0, p.f],
          [0.5, mixC(p.f, p.k, 0.55)],
          [0.85, p.k],
          [1, mixC(p.k, [255, 255, 255], 0.35)],
        ],
        32,
      ))
    );
  }
  function plateLut64(p) {
    return (
      p.lut64 ||
      (p.lut64 = makeLUT(
        [
          [0, mixC(p.f, [0, 0, 0], 0.25)],
          [0.55, mixC(p.f, p.k, 0.45)],
          [1, p.k],
        ],
        64,
      ))
    );
  }
  const GRADES = PASTEL_GRADES.map((grade) => ({ ...grade }));
  function lumAt(data, i) {
    return (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255;
  }
  /* Contrast lift applied to the sampled luminance before it drives a filter,
   so the filtered panels separate tones and read more detail than the raw
   (often flat) footage. A centred S-scale around mid grey. */
  let FILTER_CONTRAST = 1.4; // 1 = off; higher = more tonal separation
  function boostLum(l) {
    const v = 0.5 + (l - 0.5) * FILTER_CONTRAST;
    return v < 0 ? 0 : v > 1 ? 1 : v;
  }
  /* Per-grid auto-stretch: a flat, low-range frame (a near-uniform pastel clip)
   gives every cell almost the same luminance, so the filter reads as mush.
   Measuring the grid's own min/max (ignoring a few outlier percent so one
   hot speck does not eat the range) and remapping onto 0..1 pulls even a
   low-contrast frame across the full ramp, THEN the S-curve adds punch. When
   the frame already has range this is close to a no-op. Returns a mapper. */
  let FILTER_STRETCH = 0.45; // how far to pull toward full range (0 = off, 1 = full); gentle, so only flat frames get rescued
  function autoStretch(data, cols, rows) {
    const n = cols * rows;
    if (n < 4) return boostLum;
    // Histogram to find robust min/max (clip ~4% off each tail).
    const H = new Uint16Array(64);
    for (let i = 0; i < n; i++)
      H[Math.min(63, (lumAt(data, i * 4) * 64) | 0)]++;
    const clip = Math.max(1, (n * 0.04) | 0);
    let lo = 0,
      hi = 63,
      acc = 0;
    for (let b = 0; b < 64; b++) {
      acc += H[b];
      if (acc > clip) {
        lo = b;
        break;
      }
    }
    acc = 0;
    for (let b = 63; b >= 0; b--) {
      acc += H[b];
      if (acc > clip) {
        hi = b;
        break;
      }
    }
    const l0 = lo / 63,
      l1 = hi / 63,
      span = l1 - l0;
    if (span < 0.02) return boostLum; // truly flat: nothing to stretch, avoid blowing up noise
    const k = FILTER_STRETCH,
      inv = 1 / span;
    return (l) => {
      const stretched = l + ((l - l0) * inv - l) * k; // lerp raw -> normalised by FILTER_STRETCH
      return boostLum(stretched < 0 ? 0 : stretched > 1 ? 1 : stretched);
    };
  }
  const ASCII_RAMP = " .,:;=+*oxO#%@";
  /* Glyph thinning for ascii-on-ascii crossings: when set, the ascii pass
   drops a deterministic share of glyphs ({ keep, salt }). The hash lives on
   a shared CANVAS-SPACE 8px lattice (not the per-block cell grid), and the
   two sides of an overlap keep COMPLEMENTARY bands of it, so glyphs that
   would stack on top of each other are exactly the ones partitioned between
   the layers: the lattices interleave instead of piling into noise. Frame
   stable, no shimmer. */
  let ASCII_SPARSE = null;
  const ASCII_OVERLAP_KEEP = 0.55; // share of glyphs each side keeps inside an ascii/ascii overlap (tuning knob)
  function asciiSparseSkip(gx, gy) {
    if (!ASCII_SPARSE) return false;
    const wc = Math.floor(gx / 8),
      wr = Math.floor(gy / 8);
    let n = (wc * 374761393 + wr * 668265263) | 0;
    n = (n ^ (n >>> 13)) | 0;
    n = (n * 1274126177) | 0;
    n = (n ^ (n >>> 16)) >>> 0;
    const u = (n % 4096) / 4096;
    // side 2 (the panel) keeps the LOW band, side 1 (the filter) the HIGH band.
    return ASCII_SPARSE.salt === 2
      ? u > ASCII_SPARSE.keep
      : u < 1 - ASCII_SPARSE.keep;
  }
  /* Gradient LUT builder: dark cells sink into the plate's field, bright cells
   rise through its ink, so every filter renders in the inks of whichever
   plate it is on. Precomputed per plate (see plateLut32 and friends) so the
   per-cell cost is one array lookup. */
  function makeLUT(stops, N) {
    const out = [];
    for (let i = 0; i < N; i++) {
      const v = i / (N - 1);
      let k = 0;
      while (k < stops.length - 2 && v > stops[k + 1][0]) k++;
      const [v0, c0] = stops[k],
        [v1, c1] = stops[k + 1];
      const t = Math.max(0, Math.min(1, (v - v0) / (v1 - v0 || 1e-6)));
      out.push(
        "rgb(" +
          c0.map((a, j) => Math.round(a + (c1[j] - a) * t)).join(",") +
          ")",
      );
    }
    return out;
  }
  /* The plate the running filter should render in; set by runFilter. */
  let CUR_PLATE = PLATES[0];
  /* The ORIGINAL build's neon ramp, restored by request for the ascii filter
   (mosaic and the halftone plates stay plate-driven): dark cells in deep
   violet, rising through signal green and yellow into hot pink and near
   white. */
  /* Ascii inks: three pastel schemes assembled from the GRADES gradient stops
   (the gradient filters' palette). No green anywhere. All share the same
   quiet navy floor so dark cells sink; they differ in what carries the mids
   and highlights. One scheme is dealt per load, rotating with the load
   counter (so refreshes and shuffles walk dusk, solar, tangerine in turn);
   pure random when the counter is unavailable. Tuning knob: edit stops. */
  /* Each scheme keeps its raw `stops` so the panel can edit them live; `main`
   lists the three identity stops exposed as swatches (the floor and the near
   white burn stay fixed). The lut is (re)built from stops; `def` snapshots the
   originals for reset. */
  const ASCII_SCHEMES = [
    {
      name: "dusk",
      main: [1, 3, 4],
      stops: [
        // violet + dusty peach into pastel pink
        [0.0, [34, 38, 76]], // deep navy (bruise shadow)
        [0.28, [148, 108, 220]], // soft violet (acid meadow mid)
        [0.52, [188, 132, 140]], // dusty peach (bruise mid)
        [0.72, [244, 188, 172]], // peach cream (bruise)
        [0.86, [255, 196, 240]], // pastel pink (acid meadow)
        [1.0, [255, 250, 236]], // warm white (tangerine burn)
      ],
    },
    {
      name: "solar",
      main: [1, 2, 3],
      stops: [
        // cornflower into orange and warm sand
        [0.0, [34, 38, 76]], // deep navy (bruise shadow)
        [0.3, [66, 128, 252]], // cornflower blue (solar shadow)
        [0.58, [255, 138, 76]], // soft orange (solar mid)
        [0.8, [255, 214, 150]], // warm sand (solar)
        [1.0, [255, 246, 228]], // warm white (solar burn)
      ],
    },
    {
      name: "tangerine",
      main: [1, 2, 4],
      stops: [
        // royal blue into pink and cream
        [0.0, [34, 38, 76]], // deep navy (bruise shadow)
        [0.26, [40, 88, 204]], // royal blue (tangerine shadow)
        [0.55, [255, 100, 184]], // pink (tangerine mid)
        [0.78, [255, 196, 240]], // pastel pink (acid meadow)
        [0.9, [255, 224, 176]], // cream (tangerine)
        [1.0, [255, 250, 236]], // warm white (tangerine burn)
      ],
    },
  ];
  for (const s of ASCII_SCHEMES) {
    s.def = s.stops.map((st) => st[1].slice());
    s.lut = makeLUT(s.stops, 32);
  }
  let ASCII_ACTIVE = 0; // index of the live scheme (swatches follow it)
  let ASCII_INKS = ASCII_SCHEMES[0].lut;
  function dealAsciiInks() {
    const i = CASCADE_CYCLE
      ? ((CC_LOAD_N % ASCII_SCHEMES.length) + ASCII_SCHEMES.length) %
        ASCII_SCHEMES.length
      : (Math.random() * ASCII_SCHEMES.length) | 0;
    ASCII_ACTIVE = i;
    ASCII_INKS = ASCII_SCHEMES[i].lut;
  }
  /* Read/write the m-th main colour of the LIVE ascii scheme (panel swatches). */
  function asciiMainColour(m) {
    const s = ASCII_SCHEMES[ASCII_ACTIVE];
    return s.stops[s.main[m]][1];
  }
  function setAsciiMain(m, rgb) {
    const s = ASCII_SCHEMES[ASCII_ACTIVE];
    s.stops[s.main[m]][1] = rgb;
    s.lut = makeLUT(s.stops, 32);
    ASCII_INKS = s.lut; // active scheme is what the filter reads
  }
  dealAsciiInks();
  function filterAscii(px, py, pw, ph, srcIdx, tw, th) {
    const cell = options.cell || 8; // finer grid = denser glyphs
    const cols = Math.max(1, Math.round(pw / cell));
    const rows = Math.max(1, Math.round(ph / cell));
    const data = sampleGrid(srcIdx, tw, th, cols, rows);
    const cw = pw / cols,
      chh = ph / rows;
    const lut = ASCII_INKS; // the load's dealt pastel scheme (see ASCII_SCHEMES)
    const map = autoStretch(data, cols, rows);
    if (!CUR_OVERLAY) {
      sctx.fillStyle = "#040404";
      sctx.fillRect(px, py, pw, ph);
    }
    sctx.font = cell + 'px ui-monospace, "SF Mono", Menlo, monospace'; // glyph matches the cell: a touch bigger, still fits the dense grid
    sctx.textBaseline = "middle";
    sctx.textAlign = "center";
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const lum = map(lumAt(data, (r * cols + c) * 4));
        const g =
          ASCII_RAMP[
            Math.min(ASCII_RAMP.length - 1, Math.floor(lum * ASCII_RAMP.length))
          ];
        if (g === " ") continue;
        const gx = px + c * cw + cw / 2,
          gy = py + r * chh + chh / 2;
        if (asciiSparseSkip(gx, gy)) continue;
        sctx.fillStyle = lut[Math.min(31, (lum * 32) | 0)];
        sctx.fillText(g, gx, gy);
      }
    }
    sctx.textAlign = "left";
  }

  /* Mosaic: clean flat duotone blocks (plate field through to plate ink by
   luminance) with a faint hairline grid between cells. A few cells are
   annotated (hex marker + coordinate). No dither. */
  const MOSAIC_STROKE = "rgba(32,27,29,0.28)"; // faint hairline grid between mosaic cells: the bitmaps' warm near-black
  const MOSAIC_STROKE_W = 0.35; // stroke width, px (thin)
  /* Build the cell EDGES for one axis of a mosaic render: the span [lo,hi] is
   first split at the MAJOR cut lines (the block's own borders plus any
   intersecting block's borders that fall inside, passed in `cuts`), then each
   sub-span is subdivided into ~13px cells. So the grid is driven by the block
   corners AND the intersecting blocks: every block edge and intersection edge
   lands exactly on a mosaic line. */
  function buildMosaicEdges(lo, hi, cuts) {
    const majors = [lo, hi];
    if (cuts)
      for (const c of cuts) {
        if (c > lo + 0.5 && c < hi - 0.5) majors.push(c);
      }
    majors.sort((a, b) => a - b);
    const uniq = [majors[0]];
    for (let i = 1; i < majors.length; i++)
      if (majors[i] - uniq[uniq.length - 1] > 0.5) uniq.push(majors[i]);
    const edges = [uniq[0]];
    for (let i = 0; i < uniq.length - 1; i++) {
      const a = uniq[i],
        b = uniq[i + 1],
        span = b - a,
        n = Math.max(1, Math.round(span / (options.cell || 13)));
      for (let k = 1; k <= n; k++) edges.push(a + (span * k) / n);
    }
    return edges;
  }
  /* Cut lines currently in effect: the borders of the blocks intersecting the
   one being rendered, so its mosaic grid is driven by the intersections too.
   Set around a mosaic render, cleared after. */
  let CUR_MOSAIC_CUTS_X = null,
    CUR_MOSAIC_CUTS_Y = null;
  let CUR_MOSAIC_FLAT = false; // a mosaic x ascii crossing renders the mosaic FLAT (opaque cells), per the mix rule
  function filterMosaic(px, py, pw, ph, srcIdx, tw, th) {
    // Cell edges driven by the block's own borders AND any intersecting block's
    // borders (CUR_MOSAIC_CUTS), each major span subdivided into ~13px cells.
    const xEdges = buildMosaicEdges(px, px + pw, CUR_MOSAIC_CUTS_X);
    const yEdges = buildMosaicEdges(py, py + ph, CUR_MOSAIC_CUTS_Y);
    const cols = xEdges.length - 1,
      rows = yEdges.length - 1;
    // Sample the footage over the render rect at ~13px resolution; each
    // (possibly non-uniform) cell reads the sample at its own centre.
    const sCols = Math.max(1, Math.round(pw / (options.cell || 13))),
      sRows = Math.max(1, Math.round(ph / (options.cell || 13)));
    const data = sampleGrid(srcIdx, tw, th, sCols, sRows);
    const map = autoStretch(data, sCols, sRows);
    const lut = plateLut64(CUR_PLATE);
    const rawLumAt = (cx, cy) => {
      let fx = (cx - px) / pw;
      fx = fx < 0 ? 0 : fx > 0.999999 ? 0.999999 : fx;
      let fy = (cy - py) / ph;
      fy = fy < 0 ? 0 : fy > 0.999999 ? 0.999999 : fy;
      return lumAt(data, (((fy * sRows) | 0) * sCols + ((fx * sCols) | 0)) * 4);
    };
    const cellCX = (c) => (xEdges[c] + xEdges[c + 1]) / 2,
      cellCY = (r) => (yEdges[r] + yEdges[r + 1]) / 2;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const lum = map(rawLumAt(cellCX(c), cellCY(r)));
        if (CUR_OVERLAY && !CUR_MOSAIC_FLAT) {
          // As an overlay the cells carry their OWN opacity, ramped by luminance,
          // so the mosaic reads with depth over the footage rather than flat.
          sctx.globalAlpha = 0.2 + 0.75 * lum * lum;
        }
        const x0 = xEdges[c],
          y0 = yEdges[r];
        sctx.fillStyle = lut[Math.min(63, (lum * 64) | 0)];
        sctx.fillRect(
          x0,
          y0,
          xEdges[c + 1] - x0 + 0.7,
          yEdges[r + 1] - y0 + 0.7,
        );
      }
    }
    if (CUR_OVERLAY) sctx.globalAlpha = 1;
    // The grid: one line at every cell edge (which includes every block and
    // intersection border), drawn as a single pass over the fills.
    sctx.strokeStyle = MOSAIC_STROKE;
    sctx.lineWidth = MOSAIC_STROKE_W;
    sctx.beginPath();
    for (const x of xEdges) {
      sctx.moveTo(x, py);
      sctx.lineTo(x, py + ph);
    }
    for (const y of yEdges) {
      sctx.moveTo(px, y);
      sctx.lineTo(px + pw, y);
    }
    sctx.stroke();

    // A few annotations that follow the footage silhouette (strongest luminance
    // edges), well spaced. Each marked cell is drawn as a hexagon (the only hexes
    // in the mosaic) and tethered to a coordinate label. Connectors are drawn
    // first so the boxes sit cleanly on top of the lines.
    const lumOf = (c, r) => rawLumAt(cellCX(c), cellCY(r));
    const cand = [];
    for (let r = 1; r < rows - 1; r++) {
      for (let c = 1; c < cols - 1; c++) {
        const grad =
          Math.abs(lumOf(c + 1, r) - lumOf(c - 1, r)) +
          Math.abs(lumOf(c, r + 1) - lumOf(c, r - 1));
        if (grad > 0.32) cand.push({ c, r, grad });
      }
    }
    cand.sort((a, b) => b.grad - a.grad);
    // Spacing so markers are always at least a couple of cells apart.
    const minSep = Math.max(6, Math.round(Math.min(cols, rows) / 3));
    const kept = [];
    for (const cd of cand) {
      if (kept.length >= 3) break; // calmer: at most three markers
      if (
        kept.every(
          (k) =>
            Math.abs(k.c - cd.c) >= 2 &&
            Math.abs(k.r - cd.r) >= 2 &&
            Math.abs(k.c - cd.c) + Math.abs(k.r - cd.r) >= minSep,
        )
      )
        kept.push(cd);
    }
    const hexR = Math.min(xEdges[1] - xEdges[0], yEdges[1] - yEdges[0]) * 0.5; // fits inside a mosaic cell
    const anns = kept.map((k) => ({
      k,
      hx: cellCX(k.c),
      hy: cellCY(k.r),
    }));
    sctx.font = '7px ui-monospace, "SF Mono", Menlo, monospace';
    const boxes = anns.map((a) => {
      const label =
        String(a.k.c).padStart(2, "0") + "," + String(a.k.r).padStart(2, "0");
      const padX = 3,
        bh = 10,
        MARG = 6,
        LEN = 12;
      const bw = sctx.measureText(label).width + padX * 2;
      let bx = a.hx + LEN,
        by = a.hy - bh - LEN;
      if (bx + bw > px + pw - MARG) bx = a.hx - LEN - bw;
      if (bx < px + MARG) bx = px + MARG;
      if (by < py + MARG) by = a.hy + LEN;
      if (by + bh > py + ph - MARG) by = py + ph - MARG - bh;
      return { hx: a.hx, hy: a.hy, hexR, label, bx, by, bw, bh };
    });
    // Defer the hex markers + labels to a pass over the WHOLE block, drawn AFTER
    // the intersections, so they are never cropped by an intersection clip. Only
    // the block-body render contributes (ANN_PASS): the dissolve old layers,
    // lens redraws and satellite tiles all run this filter too, and their
    // duplicate pushes doubled the hexes.
    if (ANN_PASS && options.annotations !== false)
      for (const bo of boxes) MOSAIC_ANNS.push(bo);
    sctx.textAlign = "left";
    sctx.textBaseline = "top";
  }
  /* Draw the collected mosaic hex markers + coordinate labels on top of
   everything (after all intersections), so they read whole and uncropped. */
  let MOSAIC_ANNS = [];
  let ANN_PASS = false; // true only during the block-body render pass
  function drawMosaicAnnotations() {
    if (!MOSAIC_ANNS.length) return;
    sctx.save();
    sctx.font = '7px ui-monospace, "SF Mono", Menlo, monospace';
    // Connectors first (white), so the boxes and hexes sit on top.
    for (const bo of MOSAIC_ANNS) {
      const bcx = bo.bx + (bo.bx + bo.bw / 2 < bo.hx ? bo.bw : 0);
      sctx.strokeStyle = "rgba(230,225,214,0.9)";
      sctx.lineWidth = 0.6;
      sctx.beginPath();
      sctx.moveTo(bo.hx, bo.hy);
      sctx.lineTo(bcx, bo.by + bo.bh / 2);
      sctx.stroke();
    }
    for (const bo of MOSAIC_ANNS) {
      // Bone hexagon marker (neutral on any plate).
      sctx.strokeStyle = INK.bone;
      sctx.lineWidth = 1;
      sctx.beginPath();
      for (let k = 0; k < 6; k++) {
        const ang = (Math.PI / 180) * (60 * k - 90); // pointy top
        const vx = bo.hx + bo.hexR * Math.cos(ang),
          vy = bo.hy + bo.hexR * Math.sin(ang);
        if (k === 0) sctx.moveTo(vx, vy);
        else sctx.lineTo(vx, vy);
      }
      sctx.closePath();
      sctx.stroke();
      // Label box: bone outline, near-black fill, light text.
      sctx.fillStyle = "rgba(10,10,10,0.75)";
      sctx.fillRect(bo.bx, bo.by, bo.bw, bo.bh);
      sctx.strokeStyle = "rgba(230,225,214,0.9)";
      sctx.lineWidth = 0.6;
      sctx.strokeRect(bo.bx + 0.5, bo.by + 0.5, bo.bw - 1, bo.bh - 1);
      sctx.fillStyle = "#ddd8cc";
      sctx.textAlign = "center";
      sctx.textBaseline = "middle";
      sctx.fillText(bo.label, bo.bx + bo.bw / 2, bo.by + bo.bh / 2 + 0.5);
    }
    sctx.restore();
  }

  /* Isolines: marching squares on the video luminance, the browser take on
   Cavalry isolines. Trace a few thresholds into vector contours, stroke them
   thin, drop small squares along the line, and promote the four silhouette
   extremes to labelled coordinate markers (the wing tips, on a butterfly). */
  const MS_TABLE = [
    [],
    [[2, 3]],
    [[1, 2]],
    [[1, 3]],
    [[0, 1]],
    [
      [0, 1],
      [2, 3],
    ],
    [[0, 2]],
    [[0, 3]],
    [[0, 3]],
    [[0, 2]],
    [
      [0, 3],
      [1, 2],
    ],
    [[0, 1]],
    [[1, 3]],
    [[1, 2]],
    [[2, 3]],
    [],
  ];
  /* Editable isolines contour colours (panel swatches write .rgb; alpha holds).
   ISO_DEFAULTS keeps the originals so reset can restore them. */
  const ISO_COLOURS = [
    { rgb: [111, 155, 255], a: 0.55 },
    { rgb: [42, 212, 99], a: 0.7 },
    { rgb: [255, 214, 10], a: 0.8 },
  ];
  const ISO_DEFAULTS = ISO_COLOURS.map((c) => c.rgb.slice());
  function filterIsolines(px, py, pw, ph, srcIdx, tw, th) {
    const cell = options.cell || 11;
    const cols = Math.max(4, Math.round(pw / cell));
    const rows = Math.max(4, Math.round(ph / cell));
    const data = sampleGrid(srcIdx, tw, th, cols, rows);
    const L = new Float32Array(cols * rows);
    const map = autoStretch(data, cols, rows);
    for (let i = 0; i < cols * rows; i++) L[i] = map(lumAt(data, i * 4));
    const sx = pw / (cols - 1),
      sy = ph / (rows - 1);
    const gx = (c) => px + c * sx,
      gy = (r) => py + r * sy;
    const val = (c, r) => L[r * cols + c];
    const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
    if (!CUR_OVERLAY) {
      sctx.fillStyle = "#050505";
      sctx.fillRect(px, py, pw, ph);
    }

    const marks = []; // contour points, for the scattered squares
    const segsMid = []; // mid-threshold segments, for the pulse
    const thresholds = options.thresholds || [0.32, 0.5, 0.68];
    // Contour colours, editable from the panel (ISO_COLOURS). Alpha is fixed
    // per contour; the swatch drives only the rgb.
    const isoColours = ISO_COLOURS.map(
      (c) =>
        "rgba(" + c.rgb[0] + "," + c.rgb[1] + "," + c.rgb[2] + "," + c.a + ")",
    );
    sctx.lineWidth = options.lineWidth || 0.7;
    for (let ti = 0; ti < thresholds.length; ti++) {
      const t = thresholds[ti];
      sctx.strokeStyle = isoColours[ti];
      sctx.beginPath();
      for (let r = 0; r < rows - 1; r++) {
        for (let c = 0; c < cols - 1; c++) {
          const a = val(c, r),
            b = val(c + 1, r),
            e = val(c + 1, r + 1),
            d = val(c, r + 1);
          const cse =
            (a > t ? 8 : 0) |
            (b > t ? 4 : 0) |
            (e > t ? 2 : 0) |
            (d > t ? 1 : 0);
          if (cse === 0 || cse === 15) continue;
          const edge = (k) => {
            if (k === 0)
              return [gx(c + clamp01((t - a) / (b - a || 1e-6))), gy(r)];
            if (k === 1)
              return [gx(c + 1), gy(r + clamp01((t - b) / (e - b || 1e-6)))];
            if (k === 2)
              return [gx(c + clamp01((t - d) / (e - d || 1e-6))), gy(r + 1)];
            return [gx(c), gy(r + clamp01((t - a) / (d - a || 1e-6)))];
          };
          for (const [k0, k1] of MS_TABLE[cse]) {
            const p0 = edge(k0),
              p1 = edge(k1);
            sctx.moveTo(p0[0], p0[1]);
            sctx.lineTo(p1[0], p1[1]);
            if (ti === 1) {
              marks.push(p0);
              segsMid.push([p0, p1]);
            }
          }
        }
      }
      sctx.stroke();
    }

    // Domino pulse: a ring expands from the silhouette centre outward. Contour
    // segments the ring is currently passing get a brighter, thicker highlight;
    // the highlight thins and fades as the ring nears the frame edge, so the
    // pulse dies out at the borders. Loops on a slow clock.
    if (segsMid.length && options.pulse !== false) {
      let ccx = 0,
        ccy = 0;
      for (const [p0] of segsMid) {
        ccx += p0[0];
        ccy += p0[1];
      }
      ccx /= segsMid.length;
      ccy /= segsMid.length;
      const maxRad = Math.max(
        Math.hypot(px - ccx, py - ccy),
        Math.hypot(px + pw - ccx, py - ccy),
        Math.hypot(px - ccx, py + ph - ccy),
        Math.hypot(px + pw - ccx, py + ph - ccy),
      );
      const PULSE_MS = 2600,
        BAND = maxRad * 0.16;
      const phase = (animNow() % PULSE_MS) / PULSE_MS;
      const ring = phase * maxRad;
      sctx.save();
      sctx.lineCap = "round";
      // Travelling gradient palette for the pulse: lime into yellow into a pale
      // mint (the original build's cycle).
      const PULSE_COLS = [
        [198, 240, 74],
        [255, 214, 10],
        [160, 255, 180],
      ];
      const mixCol = (u) => {
        const f = (((u % 1) + 1) % 1) * PULSE_COLS.length;
        const i = Math.floor(f),
          t2 = f - i;
        const a = PULSE_COLS[i % PULSE_COLS.length],
          b2 = PULSE_COLS[(i + 1) % PULSE_COLS.length];
        return (
          "rgb(" +
          a.map((q, j) => Math.round(q + (b2[j] - q) * t2)).join(",") +
          ")"
        );
      };
      for (const [p0, p1] of segsMid) {
        const mx = (p0[0] + p1[0]) / 2,
          my = (p0[1] + p1[1]) / 2;
        const dr = Math.abs(Math.hypot(mx - ccx, my - ccy) - ring);
        if (dr > BAND) continue;
        const near = 1 - dr / BAND; // 1 at the ring centre, 0 at band edge
        const edgeFade = 1 - Math.min(1, ring / maxRad); // dies toward the frame edge
        const a = near * edgeFade;
        if (a <= 0.02) continue;
        // Colour travels: hue offset by the segment's angle plus the phase, so
        // one colour flows into the next around and along the pulse.
        const ang = Math.atan2(my - ccy, mx - ccx) / (Math.PI * 2);
        sctx.strokeStyle = mixCol(ang + phase);
        sctx.globalAlpha = a * 0.9;
        sctx.lineWidth = 0.6 + 2.2 * near * edgeFade; // thicker at the front, thinner outward
        sctx.beginPath();
        sctx.moveTo(p0[0], p0[1]);
        sctx.lineTo(p1[0], p1[1]);
        sctx.stroke();
      }
      sctx.restore();
      sctx.globalAlpha = 1;
    }

    // Small squares scattered along the mid contour.
    sctx.fillStyle = "#ff4fd8";
    for (let i = 0; options.annotations !== false && i < marks.length; i += 7) {
      sctx.fillRect(marks[i][0] - 1.5, marks[i][1] - 1.5, 3, 3);
    }

    // The four silhouette extremes become labelled coordinate markers.
    if (marks.length > 3 && options.annotations !== false) {
      let L0 = marks[0],
        R0 = marks[0],
        T0 = marks[0],
        B0 = marks[0];
      for (const p of marks) {
        if (p[0] < L0[0]) L0 = p;
        if (p[0] > R0[0]) R0 = p;
        if (p[1] < T0[1]) T0 = p;
        if (p[1] > B0[1]) B0 = p;
      }
      const names = ["P1", "P2", "P3", "P4"];
      [T0, R0, B0, L0].forEach((p, i) => {
        sctx.fillStyle = "#ff4fd8";
        sctx.fillRect(p[0] - 2.5, p[1] - 2.5, 5, 5);
        const nx = Math.round(((p[0] - px) / pw) * 99),
          ny = Math.round(((p[1] - py) / ph) * 99);
        const label =
          names[i] +
          " " +
          String(nx).padStart(2, "0") +
          "," +
          String(ny).padStart(2, "0");
        sctx.font = '7px ui-monospace, "SF Mono", Menlo, monospace';
        const bw = sctx.measureText(label).width + 6;
        let bx = p[0] + 5,
          by = p[1] - 12;
        if (bx + bw > px + pw) bx = p[0] - 5 - bw;
        if (by < py) by = p[1] + 5;
        sctx.fillStyle = "#000";
        sctx.fillRect(bx, by, bw, 11);
        sctx.textBaseline = "middle";
        sctx.textAlign = "left";
        sctx.fillStyle = "#9a9a9a";
        sctx.fillText(label, bx + 3, by + 6);
        sctx.fillStyle = "#ff4fd8";
        sctx.fillText(names[i], bx + 3, by + 6);
      });
      sctx.textBaseline = "top";
    }
  }

  function runFilter(name, plate, px, py, pw, ph, srcIdx, tw, th) {
    CUR_PLATE = plate || PLATES[0];
    if (name === "ascii") filterAscii(px, py, pw, ph, srcIdx, tw, th);
    else if (name === "mosaic") filterMosaic(px, py, pw, ph, srcIdx, tw, th);
    else filterIsolines(px, py, pw, ph, srcIdx, tw, th);
  }
  function gradeLine(px, py, pw, ph, ang) {
    const cx = px + pw / 2,
      cy = py + ph / 2;
    const dx = Math.cos(ang),
      dy = Math.sin(ang);
    const L = (Math.abs(dx) * pw + Math.abs(dy) * ph) / 2;
    return [cx - dx * L, cy - dy * L, cx + dx * L, cy + dy * L];
  }
  /* Grade buffer: the delayed frame is gradient-mapped at echo resolution
   through the grade's ramp, then drawn up to the panel through a soft blur,
   so the panel reads as a burnt, out-of-focus pastel print of the footage. */
  const GRADE_BLUR = 6; // base soft focus, px
  const GRADE_BLOOM = 18; // burn bloom blur, px
  const GRADE_BURN_CONTRAST = 2.1; // bloom contrast: higher = brights blow out harder
  const GRADE_BURN_A = 0.74; // bloom screen strength
  const GRAIN_A = 0.34; // grain overlay strength
  const gradeBuf = document.createElement("canvas");
  // The grade is gradient-mapped, blurred and grained, so it carries no fine
  // detail: render it at a fixed low resolution, independent of the (larger)
  // echo capture size. This keeps the per-frame getImageData readback (the
  // GPU->CPU sync that stalls the pipeline), the ramp loop, and the blur
  // surfaces small, with no visible change. Raw panels still draw the full-res
  // echo slot, so sharp footage stays sharp.
  const GRADE_W = 160,
    GRADE_H = 120;
  gradeBuf.width = GRADE_W;
  gradeBuf.height = GRADE_H;
  const gradeCtx = gradeBuf.getContext("2d", { willReadFrequently: true });
  // Cache a full backing-store noise field instead of repeating an 80px tile.
  // Hash coordinates independently so resizing preserves the overlapping area.
  const grainField = document.createElement("canvas");
  function prepareGrain() {
    const { width, height } = sctx.canvas;
    if (
      grainField.width === width &&
      grainField.height === height &&
      grainReady
    )
      return;
    grainField.width = width;
    grainField.height = height;
    const gx = grainField.getContext("2d");
    const img = gx.createImageData(width, height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let seed = Math.imul(x + 17, 374761393) ^ Math.imul(y + 41, 668265263);
        seed = Math.imul(seed ^ (seed >>> 16), 0x7feb352d);
        seed = Math.imul(seed ^ (seed >>> 15), 0x846ca68b);
        seed ^= seed >>> 16;
        // Average four subpixel samples to retain the fine, soft grain of
        // the original half-pixel texture without resampling a repeated tile.
        const v =
          ((seed & 255) +
            ((seed >>> 8) & 255) +
            ((seed >>> 16) & 255) +
            (seed >>> 24)) /
          4;
        const i = (y * width + x) * 4;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
        img.data[i + 3] = 255;
      }
    }
    gx.putImageData(img, 0, 0);
    grainReady = true;
  }
  let grainReady = false;
  /* 256-step RGB ramp for a grade, built lazily and cached on it. */
  function gradeRamp(g) {
    if (g.ramp) return g.ramp;
    const ramp = new Uint8ClampedArray(256 * 3);
    const stops = g.stops;
    for (let i = 0; i < 256; i++) {
      const v = i / 255;
      let k = 0;
      while (k < stops.length - 2 && v > stops[k + 1][0]) k++;
      const [v0, c0] = stops[k],
        [v1, c1] = stops[k + 1];
      const t = Math.max(0, Math.min(1, (v - v0) / (v1 - v0 || 1e-6)));
      ramp[i * 3] = c0[0] + (c1[0] - c0[0]) * t;
      ramp[i * 3 + 1] = c0[1] + (c1[1] - c0[1]) * t;
      ramp[i * 3 + 2] = c0[2] + (c1[2] - c0[2]) * t;
    }
    return (g.ramp = ramp);
  }
  const blurBuf = document.createElement("canvas");
  blurBuf.width = GRADE_W;
  blurBuf.height = GRADE_H;
  const blurCtx = blurBuf.getContext("2d");
  function mapFrame(source, target, g) {
    const ctx = target.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(source, 0, 0, target.width, target.height);
    const img = ctx.getImageData(0, 0, target.width, target.height),
      ramp = gradeRamp(g);
    for (let i = 0; i < img.data.length; i += 4) {
      const d = img.data,
        j = ((77 * d[i] + 150 * d[i + 1] + 29 * d[i + 2]) >> 8) * 3;
      d[i] = ramp[j];
      d[i + 1] = ramp[j + 1];
      d[i + 2] = ramp[j + 2];
    }
    ctx.putImageData(img, 0, 0);
  }
  function softBloom(
    source,
    target,
    focus = 6,
    radius = 18,
    contrast = 2.1,
    strength = 0.74,
    scale = 1,
  ) {
    const ctx = target.getContext("2d");
    ctx.save();
    ctx.clearRect(0, 0, target.width, target.height);
    ctx.filter = "blur(" + focus * scale + "px)";
    ctx.drawImage(source, 0, 0, target.width, target.height);
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = strength;
    ctx.filter = "blur(" + radius * scale + "px) contrast(" + contrast + ")";
    ctx.drawImage(source, 0, 0, target.width, target.height);
    ctx.restore();
  }
  function colourLeak(x, y, w, h, g, ang = 0.5, strength = 1) {
    const [x0, y0, x1, y1] = gradeLine(x, y, w, h, ang);
    sctx.save();
    sctx.globalCompositeOperation = "screen";
    const lg = sctx.createLinearGradient(x0, y0, x1, y1);
    lg.addColorStop(0, rgbaC(g.w0, 0.4 * strength));
    lg.addColorStop(0.55, rgbaC(g.w0, 0));
    lg.addColorStop(1, rgbaC(g.w1, 0.34 * strength));
    sctx.fillStyle = lg;
    sctx.fillRect(x, y, w, h);
    sctx.restore();
  }
  function drawEchoGrade(delay, px, py, pw, ph, g, ang, reg) {
    g = g || GRADES[0];
    const slot = echoSlot(delay);
    // Crop before the shared map; the source itself remains live.
    const crop = blurBuf;
    const cx = crop.getContext("2d");
    if (reg)
      cx.drawImage(
        slot.cv,
        reg.u0 * ECHO_W,
        reg.v0 * ECHO_H,
        (reg.u1 - reg.u0) * ECHO_W,
        (reg.v1 - reg.v0) * ECHO_H,
        0,
        0,
        160,
        120,
      );
    else cx.drawImage(slot.cv, 0, 0, 160, 120);
    mapFrame(crop, gradeBuf, g);
    softBloom(gradeBuf, blurBuf, options.bloomFocus ?? 6, options.bloomRadius ?? 18, 2.1, 0.74, GRADE_W / pw);
    sctx.drawImage(blurBuf, 0, 0, 160, 120, px - 8, py - 8, pw + 16, ph + 16);
    colourLeak(px, py, pw, ph, g, ang || 0.5);
    grain(px, py, pw, ph, 0.34);
  }
  function grain(x, y, w, h, alpha = 0.34) {
    sctx.save();
    sctx.globalCompositeOperation = "overlay";
    sctx.globalAlpha = alpha;
    prepareGrain();
    sctx.beginPath();
    sctx.rect(x, y, w, h);
    sctx.clip();
    // Work in device pixels: fractional panel movement and DPR must not
    // stretch the grain or reveal seams between adjacent scene rectangles.
    sctx.setTransform(1, 0, 0, 1, 0, 0);
    sctx.drawImage(grainField, 0, 0);
    sctx.restore();
  }

  function stampIsectMarks(x0, y0, cols, rows, cw, chh, data, lut) {
    const maxR = Math.min(cw, chh) * 0.5; // exactly half the cell: full dots just kiss their neighbours
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const lum = boostLum(lumAt(data, (r * cols + c) * 4));
        if (lum < (options.floor ?? 0.2)) continue; // faint tones print nothing
        // Remap luminance above the floor to 0..1 so dots shrink to zero at
        // the threshold rather than snapping off at a fixed size.
        const g = (lum - (options.floor ?? 0.2)) / (1 - (options.floor ?? 0.2));
        const rad = maxR * Math.pow(g, options.exponent ?? 1.6);
        if (rad < 0.4) continue;
        const cx = x0 + c * cw + cw / 2,
          cy = y0 + r * chh + chh / 2;
        const col = lut[Math.min(31, (lum * 32) | 0)];
        const seed = (c * 73 + r * 151) & 3;
        sctx.strokeStyle = col;
        sctx.fillStyle = col;
        sctx.lineWidth = Math.max(0.6, rad * 0.18);
        if (g > 0.72) {
          // bright: solid dot
          sctx.beginPath();
          sctx.arc(cx, cy, rad, 0, 7);
          sctx.fill();
        } else {
          // else: an outer ring, with an inner element by value + seed,
          // a filled centre dot (brighter) or a concentric inner ring.
          sctx.beginPath();
          sctx.arc(cx, cy, rad, 0, 7);
          sctx.stroke();
          if (rad > 2.4) {
            if (g > 0.5 || seed === 0) {
              sctx.beginPath();
              sctx.arc(cx, cy, rad * 0.36, 0, 7);
              sctx.fill();
            } else if (seed !== 2) {
              sctx.beginPath();
              sctx.arc(cx, cy, rad * 0.58, 0, 7);
              sctx.stroke();
            }
          }
        }
      }
    }
  }

  return {
    INK,
    PLATES,
    GRADES,
    ASCII_RAMP,
    ISO_COLOURS,
    ISO_DEFAULTS,
    ASCII_SCHEMES,
    lumAt,
    boostLum,
    autoStretch,
    makeLUT,
    plateLut32,
    plateLut64,
    mixC,
    lumC,
    cssC,
    rgbaC,
    plateField,
    gradeLine,
    gradeRamp,
    asciiMainColour,
    setAsciiMain,
    setScheme(i) {
      ASCII_ACTIVE = i % ASCII_SCHEMES.length;
      ASCII_INKS = ASCII_SCHEMES[ASCII_ACTIVE].lut;
    },
    configure(next = {}) {
      options = next;
      CUR_OVERLAY = !!next.overlay;
      CUR_MOSAIC_CUTS_X = next.cutsX || null;
      CUR_MOSAIC_CUTS_Y = next.cutsY || null;
      CUR_MOSAIC_FLAT = !!next.flat;
      ASCII_SPARSE = next.sparse || null;
      ANN_PASS = next.annotations !== false;
      FILTER_CONTRAST = next.contrast ?? 1.4;
      FILTER_STRETCH = next.stretch ?? 0.45;
    },
    begin() {
      MOSAIC_ANNS = [];
    },
    runFilter,
    drawMosaicAnnotations,
    drawEchoGrade,
    stampIsectMarks,
    mapFrame,
    softBloom,
    colourLeak,
    grain,
  };
}
