import type { CSSProperties } from 'react';

export const defaultProjectTheme = {
  background: '#ffffff',
  foreground: '#0b0b0b',
  muted: '#666761',
};

export type ProjectTheme = Partial<typeof defaultProjectTheme>;
export const isThemeColor = (value: unknown): value is string =>
  typeof value === 'string' && /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value);

export function resolveProjectTheme(theme?: ProjectTheme) {
  return Object.fromEntries(Object.entries(defaultProjectTheme).map(([key, fallback]) => {
    const value = theme?.[key as keyof ProjectTheme];
    const color = isThemeColor(value) ? value : fallback;
    return [key, color.length === 4 ? `#${[...color.slice(1)].map(c => c + c).join('')}` : color];
  })) as typeof defaultProjectTheme;
}

export function projectThemeStyle(theme?: ProjectTheme): CSSProperties {
  const colors = resolveProjectTheme(theme);
  return {
    '--home-background': colors.background,
    '--home-foreground': colors.foreground,
    '--muted': colors.muted,
    '--line': `${colors.foreground}1a`,
  } as CSSProperties;
}
