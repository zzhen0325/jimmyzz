/** File sizes are captured from the deployed assets, so all downloads share a
 * known denominator even when the server omits Content-Length or compresses HTTP. */
export function createDownloadProgress(paths: string[], sizes: Record<string, number>, report: (percent: number) => void) {
  const key = (url: string) => url.split(/[?#]/, 1)[0];
  const expected = new Map([...new Set(paths.map(key))].map(path => [path, sizes[path] ?? 0]));
  const total = [...expected.values()].reduce((sum, size) => sum + size, 0);
  const known = [...expected.values()].every(size => size > 0);
  const received = new Map<string, number>();
  return {
    update(path: string, loaded: number) {
      const url = key(path);
      if (!expected.has(url) || !Number.isFinite(loaded)) return;
      // A retry replaces the same resource; never count retransmitted bytes twice.
      received.set(url, Math.max(received.get(url) ?? 0, Math.min(expected.get(url)!, Math.max(0, loaded))));
      if (known && total > 0) report(Math.min(99, Math.floor([...received.values()].reduce((sum, bytes) => sum + bytes, 0) / total * 100)));
    },
    complete(path: string) { this.update(path, expected.get(key(path)) ?? 0); },
  };
}
