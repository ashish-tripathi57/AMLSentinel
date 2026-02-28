export type TabKey = 'open' | 'unassigned' | 'my-alerts' | 'completed';

interface TabDefinition {
  key: TabKey;
  label: string;
  countKey: keyof AlertQueueTabCounts;
}

export interface AlertQueueTabCounts {
  open: number;
  unassigned: number;
  myAlerts: number;
  completed: number;
}

interface AlertQueueTabsProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  counts: AlertQueueTabCounts;
}

const TABS: TabDefinition[] = [
  { key: 'open', label: 'Open', countKey: 'open' },
  { key: 'unassigned', label: 'Unassigned', countKey: 'unassigned' },
  { key: 'my-alerts', label: 'My Alerts', countKey: 'myAlerts' },
  { key: 'completed', label: 'Completed', countKey: 'completed' },
];

/**
 * Horizontal tab bar for the Alert Queue page.
 * Provides four views: Open, Unassigned, My Alerts, and Completed.
 * Active tab is indicated by a primary blue bottom border.
 */
export function AlertQueueTabs({ activeTab, onTabChange, counts }: AlertQueueTabsProps) {
  return (
    <div role="tablist" className="flex border-b border-card-border">
      {TABS.map((tab) => {
        const isActive = activeTab === tab.key;
        const count = counts[tab.countKey];

        return (
          <button
            key={tab.key}
            role="tab"
            aria-selected={isActive}
            onClick={() => onTabChange(tab.key)}
            className={`
              flex items-center gap-2 px-4 py-2.5 text-sm font-medium
              transition-colors border-b-2 -mb-px
              ${isActive
                ? 'border-primary text-primary'
                : 'border-transparent text-text-secondary hover:text-text-primary hover:border-card-border'
              }
            `}
          >
            {tab.label}
            <span
              className={`
                inline-flex items-center justify-center min-w-[20px] h-5 px-1.5
                rounded-full text-xs font-semibold
                ${isActive ? 'bg-primary/10 text-primary' : 'bg-card-border text-text-muted'}
              `}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
