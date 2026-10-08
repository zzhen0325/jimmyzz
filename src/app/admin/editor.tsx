'use client';
/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from 'react';
import { categories, type Project } from '@/lib/projects-config';
import type { Content } from '@/lib/content';
import './admin.css';
const video = (src: string) => /\.(mp4|webm|mov)$/i.test(src);
function Preview({ src }: { src: string }) { return src ? video(src) ? <video src={src} muted controls preload="metadata" /> : <img src={src} alt="素材预览" loading="lazy" /> : <span className="placeholder">上传一张封面，开始你的新项目</span>; }
function move<T>(items: T[], from: number, to: number): T[] { const copy = [...items]; if (to < 0 || to >= copy.length) return copy; const [item] = copy.splice(from, 1); copy.splice(to, 0, item); return copy; }
function Sort({ index, count, onMove, onRemove }: { index: number; count: number; onMove: (to: number) => void; onRemove?: () => void }) { return <div className="sort"><button type="button" aria-label="上移" disabled={index === 0} onClick={() => onMove(index - 1)}>↑</button><button type="button" aria-label="下移" disabled={index === count - 1} onClick={() => onMove(index + 1)}>↓</button>{onRemove && <button type="button" className="danger" onClick={onRemove}>移除</button>}</div>; }
async function upload(file: File) {
  if (file.size > 30 * 1024 * 1024) throw new Error(`${file.name} 超过 30MB`);
  const url = URL.createObjectURL(file);
  let width = 960, height = 540;
  try { await new Promise<void>((resolve, reject) => {
    if (file.type.startsWith('video/')) { const el = document.createElement('video'); el.preload = 'metadata'; el.onloadedmetadata = () => { width = el.videoWidth; height = el.videoHeight; el.src = ''; resolve(); }; el.onerror = () => reject(new Error('无法读取视频，请使用 MP4 或 WebM')); el.src = url; }
    else { const el = new Image(); el.onload = () => { width = el.naturalWidth; height = el.naturalHeight; resolve(); }; el.onerror = () => reject(new Error('无法读取图片')); el.src = url; }
  }); } finally { URL.revokeObjectURL(url); }
  const form = new FormData(); form.append('file', file);
  const response = await fetch('/api/admin/upload', { method: 'POST', body: form });
  if (!response.ok) throw new Error(response.status === 401 ? '登录已失效，请刷新页面' : '上传失败，请检查文件格式与大小');
  const result = await response.json();
  return { src: result.src as string, width, height, name: crypto.randomUUID(), title: file.name.replace(/\.[^.]+$/, '') };
}
export function AdminEditor({ initial }: { initial: Content }) {
  const [data, setData] = useState(initial);
  const [selected, setSelected] = useState(initial.selectedWork.order[0] || initial.projects[0]?.slug || '');
  const [tab, setTab] = useState<'projects' | 'gallery'>('projects');
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const project = data.projects.find(p => p.slug === selected);
  const ordered = [...data.selectedWork.order, ...data.projects.filter(p => !data.selectedWork.order.includes(p.slug)).map(p => p.slug)];
  function update(fn: (d: Content) => Content) { setData(fn); setDirty(true); setMessage(''); }
  function patch(patch: Partial<Project>) { update(d => ({ ...d, projects: d.projects.map(p => p.slug === selected ? { ...p, ...patch } : p) })); }
  useEffect(() => { const warn = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } }; window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn); }, [dirty]);
  async function save() { setBusy(true); setMessage(''); try { const response = await fetch('/api/admin/content', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); if (!response.ok) { const result = await response.json().catch(() => ({})); throw new Error(result.error || '保存失败，请刷新登录后重试'); } setDirty(false); setMessage('已保存，网站内容已更新'); } catch (e) { setMessage((e as Error).message); } finally { setBusy(false); } }
  async function files(list: FileList | null, kind: 'cover' | 'assets' | 'gallery' | 'hover') {
    if (!list?.length) return;
    const target = selected; setBusy(true); setMessage('正在上传…');
    try {
      const results: Awaited<ReturnType<typeof upload>>[] = []; for (const file of Array.from(list)) results.push(await upload(file));
      update(d => kind === 'gallery' ? { ...d, gallery: [...d.gallery, ...results.map(r => ({ ...r, project: target || d.projects[0]?.slug, scale: 1 }))] } : { ...d, projects: d.projects.map(p => p.slug !== target ? p : kind === 'cover' ? { ...p, selectedWorkCover: results[0].src, thumbnail: results[0].src, coverWidth: results[0].width, coverHeight: results[0].height } : kind === 'hover' ? { ...p, hoverVideo: results[0].src } : { ...p, assets: [...p.assets, ...results.map(r => ({ name: r.name, src: r.src }))] }) });
      setMessage('上传完成，点击保存后生效');
    } catch(e) { setMessage((e as Error).message); } finally { setBusy(false); }
  }
  async function replaceGallery(file: File | undefined, name: string) {
    if (!file) return; setBusy(true); setMessage('正在上传…');
    try { const result = await upload(file); update(d => ({ ...d, gallery: d.gallery.map(g => g.name === name ? { ...g, src: result.src, width: result.width, height: result.height, sourceProject: null } : g) })); setMessage('上传完成，点击保存后生效'); }
    catch (e) { setMessage((e as Error).message); } finally { setBusy(false); }
  }
  const uploader = (kind: 'cover' | 'assets' | 'gallery' | 'hover', text: string) => <label className="upload">{text}<input type="file" aria-label={text} accept={kind === 'hover' ? 'video/mp4,video/webm,video/quicktime' : kind === 'gallery' ? 'image/png,image/jpeg,image/webp,image/gif,image/avif,video/mp4,video/webm' : 'image/png,image/jpeg,image/webp,image/gif,image/avif'} multiple={kind === 'assets' || kind === 'gallery'} onChange={e => { void files(e.target.files, kind); e.target.value = ''; }} /></label>;
  function add() { const slug = `project-${crypto.randomUUID().slice(0, 8)}`; const p: Project = { slug, title: '未命名项目', english: '', kind: '视觉探索', client: '', summary: '', tags: [], color: '#eeeeee', description: '', challenge: '', approach: '', thumbnail: '', selectedWorkCover: '', assets: [] }; update(d => ({ ...d, projects: [...d.projects, p], selectedWork: { ...d.selectedWork, order: [...d.selectedWork.order, slug] } })); setSelected(slug); }
  return <main className="admin" data-sound="off">
    <header className="admin-header"><a href="/" target="_blank" rel="noreferrer" className="wordmark">ZZ<span> / 内容管理</span></a><div className="admin-actions"><span role="status" aria-live="polite">{message || (dirty ? '有未保存的修改' : '所有修改已保存')}</span><a href="/" target="_blank" rel="noreferrer">查看网站 ↗</a><button className="primary" disabled={busy || !dirty} onClick={save}>{busy ? '处理中…' : '保存修改'}</button></div></header>
    <div className="admin-heading"><div><p>YOUR SPACE, YOUR WORK.</p><h1>让作品保持更新。</h1></div><p>上传、整理、保存。就这么简单。</p></div>
    <nav className="admin-tabs" aria-label="内容分类"><button aria-pressed={tab === 'projects'} onClick={() => setTab('projects')}>项目 <small>{data.projects.length}</small></button><button aria-pressed={tab === 'gallery'} onClick={() => setTab('gallery')}>底部横向素材 <small>{data.gallery.length}</small></button></nav>
    <fieldset disabled={busy} className="admin-body">
    {tab === 'projects' ? <div className="editor-layout"><aside><div className="list-heading"><span>项目顺序</span><button onClick={add}>＋ 新建项目</button></div><p className="hint">箭头调整首页顺序；隐藏后详情页仍可访问。</p><div className="project-list">{ordered.map(slug => { const p = data.projects.find(p => p.slug === slug)!; const index = data.selectedWork.order.indexOf(slug); return <div key={slug} className={`project-row ${selected === slug ? 'active' : ''}`}><button className="project-select" onClick={() => setSelected(slug)}><div className="mini"><Preview src={p.thumbnail} /></div><span>{p.title}<small>{index < 0 ? '首页隐藏' : `${String(index + 1).padStart(2, '0')} / 首页展示`}</small></span></button>{index >= 0 && <Sort index={index} count={data.selectedWork.order.length} onMove={to => update(d => ({ ...d, selectedWork: { ...d.selectedWork, order: move(d.selectedWork.order, index, to) } }))} />}</div>; })}</div></aside>
    {project ? <section className="project-editor" key={project.slug}><div className="section-top"><h2>{project.title}</h2><a href={`/work/${project.slug}`} target="_blank" rel="noreferrer">查看详情 ↗</a></div><div className="cover-preview"><Preview src={project.selectedWorkCover} /></div><div className="upload-bar">{uploader('cover', '上传 / 替换封面')}{uploader('hover', '上传悬停视频')}{project.hoverVideo && <button onClick={() => patch({ hoverVideo: '' })}>移除悬停视频</button>}<span className="hint">单个文件 ≤ 30MB</span></div>
    <div className="fields"><label>项目名称<input value={project.title} onChange={e => patch({ title: e.target.value })} /></label><label>客户 / 品牌<input value={project.client} onChange={e => patch({ client: e.target.value })} /></label><label>分类<select value={project.kind} onChange={e => patch({ kind: e.target.value as Project['kind'] })}>{categories.filter(c=>c !== '全部').map(c=><option key={c}>{c}</option>)}</select></label><label>首页展示大小<select value={data.sizes[selected] || 'auto'} onChange={e => update(d => { const sizes = { ...d.sizes }; if (e.target.value === 'auto') delete sizes[selected]; else sizes[selected] = e.target.value as 'small' | 'large'; return { ...d, sizes }; })}><option value="auto">原始排版</option><option value="small">小</option><option value="large">大</option></select></label><label className="wide">简介<input value={project.summary} onChange={e => patch({ summary: e.target.value })} /></label><label className="wide">项目详情<textarea rows={5} value={project.description} onChange={e => patch({ description: e.target.value })} /></label><label className="wide">标签（用逗号分隔）<input value={project.tags.join(', ')} onChange={e => patch({ tags: e.target.value.split(/[,，]/).map(t=>t.trim()) })} /></label></div>
    <label className="check"><input type="checkbox" checked={data.selectedWork.order.includes(selected)} onChange={e => update(d => ({ ...d, selectedWork: { ...d.selectedWork, order: e.target.checked ? [...d.selectedWork.order, selected] : d.selectedWork.order.filter(s => s !== selected) } }))} />在首页展示</label>
    <details><summary>更多文字</summary><div className="fields"><label className="wide">挑战<textarea value={project.challenge} onChange={e=>patch({challenge:e.target.value})} /></label><label className="wide">解决方案<textarea value={project.approach} onChange={e=>patch({approach:e.target.value})} /></label></div></details>
    <div className="section-top"><h2>详情图片 <small>{project.assets.length}</small></h2>{uploader('assets', '＋ 批量上传图片')}</div><p className="hint">按顺序展示，保留图片原始比例。{project.slug === 'portfolio-v1' && '此项目使用独立交互页面，详情图片不参与展示。'}</p><div className="asset-grid">{project.assets.map((a,i)=><div className="asset" key={a.name}><Preview src={a.src} /><Sort index={i} count={project.assets.length} onMove={to=>patch({assets:move(project.assets,i,to)})} onRemove={()=>patch({assets:project.assets.filter((_,j)=>j!==i)})} /></div>)}</div>
    <button className="delete-project" onClick={() => { if (!confirm(`删除“${project.title}”？关联的底部素材也会移除，保存后生效。`)) return; update(d=>({...d,projects:d.projects.filter(p=>p.slug!==selected),selectedWork:{order:d.selectedWork.order.filter(s=>s!==selected),compact:d.selectedWork.compact.filter(s=>s!==selected)},sizes:Object.fromEntries(Object.entries(d.sizes).filter(([s])=>s!==selected)),gallery:d.gallery.filter(g=>g.project!==selected)})); setSelected(data.projects.find(p=>p.slug!==selected)?.slug || ''); }}>删除这个项目</button></section> : <section className="empty"><h2>你的下一个作品，从这里开始。</h2><button onClick={add}>＋ 新建项目</button></section>}</div>
    : <section className="gallery-editor"><div className="section-top"><div><h2>底部横向素材</h2><p className="hint">从左到右依次展示。可独立替换素材、调整大小和关联项目。</p></div>{data.projects.length > 0 && uploader('gallery', '＋ 批量上传素材')}</div>{!data.projects.length && <p>先创建一个项目，再上传关联素材。</p>}<div className="gallery-grid">{data.gallery.map((g,i)=><article className="gallery-item" key={g.name}><div className="gallery-preview"><Preview src={g.src} /></div><label className="upload">替换素材<input aria-label="替换素材" type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/avif,video/mp4,video/webm" onChange={e => { void replaceGallery(e.target.files?.[0], g.name); e.target.value = ''; }} /></label><label>名称<input value={g.title} onChange={e=>update(d=>({...d,gallery:d.gallery.map((v,j)=>j===i?{...v,title:e.target.value}:v)}))} /></label><label>关联项目<select value={g.project} onChange={e=>update(d=>({...d,gallery:d.gallery.map((v,j)=>j===i?{...v,project:e.target.value,sourceProject:null}:v)}))}>{data.projects.map(p=><option key={p.slug} value={p.slug}>{p.title}</option>)}</select></label><label>大小 · {Math.round((g.scale || 1)*100)}%<input type="range" min="0.5" max="1.5" step="0.1" value={g.scale || 1} onChange={e=>update(d=>({...d,gallery:d.gallery.map((v,j)=>j===i?{...v,scale:Number(e.target.value)}:v)}))} /></label><Sort index={i} count={data.gallery.length} onMove={to=>update(d=>({...d,gallery:move(d.gallery,i,to)}))} onRemove={()=>update(d=>({...d,gallery:d.gallery.filter((_,j)=>i!==j)}))} /></article>)}</div>{!data.gallery.length && <p className="empty">还没有素材。上传图片或视频，组成你的横向画廊。</p>}</section>}
    </fieldset><footer className="admin-footer">Jimmy ZZ · Personal workspace<span>修改完成后，记得保存。</span></footer>
  </main>;
}
