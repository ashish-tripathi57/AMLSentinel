"""
Seeder for the Sudden Activity Change typology (SA1, SA2, SA3).

Each alert represents a previously dormant or low-activity account that
experienced an abrupt and dramatic surge in transaction volume — a classic
indicator of account takeover, third-party money mule use, or sudden
undisclosed business activity.

Narrative design per alert:
  SA1 — Lakshmi Devi: Small-farmer savings account dormant for 6+ months;
         receives ₹50 L+ in a single week via multiple NEFT credits from
         unknown counterparties.
  SA2 — Nitin Joshi: School-teacher salary account historically at ₹10K/month;
         suddenly sees ₹20 L+ in mixed credits and debits within days.
  SA3 — Fatima Sheikh: Home-maker account with zero activity for 8 months;
         processes ₹30 L across 10 days through a combination of cash deposits
         and IMPS transfers.
"""

from sqlalchemy.ext.asyncio import AsyncSession

from api.seed.base import (
    seed_account,
    seed_alert,
    seed_checklist,
    seed_customer,
    seed_transaction,
)
from api.seed.data_spec import TYPOLOGY_SUDDEN_ACTIVITY


async def seed_sudden_activity(session: AsyncSession) -> None:
    """Seed all three Sudden Activity Change alerts (SA1, SA2, SA3)."""
    await _seed_sa1_lakshmi_devi(session)
    await _seed_sa2_nitin_joshi(session)
    await _seed_sa3_fatima_sheikh(session)


# ---------------------------------------------------------------------------
# SA1 — Lakshmi Devi
# ---------------------------------------------------------------------------

async def _seed_sa1_lakshmi_devi(session: AsyncSession) -> None:
    """
    SA1: Dormant farmer savings account receives ₹50 L+ in one week.

    Historical baseline: 3–4 small cash withdrawals per quarter (₹2 K–₹5 K).
    Spike period: 6 NEFT credits totalling ₹51.5 L in Jan 2026, all from
    counterparties unrelated to agricultural activity.
    Risk score: 79.
    """
    customer = await seed_customer(
        session,
        full_name="Lakshmi Devi",
        date_of_birth="1978-04-12",
        nationality="Indian",
        occupation="Farmer",
        employer=None,
        declared_annual_income=90000.0,   # ₹90 K/year — marginal farm income
        risk_category="Medium",
        customer_since="2015-08-03",
        id_type="Aadhaar",
        id_number="XXXX-XXXX-4821",
        address="Village Rampur, Tehsil Hardoi, Uttar Pradesh - 241001",
        phone="+91-9876501234",
        email=None,
        pep_status=False,
        previous_alert_count=0,
        kyc_verification_date="2015-08-03",
        kyc_last_update_date="2015-08-03",
        income_verification_notes="No income documents on file. Self-declared marginal farmer. Kisan Credit Card application rejected 2016. No ITR history.",
    )

    account = await seed_account(
        session,
        customer_id=customer.id,
        account_number="SBI-UP-00291847",
        account_type="Savings",
        branch="SBI Hardoi Branch, Uttar Pradesh",
        opening_date="2015-08-03",
        status="Active",
        current_balance=5214500.0,   # balance after the influx
        currency="INR",
    )

    # --- Historical low-value transactions (normal baseline) ---------------

    hist_txn_1 = await seed_transaction(
        session,
        account_id=account.id,
        transaction_date="2025-03-15T10:30:00",
        transaction_type="Cash Withdrawal",
        amount=3000.0,
        currency="INR",
        direction="debit",
        channel="cash",
        counterparty_name=None,
        counterparty_account=None,
        counterparty_bank=None,
        location="Hardoi, Uttar Pradesh",
        country="India",
        reference_number="WD20250315001",
        description="ATM cash withdrawal — seasonal farm expense",
        is_flagged=False,
    )

    hist_txn_2 = await seed_transaction(
        session,
        account_id=account.id,
        transaction_date="2025-05-22T11:00:00",
        transaction_type="Cash Withdrawal",
        amount=5000.0,
        currency="INR",
        direction="debit",
        channel="cash",
        counterparty_name=None,
        counterparty_account=None,
        counterparty_bank=None,
        location="Hardoi, Uttar Pradesh",
        country="India",
        reference_number="WD20250522001",
        description="ATM cash withdrawal — seed purchase",
        is_flagged=False,
    )

    hist_txn_3 = await seed_transaction(
        session,
        account_id=account.id,
        transaction_date="2025-07-10T09:15:00",
        transaction_type="Cash Deposit",
        amount=8000.0,
        currency="INR",
        direction="credit",
        channel="cash",
        counterparty_name=None,
        counterparty_account=None,
        counterparty_bank=None,
        location="Hardoi, Uttar Pradesh",
        country="India",
        reference_number="CD20250710001",
        description="Cash deposit — crop sale proceeds (kharif)",
        is_flagged=False,
    )

    # Account goes dormant after Jul 2025; last normal activity was above.

    # --- Burst transactions: Jan 2026 spike (flagged) ----------------------

    burst_txn_1 = await seed_transaction(
        session,
        account_id=account.id,
        transaction_date="2026-01-13T09:45:00",
        transaction_type="NEFT Credit",
        amount=9500000.0,    # ₹95 L — intentionally large, first hit
        currency="INR",
        direction="credit",
        channel="NEFT",
        counterparty_name="Raghav Enterprises",
        counterparty_account="HDFC-MH-88291034",
        counterparty_bank="HDFC Bank, Mumbai",
        location="Mumbai, Maharashtra",
        country="India",
        reference_number="NEFT20260113001",
        description="Payment received — unknown business reference",
        is_flagged=True,
    )

    burst_txn_2 = await seed_transaction(
        session,
        account_id=account.id,
        transaction_date="2026-01-14T11:20:00",
        transaction_type="NEFT Credit",
        amount=8000000.0,    # ₹80 L
        currency="INR",
        direction="credit",
        channel="NEFT",
        counterparty_name="Shree Balaji Traders",
        counterparty_account="ICICI-DL-77654321",
        counterparty_bank="ICICI Bank, Delhi",
        location="Delhi",
        country="India",
        reference_number="NEFT20260114001",
        description="Trade settlement — no invoice provided",
        is_flagged=True,
    )

    burst_txn_3 = await seed_transaction(
        session,
        account_id=account.id,
        transaction_date="2026-01-15T14:05:00",
        transaction_type="NEFT Credit",
        amount=7500000.0,    # ₹75 L
        currency="INR",
        direction="credit",
        channel="NEFT",
        counterparty_name="GreenField Solutions Pvt Ltd",
        counterparty_account="AXIS-MH-66112233",
        counterparty_bank="Axis Bank, Pune",
        location="Pune, Maharashtra",
        country="India",
        reference_number="NEFT20260115001",
        description="Consulting fees — no contract on record",
        is_flagged=True,
    )

    burst_txn_4 = await seed_transaction(
        session,
        account_id=account.id,
        transaction_date="2026-01-16T10:30:00",
        transaction_type="NEFT Credit",
        amount=12000000.0,   # ₹1.2 Cr
        currency="INR",
        direction="credit",
        channel="NEFT",
        counterparty_name="Apex Capital Group",
        counterparty_account="PNB-GJ-55009988",
        counterparty_bank="Punjab National Bank, Ahmedabad",
        location="Ahmedabad, Gujarat",
        country="India",
        reference_number="NEFT20260116001",
        description="Investment proceeds — no supporting documentation",
        is_flagged=True,
    )

    burst_txn_5 = await seed_transaction(
        session,
        account_id=account.id,
        transaction_date="2026-01-17T13:00:00",
        transaction_type="NEFT Credit",
        amount=9000000.0,    # ₹90 L
        currency="INR",
        direction="credit",
        channel="NEFT",
        counterparty_name="Sunrise Commodities",
        counterparty_account="SBI-RJ-44871023",
        counterparty_bank="State Bank of India, Jaipur",
        location="Jaipur, Rajasthan",
        country="India",
        reference_number="NEFT20260117001",
        description="Commodity payment — unverified source",
        is_flagged=True,
    )

    burst_txn_6 = await seed_transaction(
        session,
        account_id=account.id,
        transaction_date="2026-01-19T15:45:00",
        transaction_type="NEFT Credit",
        amount=5000000.0,    # ₹50 L
        currency="INR",
        direction="credit",
        channel="NEFT",
        counterparty_name="Horizon Import Export",
        counterparty_account="BOB-MH-33218800",
        counterparty_bank="Bank of Baroda, Mumbai",
        location="Mumbai, Maharashtra",
        country="India",
        reference_number="NEFT20260119001",
        description="Export advance — no shipping documents",
        is_flagged=True,
    )

    flagged_ids = [
        burst_txn_1.id,
        burst_txn_2.id,
        burst_txn_3.id,
        burst_txn_4.id,
        burst_txn_5.id,
        burst_txn_6.id,
    ]
    total_flagged_amount = 9500000 + 8000000 + 7500000 + 12000000 + 9000000 + 5000000

    alert = await seed_alert(
        session,
        customer_id=customer.id,
        flagged_txn_ids=flagged_ids,
        alert_id="SA1",
        typology=TYPOLOGY_SUDDEN_ACTIVITY,
        risk_score=79,
        status="New",
        title="SA1 — Dormant farmer savings account receives ₹51.5 L+ in a single week via multiple NEFT credits",
        description=(
            "Lakshmi Devi, a marginal farmer with declared annual income of ₹90,000, holds a savings "
            "account at SBI Hardoi that was effectively dormant from August 2025 through December 2025 "
            "(no transactions for approximately 6 months). Beginning 13 January 2026, the account "
            "received six NEFT credit transfers totalling ₹51,500,000 within a 7-day window. "
            "All incoming transfers originate from commercial entities across multiple states "
            "(Maharashtra, Delhi, Gujarat, Rajasthan) with no apparent business relationship to "
            "the customer's agricultural profile. Transaction descriptions reference consulting fees, "
            "commodity payments, and export advances — categories inconsistent with a small farmer's "
            "declared occupation and income. The sudden activity spike represents more than 570x the "
            "customer's declared annual income, appearing in a single week. No KYC update was filed "
            "prior to the spike. The account is now flagged for priority review."
        ),
        triggered_date="2026-01-20T09:00:00",
        assigned_analyst=None,
        total_flagged_amount=float(total_flagged_amount),
        flagged_transaction_count=len(flagged_ids),
    )

    await seed_checklist(session, alert_id=alert.id, typology=TYPOLOGY_SUDDEN_ACTIVITY)

    # Suppress unused variable warnings for historical transactions; they are
    # persisted via session.add inside seed_transaction and serve as
    # documented baseline evidence in the account's transaction history.
    _ = hist_txn_1, hist_txn_2, hist_txn_3


# ---------------------------------------------------------------------------
# SA2 — Nitin Joshi
# ---------------------------------------------------------------------------

async def _seed_sa2_nitin_joshi(session: AsyncSession) -> None:
    """
    SA2: School-teacher salary account jumps from ₹10 K/month to ₹20 L+.

    Historical baseline: Monthly salary credit of ₹10 K, one or two small
    bill payments per month.
    Spike period: ₹20.5 L in mixed credits and debits over 8 days in Feb 2026.
    Risk score: 84.
    """
    customer = await seed_customer(
        session,
        full_name="Nitin Joshi",
        date_of_birth="1985-11-30",
        nationality="Indian",
        occupation="School Teacher",
        employer="Saraswati Vidya Mandir, Nagpur",
        declared_annual_income=120000.0,   # ₹1.2 L/year — government school pay
        risk_category="Medium",
        customer_since="2019-06-15",
        id_type="PAN",
        id_number="BXNPJ4821K",
        address="Flat 3B, Laxmi Nagar, Nagpur, Maharashtra - 440022",
        phone="+91-9823401122",
        email="nitin.joshi85@gmail.com",
        pep_status=False,
        previous_alert_count=0,
        kyc_verification_date="2019-06-15",
        kyc_last_update_date="2019-06-15",
        income_verification_notes="Salary slip from Saraswati Vidya Mandir (₹10K/month). No ITR on file. PAN verified.",
    )

    account = await seed_account(
        session,
        customer_id=customer.id,
        account_number="BOI-MH-10487362",
        account_type="Savings",
        branch="Bank of India, Nagpur Civil Lines Branch",
        opening_date="2019-06-15",
        status="Active",
        current_balance=1932000.0,
        currency="INR",
    )

    # --- Historical normal salary-account transactions ---------------------

    hist_txn_1 = await seed_transaction(
        session,
        account_id=account.id,
        transaction_date="2025-10-01T10:00:00",
        transaction_type="NEFT Credit",
        amount=10000.0,
        currency="INR",
        direction="credit",
        channel="NEFT",
        counterparty_name="Saraswati Vidya Mandir",
        counterparty_account="BOI-MH-SCHOOL001",
        counterparty_bank="Bank of India",
        location="Nagpur, Maharashtra",
        country="India",
        reference_number="SAL20251001001",
        description="Monthly salary — October 2025",
        is_flagged=False,
    )

    hist_txn_2 = await seed_transaction(
        session,
        account_id=account.id,
        transaction_date="2025-10-05T08:45:00",
        transaction_type="Bill Payment",
        amount=1200.0,
        currency="INR",
        direction="debit",
        channel="UPI",
        counterparty_name="MSEDCL Electricity",
        counterparty_account=None,
        counterparty_bank=None,
        location="Nagpur, Maharashtra",
        country="India",
        reference_number="BILL20251005001",
        description="Electricity bill payment — October 2025",
        is_flagged=False,
    )

    hist_txn_3 = await seed_transaction(
        session,
        account_id=account.id,
        transaction_date="2025-11-01T10:00:00",
        transaction_type="NEFT Credit",
        amount=10000.0,
        currency="INR",
        direction="credit",
        channel="NEFT",
        counterparty_name="Saraswati Vidya Mandir",
        counterparty_account="BOI-MH-SCHOOL001",
        counterparty_bank="Bank of India",
        location="Nagpur, Maharashtra",
        country="India",
        reference_number="SAL20251101001",
        description="Monthly salary — November 2025",
        is_flagged=False,
    )

    hist_txn_4 = await seed_transaction(
        session,
        account_id=account.id,
        transaction_date="2025-12-01T10:00:00",
        transaction_type="NEFT Credit",
        amount=10000.0,
        currency="INR",
        direction="credit",
        channel="NEFT",
        counterparty_name="Saraswati Vidya Mandir",
        counterparty_account="BOI-MH-SCHOOL001",
        counterparty_bank="Bank of India",
        location="Nagpur, Maharashtra",
        country="India",
        reference_number="SAL20251201001",
        description="Monthly salary — December 2025",
        is_flagged=False,
    )

    # --- Burst transactions: Feb 2026 spike (flagged) ----------------------

    burst_txn_1 = await seed_transaction(
        session,
        account_id=account.id,
        transaction_date="2026-02-03T09:10:00",
        transaction_type="IMPS Credit",
        amount=3500000.0,    # ₹35 L
        currency="INR",
        direction="credit",
        channel="IMPS",
        counterparty_name="Vijay Construction Works",
        counterparty_account="HDFC-MH-99234100",
        counterparty_bank="HDFC Bank, Pune",
        location="Pune, Maharashtra",
        country="India",
        reference_number="IMPS20260203001",
        description="Advance payment for works — no contract reference",
        is_flagged=True,
    )

    burst_txn_2 = await seed_transaction(
        session,
        account_id=account.id,
        transaction_date="2026-02-04T11:30:00",
        transaction_type="NEFT Credit",
        amount=4000000.0,    # ₹40 L
        currency="INR",
        direction="credit",
        channel="NEFT",
        counterparty_name="Omega Real Estates",
        counterparty_account="ICICI-MH-88710043",
        counterparty_bank="ICICI Bank, Mumbai",
        location="Mumbai, Maharashtra",
        country="India",
        reference_number="NEFT20260204001",
        description="Property deal advance — unverified",
        is_flagged=True,
    )

    burst_txn_3 = await seed_transaction(
        session,
        account_id=account.id,
        transaction_date="2026-02-05T14:00:00",
        transaction_type="NEFT Debit",
        amount=2500000.0,    # ₹25 L out — rapid pass-through
        currency="INR",
        direction="debit",
        channel="NEFT",
        counterparty_name="Rajan Mehta",
        counterparty_account="AXIS-GJ-77001122",
        counterparty_bank="Axis Bank, Surat",
        location="Surat, Gujarat",
        country="India",
        reference_number="NEFT20260205001",
        description="Transfer to personal account — purpose unstated",
        is_flagged=True,
    )

    burst_txn_4 = await seed_transaction(
        session,
        account_id=account.id,
        transaction_date="2026-02-06T10:45:00",
        transaction_type="IMPS Credit",
        amount=5500000.0,    # ₹55 L
        currency="INR",
        direction="credit",
        channel="IMPS",
        counterparty_name="BlueStar Logistics",
        counterparty_account="PNB-MH-66543210",
        counterparty_bank="Punjab National Bank, Mumbai",
        location="Mumbai, Maharashtra",
        country="India",
        reference_number="IMPS20260206001",
        description="Logistics payment — no shipment documents",
        is_flagged=True,
    )

    burst_txn_5 = await seed_transaction(
        session,
        account_id=account.id,
        transaction_date="2026-02-07T12:15:00",
        transaction_type="NEFT Debit",
        amount=3000000.0,    # ₹30 L out
        currency="INR",
        direction="debit",
        channel="NEFT",
        counterparty_name="Priya Finance",
        counterparty_account="SBI-TN-55223344",
        counterparty_bank="State Bank of India, Chennai",
        location="Chennai, Tamil Nadu",
        country="India",
        reference_number="NEFT20260207001",
        description="Loan repayment — no loan agreement on file",
        is_flagged=True,
    )

    burst_txn_6 = await seed_transaction(
        session,
        account_id=account.id,
        transaction_date="2026-02-10T09:30:00",
        transaction_type="NEFT Credit",
        amount=4500000.0,    # ₹45 L
        currency="INR",
        direction="credit",
        channel="NEFT",
        counterparty_name="Delta Pharma Distributors",
        counterparty_account="KOTAK-KA-44009911",
        counterparty_bank="Kotak Mahindra Bank, Bengaluru",
        location="Bengaluru, Karnataka",
        country="India",
        reference_number="NEFT20260210001",
        description="Distribution advance — no pharma license linked to customer",
        is_flagged=True,
    )

    flagged_ids = [
        burst_txn_1.id,
        burst_txn_2.id,
        burst_txn_3.id,
        burst_txn_4.id,
        burst_txn_5.id,
        burst_txn_6.id,
    ]
    total_flagged_amount = 3500000 + 4000000 + 2500000 + 5500000 + 3000000 + 4500000

    alert = await seed_alert(
        session,
        customer_id=customer.id,
        flagged_txn_ids=flagged_ids,
        alert_id="SA2",
        typology=TYPOLOGY_SUDDEN_ACTIVITY,
        risk_score=84,
        status="New",
        title="SA2 — School-teacher salary account jumps from ₹10 K/month to ₹20 L+ in 8 days",
        description=(
            "Nitin Joshi is a school teacher at Saraswati Vidya Mandir, Nagpur, with a declared annual "
            "income of ₹1,20,000. His Bank of India savings account has exhibited a consistent and "
            "predictable pattern: a ₹10,000 salary credit on the 1st of each month and minor utility "
            "debit payments. Between 3 February 2026 and 10 February 2026 — a span of 8 days — the "
            "account processed ₹21,000,000 across six transactions (four credits totalling ₹17.5 L and "
            "two debits totalling ₹5.5 L). Counterparties include construction firms, real estate "
            "companies, logistics businesses, and pharma distributors across five states — none "
            "consistent with a school teacher's professional or income profile. The rapid debit "
            "outflows immediately following large credits suggest potential pass-through mule account "
            "behaviour. Risk score elevated to 84 due to high transaction velocity, large absolute "
            "amounts, multi-state counterparties, and extreme income-to-transaction disparity."
        ),
        triggered_date="2026-02-11T09:00:00",
        assigned_analyst=None,
        total_flagged_amount=float(total_flagged_amount),
        flagged_transaction_count=len(flagged_ids),
    )

    await seed_checklist(session, alert_id=alert.id, typology=TYPOLOGY_SUDDEN_ACTIVITY)

    _ = hist_txn_1, hist_txn_2, hist_txn_3, hist_txn_4


# ---------------------------------------------------------------------------
# SA3 — Fatima Sheikh
# ---------------------------------------------------------------------------

async def _seed_sa3_fatima_sheikh(session: AsyncSession) -> None:
    """
    SA3: Home-maker account dormant for 8 months, then ₹30 L in 10 days.

    Historical baseline: Occasional grocery/household cash withdrawals;
    last activity was April 2025.
    Spike period: ₹30 L in cash deposits and IMPS transfers across Jan 2026.
    Risk score: 71.
    """
    customer = await seed_customer(
        session,
        full_name="Fatima Sheikh",
        date_of_birth="1990-07-25",
        nationality="Indian",
        occupation="Home-maker",
        employer=None,
        declared_annual_income=0.0,        # No declared income
        risk_category="Low",
        customer_since="2018-03-10",
        id_type="Aadhaar",
        id_number="XXXX-XXXX-7734",
        address="15/B Noor Colony, Bhopal, Madhya Pradesh - 462001",
        phone="+91-9977334455",
        email=None,
        pep_status=False,
        previous_alert_count=0,
        kyc_verification_date="2018-03-10",
        kyc_last_update_date="2018-03-10",
        income_verification_notes="No income documents. Husband's Aadhaar provided as reference. No ITR on file. Zero declared income.",
    )

    account = await seed_account(
        session,
        customer_id=customer.id,
        account_number="UCO-MP-30182746",
        account_type="Savings",
        branch="UCO Bank, Bhopal Main Branch",
        opening_date="2018-03-10",
        status="Active",
        current_balance=2987000.0,
        currency="INR",
    )

    # --- Historical low-activity transactions (pre-dormancy period) --------

    hist_txn_1 = await seed_transaction(
        session,
        account_id=account.id,
        transaction_date="2025-01-18T10:00:00",
        transaction_type="Cash Withdrawal",
        amount=2000.0,
        currency="INR",
        direction="debit",
        channel="cash",
        counterparty_name=None,
        counterparty_account=None,
        counterparty_bank=None,
        location="Bhopal, Madhya Pradesh",
        country="India",
        reference_number="WD20250118001",
        description="ATM withdrawal — household expenses",
        is_flagged=False,
    )

    hist_txn_2 = await seed_transaction(
        session,
        account_id=account.id,
        transaction_date="2025-02-20T11:30:00",
        transaction_type="Cash Withdrawal",
        amount=3500.0,
        currency="INR",
        direction="debit",
        channel="cash",
        counterparty_name=None,
        counterparty_account=None,
        counterparty_bank=None,
        location="Bhopal, Madhya Pradesh",
        country="India",
        reference_number="WD20250220001",
        description="ATM withdrawal — grocery and utilities",
        is_flagged=False,
    )

    hist_txn_3 = await seed_transaction(
        session,
        account_id=account.id,
        transaction_date="2025-04-05T09:00:00",
        transaction_type="Cash Deposit",
        amount=5000.0,
        currency="INR",
        direction="credit",
        channel="cash",
        counterparty_name=None,
        counterparty_account=None,
        counterparty_bank=None,
        location="Bhopal, Madhya Pradesh",
        country="India",
        reference_number="CD20250405001",
        description="Cash deposit — household savings",
        is_flagged=False,
    )

    # Account goes dormant after April 2025; no transactions from May–Dec 2025.

    # --- Burst transactions: Jan 2026 spike (flagged) ----------------------

    burst_txn_1 = await seed_transaction(
        session,
        account_id=account.id,
        transaction_date="2026-01-08T10:20:00",
        transaction_type="Cash Deposit",
        amount=5000000.0,    # ₹50 L cash deposit — significant single entry
        currency="INR",
        direction="credit",
        channel="cash",
        counterparty_name=None,
        counterparty_account=None,
        counterparty_bank=None,
        location="Bhopal, Madhya Pradesh",
        country="India",
        reference_number="CD20260108001",
        description="Cash deposit — source of funds not disclosed at counter",
        is_flagged=True,
    )

    burst_txn_2 = await seed_transaction(
        session,
        account_id=account.id,
        transaction_date="2026-01-09T11:45:00",
        transaction_type="IMPS Credit",
        amount=6000000.0,    # ₹60 L
        currency="INR",
        direction="credit",
        channel="IMPS",
        counterparty_name="Khalid Traders",
        counterparty_account="SBI-MP-22334455",
        counterparty_bank="State Bank of India, Bhopal",
        location="Bhopal, Madhya Pradesh",
        country="India",
        reference_number="IMPS20260109001",
        description="Payment from trader — relationship to account holder unverified",
        is_flagged=True,
    )

    burst_txn_3 = await seed_transaction(
        session,
        account_id=account.id,
        transaction_date="2026-01-11T14:30:00",
        transaction_type="Cash Deposit",
        amount=4500000.0,    # ₹45 L
        currency="INR",
        direction="credit",
        channel="cash",
        counterparty_name=None,
        counterparty_account=None,
        counterparty_bank=None,
        location="Bhopal, Madhya Pradesh",
        country="India",
        reference_number="CD20260111001",
        description="Cash deposit — counter staff noted large denomination notes",
        is_flagged=True,
    )

    burst_txn_4 = await seed_transaction(
        session,
        account_id=account.id,
        transaction_date="2026-01-13T09:00:00",
        transaction_type="NEFT Credit",
        amount=7000000.0,    # ₹70 L
        currency="INR",
        direction="credit",
        channel="NEFT",
        counterparty_name="Millennium Infrastructure",
        counterparty_account="HDFC-MH-11223344",
        counterparty_bank="HDFC Bank, Nagpur",
        location="Nagpur, Maharashtra",
        country="India",
        reference_number="NEFT20260113001",
        description="Project advance — no business relationship established with customer",
        is_flagged=True,
    )

    burst_txn_5 = await seed_transaction(
        session,
        account_id=account.id,
        transaction_date="2026-01-15T13:10:00",
        transaction_type="IMPS Credit",
        amount=4500000.0,    # ₹45 L
        currency="INR",
        direction="credit",
        channel="IMPS",
        counterparty_name="Zara Exports",
        counterparty_account="ICICI-GJ-00987654",
        counterparty_bank="ICICI Bank, Surat",
        location="Surat, Gujarat",
        country="India",
        reference_number="IMPS20260115001",
        description="Export proceeds — customer has no declared export business",
        is_flagged=True,
    )

    burst_txn_6 = await seed_transaction(
        session,
        account_id=account.id,
        transaction_date="2026-01-17T10:00:00",
        transaction_type="NEFT Debit",
        amount=3000000.0,    # ₹30 L out — immediate onward transfer
        currency="INR",
        direction="debit",
        channel="NEFT",
        counterparty_name="Abdul Farooq",
        counterparty_account="BOB-MP-33445566",
        counterparty_bank="Bank of Baroda, Bhopal",
        location="Bhopal, Madhya Pradesh",
        country="India",
        reference_number="NEFT20260117001",
        description="Transfer to third party — relationship to account holder unknown",
        is_flagged=True,
    )

    flagged_ids = [
        burst_txn_1.id,
        burst_txn_2.id,
        burst_txn_3.id,
        burst_txn_4.id,
        burst_txn_5.id,
        burst_txn_6.id,
    ]
    # Net activity: ₹27 L credits + ₹30 L debit = ₹30 L total flagged volume
    total_flagged_amount = 5000000 + 6000000 + 4500000 + 7000000 + 4500000 + 3000000

    alert = await seed_alert(
        session,
        customer_id=customer.id,
        flagged_txn_ids=flagged_ids,
        alert_id="SA3",
        typology=TYPOLOGY_SUDDEN_ACTIVITY,
        risk_score=71,
        status="New",
        title="SA3 — Home-maker account dormant 8 months, then ₹30 L+ activity across 10 days",
        description=(
            "Fatima Sheikh is a home-maker with zero declared income, resident in Bhopal, Madhya Pradesh. "
            "Her UCO Bank savings account showed minimal usage through April 2025 — limited to occasional "
            "small ATM withdrawals and one household cash deposit — before becoming completely dormant for "
            "approximately 8 months (May 2025 to December 2025). On 8 January 2026, the account re-activated "
            "with a ₹50,00,000 cash deposit with no source-of-funds disclosure. Over the following 10 days "
            "through 17 January 2026, the account received an additional ₹22,000,000 in IMPS and NEFT "
            "credits from traders, infrastructure companies, and export firms across multiple states, "
            "followed by a ₹30,00,000 outward NEFT transfer to an unrelated third party. Total flagged "
            "transaction value is ₹30,000,000. For a home-maker with no income, the sudden reactivation "
            "with large-denomination cash deposits and multi-state commercial counterparties is highly "
            "anomalous. The dormancy-then-burst pattern, combined with the immediate onward transfer, "
            "raises concerns of account mule activity or third-party fund placement."
        ),
        triggered_date="2026-01-18T09:00:00",
        assigned_analyst=None,
        total_flagged_amount=float(total_flagged_amount),
        flagged_transaction_count=len(flagged_ids),
    )

    await seed_checklist(session, alert_id=alert.id, typology=TYPOLOGY_SUDDEN_ACTIVITY)

    _ = hist_txn_1, hist_txn_2, hist_txn_3
