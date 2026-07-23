export type Category = 'General' | 'Work' | 'Personal' | 'Ideas' | 'Learning';

export const CATEGORIES: Category[] = ['General', 'Work', 'Personal', 'Ideas', 'Learning'];

export const CATEGORY_COLORS: Record<Category, string> = {
  General: '#f1f1f1',
  Work: '#fe7674',
  Personal: '#c8bfff',
  Ideas: '#e5deff',
  Learning: '#a3e635',
};

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
