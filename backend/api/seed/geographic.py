"""Seeder for the Unusual Geographic Activity typology (alerts G1, G2, G3).

Scenario overview
-----------------
G1 – Priya Mehta      : IT consultant sending large outbound wires to Myanmar
                        and Nigeria, two FATF high-risk jurisdictions, from her
                        Bengaluru savings account.  Risk score: 78.

G2 – Arjun Reddy      : Import/export business owner whose account shows a
                        sudden spike in wires to Iran and UAE shell companies,
                        inconsistent with declared trade volumes.  Risk score: 85.

G3 – Kavita Nair      : Homemaker with no declared international business who
                        transfers funds to Cayman Islands accounts across two
                        separate bank accounts.  Risk score: 72.
"""

from sqlalchemy.ext.asyncio import AsyncSession

from api.seed.base import (
    seed_account,
    seed_alert,
    seed_checklist,
    seed_customer,
    seed_transaction,
)
from api.seed.data_spec import TYPOLOGY_GEOGRAPHIC


async def seed_geographic(session: AsyncSession) -> None:
    """Seed all three Unusual Geographic Activity alerts (G1, G2, G3)."""
    await _seed_g1_priya_mehta(session)
    await _seed_g2_arjun_reddy(session)
    await _seed_g3_kavita_nair(session)


# ---------------------------------------------------------------------------
# G1 – Priya Mehta
# ---------------------------------------------------------------------------

async def _seed_g1_priya_mehta(session: AsyncSession) -> None:
    """G1: IT consultant routing funds to Myanmar and Nigeria (risk score 78)."""

    customer = await seed_customer(
        session,
        full_name="Priya Mehta",
        date_of_birth="1988-07-14",
        nationality="Indian",
        occupation="IT Consultant",
        employer="Infosys Limited",
        declared_annual_income=1_800_000.00,  # ₹18 LPA
        risk_category="High",
        customer_since="2017-03-22",
        id_type="PAN",
        id_number="BKXPM4821F",
        address="Flat 304, Brigade Residency, Koramangala, Bengaluru, Karnataka 560034",
        phone="+91-9845012378",
        email="priya.mehta88@gmail.com",
        pep_status=False,
        previous_alert_count=0,
        kyc_verification_date="2016-02-14",
        kyc_last_update_date="2021-09-30",
        income_verification_notes="ITR FY 2022-23 showing ₹48L. TDS certificates from Wipro on file. Passport copy verified.",
    )

    savings_account = await seed_account(
        session,
        customer_id=customer.id,
        account_number="HDFC0IN4821001",
        account_type="Savings",
        branch="HDFC Bank – Koramangala Branch, Bengaluru",
        opening_date="2017-03-22",
        status="Active",
        current_balance=142_500.00,
        currency="INR",
    )

    # --- Normal domestic transactions (background activity) ---

    t1 = await seed_transaction(
        session,
        account_id=savings_account.id,
        transaction_date="2026-01-03T10:15:00",
        transaction_type="NEFT",
        amount=45_000.00,
        currency="INR",
        direction="credit",
        channel="NEFT",
        counterparty_name="Infosys Limited – Payroll",
        counterparty_account="HDFC0CORP9901",
        counterparty_bank="HDFC Bank",
        location="Bengaluru",
        country="India",
        reference_number="NEFT20260103-INF001",
        description="Monthly salary credit – January 2026",
        is_flagged=False,
    )

    t2 = await seed_transaction(
        session,
        account_id=savings_account.id,
        transaction_date="2026-01-05T14:30:00",
        transaction_type="UPI",
        amount=3_200.00,
        currency="INR",
        direction="debit",
        channel="UPI",
        counterparty_name="BigBasket",
        counterparty_account=None,
        counterparty_bank=None,
        location="Bengaluru",
        country="India",
        reference_number="UPI20260105-BB99231",
        description="Grocery purchase via UPI",
        is_flagged=False,
    )

    t3 = await seed_transaction(
        session,
        account_id=savings_account.id,
        transaction_date="2026-01-10T09:00:00",
        transaction_type="NEFT",
        amount=15_000.00,
        currency="INR",
        direction="debit",
        channel="NEFT",
        counterparty_name="LIC of India",
        counterparty_account="LIC00098812",
        counterparty_bank="State Bank of India",
        location="Bengaluru",
        country="India",
        reference_number="NEFT20260110-LIC001",
        description="Annual life insurance premium payment",
        is_flagged=False,
    )

    # --- Suspicious international wire transfers ---

    t4 = await seed_transaction(
        session,
        account_id=savings_account.id,
        transaction_date="2026-01-15T11:45:00",
        transaction_type="International Wire Transfer",
        amount=850_000.00,
        currency="INR",
        direction="debit",
        channel="SWIFT",
        counterparty_name="Thant Zin Trading Co.",
        counterparty_account="MYK00291847",
        counterparty_bank="Myanma Economic Bank, Yangon",
        location="Bengaluru",
        country="Myanmar",
        reference_number="SWIFT20260115-MYA001",
        description="Consultancy fee payment – project MYA-2026",
        is_flagged=True,
    )

    t5 = await seed_transaction(
        session,
        account_id=savings_account.id,
        transaction_date="2026-01-22T13:00:00",
        transaction_type="International Wire Transfer",
        amount=620_000.00,
        currency="INR",
        direction="debit",
        channel="SWIFT",
        counterparty_name="Chukwuemeka Global Services Ltd.",
        counterparty_account="GTB0NG00871234",
        counterparty_bank="Guaranty Trust Bank, Lagos, Nigeria",
        location="Bengaluru",
        country="Nigeria",
        reference_number="SWIFT20260122-NGA001",
        description="Software licensing fee – NGA project",
        is_flagged=True,
    )

    t6 = await seed_transaction(
        session,
        account_id=savings_account.id,
        transaction_date="2026-02-04T10:30:00",
        transaction_type="International Wire Transfer",
        amount=740_000.00,
        currency="INR",
        direction="debit",
        channel="SWIFT",
        counterparty_name="Thant Zin Trading Co.",
        counterparty_account="MYK00291847",
        counterparty_bank="Myanma Economic Bank, Yangon",
        location="Bengaluru",
        country="Myanmar",
        reference_number="SWIFT20260204-MYA002",
        description="Second consultancy tranche – project MYA-2026",
        is_flagged=True,
    )

    flagged_txn_ids = [t4.id, t5.id, t6.id]
    total_flagged_amount = 850_000.00 + 620_000.00 + 740_000.00  # ₹22,10,000

    alert = await seed_alert(
        session,
        customer_id=customer.id,
        flagged_txn_ids=flagged_txn_ids,
        alert_id="G1",
        typology=TYPOLOGY_GEOGRAPHIC,
        risk_score=78,
        status="New",
        title="Unusual International Wires to Myanmar and Nigeria – Priya Mehta",
        description=(
            "IT consultant Priya Mehta has initiated three outbound SWIFT wire "
            "transfers totalling ₹22,10,000 to counterparties domiciled in Myanmar "
            "and Nigeria – both FATF high-risk jurisdictions – within a 21-day "
            "window. The stated purpose (consultancy fees) is inconsistent with her "
            "employment profile as a salaried software consultant. No prior "
            "international wire activity observed on this account."
        ),
        triggered_date="2026-02-05T08:00:00",
        assigned_analyst=None,
        total_flagged_amount=total_flagged_amount,
        flagged_transaction_count=len(flagged_txn_ids),
    )

    await seed_checklist(session, alert_id=alert.id, typology=TYPOLOGY_GEOGRAPHIC)

    # suppress unused-variable warnings for unflagged transactions
    _ = t1, t2, t3


# ---------------------------------------------------------------------------
# G2 – Arjun Reddy
# ---------------------------------------------------------------------------

async def _seed_g2_arjun_reddy(session: AsyncSession) -> None:
    """G2: Import/export trader wiring funds to Iran and UAE shell companies (risk score 85)."""

    customer = await seed_customer(
        session,
        full_name="Arjun Reddy",
        date_of_birth="1979-11-28",
        nationality="Indian",
        occupation="Business Owner – Import/Export",
        employer="Reddy Commodities Pvt. Ltd.",
        declared_annual_income=4_500_000.00,  # ₹45 LPA declared
        risk_category="High",
        customer_since="2014-08-10",
        id_type="Aadhaar",
        id_number="7321 5548 2209",
        address="Plot 12B, Jubilee Hills, Hyderabad, Telangana 500033",
        phone="+91-9866044512",
        email="arjun.reddy.commodities@outlook.com",
        pep_status=False,
        previous_alert_count=1,
        kyc_verification_date="2019-11-01",
        kyc_last_update_date="2019-11-01",
        income_verification_notes="IEC code #0519876543 for import/export. GST registered. ITR FY 2021-22 showing ₹96L turnover. No updated financials.",
    )

    current_account = await seed_account(
        session,
        customer_id=customer.id,
        account_number="ICICI0HYD7732CA",
        account_type="Current",
        branch="ICICI Bank – Jubilee Hills Branch, Hyderabad",
        opening_date="2014-08-10",
        status="Active",
        current_balance=8_35_000.00,
        currency="INR",
    )

    forex_account = await seed_account(
        session,
        customer_id=customer.id,
        account_number="ICICI0HYD7732FX",
        account_type="EEFC",  # Exchange Earners' Foreign Currency account
        branch="ICICI Bank – Jubilee Hills Branch, Hyderabad",
        opening_date="2019-05-15",
        status="Active",
        current_balance=22_000.00,
        currency="USD",
    )

    # --- Normal domestic / trade transactions ---

    t1 = await seed_transaction(
        session,
        account_id=current_account.id,
        transaction_date="2026-01-02T09:30:00",
        transaction_type="RTGS",
        amount=1_200_000.00,
        currency="INR",
        direction="credit",
        channel="RTGS",
        counterparty_name="Spice Board of India",
        counterparty_account="SBI0SPICE0012",
        counterparty_bank="State Bank of India",
        location="Hyderabad",
        country="India",
        reference_number="RTGS20260102-SPC001",
        description="Export receivable – spice shipment Q4 2025",
        is_flagged=False,
    )

    t2 = await seed_transaction(
        session,
        account_id=current_account.id,
        transaction_date="2026-01-08T11:00:00",
        transaction_type="NEFT",
        amount=380_000.00,
        currency="INR",
        direction="debit",
        channel="NEFT",
        counterparty_name="Hyderabad Customs – Duty Payment",
        counterparty_account="GOI0CUSTOMS001",
        counterparty_bank="Reserve Bank of India",
        location="Hyderabad",
        country="India",
        reference_number="NEFT20260108-CUS001",
        description="Import duty payment – electronics consignment",
        is_flagged=False,
    )

    t3 = await seed_transaction(
        session,
        account_id=current_account.id,
        transaction_date="2026-01-12T14:00:00",
        transaction_type="NEFT",
        amount=95_000.00,
        currency="INR",
        direction="debit",
        channel="NEFT",
        counterparty_name="Reddy Commodities – Staff Payroll",
        counterparty_account="AXIS0HYD1100",
        counterparty_bank="Axis Bank",
        location="Hyderabad",
        country="India",
        reference_number="NEFT20260112-PAY001",
        description="Staff salary disbursement – January 2026",
        is_flagged=False,
    )

    # --- Suspicious international wire transfers ---

    t4 = await seed_transaction(
        session,
        account_id=current_account.id,
        transaction_date="2026-01-17T10:15:00",
        transaction_type="International Wire Transfer",
        amount=1_450_000.00,
        currency="INR",
        direction="debit",
        channel="SWIFT",
        counterparty_name="Kish Trade & Commerce LLC",
        counterparty_account="IRANKISH0049821",
        counterparty_bank="Bank Melli Iran, Kish Branch",
        location="Hyderabad",
        country="Iran",
        reference_number="SWIFT20260117-IRN001",
        description="Advance payment – import contract IRN-2026-01",
        is_flagged=True,
    )

    t5 = await seed_transaction(
        session,
        account_id=forex_account.id,
        transaction_date="2026-01-24T12:30:00",
        transaction_type="International Wire Transfer",
        amount=980_000.00,
        currency="INR",
        direction="debit",
        channel="SWIFT",
        counterparty_name="Gulf Nexus General Trading LLC",
        counterparty_account="ENBD0UAE00129834",
        counterparty_bank="Emirates NBD, Dubai, UAE",
        location="Hyderabad",
        country="UAE",
        reference_number="SWIFT20260124-UAE001",
        description="Trade settlement – Gulf Nexus contract UAE-026",
        is_flagged=True,
    )

    t6 = await seed_transaction(
        session,
        account_id=current_account.id,
        transaction_date="2026-02-01T09:45:00",
        transaction_type="International Wire Transfer",
        amount=1_250_000.00,
        currency="INR",
        direction="debit",
        channel="SWIFT",
        counterparty_name="Kish Trade & Commerce LLC",
        counterparty_account="IRANKISH0049821",
        counterparty_bank="Bank Melli Iran, Kish Branch",
        location="Hyderabad",
        country="Iran",
        reference_number="SWIFT20260201-IRN002",
        description="Second advance payment – import contract IRN-2026-01",
        is_flagged=True,
    )

    t7 = await seed_transaction(
        session,
        account_id=forex_account.id,
        transaction_date="2026-02-08T11:00:00",
        transaction_type="International Wire Transfer",
        amount=870_000.00,
        currency="INR",
        direction="debit",
        channel="SWIFT",
        counterparty_name="Gulf Nexus General Trading LLC",
        counterparty_account="ENBD0UAE00129834",
        counterparty_bank="Emirates NBD, Dubai, UAE",
        location="Hyderabad",
        country="UAE",
        reference_number="SWIFT20260208-UAE002",
        description="Final settlement – Gulf Nexus contract UAE-026",
        is_flagged=True,
    )

    flagged_txn_ids = [t4.id, t5.id, t6.id, t7.id]
    total_flagged_amount = 1_450_000.00 + 980_000.00 + 1_250_000.00 + 870_000.00  # ₹45,50,000

    alert = await seed_alert(
        session,
        customer_id=customer.id,
        flagged_txn_ids=flagged_txn_ids,
        alert_id="G2",
        typology=TYPOLOGY_GEOGRAPHIC,
        risk_score=85,
        status="New",
        title="High-Risk Jurisdiction Wires to Iran and UAE Shell Companies – Arjun Reddy",
        description=(
            "Import/export business owner Arjun Reddy has transferred ₹45,50,000 "
            "across four SWIFT transactions within 22 days to two counterparties: "
            "Kish Trade & Commerce LLC (Bank Melli Iran) and Gulf Nexus General "
            "Trading LLC (Emirates NBD, Dubai). Iran is subject to international "
            "sanctions; Gulf Nexus shows characteristics of a UAE shell entity "
            "(no web presence, registered address is a mail-drop). Wire amounts "
            "significantly exceed declared import volumes for the period."
        ),
        triggered_date="2026-02-09T08:00:00",
        assigned_analyst=None,
        total_flagged_amount=total_flagged_amount,
        flagged_transaction_count=len(flagged_txn_ids),
    )

    await seed_checklist(session, alert_id=alert.id, typology=TYPOLOGY_GEOGRAPHIC)

    _ = t1, t2, t3


# ---------------------------------------------------------------------------
# G3 – Kavita Nair
# ---------------------------------------------------------------------------

async def _seed_g3_kavita_nair(session: AsyncSession) -> None:
    """G3: Homemaker with no declared international business wiring to Cayman Islands (risk score 72)."""

    customer = await seed_customer(
        session,
        full_name="Kavita Nair",
        date_of_birth="1975-04-09",
        nationality="Indian",
        occupation="Homemaker",
        employer=None,
        declared_annual_income=0.00,
        risk_category="High",
        customer_since="2011-09-05",
        id_type="PAN",
        id_number="DFQPN7743R",
        address="23, Ezhuthachan Lane, Thampanoor, Thiruvananthapuram, Kerala 695001",
        phone="+91-9447765330",
        email="kavita.nair75@yahoo.in",
        pep_status=False,
        previous_alert_count=0,
        kyc_verification_date="2020-06-20",
        kyc_last_update_date="2020-06-20",
        income_verification_notes="No income documents. Husband Arjun Reddy listed as introducer. No ITR on file.",
    )

    # Primary savings account in Kerala
    primary_savings = await seed_account(
        session,
        customer_id=customer.id,
        account_number="SBI0TVM1123SA",
        account_type="Savings",
        branch="SBI – Thampanoor Branch, Thiruvananthapuram",
        opening_date="2011-09-05",
        status="Active",
        current_balance=68_300.00,
        currency="INR",
    )

    # Second savings account opened more recently
    secondary_savings = await seed_account(
        session,
        customer_id=customer.id,
        account_number="FED0TVM8877SA",
        account_type="Savings",
        branch="Federal Bank – MG Road Branch, Thiruvananthapuram",
        opening_date="2022-02-18",
        status="Active",
        current_balance=12_000.00,
        currency="INR",
    )

    # --- Normal domestic transactions ---

    t1 = await seed_transaction(
        session,
        account_id=primary_savings.id,
        transaction_date="2026-01-04T10:00:00",
        transaction_type="NEFT",
        amount=60_000.00,
        currency="INR",
        direction="credit",
        channel="NEFT",
        counterparty_name="Suresh Nair",
        counterparty_account="SBI0TVM0092",
        counterparty_bank="State Bank of India",
        location="Thiruvananthapuram",
        country="India",
        reference_number="NEFT20260104-HH001",
        description="Monthly household allowance from spouse",
        is_flagged=False,
    )

    t2 = await seed_transaction(
        session,
        account_id=primary_savings.id,
        transaction_date="2026-01-08T12:00:00",
        transaction_type="UPI",
        amount=4_500.00,
        currency="INR",
        direction="debit",
        channel="UPI",
        counterparty_name="Lulu Mall Kerala",
        counterparty_account=None,
        counterparty_bank=None,
        location="Thiruvananthapuram",
        country="India",
        reference_number="UPI20260108-LULU001",
        description="Retail shopping – Lulu Mall",
        is_flagged=False,
    )

    t3 = await seed_transaction(
        session,
        account_id=secondary_savings.id,
        transaction_date="2026-01-10T09:30:00",
        transaction_type="NEFT",
        amount=120_000.00,
        currency="INR",
        direction="credit",
        channel="NEFT",
        counterparty_name="Suresh Nair",
        counterparty_account="SBI0TVM0092",
        counterparty_bank="State Bank of India",
        location="Thiruvananthapuram",
        country="India",
        reference_number="NEFT20260110-HH002",
        description="Fund transfer – savings top-up",
        is_flagged=False,
    )

    # --- Suspicious international wire transfers ---

    t4 = await seed_transaction(
        session,
        account_id=primary_savings.id,
        transaction_date="2026-01-16T11:00:00",
        transaction_type="International Wire Transfer",
        amount=680_000.00,
        currency="INR",
        direction="debit",
        channel="SWIFT",
        counterparty_name="Nair Family Holdings Ltd.",
        counterparty_account="CITI0KYD00483821",
        counterparty_bank="Citibank N.A., Grand Cayman, Cayman Islands",
        location="Thiruvananthapuram",
        country="Cayman Islands",
        reference_number="SWIFT20260116-KYD001",
        description="Family investment fund contribution",
        is_flagged=True,
    )

    t5 = await seed_transaction(
        session,
        account_id=secondary_savings.id,
        transaction_date="2026-01-27T10:15:00",
        transaction_type="International Wire Transfer",
        amount=590_000.00,
        currency="INR",
        direction="debit",
        channel="SWIFT",
        counterparty_name="Nair Family Holdings Ltd.",
        counterparty_account="CITI0KYD00483821",
        counterparty_bank="Citibank N.A., Grand Cayman, Cayman Islands",
        location="Thiruvananthapuram",
        country="Cayman Islands",
        reference_number="SWIFT20260127-KYD002",
        description="Additional contribution – family investment fund",
        is_flagged=True,
    )

    t6 = await seed_transaction(
        session,
        account_id=primary_savings.id,
        transaction_date="2026-02-06T14:00:00",
        transaction_type="International Wire Transfer",
        amount=510_000.00,
        currency="INR",
        direction="debit",
        channel="SWIFT",
        counterparty_name="Nair Family Holdings Ltd.",
        counterparty_account="CITI0KYD00483821",
        counterparty_bank="Citibank N.A., Grand Cayman, Cayman Islands",
        location="Thiruvananthapuram",
        country="Cayman Islands",
        reference_number="SWIFT20260206-KYD003",
        description="Third tranche – family investment fund",
        is_flagged=True,
    )

    flagged_txn_ids = [t4.id, t5.id, t6.id]
    total_flagged_amount = 680_000.00 + 590_000.00 + 510_000.00  # ₹17,80,000

    alert = await seed_alert(
        session,
        customer_id=customer.id,
        flagged_txn_ids=flagged_txn_ids,
        alert_id="G3",
        typology=TYPOLOGY_GEOGRAPHIC,
        risk_score=72,
        status="Closed",
        title="Unexplained Offshore Wires to Cayman Islands – Kavita Nair",
        description=(
            "Homemaker Kavita Nair, with nil declared income, has sent three "
            "SWIFT wire transfers totalling ₹17,80,000 to 'Nair Family Holdings "
            "Ltd.' held at Citibank Grand Cayman within 21 days. The Cayman "
            "Islands is a secrecy jurisdiction on the FATF grey list. The customer "
            "has no declared international business activity. Both savings accounts "
            "were used, suggesting an attempt to distribute amounts below single-"
            "account scrutiny thresholds. Source of funds is unexplained beyond "
            "periodic household allowances from spouse."
        ),
        triggered_date="2026-02-07T08:00:00",
        assigned_analyst="sarah.chen",
        total_flagged_amount=total_flagged_amount,
        flagged_transaction_count=len(flagged_txn_ids),
        resolution="Escalated",
        closed_at="2026-02-22T16:45:00Z",
    )

    await seed_checklist(session, alert_id=alert.id, typology=TYPOLOGY_GEOGRAPHIC)

    _ = t1, t2, t3
