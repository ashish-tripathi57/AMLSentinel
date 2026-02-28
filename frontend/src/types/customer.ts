export interface BankAccount {
  id: string;
  customer_id: string;
  account_number: string;
  account_type: string;
  branch: string | null;
  opening_date: string | null;
  status: string;
  current_balance: number;
  currency: string;
}

export interface Customer {
  id: string;
  full_name: string;
  date_of_birth: string | null;
  nationality: string | null;
  occupation: string | null;
  employer: string | null;
  declared_annual_income: number | null;
  risk_category: string;
  customer_since: string | null;
  id_type: string | null;
  id_number: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  pep_status: boolean;
  previous_alert_count: number;
  /** Bank accounts linked to this customer (included by the API). */
  accounts: BankAccount[];
}
