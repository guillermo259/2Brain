import React, { useRef, useEffect, useMemo, useCallback, useState } from 'react';
import ForceGraph2D, { ForceGraphMethods } from 'react-force-graph-2d';
import { NoteItem, ContextCategory } from '../types';
import { ZoomIn, ZoomOut, RotateCcw, Maximize2, Compass } from 'lucide-react';
import { DotField } from './DotField';

interface Graph2DProps {
  notes: NoteItem[];
  selectedNoteId: string | null;
  onSelectNote: (note: NoteItem) => void;
  onSelectCategory: (category: ContextCategory) => void;
  activeCategory: ContextCategory;
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

const CATEGORY_COLORS: Record<string, string> = {
  Infrastructure: '#ffffff',
  'Deep Work': '#fe7674',
  Philosophical: '#c8bfff',
  Visuals: '#e5deff',
  Everywhere: '#f1f1f1'
};

export const Graph2D: React.FC<Graph2DProps> = ({
  notes,
  selectedNoteId,
  onSelectNote,
  onSelectCategory,
  activeCategory
}) => {
  const fgRef = useRef<ForceGraphMethods | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setMousePos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  };

  // Update container size on resize with ResizeObserver
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

    const resizeObserver = new ResizeObserver(() => {
      updateSize();
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Construct Nodes & Links
  const graphData = useMemo(() => {
    const nodes: CustomGraphNode[] = [];
    const links: CustomGraphLink[] = [];
    const nodeIdsSet = new Set<string>();

    // 1. Add Main Category Hub Nodes
    const categories: ContextCategory[] = ['Infrastructure', 'Deep Work', 'Philosophical', 'Visuals'];
    categories.forEach((cat) => {
      const id = `cat-${cat}`;
      nodes.push({
        id,
        label: cat,
        type: 'category',
        color: CATEGORY_COLORS[cat] || '#ffffff',
        val: 18
      });
      nodeIdsSet.add(id);
    });

    // 2. Add Tag Nodes & Note Nodes
    const tagSet = new Set<string>();

    notes.forEach((note) => {
      // Note Node
      nodes.push({
        id: note.id,
        label: note.title,
        type: 'note',
        color:
          note.type === 'voice'
            ? '#fe7674'
            : note.type === 'entity'
            ? '#c8bfff'
            : note.type === 'checklist'
            ? '#a83638'
            : note.type === 'visual'
            ? '#e5deff'
            : '#ffffff',
        val: 8,
        note
      });
      nodeIdsSet.add(note.id);

      // Connect Note to Category
      const catNodeId = `cat-${note.category}`;
      if (nodeIdsSet.has(catNodeId)) {
        links.push({
          source: catNodeId,
          target: note.id,
          color: CATEGORY_COLORS[note.category] || '#27272a',
          value: 2
        });
      }

      // Collect Tags
      note.tags.forEach((tag) => {
        tagSet.add(tag);

        // Connect Note to Tag
        const tagNodeId = `tag-${tag}`;
        links.push({
          source: note.id,
          target: tagNodeId,
          color: '#7e7576',
          value: 1
        });
      });

      // Connect explicitly linked notes
      note.connectedNodeIds.forEach((targetId) => {
        if (targetId !== note.id) {
          links.push({
            source: note.id,
            target: targetId,
            color: '#c8bfff',
            value: 1.5
          });
        }
      });
    });

    // 3. Add Tag Nodes
    tagSet.forEach((tag) => {
      const id = `tag-${tag}`;
      nodes.push({
        id,
        label: `#${tag}`,
        type: 'tag',
        color: '#7e7576',
        val: 10
      });
      nodeIdsSet.add(id);
    });

    // Clean links to ensure both source & target exist in nodeIdsSet
    const validLinks = links.filter(
      (l) => nodeIdsSet.has(l.source) && nodeIdsSet.has(l.target)
    );

    return { nodes, links: validLinks };
  }, [notes]);

  // Click Focus Model implementation: Zoom & Center At clicked node
  const handleNodeClick = useCallback(
    (node: any) => {
      if (fgRef.current && node.x !== undefined && node.y !== undefined) {
        // Smooth camera transition to clicked node
        fgRef.current.centerAt(node.x, node.y, 1000);
        fgRef.current.zoom(3.5, 1000);
      }

      if (node.type === 'note' && node.note) {
        onSelectNote(node.note);
      } else if (node.type === 'category') {
        const catName = node.label as ContextCategory;
        onSelectCategory(catName);
      }
    },
    [onSelectNote, onSelectCategory]
  );

  // Focus camera when selectedNoteId changes externally
  useEffect(() => {
    if (!selectedNoteId || !fgRef.current) return;
    const targetNode = graphData.nodes.find((n: any) => n.id === selectedNoteId);
    if (targetNode && targetNode.x !== undefined && targetNode.y !== undefined) {
      fgRef.current.centerAt(targetNode.x, targetNode.y, 1000);
      fgRef.current.zoom(3.5, 1000);
    }
  }, [selectedNoteId, graphData]);

  // Custom Node Canvas Painter
  const handleRenderNode = useCallback(
    (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const label = node.label || node.id;
      const isSelected = node.id === selectedNoteId;
      const isHovered = node.id === hoveredNodeId;

      const baseRadius = node.type === 'category' ? 12 : node.type === 'tag' ? 7 : 5;
      const r = baseRadius;

      // Glow / Selection pulse ring
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

      // Node Body Circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, r, 0, 2 * Math.PI, false);
      ctx.fillStyle = node.color || '#ffffff';
      ctx.fill();

      // Border Stroke
      ctx.lineWidth = 1.5 / Math.max(globalScale, 0.5);
      ctx.strokeStyle = isSelected ? '#ffffff' : '#1d1a23';
      ctx.stroke();

      // Text Label
      const fontSize = node.type === 'category' ? 12 / Math.max(globalScale, 0.8) : 9 / Math.max(globalScale, 0.8);
      ctx.font = `${node.type === 'category' ? 'bold' : 'normal'} ${fontSize}px 'DM Sans', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = isSelected
        ? '#ffffff'
        : node.type === 'category'
        ? '#ffffff'
        : '#cfc4c5';

      // Truncate long titles
      const displayLabel = label.length > 28 ? label.substring(0, 25) + '...' : label;
      ctx.fillText(displayLabel, node.x, node.y + r + 3);
    },
    [selectedNoteId, hoveredNodeId]
  );

  const handleZoomIn = () => {
    if (fgRef.current) {
      fgRef.current.zoom((fgRef.current.zoom() || 1) * 1.4, 400);
    }
  };

  const handleZoomOut = () => {
    if (fgRef.current) {
      fgRef.current.zoom((fgRef.current.zoom() || 1) / 1.4, 400);
    }
  };

  const handleZoomToFit = () => {
    if (fgRef.current) {
      fgRef.current.zoomToFit(1000, 40);
    }
  };

  const handleResetView = () => {
    if (fgRef.current) {
      fgRef.current.centerAt(0, 0, 800);
      fgRef.current.zoom(1, 800);
    }
  };

  return (
    <section 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setMousePos(null)}
      className="w-full h-full relative rounded-[1.5rem] sm:rounded-[2rem] overflow-hidden bg-[#1d1a23] border border-[#27272a] group shadow-2xl flex flex-col"
    >
      {/* Animated Interactive Background Dot Field */}
      <DotField
        width={containerSize.width}
        height={containerSize.height}
        mousePos={mousePos}
      />

      {/* ForceGraph2D Canvas */}
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

      {/* Bottom Left Legend & Focus Overlay */}
      <div className="absolute bottom-3 left-3 sm:bottom-6 sm:left-6 z-20 flex items-center gap-2 sm:gap-3 pointer-events-none max-w-[calc(100%-14rem)]">
        <div className="hidden xl:flex items-center gap-2 bg-[#0f0d15]/85 backdrop-blur-xl px-3 py-2 rounded-full border border-[#27272a] text-[10px] font-bold text-[#cfc4c5] pointer-events-auto">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-white"></span> Category Hub
          </span>
          <span className="text-[#27272a]">|</span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#7e7576]"></span> Tag Link
          </span>
          <span className="text-[#27272a]">|</span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#fe7674]"></span> Memory Node
          </span>
        </div>
      </div>

      {/* Bottom Right Floating Controls Pill Bar */}
      <div className="absolute bottom-3 right-3 sm:bottom-6 sm:right-6 z-20 pointer-events-auto">
        <div className="bg-[#0f0d15]/90 backdrop-blur-xl px-4 py-2 rounded-full border border-[#27272a]/90 flex items-center gap-3 shadow-2xl">
          <button
            onClick={handleResetView}
            className="p-1 text-[#a1999a] hover:text-white transition-colors active:scale-90"
            title="Reset Camera & Center"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-4 bg-[#27272a]"></div>

          <button
            onClick={handleZoomToFit}
            className="p-1 text-[#a1999a] hover:text-white transition-colors active:scale-90"
            title="Fit Graph to View"
          >
            <Compass className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-4 bg-[#27272a]"></div>

          <button
            onClick={handleZoomIn}
            className="p-1 text-[#a1999a] hover:text-white transition-colors active:scale-90"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <button
            onClick={handleZoomOut}
            className="p-1 text-[#a1999a] hover:text-white transition-colors active:scale-90"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
};
