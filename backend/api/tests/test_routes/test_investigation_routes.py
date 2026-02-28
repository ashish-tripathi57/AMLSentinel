"""Integration tests for the /api/alerts/{alert_id}/... investigation routes.

Each test uses the ``seeded_client`` fixture which:
  1. Spins up an isolated in-memory SQLite database with the full schema.
  2. Runs all typology seeders (20 alerts across 6 typologies).
  3. Returns an httpx AsyncClient wired to the FastAPI app via ASGI transport.

A valid alert UUID is obtained from GET /api/alerts at the start of each
test that requires one, so tests remain independent of hard-coded IDs.
"""

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import insert
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

import api.models  # noqa: F401 — registers all SQLAlchemy models
from api.core.database import get_async_session
from api.main import create_app
from api.models.account import Account
from api.models.alert import Alert, alert_transactions
from api.models.base import Base
from api.models.customer import Customer
from api.models.transaction import Transaction
from api.seed.__main__ import seed_all

TEST_DATABASE_URL = "sqlite+aiosqlite://"


# ---------------------------------------------------------------------------
# Fixture
# ---------------------------------------------------------------------------


@pytest.fixture()
async def seeded_client():
    """AsyncClient backed by a fully-seeded in-memory SQLite database.

    Creates tables, runs all seeders, overrides the session dependency,
    and tears everything down after each test.
    """
    seeded_engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with seeded_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    test_session_factory = async_sessionmaker(
        seeded_engine, class_=AsyncSession, expire_on_commit=False
    )

    async with test_session_factory() as seed_session:
        await seed_all(seed_session)
        await seed_session.commit()

    async def override_get_async_session():
        async with test_session_factory() as session:
            yield session

    application = create_app()
    application.dependency_overrides[get_async_session] = override_get_async_session

    async with AsyncClient(
        transport=ASGITransport(app=application), base_url="http://test"
    ) as test_client:
        yield test_client

    async with seeded_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await seeded_engine.dispose()


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------


async def _get_first_alert_id(client: AsyncClient) -> str:
    """Return the UUID of the first alert in the seeded queue."""
    response = await client.get("/api/alerts?limit=1")
    assert response.status_code == 200, "Prerequisite: alert list must return 200"
    return response.json()["alerts"][0]["id"]


# ---------------------------------------------------------------------------
# GET /api/alerts/{alert_id}/customer
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_get_customer_profile_returns_200(seeded_client: AsyncClient) -> None:
    """Customer profile endpoint returns HTTP 200 for a valid alert UUID."""
    alert_id = await _get_first_alert_id(seeded_client)
    response = await seeded_client.get(f"/api/alerts/{alert_id}/customer")
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_get_customer_profile_has_required_fields(seeded_client: AsyncClient) -> None:
    """Customer profile response includes id, full_name, risk_category, and accounts."""
    alert_id = await _get_first_alert_id(seeded_client)
    body = (await seeded_client.get(f"/api/alerts/{alert_id}/customer")).json()

    assert "id" in body
    assert "full_name" in body
    assert "risk_category" in body
    assert "accounts" in body
    assert isinstance(body["accounts"], list)


@pytest.mark.asyncio
async def test_get_customer_profile_accounts_have_required_fields(seeded_client: AsyncClient) -> None:
    """Each account nested in the customer profile has id and account_number."""
    alert_id = await _get_first_alert_id(seeded_client)
    body = (await seeded_client.get(f"/api/alerts/{alert_id}/customer")).json()

    assert len(body["accounts"]) > 0, "Seeded customer must have at least one account"
    for account in body["accounts"]:
        assert "id" in account
        assert "account_number" in account
        assert "account_type" in account


@pytest.mark.asyncio
async def test_get_customer_profile_returns_404_for_unknown_alert(seeded_client: AsyncClient) -> None:
    """Customer profile endpoint returns 404 for a non-existent alert UUID."""
    response = await seeded_client.get(
        "/api/alerts/00000000-0000-0000-0000-000000000000/customer"
    )
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# GET /api/alerts/{alert_id}/transactions
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_get_transaction_timeline_returns_200(seeded_client: AsyncClient) -> None:
    """Transaction timeline endpoint returns HTTP 200 for a valid alert UUID."""
    alert_id = await _get_first_alert_id(seeded_client)
    response = await seeded_client.get(f"/api/alerts/{alert_id}/transactions")
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_get_transaction_timeline_returns_list_of_transactions(seeded_client: AsyncClient) -> None:
    """Transaction timeline returns a non-empty list of transaction objects."""
    alert_id = await _get_first_alert_id(seeded_client)
    body = (await seeded_client.get(f"/api/alerts/{alert_id}/transactions")).json()

    assert isinstance(body, list)
    assert len(body) > 0
    for txn in body:
        assert "id" in txn
        assert "amount" in txn
        assert "transaction_date" in txn
        assert "direction" in txn
        assert "account_id" in txn


@pytest.mark.asyncio
async def test_get_transaction_timeline_no_duplicate_ids(seeded_client: AsyncClient) -> None:
    """Transaction timeline must not return duplicate transaction records."""
    alert_id = await _get_first_alert_id(seeded_client)
    transactions = (await seeded_client.get(f"/api/alerts/{alert_id}/transactions")).json()

    ids = [t["id"] for t in transactions]
    assert len(ids) == len(set(ids)), "Duplicate transaction IDs found in timeline"


@pytest.mark.asyncio
async def test_get_transaction_timeline_returns_404_for_unknown_alert(seeded_client: AsyncClient) -> None:
    """Transaction timeline endpoint returns 404 for a non-existent alert UUID."""
    response = await seeded_client.get(
        "/api/alerts/00000000-0000-0000-0000-000000000000/transactions"
    )
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# GET /api/alerts/{alert_id}/network
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_get_network_graph_returns_200(seeded_client: AsyncClient) -> None:
    """Network graph endpoint returns HTTP 200 for a valid alert UUID."""
    alert_id = await _get_first_alert_id(seeded_client)
    response = await seeded_client.get(f"/api/alerts/{alert_id}/network")
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_get_network_graph_shape(seeded_client: AsyncClient) -> None:
    """Network graph response contains 'nodes' and 'edges' arrays."""
    alert_id = await _get_first_alert_id(seeded_client)
    body = (await seeded_client.get(f"/api/alerts/{alert_id}/network")).json()

    assert "nodes" in body
    assert "edges" in body
    assert isinstance(body["nodes"], list)
    assert isinstance(body["edges"], list)


@pytest.mark.asyncio
async def test_get_network_graph_node_types(seeded_client: AsyncClient) -> None:
    """Every node in the graph has a valid type: customer, account, or counterparty."""
    alert_id = await _get_first_alert_id(seeded_client)
    nodes = (await seeded_client.get(f"/api/alerts/{alert_id}/network")).json()["nodes"]

    valid_types = {"customer", "account", "counterparty"}
    for node in nodes:
        assert "id" in node
        assert "label" in node
        assert "type" in node
        assert node["type"] in valid_types, f"Unexpected node type: {node['type']}"


@pytest.mark.asyncio
async def test_get_network_graph_edge_shape(seeded_client: AsyncClient) -> None:
    """Every edge in the graph has source, target, amount, type, and date fields."""
    alert_id = await _get_first_alert_id(seeded_client)
    body = (await seeded_client.get(f"/api/alerts/{alert_id}/network")).json()

    assert len(body["edges"]) > 0, "Seeded alert must have at least one flagged transaction"
    for edge in body["edges"]:
        assert "source" in edge
        assert "target" in edge
        assert "amount" in edge
        assert "type" in edge
        assert "date" in edge
        assert isinstance(edge["amount"], (int, float))


@pytest.mark.asyncio
async def test_get_network_graph_omits_customer_node(seeded_client: AsyncClient) -> None:
    """The network graph omits the customer node (redundant in investigation context)."""
    alert_id = await _get_first_alert_id(seeded_client)
    nodes = (await seeded_client.get(f"/api/alerts/{alert_id}/network")).json()["nodes"]

    customer_nodes = [n for n in nodes if n["type"] == "customer"]
    assert len(customer_nodes) == 0

    # Account node must exist as the central hub
    account_nodes = [n for n in nodes if n["type"] == "account"]
    assert len(account_nodes) >= 1


@pytest.mark.asyncio
async def test_get_network_graph_returns_404_for_unknown_alert(seeded_client: AsyncClient) -> None:
    """Network graph endpoint returns 404 for a non-existent alert UUID."""
    response = await seeded_client.get(
        "/api/alerts/00000000-0000-0000-0000-000000000000/network"
    )
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# GET /api/alerts/{alert_id}/notes  and  POST /api/alerts/{alert_id}/notes
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_list_investigation_notes_returns_empty_list_initially(seeded_client: AsyncClient) -> None:
    """Notes list returns an empty array when no notes have been created yet."""
    alert_id = await _get_first_alert_id(seeded_client)
    body = (await seeded_client.get(f"/api/alerts/{alert_id}/notes")).json()

    assert isinstance(body, list)
    # Seeder does not create notes, so the list must be empty.
    assert body == []


@pytest.mark.asyncio
async def test_create_investigation_note_returns_201(seeded_client: AsyncClient) -> None:
    """Creating a note returns HTTP 201 and the persisted note data."""
    alert_id = await _get_first_alert_id(seeded_client)
    response = await seeded_client.post(
        f"/api/alerts/{alert_id}/notes",
        params={"analyst_username": "sarah.chen"},
        json={"content": "Reviewed transactions — pattern is consistent with structuring."},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["content"] == "Reviewed transactions — pattern is consistent with structuring."
    assert body["analyst_username"] == "sarah.chen"
    assert body["alert_id"] == alert_id
    assert "id" in body
    assert "created_at" in body


@pytest.mark.asyncio
async def test_created_note_appears_in_subsequent_list(seeded_client: AsyncClient) -> None:
    """A note created via POST must appear in the subsequent GET notes list."""
    alert_id = await _get_first_alert_id(seeded_client)

    await seeded_client.post(
        f"/api/alerts/{alert_id}/notes",
        params={"analyst_username": "sarah.chen"},
        json={"content": "Initial review complete."},
    )

    notes = (await seeded_client.get(f"/api/alerts/{alert_id}/notes")).json()
    assert len(notes) == 1
    assert notes[0]["content"] == "Initial review complete."


@pytest.mark.asyncio
async def test_create_note_returns_404_for_unknown_alert(seeded_client: AsyncClient) -> None:
    """Creating a note for a non-existent alert returns 404."""
    response = await seeded_client.post(
        "/api/alerts/00000000-0000-0000-0000-000000000000/notes",
        params={"analyst_username": "sarah.chen"},
        json={"content": "This should not be saved."},
    )
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# GET /api/alerts/{alert_id}/checklist  and
# PATCH /api/alerts/{alert_id}/checklist/{item_id}
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_list_checklist_items_returns_seeded_items(seeded_client: AsyncClient) -> None:
    """Checklist endpoint returns the typology-specific items created by the seeder."""
    alert_id = await _get_first_alert_id(seeded_client)
    body = (await seeded_client.get(f"/api/alerts/{alert_id}/checklist")).json()

    assert isinstance(body, list)
    assert len(body) > 0
    for item in body:
        assert "id" in item
        assert "description" in item
        assert "is_checked" in item
        assert "sort_order" in item


@pytest.mark.asyncio
async def test_patch_checklist_item_checks_the_item(seeded_client: AsyncClient) -> None:
    """PATCHing a checklist item marks it as checked and records who checked it."""
    alert_id = await _get_first_alert_id(seeded_client)
    items = (await seeded_client.get(f"/api/alerts/{alert_id}/checklist")).json()
    item_id = items[0]["id"]

    response = await seeded_client.patch(
        f"/api/alerts/{alert_id}/checklist/{item_id}",
        json={"is_checked": True, "checked_by": "analyst", "ai_rationale": None},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["is_checked"] is True
    assert body["checked_by"] == "analyst"
    assert body["id"] == item_id


@pytest.mark.asyncio
async def test_patch_checklist_item_with_ai_rationale(seeded_client: AsyncClient) -> None:
    """PATCHing a checklist item stores an optional AI rationale string."""
    alert_id = await _get_first_alert_id(seeded_client)
    items = (await seeded_client.get(f"/api/alerts/{alert_id}/checklist")).json()
    item_id = items[0]["id"]

    response = await seeded_client.patch(
        f"/api/alerts/{alert_id}/checklist/{item_id}",
        json={
            "is_checked": True,
            "checked_by": "ai",
            "ai_rationale": "Transaction amounts are below reporting threshold — consistent with structuring.",
        },
    )
    assert response.status_code == 200
    assert response.json()["ai_rationale"] is not None


@pytest.mark.asyncio
async def test_patch_checklist_item_returns_404_for_unknown_item(seeded_client: AsyncClient) -> None:
    """PATCHing a non-existent checklist item returns 404."""
    alert_id = await _get_first_alert_id(seeded_client)
    response = await seeded_client.patch(
        f"/api/alerts/{alert_id}/checklist/00000000-0000-0000-0000-000000000000",
        json={"is_checked": True, "checked_by": "analyst", "ai_rationale": None},
    )
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# GET /api/alerts/{alert_id}/audit-trail
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_auto_check_item_returns_result(seeded_client: AsyncClient) -> None:
    """POST /checklist/{item_id}/auto-check returns is_checked and rationale from AI."""
    alert_id = await _get_first_alert_id(seeded_client)
    items = (await seeded_client.get(f"/api/alerts/{alert_id}/checklist")).json()
    item_id = items[0]["id"]

    response = await seeded_client.post(
        f"/api/alerts/{alert_id}/checklist/{item_id}/auto-check",
    )
    assert response.status_code == 200
    body = response.json()
    assert "is_checked" in body
    assert "rationale" in body
    assert isinstance(body["is_checked"], bool)
    assert isinstance(body["rationale"], str)
    assert len(body["rationale"]) > 0


@pytest.mark.asyncio
async def test_auto_check_item_persists_result(seeded_client: AsyncClient) -> None:
    """Auto-check result is persisted — subsequent GET shows the AI verdict."""
    alert_id = await _get_first_alert_id(seeded_client)
    items = (await seeded_client.get(f"/api/alerts/{alert_id}/checklist")).json()
    item_id = items[0]["id"]

    await seeded_client.post(
        f"/api/alerts/{alert_id}/checklist/{item_id}/auto-check",
    )

    updated_items = (await seeded_client.get(f"/api/alerts/{alert_id}/checklist")).json()
    updated_item = next(i for i in updated_items if i["id"] == item_id)
    assert updated_item["checked_by"] == "ai"
    assert updated_item["ai_rationale"] is not None


@pytest.mark.asyncio
async def test_auto_check_item_returns_404_for_unknown_alert(seeded_client: AsyncClient) -> None:
    """Auto-check returns 404 for a non-existent alert UUID."""
    response = await seeded_client.post(
        "/api/alerts/00000000-0000-0000-0000-000000000000/checklist/some-item-id/auto-check",
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_auto_check_item_returns_404_for_unknown_item(seeded_client: AsyncClient) -> None:
    """Auto-check returns 404 for a non-existent checklist item."""
    alert_id = await _get_first_alert_id(seeded_client)
    response = await seeded_client.post(
        f"/api/alerts/{alert_id}/checklist/00000000-0000-0000-0000-000000000000/auto-check",
    )
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# GET /api/alerts/{alert_id}/audit-trail
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_get_audit_trail_returns_empty_list_initially(seeded_client: AsyncClient) -> None:
    """Audit trail is empty for a freshly seeded alert with no activity."""
    alert_id = await _get_first_alert_id(seeded_client)
    body = (await seeded_client.get(f"/api/alerts/{alert_id}/audit-trail")).json()

    assert isinstance(body, list)
    # Seeder does not create audit trail entries.
    assert body == []


@pytest.mark.asyncio
async def test_get_audit_trail_reflects_status_update(seeded_client: AsyncClient) -> None:
    """After a status update, the audit trail contains the corresponding entry."""
    alert_id = await _get_first_alert_id(seeded_client)

    await seeded_client.patch(
        f"/api/alerts/{alert_id}/status",
        params={"analyst_username": "sarah.chen"},
        json={"status": "In Progress", "rationale": "Starting investigation"},
    )

    trail = (await seeded_client.get(f"/api/alerts/{alert_id}/audit-trail")).json()
    assert len(trail) == 1
    assert trail[0]["action"] == "status_update"
    assert trail[0]["performed_by"] == "sarah.chen"
    assert trail[0]["alert_id"] == alert_id


@pytest.mark.asyncio
async def test_get_audit_trail_action_filter(seeded_client: AsyncClient) -> None:
    """Filtering by action= returns only entries matching that action type."""
    alert_id = await _get_first_alert_id(seeded_client)

    # Generate a status_update audit entry.
    await seeded_client.patch(
        f"/api/alerts/{alert_id}/status",
        params={"analyst_username": "sarah.chen"},
        json={"status": "In Progress", "rationale": "Starting investigation"},
    )

    # Filter for a non-existent action — should return empty list.
    filtered = (
        await seeded_client.get(f"/api/alerts/{alert_id}/audit-trail?action=note_added")
    ).json()
    assert filtered == []

    # Filter for the real action — should return the one entry.
    filtered_real = (
        await seeded_client.get(f"/api/alerts/{alert_id}/audit-trail?action=status_update")
    ).json()
    assert len(filtered_real) == 1


@pytest.mark.asyncio
async def test_get_audit_trail_returns_404_for_unknown_alert(seeded_client: AsyncClient) -> None:
    """Audit trail endpoint returns 404 for a non-existent alert UUID."""
    response = await seeded_client.get(
        "/api/alerts/00000000-0000-0000-0000-000000000000/audit-trail"
    )
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# Edge-case fixture: orphaned data for defensive-code coverage
# ---------------------------------------------------------------------------

ORPHAN_ALERT_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
NETWORK_ALERT_ID = "eeeeeeee-ffff-0000-1111-222222222222"


@pytest.fixture()
async def edge_case_client():
    """AsyncClient with edge-case data for defensive code paths.

    Creates:
    - An alert whose customer_id references a non-existent customer.
    - A customer + alert + transaction where the transaction's account_id
      does NOT appear in the customer's accounts list.
    """
    edge_engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with edge_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    factory = async_sessionmaker(edge_engine, class_=AsyncSession, expire_on_commit=False)

    async with factory() as session:
        # 1) Alert with no matching customer (orphaned customer_id).
        session.add(
            Alert(
                id=ORPHAN_ALERT_ID,
                alert_id="ORPHAN1",
                customer_id="no-such-customer",
                typology="Structuring",
                risk_score=85,
                status="New",
                title="Orphaned alert",
                triggered_date="2025-01-01",
                flagged_transaction_count=0,
            )
        )

        # 2) Customer with one account, alert, and a transaction referencing
        #    an account_id that is NOT in the customer's accounts list.
        session.add(
            Customer(
                id="cust-edge-001",
                full_name="Edge Case Customer",
                risk_category="High",
            )
        )
        session.add(
            Account(
                id="acct-edge-001",
                customer_id="cust-edge-001",
                account_number="EDGE-ACC-001",
                account_type="savings",
            )
        )
        session.add(
            Alert(
                id=NETWORK_ALERT_ID,
                alert_id="EDGE1",
                customer_id="cust-edge-001",
                typology="Structuring",
                risk_score=75,
                status="New",
                title="Edge alert with unknown-account transaction",
                triggered_date="2025-01-15",
                flagged_transaction_count=1,
            )
        )
        # Transaction references "acct-unknown", which is NOT in customer.accounts.
        session.add(
            Transaction(
                id="txn-edge-001",
                account_id="acct-unknown",
                transaction_date="2025-01-15",
                transaction_type="wire",
                amount=50000.0,
                direction="debit",
                counterparty_name="Unknown Corp",
            )
        )
        await session.flush()
        await session.execute(
            insert(alert_transactions).values(
                alert_id=NETWORK_ALERT_ID,
                transaction_id="txn-edge-001",
            )
        )
        await session.commit()

    async def override_session():
        async with factory() as session:
            yield session

    application = create_app()
    application.dependency_overrides[get_async_session] = override_session

    async with AsyncClient(
        transport=ASGITransport(app=application), base_url="http://test"
    ) as test_client:
        yield test_client

    async with edge_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await edge_engine.dispose()


# ---------------------------------------------------------------------------
# Edge-case tests: orphaned customer (lines 116, 171)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_customer_profile_returns_404_when_customer_missing(
    edge_case_client: AsyncClient,
) -> None:
    """GET /customer returns 404 when the alert exists but its customer does not."""
    response = await edge_case_client.get(f"/api/alerts/{ORPHAN_ALERT_ID}/customer")
    assert response.status_code == 404
    assert "Customer" in response.json()["detail"]


@pytest.mark.asyncio
async def test_network_graph_returns_404_when_customer_missing(
    edge_case_client: AsyncClient,
) -> None:
    """GET /network returns 404 when the alert exists but its customer does not."""
    response = await edge_case_client.get(f"/api/alerts/{ORPHAN_ALERT_ID}/network")
    assert response.status_code == 404
    assert "Customer" in response.json()["detail"]


# ---------------------------------------------------------------------------
# Edge-case test: transaction with unknown account (line 209)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_network_graph_creates_fallback_node_for_unknown_account(
    edge_case_client: AsyncClient,
) -> None:
    """GET /network creates a fallback account node when a transaction references
    an account_id not present in the customer's accounts list."""
    response = await edge_case_client.get(f"/api/alerts/{NETWORK_ALERT_ID}/network")
    assert response.status_code == 200

    body = response.json()
    account_nodes = [n for n in body["nodes"] if n["type"] == "account"]
    # The transaction references "acct-unknown" which is not in customer.accounts,
    # so a fallback node should be created with id "account:acct-unknown".
    fallback_ids = [n["id"] for n in account_nodes if "acct-unknown" in n["id"]]
    assert len(fallback_ids) == 1, "Expected a fallback account node for 'acct-unknown'"


# ---------------------------------------------------------------------------
# GET /api/alerts/{alert_id}/similar-cases
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_get_similar_cases_returns_200(seeded_client: AsyncClient) -> None:
    """Similar cases endpoint returns HTTP 200 for a valid alert UUID."""
    alert_id = await _get_first_alert_id(seeded_client)
    response = await seeded_client.get(f"/api/alerts/{alert_id}/similar-cases")
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_get_similar_cases_returns_list(seeded_client: AsyncClient) -> None:
    """Similar cases endpoint returns a list of case objects."""
    alert_id = await _get_first_alert_id(seeded_client)
    body = (await seeded_client.get(f"/api/alerts/{alert_id}/similar-cases")).json()

    assert isinstance(body, list)
    assert len(body) > 0, "Seeded data must produce at least one similar case"


@pytest.mark.asyncio
async def test_get_similar_cases_result_shape(seeded_client: AsyncClient) -> None:
    """Each similar case has the expected fields."""
    alert_id = await _get_first_alert_id(seeded_client)
    body = (await seeded_client.get(f"/api/alerts/{alert_id}/similar-cases")).json()

    required_fields = {
        "id", "alert_id", "title", "typology", "risk_score",
        "status", "similarity_score", "matching_factors",
    }
    for case in body:
        assert required_fields.issubset(case.keys()), (
            f"Missing fields: {required_fields - case.keys()}"
        )
        assert isinstance(case["matching_factors"], list)
        assert isinstance(case["similarity_score"], int)


@pytest.mark.asyncio
async def test_get_similar_cases_max_five(seeded_client: AsyncClient) -> None:
    """At most 5 similar cases are returned."""
    alert_id = await _get_first_alert_id(seeded_client)
    body = (await seeded_client.get(f"/api/alerts/{alert_id}/similar-cases")).json()

    assert len(body) <= 5


@pytest.mark.asyncio
async def test_get_similar_cases_returns_404_for_unknown_alert(seeded_client: AsyncClient) -> None:
    """Similar cases endpoint returns 404 for a non-existent alert UUID."""
    response = await seeded_client.get(
        "/api/alerts/00000000-0000-0000-0000-000000000000/similar-cases"
    )
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# GET /api/alerts/{alert_id}/case-file/pdf
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_download_case_file_pdf_returns_200(seeded_client: AsyncClient) -> None:
    """Case file PDF endpoint returns 200 with application/pdf for a valid alert."""
    alert_id = await _get_first_alert_id(seeded_client)
    response = await seeded_client.get(f"/api/alerts/{alert_id}/case-file/pdf")

    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert response.content[:5] == b"%PDF-"
    assert "content-disposition" in response.headers


@pytest.mark.asyncio
async def test_download_case_file_pdf_returns_404_for_unknown_alert(seeded_client: AsyncClient) -> None:
    """Case file PDF endpoint returns 404 for a non-existent alert UUID."""
    response = await seeded_client.get(
        "/api/alerts/00000000-0000-0000-0000-000000000000/case-file/pdf"
    )
    assert response.status_code == 404
