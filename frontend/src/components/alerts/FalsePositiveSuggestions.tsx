import { X } from 'lucide-react';
import { LoadingSpinner } from '../common/LoadingSpinner';
import type { FalsePositiveResult } from '../../types/alert';

interface FalsePositiveSuggestionsProps {
  results: FalsePositiveResult[];
  isLoading: boolean;
  onClose: () => void;
}

/**
 * AI suggestion panel showing false positive detection results.
 * Displays confidence scores, verdicts, and reasoning for each analyzed alert.
 */
export function FalsePositiveSuggestions({ results, isLoading, onClose }: FalsePositiveSuggestionsProps) {
  return (
    <div className="bg-card-bg border border-card-border rounded-xl shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-card-border">
        <h3 className="text-sm font-semibold text-text-primary">AI False Positive Analysis</h3>
        <button
          onClick={onClose}
          aria-label="Close"
          className="p-1 rounded hover:bg-page-bg text-text-muted hover:text-text-primary transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <div className="p-4">
        {isLoading ? (
          <div className="flex flex-col items-center py-8 gap-3">
            <LoadingSpinner size="md" />
            <p className="text-xs text-text-muted">Analyzing alerts for false positive patterns…</p>
          </div>
        ) : (
          <div className="space-y-3">
            {results.map((result) => {
              const confidencePercent = Math.round(result.confidence * 100);
              const isLikelyFalsePositive = result.confidence >= 0.7;

              return (
                <div
                  key={result.alert_id}
                  className="border border-card-border rounded-lg p-3 space-y-2"
                >
                  {/* Alert ID + verdict badge */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-text-primary">
                      {result.alert_short_id}
                    </span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        isLikelyFalsePositive
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {isLikelyFalsePositive ? 'Likely False Positive' : 'Likely Genuine'}
                    </span>
                  </div>

                  {/* Confidence + suggested resolution */}
                  <div className="flex items-center gap-3 text-xs">
                    <span className="font-medium text-text-secondary">
                      Confidence: <span className="text-text-primary">{confidencePercent}%</span>
                    </span>
                    <span className="text-text-muted">|</span>
                    <span className="font-medium text-text-secondary">
                      Suggested: <span className="text-text-primary">{result.suggested_resolution}</span>
                    </span>
                  </div>

                  {/* Reasoning */}
                  <p className="text-xs text-text-secondary leading-relaxed">{result.reasoning}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
