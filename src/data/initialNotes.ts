import { NoteItem } from '../types';

export const INITIAL_NOTES: NoteItem[] = [
  {
    id: 'note-1',
    title: 'Distributed Systems Architecture 2024',
    type: 'architecture',
    timestamp: '2H AGO',
    category: 'Infrastructure',
    summary: 'Refining approach to local-first database sync using CRDTs. Investigating SQLite in WASM...',
    tags: ['INFRA', 'DEV'],
    icon: 'architecture',
    connectedNodeIds: ['note-3', 'note-5'],
    isPinned: true
  },
  {
    id: 'note-2',
    title: 'Existential Minimalism',
    type: 'voice',
    timestamp: 'YESTERDAY',
    category: 'Philosophical',
    summary: 'Voice record regarding noise reduction in mental models and focus optimization.',
    tags: ['MINDSET', 'AUDIO'],
    icon: 'mic',
    audioDuration: '0:42',
    connectedNodeIds: ['note-4'],
  },
  {
    id: 'note-3',
    title: 'Q1 Roadmap',
    type: 'checklist',
    timestamp: 'JAN 10',
    category: 'Deep Work',
    summary: 'Core engineering deliverables for first quarter.',
    tags: ['PRODUCT', 'TASKS'],
    icon: 'checklist',
    checklist: [
      { id: 'c1', text: 'Finalize RAG pipeline', completed: false },
      { id: 'c2', text: 'Local embedding worker', completed: true },
      { id: 'c3', text: 'Optimize WebGL vector graph rendering', completed: false }
    ],
    connectedNodeIds: ['note-1', 'note-5']
  },
  {
    id: 'note-4',
    title: 'Workspace Concepts',
    type: 'visual',
    timestamp: 'JAN 08',
    category: 'Visuals',
    summary: 'Minimalist spatial workspace layout and ergonomic UI design components.',
    tags: ['DESIGN', 'UI'],
    icon: 'palette',
    imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
    connectedNodeIds: ['note-2']
  },
  {
    id: 'note-5',
    title: 'Large Language Models',
    type: 'entity',
    timestamp: 'JAN 05',
    category: 'Infrastructure',
    summary: 'Cluster allocation and RAM utilization status for local model execution.',
    tags: ['AI', 'LLM'],
    icon: 'hub',
    entityMetric: {
      label: 'Llama-3 Cluster',
      value: 88
    },
    connectedNodeIds: ['note-1', 'note-3']
  },
  {
    id: 'note-6',
    title: 'Neural Link Protocol v2',
    type: 'architecture',
    timestamp: '3 DAYS AGO',
    category: 'Deep Work',
    summary: 'Bi-directional memory indexing specification with sub-12ms retrieval latency.',
    tags: ['NEURAL', 'SPEC'],
    icon: 'memory',
    connectedNodeIds: ['note-1', 'note-5']
  }
];
