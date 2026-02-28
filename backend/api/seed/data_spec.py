"""
Synthetic data specification for AML Sentinel.

Defines 20 alerts across 6 typologies, each with a customer profile,
account(s), and realistic transaction histories set in India (INR).

Typology distribution:
  - Structuring (S1-S5): 5 alerts
  - Unusual Geographic Activity (G1-G3): 3 alerts
  - Rapid Fund Movement (R1-R3): 3 alerts
  - Round-trip Transactions (RT1-RT3): 3 alerts
  - Sudden Activity Change (SA1-SA3): 3 alerts
  - Large Cash Transactions (LC1-LC3): 3 alerts

Each alert spec is a dict with keys:
  customer, accounts, transactions, alert
"""

TYPOLOGY_STRUCTURING = "Structuring"
TYPOLOGY_GEOGRAPHIC = "Unusual Geographic Activity"
TYPOLOGY_RAPID_MOVEMENT = "Rapid Fund Movement"
TYPOLOGY_ROUND_TRIP = "Round-trip Transactions"
TYPOLOGY_SUDDEN_ACTIVITY = "Sudden Activity Change"
TYPOLOGY_LARGE_CASH = "Large Cash Transactions"

ALL_TYPOLOGIES = [
    TYPOLOGY_STRUCTURING,
    TYPOLOGY_GEOGRAPHIC,
    TYPOLOGY_RAPID_MOVEMENT,
    TYPOLOGY_ROUND_TRIP,
    TYPOLOGY_SUDDEN_ACTIVITY,
    TYPOLOGY_LARGE_CASH,
]

CHECKLIST_TEMPLATES: dict[str, list[str]] = {
    TYPOLOGY_STRUCTURING: [
        "Verify if transactions are split below CTR threshold (₹10,00,000)",
        "Check all branches involved in deposits",
        "Review CTR filing status for each transaction",
        "Verify customer occupation and declared income against transaction volume",
        "Review account opening documents and KYC",
        "Check for similar patterns in related accounts",
        "Determine if there is a legitimate business reason for cash handling",
    ],
    TYPOLOGY_GEOGRAPHIC: [
        "Verify customer's stated business connections to high-risk jurisdictions",
        "Cross-check destination countries against FATF high-risk list",
        "Review travel history and passport records if available",
        "Check if wire transfer amounts align with stated purpose",
        "Verify beneficiary details and relationship to customer",
        "Review previous geographic activity patterns for this customer",
    ],
    TYPOLOGY_RAPID_MOVEMENT: [
        "Calculate average holding period for funds in account",
        "Identify source of incoming funds and destination of outgoing funds",
        "Check if account is being used as a pass-through",
        "Verify whether intermediary accounts are involved",
        "Review business justification for rapid fund movements",
        "Check for matching amounts between credits and debits",
    ],
    TYPOLOGY_ROUND_TRIP: [
        "Map the full flow of funds from origin to return",
        "Identify all intermediate entities in the transaction chain",
        "Verify if the originator and final beneficiary are related",
        "Check for layering through multiple accounts or entities",
        "Review business justification for the circular fund flow",
        "Determine if the round-trip creates a false paper trail",
    ],
    TYPOLOGY_SUDDEN_ACTIVITY: [
        "Compare current transaction volume to historical 6-month average",
        "Verify if there is a life event or business change explaining the increase",
        "Review source of new funds entering the account",
        "Check if the customer updated their KYC profile recently",
        "Analyze transaction counterparties for new or unusual entities",
        "Review whether dormancy period preceded the activity spike",
    ],
    TYPOLOGY_LARGE_CASH: [
        "Verify source of cash and supporting documentation",
        "Check if amounts are consistent with customer's business type",
        "Review CTR filing compliance for transactions over ₹10,00,000",
        "Verify if cash transactions are spread across multiple branches",
        "Check customer's declared income against cash deposit volumes",
        "Review whether the customer has a cash-intensive business license",
    ],
}
