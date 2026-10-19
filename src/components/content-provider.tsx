'use client';
import { createContext, useContext } from 'react';
import type { Content } from '@/lib/content';
const Context = createContext<Content | null>(null);
export const ContentProvider = Context.Provider;
export function useContent() {
  const content = useContext(Context);
  if (!content) throw new Error('ContentProvider is required');
  return content;
}
