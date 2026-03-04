# PII Masking Architecture — DPDP Act 2023 Compliance

## Approach: Server-Side Data Masking (Not Tokenization)

AML Sentinel uses **server-side data masking** — not tokenization. The distinction matters:

| Technique | How It Works | Reversible? | Used Here? |
|-----------|-------------|-------------|------------|
| **Tokenization** | Replaces real data with a random token, stores the original in a secure vault. The token can be de-tokenized to recover the original value. | Yes (via vault lookup) | No |
| **Data Masking** | Irreversibly transforms PII by replacing characters with mask symbols (`X`, `*`). The original value is never stored separately — it exists only in the database. | No | Yes |

AML Sentinel chose data masking because:

1. **No de-masking needed** — analysts do not need to see raw PII (DOB, full ID number, phone) during investigation. Full name is intentionally unmasked.
2. **Simpler architecture** — no token vault, no extra storage, no key management.
3. **DPDP Act compliance** — the Act requires minimizing PII exposure in processing; masking achieves this without the overhead of a tokenization layer.
4. **Regulatory exception** — FIU-IND STR and SAR PDFs bypass masking entirely and read raw PII directly from the database, as required by law.

---

## Where Masking Happens

Masking is applied at the **backend service layer** — after data is read from the database but before it reaches any output channel (API response, AI prompt, or PDF).

```mermaid
flowchart TB
    subgraph DB["Database (SQLite)"]
        RAW["Raw PII Stored<br/>Full name, DOB, ID number,<br/>phone, email, address,<br/>account numbers"]
    end

    subgraph BACKEND["FastAPI Backend"]
        direction TB

        REPO["Repository Layer<br/>(Async CRUD)"]
        ORM["ORM Objects<br/>(Raw PII in memory)"]

        subgraph MASKING["PII Masking Layer"]
            direction LR
            MASKER["pii_masker.py<br/>Pure Functions"]
            SCHEMAS["Masked Pydantic Schemas<br/>model_validator(mode='after')"]
            AI_HELPERS["AI Prompt Builders<br/>mask_*() calls inline"]
            PDF_MASK["Case File PDF Builder<br/>mask_*() calls inline"]
        end

        ROUTES["API Routes<br/>(investigation.py)"]
        AI_SVC["AI Services<br/>(chat.py, checklist_ai.py,<br/>sar_generator.py)"]
        CASE_PDF["Case File PDF<br/>(case_file_generator.py)"]
    end

    subgraph OUTPUTS["Output Channels (Masked PII)"]
        FRONTEND["Frontend UI<br/>(React SPA)"]
        GEMINI["Gemini API<br/>(AI Prompts)"]
        CASEFILE["Case File PDF<br/>(Internal Use)"]
    end

    subgraph REGULATORY["Regulatory Output (Full PII)"]
        FIU["FIU-IND STR PDF<br/>(fiu_ind_generator.py)"]
        SAR["SAR PDF<br/>(pdf_generator.py)"]
    end

    RAW --> REPO
    REPO --> ORM

    ORM --> SCHEMAS
    SCHEMAS --> ROUTES
    ROUTES -->|"JSON Response<br/>(masked)"| FRONTEND

    ORM --> AI_HELPERS
    AI_HELPERS --> AI_SVC
    AI_SVC -->|"Prompt text<br/>(masked)"| GEMINI

    ORM --> PDF_MASK
    PDF_MASK --> CASE_PDF
    CASE_PDF -->|"PDF bytes<br/>(masked)"| CASEFILE

    ORM -->|"Direct read<br/>(NO masking)"| FIU
    ORM -->|"Direct read<br/>(NO masking)"| SAR

    MASKER -.->|"Used by"| SCHEMAS
    MASKER -.->|"Used by"| AI_HELPERS
    MASKER -.->|"Used by"| PDF_MASK

    style MASKING fill:#fef3c7,stroke:#d97706,color:#000
    style REGULATORY fill:#fee2e2,stroke:#dc2626,color:#000
    style OUTPUTS fill:#d1fae5,stroke:#059669,color:#000
    style DB fill:#dbeafe,stroke:#2563eb,color:#000
```

---

## Masking Rules

All masking is performed by pure functions in `backend/api/core/pii_masker.py`. Each function handles `None` gracefully (returns `None`).

```mermaid
flowchart LR
    subgraph INPUT["Raw PII Value"]
        PHONE_IN["+91-9876-543210"]
        EMAIL_IN["rajesh.sharma@email.com"]
        ID_IN["ABCDE1234R"]
        ADDR_IN["42 MG Road, Surat, Gujarat"]
        DOB_IN["1985-03-15"]
        ACCT_IN["ACC-123-456789"]
    end

    subgraph FUNC["Masking Function"]
        F1["mask_phone()"]
        F2["mask_email()"]
        F3["mask_id_number()"]
        F4["mask_address()"]
        F5["mask_dob()"]
        F6["mask_account_number()"]
    end

    subgraph OUTPUT["Masked Output"]
        PHONE_OUT["+XX-XXXX-XX3210"]
        EMAIL_OUT["r*****@email.com"]
        ID_OUT["XXXXXX234R"]
        ADDR_OUT["******, Surat, Gujarat"]
        DOB_OUT["XXXX-XX-XX"]
        ACCT_OUT["XXX-XXX-XX6789"]
    end

    PHONE_IN --> F1 --> PHONE_OUT
    EMAIL_IN --> F2 --> EMAIL_OUT
    ID_IN --> F3 --> ID_OUT
    ADDR_IN --> F4 --> ADDR_OUT
    DOB_IN --> F5 --> DOB_OUT
    ACCT_IN --> F6 --> ACCT_OUT

    style INPUT fill:#fee2e2,stroke:#dc2626,color:#000
    style FUNC fill:#fef3c7,stroke:#d97706,color:#000
    style OUTPUT fill:#d1fae5,stroke:#059669,color:#000
```

**Intentionally NOT masked:**

| Field | Reason |
|-------|--------|
| Full Name | Required for analyst identity confirmation during investigation |
| Counterparty Name | Required for transaction pattern analysis and network graph |

---

## Three Masking Mechanisms

The masking layer uses three distinct mechanisms depending on the output channel:

```mermaid
flowchart TD
    subgraph MECHANISM_1["Mechanism 1: Pydantic Model Validators"]
        direction TB
        M1_DESC["Used by: API Routes → Frontend"]
        M1_HOW["How: Masked Pydantic schemas<br/>(MaskedCustomerResponse,<br/>MaskedAccountResponse,<br/>MaskedTransactionResponse)<br/>apply masking in<br/>model_validator(mode='after')"]
        M1_WHEN["When: Masking runs automatically<br/>during serialization —<br/>no manual calls needed"]
    end

    subgraph MECHANISM_2["Mechanism 2: Inline mask_*() Calls in Prompt Builders"]
        direction TB
        M2_DESC["Used by: AI Services → Gemini"]
        M2_HOW["How: Prompt-building helper functions<br/>call mask_phone(), mask_email(), etc.<br/>when constructing text blocks<br/>sent to Gemini API"]
        M2_FILES["Files:<br/>chat.py — _build_customer_block(),<br/>_build_accounts_block(),<br/>_build_network_block()<br/>checklist_ai.py — _build_customer_profile_block(),<br/>_build_account_block()<br/>sar_generator.py — account lines"]
    end

    subgraph MECHANISM_3["Mechanism 3: Inline mask_*() Calls in PDF Builder"]
        direction TB
        M3_DESC["Used by: Case File PDF Generator"]
        M3_HOW["How: case_file_generator.py calls<br/>mask_dob(), mask_id_number(), etc.<br/>when rendering customer profile<br/>and account tables into PDF"]
        M3_NOTE["Note: FIU-IND STR and SAR PDFs<br/>do NOT use this mechanism —<br/>they read raw PII directly"]
    end

    style MECHANISM_1 fill:#dbeafe,stroke:#2563eb,color:#000
    style MECHANISM_2 fill:#ede9fe,stroke:#7c3aed,color:#000
    style MECHANISM_3 fill:#d1fae5,stroke:#059669,color:#000
```

---

## Data Flow Per Output Channel

### Channel 1: Frontend UI (API Response)

```mermaid
sequenceDiagram
    participant FE as Frontend (React)
    participant RT as API Route<br/>(investigation.py)
    participant SC as Masked Schema<br/>(Pydantic)
    participant RP as Repository
    participant DB as SQLite

    FE->>RT: GET /api/alerts/{id}/customer
    RT->>RP: get_by_id(customer_id)
    RP->>DB: SELECT * FROM customers
    DB-->>RP: Raw customer row
    RP-->>RT: Customer ORM object (raw PII)
    RT->>SC: MaskedCustomerResponse.model_validate(customer)
    Note over SC: model_validator(mode="after")<br/>mask_dob(), mask_id_number(),<br/>mask_address(), mask_phone(),<br/>mask_email()
    SC-->>RT: Masked response object
    RT-->>FE: JSON with masked PII
```

### Channel 2: AI Prompt (Gemini API)

```mermaid
sequenceDiagram
    participant FE as Frontend (React)
    participant CH as Chat Route<br/>(chat.py)
    participant PB as Prompt Builder<br/>(_build_customer_block)
    participant AI as Gemini API
    participant RP as Repository
    participant DB as SQLite

    FE->>CH: POST /api/alerts/{id}/chat
    CH->>RP: get_by_id(customer_id)
    RP->>DB: SELECT * FROM customers
    DB-->>RP: Raw customer row
    RP-->>CH: Customer ORM object (raw PII)
    CH->>PB: Build prompt context
    Note over PB: Calls mask_dob(), mask_phone(),<br/>mask_email(), mask_id_number(),<br/>mask_address(), mask_account_number()<br/>inline when constructing text
    PB-->>CH: Prompt text with masked PII
    CH->>AI: Send prompt (masked PII only)
    AI-->>CH: AI response (SSE stream)
    CH-->>FE: Streamed response
```

### Channel 3: Case File PDF (Internal)

```mermaid
sequenceDiagram
    participant FE as Frontend (React)
    participant RT as API Route
    participant GEN as case_file_generator.py
    participant RP as Repository
    participant DB as SQLite

    FE->>RT: GET /api/alerts/{id}/case-file/pdf
    RT->>GEN: generate_case_file_pdf(alert_id)
    GEN->>RP: get_by_id(customer_id)
    RP->>DB: SELECT * FROM customers
    DB-->>RP: Raw customer row
    RP-->>GEN: Customer ORM object (raw PII)
    Note over GEN: Calls mask_dob(), mask_id_number(),<br/>mask_address(), mask_phone(),<br/>mask_email(), mask_account_number()<br/>when rendering PDF fields
    GEN-->>RT: PDF bytes (masked PII)
    RT-->>FE: application/pdf download
```

### Channel 4: Regulatory PDFs (Full PII — No Masking)

```mermaid
sequenceDiagram
    participant FE as Frontend (React)
    participant RT as API Route
    participant GEN as fiu_ind_generator.py<br/>/ pdf_generator.py
    participant RP as Repository
    participant DB as SQLite

    FE->>RT: GET /api/alerts/{id}/sar/fiu-ind/pdf
    RT->>GEN: generate_fiu_ind_str_pdf(alert_id)
    GEN->>RP: get_by_id(customer_id)
    RP->>DB: SELECT * FROM customers
    DB-->>RP: Raw customer row
    RP-->>GEN: Customer ORM object (raw PII)
    Note over GEN: NO masking applied.<br/>Full PII written to PDF.<br/>Required by FIU-India regulations.
    GEN-->>RT: PDF bytes (full PII)
    RT-->>FE: application/pdf download
```

---

## File Map

| File | Role in Masking |
|------|----------------|
| `api/core/pii_masker.py` | Foundation — 6 pure masking functions + 2 convenience wrappers |
| `api/schemas/customer.py` | `MaskedCustomerResponse` — masks DOB, ID, address, phone, email via `model_validator` |
| `api/schemas/account.py` | `MaskedAccountResponse` — masks account_number via `model_validator` |
| `api/schemas/transaction.py` | `MaskedTransactionResponse` — masks counterparty_account via `model_validator` |
| `api/routes/investigation.py` | Uses masked schemas for customer, transaction, and network graph endpoints |
| `api/services/chat.py` | Masks PII in prompt context blocks sent to Gemini |
| `api/services/checklist_ai.py` | Masks PII in checklist auto-check prompts sent to Gemini |
| `api/services/sar_generator.py` | Masks account numbers in SAR generation prompts sent to Gemini |
| `api/services/case_file_generator.py` | Masks PII in internal case file PDF output |
| `api/services/fiu_ind_generator.py` | **No masking** — regulatory filing requires full PII |
| `api/services/pdf_generator.py` | **No masking** — SAR PDF for regulatory filing requires full PII |

---

## Security Boundary Summary

```mermaid
graph LR
    subgraph TRUSTED["Trusted Boundary (Server-Side Only)"]
        DB[(SQLite<br/>Raw PII)]
        MASKER["pii_masker.py"]
        REG_GEN["Regulatory PDF<br/>Generators"]
    end

    subgraph MASKED_ZONE["Masked Zone (PII Never Leaves Raw)"]
        API["API Responses"]
        AI["AI Prompts"]
        CASE["Case File PDF"]
    end

    subgraph UNMASKED_EXCEPTION["Regulatory Exception"]
        FIU["FIU-IND STR PDF"]
        SAR["SAR PDF"]
    end

    DB --> MASKER --> API
    MASKER --> AI
    MASKER --> CASE

    DB --> REG_GEN --> FIU
    REG_GEN --> SAR

    style TRUSTED fill:#dbeafe,stroke:#2563eb,color:#000
    style MASKED_ZONE fill:#d1fae5,stroke:#059669,color:#000
    style UNMASKED_EXCEPTION fill:#fee2e2,stroke:#dc2626,color:#000
```

Raw PII never crosses the trusted boundary into the masked zone. The only path where full PII reaches an output is the regulatory exception for FIU-IND STR and SAR PDF filings, which are legal requirements.
