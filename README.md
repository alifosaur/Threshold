# THRESHOLD

### Safe AI-Native Commerce & Revenue Growth for Merchants

> **Make merchants sellable to AI buyers while helping them grow revenue — with every money action explainable, bounded, and gated.**

**Razorpay AI Buildathon 2026 — Track: AI Growth & Agentic Commerce**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb.svg)](https://react.dev/)
[![Razorpay](https://img.shields.io/badge/Razorpay-Test%20Mode-02042B.svg)](https://razorpay.com/)
[![Groq](https://img.shields.io/badge/AI-Groq%20%2F%20Llama%203.3-orange.svg)](https://groq.com/)
[![Tests](https://img.shields.io/badge/Tests-77%2F77%20Passed-success.svg)](#9-verification)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

| | |
|:---|:---|
| **Problem** | AI commerce needs reliable catalog grounding, bounded authority, safe payment execution, and merchant growth intelligence. |
| **Solution** | Threshold connects buyer intent, authoritative catalog matching, policy enforcement, payment execution, auditability, and budget-aware recommendations. |
| **Core Rule** | **Recommendation ≠ Authorization**. AI may recommend an opportunity; it cannot silently turn that opportunity into a purchase. |

---

## 1. The Product

Threshold is a full-stack AI-native commerce engine with two connected goals: **make merchants sellable to AI buyers** and **help merchants grow revenue**. 

Natural-language intent is resolved by Groq, grounded against an authoritative SQLite catalog, evaluated by an independent server-side policy engine, and only then allowed to reach the Razorpay payment layer. Cross-sell recommendations remain strictly separate from authorization and require explicit user intent.

---

## 2. Core Commerce Flow

```text
AI Buyer / User
      │
      ▼
Intent Resolution (Groq)
      │
      ▼
Authoritative Catalog (SQLite)
      │
  ┌───┴───┐
  │       │
NO MATCH  EXACT MATCH
  │       │
  ▼       ▼
FAIL    Policy Engine
CLOSED  (Spend Caps & Whitelist)
(₹0)      │
      ┌───┴───┐
      │       │
    REJECT  APPROVE
      │       │
      ▼       ▼
    FAIL    Signed HMAC Mandate
    CLOSED    │
              ▼
            Razorpay Order (PAYMENT_PENDING)
              │
              ▼
            HMAC Verification + Webhook
              │
              ▼
            PAID ──► COMPLETED
              │
              ▼
            Append-Only Audit Trail
```

---

## 3. Merchant Growth Loop

```text
Buyer Intent
     │
     ▼
Primary Product + Price
     │
     ▼
AI Cross-Sell / Upsell Recommendation
     │
     ▼
Potential Basket + Incremental Opportunity
     │
     ▼
Policy / Budget Headroom Check
     │
     ▼
EXPLICIT USER AUTHORIZATION
     │
     ├── Decline ────► Primary item only
     │
     └── Authorize ──► Re-check Policy ──► Razorpay Payment
```

### Real-World Example:
- **Primary Item**: Black Oversized Tee (₹699)
- **AI Recommendation**: Cotton Crew Socks (₹199)
- **Potential Basket**: ₹898
- **Potential Incremental Revenue**: +₹199
- **Policy Headroom**: ₹301 available under ₹1,000 transaction cap

> *These are potential/simulated values derived from live LLM intent-matching benchmarks, not guaranteed revenue.*

---

## 4. What Makes It Different

| Capability | Implementation |
|:---|:---|
| **AI Buyer Commerce** | Natural-language purchase intent resolved by Groq and grounded to exact catalog products. |
| **Agent-Readable Catalog** | Machine-readable catalog endpoint (`/catalog/acp`) and discovery manifest (`/.well-known/agent-catalog.json`) for AI buyer ingestion. |
| **Merchant Growth** | Contextual cross-sell / upsell opportunities constrained by budget and policy headroom. |
| **Payment Safety** | Independent policy gate, signed mandate, deterministic payment lifecycle, verification, webhooks, and refunds. |
| **Auditability** | Append-only audit events with request correlation (`X-Request-ID`) and payment lifecycle visibility. |

---

## 5. Safety Architecture

| Protection | Behavior |
|:---|:---|
| **Gated Money Movement** | Only `APPROVED` policy decisions may initiate gateway orders. |
| **Fail Closed** | AI, parsing, policy, or upstream failures cannot authorize money movement (₹0 contacted). |
| **Exact-Match Grounding** | `NO_EXACT_MATCH` blocks autonomous substitution when an item is missing. |
| **Spend Controls** | Per-transaction (₹1,000) and cumulative session (₹1,500) limits enforced server-side. |
| **Idempotency** | `run_id` / `Idempotency-Key` prevents duplicate orders and double-charges. |
| **Concurrency** | `AsyncMutex` serialization prevents concurrent overspending and race conditions. |
| **Payment Verification** | Cryptographic HMAC-SHA256 signature, amount, and currency checks protect completion. |
| **Authorization Boundary** | AI recommendations never self-authorize additional purchases. |
| **Secret Protection** | Signing secrets and gateway credentials are never returned by health or diagnostics. |

---

## 6. Architecture Layers

| Layer | Responsibility | Technology |
|:---|:---|:---|
| **Intent** | Resolve natural language buyer goals | Groq / Llama-based AI |
| **Catalog** | Authoritative product grounding & stock | SQLite |
| **Policy** | Budget, merchant whitelist, and authorization checks | TypeScript + AsyncMutex |
| **Payment** | Orders, verification, webhooks, refunds | Razorpay Adapter |
| **Audit** | Trace decisions and payment lifecycle events | SQLite Audit Ledger |
| **Frontend** | Commerce storefront, growth analytics, diagnostics | React + Vite + Tailwind |

---

## 7. Protocol Positioning

Threshold's core product is **safe, bounded, AI-native commerce**. Protocol compatibility is an interoperability advantage, not a certification claim.

| Protocol | Alignment |
|:---|:---|
| **AP2-inspired** | HMAC-SHA256 signed mandate concept for bounded authorization. |
| **ACP-compatible catalog shape** | Machine-readable product feed (`/catalog/acp`) and discovery manifest. |
| **x402-style handshake** | Payment-required response flow exposed through `POST /agent/act/x402`. |

> *No official AP2, ACP, or x402 certification is claimed.*

---

## 8. Payment Lifecycle

```text
CREATED
   │
   ▼
PAYMENT_PENDING ──► PAYMENT_FAILED
   │
   ▼
PAID
   │
   ▼
COMPLETED
   │
   ▼
REFUNDED
```

---

## 9. Verification

| Test Suite | Result | Coverage |
|:---|:---:|:---|
| **Phase 7** | **12 / 12 ✓** | Safety regression (Limits, Whitelists, Fail-closed, Mutex, Demo) |
| **Phase 8** | **24 / 24 ✓** | State machine, observability, payment verification, idempotency |
| **Phase 9** | **41 / 41 ✓** | Razorpay integration, reconciliation, refunds, security headers |
| **TOTAL** | **77 / 77 ✓** | **100% Automated Tests Passed** |

Verified areas include blocked transactions with zero Razorpay contact, `NO_EXACT_MATCH`, duplicate protection, concurrent-spend protection, invalid payment verification, amount/currency mismatch rejection, payment failures, audit integrity, request-ID propagation, and secret non-disclosure.

---

## 10. Key API Surface

| Endpoint | Purpose |
|:---|:---|
| `POST /agent/act` | Natural-language purchase intent with policy gating. |
| `POST /agent/act/x402` | Payment-required handshake flow. |
| `GET /catalog/acp` | Machine-readable catalog feed (ACP format). |
| `GET /.well-known/agent-catalog.json` | Agent discovery manifest. |
| `GET /policy` / `POST /policy` | Inspect and configure policy limits and lockout. |
| `POST /growth/simulate-lift` | Intent-matching growth benchmark. |
| `POST /growth/campaign` | Targeted AI buyer campaign generation. |
| `POST /payments/verify` | Payment signature and state verification. |
| `POST /payments/webhook` | Webhook ingestion and deduplication. |
| `POST /payments/refund` | Refund lifecycle execution. |
| `GET /payments/reconciliation` | Payment ledger reconciliation report. |
| `POST /demo/safety` | Judge-facing 3-scenario safety verification. |

---

## 11. Quick Start

**Prerequisites**: Node.js $\ge 18$ and npm $\ge 9$. Configure local environment variables. Never commit real credentials or signing secrets.

```bash
git clone https://github.com/alifosaur/Threshold.git
cd Threshold

cp .env.example .env
cp backend/.env.example backend/.env

# Backend
cd backend
npm ci
npm run build
npm run dev

# Frontend — new terminal
cd frontend
npm ci
npm run build
npm run dev
```

*Use `npm ci` with the committed lockfiles for a clean, reproducible install; do not copy `node_modules` between platforms.*

---

## 12. Environment Configuration

| Variable | Purpose |
|:---|:---|
| `GROQ_API_KEY` | Live AI intent and growth calls. |
| `RAZORPAY_MODE` | Gateway mode; use `test` mode for the demo. |
| `RAZORPAY_KEY_ID` / `SECRET` | Razorpay credentials; keep private. |
| `RAZORPAY_WEBHOOK_SECRET` | Webhook verification; keep private. |
| `AGENT_API_TOKEN` | Agent API authentication. |
| `POLICY_SIGNING_SECRET` | Required HMAC signing secret; no hardcoded production fallback. |

---

## 13. Honest Scope & Limitations

| Area | Honest Description |
|:---|:---|
| **Growth metrics** | Potential / simulated benchmarks from intent-matching experiments; not guaranteed merchant revenue. |
| **Protocols** | AP2-inspired, ACP-compatible, and x402-style interfaces; no third-party certification claimed. |
| **Gateway** | Razorpay integration is demonstrated through the configured gateway mode; test mode is appropriate for the hackathon demo. |
| **Production readiness** | 77/77 tests passing is strong evidence, but does not by itself mean the system is enterprise-deployed. |

---

## 14. Tech Stack

| Area | Technologies |
|:---|:---|
| **Frontend** | React 18 + Vite + Tailwind CSS |
| **Backend** | TypeScript + Node.js + Express |
| **AI** | Groq / Llama-based inference |
| **Database** | SQLite (`sqlite3` / `sqlite`) |
| **Payments** | Razorpay adapter |
| **Security** | HMAC-SHA256, policy gating, idempotency, concurrency serialization |

---

## 15. Repository & License

- **GitHub**: [https://github.com/alifosaur/Threshold](https://github.com/alifosaur/Threshold)
- **License**: MIT
- **Built for**: Razorpay AI Buildathon 2026 — AI Growth & Agentic Commerce

> *When AI gets access to money, autonomy needs a boundary.*


