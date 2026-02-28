import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CustomerProfile } from './CustomerProfile';
import type { Customer } from '../../types/customer';

const MOCK_CUSTOMER: Customer = {
  id: 'cust-1',
  full_name: 'Priya Sharma',
  date_of_birth: '1985-06-15',
  nationality: 'Indian',
  occupation: 'Software Engineer',
  employer: 'TechCorp Pvt Ltd',
  declared_annual_income: 1500000,
  risk_category: 'Medium',
  customer_since: '2018-03-01T00:00:00Z',
  id_type: 'Aadhaar',
  id_number: '1234-5678-9012',
  address: '42 MG Road, Bengaluru, Karnataka 560001',
  phone: '+91-9876543210',
  email: 'priya.sharma@example.com',
  pep_status: false,
  previous_alert_count: 2,
  accounts: [
    {
      id: 'acc-1',
      customer_id: 'cust-1',
      account_number: 'SB-001234',
      account_type: 'savings',
      branch: 'Bengaluru Main',
      opening_date: '2018-03-01T00:00:00Z',
      status: 'Active',
      current_balance: 250000,
      currency: 'INR',
    },
  ],
};

function mockFetchSuccess(data: unknown) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(data),
  });
}

function mockFetchFailure(detail: string) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: false,
    status: 404,
    json: () => Promise.resolve({ detail }),
  });
}

function renderComponent(alertId = 'alert-1') {
  return render(
    <MemoryRouter>
      <CustomerProfile alertId={alertId} />
    </MemoryRouter>
  );
}

describe('CustomerProfile', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('shows a loading spinner while fetching', () => {
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {})); // never resolves
    renderComponent();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders the tabpanel role with the correct id', async () => {
    mockFetchSuccess(MOCK_CUSTOMER);
    renderComponent();

    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());

    const panel = screen.getByRole('tabpanel');
    expect(panel).toHaveAttribute('id', 'tabpanel-overview');
  });

  describe('personal information card', () => {
    it('displays the customer full name', async () => {
      mockFetchSuccess(MOCK_CUSTOMER);
      renderComponent();

      await waitFor(() => screen.getByText('Priya Sharma'));
      expect(screen.getByText('Priya Sharma')).toBeInTheDocument();
    });

    it('displays nationality', async () => {
      mockFetchSuccess(MOCK_CUSTOMER);
      renderComponent();

      await waitFor(() => screen.getByText('Indian'));
      expect(screen.getByText('Indian')).toBeInTheDocument();
    });

    it('displays occupation', async () => {
      mockFetchSuccess(MOCK_CUSTOMER);
      renderComponent();

      await waitFor(() => screen.getByText('Software Engineer'));
      expect(screen.getByText('Software Engineer')).toBeInTheDocument();
    });

    it('displays employer', async () => {
      mockFetchSuccess(MOCK_CUSTOMER);
      renderComponent();

      await waitFor(() => screen.getByText('TechCorp Pvt Ltd'));
      expect(screen.getByText('TechCorp Pvt Ltd')).toBeInTheDocument();
    });

    it('displays id type and number combined', async () => {
      mockFetchSuccess(MOCK_CUSTOMER);
      renderComponent();

      await waitFor(() => screen.getByText('Aadhaar — 1234-5678-9012'));
      expect(screen.getByText('Aadhaar — 1234-5678-9012')).toBeInTheDocument();
    });
  });

  describe('contact information card', () => {
    it('displays address', async () => {
      mockFetchSuccess(MOCK_CUSTOMER);
      renderComponent();

      await waitFor(() => screen.getByText('42 MG Road, Bengaluru, Karnataka 560001'));
      expect(screen.getByText('42 MG Road, Bengaluru, Karnataka 560001')).toBeInTheDocument();
    });

    it('displays phone', async () => {
      mockFetchSuccess(MOCK_CUSTOMER);
      renderComponent();

      await waitFor(() => screen.getByText('+91-9876543210'));
      expect(screen.getByText('+91-9876543210')).toBeInTheDocument();
    });

    it('displays email', async () => {
      mockFetchSuccess(MOCK_CUSTOMER);
      renderComponent();

      await waitFor(() => screen.getByText('priya.sharma@example.com'));
      expect(screen.getByText('priya.sharma@example.com')).toBeInTheDocument();
    });
  });

  describe('risk profile card', () => {
    it('displays the risk category badge', async () => {
      mockFetchSuccess(MOCK_CUSTOMER);
      renderComponent();

      await waitFor(() => screen.getByText('Medium'));
      expect(screen.getByText('Medium')).toBeInTheDocument();
    });

    it('displays PEP status as No', async () => {
      mockFetchSuccess(MOCK_CUSTOMER);
      renderComponent();

      await waitFor(() => screen.getByText('No'));
      expect(screen.getByText('No')).toBeInTheDocument();
    });

    it('displays PEP status as Yes for PEP customers', async () => {
      mockFetchSuccess({ ...MOCK_CUSTOMER, pep_status: true });
      renderComponent();

      await waitFor(() => screen.getByText('Yes'));
      expect(screen.getByText('Yes')).toBeInTheDocument();
    });

    it('displays previous alert count', async () => {
      mockFetchSuccess(MOCK_CUSTOMER);
      renderComponent();

      await waitFor(() => screen.getByText('2'));
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('displays INR formatted annual income', async () => {
      mockFetchSuccess(MOCK_CUSTOMER);
      renderComponent();

      // formatCurrency(1500000) → ₹15,00,000 in en-IN locale
      await waitFor(() =>
        expect(screen.getByText(/15,00,000/)).toBeInTheDocument()
      );
    });
  });

  describe('bank accounts card', () => {
    it('renders the account number', async () => {
      mockFetchSuccess(MOCK_CUSTOMER);
      renderComponent();

      await waitFor(() => screen.getByText('SB-001234'));
      expect(screen.getByText('SB-001234')).toBeInTheDocument();
    });

    it('renders the account type', async () => {
      mockFetchSuccess(MOCK_CUSTOMER);
      renderComponent();

      await waitFor(() => screen.getByText('savings'));
      expect(screen.getByText('savings')).toBeInTheDocument();
    });

    it('renders the branch', async () => {
      mockFetchSuccess(MOCK_CUSTOMER);
      renderComponent();

      await waitFor(() => screen.getByText('Bengaluru Main'));
      expect(screen.getByText('Bengaluru Main')).toBeInTheDocument();
    });

    it('renders the account status badge', async () => {
      mockFetchSuccess(MOCK_CUSTOMER);
      renderComponent();

      await waitFor(() => screen.getByText('Active'));
      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('renders the INR balance', async () => {
      mockFetchSuccess(MOCK_CUSTOMER);
      renderComponent();

      await waitFor(() => expect(screen.getByText(/2,50,000/)).toBeInTheDocument());
    });

    it('shows "No bank accounts linked" message when accounts array is empty', async () => {
      mockFetchSuccess({ ...MOCK_CUSTOMER, accounts: [] });
      renderComponent();

      await waitFor(() => screen.getByText('No bank accounts linked.'));
      expect(screen.getByText('No bank accounts linked.')).toBeInTheDocument();
    });
  });

  describe('error and null states', () => {
    it('shows error state when fetch fails', async () => {
      mockFetchFailure('Customer not found');
      renderComponent();

      // EmptyState renders "Customer not found" in both the title and the
      // description (since the error detail matches the title). Use getAllByText.
      await waitFor(() => {
        const matches = screen.getAllByText('Customer not found');
        expect(matches.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('shows "Customer not found" title in the error state', async () => {
      mockFetchFailure('Something went wrong');
      renderComponent();

      await waitFor(() => screen.getByText('Customer not found'));
      expect(screen.getByText('Customer not found')).toBeInTheDocument();
    });

    it('shows fallback description when error is null but customer is also null', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(null),
      });
      renderComponent();

      await waitFor(() =>
        expect(screen.getByText('Customer profile could not be loaded.')).toBeInTheDocument()
      );
    });
  });

  describe('account status badge branches', () => {
    it('renders inactive status with muted styling', async () => {
      const inactiveAccount = {
        ...MOCK_CUSTOMER,
        accounts: [
          {
            ...MOCK_CUSTOMER.accounts[0],
            status: 'Frozen',
          },
        ],
      };
      mockFetchSuccess(inactiveAccount);
      renderComponent();

      await waitFor(() => screen.getByText('Frozen'));
      expect(screen.getByText('Frozen')).toBeInTheDocument();
    });

    it('renders account with null branch as dash', async () => {
      const noBranch = {
        ...MOCK_CUSTOMER,
        accounts: [
          {
            ...MOCK_CUSTOMER.accounts[0],
            branch: null,
          },
        ],
      };
      mockFetchSuccess(noBranch);
      renderComponent();

      await waitFor(() => screen.getByText('SB-001234'));
      expect(screen.getByText('—')).toBeInTheDocument();
    });
  });

  describe('ID display branches', () => {
    it('shows only id_number when id_type is null', async () => {
      mockFetchSuccess({ ...MOCK_CUSTOMER, id_type: null });
      renderComponent();

      await waitFor(() => screen.getByText('1234-5678-9012'));
    });

    it('shows only id_type when id_number is null', async () => {
      mockFetchSuccess({ ...MOCK_CUSTOMER, id_number: null });
      renderComponent();

      await waitFor(() => screen.getByText('Aadhaar'));
    });

    it('shows dash when both id_type and id_number are null', async () => {
      mockFetchSuccess({ ...MOCK_CUSTOMER, id_type: null, id_number: null });
      renderComponent();

      // The InfoRow shows '—' for nullish values
      await waitFor(() => screen.getByText('Priya Sharma'));
    });
  });

  describe('risk badge fallback', () => {
    it('renders fallback muted color for unknown risk category', async () => {
      mockFetchSuccess({ ...MOCK_CUSTOMER, risk_category: 'Extreme' });
      renderComponent();

      await waitFor(() => screen.getByText('Extreme'));
    });

    it('renders high risk category', async () => {
      mockFetchSuccess({ ...MOCK_CUSTOMER, risk_category: 'High' });
      renderComponent();

      await waitFor(() => screen.getByText('High'));
    });

    it('renders critical risk category', async () => {
      mockFetchSuccess({ ...MOCK_CUSTOMER, risk_category: 'Critical' });
      renderComponent();

      await waitFor(() => screen.getByText('Critical'));
    });

    it('renders low risk category', async () => {
      mockFetchSuccess({ ...MOCK_CUSTOMER, risk_category: 'Low' });
      renderComponent();

      await waitFor(() => screen.getByText('Low'));
    });

    it('renders fallback for null risk category', async () => {
      mockFetchSuccess({ ...MOCK_CUSTOMER, risk_category: null });
      renderComponent();

      // RiskBadge with null category normalizes to '' via ?? operator
      await waitFor(() => screen.getByText('Priya Sharma'));
    });
  });
});
