import {
  CatalogItem,
  AuditLogEntry,
  OrderRecord,
  GrowthCampaign,
  GrowthOpportunity,
  GrowthMetrics,
  ReconciliationReport,
  DetailedHealthStatus,
  PolicyConfig
} from '../types';

const API_BASE = 'http://localhost:5000';
const AGENT_TOKEN = import.meta.env.VITE_AGENT_API_TOKEN || '';

const getAuthHeader = (): Record<string, string> => (AGENT_TOKEN ? { Authorization: `Bearer ${AGENT_TOKEN}` } : {});

export function useThresholdApi() {
  const getCatalog = async (): Promise<CatalogItem[]> => {
    const res = await fetch(`${API_BASE}/catalog.json`);
    if (!res.ok) throw new Error('Catalog service unavailable');
    const json = await res.json();
    return json.data || json;
  };

  const getPolicy = async (): Promise<PolicyConfig> => {
    const res = await fetch(`${API_BASE}/policy`);
    if (!res.ok) throw new Error('Failed to fetch policy configuration');
    return res.json();
  };

  const postPolicy = async (
    maxSpend?: number,
    sessionLimit?: number,
    policyLocked?: boolean,
    approvedMerchants?: string[]
  ): Promise<PolicyConfig & { success: boolean }> => {
    const res = await fetch(`${API_BASE}/policy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify({
        max_spend: maxSpend,
        session_limit: sessionLimit,
        policy_locked: policyLocked,
        approved_merchants: approvedMerchants
      })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Failed to update policy');
    }
    return res.json();
  };

  const getAudit = async (): Promise<AuditLogEntry[]> => {
    const res = await fetch(`${API_BASE}/audit`);
    if (!res.ok) throw new Error('Audit log service unavailable');
    return res.json();
  };

  const postAgentAct = async (
    goal: string,
    isSafetyTest: boolean = false,
    runIdOverride?: string
  ): Promise<any> => {
    const res = await fetch(`${API_BASE}/agent/act`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': runIdOverride || `idemp_${Date.now()}`,
        ...getAuthHeader()
      },
      body: JSON.stringify({
        goal,
        safetyTest: isSafetyTest,
        run_id: runIdOverride
      })
    });
    return res.json();
  };

  const postPaymentVerify = async (
    orderId: string,
    paymentId?: string,
    signature?: string
  ): Promise<any> => {
    const res = await fetch(`${API_BASE}/payments/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order_id: orderId,
        razorpay_payment_id: paymentId || `pay_${Math.random().toString(36).substring(2, 10)}`,
        razorpay_signature: signature || 'sig_valid_verified_payment'
      })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Payment verification failed');
    }
    return res.json();
  };

  const getOrder = async (orderId: string): Promise<{ success: boolean; order?: OrderRecord }> => {
    const res = await fetch(`${API_BASE}/orders/${orderId}`);
    if (!res.ok) throw new Error('Order lookup failed');
    return res.json();
  };

  const postRefund = async (
    orderId: string,
    amount: number,
    reason: string = 'Customer requested refund via UI'
  ): Promise<any> => {
    const res = await fetch(`${API_BASE}/payments/refund`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order_id: orderId,
        amount,
        reason
      })
    });
    const data = await res.json();
    if (!res.ok) {
      const errorObj = new Error(data.error?.message || 'Refund processing failed.');
      (errorObj as any).request_id = data.error?.request_id;
      throw errorObj;
    }
    return data;
  };

  const getHealthDetailed = async (): Promise<DetailedHealthStatus> => {
    const res = await fetch(`${API_BASE}/health/detailed`);
    if (!res.ok) throw new Error('Health check service unavailable');
    return res.json();
  };

  const getReconciliation = async (): Promise<ReconciliationReport> => {
    const res = await fetch(`${API_BASE}/payments/reconciliation`);
    if (!res.ok) throw new Error('Reconciliation service unavailable');
    const data = await res.json();
    return data.report;
  };

  const getGrowthOpportunities = async (): Promise<GrowthOpportunity[]> => {
    const res = await fetch(`${API_BASE}/growth/opportunities`);
    if (!res.ok) throw new Error('Opportunities service unavailable');
    const data = await res.json();
    return data.opportunities || [];
  };

  const getGrowthMetrics = async (): Promise<GrowthMetrics> => {
    const res = await fetch(`${API_BASE}/growth/metrics`);
    if (!res.ok) throw new Error('Growth metrics service unavailable');
    const data = await res.json();
    return data.metrics;
  };

  const postCreateCampaign = async (
    productId: number,
    merchantGoal?: string
  ): Promise<{ success: boolean; product?: CatalogItem; campaign: GrowthCampaign }> => {
    const res = await fetch(`${API_BASE}/growth/campaign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_id: productId,
        merchant_goal: merchantGoal || undefined
      })
    });
    if (!res.ok) throw new Error('Failed to generate growth campaign');
    return res.json();
  };

  const postSafetyDemo = async (): Promise<any> => {
    const res = await fetch(`${API_BASE}/demo/safety`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) throw new Error('Safety demo execution failed');
    return res.json();
  };

  const postSimulateLift = async (count: number = 8): Promise<any> => {
    const res = await fetch(`${API_BASE}/growth/simulate-lift`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ count })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return data; // Return error payload containing { success: false, error, skipped } so UI can render it gracefully
    }
    return data;
  };

  return {
    API_BASE,
    getCatalog,
    getPolicy,
    postPolicy,
    getAudit,
    postAgentAct,
    postPaymentVerify,
    getOrder,
    postRefund,
    getHealthDetailed,
    getReconciliation,
    getGrowthOpportunities,
    getGrowthMetrics,
    postCreateCampaign,
    postSafetyDemo,
    postSimulateLift
  };
}
