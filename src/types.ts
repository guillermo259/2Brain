export type Category = string;

export const BUILTIN_CATEGORIES: Category[] = ['General', 'Work', 'Personal', 'Ideas', 'Learning'];

const CATEGORY_COLOR_PALETTE = [
  '#f1f1f1', // General / default
  '#fe7674', // Work
  '#c8bfff', // Personal
  '#e5deff', // Ideas
  '#a3e635', // Learning
  '#fbbf24', // custom
  '#34d399', // custom
  '#60a5fa', // custom
  '#f472b6', // custom
  '#fb923c', // custom
  '#a78bfa', // custom
  '#2dd4bf', // custom
];

/** Hash consistente para asignar colores a categorías dinámicas. */
export function getCategoryColor(name: string): string {
  // Built-in categories mantienen sus colores icónicos
  const builtinMap: Record<string, string> = {
    General: '#f1f1f1',
    Work: '#fe7674',
    Personal: '#c8bfff',
    Ideas: '#e5deff',
    Learning: '#a3e635',
  };
  if (name in builtinMap) return builtinMap[name];

  // Hash simple para categorías custom
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash) + name.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % CATEGORY_COLOR_PALETTE.length;
  return CATEGORY_COLOR_PALETTE[idx];
}

/** @deprecated Usar getCategoryColor() para acceso dinámico. */
export const CATEGORY_COLORS: Record<string, string> = new Proxy({} as Record<string, string>, {
  get: (_target, prop: string) => getCategoryColor(prop),
});

export interface NoteItem {
  id: string;
  title: string;
  content: string;
  category: Category;
  tags: string[];
  isPinned: boolean;
  timestamp: string;
}

export interface GraphNodePosition {
  x: number;
  y: number;
  z: number;
}
