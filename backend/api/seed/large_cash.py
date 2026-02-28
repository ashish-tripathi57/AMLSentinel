"""Large Cash Transactions typology seeder — 3 alerts (LC1-LC3).

Each alert represents a customer whose cash transaction volume is
grossly inconsistent with their declared occupation and income, all
crossing the ₹10,00,000 CTR (Currency Transaction Report) threshold
mandated by RBI / PMLA guidelines.
"""

from sqlalchemy.ext.asyncio import AsyncSession

from api.seed.base import seed_account, seed_alert, seed_checklist, seed_customer, seed_transaction
from api.seed.data_spec import TYPOLOGY_LARGE_CASH


async def seed_large_cash(session: AsyncSession) -> None:
    """Seed 3 large cash transaction alerts with realistic Indian banking data."""

    # ------------------------------------------------------------------ LC1 --
    # Bharat Kumar — daily wage laborer deposits ₹15L cash in a single day.
    # A casual construction worker earns ~₹18,000/month (≈₹2.16L/year).
    # A ₹15L single cash credit is ~7× his annual income — extreme mismatch.
    # ------------------------------------------------------------------ LC1 --
    c_lc1 = await seed_customer(session,
        full_name="Bharat Kumar", date_of_birth="1989-04-22", nationality="Indian",
        occupation="Daily Wage Laborer", employer="Self-employed",
        declared_annual_income=216000.0,      # ₹18,000/month × 12
        risk_category="High",
        customer_since="2022-07-14", id_type="Aadhaar", id_number="9034-5678-1122",
        address="Chawl No. 4, Dharavi, Mumbai, Maharashtra", phone="+91-9823456701",
        email=None, pep_status=False, previous_alert_count=0,
        kyc_verification_date="2022-07-14",
        kyc_last_update_date="2022-07-14",
        income_verification_notes=(
            "No income documents on file. Self-declared daily wage of ₹600/day. "
            "No ITR filed. Aadhaar-based e-KYC only."
        ),
    )
    a_lc1 = await seed_account(session, c_lc1.id,
        account_number="SBI-SAV-LC10001", account_type="Savings",
        branch="SBI Mumbai Dharavi", opening_date="2022-07-14",
        current_balance=15420000.0, currency="INR",
    )
    lc1_txns = []
    # (date, transaction_type, amount, direction, channel, location, counterparty_name)
    lc1_data = [
        # Historical — normal low-value baseline (2-4 months before alert period)
        ("2025-10-08", "UPI Payment",     2500.0, "debit",  "UPI",  None, "Kirana Store Dharavi"),
        ("2025-11-03", "NEFT Transfer",  18000.0, "credit", "NEFT", None, "Labour Contractor - Sunil"),
        ("2025-11-18", "Cash Withdrawal", 5000.0, "debit",  "cash", "SBI Mumbai Dharavi", None),
        # Flagged — single large cash deposit grossly above income level
        ("2026-01-15", "Cash Deposit", 15000000.0, "credit", "cash", "SBI Mumbai Dharavi", None),
        # Normal low-value transactions consistent with a daily wage earner
        ("2026-01-01", "UPI Payment",     4500.0, "debit",  "UPI",  None, "BigBasket"),
        ("2026-01-05", "Cash Withdrawal", 3000.0, "debit",  "cash", "SBI Mumbai Dharavi", None),
        ("2026-01-10", "UPI Payment",     1200.0, "debit",  "UPI",  None, "BMTC Bus Pass"),
        ("2026-01-12", "NEFT Transfer",  18000.0, "credit", "NEFT", None, "Labour Contractor - Manoj"),
    ]
    for date, ttype, amt, direction, channel, loc, cpty in lc1_data:
        txn = await seed_transaction(session, a_lc1.id,
            transaction_date=date, transaction_type=ttype, amount=amt,
            direction=direction, channel=channel, location=loc,
            counterparty_name=cpty, country="India",
            # Flag only the single large cash credit that triggers CTR
            is_flagged=(channel == "cash" and direction == "credit" and amt >= 1000000),
        )
        lc1_txns.append(txn)
    flagged_ids_lc1 = [t.id for t in lc1_txns if t.is_flagged]
    alert_lc1 = await seed_alert(session, c_lc1.id, flagged_ids_lc1,
        alert_id="LC1", typology=TYPOLOGY_LARGE_CASH, risk_score=92,
        title="₹15L single cash deposit by daily wage laborer — extreme income mismatch",
        description=(
            "Bharat Kumar, a daily wage laborer with declared annual income of ₹2.16L, "
            "deposited ₹15,00,000 in cash in a single transaction on 2026-01-15. "
            "The amount is approximately 7× his annual income, far exceeding the ₹10L CTR threshold. "
            "No documented source of funds; account has no prior large-value activity."
        ),
        triggered_date="2026-01-15", total_flagged_amount=15000000.0, flagged_transaction_count=1,
    )
    await seed_checklist(session, alert_lc1.id, TYPOLOGY_LARGE_CASH)

    # ------------------------------------------------------------------ LC2 --
    # Renu Chopra — small grocery store owner deposits ₹25L cash within a week.
    # A neighbourhood kirana store in a Tier-2 city has typical weekly cash
    # receipts of ₹80,000–₹1.5L. ₹25L across 4 deposits in 6 days signals
    # funds sourced outside the declared business.
    # ------------------------------------------------------------------ LC2 --
    c_lc2 = await seed_customer(session,
        full_name="Renu Chopra", date_of_birth="1977-09-30", nationality="Indian",
        occupation="Grocery Store Owner", employer="Self-employed",
        declared_annual_income=720000.0,      # ₹60,000/month declared turnover
        risk_category="High",
        customer_since="2018-03-05", id_type="PAN", id_number="BCRPC4321N",
        address="Shop No. 3, Nehru Market, Ludhiana, Punjab", phone="+91-9815432106",
        email="renu.chopra@gmail.com", pep_status=False, previous_alert_count=0,
        kyc_verification_date="2018-03-05",
        kyc_last_update_date="2020-11-12",
        income_verification_notes=(
            "Shop registration with Ludhiana Municipal Corp since 2018. "
            "GST registration: GSTIN03BCRPC4321N1Z5. Last ITR filed FY 2019-20 "
            "showing ₹7.2L turnover. Trade license expired 2023, not renewed."
        ),
    )
    a_lc2 = await seed_account(session, c_lc2.id,
        account_number="PNB-CUR-LC20001", account_type="Current",
        branch="PNB Ludhiana Nehru Market", opening_date="2018-03-05",
        current_balance=27500000.0, currency="INR",
    )
    lc2_txns = []
    lc2_data = [
        # Historical — normal business transactions (2-4 months before alert period)
        ("2025-10-12", "Cheque",         65000.0, "debit",  "cheque", None, "Metro Cash & Carry"),
        ("2025-11-05", "NEFT Transfer",  48000.0, "credit", "NEFT",   None, "Wholesale Supplier Payments"),
        ("2025-12-09", "UPI Payment",     4200.0, "debit",  "UPI",    None, "Punjab MSEDCL"),
        # Flagged — 4 large cash deposits across 6 days totalling ₹25L
        ("2026-01-20", "Cash Deposit",  7500000.0, "credit", "cash", "PNB Ludhiana Nehru Market",  None),
        ("2026-01-22", "Cash Deposit",  6000000.0, "credit", "cash", "PNB Ludhiana Civil Lines",   None),
        ("2026-01-24", "Cash Deposit",  5500000.0, "credit", "cash", "PNB Ludhiana Nehru Market",  None),
        ("2026-01-25", "Cash Deposit",  6000000.0, "credit", "cash", "PNB Ludhiana Sarabha Nagar", None),
        # Normal transactions consistent with a small retail store
        ("2026-01-18", "Cheque",         85000.0, "debit",  "cheque", None, "Metro Cash & Carry Ludhiana"),
        ("2026-01-19", "UPI Payment",     6200.0, "debit",  "UPI",    None, "Punjab MSEDCL — Electricity"),
        ("2026-01-21", "UPI Payment",    12500.0, "debit",  "UPI",    None, "Pepsi Distribution"),
        ("2026-01-17", "NEFT Transfer",  65000.0, "credit", "NEFT",   None, "Wholesale Supplier Payments"),
    ]
    for date, ttype, amt, direction, channel, loc, cpty in lc2_data:
        txn = await seed_transaction(session, a_lc2.id,
            transaction_date=date, transaction_type=ttype, amount=amt,
            direction=direction, channel=channel, location=loc,
            counterparty_name=cpty, country="India",
            # Flag each cash credit that individually crosses the CTR threshold
            is_flagged=(channel == "cash" and direction == "credit" and amt >= 1000000),
        )
        lc2_txns.append(txn)
    flagged_ids_lc2 = [t.id for t in lc2_txns if t.is_flagged]
    alert_lc2 = await seed_alert(session, c_lc2.id, flagged_ids_lc2,
        alert_id="LC2", typology=TYPOLOGY_LARGE_CASH, risk_score=86,
        title="₹25L cash deposited in one week by small kirana store owner",
        description=(
            "Renu Chopra, a grocery store owner with declared annual income of ₹7.2L, "
            "made 4 cash deposits totaling ₹25,00,000 between 2026-01-20 and 2026-01-25. "
            "Each individual deposit exceeds the ₹10L CTR threshold. "
            "The weekly deposit volume is roughly 35× the expected weekly cash receipts "
            "for a neighbourhood retail store of this size. Deposits span 3 branches."
        ),
        triggered_date="2026-01-26", total_flagged_amount=25000000.0, flagged_transaction_count=4,
    )
    await seed_checklist(session, alert_lc2.id, TYPOLOGY_LARGE_CASH)

    # ------------------------------------------------------------------ LC3 --
    # Yusuf Ali — retired auto-rickshaw driver withdraws ₹12L cash from an
    # account opened only 2 months ago. A retired driver's income is limited
    # to pension / family support (~₹10,000–₹15,000/month). Newly opened
    # accounts with immediate large cash withdrawals are a classic red flag.
    # ------------------------------------------------------------------ LC3 --
    c_lc3 = await seed_customer(session,
        full_name="Yusuf Ali", date_of_birth="1958-11-07", nationality="Indian",
        occupation="Retired Auto-Rickshaw Driver", employer="Retired",
        declared_annual_income=144000.0,      # ₹12,000/month pension / family support
        risk_category="High",
        customer_since="2024-11-20", id_type="Aadhaar", id_number="6712-3344-8899",
        address="23 Khairatabad Colony, Hyderabad, Telangana", phone="+91-9701234567",
        email=None, pep_status=False, previous_alert_count=0,
        kyc_verification_date="2024-11-20",
        kyc_last_update_date="2024-11-20",
        income_verification_notes=(
            "No income documents. Claims pension of ₹12,000/month from son. "
            "No ITR history. Aadhaar-based e-KYC at account opening. "
            "Account opened 2024-11-20 — new customer."
        ),
    )
    # Newly opened savings account — opened just 2 months before the withdrawal
    a_lc3 = await seed_account(session, c_lc3.id,
        account_number="HDFC-SAV-LC30001", account_type="Savings",
        branch="HDFC Hyderabad Khairatabad", opening_date="2024-11-20",
        current_balance=680000.0, currency="INR",
    )
    lc3_txns = []
    lc3_data = [
        # Normal low-value transactions establishing a veneer of regular activity
        ("2025-12-01", "UPI Payment",       8500.0, "debit",  "UPI",  None, "Telangana EB — Electricity"),
        ("2025-12-15", "NEFT Transfer",    12000.0, "credit", "NEFT", None, "Son - Imran Ali"),
        ("2025-12-22", "UPI Payment",       1800.0, "debit",  "UPI",  None, "Medical Store Khairatabad"),
        ("2026-01-05", "UPI Payment",       3200.0, "debit",  "UPI",  None, "Apollo Pharmacy"),
        ("2026-01-20", "Cash Deposit",     15000.0, "credit", "cash", "HDFC Hyderabad Khairatabad", None),
        # Incoming credit that funded the subsequent withdrawal — also flaggable
        ("2026-01-28", "Cash Deposit",  12000000.0, "credit", "cash", "HDFC Hyderabad Khairatabad", None),
        # Flagged — large cash withdrawal from newly opened account
        ("2026-02-03", "Cash Withdrawal", 12000000.0, "debit", "cash", "HDFC Hyderabad Khairatabad", None),
    ]
    for date, ttype, amt, direction, channel, loc, cpty in lc3_data:
        txn = await seed_transaction(session, a_lc3.id,
            transaction_date=date, transaction_type=ttype, amount=amt,
            direction=direction, channel=channel, location=loc,
            counterparty_name=cpty, country="India",
            # Flag both the large cash credit and the matching large cash debit
            is_flagged=(channel == "cash" and amt >= 1000000),
        )
        lc3_txns.append(txn)
    flagged_ids_lc3 = [t.id for t in lc3_txns if t.is_flagged]
    alert_lc3 = await seed_alert(session, c_lc3.id, flagged_ids_lc3,
        alert_id="LC3", typology=TYPOLOGY_LARGE_CASH, risk_score=77,
        title="₹12L cash withdrawal from 2-month-old account by retired auto driver",
        description=(
            "Yusuf Ali, a retired auto-rickshaw driver with declared annual income of ₹1.44L, "
            "deposited and then withdrew ₹12,00,000 cash from an account opened just 75 days prior. "
            "Both the deposit on 2026-01-28 and the matching withdrawal on 2026-02-03 cross the ₹10L CTR threshold. "
            "No declared source of funds; prior account activity limited to small UPI payments and "
            "a ₹12,000 family transfer, inconsistent with the sudden ₹12L cash movement."
        ),
        triggered_date="2026-02-03", total_flagged_amount=24000000.0, flagged_transaction_count=2,
        status="Closed", resolution="SAR Filed", closed_at="2026-02-18T09:15:00Z",
        assigned_analyst="priya.nair",
    )
    await seed_checklist(session, alert_lc3.id, TYPOLOGY_LARGE_CASH)
