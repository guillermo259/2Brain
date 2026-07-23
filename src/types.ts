export type NoteType = 'architecture' | 'voice' | 'checklist' | 'visual' | 'entity' | 'text';

export type ContextCategory = 'Everywhere' | 'Deep Work' | 'Philosophical' | 'Infrastructure' | 'Visuals';

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface EntityMetric {
  label: string;
  value: number; // percentage 0-100
}

export interface NoteItem {
  id: string;
  title: string;
  type: NoteType;
  timestamp: string;
  category: ContextCategory;
  summary?: string;
  tags: string[];
  icon: string;
  audioDuration?: string;
  checklist?: ChecklistItem[];
  imageUrl?: string;
  entityMetric?: EntityMetric;
  connectedNodeIds: string[];
  isPinned?: boolean;
}

export interface GraphNodePosition {
  x: number;
  y: number;
  z: number;
}
