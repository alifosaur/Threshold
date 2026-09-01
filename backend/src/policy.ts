import crypto from 'crypto';
import { CatalogItem, PolicyDecision } from './types.js';
import { getSetting, getSessionSpent } from './db.js';

export function getPolicySigningSecret(): string {
  const secret = process.env.POLICY_SIGNING_SECRET;
  if (!secret || !secret.trim()) {
    throw new Error('POLICY_SIGNING_SECRET is not configured in environment. Cryptographic mandate signing requires a valid secret in .env.');
  }
  return secret.trim();
}

export async function evaluatePolicy(item: CatalogItem): Promise<PolicyDecision> {
  try {
    // 1. Authoritative Limits & Session Spend from SQLite
    const maxSpendStr = await getSetting('max_spend');
    const maxSpend = maxSpendStr ? parseFloat(maxSpendStr) : 1000;

    const sessionLimitStr = await getSetting('session_limit');
    const sessionLimit = sessionLimitStr ? parseFloat(sessionLimitStr) : 1500;

    const policyLockedStr = await getSetting('policy_locked');
    const policyLocked = policyLockedStr === 'true';

    const currentSessionSpent = await getSessionSpent();
    const projectedSessionSpent = currentSessionSpent + item.price;

    const defaultApprovedMerchants = ['Razorpay Store', 'Luxe Mart', 'Urban Basics'];
    let approvedMerchants = defaultApprovedMerchants;
    const approvedMerchantsStr = await getSetting('approved_merchants');
    if (approvedMerchantsStr) {
      try {
        const parsed = JSON.parse(approvedMerchantsStr);
        if (Array.isArray(parsed) && parsed.length > 0) {
          approvedMerchants = parsed;
        }
      } catch (err) {
        approvedMerchants = defaultApprovedMerchants;
      }
    }
    const merchantAuthorized = approvedMerchants.includes(item.merchant);

    let decision: PolicyDecision;

    // Rule 0: Policy Lock Check
    if (policyLocked) {
      decision = {
        approved: false,
        ruleViolated: 'policy_locked',
        transaction_limit: maxSpend,
        session_limit: sessionLimit,
        session_spent_before: currentSessionSpent,
        session_spent_after: currentSessionSpent,
        merchant_authorized: merchantAuthorized,
        catalog_verified: true,
        razorpay_contacted: false,
        reason: 'Policy Block: Policy is locked. All autonomous transactions are disabled.'
      };
    } else if (item.price > maxSpend) {
      // Rule 1: Dynamic Max Spend limit per transaction
      decision = {
        approved: false,
        ruleViolated: 'max_spend',
        transaction_limit: maxSpend,
        session_limit: sessionLimit,
        session_spent_before: currentSessionSpent,
        session_spent_after: currentSessionSpent,
        merchant_authorized: merchantAuthorized,
        catalog_verified: true,
        razorpay_contacted: false,
        reason: `Policy Block: Spend limit exceeded. The item price is ₹${item.price.toFixed(2)}, which exceeds the maximum allowed transaction limit of ₹${maxSpend.toFixed(2)}.`
      };
    } else if (projectedSessionSpent > sessionLimit) {
      // Rule 2: Cumulative Session Spend Limit
      decision = {
        approved: false,
        ruleViolated: 'session_spend_limit',
        transaction_limit: maxSpend,
        session_limit: sessionLimit,
        session_spent_before: currentSessionSpent,
        session_spent_after: currentSessionSpent,
        merchant_authorized: merchantAuthorized,
        catalog_verified: true,
        razorpay_contacted: false,
        reason: `Policy Block: Session spending limit exceeded. This purchase of ₹${item.price.toFixed(2)} would bring your session spend to ₹${projectedSessionSpent.toFixed(2)}, exceeding your ₹${sessionLimit.toFixed(2)} session limit.`
      };
    } else if (!merchantAuthorized) {
      // Rule 3: Whitelisted merchants only
      decision = {
        approved: false,
        ruleViolated: 'unauthorized_merchant',
        transaction_limit: maxSpend,
        session_limit: sessionLimit,
        session_spent_before: currentSessionSpent,
        session_spent_after: currentSessionSpent,
        merchant_authorized: false,
        catalog_verified: true,
        razorpay_contacted: false,
        reason: `Policy Block: Unauthorized merchant. Attempted purchase from "${item.merchant}". Transactions are restricted to approved merchants only (${approvedMerchants.join(', ')}).`
      };
    } else {
      // All Policy Checks Passed
      decision = {
        approved: true,
        transaction_limit: maxSpend,
        session_limit: sessionLimit,
        session_spent_before: currentSessionSpent,
        session_spent_after: projectedSessionSpent,
        merchant_authorized: true,
        catalog_verified: true,
        razorpay_contacted: false,
        reason: `₹${item.price.toFixed(2)} is within your ₹${maxSpend.toFixed(2)} transaction limit and keeps cumulative session spend (₹${projectedSessionSpent.toFixed(2)}) within ₹${sessionLimit.toFixed(2)}.`
      };
    }

    // AP2-Style Mandate Signature Generation
    const timestamp = new Date().toISOString();
    const canonicalPayload = JSON.stringify({
      item_id: item.id,
      price: item.price,
      approved: decision.approved,
      transaction_limit: decision.transaction_limit,
      session_limit: decision.session_limit,
      timestamp
    });
    const signingSecret = getPolicySigningSecret();
    const mandateSignature = crypto.createHmac('sha256', signingSecret).update(canonicalPayload).digest('hex');

    decision.mandate_signature = mandateSignature;
    decision.mandate_timestamp = timestamp;

    return decision;
  } catch (error: any) {
    console.error('Error in evaluatePolicy (Failing closed):', error);
    const timestamp = new Date().toISOString();
    let mandateSignature: string | undefined;
    try {
      const signingSecret = getPolicySigningSecret();
      const canonicalPayload = JSON.stringify({
        item_id: item.id,
        price: item.price,
        approved: false,
        transaction_limit: 0,
        session_limit: 0,
        timestamp
      });
      mandateSignature = crypto.createHmac('sha256', signingSecret).update(canonicalPayload).digest('hex');
    } catch {
      mandateSignature = undefined;
    }

    return {
      approved: false,
      ruleViolated: 'max_spend',
      razorpay_contacted: false,
      reason: `Policy Engine Failure: ${error.message || 'Safety system unavailable'}. Payment was not attempted.`,
      mandate_signature: mandateSignature,
      mandate_timestamp: timestamp
    };
  }
}
