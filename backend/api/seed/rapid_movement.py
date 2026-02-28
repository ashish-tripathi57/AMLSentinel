"""
Seeder for the Rapid Fund Movement typology (alerts R1, R2, R3).

Pattern: Funds credited to an account and debited within hours or a single
business day, with little or no holding time — a classic pass-through / mule
account indicator.

Alerts seeded:
  R1 — Sanjay Kapoor  : construction business, funds in-and-out same day
  R2 — Meena Iyer     : student account forwarding large credits immediately
  R3 — Rohit Agarwal  : trading account with same-day matched pairs to/from
                        the same counterparties
"""

from sqlalchemy.ext.asyncio import AsyncSession

from api.seed.base import seed_alert, seed_checklist, seed_customer, seed_account, seed_transaction
from api.seed.data_spec import TYPOLOGY_RAPID_MOVEMENT


async def seed_rapid_movement(session: AsyncSession) -> None:
    """Seed Rapid Fund Movement alerts R1, R2, and R3 into the database."""
    await _seed_r1_sanjay_kapoor(session)
    await _seed_r2_meena_iyer(session)
    await _seed_r3_rohit_agarwal(session)


# ---------------------------------------------------------------------------
# R1 — Sanjay Kapoor
# Construction business; funds credited and debited within 24 hours repeatedly.
# Risk score: 83
# ---------------------------------------------------------------------------

async def _seed_r1_sanjay_kapoor(session: AsyncSession) -> None:
    customer = await seed_customer(
        session,
        full_name="Sanjay Kapoor",
        date_of_birth="1979-03-14",
        nationality="Indian",
        occupation="Business Owner",
        employer="Kapoor Construction Pvt Ltd",
        declared_annual_income=3_600_000.0,   # ₹36L declared income
        risk_category="High",
        customer_since="2018-06-01",
        id_type="PAN",
        id_number="BZPSK7823Q",
        address="14, Sector 22, Gurugram, Haryana 122001",
        phone="+91-9811045678",
        email="sanjay.kapoor@kapoorconstruction.in",
        pep_status=False,
        previous_alert_count=1,
        kyc_verification_date="2018-04-10",
        kyc_last_update_date="2022-03-15",
        income_verification_notes="GSTIN registered construction firm. ITR FY 2021-22 showing ₹1.2Cr turnover. MSME Udyam registration on file.",
    )

    # Primary current account used for construction project payables
    primary_account = await seed_account(
        session,
        customer_id=customer.id,
        account_number="HDFC0011230001",
        account_type="Current",
        branch="Gurugram Sector-22 Branch, HDFC Bank",
        opening_date="2018-06-15",
        status="Active",
        current_balance=187_500.0,
        currency="INR",
    )

    # --- Background / normal transactions (establish legitimate activity) ---

    await seed_transaction(
        session,
        account_id=primary_account.id,
        transaction_date="2026-01-03T10:15:00",
        transaction_type="NEFT",
        amount=450_000.0,
        currency="INR",
        direction="credit",
        channel="NEFT",
        counterparty_name="DLF Projects Ltd",
        counterparty_account="ICIC0092345001",
        counterparty_bank="ICICI Bank",
        location="Gurugram",
        country="India",
        reference_number="NEFT260103001",
        description="Advance payment — Plot 4A site preparation",
        is_flagged=False,
    )

    await seed_transaction(
        session,
        account_id=primary_account.id,
        transaction_date="2026-01-03T14:40:00",
        transaction_type="RTGS",
        amount=430_000.0,
        currency="INR",
        direction="debit",
        channel="RTGS",
        counterparty_name="Sharma Raw Materials",
        counterparty_account="PNB00445678",
        counterparty_bank="Punjab National Bank",
        location="Gurugram",
        country="India",
        reference_number="RTGS260103001",
        description="Material procurement — Plot 4A",
        is_flagged=False,
    )

    await seed_transaction(
        session,
        account_id=primary_account.id,
        transaction_date="2026-01-08T09:00:00",
        transaction_type="NEFT",
        amount=120_000.0,
        currency="INR",
        direction="credit",
        channel="NEFT",
        counterparty_name="Payroll clearing",
        counterparty_account="HDFC0011230001",
        counterparty_bank="HDFC Bank",
        location="Gurugram",
        country="India",
        reference_number="NEFT260108001",
        description="Weekly labour subcontractor payout — inbound",
        is_flagged=False,
    )

    # --- Flagged transactions: rapid in-then-out pairs ---

    # Pair 1: 2026-01-13 — ₹18L in, ₹17.8L out same day
    flagged_credit_1 = await seed_transaction(
        session,
        account_id=primary_account.id,
        transaction_date="2026-01-13T08:55:00",
        transaction_type="RTGS",
        amount=1_800_000.0,
        currency="INR",
        direction="credit",
        channel="RTGS",
        counterparty_name="Verma Infra Partners",
        counterparty_account="AXIS0034567001",
        counterparty_bank="Axis Bank",
        location="Delhi",
        country="India",
        reference_number="RTGS260113001",
        description="Project advance — commercial block Phase 2",
        is_flagged=True,
    )

    flagged_debit_1 = await seed_transaction(
        session,
        account_id=primary_account.id,
        transaction_date="2026-01-13T11:22:00",
        transaction_type="RTGS",
        amount=1_780_000.0,
        currency="INR",
        direction="debit",
        channel="RTGS",
        counterparty_name="Rajan Infra Solutions",
        counterparty_account="KOTAK009876543",
        counterparty_bank="Kotak Mahindra Bank",
        location="Gurugram",
        country="India",
        reference_number="RTGS260113002",
        description="Subcontractor disbursement — Phase 2",
        is_flagged=True,
    )

    # Pair 2: 2026-01-20 — ₹22L in, ₹21.5L out next morning (< 20 hours)
    flagged_credit_2 = await seed_transaction(
        session,
        account_id=primary_account.id,
        transaction_date="2026-01-20T17:10:00",
        transaction_type="RTGS",
        amount=2_200_000.0,
        currency="INR",
        direction="credit",
        channel="RTGS",
        counterparty_name="Verma Infra Partners",
        counterparty_account="AXIS0034567001",
        counterparty_bank="Axis Bank",
        location="Delhi",
        country="India",
        reference_number="RTGS260120001",
        description="2nd tranche — commercial block Phase 2",
        is_flagged=True,
    )

    flagged_debit_2 = await seed_transaction(
        session,
        account_id=primary_account.id,
        transaction_date="2026-01-21T09:05:00",
        transaction_type="RTGS",
        amount=2_150_000.0,
        currency="INR",
        direction="debit",
        channel="RTGS",
        counterparty_name="Rajan Infra Solutions",
        counterparty_account="KOTAK009876543",
        counterparty_bank="Kotak Mahindra Bank",
        location="Gurugram",
        country="India",
        reference_number="RTGS260121001",
        description="Subcontractor disbursement — Phase 2 2nd tranche",
        is_flagged=True,
    )

    # Pair 3: 2026-01-27 — ₹30L in, ₹29.7L out same day
    flagged_credit_3 = await seed_transaction(
        session,
        account_id=primary_account.id,
        transaction_date="2026-01-27T10:00:00",
        transaction_type="RTGS",
        amount=3_000_000.0,
        currency="INR",
        direction="credit",
        channel="RTGS",
        counterparty_name="Verma Infra Partners",
        counterparty_account="AXIS0034567001",
        counterparty_bank="Axis Bank",
        location="Delhi",
        country="India",
        reference_number="RTGS260127001",
        description="Final tranche — commercial block Phase 2",
        is_flagged=True,
    )

    flagged_debit_3 = await seed_transaction(
        session,
        account_id=primary_account.id,
        transaction_date="2026-01-27T14:35:00",
        transaction_type="RTGS",
        amount=2_970_000.0,
        currency="INR",
        direction="debit",
        channel="RTGS",
        counterparty_name="Rajan Infra Solutions",
        counterparty_account="KOTAK009876543",
        counterparty_bank="Kotak Mahindra Bank",
        location="Gurugram",
        country="India",
        reference_number="RTGS260127002",
        description="Subcontractor disbursement — Phase 2 final",
        is_flagged=True,
    )

    r1_flagged_txn_ids = [
        flagged_credit_1.id,
        flagged_debit_1.id,
        flagged_credit_2.id,
        flagged_debit_2.id,
        flagged_credit_3.id,
        flagged_debit_3.id,
    ]

    total_flagged_amount = (
        1_800_000.0 + 2_200_000.0 + 3_000_000.0  # credits only for amount tally
    )

    alert = await seed_alert(
        session,
        customer_id=customer.id,
        flagged_txn_ids=r1_flagged_txn_ids,
        alert_id="R1",
        typology=TYPOLOGY_RAPID_MOVEMENT,
        risk_score=83,
        status="New",
        title="Rapid Pass-Through Fund Movement — Sanjay Kapoor (Construction)",
        description=(
            "Customer's current account is receiving large RTGS credits from a single "
            "corporate counterparty (Verma Infra Partners) and forwarding near-identical "
            "amounts to a second entity (Rajan Infra Solutions) within 2–6 hours on the "
            "same day, across three consecutive weeks in January 2026. Total inflow of "
            "₹70,00,000 passed through with a holding time consistently under 24 hours, "
            "suggesting the account is acting as a conduit rather than an end-point."
        ),
        triggered_date="2026-01-27T15:00:00",
        assigned_analyst=None,
        total_flagged_amount=total_flagged_amount,
        flagged_transaction_count=len(r1_flagged_txn_ids),
    )

    await seed_checklist(session, alert_id=alert.id, typology=TYPOLOGY_RAPID_MOVEMENT)


# ---------------------------------------------------------------------------
# R2 — Meena Iyer
# Student account receiving large credits and immediately forwarding them to
# multiple third-party accounts. Risk score: 90
# ---------------------------------------------------------------------------

async def _seed_r2_meena_iyer(session: AsyncSession) -> None:
    customer = await seed_customer(
        session,
        full_name="Meena Iyer",
        date_of_birth="2001-09-22",
        nationality="Indian",
        occupation="Student",
        employer=None,
        declared_annual_income=0.0,   # No declared income; student
        risk_category="High",
        customer_since="2021-08-10",
        id_type="Aadhaar",
        id_number="2384 6712 9034",
        address="Room 304, Laxmi PG Hostel, Koramangala, Bengaluru 560034",
        phone="+91-8123456789",
        email="meena.iyer2001@gmail.com",
        pep_status=False,
        previous_alert_count=0,
        kyc_verification_date="2023-01-15",
        kyc_last_update_date="2023-01-15",
        income_verification_notes="Student ID from Delhi University on file. No income declared. Father listed as guardian on account.",
    )

    # Savings account opened for college fee and stipend management
    savings_account = await seed_account(
        session,
        customer_id=customer.id,
        account_number="SBI0078905678",
        account_type="Savings",
        branch="Koramangala Branch, State Bank of India",
        opening_date="2021-08-12",
        status="Active",
        current_balance=62_000.0,
        currency="INR",
    )

    # --- Background / normal transactions ---

    await seed_transaction(
        session,
        account_id=savings_account.id,
        transaction_date="2025-12-05T11:00:00",
        transaction_type="NEFT",
        amount=15_000.0,
        currency="INR",
        direction="credit",
        channel="NEFT",
        counterparty_name="Iyer Family — Thiruvananthapuram",
        counterparty_account="SBI0045612345",
        counterparty_bank="State Bank of India",
        location="Thiruvananthapuram",
        country="India",
        reference_number="NEFT251205001",
        description="Monthly family allowance",
        is_flagged=False,
    )

    await seed_transaction(
        session,
        account_id=savings_account.id,
        transaction_date="2025-12-07T13:30:00",
        transaction_type="UPI",
        amount=8_500.0,
        currency="INR",
        direction="debit",
        channel="UPI",
        counterparty_name="Sri Venkateswara Mess",
        counterparty_account="UPI@srivenkmess",
        counterparty_bank="ICICI Bank",
        location="Bengaluru",
        country="India",
        reference_number="UPI251207001",
        description="Mess fees — December",
        is_flagged=False,
    )

    # --- Flagged transactions: large credits forwarded immediately ---

    # Episode 1: 2026-01-06 — ₹8L credited, split and forwarded same day
    flagged_credit_1 = await seed_transaction(
        session,
        account_id=savings_account.id,
        transaction_date="2026-01-06T09:10:00",
        transaction_type="IMPS",
        amount=800_000.0,
        currency="INR",
        direction="credit",
        channel="IMPS",
        counterparty_name="Prakash Ventures",
        counterparty_account="HDFC0099001122",
        counterparty_bank="HDFC Bank",
        location="Mumbai",
        country="India",
        reference_number="IMPS260106001",
        description="Internship stipend — Q4 2025",
        is_flagged=True,
    )

    flagged_debit_1a = await seed_transaction(
        session,
        account_id=savings_account.id,
        transaction_date="2026-01-06T09:55:00",
        transaction_type="IMPS",
        amount=350_000.0,
        currency="INR",
        direction="debit",
        channel="IMPS",
        counterparty_name="Arjun Nair",
        counterparty_account="AXIS0067891234",
        counterparty_bank="Axis Bank",
        location="Bengaluru",
        country="India",
        reference_number="IMPS260106002",
        description="Transfer to friend — sharing arrangement",
        is_flagged=True,
    )

    flagged_debit_1b = await seed_transaction(
        session,
        account_id=savings_account.id,
        transaction_date="2026-01-06T10:12:00",
        transaction_type="IMPS",
        amount=420_000.0,
        currency="INR",
        direction="debit",
        channel="IMPS",
        counterparty_name="Divya Krishnan",
        counterparty_account="KOTAK008765432",
        counterparty_bank="Kotak Mahindra Bank",
        location="Bengaluru",
        country="India",
        reference_number="IMPS260106003",
        description="Course fee reimbursement",
        is_flagged=True,
    )

    # Episode 2: 2026-01-20 — ₹12L credited, forwarded within 3 hours
    flagged_credit_2 = await seed_transaction(
        session,
        account_id=savings_account.id,
        transaction_date="2026-01-20T14:05:00",
        transaction_type="NEFT",
        amount=1_200_000.0,
        currency="INR",
        direction="credit",
        channel="NEFT",
        counterparty_name="Prakash Ventures",
        counterparty_account="HDFC0099001122",
        counterparty_bank="HDFC Bank",
        location="Mumbai",
        country="India",
        reference_number="NEFT260120001",
        description="Project milestone payment",
        is_flagged=True,
    )

    flagged_debit_2a = await seed_transaction(
        session,
        account_id=savings_account.id,
        transaction_date="2026-01-20T14:48:00",
        transaction_type="NEFT",
        amount=500_000.0,
        currency="INR",
        direction="debit",
        channel="NEFT",
        counterparty_name="Arjun Nair",
        counterparty_account="AXIS0067891234",
        counterparty_bank="Axis Bank",
        location="Bengaluru",
        country="India",
        reference_number="NEFT260120002",
        description="Forwarding — living expenses",
        is_flagged=True,
    )

    flagged_debit_2b = await seed_transaction(
        session,
        account_id=savings_account.id,
        transaction_date="2026-01-20T15:30:00",
        transaction_type="NEFT",
        amount=650_000.0,
        currency="INR",
        direction="debit",
        channel="NEFT",
        counterparty_name="Divya Krishnan",
        counterparty_account="KOTAK008765432",
        counterparty_bank="Kotak Mahindra Bank",
        location="Bengaluru",
        country="India",
        reference_number="NEFT260120003",
        description="Forwarding — project share",
        is_flagged=True,
    )

    # Episode 3: 2026-02-03 — ₹15L credited, forwarded same day to a new recipient
    flagged_credit_3 = await seed_transaction(
        session,
        account_id=savings_account.id,
        transaction_date="2026-02-03T11:20:00",
        transaction_type="RTGS",
        amount=1_500_000.0,
        currency="INR",
        direction="credit",
        channel="RTGS",
        counterparty_name="Prakash Ventures",
        counterparty_account="HDFC0099001122",
        counterparty_bank="HDFC Bank",
        location="Mumbai",
        country="India",
        reference_number="RTGS260203001",
        description="Consulting fee — Jan 2026",
        is_flagged=True,
    )

    flagged_debit_3a = await seed_transaction(
        session,
        account_id=savings_account.id,
        transaction_date="2026-02-03T12:05:00",
        transaction_type="RTGS",
        amount=700_000.0,
        currency="INR",
        direction="debit",
        channel="RTGS",
        counterparty_name="Arjun Nair",
        counterparty_account="AXIS0067891234",
        counterparty_bank="Axis Bank",
        location="Bengaluru",
        country="India",
        reference_number="RTGS260203002",
        description="Transfer — shared expense",
        is_flagged=True,
    )

    flagged_debit_3b = await seed_transaction(
        session,
        account_id=savings_account.id,
        transaction_date="2026-02-03T12:50:00",
        transaction_type="RTGS",
        amount=750_000.0,
        currency="INR",
        direction="debit",
        channel="RTGS",
        counterparty_name="Suresh Menon",   # new recipient in episode 3
        counterparty_account="BOI00567890",
        counterparty_bank="Bank of India",
        location="Kochi",
        country="India",
        reference_number="RTGS260203003",
        description="Transfer — accommodation advance",
        is_flagged=True,
    )

    r2_flagged_txn_ids = [
        flagged_credit_1.id,
        flagged_debit_1a.id,
        flagged_debit_1b.id,
        flagged_credit_2.id,
        flagged_debit_2a.id,
        flagged_debit_2b.id,
        flagged_credit_3.id,
        flagged_debit_3a.id,
        flagged_debit_3b.id,
    ]

    total_flagged_amount = 800_000.0 + 1_200_000.0 + 1_500_000.0  # inbound credits

    alert = await seed_alert(
        session,
        customer_id=customer.id,
        flagged_txn_ids=r2_flagged_txn_ids,
        alert_id="R2",
        typology=TYPOLOGY_RAPID_MOVEMENT,
        risk_score=90,
        status="New",
        title="Student Account Acting as Pass-Through — Meena Iyer",
        description=(
            "A student savings account with no declared income has received three large "
            "IMPS/NEFT/RTGS credits totalling ₹35,00,000 from a single Mumbai-based "
            "corporate entity (Prakash Ventures) between January and February 2026. In each "
            "episode the full credit is split and forwarded to two or more third-party "
            "accounts within 45–90 minutes, leaving a near-zero residual balance. The "
            "account profile (student, nil income, small hometown allowances) is entirely "
            "inconsistent with the transaction volumes observed, strongly suggesting use as "
            "a mule account."
        ),
        triggered_date="2026-02-03T13:30:00",
        assigned_analyst=None,
        total_flagged_amount=total_flagged_amount,
        flagged_transaction_count=len(r2_flagged_txn_ids),
    )

    await seed_checklist(session, alert_id=alert.id, typology=TYPOLOGY_RAPID_MOVEMENT)


# ---------------------------------------------------------------------------
# R3 — Rohit Agarwal
# Trading account with same-day matched credits and debits to/from the same
# counterparties. Risk score: 76
# ---------------------------------------------------------------------------

async def _seed_r3_rohit_agarwal(session: AsyncSession) -> None:
    customer = await seed_customer(
        session,
        full_name="Rohit Agarwal",
        date_of_birth="1985-11-30",
        nationality="Indian",
        occupation="Commodities Trader",
        employer="Self-employed",
        declared_annual_income=5_000_000.0,   # ₹50L declared income
        risk_category="Medium",
        customer_since="2016-03-22",
        id_type="PAN",
        id_number="AHQRA4512L",
        address="B-7, Lajpat Nagar III, New Delhi 110024",
        phone="+91-9999012345",
        email="rohit.agarwal@agtrading.co.in",
        pep_status=False,
        previous_alert_count=0,
        kyc_verification_date="2017-08-22",
        kyc_last_update_date="2020-06-10",
        income_verification_notes="MCX membership #CT2017-0456. ITR FY 2019-20 showing ₹84L. PAN verified. No recent financials.",
    )

    # Current account used for commodity trade settlements
    trading_account = await seed_account(
        session,
        customer_id=customer.id,
        account_number="ICIC0034570001",
        account_type="Current",
        branch="Lajpat Nagar Branch, ICICI Bank",
        opening_date="2016-04-01",
        status="Active",
        current_balance=310_000.0,
        currency="INR",
    )

    # --- Background / normal transactions ---

    await seed_transaction(
        session,
        account_id=trading_account.id,
        transaction_date="2025-12-10T09:30:00",
        transaction_type="NEFT",
        amount=250_000.0,
        currency="INR",
        direction="credit",
        channel="NEFT",
        counterparty_name="MCX Settlement A/c",
        counterparty_account="MCX0000000001",
        counterparty_bank="HDFC Bank",
        location="Mumbai",
        country="India",
        reference_number="NEFT251210001",
        description="MCX commodity profit settlement",
        is_flagged=False,
    )

    await seed_transaction(
        session,
        account_id=trading_account.id,
        transaction_date="2025-12-10T11:00:00",
        transaction_type="NEFT",
        amount=180_000.0,
        currency="INR",
        direction="debit",
        channel="NEFT",
        counterparty_name="Gupta Agro Commodities",
        counterparty_account="SBI0091234567",
        counterparty_bank="State Bank of India",
        location="Delhi",
        country="India",
        reference_number="NEFT251210002",
        description="Spot purchase — mustard seed lot",
        is_flagged=False,
    )

    await seed_transaction(
        session,
        account_id=trading_account.id,
        transaction_date="2025-12-18T14:00:00",
        transaction_type="RTGS",
        amount=500_000.0,
        currency="INR",
        direction="credit",
        channel="RTGS",
        counterparty_name="Mehta Traders",
        counterparty_account="AXIS0056781234",
        counterparty_bank="Axis Bank",
        location="Delhi",
        country="India",
        reference_number="RTGS251218001",
        description="Forward contract settlement — soy",
        is_flagged=False,
    )

    # --- Flagged transactions: same-day matched pairs with identical counterparties ---

    # Pair 1: 2026-01-08 — ₹20L from Alpha Commodity, same amount back same day
    flagged_credit_1 = await seed_transaction(
        session,
        account_id=trading_account.id,
        transaction_date="2026-01-08T09:45:00",
        transaction_type="RTGS",
        amount=2_000_000.0,
        currency="INR",
        direction="credit",
        channel="RTGS",
        counterparty_name="Alpha Commodity Brokers",
        counterparty_account="HDFC0022334455",
        counterparty_bank="HDFC Bank",
        location="Mumbai",
        country="India",
        reference_number="RTGS260108001",
        description="Trade margin — Jan futures",
        is_flagged=True,
    )

    flagged_debit_1 = await seed_transaction(
        session,
        account_id=trading_account.id,
        transaction_date="2026-01-08T15:10:00",
        transaction_type="RTGS",
        amount=1_980_000.0,
        currency="INR",
        direction="debit",
        channel="RTGS",
        counterparty_name="Alpha Commodity Brokers",
        counterparty_account="HDFC0022334455",
        counterparty_bank="HDFC Bank",
        location="Mumbai",
        country="India",
        reference_number="RTGS260108002",
        description="Return of excess margin — Jan futures",
        is_flagged=True,
    )

    # Pair 2: 2026-01-15 — ₹35L from Beta Mercantile, returned same day
    flagged_credit_2 = await seed_transaction(
        session,
        account_id=trading_account.id,
        transaction_date="2026-01-15T10:00:00",
        transaction_type="RTGS",
        amount=3_500_000.0,
        currency="INR",
        direction="credit",
        channel="RTGS",
        counterparty_name="Beta Mercantile Pvt Ltd",
        counterparty_account="PNB0087654321",
        counterparty_bank="Punjab National Bank",
        location="Delhi",
        country="India",
        reference_number="RTGS260115001",
        description="Spot commodity advance — cumin lot",
        is_flagged=True,
    )

    flagged_debit_2 = await seed_transaction(
        session,
        account_id=trading_account.id,
        transaction_date="2026-01-15T14:55:00",
        transaction_type="RTGS",
        amount=3_480_000.0,
        currency="INR",
        direction="debit",
        channel="RTGS",
        counterparty_name="Beta Mercantile Pvt Ltd",
        counterparty_account="PNB0087654321",
        counterparty_bank="Punjab National Bank",
        location="Delhi",
        country="India",
        reference_number="RTGS260115002",
        description="Refund of commodity advance — cumin lot cancelled",
        is_flagged=True,
    )

    # Pair 3: 2026-01-22 — ₹28L from Alpha Commodity again, returned same day
    flagged_credit_3 = await seed_transaction(
        session,
        account_id=trading_account.id,
        transaction_date="2026-01-22T09:30:00",
        transaction_type="RTGS",
        amount=2_800_000.0,
        currency="INR",
        direction="credit",
        channel="RTGS",
        counterparty_name="Alpha Commodity Brokers",
        counterparty_account="HDFC0022334455",
        counterparty_bank="HDFC Bank",
        location="Mumbai",
        country="India",
        reference_number="RTGS260122001",
        description="Margin top-up — Feb futures",
        is_flagged=True,
    )

    flagged_debit_3 = await seed_transaction(
        session,
        account_id=trading_account.id,
        transaction_date="2026-01-22T13:45:00",
        transaction_type="RTGS",
        amount=2_775_000.0,
        currency="INR",
        direction="debit",
        channel="RTGS",
        counterparty_name="Alpha Commodity Brokers",
        counterparty_account="HDFC0022334455",
        counterparty_bank="HDFC Bank",
        location="Mumbai",
        country="India",
        reference_number="RTGS260122002",
        description="Margin withdrawal — Feb futures position closed",
        is_flagged=True,
    )

    # Pair 4: 2026-02-05 — ₹50L from Beta Mercantile, returned same day (largest)
    flagged_credit_4 = await seed_transaction(
        session,
        account_id=trading_account.id,
        transaction_date="2026-02-05T10:15:00",
        transaction_type="RTGS",
        amount=5_000_000.0,
        currency="INR",
        direction="credit",
        channel="RTGS",
        counterparty_name="Beta Mercantile Pvt Ltd",
        counterparty_account="PNB0087654321",
        counterparty_bank="Punjab National Bank",
        location="Delhi",
        country="India",
        reference_number="RTGS260205001",
        description="Trade advance — large cardamom lot",
        is_flagged=True,
    )

    flagged_debit_4 = await seed_transaction(
        session,
        account_id=trading_account.id,
        transaction_date="2026-02-05T16:30:00",
        transaction_type="RTGS",
        amount=4_960_000.0,
        currency="INR",
        direction="debit",
        channel="RTGS",
        counterparty_name="Beta Mercantile Pvt Ltd",
        counterparty_account="PNB0087654321",
        counterparty_bank="Punjab National Bank",
        location="Delhi",
        country="India",
        reference_number="RTGS260205002",
        description="Refund — cardamom lot deal fell through",
        is_flagged=True,
    )

    r3_flagged_txn_ids = [
        flagged_credit_1.id,
        flagged_debit_1.id,
        flagged_credit_2.id,
        flagged_debit_2.id,
        flagged_credit_3.id,
        flagged_debit_3.id,
        flagged_credit_4.id,
        flagged_debit_4.id,
    ]

    total_flagged_amount = (
        2_000_000.0 + 3_500_000.0 + 2_800_000.0 + 5_000_000.0  # credit legs
    )

    alert = await seed_alert(
        session,
        customer_id=customer.id,
        flagged_txn_ids=r3_flagged_txn_ids,
        alert_id="R3",
        typology=TYPOLOGY_RAPID_MOVEMENT,
        risk_score=76,
        status="New",
        title="Same-Day Matched Credit/Debit Cycles — Rohit Agarwal (Trading)",
        description=(
            "A self-employed commodities trader's current account shows four same-day "
            "matched credit-debit cycles between January and February 2026 involving only "
            "two counterparties (Alpha Commodity Brokers and Beta Mercantile Pvt Ltd). "
            "Each cycle sees funds credited and then returned to the originating account "
            "within 4–7 hours, with negligible net change. Total round-trip exposure is "
            "₹1,33,00,000. The stated justifications (margin top-ups, cancelled lots) are "
            "inconsistent in frequency; the pattern may indicate layering through repeated "
            "apparent commodity transactions with no underlying trade."
        ),
        triggered_date="2026-02-05T17:15:00",
        assigned_analyst=None,
        total_flagged_amount=total_flagged_amount,
        flagged_transaction_count=len(r3_flagged_txn_ids),
    )

    await seed_checklist(session, alert_id=alert.id, typology=TYPOLOGY_RAPID_MOVEMENT)
