# 🛡️ Threshold

> **Safe AI-Native Commerce & Revenue Growth Engine for Merchants**  
> Built for the Razorpay AI Buildathon 2026 — Track: *AI Growth & Agentic Commerce*

[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb.svg)](https://react.dev/)
[![Razorpay](https://img.shields.io/badge/Razorpay-Test%20Mode-02042B.svg)](https://razorpay.com/)
[![Groq](https://img.shields.io/badge/AI-Groq%20%2F%20Llama%203.3-orange.svg)](https://groq.com/)
[![Tests](https://img.shields.io/badge/Tests-77%2F77%20Passed-success.svg)](#-automated-testing--verification)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 🎯 Overview

As AI agents transition from product discovery to autonomous purchasing, merchants face two core challenges:

1. **Making the merchant sellable to AI**: Exposing machine-readable catalogs, verified inventory, merchant authorization, and programmatic checkout handshakes.
2. **Growing merchant revenue through AI**: Leveraging buyer intent to identify complementary cross-sells, bundling opportunities, and basket-size expansion within customer budget constraints.

Threshold solves the critical boundary problem of agentic commerce: **how to give AI purchasing capability without granting unconstrained authority over money.**

Every money-moving action in Threshold is **Explainable, Bounded, Gated, and Audited**.

---

## 🏛️ Core Capabilities

| 🤖 AI Buyer Commerce (Sell to AI) | 📈 Merchant Growth (Grow Revenue) |
|---|---|
| • Natural-language intent translation (Groq LLM) | • Contextual cross-sell recommendations |
| • Agent-readable catalog feeds (`/catalog/acp`) | • Basket-value optimization within budget headroom |
| • Discovery manifest (`/.well-known/agent-catalog.json`) | • Live intent-matching lift simulations (`/growth/simulate-lift`) |
| • Independent server-side policy engine | • One-click targeted AI campaign generation |
| • AP2-inspired HMAC-SHA256 signed mandates | • Strict Invariant: **Recommendation ≠ Authorization** |
| • Full payment lifecycle state machine | • Zero fabricated metrics (Real LLM benchmarks) |

---

## 🧠 Architecture & Commerce Flow

```
                      AI BUYER / USER INTENT
                                │
                                ▼
                   [ 1. Intent Resolution ]
                    Groq / Llama 3.3 Engine
                                │
                                ▼
                 [ 2. Catalog Validation ]
                 Authoritative SQLite Ledger
                                │
                 ┌──────────────┴──────────────┐
                 ▼                             ▼
        [ NO EXACT MATCH ]              [ EXACT MATCH ]
          Fail Closed                          │
       ₹0 Gateway Contact                      ▼
                                      [ 3. Policy Engine ]
                                     • Per-Txn Spend Cap
                                     • Session Spend Cap
                                     • Merchant Whitelist
                                     • Concurrency Mutex
                                               │
                                 ┌─────────────┴─────────────┐
                                 ▼                           ▼
                           [ BLOCKED ]                 [ APPROVED ]
                           Audit Only              Signed HMAC Mandate
                       ₹0 Gateway Contact                    │
                                                             ▼
                                                   [ 4. Razorpay Order ]
                                                   State: PAYMENT_PENDING
                                                             │
                                               ┌─────────────┴─────────────┐
                                               ▼                           ▼
                                      [ PAYMENT_FAILED ]              [ VERIFIED ]
                                       Signature/Amount           HMAC Verification
                                           Mismatch                        │
                                                                           ▼
                                                                        [ PAID ]
                                                                           │
                                                                           ▼
                                                                     [ COMPLETED ]
                                                                           │
                                                                           ▼
                                                                 [ Append-Only Audit ]
```

---

## 📈 Revenue Growth Engine: Recommendation ≠ Authorization

Threshold separates discovery intelligence from spending authority:

```
BUYER INTENT ──► CATALOG MATCH ──► CROSS-SELL OPPORTUNITY ──► BUDGET CHECK ──► EXPLICIT USER APPROVAL ──► PAYMENT
```

### Real-World Flow Example:
```text
PRIMARY PURCHASE:
Black Oversized Tee — ₹699

AI REVENUE OPPORTUNITY:
Cotton Crew Socks (3-Pack) — ₹199
"Pairs with oversized tee for a casual streetwear bundle."

FINANCIAL & POLICY BREAKDOWN:
• Potential Basket Total:  ₹898
• Incremental Opportunity: +₹199
• Policy Headroom:         ₹301 available under ₹1,000 transaction cap

STATUS:
RECOMMENDATION ONLY — USER AUTHORIZATION REQUIRED
(AI cannot silently charge the card; buyer must explicitly authorize the add-on)
```

> **Note on Growth Metrics**: Growth benchmark simulations are explicitly labeled as **POTENTIAL / SIMULATED / BENCHMARK** to maintain total financial transparency.

---

## 🛡️ Engineering & Safety Invariants

1. **Gated Gateway Contact**: ONLY `policy decision === APPROVED` can initiate an order via Razorpay. Any blocked, rejected, or non-matching intent results in **₹0 money movement** (`razorpay_contacted: false`).
2. **Fail-Closed Design**: Upstream timeouts, rate limits, invalid JSON, or parse errors fail closed. The system never guesses or makes unvetted purchases.
3. **Exact Catalog Matching**: The agent maps intent to deterministic SQLite IDs. If no matching SKU exists, it emits `NO_EXACT_MATCH` without autonomous substitution.
4. **Independent Policy Enforcement**: Spending limits (default ₹1,000 txn / ₹1,500 session), emergency policy lockout, and merchant whitelists run strictly in backend code.
5. **Deterministic Idempotency**: Duplicate requests using `run_id` or `Idempotency-Key` headers are intercepted, returning existing orders without duplicate gateway charges.
6. **Concurrency Safety**: `AsyncMutex` locks serialize concurrent requests, preventing session-limit race conditions.
7. **Strict Payment State Machine**: Enforces valid transitions (`CREATED` $\to$ `PAYMENT_PENDING` $\to$ `PAID` $\to$ `COMPLETED` / `REFUNDED`).
8. **Zero Secret Leakage**: API secrets, private keys, and signing tokens are isolated in environment variables and never logged or exposed in health endpoints.

---

## 🌐 Protocol Interoperability

Threshold is designed to interface cleanly with emerging agentic standards without making uncertified compliance claims:

- **AP2-Inspired Mandate Signing**: In [`backend/src/policy.ts`](backend/src/policy.ts), approved transactions generate an HMAC-SHA256 signature (`mandate_signature`) over `{item_id, price, approved, transaction_limit, session_limit, timestamp}`, creating a tamper-evident authorization proof before gateway settlement.
- **ACP-Compatible Catalog Shape**: Exposes `GET /catalog/acp` and `GET /.well-known/agent-catalog.json` following ACP product feed conventions (`id`, `title`, `description`, `price { amount, currency }`, `availability`, `merchant`, `tags`, `images`) for clean AI scraper ingestion.
- **x402-Style Payment Handshake**: Implements `POST /agent/act/x402`, returning an HTTP `402 Payment Required` payload containing payment parameters prior to fiat execution.

---

## 🧑‍⚖️ Interactive Judge Demo Scenarios

| # | Demo Scenario | Input / Trigger | Expected Result | Safety Verification |
|---|---|---|---|---|
| **1** | **AI Buyer Success** | *"Buy a black oversized tee"* | Exact item matched (₹699) $\to$ Policy APPROVED $\to$ Razorpay order created | State `PAYMENT_PENDING`, signed mandate generated, verifies to `COMPLETED`. |
| **2** | **Spend Cap Block** | *"Buy noise cancelling headphones"* (₹4,999) | Exceeds ₹1,000 limit $\to$ Policy REJECTED | **₹0 money movement**, Razorpay NOT contacted (`razorpay_contacted: false`). |
| **3** | **Replay Protection** | Re-send request with identical `run_id` / `Idempotency-Key` | Idempotency layer intercepts replay | Reuses existing order record; zero duplicate charges. |
| **4** | **Payment Verification Failure** | Tampered signature or amount mismatch | Gateway rejects verification (HTTP 400) | Order transitions to `PAYMENT_FAILED`; cannot reach `COMPLETED`. |
| **5** | **Merchant Revenue Growth** | Purchase Black Oversized Tee (₹699) | AI recommends Cotton Crew Socks (+₹199) | Shows potential basket (₹898) and headroom (₹301); requires explicit click to purchase. |

---

## 🧪 Automated Testing & Verification

Threshold comes with **77 automated regression and integration tests** verifying all safety constraints, payment lifecycles, and observability endpoints:

```bash
# Phase 7: Safety Regression Suite (12/12 PASS)
node backend/test_phase7_regression.mjs

# Phase 8: Payment State Machine & Observability Suite (24/24 PASS)
node backend/test_phase8.mjs

# Phase 9: Production Integration & Reconciliation Suite (41/41 PASS)
node backend/test_phase9.mjs
```

### Test Suite Highlights:
- **Phase 7 (12 tests)**: Under-limit approvals, over-limit blocks, authorized/unauthorized merchant checks, `NO_EXACT_MATCH` gating, policy locking, cross-sell recommendation format, replay attack deduplication, mutex concurrency serialization, system error fail-closed, judge safety demo API, and append-only audit schema.
- **Phase 8 (24 tests)**: Payment state machine initialization (`PAYMENT_PENDING`), terminal state immutability, amount mismatch protection, currency mismatch protection, webhook deduplication, gateway failure handling, `Idempotency-Key` header support, `X-Request-ID` correlation, health checks, order audit events, and zero credential leakage.
- **Phase 9 (41 tests)**: Production Razorpay adapter modes, HMAC verification, webhook ingestion (`payment.captured`, `payment.failed`, `refund.processed`), payment ledger reconciliation, refund lifecycle, security headers, metrics counters, and policy fail-closed gating.

---

## 🚀 Quick Start

### Prerequisites
- Node.js $\ge 18.0.0$
- npm $\ge 9.0.0$

### 1. Clone & Setup
```bash
git clone https://github.com/alifosaur/Threshold.git
cd Threshold
```

### 2. Configure Environment
```bash
cp .env.example .env
cp backend/.env.example backend/.env
```

Edit `backend/.env`:
```env
PORT=5000
NODE_ENV=development
GROQ_API_KEY=your_groq_api_key_here
RAZORPAY_MODE=test
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret_here
AGENT_API_TOKEN=th_agent_sec_dev_token_2026
POLICY_SIGNING_SECRET=th_ap2_mandate_sec_2026
```

### 3. Build & Run Backend
```bash
cd backend
npm install
npm run build
npm run dev
```
*Server runs at `http://localhost:5000`.*

### 4. Build & Run Frontend
```bash
cd ../frontend
npm install
npm run build
npm run dev
```
*UI runs at `http://localhost:3000`.*

---

## 📡 API Reference

### Agent & Commerce APIs
- `POST /agent/act`: Execute natural-language purchasing goal with policy gating and order creation.
- `POST /agent/act/x402`: Execute goal and emit HTTP 402 payment-required handshake.
- `GET /catalog/acp`: OpenAI/Shopify ACP-formatted product feed.
- `GET /.well-known/agent-catalog.json`: Machine-readable agent discovery manifest.
- `GET /catalog`: Authoritative 20-SKU merchant catalog.
- `GET /audit`: Query append-only audit ledger with correlation IDs.

### Policy & Governance APIs
- `GET /policy`: Retrieve active spend limits, session spend, and policy lock state.
- `POST /policy`: Update spending limits and policy lock configuration.

### Payment & Order APIs
- `POST /payments/verify`: Verify HMAC SHA-256 signature and transition `PAYMENT_PENDING` $\to$ `PAID` $\to$ `COMPLETED`.
- `POST /payments/webhook`: Webhook ingestion with signature validation and event deduplication.
- `POST /payments/refund`: Refund settled payment via gateway and transition order to `REFUNDED`.
- `GET /payments/reconciliation`: Retrieve payment ledger summary, volume by state, and mismatch diagnostics.
- `POST /payments/reconcile/:order_id`: Reconcile specific order with gateway records.
- `GET /orders`: List recorded orders with lifecycle states.
- `GET /orders/:order_id`: Fetch detailed order record.

### Revenue Intelligence APIs
- `POST /growth/simulate-lift`: Live LLM intent-matching benchmark measuring baseline AOV vs. cross-sell bundle AOV.
- `POST /growth/campaign`: Generate targeted merchant growth campaigns with AI buyer queries.
- `POST /growth/simulate-buyer`: Simulate single AI buyer query matching against catalog.
- `GET /growth/metrics`: Retrieve merchant revenue intelligence metrics.

### Observability & Diagnostics APIs
- `GET /health`: Basic liveness check.
- `GET /health/detailed`: Database health, gateway mode, policy engine status, and operational metrics.
- `GET /metrics`: Operational metrics counters.
- `POST /demo/safety`: One-click 3-scenario judge safety verification runner.

---

## 🧰 Tech Stack

- **Backend**: Node.js, TypeScript, Express, SQLite (`sqlite3` / `sqlite`), `async-mutex`, crypto HMAC-SHA256.
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons.
- **AI Intent Engine**: Groq API (Llama 3.3 70B Versatile).
- **Payment Gateway**: Razorpay Test-Mode Gateway Adapter & Webhook Ingestion.

---

## 📄 License

MIT License. Built for the Razorpay Agentic Commerce Hackathon 2026.

