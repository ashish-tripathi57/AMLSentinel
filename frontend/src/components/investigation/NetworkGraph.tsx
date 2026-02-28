import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ForceGraph2D, { type ForceGraphMethods } from 'react-force-graph-2d';
import { LoadingSpinner } from '../common';
import { useNetworkGraph } from '../../hooks/use-network-graph';
import { formatCurrency } from '../../utils/format-currency';
import type { NetworkNode, NetworkEdge } from '../../types/investigation';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface NetworkGraphProps {
  alertId: string;
}

// ---------------------------------------------------------------------------
// Visual constants
// ---------------------------------------------------------------------------

const NODE_COLOR: Record<string, string> = {
  account: '#6B7280',
  counterparty: '#F59E0B',
};

const NODE_RADIUS: Record<string, number> = {
  account: 16,
  counterparty: 10,
};

const DEFAULT_NODE_COLOR = '#6B7280';
const DEFAULT_NODE_RADIUS = 7;

// Edge colors by transaction direction
const CREDIT_COLOR = '#059669'; // Green — money flowing in
const DEBIT_COLOR = '#DC2626';  // Red — money flowing out
const DEFAULT_EDGE_COLOR = '#94A3B8';

const EDGE_WIDTH = 2.5;
const ARROW_LENGTH = 7;

const GRAPH_HEIGHT = 520;

// ---------------------------------------------------------------------------
// Tooltip
// ---------------------------------------------------------------------------

interface TooltipState {
  visible: boolean;
  lines: string[];
}

// ---------------------------------------------------------------------------
// Resolved link type (react-force-graph replaces string ids with objects)
// ---------------------------------------------------------------------------

interface ResolvedLink {
  source: { x?: number; y?: number };
  target: { x?: number; y?: number };
  amount: number;
  type: string;
  date: string;
  direction: string;
  counterparty: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Stable force-directed network graph for an alert's transaction network.
 *
 * - Account nodes (gray) are the central hubs; counterparties (orange) radiate outward.
 * - Customer node is omitted — we're already in that customer's investigation.
 * - Edges show transaction amounts; hovering edges shows full transaction details.
 * - Graph settles quickly into a stable, non-wobbly layout.
 */
export function NetworkGraph({ alertId }: NetworkGraphProps) {
  const { network, isLoading, error } = useNetworkGraph(alertId);

  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<ForceGraphMethods | undefined>(undefined);
  const mousePos = useRef({ x: 0, y: 0 });

  // Stable width: measure once, update on window resize
  const [containerWidth, setContainerWidth] = useState(800);
  useEffect(() => {
    function measure() {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    }
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  // Track mouse position relative to the container for tooltip placement
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    function onMouseMove(e: MouseEvent) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      mousePos.current = { x: e.clientX - rect.left + 14, y: e.clientY - rect.top - 10 };
    }
    el.addEventListener('mousemove', onMouseMove);
    return () => el.removeEventListener('mousemove', onMouseMove);
  }, []);

  const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, lines: [] });
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // Configure d3 forces once for clean radial spacing
  const forcesConfigured = useRef(false);
  useEffect(() => {
    const fg = graphRef.current;
    if (!fg || forcesConfigured.current) return;
    forcesConfigured.current = true;
    fg.d3Force('charge')?.strength(-400);
    fg.d3Force('link')?.distance(150);
  });

  /** Draw a node: small circle + label below. */
  const drawNode = useCallback(
    (node: { x?: number; y?: number; label?: string; type?: string }, ctx: CanvasRenderingContext2D) => {
      const x = node.x ?? 0;
      const y = node.y ?? 0;
      const type = node.type ?? '';
      const radius = NODE_RADIUS[type] ?? DEFAULT_NODE_RADIUS;
      const color = NODE_COLOR[type] ?? DEFAULT_NODE_COLOR;
      const label = node.label ?? '';

      // Circle with white border
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Label below node — small, readable
      const maxChars = type === 'account' ? 22 : 18;
      const displayLabel = label.length > maxChars ? label.slice(0, maxChars - 1) + '…' : label;
      ctx.font = '9px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = '#475569';
      ctx.fillText(displayLabel, x, y + radius + 4);
    },
    []
  );

  /** Draw edge amount label at midpoint. */
  const drawLinkLabel = useCallback(
    (link: object, ctx: CanvasRenderingContext2D) => {
      const l = link as ResolvedLink;
      const sx = l.source?.x;
      const sy = l.source?.y;
      const tx = l.target?.x;
      const ty = l.target?.y;
      if (sx == null || tx == null || sy == null || ty == null) return;
      if (l.amount === 0) return;

      const midX = (sx + tx) / 2;
      const midY = (sy + ty) / 2;
      const amountText = formatCurrency(l.amount);

      ctx.font = '8px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // White background pill for readability
      const metrics = ctx.measureText(amountText);
      const px = 3;
      const py = 2;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.fillRect(midX - metrics.width / 2 - px, midY - 5 - py, metrics.width + px * 2, 10 + py * 2);

      ctx.fillStyle = '#64748B';
      ctx.fillText(amountText, midX, midY);
    },
    []
  );

  /** Resolve edge color based on transaction direction. */
  const getEdgeColor = useCallback((link: object) => {
    const dir = (link as ResolvedLink).direction;
    if (dir === 'credit') return CREDIT_COLOR;
    if (dir === 'debit') return DEBIT_COLOR;
    return DEFAULT_EDGE_COLOR;
  }, []);

  /** Paint the pointer hit area matching each node's radius. */
  const paintNodePointerArea = useCallback(
    (node: { x?: number; y?: number; type?: string }, color: string, ctx: CanvasRenderingContext2D) => {
      const r = NODE_RADIUS[node.type ?? ''] ?? DEFAULT_NODE_RADIUS;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(node.x ?? 0, node.y ?? 0, r, 0, 2 * Math.PI);
      ctx.fill();
    },
    []
  );

  /** Show tooltip with transaction details on link hover. */
  const handleLinkHover = useCallback(
    (link: object | null) => {
      if (!link) {
        setTooltip({ visible: false, lines: [] });
        return;
      }
      const l = link as { amount?: number; type?: string; date?: string; direction?: string; counterparty?: string };
      const lines: string[] = [];
      if (l.counterparty) lines.push(l.counterparty);
      if (l.amount) lines.push(`Amount: ${formatCurrency(l.amount)}`);
      if (l.type) lines.push(`Type: ${l.type.replace(/_/g, ' ')}`);
      if (l.direction) lines.push(`Direction: ${l.direction}`);
      if (l.date) lines.push(`Date: ${l.date}`);

      setTooltipPos({ ...mousePos.current });
      setTooltip({ visible: true, lines });
    },
    []
  );

  /** Show tooltip on node hover. */
  const handleNodeHover = useCallback(
    (node: NetworkNode | null) => {
      if (!node) {
        setTooltip({ visible: false, lines: [] });
        return;
      }
      const lines = [node.label, `Type: ${node.type}`];
      if (node.risk) lines.push(`Risk: ${node.risk}`);

      setTooltipPos({ ...mousePos.current });
      setTooltip({ visible: true, lines });
    },
    []
  );

  // Memoize graph data so tooltip state changes don't recreate it and restart
  // the force simulation (which causes flickering and kills hover detection).
  // Must be called before early returns to satisfy React's hook ordering rules.
  const graphData = useMemo(() => {
    if (!network) return null;

    const filteredNodes = network.nodes.filter((n) => n.type !== 'customer');
    const filteredNodeIds = new Set(filteredNodes.map((n) => n.id));

    return {
      nodes: filteredNodes.map((n) => ({ ...n })),
      links: network.edges
        .filter((e) => filteredNodeIds.has(e.source) && filteredNodeIds.has(e.target))
        .map((e: NetworkEdge) => ({
          source: e.source,
          target: e.target,
          amount: e.amount,
          type: e.type,
          date: e.date,
          direction: e.direction,
          counterparty: e.counterparty,
        })),
    };
  }, [network]);

  // Loading
  if (isLoading) {
    return (
      <div role="tabpanel" aria-label="Network Graph" className="flex flex-col items-center justify-center p-6">
        <LoadingSpinner size="lg" />
        <p className="mt-2 text-sm text-text-secondary">Loading network graph…</p>
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div role="tabpanel" aria-label="Network Graph" className="p-6">
        <div className="rounded-lg border border-severity-critical/30 bg-severity-critical/5 px-4 py-3">
          <p className="text-sm font-medium text-severity-critical">Failed to load network graph</p>
          <p className="mt-1 text-sm text-text-secondary">{error}</p>
        </div>
      </div>
    );
  }

  if (!network || !graphData) {
    return null;
  }

  return (
    <div role="tabpanel" aria-label="Network Graph" className="relative flex flex-col">
      {/* Legend */}
      <div className="flex items-center gap-4 px-6 py-3 border-b border-card-border bg-card-bg flex-wrap">
        <span className="text-xs font-medium text-text-secondary">Nodes:</span>
        {Object.entries(NODE_COLOR).map(([type, color]) => (
          <span key={type} className="flex items-center gap-1.5 text-xs text-text-secondary capitalize">
            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
            {type}
          </span>
        ))}
        <span className="ml-2 text-xs font-medium text-text-secondary">Edges:</span>
        <span className="flex items-center gap-1.5 text-xs text-text-secondary">
          <span className="inline-block w-4 h-0.5" style={{ backgroundColor: CREDIT_COLOR }} aria-hidden="true" />
          Credit (incoming)
        </span>
        <span className="flex items-center gap-1.5 text-xs text-text-secondary">
          <span className="inline-block w-4 h-0.5" style={{ backgroundColor: DEBIT_COLOR }} aria-hidden="true" />
          Debit (outgoing)
        </span>
        <span className="ml-auto text-xs text-text-muted">Hover nodes or edges for details.</span>
      </div>

      {/* Graph canvas */}
      <div ref={containerRef} className="relative" style={{ height: GRAPH_HEIGHT }}>
        <ForceGraph2D
          ref={graphRef}
          graphData={graphData}
          nodeLabel={() => ''}
          nodeCanvasObject={drawNode}
          nodePointerAreaPaint={paintNodePointerArea}
          linkColor={getEdgeColor}
          linkWidth={EDGE_WIDTH}
          linkDirectionalArrowLength={ARROW_LENGTH}
          linkDirectionalArrowRelPos={0.85}
          linkDirectionalArrowColor={getEdgeColor}
          linkCanvasObjectMode={() => 'after'}
          linkCanvasObject={drawLinkLabel}
          onNodeHover={(node) =>
            handleNodeHover(node as NetworkNode | null)
          }
          onLinkHover={(link) =>
            handleLinkHover(link)
          }
          cooldownTicks={60}
          cooldownTime={3000}
          d3AlphaDecay={0.06}
          d3VelocityDecay={0.5}
          enableNodeDrag={false}
          width={containerWidth}
          height={GRAPH_HEIGHT}
        />

        {/* Floating tooltip — positioned via tracked mouse coordinates */}
        {tooltip.visible && tooltip.lines.length > 0 && (
          <div
            role="tooltip"
            className="pointer-events-none absolute z-10 rounded-lg bg-card-bg border border-card-border shadow-lg px-3 py-2 text-xs text-text-primary"
            style={{ left: tooltipPos.x, top: tooltipPos.y, maxWidth: 260 }}
          >
            {tooltip.lines.map((line, i) => (
              <p key={i} className={i === 0 ? 'font-semibold text-text-primary' : 'text-text-secondary mt-0.5'}>
                {line}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
