import { Card, CardContent, CardHeader, LoadingSpinner } from '../common';
import { usePatternAnalysis } from '../../hooks/use-pattern-analysis';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PatternAnalysisProps {
  alertId: string;
}

// ---------------------------------------------------------------------------
// Severity badge helpers
// ---------------------------------------------------------------------------

/**
 * Maps a severity string to Tailwind colour classes.
 * Follows the same palette used throughout the app:
 *   high   → red   (severity-critical)
 *   medium → orange (severity-high)
 *   low    → green  (severity-low)
 */
function severityClasses(severity: string): string {
  const normalised = severity.toLowerCase();
  if (normalised === 'high') return 'bg-severity-critical/10 text-severity-critical';
  if (normalised === 'medium') return 'bg-severity-high/10 text-severity-high';
  return 'bg-severity-low/10 text-severity-low';
}

/**
 * Maps a risk indicator level to Tailwind colour classes.
 * high → red, medium → orange, low → green.
 */
function riskLevelClasses(level: string): string {
  const normalised = level.toLowerCase();
  if (normalised === 'high') return 'bg-red-100 text-red-700';
  if (normalised === 'medium') return 'bg-orange-100 text-orange-700';
  return 'bg-green-100 text-green-700';
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface SeverityBadgeProps {
  severity: string;
}

function SeverityBadge({ severity }: SeverityBadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${severityClasses(severity)}`}
    >
      {severity}
    </span>
  );
}

interface RiskLevelBadgeProps {
  level: string;
}

function RiskLevelBadge({ level }: RiskLevelBadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${riskLevelClasses(level)}`}
    >
      {level}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

/**
 * Renders AI-generated pattern analysis for an alert.
 *
 * Sections:
 *  1. Summary card — overall narrative from the AI
 *  2. Detected patterns — one card per pattern with severity badge
 *  3. Risk indicators — list with coloured level badges
 */
export function PatternAnalysis({ alertId }: PatternAnalysisProps) {
  const { analysis, isLoading, error } = usePatternAnalysis(alertId);

  if (isLoading) {
    return (
      <div
        role="tabpanel"
        aria-label="Pattern Analysis"
        className="p-6 flex flex-col items-center justify-center"
      >
        <LoadingSpinner size="lg" />
        <p className="mt-2 text-sm text-text-secondary">Generating pattern analysis…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        role="tabpanel"
        aria-label="Pattern Analysis"
        className="p-6"
      >
        <div className="rounded-lg border border-severity-critical/30 bg-severity-critical/5 px-4 py-3">
          <p className="text-sm font-medium text-severity-critical">Failed to load analysis</p>
          <p className="mt-1 text-sm text-text-secondary">{error}</p>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return null;
  }

  return (
    <div
      role="tabpanel"
      aria-label="Pattern Analysis"
      className="p-6 space-y-6"
    >
      {/* ------------------------------------------------------------------ */}
      {/* 1. Summary                                                          */}
      {/* ------------------------------------------------------------------ */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-text-primary">Analysis Summary</h2>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-text-secondary leading-relaxed">{analysis.summary}</p>
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* 2. Detected patterns                                                */}
      {/* ------------------------------------------------------------------ */}
      {analysis.patterns.length > 0 && (
        <section aria-label="Detected Patterns">
          <h2 className="mb-3 text-sm font-semibold text-text-primary">
            Detected Patterns
          </h2>
          <div className="space-y-3">
            {analysis.patterns.map((pattern, index) => (
              <Card key={index}>
                <CardContent>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text-primary">{pattern.name}</p>
                      <p className="mt-1 text-sm text-text-secondary">{pattern.description}</p>
                    </div>
                    <SeverityBadge severity={pattern.severity} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 3. Risk indicators                                                  */}
      {/* ------------------------------------------------------------------ */}
      {analysis.risk_indicators.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-text-primary">Risk Indicators</h2>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-card-border">
              {analysis.risk_indicators.map((ri, index) => (
                <li key={index} className="flex items-start gap-3 px-4 py-3">
                  <RiskLevelBadge level={ri.level} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-primary">{ri.indicator}</p>
                    <p className="text-sm text-text-secondary">{ri.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
