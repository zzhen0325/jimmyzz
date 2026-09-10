// Shared ink families for every homepage effect. Paper and deep ink anchor each
// family; neighbouring midtones vary the plates, with one contrasting accent.
export const heroPalettes = [
  { id: 'cobalt', name: '钴蓝奶油', description: '蓝色统领，奶油色留白，杏橙点睛。清爽、有印刷感。', dark: '#243C78', main: '#466BC4', soft: '#9AAEDB', accent: '#EBA276', paper: '#F5EBD7' },
  { id: 'sage', name: '鼠尾草杏', description: '苔绿到鼠尾草的层次，少量熟杏色。自然、温和。', dark: '#304C43', main: '#698B74', soft: '#B4C6A4', accent: '#E5A47F', paper: '#F1EDDA' },
  { id: 'terracotta', name: '陶土玫瑰', description: '砖红、陶土、灰粉递进，麦芽色提亮。温暖、复古。', dark: '#713B3D', main: '#B66355', soft: '#D9A297', accent: '#DDB874', paper: '#F6E7DB' },
  { id: 'grape', name: '葡萄雾紫', description: '葡萄紫压住重心，雾紫铺开，淡开心果色跳出。柔和、有个性。', dark: '#49365E', main: '#80659D', soft: '#BDAACD', accent: '#C9D695', paper: '#F0E8ED' },
  { id: 'graphite', name: '石墨柠黄', description: '蓝灰与纸白为主，柠黄集中出现在网格与字符。克制、鲜明。', dark: '#303E48', main: '#637782', soft: '#ABB9BA', accent: '#E4CF62', paper: '#F0EEDC' },
] as const;

export function getHeroPalette() {
  const id = typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('palette');
  return heroPalettes.find(palette => palette.id === id) ?? heroPalettes[0];
}

export function paletteRgb(hex: string): number[] {
  return [1, 3, 5].map(offset => parseInt(hex.slice(offset, offset + 2), 16));
}

export function paletteGrade(palette: ReturnType<typeof getHeroPalette>, variant: 'main' | 'soft' | 'accent') {
  const middle = variant === 'accent' ? palette.accent : palette.soft;
  return {
    stops: [
      [0, paletteRgb(palette.dark)],
      [0.32, paletteRgb(variant === 'accent' ? palette.accent : variant === 'soft' ? palette.soft : palette.main)],
      [0.65, paletteRgb(middle)],
      [1, paletteRgb(palette.paper)],
    ] as [number, number[]][],
    w0: paletteRgb(variant === 'accent' ? palette.accent : palette.main),
    w1: paletteRgb(palette.paper),
  };
}
