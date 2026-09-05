export interface CatalogItem {
  id: number;
  name: string;
  price: number;
  currency: string;
  stock: number;
  tags: string;
  merchant: string;
  image_url: string;
}

export interface AuditLogDetails {
  mode?: "mock" | "live";
  item_id?: number;
  price?: number;
  amount?: number;
  currency?: string;
  merchant?: string;
  order_id?: string;
  payment_id?: string;
  event_id?: string;
  from_status?: string;
  to_status?: string;
  request_id?: string;
  idempotency_key?: string;
  rule_violated?: "max_spend" | "session_spend_limit" | "unauthorized_merchant" | "nonexistent_product" | "policy_locked";
  error?: string;
  goal?: string;
  selected_item_id?: number | null;
  stage?: "agent_selection" | "payment_creation" | "policy_evaluation" | "payment_verification";
  match_status?: "EXACT_MATCH" | "NO_EXACT_MATCH";
  alternatives?: number[];
  remaining_budget?: number;
  cross_sell_item_id?: number;
  cross_sell_reasoning?: string;
  transaction_limit?: number;
  session_limit?: number;
  session_spent_before?: number;
  session_spent_after?: number;
  merchant_authorized?: boolean;
  catalog_verified?: boolean;
  razorpay_contacted?: boolean;
}

export interface AuditLogEntry {
  id?: number;
  run_id: string;
  request_id?: string;
  timestamp: string;
  actor: "user" | "agent" | "policy_engine" | "razorpay" | "system";
  action: string;
  details: AuditLogDetails;
  status: "INFO" | "SUCCESS" | "REJECTED" | "APPROVED" | "FAILED" | "ERROR";
  reasoning?: string;
}

export interface CrossSellItem {
  item_id: number;
  name: string;
  price: number;
  merchant: string;
  image_url: string;
  reasoning: string;
}

export interface OrderRecord {
  run_id: string;
  idempotency_key?: string | null;
  order_id: string;
  razorpay_order_id: string;
  payment_id?: string | null;
  razorpay_payment_id?: string | null;
  refund_id?: string | null;
  refund_amount?: number | null;
  status: "CREATED" | "PAYMENT_PENDING" | "PAID" | "COMPLETED" | "REFUND_PENDING" | "REFUNDED" | "PAYMENT_FAILED" | "PAYMENT_EXPIRED" | "CANCELLED";
  payment_status: "PENDING" | "PAID" | "FAILED" | "REFUND_PENDING" | "REFUNDED";
  amount: number;
  price: number;
  currency: string;
  merchant: string;
  item_id: number;
  failure_reason?: string | null;
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
  refunded_at?: string | null;
}

export interface PaymentEvent {
  event_id: string;
  order_id: string;
  event_type: string;
  amount?: number;
  currency?: string;
  payload: string;
  created_at: string;
}

export interface GrowthCampaign {
  campaign_id?: string;
  timestamp?: string;
  merchant_goal?: string;
  target_product?: CatalogItem;
  ai_buyer_persona?: string;
  channel_strategy?: string;
  sample_buyer_query?: string;
  expected_basket_lift?: string;
  campaign_name?: string;
  target_intent?: string;
  ai_buyer_message?: string;
  cross_sell_candidate?: CatalogItem;
  simulation_result?: {
    buyer_prompt: string;
    agent_resolution: string;
    policy_outcome: "APPROVED" | "BLOCKED";
    order_amount: number;
    projected_revenue: number;
  };
}

export interface GrowthOpportunity {
  type: "cross_sell" | "pricing_optimization" | "agentic_seo" | "inventory_velocity";
  title: string;
  target_product_id: number;
  target_product_name: string;
  rationale: string;
  suggested_action: string;
  projected_impact: string;
  readiness_score: number;
}

export interface GrowthMetrics {
  total_opportunities_identified: number;
  active_campaigns_count: number;
  cross_sell_conversion_rate: string;
  agentic_discovery_readiness: string;
  projected_incremental_gmv: number;
  catalog_items_optimized: number;
}

export interface CrossSellLiftReport {
  success: boolean;
  error?: string;
  sample_count?: number;
  resolved_count?: number;
  baseline_aov?: number;
  with_crosssell_aov?: number;
  lift_percent?: number;
  projected_incremental_revenue_per_1k_orders?: number;
  simulations?: Array<{
    goal: string;
    primary_product: string;
    primary_price: number;
    cross_sell_product: string | null;
    cross_sell_price: number;
    basket_total_baseline: number;
    basket_total_crosssell: number;
  }>;
  skipped?: Array<{
    goal: string;
    reason: string;
  }>;
}

export interface ReconciliationReport {
  total_orders: number;
  pending_orders: number;
  paid_orders: number;
  completed_orders: number;
  failed_orders: number;
  refunded_orders: number;
  stale_pending_count: number;
  total_amount_by_status: Record<string, number>;
  state_mismatches: Array<{ order_id: string; local_status: string; discrepancy: string }>;
  generated_at: string;
}

export interface DetailedHealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  uptime_seconds: number;
  database: {
    connected: boolean;
    type: string;
    orders_count: number;
    audit_logs_count: number;
  };
  gateway: {
    adapter: string;
    mode: "test" | "live";
    active: boolean;
  };
  policy_engine: {
    active: boolean;
    fail_closed_enforced: boolean;
  };
  metrics: {
    total_requests: number;
    successful_requests: number;
    failed_requests: number;
    blocked_requests: number;
    payment_verifications: number;
    payment_verification_failures: number;
    webhook_events: number;
    duplicate_webhooks: number;
    duplicate_idempotency_requests: number;
    refund_requests: number;
    refund_successes: number;
    refund_failures: number;
    gateway_failures: number;
    reconciliation_runs: number;
    reconciliation_mismatches: number;
    orders_created: number;
    orders_paid: number;
    orders_completed: number;
  };
}

export interface PolicyDecisionObject {
  status: "APPROVED" | "BLOCKED" | "NO_EXACT_MATCH" | "ERROR";
  product?: string;
  price?: number;
  amount?: number;
  merchant?: string;
  transaction_limit?: number;
  session_limit?: number;
  session_spent_before?: number;
  session_spent_after?: number;
  merchant_authorized?: boolean;
  catalog_verified?: boolean;
  razorpay_contacted?: boolean;
  rule_violated?: string;
  reason?: string;
}

export interface AuditSession {
  runId: string;
  timestamp: string;
  goal: string;
  status: "APPROVED" | "REJECTED" | "FAILED" | "PENDING" | "ERROR";
  itemSelected?: string;
  price?: number;
  merchant?: string;
  orderId?: string;
  orderStatus?: string;
  paymentStatus?: string;
  mode?: "mock" | "live";
  ruleViolated?: string;
  systemErrorReason?: string;
  logs: AuditLogEntry[];
}

export interface PolicyConfig {
  max_spend: number;
  session_limit: number;
  session_spent: number;
  policy_locked: boolean;
  approved_merchants: string[];
}
