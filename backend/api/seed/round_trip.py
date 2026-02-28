"""
Round-trip Transactions typology seeder.

Seeds 3 alerts (RT1, RT2, RT3) representing circular fund flows where money
leaves a customer's account, passes through one or more intermediate entities,
and ultimately returns to the originating customer — a classic layering pattern
used to create a false paper trail or simulate legitimate business activity.

Alert summary:
  RT1 — Anil Deshmukh (Jeweller): funds sent to a company, routed through a
         second entity, then credited back. Risk score: 80.
  RT2 — Pooja Saxena (NGO Worker): funds sent to a relative, then to a
         business account, then returned. Risk score: 73.
  RT3 — Manish Tiwari (Real Estate Developer): multi-hop layering through
         3 intermediate entities before funds return. Risk score: 87.
"""

from sqlalchemy.ext.asyncio import AsyncSession

from api.seed.base import (
    seed_account,
    seed_alert,
    seed_checklist,
    seed_customer,
    seed_transaction,
)
from api.seed.data_spec import TYPOLOGY_ROUND_TRIP


async def seed_round_trip(session: AsyncSession) -> None:
    """Seed Round-trip Transactions alerts RT1, RT2, and RT3."""
    await _seed_rt1_anil_deshmukh(session)
    await _seed_rt2_pooja_saxena(session)
    await _seed_rt3_manish_tiwari(session)


# ---------------------------------------------------------------------------
# RT1 — Anil Deshmukh
# Circular chain: Anil → Shree Ornaments Pvt Ltd → Bharat Gems Trading Co
#                 → back to Anil
# Amount: ₹28,00,000 outward; ₹27,50,000 returned (net loss disguised as fees)
# ---------------------------------------------------------------------------

async def _seed_rt1_anil_deshmukh(session: AsyncSession) -> None:
    """
    RT1: Anil Deshmukh sends ₹28L to his supplier company, which routes it
    through a gems trading entity that then credits nearly the full amount
    back to his account — a two-hop round-trip to create invoice-backed
    legitimacy for undisclosed income.
    """
    customer = await seed_customer(
        session,
        full_name="Anil Deshmukh",
        date_of_birth="1974-03-18",
        nationality="Indian",
        occupation="Jeweller",
        employer="Deshmukh Jewellers",
        declared_annual_income=1_800_000.0,  # ₹18L declared
        risk_category="High",
        customer_since="2015-06-10",
        id_type="Aadhaar",
        id_number="XXXX-XXXX-4821",
        address="Shop No. 7, Zaveri Bazaar, Mumbai, Maharashtra 400002",
        phone="+91-98200-34712",
        email="anil.deshmukh@deshmukhjewellers.in",
        pep_status=False,
        previous_alert_count=1,
        kyc_verification_date="2015-03-12",
        kyc_last_update_date="2019-07-20",
        income_verification_notes="BIS hallmarking license. GST registered. ITR FY 2018-19 showing ₹60L turnover. Gold dealer license from District Collector.",
    )

    account = await seed_account(
        session,
        customer_id=customer.id,
        account_number="SBI-MUM-0041-882301",
        account_type="Current",
        branch="Zaveri Bazaar Branch, Mumbai",
        opening_date="2015-06-10",
        status="Active",
        current_balance=340_000.0,
        currency="INR",
    )

    # Leg 1 — Anil sends ₹28L to supplier "Shree Ornaments Pvt Ltd" via RTGS
    txn_outward = await seed_transaction(
        session,
        account_id=account.id,
        transaction_date="2026-01-08T11:20:00",
        transaction_type="RTGS Transfer",
        amount=2_800_000.0,
        currency="INR",
        direction="debit",
        channel="RTGS",
        counterparty_name="Shree Ornaments Pvt Ltd",
        counterparty_account="HDFC-MUM-CORP-557821",
        counterparty_bank="HDFC Bank, Fort Branch, Mumbai",
        location="Mumbai, Maharashtra",
        country="India",
        reference_number="RTGS-MUM-20260108-00441",
        description="Payment for gold bullion supply — Invoice SO/2026/014",
        is_flagged=True,
    )

    # Background leg — Shree Ornaments routes to Bharat Gems (external, not on
    # Anil's account, shown as an inward credit from Bharat Gems to complete
    # the narrative via description)

    # Leg 2 — ₹27.5L credited back from "Bharat Gems Trading Co" to Anil
    # (return leg, slightly less to simulate fake service fee deduction)
    txn_return = await seed_transaction(
        session,
        account_id=account.id,
        transaction_date="2026-01-14T15:45:00",
        transaction_type="NEFT Transfer",
        amount=2_750_000.0,
        currency="INR",
        direction="credit",
        channel="NEFT",
        counterparty_name="Bharat Gems Trading Co",
        counterparty_account="AXIS-MUM-BIZ-220934",
        counterparty_bank="Axis Bank, Bhuleshwar Branch, Mumbai",
        location="Mumbai, Maharashtra",
        country="India",
        reference_number="NEFT-AX-20260114-78832",
        description="Refund against cancelled export consignment — Ref BG/EX/2026/009",
        is_flagged=True,
    )

    # Supporting context transactions (non-flagged) to give the account
    # a plausible transaction history around the flagged window
    await seed_transaction(
        session,
        account_id=account.id,
        transaction_date="2026-01-03T10:00:00",
        transaction_type="Cash Deposit",
        amount=500_000.0,
        currency="INR",
        direction="credit",
        channel="cash",
        counterparty_name=None,
        counterparty_account=None,
        counterparty_bank=None,
        location="Zaveri Bazaar Branch, Mumbai",
        country="India",
        reference_number="CDR-ZB-20260103-01182",
        description="Cash deposit — daily sales",
        is_flagged=False,
    )

    await seed_transaction(
        session,
        account_id=account.id,
        transaction_date="2026-01-20T09:30:00",
        transaction_type="NEFT Transfer",
        amount=120_000.0,
        currency="INR",
        direction="debit",
        channel="NEFT",
        counterparty_name="GST Authority",
        counterparty_account="GOV-GSTN-CENTRAL",
        counterparty_bank="Reserve Bank of India",
        location="Mumbai, Maharashtra",
        country="India",
        reference_number="GSTN-PAY-20260120-3301",
        description="Monthly GST payment",
        is_flagged=False,
    )

    flagged_txn_ids = [txn_outward.id, txn_return.id]

    alert = await seed_alert(
        session,
        customer_id=customer.id,
        flagged_txn_ids=flagged_txn_ids,
        alert_id="RT1",
        typology=TYPOLOGY_ROUND_TRIP,
        risk_score=80,
        status="New",
        title="Round-trip fund flow via jewellery supply chain — Anil Deshmukh",
        description=(
            "Customer Anil Deshmukh, a jeweller with declared annual income of ₹18L, "
            "debited ₹28,00,000 via RTGS to Shree Ornaments Pvt Ltd on 08-Jan-2026. "
            "Within six days, ₹27,50,000 was credited back to his account from Bharat "
            "Gems Trading Co — a distinct entity with no previously recorded relationship "
            "to the customer. The near-identical amounts and short turnaround strongly "
            "indicate a two-hop circular flow designed to simulate a commercial invoice "
            "trail. The net outflow of ₹50,000 (1.8%) may represent a layering fee. "
            "Transaction volume significantly exceeds declared income."
        ),
        triggered_date="2026-01-15T09:00:00",
        assigned_analyst=None,
        total_flagged_amount=2_800_000.0,
        flagged_transaction_count=2,
    )

    await seed_checklist(session, alert_id=alert.id, typology=TYPOLOGY_ROUND_TRIP)


# ---------------------------------------------------------------------------
# RT2 — Pooja Saxena
# Circular chain: Pooja → Rajan Saxena (relative) → Sunshine Welfare Society
#                 → back to Pooja
# Amount: ₹15,00,000 outward; ₹14,80,000 returned
# ---------------------------------------------------------------------------

async def _seed_rt2_pooja_saxena(session: AsyncSession) -> None:
    """
    RT2: Pooja Saxena, an NGO worker, transfers ₹15L to her relative's personal
    account. The relative routes it to a welfare society that then credits back
    ₹14.8L to Pooja — exploiting family and NGO structures to layer funds
    with a veneer of charitable activity.
    """
    customer = await seed_customer(
        session,
        full_name="Pooja Saxena",
        date_of_birth="1985-11-02",
        nationality="Indian",
        occupation="NGO Program Officer",
        employer="Aasha Foundation",
        declared_annual_income=720_000.0,  # ₹7.2L declared
        risk_category="High",
        customer_since="2018-03-22",
        id_type="PAN",
        id_number="BCXPS9921K",
        address="Flat 4B, Laxmi Nagar Colony, Lucknow, Uttar Pradesh 226010",
        phone="+91-94157-60381",
        email="pooja.saxena@aashafoundation.org",
        pep_status=False,
        previous_alert_count=0,
        kyc_verification_date="2020-09-01",
        kyc_last_update_date="2020-09-01",
        income_verification_notes="Employment letter from Hope Foundation Trust. Salary ₹25K/month. No ITR on file. NGO FCRA registration on file.",
    )

    account = await seed_account(
        session,
        customer_id=customer.id,
        account_number="PNB-LKO-0028-554412",
        account_type="Savings",
        branch="Laxmi Nagar Branch, Lucknow",
        opening_date="2018-03-22",
        status="Active",
        current_balance=85_000.0,
        currency="INR",
    )

    # Leg 1 — Pooja sends ₹15L to relative Rajan Saxena
    txn_to_relative = await seed_transaction(
        session,
        account_id=account.id,
        transaction_date="2026-01-22T13:10:00",
        transaction_type="IMPS Transfer",
        amount=1_500_000.0,
        currency="INR",
        direction="debit",
        channel="IMPS",
        counterparty_name="Rajan Saxena",
        counterparty_account="BOB-LKO-SAVE-338812",
        counterparty_bank="Bank of Baroda, Hazratganj Branch, Lucknow",
        location="Lucknow, Uttar Pradesh",
        country="India",
        reference_number="IMPS-PNB-20260122-44901",
        description="Family transfer — personal assistance",
        is_flagged=True,
    )

    # Leg 3 — ₹14.8L credited back from Sunshine Welfare Society
    # (Rajan → Sunshine Welfare Society → Pooja; society leg is external)
    txn_return = await seed_transaction(
        session,
        account_id=account.id,
        transaction_date="2026-02-01T11:55:00",
        transaction_type="NEFT Transfer",
        amount=1_480_000.0,
        currency="INR",
        direction="credit",
        channel="NEFT",
        counterparty_name="Sunshine Welfare Society",
        counterparty_account="UCO-LKO-NGO-001874",
        counterparty_bank="UCO Bank, Gomti Nagar Branch, Lucknow",
        location="Lucknow, Uttar Pradesh",
        country="India",
        reference_number="NEFT-UCO-20260201-21103",
        description="Project disbursement — Community Health Initiative Phase 2",
        is_flagged=True,
    )

    # Supporting context — regular salary credit to establish baseline
    await seed_transaction(
        session,
        account_id=account.id,
        transaction_date="2026-01-01T09:00:00",
        transaction_type="Salary Credit",
        amount=60_000.0,
        currency="INR",
        direction="credit",
        channel="NEFT",
        counterparty_name="Aasha Foundation",
        counterparty_account="ICICI-DEL-CORP-100234",
        counterparty_bank="ICICI Bank, Connaught Place Branch, New Delhi",
        location="Lucknow, Uttar Pradesh",
        country="India",
        reference_number="SAL-AASHA-JAN2026-00091",
        description="Monthly salary — January 2026",
        is_flagged=False,
    )

    await seed_transaction(
        session,
        account_id=account.id,
        transaction_date="2026-01-15T16:20:00",
        transaction_type="UPI Transfer",
        amount=8_500.0,
        currency="INR",
        direction="debit",
        channel="UPI",
        counterparty_name="Big Bazaar Lucknow",
        counterparty_account=None,
        counterparty_bank=None,
        location="Lucknow, Uttar Pradesh",
        country="India",
        reference_number="UPI-20260115-BIGBZ-7723",
        description="Grocery purchase",
        is_flagged=False,
    )

    flagged_txn_ids = [txn_to_relative.id, txn_return.id]

    alert = await seed_alert(
        session,
        customer_id=customer.id,
        flagged_txn_ids=flagged_txn_ids,
        alert_id="RT2",
        typology=TYPOLOGY_ROUND_TRIP,
        risk_score=73,
        status="New",
        title="Funds routed through relative and NGO back to originator — Pooja Saxena",
        description=(
            "Pooja Saxena, an NGO program officer with a declared salary of ₹7.2L per "
            "annum, transferred ₹15,00,000 on 22-Jan-2026 to Rajan Saxena — identified "
            "as a family member — framed as personal assistance. On 01-Feb-2026, "
            "₹14,80,000 was credited to Pooja's account from Sunshine Welfare Society, "
            "an NGO with no prior relationship to the customer. The 10-day turnaround, "
            "near-matching amounts, and routing through both a relative and a charitable "
            "entity are consistent with a three-hop round-trip. The declared transfer "
            "purpose does not account for the return flow. Transaction amounts are "
            "disproportionate to customer income profile."
        ),
        triggered_date="2026-02-02T08:30:00",
        assigned_analyst=None,
        total_flagged_amount=1_500_000.0,
        flagged_transaction_count=2,
    )

    await seed_checklist(session, alert_id=alert.id, typology=TYPOLOGY_ROUND_TRIP)


# ---------------------------------------------------------------------------
# RT3 — Manish Tiwari
# Complex 4-hop chain:
#   Manish → Pinnacle Infra Projects → Greenfield Holdings Pvt Ltd
#           → Apex Land Consultants → back to Manish
# Amount: ₹75,00,000 outward; ₹74,00,000 returned
# ---------------------------------------------------------------------------

async def _seed_rt3_manish_tiwari(session: AsyncSession) -> None:
    """
    RT3: Manish Tiwari, a real estate developer, executes a sophisticated
    four-hop round-trip totalling ₹75L. Funds pass through a construction
    company, a holdings entity, and a land consultancy before returning —
    each hop introducing a plausible real-estate invoice to obscure the
    circular nature of the flow.
    """
    customer = await seed_customer(
        session,
        full_name="Manish Tiwari",
        date_of_birth="1969-07-25",
        nationality="Indian",
        occupation="Real Estate Developer",
        employer="Tiwari Realty Group",
        declared_annual_income=6_000_000.0,  # ₹60L declared
        risk_category="High",
        customer_since="2010-11-05",
        id_type="Passport",
        id_number="Z4821093",
        address="Villa 12, Prestige Lakeside Habitat, Whitefield, Bengaluru, Karnataka 560066",
        phone="+91-98441-71204",
        email="manish.tiwari@tiwarirealygroup.in",
        pep_status=False,
        previous_alert_count=2,
        kyc_verification_date="2014-05-15",
        kyc_last_update_date="2021-11-30",
        income_verification_notes="RERA registered developer #MAHARERA/P52000012345. ITR FY 2020-21 showing ₹2.4Cr. Company incorporation certificate on file.",
    )

    account = await seed_account(
        session,
        customer_id=customer.id,
        account_number="ICICI-BLR-CURR-0093-445512",
        account_type="Current",
        branch="Whitefield Branch, Bengaluru",
        opening_date="2010-11-05",
        status="Active",
        current_balance=1_250_000.0,
        currency="INR",
    )

    # Hop 1 — Manish sends ₹75L to Pinnacle Infra Projects via RTGS
    txn_hop1_outward = await seed_transaction(
        session,
        account_id=account.id,
        transaction_date="2026-01-06T10:05:00",
        transaction_type="RTGS Transfer",
        amount=7_500_000.0,
        currency="INR",
        direction="debit",
        channel="RTGS",
        counterparty_name="Pinnacle Infra Projects Pvt Ltd",
        counterparty_account="KOTAK-BLR-CORP-881203",
        counterparty_bank="Kotak Mahindra Bank, Indiranagar Branch, Bengaluru",
        location="Bengaluru, Karnataka",
        country="India",
        reference_number="RTGS-ICICI-20260106-00182",
        description="Advance payment for civil works — Contract PIP/TRG/2026/001",
        is_flagged=True,
    )

    # Hop 4 — ₹74L returned to Manish from Apex Land Consultants
    # (Pinnacle → Greenfield → Apex → Manish; intermediate hops are external)
    txn_hop4_return = await seed_transaction(
        session,
        account_id=account.id,
        transaction_date="2026-01-28T16:30:00",
        transaction_type="RTGS Transfer",
        amount=7_400_000.0,
        currency="INR",
        direction="credit",
        channel="RTGS",
        counterparty_name="Apex Land Consultants LLP",
        counterparty_account="YES-BLR-LLP-550019",
        counterparty_bank="Yes Bank, Koramangala Branch, Bengaluru",
        location="Bengaluru, Karnataka",
        country="India",
        reference_number="RTGS-YES-20260128-07714",
        description="Land valuation advisory fee credit — Ref ALC/TWG/2026/REV-003",
        is_flagged=True,
    )

    # Intermediate flagged leg visible on Manish's account — a partial debit
    # to Greenfield Holdings that partially uncovers the chain
    txn_greenfield_partial = await seed_transaction(
        session,
        account_id=account.id,
        transaction_date="2026-01-10T14:00:00",
        transaction_type="NEFT Transfer",
        amount=200_000.0,
        currency="INR",
        direction="debit",
        channel="NEFT",
        counterparty_name="Greenfield Holdings Pvt Ltd",
        counterparty_account="HDFC-BLR-CORP-334401",
        counterparty_bank="HDFC Bank, MG Road Branch, Bengaluru",
        location="Bengaluru, Karnataka",
        country="India",
        reference_number="NEFT-ICICI-20260110-55603",
        description="Consulting retainer — Greenfield project advisory Q1 2026",
        is_flagged=True,
    )

    # Supporting context transactions
    await seed_transaction(
        session,
        account_id=account.id,
        transaction_date="2026-01-02T11:00:00",
        transaction_type="Cheque Deposit",
        amount=800_000.0,
        currency="INR",
        direction="credit",
        channel="cheque",
        counterparty_name="Karnataka Housing Board",
        counterparty_account=None,
        counterparty_bank="State Bank of India",
        location="Bengaluru, Karnataka",
        country="India",
        reference_number="CHQ-KHB-20260102-8821",
        description="Plot allotment deposit refund",
        is_flagged=False,
    )

    await seed_transaction(
        session,
        account_id=account.id,
        transaction_date="2026-01-18T10:15:00",
        transaction_type="NEFT Transfer",
        amount=250_000.0,
        currency="INR",
        direction="debit",
        channel="NEFT",
        counterparty_name="Income Tax Department",
        counterparty_account="GOV-IT-CHALLAN",
        counterparty_bank="Reserve Bank of India",
        location="Bengaluru, Karnataka",
        country="India",
        reference_number="ITAX-ADV-Q3-20260118-0041",
        description="Advance income tax — Q3 FY2025-26",
        is_flagged=False,
    )

    await seed_transaction(
        session,
        account_id=account.id,
        transaction_date="2026-02-05T12:00:00",
        transaction_type="RTGS Transfer",
        amount=350_000.0,
        currency="INR",
        direction="debit",
        channel="RTGS",
        counterparty_name="Bengaluru Electricity Supply Company",
        counterparty_account="BESCOM-UTIL-CORP",
        counterparty_bank="Canara Bank",
        location="Bengaluru, Karnataka",
        country="India",
        reference_number="BESCOM-PAY-20260205-1144",
        description="Commercial electricity bill payment — site offices",
        is_flagged=False,
    )

    flagged_txn_ids = [
        txn_hop1_outward.id,
        txn_greenfield_partial.id,
        txn_hop4_return.id,
    ]

    alert = await seed_alert(
        session,
        customer_id=customer.id,
        flagged_txn_ids=flagged_txn_ids,
        alert_id="RT3",
        typology=TYPOLOGY_ROUND_TRIP,
        risk_score=87,
        status="New",
        title="Complex 4-hop round-trip via real estate entities — Manish Tiwari",
        description=(
            "Manish Tiwari, a real estate developer with two prior alerts, transferred "
            "₹75,00,000 via RTGS on 06-Jan-2026 to Pinnacle Infra Projects Pvt Ltd, "
            "citing a civil works advance. A secondary NEFT of ₹2,00,000 to Greenfield "
            "Holdings Pvt Ltd on 10-Jan-2026 — framed as a consulting retainer — is "
            "consistent with a layering fee paid to an intermediary. On 28-Jan-2026, "
            "₹74,00,000 was credited back to Tiwari's account from Apex Land Consultants "
            "LLP, a fourth entity unconnected to any prior transaction. Intelligence links "
            "Pinnacle Infra → Greenfield Holdings → Apex Land Consultants as a chain of "
            "entities sharing common directors. The 22-day cycle, matching amounts, and "
            "real-estate invoice framing at each hop indicate a deliberate multi-layer "
            "round-trip structure. Net fund retention of ₹1,00,000 (1.3%) is consistent "
            "with a layering cost. Recommend tracing all four entity relationships and "
            "requesting underlying contracts."
        ),
        triggered_date="2026-01-29T07:45:00",
        assigned_analyst=None,
        total_flagged_amount=7_500_000.0,
        flagged_transaction_count=3,
    )

    await seed_checklist(session, alert_id=alert.id, typology=TYPOLOGY_ROUND_TRIP)
