'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { CONTENT_UPDATE_KEY } from '@/lib/content-updates';

export function ContentLiveRefresh() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    // Never refresh another editor with potentially unsaved changes.
    if (pathname.startsWith('/admin')) return;
    let revision: string | null = null;
    try { revision = localStorage.getItem(CONTENT_UPDATE_KEY); } catch { /* Storage may be unavailable. */ }

    const refresh = (next: string | null) => {
      if (!next || next === revision) return;
      revision = next;
      router.refresh();
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === CONTENT_UPDATE_KEY) refresh(event.newValue);
    };
    const onFocus = () => {
      try { refresh(localStorage.getItem(CONTENT_UPDATE_KEY)); } catch { /* Storage may be unavailable. */ }
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', onFocus);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', onFocus);
    };
  }, [pathname, router]);

  return null;
}
