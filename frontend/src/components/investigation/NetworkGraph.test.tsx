import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { NetworkGraph } from './NetworkGraph';
import { useNetworkGraph } from '../../hooks/use-network-graph';
import type { NetworkGraph as NetworkGraphData } from '../../types/investigation';

vi.mock('../../hooks/use-network-graph', () => ({
  useNetworkGraph: vi.fn(),
}));

const mockUseNetworkGraph = vi.mocked(useNetworkGraph);

vi.mock('react-force-graph-2d', () => ({
  default: Object.assign(
    (props: Record<string, unknown>) => {
      const graphData = props.graphData as {
        nodes: { id: string; label: string; type: string }[];
        links: { amount: number; counterparty: string; direction: string; date: string; type: string }[];
      } | undefined;
      const nodeLabel = props.nodeLabel as ((node: unknown) => string) | undefined;
      const nodeCanvasObject = props.nodeCanvasObject as ((node: unknown, ctx: unknown) => void) | undefined;
      const nodePointerAreaPaint = props.nodePointerAreaPaint as ((node: unknown, color: string, ctx: unknown) => void) | undefined;
      const linkCanvasObject = props.linkCanvasObject as ((link: unknown, ctx: unknown) => void) | undefined;
      const linkColor = props.linkColor as ((link: unknown) => string) | undefined;
      const onNodeHover = props.onNodeHover as ((node: unknown, prevNode: unknown) => void) | undefined;
      const onLinkHover = props.onLinkHover as ((link: unknown, prevLink: unknown) => void) | undefined;

      const mockCtx = {
        beginPath: vi.fn(), arc: vi.fn(), fill: vi.fn(), stroke: vi.fn(),
        fillRect: vi.fn(), fillText: vi.fn(),
        measureText: vi.fn(() => ({ width: 50 })),
        fillStyle: '', strokeStyle: '', lineWidth: 0, font: '', textAlign: '', textBaseline: '',
      };

      return (
        <div data-testid="force-graph">
          {graphData?.nodes?.map((n) => (
            <span key={n.id} data-testid={`node-${n.id}`}>{n.label}</span>
          ))}
          {graphData?.nodes?.map((n) => (
            <span key={`lbl-${n.id}`} data-testid={`node-label-${n.id}`}>{nodeLabel?.(n)}</span>
          ))}
          {graphData?.nodes?.map((n) => {
            nodeCanvasObject?.({ ...n, x: 10, y: 20 }, mockCtx);
            nodePointerAreaPaint?.({ ...n, x: 10, y: 20 }, '#ff0000', mockCtx);
            return <span key={`cv-${n.id}`} data-testid={`node-canvas-${n.id}`}>rendered</span>;
          })}
          {graphData?.links?.map((l, i) => {
            linkCanvasObject?.({ ...l, source: { x: 0, y: 0 }, target: { x: 100, y: 100 } }, mockCtx);
            const color = linkColor?.(l) ?? '';
            return <span key={i} data-testid={`link-${i}`} data-color={color}>{l.amount}</span>;
          })}
          <button data-testid="hover-node" onClick={() => {
            onNodeHover?.({ id: 'n2', label: 'Account #123', type: 'account', risk: null }, null);
          }}>HoverNode</button>
          <button data-testid="hover-null" onClick={() => { onNodeHover?.(null, null); }}>HoverOut</button>
          <button data-testid="hover-link" onClick={() => {
            onLinkHover?.({ amount: 9500, type: 'deposit', date: '2024-01-10', direction: 'credit', counterparty: 'Shell Corp' }, null);
          }}>HoverLink</button>
          <button data-testid="hover-link-null" onClick={() => { onLinkHover?.(null, null); }}>HoverLinkOut</button>
          <button data-testid="link-no-coords" onClick={() => {
            linkCanvasObject?.({ amount: 500, source: {}, target: {} }, mockCtx);
          }}>LinkNoCoords</button>
          <button data-testid="link-zero" onClick={() => {
            linkCanvasObject?.({ amount: 0, source: { x: 0, y: 0 }, target: { x: 50, y: 50 } }, mockCtx);
          }}>LinkZero</button>
        </div>
      );
    },
    { __esModule: true }
  ),
}));

const MOCK_NETWORK: NetworkGraphData = {
  nodes: [
    { id: 'n2', label: 'Account #123', type: 'account', risk: null },
    { id: 'n3', label: 'Shell Corp', type: 'counterparty', risk: 'high' },
  ],
  edges: [
    { source: 'n2', target: 'n3', amount: 9500, type: 'deposit', date: '2024-01-10', direction: 'credit', counterparty: 'Shell Corp' },
  ],
};

function renderComponent(alertId = 'alert-1') {
  return render(
    <MemoryRouter><NetworkGraph alertId={alertId} /></MemoryRouter>,
  );
}

describe('NetworkGraph', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  // --- Loading ---
  it('shows loading spinner while fetching', () => {
    mockUseNetworkGraph.mockReturnValue({ network: null, isLoading: true, error: null });
    renderComponent();
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText(/loading network graph/i)).toBeInTheDocument();
  });

  it('renders loading tabpanel with correct aria-label', () => {
    mockUseNetworkGraph.mockReturnValue({ network: null, isLoading: true, error: null });
    renderComponent();
    expect(screen.getByRole('tabpanel', { name: 'Network Graph' })).toBeInTheDocument();
  });

  // --- Error ---
  it('shows error message when fetch fails', () => {
    mockUseNetworkGraph.mockReturnValue({ network: null, isLoading: false, error: 'Network data not found' });
    renderComponent();
    expect(screen.getByText(/failed to load network graph/i)).toBeInTheDocument();
    expect(screen.getByText('Network data not found')).toBeInTheDocument();
  });

  it('renders error tabpanel with correct aria-label', () => {
    mockUseNetworkGraph.mockReturnValue({ network: null, isLoading: false, error: 'oops' });
    renderComponent();
    expect(screen.getByRole('tabpanel', { name: 'Network Graph' })).toBeInTheDocument();
  });

  // --- Null ---
  it('returns null when network is null, not loading, no error', () => {
    mockUseNetworkGraph.mockReturnValue({ network: null, isLoading: false, error: null });
    const { container } = renderComponent();
    expect(container.innerHTML).toBe('');
  });

  // --- Success rendering ---
  it('renders the force-graph after successful fetch', () => {
    mockUseNetworkGraph.mockReturnValue({ network: MOCK_NETWORK, isLoading: false, error: null });
    renderComponent();
    expect(screen.getByTestId('force-graph')).toBeInTheDocument();
  });

  it('renders legend with account and counterparty', () => {
    mockUseNetworkGraph.mockReturnValue({ network: MOCK_NETWORK, isLoading: false, error: null });
    renderComponent();
    expect(screen.getByText('account')).toBeInTheDocument();
    expect(screen.getByText('counterparty')).toBeInTheDocument();
  });

  it('renders legend with credit and debit edge labels', () => {
    mockUseNetworkGraph.mockReturnValue({ network: MOCK_NETWORK, isLoading: false, error: null });
    renderComponent();
    expect(screen.getByText('Credit (incoming)')).toBeInTheDocument();
    expect(screen.getByText('Debit (outgoing)')).toBeInTheDocument();
  });

  it('renders legend hint text', () => {
    mockUseNetworkGraph.mockReturnValue({ network: MOCK_NETWORK, isLoading: false, error: null });
    renderComponent();
    expect(screen.getByText(/hover nodes or edges for details/i)).toBeInTheDocument();
  });

  it('renders success tabpanel with correct aria-label', () => {
    mockUseNetworkGraph.mockReturnValue({ network: MOCK_NETWORK, isLoading: false, error: null });
    renderComponent();
    expect(screen.getByRole('tabpanel', { name: 'Network Graph' })).toBeInTheDocument();
  });

  // --- Filters out customer nodes ---
  it('filters out customer nodes from graph data', () => {
    const net: NetworkGraphData = {
      nodes: [
        { id: 'c1', label: 'Customer', type: 'customer', risk: 'high' },
        { id: 'a1', label: 'Account', type: 'account', risk: null },
      ],
      edges: [{ source: 'c1', target: 'a1', amount: 0, type: 'owns', date: '', direction: '', counterparty: '' }],
    };
    mockUseNetworkGraph.mockReturnValue({ network: net, isLoading: false, error: null });
    renderComponent();
    expect(screen.queryByTestId('node-c1')).not.toBeInTheDocument();
    expect(screen.getByTestId('node-a1')).toBeInTheDocument();
  });

  // --- Canvas callbacks ---
  it('renders all nodes via nodeCanvasObject', () => {
    mockUseNetworkGraph.mockReturnValue({ network: MOCK_NETWORK, isLoading: false, error: null });
    renderComponent();
    expect(screen.getByTestId('node-canvas-n2')).toHaveTextContent('rendered');
    expect(screen.getByTestId('node-canvas-n3')).toHaveTextContent('rendered');
  });

  it('exercises nodeCanvasObject for unknown node types', () => {
    const net: NetworkGraphData = {
      nodes: [{ id: 'x1', label: 'Mystery', type: 'other' as 'account', risk: null }],
      edges: [],
    };
    mockUseNetworkGraph.mockReturnValue({ network: net, isLoading: false, error: null });
    renderComponent();
    expect(screen.getByTestId('node-canvas-x1')).toBeInTheDocument();
  });

  it('renders link amounts via linkCanvasObject', () => {
    mockUseNetworkGraph.mockReturnValue({ network: MOCK_NETWORK, isLoading: false, error: null });
    renderComponent();
    expect(screen.getByTestId('link-0')).toHaveTextContent('9500');
  });

  it('colors credit edges green and debit edges red', () => {
    const net: NetworkGraphData = {
      nodes: [
        { id: 'a1', label: 'Account', type: 'account', risk: null },
        { id: 'cp1', label: 'Corp A', type: 'counterparty', risk: null },
        { id: 'cp2', label: 'Corp B', type: 'counterparty', risk: null },
      ],
      edges: [
        { source: 'cp1', target: 'a1', amount: 5000, type: 'deposit', date: '2024-01-10', direction: 'credit', counterparty: 'Corp A' },
        { source: 'a1', target: 'cp2', amount: 3000, type: 'withdrawal', date: '2024-01-11', direction: 'debit', counterparty: 'Corp B' },
      ],
    };
    mockUseNetworkGraph.mockReturnValue({ network: net, isLoading: false, error: null });
    renderComponent();
    expect(screen.getByTestId('link-0').getAttribute('data-color')).toBe('#059669');
    expect(screen.getByTestId('link-1').getAttribute('data-color')).toBe('#DC2626');
  });

  it('handles linkCanvasObject with missing coordinates', () => {
    mockUseNetworkGraph.mockReturnValue({ network: MOCK_NETWORK, isLoading: false, error: null });
    renderComponent();
    fireEvent.click(screen.getByTestId('link-no-coords'));
  });

  it('skips label for zero-amount edges', () => {
    mockUseNetworkGraph.mockReturnValue({ network: MOCK_NETWORK, isLoading: false, error: null });
    renderComponent();
    fireEvent.click(screen.getByTestId('link-zero'));
  });

  // --- nodeLabel ---
  it('returns empty string for node labels (suppresses default tooltip)', () => {
    mockUseNetworkGraph.mockReturnValue({ network: MOCK_NETWORK, isLoading: false, error: null });
    renderComponent();
    expect(screen.getByTestId('node-label-n2').textContent).toBe('');
  });

  // --- Node hover tooltip ---
  it('shows tooltip when hovering a node', () => {
    mockUseNetworkGraph.mockReturnValue({ network: MOCK_NETWORK, isLoading: false, error: null });
    renderComponent();
    fireEvent.click(screen.getByTestId('hover-node'));
    const tip = screen.getByRole('tooltip');
    expect(tip).toHaveTextContent('Account #123');
    expect(tip).toHaveTextContent('Type: account');
  });

  it('hides tooltip when hover leaves a node', () => {
    mockUseNetworkGraph.mockReturnValue({ network: MOCK_NETWORK, isLoading: false, error: null });
    renderComponent();
    fireEvent.click(screen.getByTestId('hover-node'));
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('hover-null'));
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  // --- Link hover tooltip (transaction details) ---
  it('shows transaction details when hovering a link', () => {
    mockUseNetworkGraph.mockReturnValue({ network: MOCK_NETWORK, isLoading: false, error: null });
    renderComponent();
    fireEvent.click(screen.getByTestId('hover-link'));
    const tip = screen.getByRole('tooltip');
    expect(tip).toHaveTextContent('Shell Corp');
    expect(tip).toHaveTextContent('Direction: credit');
    expect(tip).toHaveTextContent('Date: 2024-01-10');
  });

  it('hides tooltip when link hover ends', () => {
    mockUseNetworkGraph.mockReturnValue({ network: MOCK_NETWORK, isLoading: false, error: null });
    renderComponent();
    fireEvent.click(screen.getByTestId('hover-link'));
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('hover-link-null'));
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });
});
