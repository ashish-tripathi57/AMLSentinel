import { useState } from 'react';
import { useChecklist } from '../../hooks/use-checklist';
import { Card, CardHeader, CardContent, LoadingSpinner, EmptyState } from '../common';

interface ChecklistProps {
  alertId: string;
  analystUsername: string;
}

/**
 * Renders a per-typology investigation checklist with manual toggle and
 * AI auto-check capabilities. Items are displayed in sort_order.
 */
export function Checklist({ alertId, analystUsername }: ChecklistProps) {
  const { items, isLoading, error, toggleItem, autoCheckItem } = useChecklist(alertId);
  const [autoCheckingId, setAutoCheckingId] = useState<string | null>(null);

  async function handleToggle(itemId: string, currentlyChecked: boolean) {
    await toggleItem(itemId, !currentlyChecked, analystUsername);
  }

  async function handleAutoCheck(itemId: string) {
    setAutoCheckingId(itemId);
    try {
      await autoCheckItem(itemId);
    } finally {
      setAutoCheckingId(null);
    }
  }

  if (isLoading) {
    return (
      <div role="tabpanel" id="tabpanel-checklist" aria-label="Checklist" className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div role="tabpanel" id="tabpanel-checklist" aria-label="Checklist" className="p-6">
        <EmptyState title="Failed to load checklist" description={error} />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div role="tabpanel" id="tabpanel-checklist" aria-label="Checklist" className="p-6">
        <EmptyState title="No checklist items" description="No checklist template is configured for this alert's typology." />
      </div>
    );
  }

  const checkedCount = items.filter((i) => i.is_checked).length;

  return (
    <div role="tabpanel" id="tabpanel-checklist" aria-label="Checklist" className="p-6 space-y-4">
      {/* Progress */}
      <Card>
        <CardContent>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-text-primary">
              Progress: {checkedCount} / {items.length}
            </span>
            <div className="w-48 h-2 bg-page-bg rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${(checkedCount / items.length) * 100}%` }}
                role="progressbar"
                aria-valuenow={checkedCount}
                aria-valuemin={0}
                aria-valuemax={items.length}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Checklist items */}
      <Card>
        <CardHeader>
          <h3 className="text-sm font-semibold text-text-primary">Investigation Checklist</h3>
        </CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y divide-card-border">
            {items.map((item) => (
              <li key={item.id} className="px-4 py-3">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={item.is_checked}
                    onChange={() => handleToggle(item.id, item.is_checked)}
                    className="mt-0.5 h-4 w-4 rounded border-card-border text-primary focus:ring-primary/50"
                    aria-label={item.description}
                  />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${item.is_checked ? 'text-text-muted line-through' : 'text-text-primary'}`}>
                      {item.description}
                    </p>
                    {item.checked_by && (
                      <p className="mt-1 text-xs text-text-muted">
                        Checked by: <span className="font-medium">{item.checked_by}</span>
                      </p>
                    )}
                    {item.ai_rationale && (
                      <div className="mt-2 rounded bg-primary/5 border border-primary/20 px-3 py-2">
                        <p className="text-xs font-medium text-primary mb-1">AI Rationale</p>
                        <p className="text-xs text-text-secondary">{item.ai_rationale}</p>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleAutoCheck(item.id)}
                    disabled={autoCheckingId === item.id}
                    className="shrink-0 px-3 py-1 text-xs font-medium text-primary border border-primary/30 rounded hover:bg-primary/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Let AI auto-check this item"
                  >
                    {autoCheckingId === item.id ? 'Checking...' : 'AI Check'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
