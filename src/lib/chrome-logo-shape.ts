// Exact logo.svg paths, converted from SVG coordinates to scene coordinates.
export const logoTriangles = [
    [[0, 0], [300, 0], [0, 100]],
    [[600.001, 200], [299.998, 200], [599.998, 100]],
    [[300, 0], [600, 0], [300, 100]],
    [[299.997, 200], [0, 200], [300, 100]],
  ].map((vertices) => vertices.map(([x, y]) => [Math.min(600, x) / 10, 25 - y / 10]));
