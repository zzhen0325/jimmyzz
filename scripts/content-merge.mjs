import { isDeepStrictEqual as equal } from 'node:util';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const missing = Symbol('missing');

// Derived gallery covers are rebuilt after merging their source projects.
export function normalizeContent(content) {
  if (!object(content) || !Array.isArray(content.projects) || !Array.isArray(content.gallery) || !Array.isArray(content.selectedWork?.order)) {
    throw new Error('Invalid content document');
  }
  return { ...content, gallery: content.gallery.filter(item => !item.sourceProject).map(item => {
    const copy = { ...item }; delete copy.project; return copy;
  }) };
}

export function mergeContent(base, local, remote) {
  const conflicts = [];
  const conflict = (path, b, l, r) => {
    const entry = value => value === missing ? { deleted: true } : { value };
    conflicts.push({ path, base: entry(b), local: entry(l), remote: entry(r) });
    return l; // Never publish this candidate when conflicts exist.
  };
  const sequence = (b, l, r, ids, path) => {
    const surviving = new Set(ids);
    // Ordering edits and independently inserted records are merged as constraints.
    const common = b.filter(id => surviving.has(id) && l.includes(id) && r.includes(id));
    const localCore = l.filter(id => common.includes(id));
    const remoteCore = r.filter(id => common.includes(id));
    const lc = !equal(common, localCore), rc = !equal(common, remoteCore);
    if (lc && rc && !equal(localCore, remoteCore)) conflict(`${path}.$order`, b, l, r);
    const core = lc ? localCore : remoteCore;
    const edges = new Map(ids.map(id => [id, new Set()]));
    const edge = (a, z) => { if (a !== z) edges.get(a).add(z); };
    for (let i = 1; i < core.length; i++) edge(core[i - 1], core[i]);
    for (const list of [l, r]) {
      const filtered = list.filter(id => surviving.has(id));
      for (let i = 1; i < filtered.length; i++) {
        const a = filtered[i - 1], z = filtered[i];
        if (!common.includes(a) || !common.includes(z)) edge(a, z);
      }
    }
    const result = [], remaining = new Set(ids);
    while (remaining.size) {
      const next = ids.find(id => remaining.has(id) && ![...remaining].some(from => edges.get(from).has(id)));
      if (next === undefined) {
        conflict(`${path}.$order`, b, l, r);
        return ids;
      }
      remaining.delete(next); result.push(next);
    }
    return result;
  };
  const merge = (b, l, r, path) => {
    if (equal(l, r)) return l;
    if (equal(l, b)) return r;
    if (equal(r, b)) return l;
    if (l === missing || r === missing || b === missing) return conflict(path, b, l, r);
    if (object(b) && object(l) && object(r)) {
      const result = {};
      for (const key of new Set([...Object.keys(b), ...Object.keys(l), ...Object.keys(r)])) {
        const read = v => Object.hasOwn(v, key) ? v[key] : missing;
        const value = merge(read(b), read(l), read(r), `${path}.${key}`);
        if (value !== missing) Object.defineProperty(result, key, { value, enumerable: true, writable: true, configurable: true });
      }
      return result;
    }
    if (Array.isArray(b) && Array.isArray(l) && Array.isArray(r)) {
      const key = path === 'content.projects' ? 'slug' : path === 'content.gallery' || path.endsWith('.assets') ? 'name' : null;
      const strings = path === 'content.selectedWork.order' || path === 'content.selectedWork.compact';
      if (key || strings) {
        const id = v => strings ? v : v[key];
        for (const list of [b, l, r]) {
          if (list.some(v => typeof id(v) !== 'string') || new Set(list.map(id)).size !== list.length) throw new Error(`Invalid/duplicate IDs at ${path}`);
        }
        const maps = [b, l, r].map(list => new Map(list.map(v => [id(v), v])));
        const merged = new Map();
        for (const name of new Set([...b, ...l, ...r].map(id))) {
          const values = maps.map(map => map.has(name) ? map.get(name) : missing);
          const value = merge(...values, `${path}[${name}]`);
          if (value !== missing) merged.set(name, value);
        }
        return sequence(b.map(id), l.map(id), r.map(id), [...merged.keys()], path).map(name => merged.get(name));
      }
    }
    return conflict(path, b, l, r);
  };
  const content = merge(normalizeContent(base), normalizeContent(local), normalizeContent(remote), 'content');
  const projects = new Map(content.projects.map(project => [project.slug, project]));
  for (const [field, values] of Object.entries(content.selectedWork)) {
    if (Array.isArray(values)) for (const slug of values) if (!projects.has(slug)) conflicts.push({ path: `content.selectedWork.${field}`, reason: `References deleted project: ${slug}` });
  }
  for (const slug of Object.keys(content.sizes ?? {})) if (!projects.has(slug)) conflicts.push({ path: `content.sizes.${slug}`, reason: 'References deleted project' });
  const covers = [...content.selectedWork.order].reverse().flatMap(slug => {
    const p = projects.get(slug);
    return p?.selectedWorkCover ? [{ name: `cover-${slug}`, title: p.title, src: p.selectedWorkCover, width: p.coverWidth ?? 960, height: p.coverHeight ?? 540, sourceProject: slug }] : [];
  });
  content.gallery = [...covers, ...content.gallery];
  if (new Set(content.gallery.map(item => item.name)).size !== content.gallery.length) conflicts.push({ path: 'content.gallery', reason: 'Duplicate gallery names after rebuilding covers' });
  return { content, conflicts };
}
