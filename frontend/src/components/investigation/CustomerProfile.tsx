import { useCustomerProfile } from '../../hooks/use-customer-profile';
import { Card, CardHeader, CardContent, LoadingSpinner, EmptyState } from '../common';
import { formatCurrency } from '../../utils/format-currency';
import { formatDateShort } from '../../utils/format-date';
import type { BankAccount } from '../../types/customer';

interface CustomerProfileProps {
  alertId: string;
}

/** Risk category badge: maps risk_category value to a Tailwind color pair. */
function RiskBadge({ category }: { category: string }) {
  const normalized = (category ?? '').toLowerCase();

  const colorMap: Record<string, string> = {
    critical: 'bg-severity-critical/10 text-severity-critical',
    high: 'bg-severity-high/10 text-severity-high',
    medium: 'bg-severity-medium/10 text-severity-medium',
    low: 'bg-severity-low/10 text-severity-low',
  };

  const classes = colorMap[normalized] ?? 'bg-text-muted/10 text-text-muted';

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${classes}`}>
      {category}
    </span>
  );
}

/** Single label/value row used inside info cards. */
function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-text-muted font-medium uppercase tracking-wide">{label}</span>
      <span className="text-sm text-text-primary">{value ?? '—'}</span>
    </div>
  );
}

/** Table of bank accounts linked to the customer. */
function BankAccountsTable({ accounts }: { accounts: BankAccount[] }) {
  if (accounts.length === 0) {
    return <p className="text-sm text-text-muted py-2">No bank accounts linked.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-card-border">
            <th className="text-left py-2 pr-4 text-xs text-text-muted font-medium uppercase tracking-wide">
              Account Number
            </th>
            <th className="text-left py-2 pr-4 text-xs text-text-muted font-medium uppercase tracking-wide">
              Type
            </th>
            <th className="text-left py-2 pr-4 text-xs text-text-muted font-medium uppercase tracking-wide">
              Branch
            </th>
            <th className="text-left py-2 pr-4 text-xs text-text-muted font-medium uppercase tracking-wide">
              Status
            </th>
            <th className="text-right py-2 pr-4 text-xs text-text-muted font-medium uppercase tracking-wide">
              Balance
            </th>
            <th className="text-left py-2 text-xs text-text-muted font-medium uppercase tracking-wide">
              Opened
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-card-border">
          {accounts.map((account) => (
            <tr key={account.id} className="hover:bg-page-bg transition-colors">
              <td className="py-2 pr-4 font-mono text-text-primary">{account.account_number}</td>
              <td className="py-2 pr-4 text-text-primary capitalize">{account.account_type}</td>
              <td className="py-2 pr-4 text-text-primary">{account.branch ?? '—'}</td>
              <td className="py-2 pr-4">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    account.status.toLowerCase() === 'active'
                      ? 'bg-severity-low/10 text-severity-low'
                      : 'bg-text-muted/10 text-text-muted'
                  }`}
                >
                  {account.status}
                </span>
              </td>
              <td className="py-2 pr-4 text-right text-text-primary">
                {formatCurrency(account.current_balance)}
              </td>
              <td className="py-2 text-text-primary">{formatDateShort(account.opening_date)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Displays a Datadog-style dense customer profile for the Investigation Overview tab.
 * Shows personal info, contact info, risk profile, and linked bank accounts.
 */
export function CustomerProfile({ alertId }: CustomerProfileProps) {
  const { customer, isLoading, error } = useCustomerProfile(alertId);

  if (isLoading) {
    return (
      <div
        role="tabpanel"
        id="tabpanel-overview"
        aria-label="Overview"
        className="flex items-center justify-center h-64"
      >
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div role="tabpanel" id="tabpanel-overview" aria-label="Overview" className="p-6">
        <EmptyState
          title="Customer not found"
          description={error ?? 'Customer profile could not be loaded.'}
        />
      </div>
    );
  }

  return (
    <div
      role="tabpanel"
      id="tabpanel-overview"
      aria-label="Overview"
      className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4"
    >
      {/* Personal Info */}
      <Card>
        <CardHeader>
          <h3 className="text-sm font-semibold text-text-primary">Personal Information</h3>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3">
          <InfoRow label="Full Name" value={customer.full_name} />
          <InfoRow label="Date of Birth" value={formatDateShort(customer.date_of_birth)} />
          <InfoRow label="Nationality" value={customer.nationality} />
          <InfoRow label="Occupation" value={customer.occupation} />
          <InfoRow label="Employer" value={customer.employer} />
          <InfoRow
            label="ID"
            value={
              customer.id_type && customer.id_number
                ? `${customer.id_type} — ${customer.id_number}`
                : customer.id_number ?? customer.id_type
            }
          />
        </CardContent>
      </Card>

      {/* Contact Info */}
      <Card>
        <CardHeader>
          <h3 className="text-sm font-semibold text-text-primary">Contact Information</h3>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3">
          <InfoRow label="Address" value={customer.address} />
          <InfoRow label="Phone" value={customer.phone} />
          <InfoRow label="Email" value={customer.email} />
        </CardContent>
      </Card>

      {/* Risk Profile */}
      <Card>
        <CardHeader>
          <h3 className="text-sm font-semibold text-text-primary">Risk Profile</h3>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-text-muted font-medium uppercase tracking-wide">
              Risk Category
            </span>
            <RiskBadge category={customer.risk_category} />
          </div>
          <InfoRow label="PEP Status" value={customer.pep_status ? 'Yes' : 'No'} />
          <InfoRow label="Previous Alerts" value={String(customer.previous_alert_count)} />
          <InfoRow
            label="Declared Annual Income"
            value={formatCurrency(customer.declared_annual_income)}
          />
          <InfoRow label="Customer Since" value={formatDateShort(customer.customer_since)} />
        </CardContent>
      </Card>

      {/* Bank Accounts — full width on both breakpoints */}
      <Card className="md:col-span-2">
        <CardHeader>
          <h3 className="text-sm font-semibold text-text-primary">Bank Accounts</h3>
        </CardHeader>
        <CardContent>
          <BankAccountsTable accounts={customer.accounts} />
        </CardContent>
      </Card>
    </div>
  );
}
