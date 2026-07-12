import { useEffect, useMemo, useRef, useState } from "react";
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  type Simulation,
} from "d3-force";
import { api, type GraphData } from "../api";

interface SimNode {
  path: string;
  title?: string;
  type?: string;
  links: number;
  x: number;
  y: number;
  fx?: number | null;
  fy?: number | null;
}

interface SimLink {
  source: SimNode;
  target: SimNode;
}

// Channel palette, assigned to types in first-seen order.
const PALETTE = ["#64c8ff", "#a78bfa", "#34d399", "#fbbf24", "#f87171", "#f472b6", "#2dd4bf", "#a3e635"];

const radius = (n: SimNode) => 5 + Math.sqrt(n.links) * 3.5;

/**
 * Obsidian-style force-directed view of the memory graph.
 * Drag nodes, pan the background, scroll to zoom, hover to highlight a
 * node's neighborhood, click to open the concept. Orphans get a red ring.
 */
export function GraphView({
  refreshKey,
  onNavigate,
}: {
  refreshKey: number;
  onNavigate: (path: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const simRef = useRef<Simulation<SimNode, SimLink> | null>(null);
  const [nodes, setNodes] = useState<SimNode[]>([]);
  const [links, setLinks] = useState<SimLink[]>([]);
  const [tick, setTick] = useState(0);
  const [hovered, setHovered] = useState<string | null>(null);
  const [view, setView] = useState({ x: 0, y: 0, k: 1 });
  const dragRef = useRef<{ mode: "node" | "pan"; node?: SimNode; lastX: number; lastY: number } | null>(null);

  // Build / rebuild the simulation when data changes.
  useEffect(() => {
    let cancelled = false;
    api.graph().then((graph: GraphData) => {
      if (cancelled) return;
      const width = containerRef.current?.clientWidth ?? 800;
      const height = containerRef.current?.clientHeight ?? 600;
      const simNodes: SimNode[] = graph.nodes.map((n, i) => ({
        path: n.path,
        title: n.title,
        type: n.type,
        links: n.links,
        // Deterministic ring layout as the starting position.
        x: width / 2 + 120 * Math.cos((2 * Math.PI * i) / Math.max(1, graph.nodes.length)),
        y: height / 2 + 120 * Math.sin((2 * Math.PI * i) / Math.max(1, graph.nodes.length)),
      }));
      const byPath = new Map(simNodes.map((n) => [n.path, n]));
      const simLinks: SimLink[] = graph.edges
        .filter((e) => byPath.has(e.source) && byPath.has(e.target))
        .map((e) => ({ source: byPath.get(e.source)!, target: byPath.get(e.target)! }));

      simRef.current?.stop();
      const sim = forceSimulation<SimNode>(simNodes)
        .force("charge", forceManyBody().strength(-220))
        .force("link", forceLink<SimNode, SimLink>(simLinks).distance(90).strength(0.6))
        .force("center", forceCenter(width / 2, height / 2))
        .force("collide", forceCollide<SimNode>((n) => radius(n) + 6))
        .on("tick", () => setTick((t) => t + 1));
      simRef.current = sim;
      setNodes(simNodes);
      setLinks(simLinks);
      setView({ x: 0, y: 0, k: 1 });
    });
    return () => {
      cancelled = true;
      simRef.current?.stop();
    };
  }, [refreshKey]);

  const typeColors = useMemo(() => {
    const map = new Map<string, string>();
    for (const n of nodes) {
      const t = n.type ?? "unknown";
      if (!map.has(t)) map.set(t, PALETTE[map.size % PALETTE.length]);
    }
    return map;
  }, [nodes]);

  const neighbors = useMemo(() => {
    if (!hovered) return null;
    const set = new Set<string>([hovered]);
    for (const l of links) {
      if (l.source.path === hovered) set.add(l.target.path);
      if (l.target.path === hovered) set.add(l.source.path);
    }
    return set;
  }, [hovered, links]);

  // ── Interaction ──────────────────────────────────────────────────────

  const toWorld = (clientX: number, clientY: number) => {
    const rect = containerRef.current!.getBoundingClientRect();
    return {
      x: (clientX - rect.left - view.x) / view.k,
      y: (clientY - rect.top - view.y) / view.k,
    };
  };

  const onPointerDown = (e: React.PointerEvent, node?: SimNode) => {
    e.preventDefault();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    dragRef.current = { mode: node ? "node" : "pan", node, lastX: e.clientX, lastY: e.clientY };
    if (node) {
      node.fx = node.x;
      node.fy = node.y;
      simRef.current?.alphaTarget(0.3).restart();
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    if (drag.mode === "node" && drag.node) {
      const w = toWorld(e.clientX, e.clientY);
      drag.node.fx = w.x;
      drag.node.fy = w.y;
    } else {
      setView((v) => ({ ...v, x: v.x + e.clientX - drag.lastX, y: v.y + e.clientY - drag.lastY }));
      drag.lastX = e.clientX;
      drag.lastY = e.clientY;
    }
  };

  const onPointerUp = () => {
    const drag = dragRef.current;
    if (drag?.node) {
      drag.node.fx = null;
      drag.node.fy = null;
      simRef.current?.alphaTarget(0);
    }
    dragRef.current = null;
  };

  const onWheel = (e: React.WheelEvent) => {
    const rect = containerRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    setView((v) => {
      const k = Math.min(4, Math.max(0.25, v.k * (e.deltaY < 0 ? 1.15 : 1 / 1.15)));
      // Zoom around the cursor.
      return { k, x: mx - ((mx - v.x) / v.k) * k, y: my - ((my - v.y) / v.k) * k };
    });
  };

  const showAllLabels = nodes.length <= 60;
  void tick; // positions live on the mutable sim nodes; tick just re-renders

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden bg-zinc-950">
      {/* Legend */}
      <div className="absolute left-3 top-3 z-10 space-y-1 rounded-lg border border-zinc-800 bg-zinc-900/80 p-2 text-xs">
        {[...typeColors.entries()].map(([t, c]) => (
          <div key={t} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: c }} />
            <span className="text-zinc-300">{t}</span>
          </div>
        ))}
        {nodes.some((n) => n.links === 0) && (
          <div className="flex items-center gap-2 border-t border-zinc-800 pt-1">
            <span className="h-2.5 w-2.5 rounded-full border border-red-500" />
            <span className="text-zinc-400">orphan (unlinked)</span>
          </div>
        )}
      </div>
      <div className="absolute bottom-3 left-3 z-10 text-[11px] text-zinc-600">
        {nodes.length} concepts · {links.length} links — drag nodes · scroll to zoom · click to open
      </div>

      <svg
        className="h-full w-full cursor-grab active:cursor-grabbing"
        onPointerDown={(e) => onPointerDown(e)}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onWheel={onWheel}
      >
        <g transform={`translate(${view.x},${view.y}) scale(${view.k})`}>
          {links.map((l, i) => {
            const dim = neighbors && !(neighbors.has(l.source.path) && neighbors.has(l.target.path));
            return (
              <line
                key={i}
                x1={l.source.x}
                y1={l.source.y}
                x2={l.target.x}
                y2={l.target.y}
                stroke="#3f3f46"
                strokeWidth={1.2 / view.k}
                opacity={dim ? 0.12 : 0.7}
              />
            );
          })}
          {nodes.map((n) => {
            const color = typeColors.get(n.type ?? "unknown") ?? "#64c8ff";
            const dim = neighbors && !neighbors.has(n.path);
            const r = radius(n);
            return (
              <g
                key={n.path}
                transform={`translate(${n.x},${n.y})`}
                opacity={dim ? 0.18 : 1}
                className="cursor-pointer"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  onPointerDown(e, n);
                }}
                onPointerEnter={() => setHovered(n.path)}
                onPointerLeave={() => setHovered(null)}
                onClick={() => {
                  // Suppress click-after-drag: only navigate if the node barely moved.
                  onNavigate(n.path);
                }}
              >
                {n.links === 0 && (
                  <circle r={r + 3} fill="none" stroke="#ef4444" strokeWidth={1.5 / view.k} opacity={0.8} />
                )}
                <circle r={r + 5} fill={color} opacity={hovered === n.path ? 0.25 : 0} />
                <circle r={r} fill={color} stroke="#18181b" strokeWidth={1.5} />
                {(showAllLabels || hovered === n.path || (neighbors?.has(n.path) ?? false)) && (
                  <text
                    y={r + 14 / view.k}
                    textAnchor="middle"
                    fill="#d4d4d8"
                    fontSize={12 / view.k}
                    style={{ pointerEvents: "none", userSelect: "none" }}
                  >
                    {n.title ?? n.path.split("/").pop()}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
