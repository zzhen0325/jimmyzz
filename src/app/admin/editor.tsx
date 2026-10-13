'use client';
/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from 'react';
import { categories, type Project } from '@/lib/projects-config';
import { syncGallery, type Content } from '@/lib/content';
import { notifyContentSaved } from '@/lib/content-updates';
import { ProjectThemeEditor } from './project-theme-editor';
import './admin.css';
import { isVideoAsset } from '@/lib/media';
import { transcodeVideo, isVideoFile, isWebMFile, formatMB } from '@/lib/video-transcode';
function Preview({ src }: { src: string }) { return src ? isVideoAsset(src) ? <video src={src} muted controls preload="metadata" /> : <img src={src} alt="素材预览" loading="lazy" /> : <span className="placeholder">上传一张封面，开始你的新项目</span>; }
function move<T>(items: T[], from: number, to: number): T[] { const copy = [...items]; if (to < 0 || to >= copy.length) return copy; const [item] = copy.splice(from, 1); copy.splice(to, 0, item); return copy; }
function Sort({ index, count, onMove, onRemove }: { index: number; count: number; onMove: (to: number) => void; onRemove?: () => void }) { return <div className="sort"><button type="button" aria-label="上移" disabled={index === 0} onClick={() => onMove(index - 1)}>↑</button><button type="button" aria-label="下移" disabled={index === count - 1} onClick={() => onMove(index + 1)}>↓</button>{onRemove && <button type="button" className="danger" onClick={onRemove}>移除</button>}</div>; }
async function upload(original: File, report: (message: string) => void, signal: AbortSignal) {
  const video = isVideoFile(original);
  const webm = isWebMFile(original);
  const compressed = video && !webm;
  const file = compressed ? await transcodeVideo(original, report, signal) : webm && original.type !== 'video/webm' ? new File([original], original.name, { type: 'video/webm', lastModified: original.lastModified }) : original;
  if (file.size > 30 * 1024 * 1024) throw new Error(`${file.name} 超过 30MB`);
  report(compressed ? `压缩完成 ${formatMB(original.size)} → ${formatMB(file.size)}，正在读取尺寸…` : video ? 'WebM 无需压缩，正在读取尺寸…' : '正在读取图片…');
  const url = URL.createObjectURL(file);
  let width = 960, height = 540;
  try { await new Promise<void>((resolve, reject) => {
    const el = video ? document.createElement('video') : new Image();
    const cleanup = () => { clearTimeout(timer); signal.removeEventListener('abort', abort); el.removeAttribute('src'); if (el instanceof HTMLVideoElement) el.load(); };
    const fail = (message: string) => { cleanup(); reject(new Error(message)); };
    const abort = () => fail('已取消上传');
    const timer = setTimeout(() => fail('读取素材超时，请重试或检查文件是否损坏'), 20000);
    signal.addEventListener('abort', abort, { once: true });
    el.onerror = () => fail(video ? '视频无法读取，请检查文件或重新导出' : '无法读取图片');
    if (el instanceof HTMLVideoElement) {
      el.preload = 'metadata';
      el.onloadedmetadata = () => { width = el.videoWidth; height = el.videoHeight; cleanup(); resolve(); };
    } else {
      el.onload = () => { width = el.naturalWidth; height = el.naturalHeight; cleanup(); resolve(); };
    }
    if (signal.aborted) { abort(); return; }
    el.src = url;
  }); } finally { URL.revokeObjectURL(url); }
  report(compressed ? `正在上传 WebM · ${formatMB(original.size)} → ${formatMB(file.size)}` : video ? `正在上传原始 WebM · ${formatMB(file.size)}` : '正在上传图片…');
  const form = new FormData(); form.append('file', file);
  const response = await fetch('/api/admin/upload', { method: 'POST', body: form, signal: AbortSignal.any([signal, AbortSignal.timeout(120000)]) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(response.status === 401 ? '登录已失效，请刷新页面' : result.error || '上传失败，请检查文件格式与大小');
  return { src: result.src as string, width, height, name: crypto.randomUUID(), title: original.name.replace(/\.[^.]+$/, ''), summary: compressed ? `${formatMB(original.size)} → ${formatMB(file.size)}` : webm ? 'WebM 原文件，未压缩' : '' };
}
export function AdminEditor({ initial }: { initial: Content }) {
  const [data, setData] = useState(() => syncGallery(initial));
  const [selected, setSelected] = useState(initial.selectedWork.order[0] || initial.projects[0]?.slug || '');
  const [tab, setTab] = useState<'projects' | 'gallery'>('projects');
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const uploadController = useRef<AbortController | null>(null);
  const cleanupCandidates = useRef<string[]>([]);
  useEffect(() => () => uploadController.current?.abort(), []);
  const project = data.projects.find(p => p.slug === selected);
  const ordered = [...data.selectedWork.order, ...data.projects.filter(p => !data.selectedWork.order.includes(p.slug)).map(p => p.slug)];
  function update(fn: (d: Content) => Content) { setData(d => syncGallery(fn(d))); setDirty(true); setMessage(''); }
  function patch(patch: Partial<Project>) { update(d => ({ ...d, projects: d.projects.map(p => p.slug === selected ? { ...p, ...patch } : p) })); }
  useEffect(() => { const warn = (e: BeforeUnloadEvent) => { if (dirty || busy) { e.preventDefault(); e.returnValue = ''; } }; window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn); }, [dirty, busy]);
  async function save() {
    setBusy(true); setMessage('');
    try {
      const response = await fetch('/api/admin/content', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, cleanupCandidates: cleanupCandidates.current }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || '保存失败，请刷新登录后重试');
      cleanupCandidates.current = result.failedCleanup ?? [];
      setDirty(cleanupCandidates.current.length > 0);
      notifyContentSaved();
      setMessage(cleanupCandidates.current.length ? '内容已保存，部分资源删除失败，请点击保存重试' : '已保存，网站内容已更新，未使用的已移除资源已删除');
    } catch (e) { setMessage((e as Error).message); }
    finally { setBusy(false); }
  }

  async function files(list: FileList | null, kind: 'cover' | 'assets' | 'gallery' | 'hover') {
    if (!list?.length) return;
    const target = selected;
    const pending = Array.from(list);
    const controller = new AbortController(); uploadController.current = controller;
    setBusy(true); setMessage('正在准备素材…');
    let completed = 0;
    let lastSummary = '';
    try {
      for (const [index, file] of pending.entries()) {
        const result = await upload(file, text => setMessage(`${index + 1}/${pending.length} · ${file.name}：${text}`), controller.signal);
        cleanupCandidates.current.push(result.src);
        const { summary, ...r } = result; lastSummary = summary;
        update(d => kind === 'gallery' ? { ...d, gallery: [...d.gallery, { ...r, scale: 1 }] } : { ...d, projects: d.projects.map(p => p.slug !== target ? p : kind === 'cover' ? { ...p, selectedWorkCover: r.src, thumbnail: r.src, coverWidth: r.width, coverHeight: r.height } : kind === 'hover' ? { ...p, hoverVideo: r.src } : { ...p, assets: [...p.assets, { name: r.name, src: r.src, width: r.width, height: r.height }] }) });
        completed++;
      }
      setMessage(`上传完成${lastSummary ? `（${lastSummary}）` : ''}，点击保存后生效`);
    } catch(e) {
      setMessage(`${controller.signal.aborted ? '已取消处理' : (e as Error).message}${completed ? `；已上传 ${completed} 个素材，点击保存后生效` : ''}`);
    } finally { uploadController.current = null; setBusy(false); }
  }
  async function replaceGallery(file: File | undefined, name: string) {
    if (!file) return;
    const controller = new AbortController(); uploadController.current = controller;
    setBusy(true); setMessage('正在准备素材…');
    try { const result = await upload(file, setMessage, controller.signal); cleanupCandidates.current.push(result.src); update(d => ({ ...d, gallery: d.gallery.map(g => g.name === name ? { ...g, src: result.src, width: result.width, height: result.height, sourceProject: null } : g) })); setMessage(`上传完成${result.summary ? `（${result.summary}）` : ''}，点击保存后生效`); }
    catch (e) { setMessage(controller.signal.aborted ? '已取消处理' : (e as Error).message); } finally { uploadController.current = null; setBusy(false); }
  }
  const uploader = (kind: 'cover' | 'assets' | 'gallery' | 'hover', text: string) => <label className="upload">{text}<input type="file" aria-label={text} accept={kind === 'hover' ? 'video/mp4,video/webm,video/quicktime,.mov,.mp4,.webm' : kind === 'gallery' || kind === 'assets' ? 'image/png,image/jpeg,image/webp,image/gif,image/avif,video/mp4,video/webm,video/quicktime,.mov,.mp4,.webm' : 'image/png,image/jpeg,image/webp,image/gif,image/avif'} multiple={kind === 'assets' || kind === 'gallery'} onChange={e => { void files(e.target.files, kind); e.target.value = ''; }} /></label>;
  function add() { const slug = `project-${crypto.randomUUID().slice(0, 8)}`; const p: Project = { slug, title: '未命名项目', english: '', kind: '视觉探索', client: '', summary: '', tags: [], color: '#eeeeee', description: '', challenge: '', approach: '', thumbnail: '', selectedWorkCover: '', assets: [] }; update(d => ({ ...d, projects: [...d.projects, p], selectedWork: { ...d.selectedWork, order: [...d.selectedWork.order, slug] } })); setSelected(slug); }
  return <main className="admin" data-sound="off">
    <header className="admin-header"><a href="/" target="_blank" rel="noreferrer" className="wordmark">ZZ<span> / 内容管理</span></a><div className="admin-actions"><span role="status" aria-live="polite">{message || (dirty ? '有未保存的修改' : '所有修改已保存')}</span><a href="/" target="_blank" rel="noreferrer">查看网站 ↗</a><button className="primary" disabled={busy || !dirty} onClick={save}>{busy ? '处理中…' : '保存修改'}</button></div></header>
    <div className="admin-heading"><div><p>YOUR SPACE, YOUR WORK.</p><h1>让作品保持更新。</h1></div><p>上传、整理、保存。就这么简单。</p></div>
    <nav className="admin-tabs" aria-label="内容分类"><button aria-pressed={tab === 'projects'} onClick={() => setTab('projects')}>项目 <small>{data.projects.length}</small></button><button aria-pressed={tab === 'gallery'} onClick={() => setTab('gallery')}>底部横向素材 <small>{data.gallery.length}</small></button></nav>
    {message && <div className="upload-feedback" role="status"><span>{message}</span>{busy && uploadController.current && <button type="button" onClick={() => uploadController.current?.abort()}>取消处理</button>}</div>}
    <fieldset disabled={busy} className="admin-body">
    {tab === 'projects' ? <div className="editor-layout"><aside><div className="list-heading"><span>项目顺序</span><button onClick={add}>＋ 新建项目</button></div><p className="hint">箭头调整首页顺序；隐藏后详情页仍可访问。</p><div className="project-list">{ordered.map(slug => { const p = data.projects.find(p => p.slug === slug)!; const index = data.selectedWork.order.indexOf(slug); return <div key={slug} className={`project-row ${selected === slug ? 'active' : ''}`}><button className="project-select" onClick={() => setSelected(slug)}><div className="mini"><Preview src={p.thumbnail} /></div><span>{p.title}<small>{index < 0 ? '首页隐藏' : `${String(index + 1).padStart(2, '0')} / 首页展示`}</small></span></button>{index >= 0 && <Sort index={index} count={data.selectedWork.order.length} onMove={to => update(d => ({ ...d, selectedWork: { ...d.selectedWork, order: move(d.selectedWork.order, index, to) } }))} />}</div>; })}</div></aside>
    {project ? <section className="project-editor" key={project.slug}><div className="section-top"><h2>{project.title}</h2><a href={`/work/${project.slug}`} target="_blank" rel="noreferrer">查看详情 ↗</a></div><div className="cover-preview"><Preview src={project.selectedWorkCover} /></div><div className="upload-bar">{uploader('cover', '上传 / 替换封面')}{uploader('hover', '上传悬停视频')}{project.hoverVideo && <button onClick={() => patch({ hoverVideo: '' })}>移除悬停视频</button>}<span className="hint">图片 / WebM ≤ 30MB，WebM 原文件直传；MOV / MP4 ≤ 200MB，按原宽高 70% 转为高质量 WebM</span></div>
    <section className="project-copy-fields" aria-label="详情页文字配置">
      <h3>Info · 项目信息</h3>
      <div className="fields">
        <label>项目名称<input value={project.title} onChange={e => patch({ title: e.target.value })} /></label>
        <label>信息区项目名 / Project<input value={project.infoProjectName ?? ''} placeholder="填写后显示 Project、Date、Company、Tags" onChange={e => patch({ infoProjectName: e.target.value })} /></label>
        <label>日期 / Date<input value={project.date ?? ''} placeholder="例如 2026.02" onChange={e => patch({ date: e.target.value })} /></label>
        <label>公司 / Company<input value={project.client} onChange={e => patch({ client: e.target.value })} /></label>
        <label>分类（首页筛选）<select value={project.kind} onChange={e => patch({ kind: e.target.value as Project['kind'] })}>{categories.filter(c => c !== '全部').map(c => <option key={c}>{c}</option>)}</select></label>
        <label>标签 / TAGS（用逗号分隔）<input value={project.tags.join(', ')} onChange={e => patch({ tags: e.target.value.split(/[,，]/).map(t => t.trim()) })} /></label>
      </div>
      <h3>About · 项目介绍</h3>
      <div className="fields">
        <label className="wide">简介<textarea rows={2} value={project.summary} onChange={e => patch({ summary: e.target.value })} /></label>
      </div>
      <h3 id="project-challenge-label">Challenge · 挑战</h3>
      <textarea aria-labelledby="project-challenge-label" rows={4} value={project.challenge} onChange={e => patch({ challenge: e.target.value })} />
      <h3 id="project-solution-label">Solution · 解决方案</h3>
      <textarea aria-labelledby="project-solution-label" rows={5} value={project.approach} onChange={e => patch({ approach: e.target.value })} />
      <p className="hint">文字按详情页顺序排列，保存后生效。挑战或解决方案留空时，前台隐藏对应区块。</p>
    </section>
    <div className="fields"><label>首页展示大小<select value={data.sizes[selected] || 'auto'} onChange={e => update(d => { const sizes = { ...d.sizes }; if (e.target.value === 'auto') delete sizes[selected]; else sizes[selected] = e.target.value as 'small' | 'large'; return { ...d, sizes }; })}><option value="auto">原始排版</option><option value="small">小</option><option value="large">大</option></select></label></div>
    <label className="check"><input type="checkbox" checked={data.selectedWork.order.includes(selected)} onChange={e => update(d => ({ ...d, selectedWork: { ...d.selectedWork, order: e.target.checked ? [...d.selectedWork.order, selected] : d.selectedWork.order.filter(s => s !== selected) } }))} />在首页展示</label>
    {project.slug === 'portfolio-v1' ? <p className="hint">Portfolio V1 使用独立交互页面，不应用详情页配色。</p> : <ProjectThemeEditor theme={project.detailTheme} title={project.title} onChange={detailTheme => patch({ detailTheme })} />}

    <div className="section-top"><h2>详情素材 <small>{project.assets.length}</small></h2>{uploader('assets', '＋ 上传图片 / 视频')}</div><p className="hint">图片和视频按顺序混排，保留原始比例。移除或替换后，保存时会删除未被其他位置引用的上传文件。WebM（≤ 30MB）原文件直传；MP4 / MOV（≤ 200MB）按原宽高 70% 转为高质量静音 WebM，处理后 ≤ 30MB。{project.slug === 'portfolio-v1' && '此项目使用独立交互页面，详情素材不参与展示。'}</p><div className="asset-grid">{project.assets.map((a,i)=><div className="asset" key={a.name}><Preview src={a.src} /><Sort index={i} count={project.assets.length} onMove={to=>patch({assets:move(project.assets,i,to)})} onRemove={()=>patch({assets:project.assets.filter((_,j)=>j!==i)})} /></div>)}</div>
    <button className="delete-project" onClick={() => { if (!confirm(`删除“${project.title}”？自动加入的封面也会移除，单独上传的底部素材会保留，保存后生效。`)) return; update(d=>({...d,projects:d.projects.filter(p=>p.slug!==selected),selectedWork:{order:d.selectedWork.order.filter(s=>s!==selected),compact:d.selectedWork.compact.filter(s=>s!==selected)},sizes:Object.fromEntries(Object.entries(d.sizes).filter(([s])=>s!==selected)),gallery:d.gallery.filter(g=>g.sourceProject!==selected)})); setSelected(data.projects.find(p=>p.slug!==selected)?.slug || ''); }}>删除这个项目</button></section> : <section className="empty"><h2>你的下一个作品，从这里开始。</h2><button onClick={add}>＋ 新建项目</button></section>}</div>
    : <section className="gallery-editor"><div className="section-top"><div><h2>底部横向素材</h2><p className="hint">首页展示的封面自动加入并同步更新；单独上传的素材接在后面，无需关联项目。可替换、排序和调整大小。</p></div>{uploader('gallery', '＋ 批量上传素材')}</div><p className="hint">已自动加入 {data.gallery.filter(g => g.sourceProject).length} 张首页封面，以下为单独上传的素材。</p><div className="gallery-grid">{data.gallery.map((g,i)=>g.sourceProject ? null : <article className="gallery-item" key={g.name}><div className="gallery-preview"><Preview src={g.src} /></div><label className="upload">替换素材<input aria-label="替换素材" type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/avif,video/mp4,video/webm,video/quicktime,.mov,.mp4,.webm" onChange={e => { void replaceGallery(e.target.files?.[0], g.name); e.target.value = ''; }} /></label><label>名称<input value={g.title} onChange={e=>update(d=>({...d,gallery:d.gallery.map((v,j)=>j===i?{...v,title:e.target.value}:v)}))} /></label><label>大小 · {Math.round((g.scale || 1)*100)}%<input type="range" min="0.5" max="1.5" step="0.1" value={g.scale || 1} onChange={e=>update(d=>({...d,gallery:d.gallery.map((v,j)=>j===i?{...v,scale:Number(e.target.value)}:v)}))} /></label><Sort index={i - data.gallery.filter(g => g.sourceProject).length} count={data.gallery.filter(g => !g.sourceProject).length} onMove={to=>update(d=>({...d,gallery:move(d.gallery,i,to + d.gallery.filter(g => g.sourceProject).length)}))} onRemove={()=>update(d=>({...d,gallery:d.gallery.filter((_,j)=>i!==j)}))} /></article>)}</div>{!data.gallery.some(g => !g.sourceProject) && <p className="empty">还没有素材。上传图片或视频，组成你的横向画廊。</p>}</section>}
    </fieldset><footer className="admin-footer">Jimmy ZZ · Personal workspace<span>修改完成后，记得保存。</span></footer>
  </main>;
}
