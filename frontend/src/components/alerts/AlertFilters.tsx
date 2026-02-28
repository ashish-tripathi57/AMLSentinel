import { useState, useEffect } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import type { AlertFilters } from '../../types/alert';

const TYPOLOGY_OPTIONS = [
  'Structuring',
  'Unusual Geographic Activity',
  'Rapid Fund Movement',
  'Round-trip Transactions',
  'Sudden Activity Change',
  'Large Cash Transactions',
];

const STATUS_OPTIONS = ['New', 'In Progress', 'Review', 'Escalated', 'Closed'];

interface AlertFiltersProps {
  filters: AlertFilters;
  onFiltersChange: (filters: AlertFilters) => void;
}

interface FilterPillProps {
  label: string;
  onRemove: () => void;
}

/**
 * Removable filter pill tag — amber-themed matching Verilix style.
 */
function FilterPill({ label, onRemove }: FilterPillProps) {
  return (
    <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full px-3 py-1 text-xs font-medium">
      {label}
      <button
        onClick={onRemove}
        aria-label={`Remove ${label} filter`}
        className="ml-0.5 hover:text-amber-950 transition-colors"
      >
        <X className="w-3 h-3" />
      </button>
    </span>
  );
}

/**
 * Filter bar with search on the LEFT, filter button + removable pills on the RIGHT.
 * Matches the Verilix UI layout pattern.
 */
export function AlertFiltersBar({ filters, onFiltersChange }: AlertFiltersProps) {
  const [searchInput, setSearchInput] = useState(filters.search ?? '');
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  useEffect(() => {
    setSearchInput(filters.search ?? '');
  }, [filters.search]);

  function handleTypologyChange(e: React.ChangeEvent<HTMLSelectElement>) {
    onFiltersChange({ ...filters, typology: e.target.value || undefined, offset: 0 });
  }

  function handleStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    onFiltersChange({ ...filters, status: e.target.value || undefined, offset: 0 });
  }

  function handleRiskMinChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value === '' ? undefined : Number(e.target.value);
    onFiltersChange({ ...filters, risk_min: value, offset: 0 });
  }

  function handleRiskMaxChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value === '' ? undefined : Number(e.target.value);
    onFiltersChange({ ...filters, risk_max: value, offset: 0 });
  }

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      onFiltersChange({ ...filters, search: searchInput || undefined, offset: 0 });
    }
  }

  function handleSearchBlur() {
    onFiltersChange({ ...filters, search: searchInput || undefined, offset: 0 });
  }

  function handleClearAll() {
    setSearchInput('');
    onFiltersChange({ offset: 0, limit: filters.limit });
  }

  function removeFilter(key: keyof AlertFilters) {
    const updated = { ...filters, [key]: undefined, offset: 0 };
    if (key === 'search') {
      setSearchInput('');
    }
    onFiltersChange(updated);
  }

  const hasActiveFilters =
    filters.typology || filters.status || filters.risk_min !== undefined ||
    filters.risk_max !== undefined || filters.search;

  /* Build the list of active filter pills */
  const pills: { label: string; key: keyof AlertFilters }[] = [];
  if (filters.typology) {
    pills.push({ label: filters.typology, key: 'typology' });
  }
  if (filters.status) {
    pills.push({ label: filters.status, key: 'status' });
  }
  if (filters.risk_min !== undefined) {
    pills.push({ label: `Risk ${filters.risk_min}+`, key: 'risk_min' });
  }
  if (filters.risk_max !== undefined) {
    pills.push({ label: `Risk \u2264${filters.risk_max}`, key: 'risk_max' });
  }
  if (filters.search) {
    pills.push({ label: `"${filters.search}"`, key: 'search' });
  }

  return (
    <div role="search" aria-label="Alert filters" className="space-y-2">
      {/* Single row: Search on LEFT, Filter button + pills on RIGHT */}
      <div className="flex items-center justify-between gap-4">
        {/* LEFT: Search input */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
          <input
            type="text"
            placeholder="Search by case or target name..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            onBlur={handleSearchBlur}
            aria-label="Search alerts"
            className="h-8 pl-8 pr-3 text-xs border border-card-border rounded bg-card-bg text-text-primary placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-primary w-72"
          />
        </div>

        {/* RIGHT: Filter button + pills + clear */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Filter popover toggle */}
          <button
            onClick={() => setIsPopoverOpen((prev) => !prev)}
            aria-label="Filter"
            className={`
              h-8 px-3 text-xs font-medium border rounded flex items-center gap-1.5 transition-colors
              ${isPopoverOpen
                ? 'border-primary text-primary bg-primary/5'
                : 'border-card-border text-text-secondary hover:text-text-primary hover:border-text-muted'
              }
            `}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filter
          </button>

          {/* Active filter pills — inline with filter button */}
          {pills.map((pill) => (
            <FilterPill
              key={pill.key}
              label={pill.label}
              onRemove={() => removeFilter(pill.key)}
            />
          ))}

          {/* Clear all */}
          {hasActiveFilters && (
            <button
              onClick={handleClearAll}
              aria-label="Clear all filters"
              className="h-8 px-3 text-xs text-text-secondary border border-card-border rounded hover:bg-card-border transition-colors"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Filter popover (dropdown panel) */}
      {isPopoverOpen && (
        <div className="flex flex-wrap items-center gap-2 p-3 bg-page-bg border border-card-border rounded-lg">
          {/* Typology */}
          <select
            value={filters.typology ?? ''}
            onChange={handleTypologyChange}
            aria-label="Filter by typology"
            className="h-8 px-2 text-xs border border-card-border rounded bg-card-bg text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">All Typologies</option>
            {TYPOLOGY_OPTIONS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          {/* Status */}
          <select
            value={filters.status ?? ''}
            onChange={handleStatusChange}
            aria-label="Filter by status"
            className="h-8 px-2 text-xs border border-card-border rounded bg-card-bg text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {/* Risk range */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-text-secondary">Risk</span>
            <input
              type="number"
              placeholder="Min"
              min={0}
              max={100}
              value={filters.risk_min ?? ''}
              onChange={handleRiskMinChange}
              aria-label="Minimum risk score"
              className="h-8 w-16 px-2 text-xs border border-card-border rounded bg-card-bg text-text-primary font-mono placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <span className="text-xs text-text-muted">&ndash;</span>
            <input
              type="number"
              placeholder="Max"
              min={0}
              max={100}
              value={filters.risk_max ?? ''}
              onChange={handleRiskMaxChange}
              aria-label="Maximum risk score"
              className="h-8 w-16 px-2 text-xs border border-card-border rounded bg-card-bg text-text-primary font-mono placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
      )}
    </div>
  );
}
