import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeContent } from './content-merge.mjs';

const project = slug => ({ slug, title: slug, summary: 'original', selectedWorkCover: `/assets/${slug}.png`, assets: [] });
const base = () => ({ projects: ['a', 'b', 'c'].map(project), selectedWork: { order: ['a', 'b', 'c'], compact: [] }, sizes: {}, gallery: [] });
const copy = value => structuredClone(value);
function scenario(editLocal, editRemote) {
  const b = base(), l = copy(b), r = copy(b);
  editLocal(l); editRemote(r);
  return mergeContent(b, l, r);
}
test('different fields of the same project survive; covers are derived', () => {
  const result = scenario(l => { l.projects[0].title = 'local'; }, r => { r.projects[0].summary = 'remote'; });
  assert.equal(result.conflicts.length, 0);
  assert.equal(result.content.projects[0].title, 'local');
  assert.equal(result.content.projects[0].summary, 'remote');
  assert.equal(result.content.gallery.find(x => x.sourceProject === 'a').title, 'local');
});
test('same field conflict carries all three values', () => {
  const result = scenario(l => { l.projects[0].title = 'local'; }, r => { r.projects[0].title = 'remote'; });
  assert.equal(result.conflicts[0].path, 'content.projects[a].title');
  assert.equal(result.conflicts[0].base.value, 'a');
});
test('deleting a record conflicts with editing it', () => {
  const result = scenario(l => { l.projects.shift(); l.selectedWork.order.shift(); }, r => { r.projects[0].summary = 'remote'; });
  assert.ok(result.conflicts.some(x => x.path === 'content.projects[a]'));
});
test('independent additions and inserted positions survive', () => {
  const result = scenario(l => { l.projects.push(project('d')); l.selectedWork.order.splice(1, 0, 'd'); }, r => { r.projects.push(project('e')); r.selectedWork.order.push('e'); });
  assert.equal(result.conflicts.length, 0);
  assert.deepEqual(result.content.selectedWork.order, ['a', 'd', 'b', 'c', 'e']);
});
test('one side reorders while the other edits project fields', () => {
  const result = scenario(l => { l.selectedWork.order.reverse(); }, r => { r.projects[0].summary = 'remote'; });
  assert.equal(result.conflicts.length, 0);
  assert.deepEqual(result.content.selectedWork.order, ['c', 'b', 'a']);
});
test('incompatible reorder conflicts rather than choosing a side', () => {
  const result = scenario(l => { l.selectedWork.order = ['b', 'a', 'c']; }, r => { r.selectedWork.order = ['a', 'c', 'b']; });
  assert.ok(result.conflicts.some(x => x.path.endsWith('$order')));
});
test('different asset edits merge by name', () => {
  const b = base(); b.projects[0].assets = [{name:'one',src:'/assets/one.png'}, {name:'two',src:'/assets/two.png'}];
  const l = copy(b), r = copy(b); l.projects[0].assets[0].src = '/media/local.png'; r.projects[0].assets[1].src = '/media/remote.png';
  const result = mergeContent(b,l,r);
  assert.equal(result.conflicts.length, 0);
  assert.deepEqual(result.content.projects[0].assets.map(x=>x.src), ['/media/local.png','/media/remote.png']);
});
test('independent gallery additions survive without false cover conflicts', () => {
  const result = scenario(l => { l.projects[0].title='new'; l.gallery.push({name:'left',src:'/assets/l.png'}); }, r => { r.gallery.push({name:'right',src:'/assets/r.png'}); });
  assert.equal(result.conflicts.length, 0);
  assert.ok(result.content.gallery.some(x=>x.name==='left'));
  assert.ok(result.content.gallery.some(x=>x.name==='right'));
});
test('delete project versus new selected-work reference is rejected', () => {
  const b = base(); b.selectedWork.order = ['b','c'];
  const l = copy(b), r = copy(b); l.projects.shift(); r.selectedWork.order.unshift('a');
  assert.ok(mergeContent(b,l,r).conflicts.some(x=>x.reason?.includes('deleted project')));
});
test('local-only merge uses remote as next base and preserves unpublished edits', () => {
  const b=base(), l=copy(b), r=copy(b); l.projects[0].title='local'; r.projects[1].title='remote';
  const first=mergeContent(b,l,r); const second=mergeContent(r,first.content,r);
  assert.equal(second.conflicts.length,0); assert.equal(second.content.projects[0].title,'local');
});
test('equal values, field deletion, and atomic arrays behave predictably', () => {
  const b=base(); b.projects[0].optional='remove'; b.projects[0].tags=['a'];
  const l=copy(b), r=copy(b); delete l.projects[0].optional; r.projects[0].summary='new';
  const result=mergeContent(b,l,r); assert.equal(result.conflicts.length,0); assert.equal(Object.hasOwn(result.content.projects[0],'optional'),false);
  l.projects[0].tags=['left']; r.projects[0].tags=['right'];
  assert.ok(mergeContent(b,l,r).conflicts.some(x=>x.path.endsWith('.tags')));
});
test('inputs are not mutated', () => {
  const b=base(), snapshot=copy(b); mergeContent(b,b,b); assert.deepEqual(b,snapshot);
});
