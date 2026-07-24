import React, { useRef, useEffect, useMemo, useCallback, useState } from 'react';
import ForceGraph2D, { ForceGraphMethods } from 'react-force-graph-2d';
import { NoteItem, getCategoryColor } from '../types';
import { ZoomIn, ZoomOut, RotateCcw, Compass } from 'lucide-react';
import { DotField } from './DotField';

interface Graph2DProps {
  notes: NoteItem[];
  selectedNoteId: string | null;
  onSelectNote: (note: NoteItem) => void;
  onSelectTag: (tag: string) => void;
  onSelectCategory: (category: string) => void;
  /** Se incrementa cuando se quita un filtro para hacer zoom-to-fit. */
  fitTrigger: number;
}

interface CustomGraphNode {
  id: string;
  label: string;
  type: 'category' | 'tag' | 'note';
  color: string;
  val: number;
  note?: NoteItem;
  x?: number;
  y?: number;
}

interface CustomGraphLink {
  source: string;
  target: string;
  color?: string;
  value?: number;
}

export const Graph2D: React.FC<Graph2DProps> = ({
  notes,
  selectedNoteId,
  onSelectNote,
  onSelectTag,
  onSelectCategory,
  fitTrigger,
}) => {
  const fgRef = useRef<ForceGraphMethods | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }
  };

  useEffect(() => {
    if (!containerRef.current) return;
    const updateSize = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        if (clientWidth > 0 && clientHeight > 0) {
          setContainerSize({ width: clientWidth, height: clientHeight });
        }
      }
    };
    updateSize();
    const resizeObserver = new ResizeObserver(() => updateSize());
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  const graphData = useMemo(() => {
    const nodes: CustomGraphNode[] = [];
    const links: CustomGraphLink[] = [];
    const nodeIdsSet = new Set<string>();
    const tagSet = new Set<string>();

    // 1. Category hub nodes — dinámicos desde las notas
    const categories = new Set<string>();
    notes.forEach((n) => categories.add(n.category));
    categories.forEach((cat) => {
      const id = `cat-${cat}`;
      nodes.push({
        id,
        label: cat,
        type: 'category',
        color: getCategoryColor(cat),
        val: 18,
      });
      nodeIdsSet.add(id);
    });

    // 2. Note nodes + tag collection + category links
    notes.forEach((note) => {
      nodes.push({
        id: note.id,
        label: note.title,
        type: 'note',
        color: '#ffffff',
        val: 8,
        note,
      });
      nodeIdsSet.add(note.id);

      // Note → Category link
      const catNodeId = `cat-${note.category}`;
      if (nodeIdsSet.has(catNodeId)) {
        links.push({
          source: catNodeId,
          target: note.id,
          color: getCategoryColor(note.category) || '#27272a',
          value: 2,
        });
      }

      // Note → Tag links
      note.tags.forEach((tag) => {
        tagSet.add(tag);
        links.push({
          source: note.id,
          target: `tag-${tag}`,
          color: '#7e7576',
          value: 1,
        });
      });
    });

    // 3. Tag nodes
    tagSet.forEach((tag) => {
      const id = `tag-${tag}`;
      nodes.push({ id, label: `#${tag}`, type: 'tag', color: '#7e7576', val: 10 });
      nodeIdsSet.add(id);
    });

    // 4. Direct note-to-note links (share a tag)
    for (let i = 0; i < notes.length; i++) {
      for (let j = i + 1; j < notes.length; j++) {
        const a = notes[i];
        const b = notes[j];
        if (a.tags.some((t) => b.tags.includes(t))) {
          links.push({
            source: a.id,
            target: b.id,
            color: '#c8bfff',
            value: 0.4,
          });
        }
      }
    }

    // 5. Direct note-to-note links (same category)
    for (let i = 0; i < notes.length; i++) {
      for (let j = i + 1; j < notes.length; j++) {
        const a = notes[i];
        const b = notes[j];
        if (a.category === b.category) {
          links.push({
            source: a.id,
            target: b.id,
            color: getCategoryColor(a.category) || '#ffffff',
            value: 0.3,
          });
        }
      }
    }

    const validLinks = links.filter(
      (l) => nodeIdsSet.has(l.source) && nodeIdsSet.has(l.target),
    );

    return { nodes, links: validLinks };
  }, [notes]);

  const handleNodeClick = useCallback(
    (node: any) => {
      if (fgRef.current && node.x !== undefined && node.y !== undefined) {
        fgRef.current.centerAt(node.x, node.y, 1000);
        fgRef.current.zoom(3.5, 1000);
      }
      if (node.type === 'note' && node.note) {
        onSelectNote(node.note);
      } else if (node.type === 'tag') {
        const tagName = (node.label as string).replace(/^#/, '');
        onSelectTag(tagName);
      } else if (node.type === 'category') {
        onSelectCategory(node.label as string);
      }
    },
    [onSelectNote, onSelectTag, onSelectCategory],
  );

  useEffect(() => {
    if (!selectedNoteId || !fgRef.current) return;
    const targetNode = graphData.nodes.find((n: any) => n.id === selectedNoteId);
    if (targetNode && targetNode.x !== undefined && targetNode.y !== undefined) {
      fgRef.current.centerAt(targetNode.x, targetNode.y, 1000);
      fgRef.current.zoom(3.5, 1000);
    }
  }, [selectedNoteId, graphData]);

  // Zoom-to-fit cuando se quita un filtro (fitTrigger incrementa).
  // No corre en el primer render (fitTrigger inicia en 0).
  useEffect(() => {
    if (fitTrigger > 0 && fgRef.current) {
      const id = setTimeout(() => {
        fgRef.current?.zoomToFit(800, 40);
      }, 400);
      return () => clearTimeout(id);
    }
  }, [fitTrigger]);

  const handleRenderNode = useCallback(
    (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const label = node.label || node.id;
      const isSelected = node.id === selectedNoteId;
      const isHovered = node.id === hoveredNodeId;
      const r = node.type === 'category' ? 12 : node.type === 'tag' ? 7 : 5;

      if (isSelected) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, r + 8 / Math.max(globalScale, 1), 0, 2 * Math.PI, false);
        ctx.fillStyle = 'rgba(254, 118, 116, 0.25)';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(node.x, node.y, r + 4 / Math.max(globalScale, 1), 0, 2 * Math.PI, false);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2 / globalScale;
        ctx.stroke();
      } else if (isHovered) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, r + 4 / Math.max(globalScale, 1), 0, 2 * Math.PI, false);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(node.x, node.y, r, 0, 2 * Math.PI, false);
      ctx.fillStyle = node.color || '#ffffff';
      ctx.fill();
      ctx.lineWidth = 1.5 / Math.max(globalScale, 0.5);
      ctx.strokeStyle = isSelected ? '#ffffff' : '#1d1a23';
      ctx.stroke();

      const fontSize = node.type === 'category' ? 12 / Math.max(globalScale, 0.8) : 9 / Math.max(globalScale, 0.8);
      ctx.font = `${node.type === 'category' ? 'bold' : 'normal'} ${fontSize}px 'DM Sans', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = isSelected ? '#ffffff' : node.type === 'category' ? '#ffffff' : '#cfc4c5';
      const displayLabel = label.length > 28 ? label.substring(0, 25) + '...' : label;
      ctx.fillText(displayLabel, node.x, node.y + r + 3);
    },
    [selectedNoteId, hoveredNodeId],
  );

  return (
    <section
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setMousePos(null)}
      className="w-full h-full relative rounded-[1.5rem] sm:rounded-[2rem] overflow-hidden bg-[#1d1a23] border border-[#27272a] group shadow-2xl flex flex-col"
    >
      <DotField width={containerSize.width} height={containerSize.height} mousePos={mousePos} />

      <div className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing z-10">
        <ForceGraph2D
          ref={fgRef}
          width={containerSize.width}
          height={containerSize.height}
          graphData={graphData}
          nodeLabel={(node: any) => `${node.type.toUpperCase()}: ${node.label}`}
          nodeCanvasObject={handleRenderNode}
          nodePointerAreaPaint={(node: any, color: string, ctx: CanvasRenderingContext2D) => {
            const r = node.type === 'category' ? 14 : 9;
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(node.x, node.y, r, 0, 2 * Math.PI, false);
            ctx.fill();
          }}
          onNodeClick={handleNodeClick}
          onNodeHover={(node: any) => setHoveredNodeId(node ? node.id : null)}
          linkColor={(link: any) => link.color || '#27272a'}
          linkWidth={1.5}
          linkDirectionalParticles={2}
          linkDirectionalParticleWidth={2}
          linkDirectionalParticleSpeed={0.005}
          linkDirectionalParticleColor={() => '#c8bfff'}
          backgroundColor="rgba(0,0,0,0)"
          d3AlphaDecay={0.02}
          d3VelocityDecay={0.3}
        />
      </div>

      {/* Controls */}
      <div className="absolute bottom-3 right-3 sm:bottom-6 sm:right-6 z-20 pointer-events-auto">
        <div className="bg-[#0f0d15]/90 backdrop-blur-xl px-4 py-2 rounded-full border border-[#27272a]/90 flex items-center gap-3 shadow-2xl">
          <button onClick={() => { fgRef.current?.centerAt(0, 0, 800); fgRef.current?.zoom(1, 800); }} className="p-1 text-[#a1999a] hover:text-white transition-colors active:scale-90" title="Reset">
            <RotateCcw className="w-4 h-4" />
          </button>
          <div className="w-[1px] h-4 bg-[#27272a]" />
          <button onClick={() => fgRef.current?.zoomToFit(1000, 40)} className="p-1 text-[#a1999a] hover:text-white transition-colors active:scale-90" title="Fit">
            <Compass className="w-4 h-4" />
          </button>
          <div className="w-[1px] h-4 bg-[#27272a]" />
          <button onClick={() => fgRef.current?.zoom((fgRef.current.zoom() || 1) * 1.4, 400)} className="p-1 text-[#a1999a] hover:text-white transition-colors active:scale-90" title="Zoom In">
            <ZoomIn className="w-4 h-4" />
          </button>
          <button onClick={() => fgRef.current?.zoom((fgRef.current.zoom() || 1) / 1.4, 400)} className="p-1 text-[#a1999a] hover:text-white transition-colors active:scale-90" title="Zoom Out">
            <ZoomOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-3 left-3 sm:bottom-6 sm:left-6 z-20 pointer-events-none">
        <div className="hidden xl:flex items-center gap-2 bg-[#0f0d15]/85 backdrop-blur-xl px-3 py-2 rounded-full border border-[#27272a] text-[10px] font-bold text-[#cfc4c5] pointer-events-auto">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-white" /> Category
          </span>
          <span className="text-[#27272a]">|</span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#c8bfff]" /> Shared
          </span>
          <span className="text-[#27272a]">|</span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#7e7576]" /> Tag
          </span>
        </div>
      </div>
    </section>
  );
};
