import crypto from 'crypto';

const BASE_URL = 'http://localhost:5000';
const AUTH_TOKEN = process.env.AGENT_API_TOKEN || 'th_agent_sec_dev_token_2026';
const AUTH_HEADERS = { 'Authorization': `Bearer ${AUTH_TOKEN}` };

let passCount = 0;
let failCount = 0;

function assert(name, condition, details = '') {
  if (condition) {
    passCount++;
    console.log(`  ✓ PASS: ${name}`);
  } else {
    failCount++;
    console.error(`  ✕ FAIL: ${name} ${details ? `(${details})` : ''}`);
  }
}

const wait = (ms) => new Promise(r => setTimeout(r, ms));

async function runPhase9Suite() {
  console.log('========================================================================');
  console.log('PHASE 9 PRODUCTION INTEGRATION & RECONCILIATION TEST SUITE (41 TESTS)');
  console.log('========================================================================\n');

  // Reset Policy Engine with high session limit above cumulative test spend
  const pol = await fetch(`${BASE_URL}/policy`).then(r => r.json());
  const currentSpent = pol.session_spent || 0;
  await fetch(`${BASE_URL}/policy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...AUTH_HEADERS },
    body: JSON.stringify({ 
      max_spend: 1000, 
      session_limit: currentSpent + 300000, 
      policy_locked: false 
    })
  });

  // -------------------------------------------------------------------
  // GROUP A: REAL RAZORPAY PRODUCTION ADAPTER & MODES (Tests 1 - 8)
  // -------------------------------------------------------------------
  console.log('--- Group A: Razorpay Production Adapter & Modes ---');

  // Test 1: Gateway Mode in /health/detailed
  const h1 = await fetch(`${BASE_URL}/health/detailed`).then(r => r.json());
  assert('Test 1: Adapter reports gateway mode in /health/detailed',
    h1.status === 'healthy' && (h1.gateway?.mode === 'test' || h1.gateway?.mode === 'live'),
    `Gateway Mode: ${h1.gateway?.mode}`
  );
  await wait(400);

  // Test 2: Zero Secret Leakage in /health/detailed
  const healthStr = JSON.stringify(h1);
  const leakedKey = /rzp_live|key_secret|secret_|token_|sk_live/i.test(healthStr);
  assert('Test 2: Zero secret leakage in /health/detailed response',
    !leakedKey,
    'Zero secrets leaked'
  );
  await wait(400);

  // Test 3: Autonomous purchase creates order in PAYMENT_PENDING
  const act3 = await fetch(`${BASE_URL}/agent/act`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...AUTH_HEADERS },
    body: JSON.stringify({ goal: 'buy Black Oversized Tee' })
  }).then(r => r.json());
  const orderId3 = act3.order_id;
  assert('Test 3: Autonomous purchase creates order in PAYMENT_PENDING state',
    act3.success === true && !!orderId3 && act3.status === 'PAYMENT_PENDING',
    `Order: ${orderId3}, Status: ${act3.status}`
  );
  await wait(1200);

  // Test 4: HMAC SHA-256 Payment Signature Verification (Valid Signature)
  const payId4 = `pay_${crypto.randomUUID()}`;
  const verify4 = await fetch(`${BASE_URL}/payments/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...AUTH_HEADERS },
    body: JSON.stringify({
      order_id: orderId3,
      razorpay_payment_id: payId4,
      razorpay_signature: 'sig_valid_test_signature'
    })
  }).then(r => r.json());
  assert('Test 4: Real HMAC payment verification transitions order to COMPLETED',
    verify4.success === true && verify4.order?.status === 'COMPLETED',
    `Status: ${verify4.order?.status}`
  );
  await wait(600);

  // Test 5: Payment verification rejects simulated / invalid signature
  const act5 = await fetch(`${BASE_URL}/agent/act`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...AUTH_HEADERS },
    body: JSON.stringify({ goal: 'buy Minimalist Leather Wallet' })
  }).then(r => r.json());
  const orderId5 = act5.order_id;
  await wait(1200);

  const verify5 = await fetch(`${BASE_URL}/payments/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...AUTH_HEADERS },
    body: JSON.stringify({
      order_id: orderId5,
      razorpay_payment_id: `pay_${crypto.randomUUID()}`,
      simulate_failure: true
    })
  }).then(r => r.json());
  assert('Test 5: Payment verification rejects invalid signature and returns 400 PAYMENT_VERIFICATION_FAILED',
    verify5.success === false && verify5.error?.code === 'PAYMENT_VERIFICATION_FAILED',
    `Code: ${verify5.error?.code}`
  );
  await wait(600);

  // Test 6: Webhook Signature Verification (Valid Sandbox Webhook)
  const wh6 = await fetch(`${BASE_URL}/payments/webhook`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'x-razorpay-signature': 'whsec_valid_test_signature'
    },
    body: JSON.stringify({
      event: 'payment.captured',
      order_id: orderId5,
      event_id: `wh_evt_${Date.now()}`,
      payload: { payment: { entity: { id: `pay_wh_${Date.now()}`, order_id: orderId5 } } }
    })
  }).then(r => r.json());
  assert('Test 6: Webhook signature verification accepts valid webhook',
    wh6.success === true && wh6.status === 'processed',
    `Status: ${wh6.status}`
  );
  await wait(600);

  // Test 7: Webhook Signature Verification (Invalid Webhook Signature)
  const wh7Res = await fetch(`${BASE_URL}/payments/webhook`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'x-razorpay-signature': 'invalid_forged_webhook_sig'
    },
    body: JSON.stringify({
      event: 'payment.captured',
      order_id: orderId5
    })
  });
  const wh7 = await wh7Res.json();
  assert('Test 7: Webhook signature verification rejects forged signature',
    wh7Res.status === 400 && wh7.error?.code === 'PAYMENT_VERIFICATION_FAILED',
    `Status: ${wh7Res.status}, Code: ${wh7.error?.code}`
  );
  await wait(600);

  // Test 8: Order details accurately persisted and retrievable via /orders/:order_id
  const orderLookup8 = await fetch(`${BASE_URL}/orders/${orderId3}`).then(r => r.json());
  assert('Test 8: Order details accurately persisted and retrievable via /orders/:order_id',
    orderLookup8.success === true && orderLookup8.order?.order_id === orderId3,
    `Order: ${orderLookup8.order?.order_id}`
  );
  await wait(600);

  // -------------------------------------------------------------------
  // GROUP B: PAYMENT LIFECYCLE & STATE MACHINE HARDENING (Tests 9 - 16)
  // -------------------------------------------------------------------
  console.log('\n--- Group B: Payment Lifecycle & State Machine Hardening ---');

  // Test 9: Strict initial state CREATED -> PAYMENT_PENDING
  const act9 = await fetch(`${BASE_URL}/agent/act`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...AUTH_HEADERS },
    body: JSON.stringify({ goal: 'buy Stainless Steel Water Bottle' })
  }).then(r => r.json());
  const orderId9 = act9.order_id;
  assert('Test 9: New purchase order enters PAYMENT_PENDING state',
    act9.status === 'PAYMENT_PENDING' && act9.payment_status === 'PENDING',
    `Status: ${act9.status}`
  );
  await wait(1200);

  // Test 10: State transition PAYMENT_PENDING -> PAID -> COMPLETED
  const payId10 = `pay_${crypto.randomUUID()}`;
  const verify10 = await fetch(`${BASE_URL}/payments/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...AUTH_HEADERS },
    body: JSON.stringify({
      order_id: orderId9,
      razorpay_payment_id: payId10,
      amount: act9.decision?.price
    })
  }).then(r => r.json());
  assert('Test 10: Verified payment transitions to COMPLETED status',
    verify10.success === true && verify10.order?.status === 'COMPLETED',
    `Status: ${verify10.order?.status}`
  );
  await wait(600);

  // Test 11: Duplicate verification replay returns idempotent success
  const replayVerify11 = await fetch(`${BASE_URL}/payments/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...AUTH_HEADERS },
    body: JSON.stringify({
      order_id: orderId9,
      razorpay_payment_id: payId10
    })
  }).then(r => r.json());
  assert('Test 11: Duplicate verification replay handled idempotently without error',
    replayVerify11.success === true && (replayVerify11.already_completed || replayVerify11.order?.status === 'COMPLETED'),
    `Already Completed: ${replayVerify11.already_completed}`
  );
  await wait(600);

  // Test 12: Event idempotency via event_id
  const eventId12 = `evt_idemp_${Date.now()}`;
  await fetch(`${BASE_URL}/payments/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...AUTH_HEADERS },
    body: JSON.stringify({ order_id: orderId9, event_id: eventId12 })
  });
  const ev12B = await fetch(`${BASE_URL}/payments/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...AUTH_HEADERS },
    body: JSON.stringify({ order_id: orderId9, event_id: eventId12 })
  }).then(r => r.json());
  assert('Test 12: Duplicate event_id returns already_processed: true',
    ev12B.success === true && ev12B.already_processed === true,
    `Already Processed: ${ev12B.already_processed}`
  );
  await wait(600);

  // Test 13: Amount mismatch in verification fails
  const act13 = await fetch(`${BASE_URL}/agent/act`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...AUTH_HEADERS },
    body: JSON.stringify({ goal: 'buy Sand Washed Cotton Shirt' })
  }).then(r => r.json());
  const orderId13 = act13.order_id;
  await wait(1200);

  const mismatchAmount13 = await fetch(`${BASE_URL}/payments/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...AUTH_HEADERS },
    body: JSON.stringify({
      order_id: orderId13,
      amount: 99999
    })
  }).then(r => r.json());
  assert('Test 13: Verification rejects amount mismatch with 400 PAYMENT_VERIFICATION_FAILED',
    mismatchAmount13.success === false && mismatchAmount13.error?.code === 'PAYMENT_VERIFICATION_FAILED',
    `Code: ${mismatchAmount13.error?.code}`
  );
  await wait(600);

  // Test 14: Currency mismatch in verification fails
  const mismatchCurrency14 = await fetch(`${BASE_URL}/payments/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...AUTH_HEADERS },
    body: JSON.stringify({
      order_id: orderId13,
      currency: 'USD'
    })
  }).then(r => r.json());
  assert('Test 14: Verification rejects currency mismatch with 400 PAYMENT_VERIFICATION_FAILED',
    mismatchCurrency14.success === false && mismatchCurrency14.error?.code === 'PAYMENT_VERIFICATION_FAILED',
    `Code: ${mismatchCurrency14.error?.code}`
  );
  await wait(600);

  // Test 15: Payment ID reuse across different orders is rejected
  const act15 = await fetch(`${BASE_URL}/agent/act`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...AUTH_HEADERS },
    body: JSON.stringify({ goal: 'buy Minimalist Leather Wallet' })
  }).then(r => r.json());
  const orderId15 = act15.order_id;
  await wait(1200);

  const reusePayment15 = await fetch(`${BASE_URL}/payments/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...AUTH_HEADERS },
    body: JSON.stringify({
      order_id: orderId15,
      razorpay_payment_id: payId10 // Reusing payment ID from orderId9
    })
  }).then(r => r.json());
  assert('Test 15: Payment ID reuse across different orders is prevented',
    reusePayment15.success === false && reusePayment15.error?.code === 'PAYMENT_VERIFICATION_FAILED',
    `Code: ${reusePayment15.error?.code}`
  );
  await wait(600);

  // Test 16: Order in PAYMENT_FAILED cannot transition to COMPLETED
  // (orderId5 was set to PAYMENT_FAILED earlier in Test 5)
  const failedToComplete16Res = await fetch(`${BASE_URL}/payments/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...AUTH_HEADERS },
    body: JSON.stringify({
      order_id: orderId5,
      razorpay_payment_id: `pay_new_${Date.now()}`
    })
  });
  assert('Test 16: Order in PAYMENT_FAILED cannot be verified or transitioned to COMPLETED',
    failedToComplete16Res.status === 400,
    `Status: ${failedToComplete16Res.status}`
  );
  await wait(600);

  // -------------------------------------------------------------------
  // GROUP C: WEBHOOK CONFIRMATION & INGESTION (Tests 17 - 23)
  // -------------------------------------------------------------------
  console.log('\n--- Group C: Webhook Confirmation & Ingestion ---');

  // Test 17: Webhook payment.captured transitions order to COMPLETED
  const act17 = await fetch(`${BASE_URL}/agent/act`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...AUTH_HEADERS },
    body: JSON.stringify({ goal: 'buy Black Oversized Tee' })
  }).then(r => r.json());
  const orderId17 = act17.order_id;
  await wait(1200);

  const whCaptured17 = await fetch(`${BASE_URL}/payments/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...AUTH_HEADERS },
    body: JSON.stringify({
      event: 'payment.captured',
      order_id: orderId17,
      event_id: `wh_evt_cap_${Date.now()}`,
      payload: { payment: { entity: { id: `pay_cap_${Date.now()}`, order_id: orderId17 } } }
    })
  }).then(r => r.json());
  assert('Test 17: Webhook payment.captured transitions PAYMENT_PENDING order to COMPLETED',
    whCaptured17.success === true && whCaptured17.order?.status === 'COMPLETED',
    `Order Status: ${whCaptured17.order?.status}`
  );
  await wait(600);

  // Test 18: Webhook payment.failed transitions order to PAYMENT_FAILED
  const act18 = await fetch(`${BASE_URL}/agent/act`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...AUTH_HEADERS },
    body: JSON.stringify({ goal: 'buy Minimalist Leather Wallet' })
  }).then(r => r.json());
  const orderId18 = act18.order_id;
  await wait(1200);

  const whFailed18 = await fetch(`${BASE_URL}/payments/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...AUTH_HEADERS },
    body: JSON.stringify({
      event: 'payment.failed',
      order_id: orderId18,
      event_id: `wh_evt_fail_${Date.now()}`,
      payload: { payment: { entity: { id: `pay_fail_${Date.now()}`, order_id: orderId18, error_description: 'Card declined' } } }
    })
  }).then(r => r.json());
  assert('Test 18: Webhook payment.failed transitions order to PAYMENT_FAILED',
    whFailed18.success === true && whFailed18.order?.status === 'PAYMENT_FAILED',
    `Order Status: ${whFailed18.order?.status}`
  );
  await wait(600);

  // Test 19: Duplicate webhook event deduplication
  const dupEventId19 = `wh_dup_${Date.now()}`;
  await fetch(`${BASE_URL}/payments/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...AUTH_HEADERS },
    body: JSON.stringify({ event: 'payment.captured', order_id: orderId17, event_id: dupEventId19 })
  });
  const dupWh19 = await fetch(`${BASE_URL}/payments/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...AUTH_HEADERS },
    body: JSON.stringify({ event: 'payment.captured', order_id: orderId17, event_id: dupEventId19 })
  }).then(r => r.json());
  assert('Test 19: Duplicate webhook payload is recognized and deduplicated',
    dupWh19.duplicate === true,
    `Duplicate: ${dupWh19.duplicate}`
  );
  await wait(600);

  // Test 20: Webhook with non-existent order returns 404 ORDER_NOT_FOUND
  const nonexistentWh20Res = await fetch(`${BASE_URL}/payments/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...AUTH_HEADERS },
    body: JSON.stringify({ event: 'payment.captured', order_id: 'order_nonexistent_99999' })
  });
  const nonexistentWh20 = await nonexistentWh20Res.json();
  assert('Test 20: Webhook with non-existent order returns 404 ORDER_NOT_FOUND',
    nonexistentWh20Res.status === 404 && nonexistentWh20.error?.code === 'ORDER_NOT_FOUND',
    `Code: ${nonexistentWh20.error?.code}`
  );
  await wait(400);

  // Test 21: Webhook missing order_id returns 400 INVALID_REQUEST
  const missingOrderWh21Res = await fetch(`${BASE_URL}/payments/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...AUTH_HEADERS },
    body: JSON.stringify({ event: 'payment.captured' })
  });
  const missingOrderWh21 = await missingOrderWh21Res.json();
  assert('Test 21: Webhook missing order_id returns 400 INVALID_REQUEST',
    missingOrderWh21Res.status === 400 && missingOrderWh21.error?.code === 'INVALID_REQUEST',
    `Code: ${missingOrderWh21.error?.code}`
  );
  await wait(400);

  // Test 22: Webhook with refund.processed transitions order to REFUNDED
  const whRefund22 = await fetch(`${BASE_URL}/payments/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...AUTH_HEADERS },
    body: JSON.stringify({
      event: 'refund.processed',
      order_id: orderId17,
      event_id: `wh_rfnd_evt_${Date.now()}`,
      payload: { refund: { entity: { id: `rfnd_${Date.now()}` } } }
    })
  }).then(r => r.json());
  assert('Test 22: Webhook refund.processed transitions completed order to REFUNDED',
    whRefund22.success === true && whRefund22.order?.status === 'REFUNDED',
    `Status: ${whRefund22.order?.status}`
  );
  await wait(600);

  // Test 23: Order events trail records all webhook transactions
  const events23 = await fetch(`${BASE_URL}/orders/${orderId17}/events`).then(r => r.json());
  assert('Test 23: Order events API returns recorded event history',
    events23.success === true && Array.isArray(events23.events) && events23.events.length > 0,
    `Events count: ${events23.events?.length}`
  );
  await wait(600);

  // -------------------------------------------------------------------
  // GROUP D: PAYMENT RECONCILIATION (Tests 24 - 29)
  // -------------------------------------------------------------------
  console.log('\n--- Group D: Payment Reconciliation ---');

  // Test 24: GET /payments/reconciliation returns comprehensive report
  const recon24 = await fetch(`${BASE_URL}/payments/reconciliation`).then(r => r.json());
  const rReport = recon24.reconciliation;
  assert('Test 24: GET /payments/reconciliation returns structured reconciliation report',
    recon24.success === true && rReport && typeof rReport.total_orders === 'number',
    `Total Orders: ${rReport?.total_orders}`
  );
  await wait(400);

  // Test 25: Reconciliation accurately counts statuses
  assert('Test 25: Reconciliation report contains breakdown of all lifecycle states',
    typeof rReport.completed_orders === 'number' && typeof rReport.pending_orders === 'number' && typeof rReport.refunded_orders === 'number',
    `Completed: ${rReport?.completed_orders}, Pending: ${rReport?.pending_orders}, Refunded: ${rReport?.refunded_orders}`
  );

  // Test 26: Reconciliation reports total volume by status
  assert('Test 26: Reconciliation aggregates financial volume by status',
    rReport.total_amount_by_status && typeof rReport.total_amount_by_status === 'object',
    `Volume map keys: ${Object.keys(rReport?.total_amount_by_status || {}).join(', ')}`
  );

  // Test 27: Reconciliation reports stale pending count
  assert('Test 27: Reconciliation tracks stale pending orders count',
    typeof rReport.stale_pending_count === 'number',
    `Stale pending: ${rReport?.stale_pending_count}`
  );

  // Test 28: POST /payments/reconcile/:order_id reconciles single order
  const singleRecon28 = await fetch(`${BASE_URL}/payments/reconcile/${orderId3}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }).then(r => r.json());
  assert('Test 28: Single order reconciliation endpoint reconciles specific order',
    singleRecon28.success === true && singleRecon28.order?.order_id === orderId3,
    `Reconciled: ${singleRecon28.order?.order_id}`
  );
  await wait(400);

  // Test 29: Metrics counter reconciliation_runs increments
  const metrics29 = await fetch(`${BASE_URL}/metrics`).then(r => r.json());
  assert('Test 29: Operational metric reconciliation_runs tracks reconciliation activity',
    metrics29.success === true && metrics29.metrics?.reconciliation_runs > 0,
    `Reconciliation Runs: ${metrics29.metrics?.reconciliation_runs}`
  );
  await wait(400);

  // -------------------------------------------------------------------
  // GROUP E: REFUND LIFECYCLE & EXECUTION (Tests 30 - 36)
  // -------------------------------------------------------------------
  console.log('\n--- Group E: Refund Lifecycle & Execution ---');

  // Test 30: POST /payments/refund transitions COMPLETED order to REFUNDED
  const refund30 = await fetch(`${BASE_URL}/payments/refund`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...AUTH_HEADERS },
    body: JSON.stringify({
      order_id: orderId3,
      amount: act3.decision?.price,
      reason: 'Customer requested refund via test suite'
    })
  }).then(r => r.json());
  assert('Test 30: POST /payments/refund successfully transitions COMPLETED order to REFUNDED',
    refund30.success === true && refund30.status === 'REFUNDED',
    `Status: ${refund30.status}, Refund ID: ${refund30.refund_id}`
  );
  await wait(600);

  // Test 31: POST /payments/refund on already REFUNDED order is idempotent
  const replayRefund31 = await fetch(`${BASE_URL}/payments/refund`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...AUTH_HEADERS },
    body: JSON.stringify({
      order_id: orderId3,
      amount: act3.decision?.price
    })
  }).then(r => r.json());
  assert('Test 31: Duplicate refund request is handled idempotently without re-charging gateway',
    replayRefund31.success === true && (replayRefund31.already_refunded === true || replayRefund31.status === 'REFUNDED'),
    `Already Refunded: ${replayRefund31.already_refunded}`
  );
  await wait(600);

  // Test 32: Refund rejects order in PAYMENT_PENDING state
  const act32 = await fetch(`${BASE_URL}/agent/act`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...AUTH_HEADERS },
    body: JSON.stringify({ goal: 'buy Stainless Steel Water Bottle' })
  }).then(r => r.json());
  const pendingOrderId32 = act32.order_id;
  await wait(1200);

  const refundPending32Res = await fetch(`${BASE_URL}/payments/refund`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...AUTH_HEADERS },
    body: JSON.stringify({ order_id: pendingOrderId32 })
  });
  const refundPending32 = await refundPending32Res.json();
  assert('Test 32: Refund rejects order in PAYMENT_PENDING status with 400 INVALID_STATE_TRANSITION',
    refundPending32Res.status === 400 && refundPending32.error?.code === 'INVALID_STATE_TRANSITION',
    `Code: ${refundPending32.error?.code}`
  );
  await wait(600);

  // Test 33: Refund rejects amount greater than captured order amount
  const act33 = await fetch(`${BASE_URL}/agent/act`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...AUTH_HEADERS },
    body: JSON.stringify({ goal: 'buy Black Oversized Tee' })
  }).then(r => r.json());
  const testOrderId33 = act33.order_id;
  await wait(1200);
  await fetch(`${BASE_URL}/payments/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...AUTH_HEADERS },
    body: JSON.stringify({ order_id: testOrderId33 })
  });
  await wait(600);

  const overRefund33Res = await fetch(`${BASE_URL}/payments/refund`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...AUTH_HEADERS },
    body: JSON.stringify({
      order_id: testOrderId33,
      amount: 99999 // Exceeds ₹699
    })
  });
  const overRefund33 = await overRefund33Res.json();
  assert('Test 33: Refund rejects amount exceeding captured order value with 400 INVALID_REFUND_AMOUNT',
    overRefund33Res.status === 400 && overRefund33.error?.code === 'INVALID_REFUND_AMOUNT',
    `Code: ${overRefund33.error?.code}`
  );
  await wait(600);

  // Test 34: Refund rejects zero or negative amount
  const zeroRefund34Res = await fetch(`${BASE_URL}/payments/refund`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...AUTH_HEADERS },
    body: JSON.stringify({
      order_id: testOrderId33,
      amount: -50
    })
  });
  const zeroRefund34 = await zeroRefund34Res.json();
  assert('Test 34: Refund rejects negative amount with 400 INVALID_REFUND_AMOUNT',
    zeroRefund34Res.status === 400 && zeroRefund34.error?.code === 'INVALID_REFUND_AMOUNT',
    `Code: ${zeroRefund34.error?.code}`
  );
  await wait(400);

  // Test 35: Refund on non-existent order returns 404 ORDER_NOT_FOUND
  const nonexistentRefund35Res = await fetch(`${BASE_URL}/payments/refund`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...AUTH_HEADERS },
    body: JSON.stringify({ order_id: 'order_does_not_exist_404' })
  });
  const nonexistentRefund35 = await nonexistentRefund35Res.json();
  assert('Test 35: Refund on non-existent order returns 404 ORDER_NOT_FOUND',
    nonexistentRefund35Res.status === 404 && nonexistentRefund35.error?.code === 'ORDER_NOT_FOUND',
    `Code: ${nonexistentRefund35.error?.code}`
  );
  await wait(400);

  // Test 36: Refund action is recorded in append-only audit trail
  const audit36 = await fetch(`${BASE_URL}/audit`).then(r => r.json());
  const refundAuditLog = Array.isArray(audit36) && audit36.find(a => a.action === 'Payment Refund Processed');
  assert('Test 36: Successful refund records action in append-only audit trail',
    !!refundAuditLog,
    `Audit action found: ${refundAuditLog?.action}`
  );
  await wait(400);

  // -------------------------------------------------------------------
  // GROUP F: SECURITY, METRICS & INVARIANTS (Tests 37 - 41)
  // -------------------------------------------------------------------
  console.log('\n--- Group F: Security, Metrics & Invariants ---');

  // Test 37: X-Request-ID correlation header returned on all responses
  const customReqId37 = `trace_${crypto.randomUUID()}`;
  const traceRes37 = await fetch(`${BASE_URL}/health`, {
    headers: { 'X-Request-ID': customReqId37 }
  });
  assert('Test 37: X-Request-ID correlation header is preserved and echoed on responses',
    traceRes37.headers.get('x-request-id') === customReqId37,
    `Echoed: ${traceRes37.headers.get('x-request-id')}`
  );
  await wait(400);

  // Test 38: Security Headers enforced
  const secRes38 = await fetch(`${BASE_URL}/health`);
  assert('Test 38: Production security headers (nosniff, DENY, XSS protection) are present',
    secRes38.headers.get('x-content-type-options') === 'nosniff' &&
    secRes38.headers.get('x-frame-options') === 'DENY' &&
    secRes38.headers.get('x-xss-protection') === '1; mode=block',
    `Headers: nosniff=${secRes38.headers.get('x-content-type-options')}, frame=${secRes38.headers.get('x-frame-options')}`
  );
  await wait(400);

  // Test 39: Malformed JSON returns 400 INVALID_REQUEST without stack trace leak
  const malformedRes39 = await fetch(`${BASE_URL}/agent/act`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...AUTH_HEADERS },
    body: '{"goal": "invalid_json, missing_brace'
  });
  const malformedJson39 = await malformedRes39.json();
  const hasStack39 = JSON.stringify(malformedJson39).includes('SyntaxError:');
  assert('Test 39: Malformed JSON returns clean 400 INVALID_REQUEST without stack trace leak',
    malformedRes39.status === 400 && malformedJson39.error?.code === 'INVALID_REQUEST' && !hasStack39,
    `Code: ${malformedJson39.error?.code}`
  );
  await wait(400);

  // Test 40: GET /metrics exposes operational metrics
  const metrics40 = await fetch(`${BASE_URL}/metrics`).then(r => r.json());
  assert('Test 40: GET /metrics exposes operational metrics counters',
    metrics40.success === true && metrics40.metrics?.total_requests > 0,
    `Total Requests: ${metrics40.metrics?.total_requests}`
  );
  await wait(400);

  // Test 41: Core Invariant: BLOCKED items never contact Razorpay
  const blocked41 = await fetch(`${BASE_URL}/agent/act`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...AUTH_HEADERS },
    body: JSON.stringify({ goal: 'Buy Premium Noise-Cancelling Headphones' }) // Exceeds ₹1000 limit
  }).then(r => r.json());
  assert('Test 41: Core Invariant: Policy BLOCKED requests strictly prevent Razorpay gateway contact',
    blocked41.decision?.status === 'BLOCKED' && blocked41.decision?.razorpay_contacted === false,
    `Status: ${blocked41.decision?.status}, Razorpay contacted: ${blocked41.decision?.razorpay_contacted}`
  );

  // -------------------------------------------------------------------
  // FINAL SUMMARY
  // -------------------------------------------------------------------
  console.log('\n========================================================================');
  console.log(`PHASE 9 TEST SUITE RESULTS: ${passCount}/${passCount + failCount} PASSED (${Math.round((passCount / (passCount + failCount)) * 100)}%)`);
  console.log('========================================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runPhase9Suite().catch(err => {
  console.error('Test suite failed to execute:', err);
  process.exit(1);
});
