'use client';
import { createContext, useContext } from 'react';
import { initialContent, type Content } from '@/lib/content';
const Context = createContext<Content>(initialContent);
export const ContentProvider = Context.Provider;
export const useContent = () => useContext(Context);
