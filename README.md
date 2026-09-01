# 🛡️ THRESHOLD

### Safe AI-Native Commerce & Revenue Growth for Merchants

> **Make merchants sellable to AI buyers — while helping them grow revenue — with every money action explainable, bounded, and gated.**

**Built for the Razorpay AI Buildathon 2026 — Track: AI Growth & Agentic Commerce**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb.svg)](https://react.dev/)
[![Razorpay](https://img.shields.io/badge/Razorpay-Test%20Mode-02042B.svg)](https://razorpay.com/)
[![Groq](https://img.shields.io/badge/AI-Groq%20%2F%20Llama%203.3-orange.svg)](https://groq.com/)
[![Tests](https://img.shields.io/badge/Tests-77%2F77%20Passed-success.svg)](#-proof--automated-verification)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 🎯 What is Threshold?

AI buyers are shifting from **discovering products** to **executing purchases**. Threshold gives merchants the infrastructure to sell autonomously to AI agents while unlocking incremental revenue through intent-aware recommendations — without giving AI unconstrained authority over money.

```mermaid
flowchart TD
    User["👤 AI Buyer / User"] --> Intent["🧠 Groq LLM Engine<br/><i>Intent Resolution</i>"]
    Intent --> Catalog{"📦 Authoritative Catalog<br/><i>Exact Match? (SQLite)</i>"}
    
    Catalog -->|No Match| Block["⛔ Block Request<br/><b>₹0 Movement • Zero Gateway Contact</b>"]
    Catalog -->|Exact Match| Policy{"🛡️ Policy Engine<br/><i>Limits • Spend Caps • Whitelist</i>"}
    
    Policy -->|Rejected / Over Limit| Block
    Policy -->|Approved| Razorpay["💳 Razorpay Gateway<br/><i>Order: PAYMENT_PENDING</i>"]
    
    Razorpay --> Verify["🔐 HMAC-SHA256 Verification"]
    Verify --> Complete["✅ Order Settled<br/><b>COMPLETED • Audited</b>"]

    style Block fill:#FEE2E2,stroke:#DC2626,stroke-width:2px;
    style Complete fill:#D1FAE5,stroke:#059669,stroke-width:2px;
    style Policy fill:#FEF3C7,stroke:#D97706,stroke-width:2px;
```

---

## 💰 The Growth Loop: Recommendation ≠ Authorization

Threshold separates discovery intelligence from spending authority:

```mermaid
flowchart TD
    Intent["🎯 1. Buyer Intent<br/><i>'Buy an oversized tee'</i>"] --> Match["🛍️ 2. Primary Product<br/><b>Black Oversized Tee (₹699)</b>"]
    Match --> CrossSell["✨ 3. AI Cross-Sell Opportunity<br/><b>Cotton Crew Socks (+₹199)</b>"]
    CrossSell --> Headroom["📊 4. Budget Headroom Check<br/><i>₹301 headroom under ₹1,000 limit</i>"]
    Headroom --> Prompt["🔒 5. Explicit Authorization Gate<br/><b>Recommendation ≠ Authorization</b>"]
    
    Prompt -->|User Clicks '+ Add'| AuthApproved["✅ Explicit Intent Authorized"]
    Prompt -->|User Declines| SingleOrder["💳 Proceed With Primary Item Only (₹699)"]
    
    AuthApproved --> GatedPay["💳 Gated Payment (₹898 Total Basket)"]

    style Prompt fill:#FEF3C7,stroke:#D97706,stroke-width:2px;
    style GatedPay fill:#D1FAE5,stroke:#059669,stroke-width:2px;
```

### Real-World Example:
```text
Primary Purchase:       Black Oversized Tee (₹699)
AI Revenue Opportunity: Cotton Crew Socks (₹199)
────────────────────────────────────────────────────
Potential Basket:       ₹898
Incremental Revenue:    +₹199
Policy Headroom:        ₹301 available under ₹1,000 cap

STATUS: RECOMMENDATION ONLY — USER AUTHORIZATION REQUIRED
```
> 🔒 **Core Rule**: An AI recommendation can never silently become a purchase.

---

## 🧠 Why Threshold?

| 🤖 AI Buyer Commerce | 📈 Merchant Growth |
|---|---|
| • **Natural-Language Purchasing**: Zero-shot Groq Llama 3.3 intent parsing | • **Contextual Cross-Sell & Upsell**: Budget-aware add-ons |
| • **Agent-Readable Feed**: Structured `/catalog/acp` product endpoint | • **Basket-Value Optimization**: Incremental GMV analysis |
| • **Discovery Manifest**: Machine-readable `/.well-known/agent-catalog.json` | • **Budget Headroom Analysis**: Stays within consumer caps |
| • **Independent Policy Gate**: Server-side spending & whitelist controls | • **AI Growth Campaigns**: One-click targeted buyer queries |
| • **Signed HMAC Mandates**: Cryptographic AP2-inspired authorization proofs | • **Live Lift Benchmark**: Real LLM intent-matching experiments |
| • **Razorpay State Machine**: Deterministic `PENDING` $\to$ `COMPLETED` lifecycle | • **Recommendation ≠ Authorization**: Gated user consent |

---

## 🏗️ Architecture

```mermaid
flowchart TD
    A["👤 AI Buyer / User"] --> B["⚡ Request Correlation (X-Request-ID)"]
    B --> C["🧠 Groq LLM Engine (Intent Resolution)"]
    C --> D{"📦 Authoritative SQLite Catalog"}

    D -->|NO EXACT MATCH| X["⛔ FAIL CLOSED: ₹0 Gateway Contact"]
    D -->|EXACT MATCH| E{"🛡️ Policy Engine & Mutex"}

    E -->|REJECTED / OVER LIMIT| X
    E -->|APPROVED| F["🔏 Signed HMAC-SHA256 Mandate"]

    F --> G["💳 Razorpay Adapter (Test/Live)"]
    G --> H["⏳ Order State: PAYMENT_PENDING"]
    H --> I["🔐 HMAC Payment Signature Verification"]
    I --> J["✅ Order State: COMPLETED"]

    J --> K["📜 Append-Only Cryptographic Audit Ledger"]

    style X fill:#FEE2E2,stroke:#DC2626,stroke-width:2px;
    style F fill:#EFF6FF,stroke:#3B82F6,stroke-width:2px;
    style J fill:#D1FAE5,stroke:#059669,stroke-width:2px;
    style K fill:#F3F4F6,stroke:#6B7280,stroke-width:2px;
```

> **Every money action passes through catalog validation, server-side policy enforcement, and cryptographic payment verification before completion.**

---

## 🛡️ Safety & Governance

| Protection | What Threshold Does |
|---|---|
| **Spend Limits** | Enforces per-transaction (₹1,000) and cumulative session (₹1,500) caps |
| **Fail Closed** | Upstream AI failures, timeouts, or parse errors result in ₹0 money movement |
| **No Exact Match** | Missing SKUs trigger `NO_EXACT_MATCH`; zero autonomous product substitutions |
| **Idempotency** | Duplicate requests via `run_id` or `Idempotency-Key` reuse existing orders |
| **Concurrency Mutex** | `AsyncMutex` serializes concurrent spend evaluation, eliminating race conditions |
| **Payment Verification** | Cryptographic HMAC-SHA256 signature, amount, and currency validation |
| **Authorization Boundary** | Cross-sells require explicit user intent; AI cannot self-authorize charges |
| **Audit Ledger** | Append-only SQLite ledger records intent, policy reasons, mandates, and payments |

```mermaid
flowchart TD
    AI["🤖 AI Intent Parsing"] --> Rec["✨ AI Cross-Sell Recommendation"]
    Rec --> Barrier{"❌ RECOMMENDATION ≠ PAYMENT<br/><i>Zero Autonomous Money Movement</i>"}
    
    Barrier -->|Requires User Intent| Auth["👤 Explicit User Authorization<br/><b>Click 'Authorize & Buy'</b>"]
    Auth --> PolicyCheck["🛡️ Server-Side Policy Engine<br/><i>Per-Txn & Session Spend Caps</i>"]
    PolicyCheck --> Gate["💳 Razorpay Gateway Settlement"]

    style Barrier fill:#FEE2E2,stroke:#DC2626,stroke-width:2px;
    style Auth fill:#FEF3C7,stroke:#D97706,stroke-width:2px;
    style Gate fill:#D1FAE5,stroke:#059669,stroke-width:2px;
```

---

## 🌐 Protocol Interoperability

```mermaid
flowchart LR
    subgraph AP2["AP2-Inspired"]
        A["🔏 Signed Mandates<br/><i>HMAC-SHA256 over Canonical Tuple</i>"]
    end
    subgraph ACP["ACP-Compatible"]
        B["📋 Machine-Readable Feed<br/><i>GET /catalog/acp & Manifest</i>"]
    end
    subgraph X402["x402-Style"]
        C["🤝 Payment Handshake<br/><i>POST /agent/act/x402 -> HTTP 402</i>"]
    end

    style AP2 fill:#EFF6FF,stroke:#3B82F6,stroke-width:1px;
    style ACP fill:#F0FDF4,stroke:#16A34A,stroke-width:1px;
    style X402 fill:#FAF5FF,stroke:#9333EA,stroke-width:1px;
```

> **Note**: Threshold uses protocol-aligned interfaces for interoperability. It does **not** claim official AP2, ACP, or x402 third-party certification.

---

## 💳 Payment Lifecycle State Machine

```mermaid
stateDiagram-v2
    [*] --> CREATED
    CREATED --> PAYMENT_PENDING : Razorpay Order Created
    PAYMENT_PENDING --> PAID : HMAC Signature Verified
    PAYMENT_PENDING --> PAYMENT_FAILED : Verification Error / Timeout
    PAID --> COMPLETED : Order Settled & Audited
    COMPLETED --> REFUNDED : Gateway Refund Processed
    PAYMENT_FAILED --> [*]
    REFUNDED --> [*]
```

---

## 🧪 Proof & Automated Verification

```text
┌────────────────────────────────────────────────────────┐
│             AUTOMATED TEST SUITE VERIFICATION          │
├────────────────────────────────────────────────────────┤
│                                                        │
│       Phase 7: Safety Regression Suite      12 / 12 ✓  │
│       Phase 8: State Machine & Observability 24 / 24 ✓ │
│       Phase 9: Production Integration       41 / 41 ✓  │
│       ───────────────────────────────────────────────   │
│       TOTAL VERIFIED TESTS                  77 / 77 ✓  │
│                                                        │
└────────────────────────────────────────────────────────┘
```

> **Verified Invariants**: Policy spend blocks contact ₹0 gateway · `NO_EXACT_MATCH` fails closed · Replay attacks deduplicated · Mutex prevents race-condition overspends · Tampered payments rejected · Webhook idempotency · Append-only audit integrity.

---

## 🚀 Quick Start

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

### 3. Run Backend
```bash
cd backend
npm install
npm run build
npm run dev
```
*Backend runs at `http://localhost:5000`.*

### 4. Run Frontend
```bash
cd ../frontend
npm install
npm run build
npm run dev
```
*Frontend runs at `http://localhost:3000`.*

### 5. Run Test Suites
```bash
node backend/test_phase7_regression.mjs
node backend/test_phase8.mjs
node backend/test_phase9.mjs
```

---

## 🔌 Key APIs

```text
AI COMMERCE & DISCOVERY
POST /agent/act                     # Execute purchasing intent with policy gating
POST /agent/act/x402                # Execute x402 payment-required handshake
GET  /catalog/acp                   # ACP-formatted product feed
GET  /.well-known/agent-catalog.json# Machine-readable discovery manifest

POLICY & GOVERNANCE
GET  /policy                        # Inspect spend limits & session spend
POST /policy                        # Update limits & emergency policy lock

GROWTH INTELLIGENCE
POST /growth/simulate-lift          # Run live intent-matching benchmark
POST /growth/campaign               # Generate targeted AI buyer campaigns

PAYMENT LIFECYCLE
POST /payments/verify               # Verify HMAC signature & transition to COMPLETED
POST /payments/webhook              # Ingest & deduplicate gateway webhooks
POST /payments/refund               # Execute refund & transition to REFUNDED
GET  /payments/reconciliation       # Payment ledger reconciliation report

DIAGNOSTICS & DEMO
GET  /health/detailed               # System components & metrics
POST /demo/safety                   # 1-click 3-scenario judge safety runner
```

---

## ⚠️ Honest Scope & Limitations

- **Gateway Mode**: Demonstrated in Razorpay Test Mode with deterministic offline fallback simulator when keys are omitted.
- **Growth Metrics**: Lift numbers are calculated via live Groq intent-matching against real catalog SKUs and labeled as **Simulated Benchmarks**, not guaranteed revenue.
- **Protocol Framing**: AP2, ACP, and x402 references denote schema-aligned compatibility layers, not formal third-party accreditations.

---

## 👨‍💻 Built For

### Razorpay AI Buildathon 2026
**Track: AI Growth & Agentic Commerce**

> *"Threshold — because when AI gets access to money, autonomy needs a boundary."*

---

## 📄 License

MIT License. Built for the Razorpay AI Buildathon 2026.


