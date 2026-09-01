const wait = (ms) => new Promise(r => setTimeout(r, ms));
const AUTH_TOKEN = process.env.AGENT_API_TOKEN || 'th_agent_sec_dev_token_2026';
const AUTH_HEADERS = { 'Authorization': `Bearer ${AUTH_TOKEN}` };

async function runPhase7Regression() {
  console.log('========================================================================');
  console.log('PHASE 7 REGRESSION TEST SUITE');
  console.log('========================================================================\n');

  let passCount = 0;
  let failCount = 0;

  function assert(name, condition, details) {
    if (condition) {
      console.log('✓ PASS: ' + name);
      if (details) console.log('   ↳ ' + details);
      passCount++;
    } else {
      console.log('✕ FAIL: ' + name);
      if (details) console.log('   ↳ ' + details);
      failCount++;
    }
  }

  // 1. Reset Policy Limit for Test Suite
  let pol = await fetch('http://localhost:5000/policy').then(r => r.json());
  await fetch('http://localhost:5000/policy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...AUTH_HEADERS },
    body: JSON.stringify({ max_spend: 1000, session_limit: pol.session_spent + 100000, policy_locked: false })
  });

  // TEST 1: Under-limit catalog match (₹699 <= ₹1000)
  console.log('--- TEST 1: Valid Under-Limit Purchase ---');
  let t1 = await fetch('http://localhost:5000/agent/act', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...AUTH_HEADERS },
    body: JSON.stringify({ goal: 'buy a black oversized tee' })
  }).then(r => r.json());
  assert('TEST 1: Under-limit Catalog Purchase Approved',
    t1.decision?.status === 'APPROVED' && t1.decision?.razorpay_contacted === true && !!t1.order_id,
    'Status: ' + t1.decision?.status + ' | Order: ' + t1.order_id
  );
  await wait(1200);

  // TEST 2: Over-limit catalog match (₹4999 > ₹1000)
  console.log('\n--- TEST 2: Over-Limit Spend Block ---');
  let t2 = await fetch('http://localhost:5000/agent/act', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...AUTH_HEADERS },
    body: JSON.stringify({ goal: 'buy premium headphones' })
  }).then(r => r.json());
  assert('TEST 2: Over-limit Spend Blocked',
    t2.decision?.status === 'BLOCKED' && t2.decision?.razorpay_contacted === false,
    'Status: ' + t2.decision?.status + ' | Razorpay Contacted: ' + t2.decision?.razorpay_contacted
  );
  await wait(1200);

  // TEST 3: Merchant Matching
  console.log('\n--- TEST 3: Merchant Matching ---');
  let t3 = await fetch('http://localhost:5000/agent/act', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...AUTH_HEADERS },
    body: JSON.stringify({ goal: 'buy a sand cotton shirt from Luxe Mart' })
  }).then(r => r.json());
  assert('TEST 3: Authorized Merchant Item Approved',
    t3.decision?.status === 'APPROVED' && t3.decision?.merchant === 'Luxe Mart',
    'Merchant: ' + t3.decision?.merchant + ' | Product: ' + t3.decision?.product
  );
  await wait(1200);

  // TEST 4: Unauthorized Merchant
  console.log('\n--- TEST 4: Unauthorized Merchant Blocking ---');
  let t4 = await fetch('http://localhost:5000/agent/act', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...AUTH_HEADERS },
    body: JSON.stringify({ goal: 'buy classic crew tee from Apparel Hub' })
  }).then(r => r.json());
  assert('TEST 4: Unauthorized Merchant Request Blocked',
    t4.decision?.status === 'BLOCKED' && t4.decision?.razorpay_contacted === false,
    'Status: ' + t4.decision?.status + ' | Razorpay Contacted: ' + t4.decision?.razorpay_contacted
  );
  await wait(1200);

  // TEST 5: Non-existent product query
  console.log('\n--- TEST 5: NO_EXACT_MATCH Handling ---');
  let t5 = await fetch('http://localhost:5000/agent/act', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...AUTH_HEADERS },
    body: JSON.stringify({ goal: 'buy me a sports baseball cap' })
  }).then(r => r.json());
  assert('TEST 5: Non-existent Product Returns NO_EXACT_MATCH',
    t5.match_status === 'NO_EXACT_MATCH' && t5.decision?.razorpay_contacted === false,
    'Match Status: ' + t5.match_status + ' | Razorpay Contacted: ' + t5.decision?.razorpay_contacted
  );
  await wait(1200);

  // TEST 6: Policy Locked Enforcement
  console.log('\n--- TEST 6: Policy Locked Enforcement ---');
  await fetch('http://localhost:5000/policy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...AUTH_HEADERS },
    body: JSON.stringify({ max_spend: 1000, session_limit: 50000, policy_locked: true })
  });
  let t6 = await fetch('http://localhost:5000/agent/act', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...AUTH_HEADERS },
    body: JSON.stringify({ goal: 'buy a black oversized tee' })
  }).then(r => r.json());
  assert('TEST 6: Policy Locked Prevents Transactions',
    t6.decision?.status === 'BLOCKED' && t6.decision?.razorpay_contacted === false,
    'Status: ' + t6.decision?.status + ' | Razorpay Contacted: ' + t6.decision?.razorpay_contacted
  );
  await wait(1200);

  // Reset Policy Lock and configure Max Spend 1500 for cross-sell
  const curPol7 = await fetch('http://localhost:5000/policy').then(r => r.json());
  await fetch('http://localhost:5000/policy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...AUTH_HEADERS },
    body: JSON.stringify({ max_spend: 1500, session_limit: (curPol7.session_spent || 0) + 100000, policy_locked: false })
  });

  // TEST 7: Cross-sell generation
  console.log('\n--- TEST 7: Smart Cross-sell Recommendation ---');
  let t7 = await fetch('http://localhost:5000/agent/act', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...AUTH_HEADERS },
    body: JSON.stringify({ goal: 'buy a black oversized tee' })
  }).then(r => r.json());
  assert('TEST 7: Smart Cross-sell Recommendation Returned',
    t7.decision?.status === 'APPROVED' && !!t7.cross_sell,
    'Primary: ' + t7.decision?.product + ' | Cross-sell: ' + t7.cross_sell?.name + ' (₹' + t7.cross_sell?.price + ')'
  );
  await wait(1200);

  // TEST 8: Replay Attack / Idempotency Prevention
  console.log('\n--- TEST 8: Replay Attack Idempotency Protection ---');
  const runId8 = 'phase7-regress-' + Date.now();
  let r8A = await fetch('http://localhost:5000/agent/act', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...AUTH_HEADERS },
    body: JSON.stringify({ goal: 'buy a black oversized tee', run_id: runId8 })
  }).then(r => r.json());
  await wait(1200);
  let r8B = await fetch('http://localhost:5000/agent/act', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...AUTH_HEADERS },
    body: JSON.stringify({ goal: 'buy a black oversized tee', run_id: runId8 })
  }).then(r => r.json());
  assert('TEST 8: Replay Attack Reuses Existing Order Without Duplicate Charge',
    r8A.order_id === r8B.order_id && r8B.duplicate_prevented === true && r8B.decision?.razorpay_contacted === false,
    'Order ID: ' + r8A.order_id + ' | Duplicate Prevented: ' + r8B.duplicate_prevented
  );
  await wait(1200);

  // TEST 9: Concurrent Session Limit Race Condition Protection
  console.log('\n--- TEST 9: Concurrent Session Limit Race Condition Mutex ---');
  let p9 = await fetch('http://localhost:5000/policy').then(r => r.json());
  await fetch('http://localhost:5000/policy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...AUTH_HEADERS },
    body: JSON.stringify({ max_spend: 1000, session_limit: p9.session_spent + 1000 })
  });
  const [c9A, c9B] = await Promise.all([
    fetch('http://localhost:5000/agent/act', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...AUTH_HEADERS },
      body: JSON.stringify({ goal: 'buy a black oversized tee' })
    }).then(r => r.json()),
    fetch('http://localhost:5000/agent/act', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...AUTH_HEADERS },
      body: JSON.stringify({ goal: 'buy a black oversized tee' })
    }).then(r => r.json())
  ]);
  const approvedCount9 = [c9A, c9B].filter(r => r.decision?.status === 'APPROVED').length;
  const blockedCount9 = [c9A, c9B].filter(r => r.decision?.status === 'BLOCKED').length;
  assert('TEST 9: Concurrent Spending Serialized by Mutex',
    approvedCount9 === 1 && blockedCount9 === 1,
    'Approved: ' + approvedCount9 + ' | Blocked: ' + blockedCount9
  );
  await wait(1200);

  // Reset session limit
  let pReset = await fetch('http://localhost:5000/policy').then(r => r.json());
  await fetch('http://localhost:5000/policy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...AUTH_HEADERS },
    body: JSON.stringify({ max_spend: 1000, session_limit: pReset.session_spent + 100000 })
  });

  // TEST 10: Fail Closed on API Error
  console.log('\n--- TEST 10: Fail Closed on API System Error ---');
  let t10 = await fetch('http://localhost:5000/agent/act', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...AUTH_HEADERS },
    body: JSON.stringify({ goal: 'TRIGGER_SYSTEM_ERROR' })
  }).then(r => r.json());
  assert('TEST 10: System Error Fails Closed Without Gateway Contact',
    t10.decision?.status === 'ERROR' && t10.decision?.razorpay_contacted === false,
    'Status: ' + t10.decision?.status + ' | Razorpay Contacted: ' + t10.decision?.razorpay_contacted
  );
  await wait(1200);

  // TEST 11: One-Click Safety Demo Endpoint (/demo/safety)
  console.log('\n--- TEST 11: One-Click Judge Safety Demo API ---');
  let t11 = await fetch('http://localhost:5000/demo/safety', { method: 'POST' }).then(r => r.json());
  assert('TEST 11: 3-Scenario Demo Pipeline Executes Successfully',
    t11.success === true && !!t11.scenarios?.approved && !!t11.scenarios?.blocked && !!t11.scenarios?.duplicate,
    'Approved: ' + t11.scenarios?.approved?.order_id + ' | Blocked: ' + t11.scenarios?.blocked?.policy_decision + ' | Dup: ' + t11.scenarios?.duplicate?.policy_decision
  );
  await wait(1200);

  // TEST 12: Audit Log Schema & Persistence
  console.log('\n--- TEST 12: Append-Only Audit Trail Schema ---');
  let t12 = await fetch('http://localhost:5000/audit').then(r => r.json());
  const hasActorAndStatus = t12.every(e => !!e.actor && !!e.action && !!e.status && !!e.run_id);
  assert('TEST 12: Audit Log Contains All Authoritative Attributes',
    t12.length > 0 && hasActorAndStatus,
    'Total Audit Entries: ' + t12.length + ' | Schema Verified: ' + hasActorAndStatus
  );

  console.log('\n========================================================================');
  console.log('PHASE 7 REGRESSION SUMMARY: ' + passCount + ' PASSED / ' + failCount + ' FAILED');
  console.log('========================================================================');
}

runPhase7Regression();
