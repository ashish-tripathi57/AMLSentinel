"""Structuring typology seeder — 5 alerts (S1-S5)."""

from sqlalchemy.ext.asyncio import AsyncSession

from api.seed.base import seed_account, seed_alert, seed_checklist, seed_customer, seed_transaction
from api.seed.data_spec import TYPOLOGY_STRUCTURING


async def seed_structuring(session: AsyncSession) -> None:
    """Seed 5 structuring alerts with realistic Indian banking data."""

    # S1: Classic structuring — multiple cash deposits just below ₹10L across branches
    c1 = await seed_customer(session,
        full_name="Rajesh Sharma", date_of_birth="1978-03-15", nationality="Indian",
        occupation="Textile Trader", employer="Self-employed",
        declared_annual_income=2400000.0, risk_category="High",
        customer_since="2019-06-10", id_type="PAN", id_number="ABCPS1234R",
        address="42 MG Road, Surat, Gujarat", phone="+91-9876543210",
        email="rajesh.sharma@email.com", pep_status=False, previous_alert_count=1,
        kyc_verification_date="2019-06-10", kyc_last_update_date="2021-08-15",
        income_verification_notes="ITR filed FY 2022-23 showing ₹24L turnover. No recent ITR on file. GST registration: GSTIN24ABCPS1234R1ZE, active since 2019.",
    )
    a1 = await seed_account(session, c1.id,
        account_number="SBI-SAV-100001", account_type="Savings",
        branch="SBI Surat Main", opening_date="2019-06-10",
        current_balance=1850000.0, currency="INR",
    )
    s1_txns = []
    # Historical baseline transactions (3-6 months before alert period)
    s1_history = [
        ("2025-08-12", "NEFT Transfer", 45000.0, "debit", "NEFT", None, "Surat Textile Market"),
        ("2025-09-05", "UPI Payment", 8000.0, "debit", "UPI", None, "Reliance Digital"),
        ("2025-10-18", "NEFT Transfer", 180000.0, "credit", "NEFT", None, "Wholesale Fabric Sales"),
    ]
    for date, ttype, amt, direction, channel, loc, cpty in s1_history:
        txn = await seed_transaction(session, a1.id,
            transaction_date=date, transaction_type=ttype, amount=amt,
            direction=direction, channel=channel, location=loc,
            counterparty_name=cpty, country="India", is_flagged=False,
        )
        s1_txns.append(txn)
    # Flagged transactions
    s1_data = [
        ("2026-01-10", "Cash Deposit", 950000.0, "credit", "cash", "SBI Surat Main", None),
        ("2026-01-11", "Cash Deposit", 920000.0, "credit", "cash", "SBI Surat Ring Road", None),
        ("2026-01-13", "Cash Deposit", 890000.0, "credit", "cash", "SBI Surat Main", None),
        ("2026-01-14", "Cash Deposit", 970000.0, "credit", "cash", "SBI Surat Varachha", None),
        ("2026-01-16", "Cash Deposit", 940000.0, "credit", "cash", "SBI Surat Main", None),
        ("2026-01-08", "NEFT Transfer", 200000.0, "debit", "NEFT", None, "Sharma Textiles Pvt Ltd"),
        ("2026-01-05", "UPI Payment", 15000.0, "debit", "UPI", None, "Amazon India"),
    ]
    for date, ttype, amt, direction, channel, loc, cpty in s1_data:
        txn = await seed_transaction(session, a1.id,
            transaction_date=date, transaction_type=ttype, amount=amt,
            direction=direction, channel=channel, location=loc,
            counterparty_name=cpty, country="India", is_flagged=(channel == "cash" and amt >= 800000),
        )
        s1_txns.append(txn)
    flagged_ids = [t.id for t in s1_txns if t.is_flagged]
    alert_s1 = await seed_alert(session, c1.id, flagged_ids,
        alert_id="S1", typology=TYPOLOGY_STRUCTURING, risk_score=88,
        title="Multiple cash deposits below CTR threshold across branches",
        description="5 cash deposits totaling ₹46.7L over 7 days, each below ₹10L, spread across 3 branches.",
        triggered_date="2026-01-17", total_flagged_amount=4670000.0, flagged_transaction_count=5,
    )
    await seed_checklist(session, alert_s1.id, TYPOLOGY_STRUCTURING)

    # S2: Structuring with round amounts — deposits at exactly ₹9,90,000
    c2 = await seed_customer(session,
        full_name="Amit Patel", date_of_birth="1985-11-22", nationality="Indian",
        occupation="Restaurant Owner", employer="Patel Foods",
        declared_annual_income=1800000.0, risk_category="High",
        customer_since="2020-03-15", id_type="Aadhaar", id_number="8765-4321-0987",
        address="15 Law Garden, Ahmedabad, Gujarat", phone="+91-9898765432",
        email="amit.patel@email.com", pep_status=False, previous_alert_count=0,
        kyc_verification_date="2020-03-15", kyc_last_update_date="2020-03-15",
        income_verification_notes="FSSAI license #12345678 provided at account opening. No ITR filed. Trade license from Ahmedabad Municipal Corporation valid until 2024.",
    )
    a2 = await seed_account(session, c2.id,
        account_number="BOB-CUR-200001", account_type="Current",
        branch="BOB Ahmedabad CG Road", opening_date="2020-03-15",
        current_balance=3200000.0, currency="INR",
    )
    s2_txns = []
    # Historical baseline transactions (3-6 months before alert period)
    s2_history = [
        ("2025-11-08", "NEFT Transfer", 35000.0, "debit", "NEFT", None, "Spice Suppliers Ahmedabad"),
        ("2025-11-20", "UPI Payment", 6000.0, "debit", "UPI", None, "Zomato Platform"),
        ("2025-12-05", "Cheque Deposit", 85000.0, "credit", "cheque", "BOB Ahmedabad CG Road", "Walk-in catering payment"),
    ]
    for date, ttype, amt, direction, channel, loc, cpty in s2_history:
        txn = await seed_transaction(session, a2.id,
            transaction_date=date, transaction_type=ttype, amount=amt,
            direction=direction, channel=channel, location=loc,
            counterparty_name=cpty, country="India", is_flagged=False,
        )
        s2_txns.append(txn)
    # Flagged transactions
    s2_data = [
        ("2026-01-20", "Cash Deposit", 990000.0, "credit", "cash", "BOB Ahmedabad CG Road", None),
        ("2026-01-21", "Cash Deposit", 990000.0, "credit", "cash", "BOB Ahmedabad Navrangpura", None),
        ("2026-01-22", "Cash Deposit", 990000.0, "credit", "cash", "BOB Ahmedabad CG Road", None),
        ("2026-01-23", "Cash Deposit", 990000.0, "credit", "cash", "BOB Ahmedabad Satellite", None),
        ("2026-01-18", "RTGS Transfer", 500000.0, "debit", "RTGS", None, "Food Supplies India"),
        ("2026-01-15", "Cheque", 350000.0, "debit", "cheque", None, "Gujarat Spice Traders"),
    ]
    for date, ttype, amt, direction, channel, loc, cpty in s2_data:
        txn = await seed_transaction(session, a2.id,
            transaction_date=date, transaction_type=ttype, amount=amt,
            direction=direction, channel=channel, location=loc,
            counterparty_name=cpty, country="India", is_flagged=(amt == 990000.0),
        )
        s2_txns.append(txn)
    flagged_ids = [t.id for t in s2_txns if t.is_flagged]
    alert_s2 = await seed_alert(session, c2.id, flagged_ids,
        alert_id="S2", typology=TYPOLOGY_STRUCTURING, risk_score=82,
        title="Repeated identical cash deposits at ₹9,90,000",
        description="4 identical cash deposits of ₹9,90,000 each across 3 branches in 4 consecutive days.",
        triggered_date="2026-01-24", total_flagged_amount=3960000.0, flagged_transaction_count=4,
    )
    await seed_checklist(session, alert_s2.id, TYPOLOGY_STRUCTURING)

    # S3: Structuring via third parties — multiple depositors into one account
    c3 = await seed_customer(session,
        full_name="Deepak Gupta", date_of_birth="1972-07-08", nationality="Indian",
        occupation="Real Estate Agent", employer="Gupta Properties",
        declared_annual_income=3600000.0, risk_category="Medium",
        customer_since="2017-01-20", id_type="PAN", id_number="DEFPG5678H",
        address="88 Banjara Hills, Hyderabad, Telangana", phone="+91-9123456780",
        email="deepak.gupta@email.com", pep_status=False, previous_alert_count=2,
        kyc_verification_date="2017-01-20", kyc_last_update_date="2022-05-10",
        income_verification_notes="RERA registered agent #TSRERA/123456. ITR FY 2021-22 showing ₹36L commission income. Business card and visiting card on file.",
    )
    a3 = await seed_account(session, c3.id,
        account_number="HDFC-SAV-300001", account_type="Savings",
        branch="HDFC Hyderabad Banjara", opening_date="2017-01-20",
        current_balance=4500000.0, currency="INR",
    )
    s3_txns = []
    # Historical baseline transactions (3-6 months before alert period)
    s3_history = [
        ("2025-10-15", "NEFT Transfer", 150000.0, "credit", "NEFT", None, "Gupta Properties Commission"),
        ("2025-11-22", "RTGS Transfer", 250000.0, "debit", "RTGS", None, "Builder ABC Developers"),
        ("2025-12-10", "UPI Payment", 12000.0, "debit", "UPI", None, "Amazon India"),
    ]
    for date, ttype, amt, direction, channel, loc, cpty in s3_history:
        txn = await seed_transaction(session, a3.id,
            transaction_date=date, transaction_type=ttype, amount=amt,
            direction=direction, channel=channel, location=loc,
            counterparty_name=cpty, country="India", is_flagged=False,
        )
        s3_txns.append(txn)
    # Flagged transactions
    s3_data = [
        ("2026-02-01", "Cash Deposit", 850000.0, "credit", "cash", "HDFC Hyderabad Banjara", "Third Party - Ramesh"),
        ("2026-02-01", "Cash Deposit", 780000.0, "credit", "cash", "HDFC Hyderabad Jubilee", "Third Party - Suresh"),
        ("2026-02-02", "Cash Deposit", 920000.0, "credit", "cash", "HDFC Hyderabad Banjara", "Third Party - Mahesh"),
        ("2026-02-03", "Cash Deposit", 870000.0, "credit", "cash", "HDFC Hyderabad Kukatpally", "Third Party - Ganesh"),
        ("2026-01-28", "NEFT Transfer", 1500000.0, "debit", "NEFT", None, "Gupta Properties Escrow"),
        ("2026-01-25", "UPI Payment", 25000.0, "debit", "UPI", None, "Swiggy"),
    ]
    for date, ttype, amt, direction, channel, loc, cpty in s3_data:
        txn = await seed_transaction(session, a3.id,
            transaction_date=date, transaction_type=ttype, amount=amt,
            direction=direction, channel=channel, location=loc,
            counterparty_name=cpty, country="India", is_flagged=(channel == "cash"),
        )
        s3_txns.append(txn)
    flagged_ids = [t.id for t in s3_txns if t.is_flagged]
    alert_s3 = await seed_alert(session, c3.id, flagged_ids,
        alert_id="S3", typology=TYPOLOGY_STRUCTURING, risk_score=75,
        title="Third-party cash deposits below threshold into single account",
        description="4 different individuals made cash deposits totaling ₹34.2L into the same account within 3 days.",
        triggered_date="2026-02-04", total_flagged_amount=3420000.0, flagged_transaction_count=4,
    )
    await seed_checklist(session, alert_s3.id, TYPOLOGY_STRUCTURING)

    # S4: Structuring with immediate withdrawal — deposit and withdraw pattern
    c4 = await seed_customer(session,
        full_name="Sunita Verma", date_of_birth="1990-05-18", nationality="Indian",
        occupation="Boutique Owner", employer="Self-employed",
        declared_annual_income=1200000.0, risk_category="High",
        customer_since="2021-09-01", id_type="PAN", id_number="GHISV9012K",
        address="23 Linking Road, Mumbai, Maharashtra", phone="+91-9871234560",
        email="sunita.verma@email.com", pep_status=False, previous_alert_count=0,
        kyc_verification_date="2021-09-01", kyc_last_update_date="2021-09-01",
        income_verification_notes="No ITR on file. Shop and Establishment registration from BMC, Mumbai. No GST registration — claims below threshold.",
    )
    a4 = await seed_account(session, c4.id,
        account_number="ICICI-SAV-400001", account_type="Savings",
        branch="ICICI Mumbai Linking Road", opening_date="2021-09-01",
        current_balance=890000.0, currency="INR",
    )
    s4_txns = []
    # Historical baseline transactions (3-6 months before alert period)
    s4_history = [
        ("2025-11-14", "UPI Payment", 15000.0, "debit", "UPI", None, "Wholesale Cloth Market"),
        ("2025-12-02", "NEFT Transfer", 28000.0, "credit", "NEFT", None, "Online Sales Revenue"),
        ("2025-12-18", "UPI Payment", 4000.0, "debit", "UPI", None, "Swiggy"),
    ]
    for date, ttype, amt, direction, channel, loc, cpty in s4_history:
        txn = await seed_transaction(session, a4.id,
            transaction_date=date, transaction_type=ttype, amount=amt,
            direction=direction, channel=channel, location=loc,
            counterparty_name=cpty, country="India", is_flagged=False,
        )
        s4_txns.append(txn)
    # Flagged transactions
    s4_data = [
        ("2026-01-25", "Cash Deposit", 900000.0, "credit", "cash", "ICICI Mumbai Linking Road", None),
        ("2026-01-25", "Cash Withdrawal", 850000.0, "debit", "cash", "ICICI Mumbai Linking Road", None),
        ("2026-01-27", "Cash Deposit", 950000.0, "credit", "cash", "ICICI Mumbai Andheri", None),
        ("2026-01-27", "NEFT Transfer", 900000.0, "debit", "NEFT", None, "Unknown Entity"),
        ("2026-01-29", "Cash Deposit", 880000.0, "credit", "cash", "ICICI Mumbai Linking Road", None),
        ("2026-01-29", "RTGS Transfer", 850000.0, "debit", "RTGS", None, "Offshore Trading Co"),
        ("2026-01-20", "UPI Payment", 8500.0, "debit", "UPI", None, "Zomato"),
    ]
    for date, ttype, amt, direction, channel, loc, cpty in s4_data:
        txn = await seed_transaction(session, a4.id,
            transaction_date=date, transaction_type=ttype, amount=amt,
            direction=direction, channel=channel, location=loc,
            counterparty_name=cpty, country="India", is_flagged=(channel == "cash" and direction == "credit"),
        )
        s4_txns.append(txn)
    flagged_ids = [t.id for t in s4_txns if t.is_flagged]
    alert_s4 = await seed_alert(session, c4.id, flagged_ids,
        alert_id="S4", typology=TYPOLOGY_STRUCTURING, risk_score=91,
        title="Cash deposits with immediate outward transfers",
        description="3 cash deposits below threshold immediately followed by large outward transfers on same day.",
        triggered_date="2026-01-30", total_flagged_amount=2730000.0, flagged_transaction_count=3,
    )
    await seed_checklist(session, alert_s4.id, TYPOLOGY_STRUCTURING)

    # S5: Low-level structuring — smaller amounts, higher frequency
    c5 = await seed_customer(session,
        full_name="Vikram Singh", date_of_birth="1968-12-03", nationality="Indian",
        occupation="Retired Government Officer", employer="Retired",
        declared_annual_income=600000.0, risk_category="Medium",
        customer_since="2010-04-12", id_type="Aadhaar", id_number="5678-9012-3456",
        address="7 Sector 15, Chandigarh", phone="+91-9876012345",
        email="vikram.singh@email.com", pep_status=False, previous_alert_count=0,
        kyc_verification_date="2010-04-12", kyc_last_update_date="2015-03-20",
        income_verification_notes="Pension slip from Govt of India on file (₹50K/month). No other income sources declared. KYC last refreshed in 2015.",
    )
    a5 = await seed_account(session, c5.id,
        account_number="PNB-SAV-500001", account_type="Savings",
        branch="PNB Chandigarh Sector 15", opening_date="2010-04-12",
        current_balance=2100000.0, currency="INR",
    )
    s5_txns = []
    # Historical baseline transactions (3-6 months before alert period)
    s5_history = [
        ("2025-10-01", "NEFT Transfer", 50000.0, "credit", "NEFT", None, "Govt of India Pension"),
        ("2025-11-10", "UPI Payment", 5000.0, "debit", "UPI", None, "Chandigarh Electricity Board"),
        ("2025-11-01", "NEFT Transfer", 50000.0, "credit", "NEFT", None, "Govt of India Pension"),
    ]
    for date, ttype, amt, direction, channel, loc, cpty in s5_history:
        txn = await seed_transaction(session, a5.id,
            transaction_date=date, transaction_type=ttype, amount=amt,
            direction=direction, channel=channel, location=loc,
            counterparty_name=cpty, country="India", is_flagged=False,
        )
        s5_txns.append(txn)
    # Flagged transactions
    s5_data = [
        ("2026-02-01", "Cash Deposit", 490000.0, "credit", "cash", "PNB Chandigarh Sector 15", None),
        ("2026-02-02", "Cash Deposit", 480000.0, "credit", "cash", "PNB Chandigarh Sector 22", None),
        ("2026-02-03", "Cash Deposit", 470000.0, "credit", "cash", "PNB Chandigarh Sector 15", None),
        ("2026-02-04", "Cash Deposit", 495000.0, "credit", "cash", "PNB Chandigarh Sector 35", None),
        ("2026-02-05", "Cash Deposit", 460000.0, "credit", "cash", "PNB Chandigarh Sector 15", None),
        ("2026-02-06", "Cash Deposit", 485000.0, "credit", "cash", "PNB Chandigarh Sector 22", None),
        ("2026-02-07", "Cash Deposit", 475000.0, "credit", "cash", "PNB Chandigarh Sector 15", None),
        ("2026-01-30", "Pension Credit", 50000.0, "credit", "NEFT", None, "Govt of India Pension"),
        ("2026-01-28", "UPI Payment", 3200.0, "debit", "UPI", None, "BigBasket"),
    ]
    for date, ttype, amt, direction, channel, loc, cpty in s5_data:
        txn = await seed_transaction(session, a5.id,
            transaction_date=date, transaction_type=ttype, amount=amt,
            direction=direction, channel=channel, location=loc,
            counterparty_name=cpty, country="India", is_flagged=(channel == "cash"),
        )
        s5_txns.append(txn)
    flagged_ids = [t.id for t in s5_txns if t.is_flagged]
    alert_s5 = await seed_alert(session, c5.id, flagged_ids,
        alert_id="S5", typology=TYPOLOGY_STRUCTURING, risk_score=68,
        title="High-frequency smaller cash deposits inconsistent with pension income",
        description="7 cash deposits totaling ₹33.55L in 7 days from a retired officer with ₹6L annual income.",
        triggered_date="2026-02-08", total_flagged_amount=3355000.0, flagged_transaction_count=7,
        status="Closed", resolution="No Suspicion", closed_at="2026-02-20T14:30:00Z",
        assigned_analyst="anil.mehta",
    )
    await seed_checklist(session, alert_s5.id, TYPOLOGY_STRUCTURING)
