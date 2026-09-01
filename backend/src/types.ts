export type OrderStatus = 
  | "CREATED"
  | "PAYMENT_PENDING"
  | "PAID"
  | "COMPLETED"
  | "REFUND_PENDING"
  | "REFUNDED"
  | "PAYMENT_FAILED"
  | "PAYMENT_EXPIRED"
  | "CANCELLED";

export type PaymentStatus =
  | "PENDING"
  | "PAID"
  | "FAILED"
  | "REFUND_PENDING"
  | "REFUNDED";

export type ApiErrorCode =
  | "POLICY_BLOCKED"
  | "UNAUTHORIZED_MERCHANT"
  | "NO_EXACT_MATCH"
  | "DUPLICATE_REQUEST"
  | "PAYMENT_GATEWAY_ERROR"
  | "PAYMENT_VERIFICATION_FAILED"
  | "INVALID_STATE_TRANSITION"
  | "ORDER_NOT_FOUND"
  | "INVALID_REQUEST"
  | "REFUND_FAILED"
  | "INVALID_REFUND_AMOUNT"
  | "PAYMENT_ALREADY_REFUNDED"
  | "UNAUTHORIZED"
  | "INTERNAL_ERROR";

export interface CatalogItem {
  id: number;
  name: string;
  price: number; // Stored in INR (e.g. 699)
  currency: string;
  stock: number;
  tags: string; // Comma-separated list (e.g. "black, shirt, clothing")
  merchant: string; // Merchant name
  image_url: string; // URL for premium product photos
}

export interface AuditLogEntry {
  id?: number;
  run_id: string; // Grouping ID for all operations related to one goal
  request_id?: string; // Request correlation ID
  timestamp: string; // ISO string
  actor: "user" | "agent" | "policy_engine" | "razorpay" | "system";
  action: string;
  reasoning: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "FAILED" | "SUCCESS" | "INFO" | "ERROR";
  details: string; // JSON serialized string of AuditLogDetails
}

export interface AuditLogDetails {
  mode?: "mock" | "live" | "test";
  item_id?: number;
  price?: number;
  amount?: number;
  currency?: string;
  merchant?: string;
  order_id?: string;
  razorpay_order_id?: string;
  payment_id?: string;
  razorpay_payment_id?: string;
  refund_id?: string;
  refund_amount?: number;
  event_id?: string;
  from_status?: OrderStatus;
  to_status?: OrderStatus;
  request_id?: string;
  idempotency_key?: string;
  rule_violated?: "max_spend" | "session_spend_limit" | "unauthorized_merchant" | "nonexistent_product" | "policy_locked";
  error?: string;
  goal?: string;
  selected_item_id?: number | null;
  stage?: "agent_selection" | "payment_creation" | "policy_evaluation" | "payment_verification" | "refund" | "reconciliation";
  match_status?: "EXACT_MATCH" | "NO_EXACT_MATCH";
  alternatives?: number[];
  remaining_budget?: number;
  cross_sell_item_id?: number;
  cross_sell_reasoning?: string;
  transaction_limit?: number;
  session_limit?: number;
  session_spent_before?: number;
  session_spent_after?: number;
  razorpay_contacted?: boolean;
  duplicate_prevented?: boolean;
  campaign_name?: string;
  target_intent?: string;
  ai_buyer_message?: string;
  mandate_signature?: string;
  mandate_timestamp?: string;
  sample_buyer_query?: string;
}

export interface PolicyDecision {
  approved: boolean;
  ruleViolated?: "max_spend" | "session_spend_limit" | "unauthorized_merchant" | "nonexistent_product" | "policy_locked";
  reason?: string;
  transaction_limit?: number;
  session_limit?: number;
  session_spent_before?: number;
  session_spent_after?: number;
  merchant_authorized?: boolean;
  catalog_verified?: boolean;
  razorpay_contacted?: boolean;
  mandate_signature?: string;
  mandate_timestamp?: string;
}

export interface CrossSellItem {
  id: number;
  name: string;
  price: number;
  merchant: string;
  image_url: string;
  reasoning: string;
}

export interface OrderRecord {
  id?: number;
  run_id: string;
  idempotency_key?: string;
  order_id: string;
  razorpay_order_id?: string;
  payment_id?: string;
  razorpay_payment_id?: string;
  refund_id?: string;
  refund_amount?: number;
  status: OrderStatus;
  payment_status: PaymentStatus;
  amount: number;
  currency: string;
  merchant: string;
  item_id: number;
  failure_reason?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  refunded_at?: string;
  price?: number; // legacy compatibility helper
}

export interface PaymentEventRecord {
  event_id: string;
  order_id: string;
  event_type: string;
  status: string;
  payload: string;
  created_at: string;
}

export interface GrowthMetrics {
  ai_opportunities: number;
  campaigns_generated: number;
  ai_buyer_tests: number;
  orders_approved: number;
  orders_blocked: number;
  test_revenue: number;
  duplicate_prevented: number;
  protected_attempts: number;
}

export interface OperationalMetrics {
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
}

export interface ReconciliationReport {
  total_orders: number;
  pending_orders: number;
  paid_orders: number;
  completed_orders: number;
  failed_orders: number;
  refunded_orders: number;
  stale_pending_count: number;
  stale_pending_orders: OrderRecord[];
  state_mismatches: Array<{
    order_id: string;
    local_status: OrderStatus;
    expected_status?: string;
    discrepancy: string;
  }>;
  total_amount_by_status: Record<string, number>;
  generated_at: string;
}

export interface RefundResult {
  success: boolean;
  refund_id?: string;
  order_id: string;
  amount_refunded: number;
  status: OrderStatus;
  error?: string;
}

export interface DetailedHealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  uptime_seconds: number;
  database: {
    connected: boolean;
    type: "SQLite";
    orders_count: number;
    audit_logs_count: number;
  };
  gateway: {
    adapter: "Razorpay";
    mode: "test" | "live";
    active: boolean;
  };
  policy_engine: {
    active: boolean;
    fail_closed_enforced: boolean;
  };
  metrics: OperationalMetrics;
}
