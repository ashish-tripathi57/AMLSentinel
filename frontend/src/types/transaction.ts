export interface Transaction {
  id: string;
  account_id: string;
  transaction_date: string;
  transaction_type: string;
  amount: number;
  currency: string;
  direction: string;
  channel: string | null;
  counterparty_name: string | null;
  counterparty_account: string | null;
  counterparty_bank: string | null;
  location: string | null;
  country: string | null;
  reference_number: string | null;
  description: string | null;
  is_flagged: boolean;
}
