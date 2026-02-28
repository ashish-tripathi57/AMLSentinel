import { Link } from 'react-router-dom';
import { useSimilarCases } from '../../hooks/use-similar-cases';
import { Card, CardContent, LoadingSpinner, EmptyState } from '../common';
import type { SimilarCase } from '../../types/investigation';

interface SimilarCasesProps {
  alertId: string;
}

/** Returns Tailwind text color class based on similarity percentage (0-100). */
function similarityScoreColorClass(percentage: number): string {
  if (percentage >= 70) return 'text-emerald-600 bg-emerald-50';
  if (percentage >= 40) return 'text-amber-600 bg-amber-50';
  return 'text-gray-500 bg-gray-100';
}

/** Maps status strings to badge color classes. */
function statusBadgeClasses(status: string): string {
  const normalised = status.toLowerCase();
  if (normalised === 'new') return 'bg-status-new/10 text-status-new';
  if (normalised === 'in progress') return 'bg-status-in-progress/10 text-status-in-progress';
  if (normalised === 'closed') return 'bg-status-closed/10 text-status-closed';
  if (normalised === 'review') return 'bg-status-review/10 text-status-review';
  if (normalised === 'escalated') return 'bg-status-escalated/10 text-status-escalated';
  return 'bg-text-muted/10 text-text-muted';
}

/** Returns risk score color class based on score (0-100). */
function riskScoreColorClass(score: number): string {
  if (score >= 75) return 'bg-severity-critical';
  if (score >= 50) return 'bg-severity-high';
  if (score >= 25) return 'bg-severity-medium';
  return 'bg-severity-low';
}

/** Individual similar case card. */
function SimilarCaseCard({ caseData }: { caseData: SimilarCase }) {
  const similarityPercentage = Math.round(caseData.similarity_score);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent>
        <div className="flex items-start justify-between gap-3">
          {/* Left: alert ID + title */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Link
                to={`/investigation/${caseData.id}`}
                className="text-sm font-semibold text-primary hover:underline"
              >
                {caseData.alert_id}
              </Link>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                {caseData.typology}
              </span>
            </div>
            <p className="text-sm text-text-secondary truncate">{caseData.title}</p>
          </div>

          {/* Right: similarity score */}
          <div className="shrink-0 text-center">
            <span
              className={`inline-flex items-center justify-center px-2 py-1 rounded-md text-sm font-bold ${similarityScoreColorClass(similarityPercentage)}`}
            >
              {similarityPercentage}%
            </span>
          </div>
        </div>

        {/* Badges row: status, resolution, risk score */}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusBadgeClasses(caseData.status)}`}
          >
            {caseData.status}
          </span>

          {caseData.resolution && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">
              {caseData.resolution}
            </span>
          )}

          {/* Risk score bar */}
          <div className="flex items-center gap-1.5 ml-auto">
            <div className="w-12 h-1.5 rounded-full bg-gray-200 overflow-hidden">
              <div
                className={`h-full rounded-full ${riskScoreColorClass(caseData.risk_score)}`}
                style={{ width: `${caseData.risk_score}%` }}
              />
            </div>
            <span className="text-xs font-medium text-text-secondary">{caseData.risk_score}</span>
          </div>
        </div>

        {/* Matching factors tags */}
        {caseData.matching_factors.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {caseData.matching_factors.map((factor) => (
              <span
                key={factor}
                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-text-secondary"
              >
                {factor}
              </span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Displays a list of similar cases for the current alert, ranked by
 * similarity score. Helps analysts identify patterns and reference
 * prior investigations with matching typology, risk, or transaction profiles.
 */
export function SimilarCases({ alertId }: SimilarCasesProps) {
  const { similarCases, isLoading, error } = useSimilarCases(alertId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <EmptyState title="Failed to load similar cases" description={error} />
      </div>
    );
  }

  if (similarCases.length === 0) {
    return (
      <div className="p-6">
        <EmptyState
          title="No similar cases found"
          description="No alerts with matching patterns were found for this investigation."
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary">Similar Cases</h3>
        <span className="text-xs text-text-muted">{similarCases.length} matches found</span>
      </div>

      <div className="space-y-3">
        {similarCases.map((caseData) => (
          <SimilarCaseCard key={caseData.id} caseData={caseData} />
        ))}
      </div>
    </div>
  );
}
