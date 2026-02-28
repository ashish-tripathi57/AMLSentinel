import { useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useAlertDetail } from '../hooks/use-alert-detail';
import { useInvestigationDrawer } from '../contexts/InvestigationDrawerContext';
import { InvestigationHeader } from '../components/investigation/InvestigationHeader';
import { CustomerProfile } from '../components/investigation/CustomerProfile';
import { TransactionTimeline } from '../components/investigation/TransactionTimeline';
import { NetworkGraph } from '../components/investigation/NetworkGraph';
import { AnalystNotes } from '../components/investigation/AnalystNotes';
import { Checklist } from '../components/investigation/Checklist';
import { AuditTrail } from '../components/investigation/AuditTrail';
import { SAREditor } from '../components/investigation/SAREditor';
import { InvestigationChat } from '../components/investigation/InvestigationChat';
import { StatusTransition } from '../components/investigation/StatusTransition';
import { SimilarCases } from '../components/investigation/SimilarCases';
import { LoadingSpinner, EmptyState } from '../components/common';

// Hardcoded analyst for basic auth — matches the backend seed data
const ANALYST_USERNAME = 'analyst.one';

/**
 * Investigation page — opens when an analyst clicks an alert in the queue.
 *
 * URL param: alertId (UUID) — obtained from the route `/investigation/:alertId`.
 *
 * Structure:
 *  - InvestigationHeader   (breadcrumb + alert metadata + status transition)
 *  - Section content area  (section driven by AppShell sidebar via context)
 *  - Persistent chat panel (always visible on the right)
 */
export function InvestigationPage() {
  const { alertId: rawAlertId } = useParams<{ alertId: string }>();
  const resolvedAlertId = rawAlertId ?? '';
  const { alert, isLoading, error, refetch } = useAlertDetail(resolvedAlertId);
  const { activeSection } = useInvestigationDrawer();

  const handleStatusChanged = useCallback(() => {
    refetch();
  }, [refetch]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !alert) {
    return (
      <div className="p-6">
        <EmptyState
          title="Alert not found"
          description={error ?? 'The requested alert could not be loaded.'}
        />
      </div>
    );
  }

  /** Resolves the content component for the active section. */
  function renderSectionContent() {
    const id = resolvedAlertId;

    switch (activeSection) {
      case 'Overview':
        return <CustomerProfile alertId={id} />;
      case 'Transactions':
        return <TransactionTimeline alertId={id} />;
      case 'Network':
        return <NetworkGraph alertId={id} />;
      case 'Notes':
        return <AnalystNotes alertId={id} analystUsername={ANALYST_USERNAME} />;
      case 'Checklist':
        return <Checklist alertId={id} analystUsername={ANALYST_USERNAME} />;
      case 'Audit Trail':
        return <AuditTrail alertId={id} />;
      case 'SAR':
        return <SAREditor alertId={id} analystUsername={ANALYST_USERNAME} />;
      case 'Similar Cases':
        return <SimilarCases alertId={id} />;
    }
  }

  return (
    <div className="min-h-full bg-page-bg flex flex-col">
      {/* Sticky header */}
      <div className="sticky top-0 z-10">
        <div className="flex items-center justify-between bg-card-bg border-b border-card-border">
          <div className="flex-1">
            <InvestigationHeader alert={alert} />
          </div>
          <div className="px-6 pb-4 flex items-center">
            <StatusTransition
              alertId={alert.id}
              currentStatus={alert.status}
              analystUsername={ANALYST_USERNAME}
              onStatusChanged={handleStatusChanged}
            />
          </div>
        </div>
      </div>

      {/* Main content: section content + chat panel */}
      <div className="flex-1 flex">
        <div className="flex-1 p-6">{renderSectionContent()}</div>

        {/* Persistent chat panel — always visible */}
        <div className="w-96 border-l border-card-border p-4 hidden lg:block">
          <InvestigationChat alertId={resolvedAlertId} analystUsername={ANALYST_USERNAME} />
        </div>
      </div>
    </div>
  );
}
