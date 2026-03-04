# LinkedIn Video Script: DPDP Act & PI Masking in AML Sentinel

## Pre-Recording Notes

**Total Duration:** 60 seconds (~150 words spoken)
**Format:** Screen recording with voiceover (face cam optional in corner)
**Tone:** Confident, technical-but-accessible, founder-sharing-a-build

---

## THE SCRIPT

### SHOT 1 — Hook (0:00–0:07)
**Screen:** Open on the Investigation Page showing a customer profile with masked fields (e.g., `Raj████ Sha███`, Aadhaar: `XXXX-XXXX-4521`, Phone: `+91 XXXXX XX890`)

**Say:**
> "India's DPDP Act now mandates masking of personal data — penalties up to 250 crore. Here's how we're solving this in an AI-powered AML platform."

*(~7 seconds, 25 words)*

---

### SHOT 2 — The Problem (0:07–0:15)
**Screen:** Click into an alert investigation. Show the Chat Panel on the right side with customer data visible.

**Say:**
> "AML analysts need customer context — names, Aadhaar numbers, accounts. But when AI enters the workflow, that personal data can't leave your perimeter raw."

*(~8 seconds, 24 words)*

---

### SHOT 3 — The Architecture Solution (0:15–0:32)
**Screen:** Show a pre-prepared architecture diagram highlighting the masking layer. Ideally a clean diagram showing:
```
[Database] → [Masking Service (Server)] → [Masked Context] → [AI/Gemini API]
                    ↓
            [UI gets role-based masked view]
```

**Say:**
> "We don't do prompt engineering tricks or UI redaction. Masking happens at the server layer. Customer names, IDs, phone numbers — all tokenized before the data touches the AI. The model reasons on patterns, not identities. De-masking only happens for authorized analysts."

*(~17 seconds, 42 words)*

---

### SHOT 4 — Live Demo Proof (0:32–0:47)
**Screen:** Show the Chat Panel. Type a question like "What's suspicious about this customer's transactions?" Show the AI responding with analysis that references masked identifiers (e.g., "Customer M_001" or "Account XXXX-4521") rather than raw names.

**Say:**
> "Watch — I ask the AI about suspicious patterns. It flags structuring behaviour, analyses transaction flows, but never sees a real name or Aadhaar number. Same investigation quality. Near-zero privacy risk."

*(~15 seconds, 30 words)*

---

### SHOT 5 — CTA & Close (0:47–0:57)
**Screen:** Pull back to show the full Investigation Page — the dark sidebar, the data-dense workbench, the chat panel.

**Say:**
> "DPDP compliance isn't a checkbox — it's an architecture decision. Building AML Sentinel in public. Follow along."

*(~10 seconds, 17 words)*

---

## TOTAL: ~57 seconds, ~138 words (comfortable pace with room for natural pauses)

---

## SCREEN PREPARATION CHECKLIST

Before recording, make sure these are ready:

| # | Screen | What to Prepare |
|---|--------|-----------------|
| 1 | Investigation Page — Customer Profile | Ensure masked fields are visible (implement masking display or mock the UI for the video) |
| 2 | Alert Queue Page | Have 5+ alerts visible with different risk levels and typologies |
| 3 | Architecture Diagram | Create a clean Mermaid or image showing: DB → Masking Service → AI API flow |
| 4 | Chat Panel | Pre-load a conversation where AI responses reference masked tokens, not raw PII |
| 5 | Full Investigation View | Have all 8 sidebar sections populated for the final wide shot |

---

## KEY DPDP ACT POINTS TO REFERENCE

If anyone asks in comments, here's your knowledge base:

1. **DPDP Act 2023 + Rules 2025** — India's data protection law, full compliance by May 2027
2. **Section on Security Safeguards** — Mandates "encryption, obfuscation, masking, or virtual tokens" for all personal data
3. **Penalties** — Up to INR 250 crore (~$30M) for non-compliance; INR 200 crore for breach notification failures
4. **Data Fiduciary obligations** — Banks/fintechs handling customer data MUST implement these safeguards
5. **Extra-territorial reach** — Applies to any entity processing Indian residents' data

---

## POST CAPTION (Draft)

```
Most AML platforms send raw customer data — names, Aadhaar numbers,
phone numbers — straight to AI models for analysis.

That's a DPDP Act violation waiting to happen.

We're building AML Sentinel differently:

→ PI masking at the SERVER layer, not the UI
→ AI receives tokenized data — it never sees real identities
→ Analysts get full context. The AI gets masked context.
→ De-masking only happens for authorized users, within the perimeter

India's Digital Personal Data Protection Act (2023) + Rules (2025)
mandate encryption and masking of personal data.

Penalties? Up to ₹250 crore.

Compliance deadline? May 2027.

The question isn't IF you need to mask PI in AI workflows.
It's whether your architecture was built for it — or you're bolting
it on later.

Building in public. Follow along.

#DPDP #DataPrivacy #AML #FinTech #AI #Compliance #BuildInPublic
#IndiaStartups #RegTech
```

---

## DEVIL'S ADVOCATE NOTES FOR YOU, ASHISH

Things to be honest about (and how to handle them):

1. **The masking layer isn't built yet.** If someone technical asks, you can say "implementing this now" — the video positions the architecture decision, which is legitimate. But don't claim it's live in production if it isn't.

2. **Tokenization vs. masking vs. encryption — know the difference.** Masking = replacing characters (Raj → R**). Tokenization = replacing with a reversible token (Raj → M_001). Encryption = mathematically transforming. For your use case with AI, tokenization is what you actually want (so the AI can maintain entity relationships across the conversation).

3. **"AI never sees real data" is a strong claim.** Make sure your implementation actually strips PII before the API call. If even one field leaks (e.g., counterparty names in transaction descriptions), the claim falls apart. Audit every field in the system prompt construction in `chat.py`.

4. **DPDP Act is not just about AI.** Your UI also displays PII. Your PDFs (SAR reports, case files) contain full PII. Your SQLite database is unencrypted. A complete DPDP compliance story covers all of these, not just the AI communication path.

5. **The 250 crore penalty is the maximum.** Don't overstate it — it's "up to" that amount, and the Data Protection Board determines actual penalties based on severity.

---

## CONTENT STRATEGY CONTEXT

**Why this video works for your 100K followers goal:**

- DPDP Act is a hot regulatory topic in India's tech/fintech space right now
- "Building in public" with a compliance angle is rare — most build-in-public content is features, not architecture
- The AI + privacy tension is a conversation starter — it invites debate
- Tagging #RegTech and #FinTech puts you in front of the right audience
- 60-second format is LinkedIn's sweet spot for algorithm reach

**Suggested posting time:** Tuesday–Thursday, 8:00–9:00 AM IST (peak LinkedIn engagement in India)
