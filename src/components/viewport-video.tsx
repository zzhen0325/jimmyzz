'use client';

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent, type VideoHTMLAttributes } from 'react';
import { Pause, Play } from 'lucide-react';
import { createPortal } from 'react-dom';
import { preparedCaseVideo } from '@/lib/prepared-case-media';
import styles from './viewport-video.module.css';

type Props = Omit<VideoHTMLAttributes<HTMLVideoElement>, 'src' | 'autoPlay' | 'preload'> & { src: string; eager?: boolean; minimalControls?: boolean; embedded?: boolean; controlsContainer?: HTMLElement | null };

function formatTime(seconds: number) {
  const value = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  return `${Math.floor(value / 60).toString().padStart(2, '0')}:${(value % 60).toString().padStart(2, '0')}`;
}

/** Do not attach a media URL until close to the viewport; decode only on screen. */
export function ViewportVideo({ src: originalSrc, eager = false, controls = true, minimalControls = false, embedded = false, controlsContainer, ...props }: Props) {
  const prepared = preparedCaseVideo(originalSrc);
  const src = prepared?.src ?? originalSrc;
  const ref = useRef<HTMLVideoElement>(null);
  const manuallyPaused = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [timeline, setTimeline] = useState({ time: 0, duration: 0 });
  const [previewTime, setPreviewTime] = useState<number | null>(null);
  const dragging = useRef(false);
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    const constrained = connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType ?? '');
    let visible = false;
    let disposed = false;
    manuallyPaused.current = false;
    const updateTimeline = () => {
      if (minimalControls) setTimeline({ time: video.currentTime, duration: Number.isFinite(video.duration) ? video.duration : 0 });
    };
    const updatePlaying = () => { if (minimalControls) setPlaying(!video.paused); };
    video.addEventListener('timeupdate', updateTimeline);
    video.addEventListener('durationchange', updateTimeline);
    video.addEventListener('emptied', updateTimeline);
    video.addEventListener('play', updatePlaying);
    video.addEventListener('pause', updatePlaying);
    const attach = () => {
      if (video.getAttribute('src') !== src) {
        // Buffer nearby frames before scrolling reaches them, not only metadata.
        video.preload = constrained || reduced.matches ? 'metadata' : 'auto';
        video.src = src;
        video.load();
      }
    };
    const sync = () => {
      video.controls = !minimalControls && (controls || reduced.matches);
      if (!visible || document.hidden || reduced.matches || manuallyPaused.current) { video.pause(); return; }
      attach();
      void video.play().then(() => {
        // A late play promise must not restart an offscreen/unmounted video.
        if (disposed || !visible || document.hidden || reduced.matches || manuallyPaused.current) video.pause();
      }).catch(() => { if (!disposed && !minimalControls) video.controls = true; });
    };
    const near = new IntersectionObserver(([entry]) => { if (entry.isIntersecting && !document.hidden) attach(); }, { rootMargin: constrained ? '0px' : '2000px' });
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); });
    near.observe(video); observer.observe(video);
    document.addEventListener('visibilitychange', sync);
    reduced.addEventListener('change', sync);
    sync();
    return () => {
      disposed = true;
      near.disconnect(); observer.disconnect();
      document.removeEventListener('visibilitychange', sync);
      reduced.removeEventListener('change', sync);
      video.removeEventListener('timeupdate', updateTimeline);
      video.removeEventListener('durationchange', updateTimeline);
      video.removeEventListener('emptied', updateTimeline);
      video.removeEventListener('play', updatePlaying);
      video.removeEventListener('pause', updatePlaying);
      video.pause(); video.removeAttribute('src'); video.load();
    };
  }, [src, controls, minimalControls]);
  const togglePlayback = () => {
    const video = ref.current;
    if (!video) return;
    if (video.paused) {
      manuallyPaused.current = false;
      if (!video.getAttribute('src')) { video.src = src; video.load(); }
      void video.play().catch(() => { manuallyPaused.current = true; });
    } else {
      manuallyPaused.current = true;
      video.pause();
    }
  };
  const video = <video poster={prepared?.poster} {...props} src={eager ? src : undefined} ref={ref} controls={!minimalControls && controls} muted loop playsInline preload={eager ? 'auto' : 'none'} data-viewport-video />;
  if (!minimalControls) return video;
  const progress = timeline.duration ? Math.min(100, timeline.time / timeline.duration * 100) : 0;
  const previewPosition = timeline.duration && previewTime !== null ? previewTime / timeline.duration * 100 : 0;
  const previewPointer = (event: PointerEvent<HTMLInputElement>) => {
    if (!timeline.duration) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    setPreviewTime(Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)) * timeline.duration);
  };
  const controlBar = <div className={styles.controls} data-playing={playing} role="group" aria-label="视频播放控制">
      <button type="button" className={styles.toggle} onClick={togglePlayback} aria-label={playing ? '暂停视频' : '播放视频'}>
        {playing ? <Pause size={14} fill="currentColor" strokeWidth={0} aria-hidden="true" /> : <Play size={14} fill="currentColor" strokeWidth={0} aria-hidden="true" />}
      </button>
      <span className={styles.time} aria-label="已播放时间">{formatTime(timeline.time)}</span>
      <div className={styles.seek} style={{ '--video-progress': `${progress}%`, '--preview-position': `${previewPosition}%` } as CSSProperties}>
      {previewTime !== null && timeline.duration > 0 && <div className={styles.preview} aria-hidden="true">
        <span className={styles.previewTime}>{formatTime(previewTime)} <span>/ {formatTime(timeline.duration)}</span></span>
        <span className={styles.marker} />
      </div>}
      <input className={styles.progress} type="range" min={0} max={timeline.duration || 1} step="0.1"
        value={Math.min(timeline.time, timeline.duration)} disabled={!timeline.duration}
        aria-label="视频播放进度" aria-valuetext={`${Math.floor(timeline.time)} 秒，共 ${Math.floor(timeline.duration)} 秒`}
        onPointerEnter={previewPointer}
        onPointerMove={previewPointer}
        onPointerDown={event => { dragging.current = true; previewPointer(event); }}
        onPointerLeave={() => { if (!dragging.current) setPreviewTime(null); }}
        onPointerUp={() => { dragging.current = false; setPreviewTime(null); }}
        onPointerCancel={() => { dragging.current = false; setPreviewTime(null); }}
        onLostPointerCapture={() => { dragging.current = false; setPreviewTime(null); }}
        onBlur={() => setPreviewTime(null)}
        onChange={event => {
          const time = Number(event.target.value);
          if (ref.current && timeline.duration) ref.current.currentTime = time;
          setTimeline(current => ({ ...current, time }));
          setPreviewTime(time);
        }} />
      </div>
      <span className={styles.time} aria-label="剩余时间">−{formatTime(timeline.duration - timeline.time)}</span>
    </div>;
  return <div className={`${styles.player}${embedded ? ` ${styles.embeddedPlayer}` : ''}`} data-playing={playing} data-minimal-player>
    {video}
    {embedded ? (controlsContainer && createPortal(controlBar, controlsContainer)) : controlBar}
  </div>;
}
