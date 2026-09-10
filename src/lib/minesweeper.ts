export type Cell = { mine: boolean; adjacent: number; open: boolean; flagged: boolean };
export type Board = { cells: Cell[]; columns: number; rows: number; mines: number; status: "ready" | "playing" | "won" | "lost" };
export function emptyBoard(columns: number, rows: number): Board {
  return { columns, rows, mines: Math.floor(columns * rows * 0.14), status: "ready", cells: Array.from({ length: columns * rows }, () => ({ mine: false, adjacent: 0, open: false, flagged: false })) };
}
export function neighbors(index: number, columns: number, rows: number) {
  const result: number[] = [];
  for (let y = -1; y <= 1; y++) for (let x = -1; x <= 1; x++) {
    const col = index % columns + x, row = Math.floor(index / columns) + y;
    if ((x || y) && col >= 0 && col < columns && row >= 0 && row < rows) result.push(row * columns + col);
  }
  return result;
}
export function playCell(board: Board, index: number, flag = false): Board {
  if (board.status === "won" || board.status === "lost" || !board.cells[index] || board.cells[index].open) return board;
  const next = { ...board, cells: board.cells.map(cell => ({ ...cell })) };
  const cell = next.cells[index];
  if (flag) {
    if (cell.flagged || next.cells.filter(c => c.flagged).length < board.mines) cell.flagged = !cell.flagged;
    return next;
  }
  if (cell.flagged) return board;
  if (next.status === "ready") {
    const safe = new Set([index, ...neighbors(index, board.columns, board.rows)]);
    const candidates = next.cells.map((_, i) => i).filter(i => !safe.has(i));
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }
    for (const i of candidates.slice(0, board.mines)) next.cells[i].mine = true;
    next.cells.forEach((c, i) => { c.adjacent = neighbors(i, board.columns, board.rows).filter(n => next.cells[n].mine).length; });
    next.status = "playing";
  }
  if (cell.mine) {
    cell.open = true;
    next.status = "lost";
    return next;
  }
  const pending = [index];
  while (pending.length) {
    const i = pending.pop()!, current = next.cells[i];
    if (current.open || current.flagged || current.mine) continue;
    current.open = true;
    if (!current.adjacent) pending.push(...neighbors(i, board.columns, board.rows));
  }
  if (next.cells.every(c => c.mine || c.open)) next.status = "won";
  return next;
}
