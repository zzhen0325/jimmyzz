'use client';

import { useState } from 'react';
import { defaultProjectTheme, isThemeColor, projectThemeStyle, resolveProjectTheme, type ProjectTheme } from '@/lib/project-theme';

const fields = [
  ['background', '背景色'],
  ['foreground', '文字色'],
  ['muted', '辅助文字色'],
] as const;

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const [draft, setDraft] = useState(value);
  const valid = isThemeColor(draft);
  return <div className="theme-color-field">
    <label>{label}
      <input type="color" value={value} onChange={e => { setDraft(e.target.value); onChange(e.target.value); }} />
    </label>
    <input aria-label={`${label}色值`} value={draft} maxLength={7} spellCheck={false} aria-invalid={!valid}
      onChange={e => { setDraft(e.target.value); if (isThemeColor(e.target.value)) onChange(e.target.value); }}
      onBlur={() => setDraft(value)} />
    {!valid && <span className="theme-color-error">请输入 #RGB 或 #RRGGBB；离开输入框将恢复有效值。</span>}
  </div>;
}

export function ProjectThemeEditor({ theme, title, onChange }: { theme?: ProjectTheme; title: string; onChange: (theme?: ProjectTheme) => void }) {
  const colors = resolveProjectTheme(theme);
  const [revision, setRevision] = useState(0);
  return <section className="project-theme-editor" aria-labelledby="project-theme-title">
    <div className="section-top"><h2 id="project-theme-title">详情页颜色</h2>
      <button type="button" onClick={() => { onChange(undefined); setRevision(r => r + 1); }}>恢复默认</button>
    </div>
    <p className="hint">为当前项目设置配色，保存修改后生效。</p>
    <div className="theme-color-fields">{fields.map(([key, label]) =>
      <ColorField key={`${key}-${revision}`} label={label} value={colors[key]} onChange={value => onChange({ ...theme, [key]: value })} />
    )}</div>
    <div className="project-theme-preview" style={projectThemeStyle(colors)} aria-label="详情页配色预览">
      <div className="theme-preview-nav"><span>Jimmy.zz</span><span>WORK · ABOUT · MORE</span></div>
      <h3>{title || '项目名称'}</h3>
      <p>项目介绍与正文将使用此文字颜色。</p>
      <div className="theme-preview-meta">客户 / 品牌 · 分类 · 标签</div>
    </div>
    <span className="hint">默认背景 {defaultProjectTheme.background} · 文字 {defaultProjectTheme.foreground}</span>
  </section>;
}
