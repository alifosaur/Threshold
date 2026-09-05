import { useState, useEffect } from 'react';
import { History } from 'lucide-react';
import { useThresholdApi } from './hooks/useThresholdApi';
import { 
  CatalogItem, 
  AuditSession, 
  AuditLogEntry, 
  OrderRecord, 
  GrowthCampaign, 
  GrowthOpportunity, 
  GrowthMetrics, 
  DetailedHealthStatus, 
  ReconciliationReport, 
  PolicyDecisionObject, 
  CrossSellItem 
} from './types';
import { ShopTab } from './components/ShopTab';
import { AgentActivityTab } from './components/AgentActivityTab';
import { GrowthTab } from './components/GrowthTab';
import { DiagnosticsTab } from './components/DiagnosticsTab';
import { AuditTrail } from './components/AuditTrail';
import { SafetyDemoModal } from './components/SafetyDemoModal';
import { ErrorBoundary } from './components/ErrorBoundary';

export default function App() {
  const api = useThresholdApi();

  // Navigation & Modals
  const [currentTab, setCurrentTab] = useState<'shop' | 'growth' | 'diagnostics'>('shop');
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const [isAuditTrailOpen, setIsAuditTrailOpen] = useState(false);
  const [isSafetyDemoOpen, setIsSafetyDemoOpen] = useState(false);

  // Core Data & Policy State
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [auditSessions, setAuditSessions] = useState<AuditSession[]>([]);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [maxSpend, setMaxSpend] = useState<number>(1000);
  const [sessionLimit, setSessionLimit] = useState<number>(1500);
  const [sessionSpent, setSessionSpent] = useState<number>(0);
  const [policyLocked, setPolicyLocked] = useState<boolean>(false);
  const [approvedMerchants, setApprovedMerchants] = useState<string[]>(['Razorpay Store', 'Luxe Mart', 'Urban Basics']);

  // Execution State
  const [currentGoal, setCurrentGoal] = useState('');
  const [appState, setAppState] = useState<'idle' | 'working' | 'result' | 'error'>('idle');
  const [isExecuting, setIsExecuting] = useState(false);
  const [isSafetyTesting, setIsSafetyTesting] = useState(false);
  const [currentRunSteps, setCurrentRunSteps] = useState<AuditLogEntry[]>([]);
  const [lastMatchStatus, setLastMatchStatus] = useState<'EXACT_MATCH' | 'NO_EXACT_MATCH' | null>(null);
  const [lastAlternatives, setLastAlternatives] = useState<number[]>([]);
  const [lastReason, setLastReason] = useState('');
  const [lastCrossSell, setLastCrossSell] = useState<CrossSellItem | null>(null);
  const [lastDecision, setLastDecision] = useState<PolicyDecisionObject | null>(null);
  const [lastCreatedOrderId, setLastCreatedOrderId] = useState<string | null>(null);
  const [lastOrderStatus, setLastOrderStatus] = useState<string>('PAYMENT_PENDING');

  // Observability & Growth State
  const [opportunities, setOpportunities] = useState<GrowthOpportunity[]>([]);
  const [growthMetrics, setGrowthMetrics] = useState<GrowthMetrics | null>(null);
  const [activeCampaign, setActiveCampaign] = useState<GrowthCampaign | null>(null);
  const [isGeneratingCampaign, setIsGeneratingCampaign] = useState(false);
  const [healthStatus, setHealthStatus] = useState<DetailedHealthStatus | null>(null);
  const [reconciliationReport, setReconciliationReport] = useState<ReconciliationReport | null>(null);
  const [recentOrders, setRecentOrders] = useState<OrderRecord[]>([]);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState<string | null>(null);
  const [isRefunding, setIsRefunding] = useState<string | null>(null);
  const [refundError, setRefundError] = useState<{ message: string; request_id?: string } | null>(null);
  const [demoRunning, setDemoRunning] = useState(false);
  const [demoResult, setDemoResult] = useState<any | null>(null);

  const loadData = async () => {
    try {
      const [cat, pol] = await Promise.all([api.getCatalog(), api.getPolicy()]);
      setCatalog(cat);
      setMaxSpend(pol.max_spend);
      setSessionLimit(pol.session_limit || 1500);
      setPolicyLocked(pol.policy_locked);
      setSessionSpent(pol.session_spent || 0);
      setApprovedMerchants(pol.approved_merchants || ['Razorpay Store', 'Luxe Mart', 'Urban Basics']);
      setBackendError(null);
    } catch {
      setBackendError('Threshold API offline.');
    }
  };

  const loadAuditLogs = async () => {
    try {
      const logs = await api.getAudit();
      const map: Record<string, AuditSession> = {};
      logs.forEach(log => {
        if (!map[log.run_id]) map[log.run_id] = { runId: log.run_id, timestamp: log.timestamp, goal: '', status: 'PENDING', logs: [] };
        map[log.run_id].logs.push(log);
        if (log.actor === 'user' && log.details.goal) map[log.run_id].goal = log.details.goal;
        if (log.actor === 'agent' && log.status === 'SUCCESS') {
          map[log.run_id].itemSelected = log.action.replace('Selected Product: "', '').replace('"', '');
          map[log.run_id].price = log.details.price || log.details.amount;
        }
        if (log.actor === 'policy_engine') map[log.run_id].status = log.status === 'APPROVED' ? 'APPROVED' : 'REJECTED';
      });
      setAuditSessions(Object.values(map).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    } catch (err) {
      console.error(err);
    }
  };

  const loadHealthAndOrders = async () => {
    try {
      const [h, r] = await Promise.all([api.getHealthDetailed().catch(() => null), api.getReconciliation().catch(() => null)]);
      if (h) setHealthStatus(h);
      if (r) {
        setReconciliationReport(r);
        const res = await fetch(`${api.API_BASE}/orders`).then(r => r.json()).catch(() => ({ orders: [] }));
        setRecentOrders(res.orders || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
    loadAuditLogs();
    api.getGrowthOpportunities().then(setOpportunities).catch(() => {});
    api.getGrowthMetrics().then(setGrowthMetrics).catch(() => {});
    loadHealthAndOrders();
    const interval = setInterval(() => {
      loadAuditLogs();
      if (currentTab === 'diagnostics') loadHealthAndOrders();
    }, 4000);
    return () => clearInterval(interval);
  }, [currentTab]);

  const executeAgent = async (goalToSend: string, isSafetyTest: boolean = false, runIdOverride?: string) => {
    if (!goalToSend.trim()) return;
    setIsActivityOpen(true);
    setAppState('working');
    setIsExecuting(true);
    setIsSafetyTesting(isSafetyTest);
    try {
      const data = await api.postAgentAct(goalToSend, isSafetyTest, runIdOverride);
      const sorted = (data.steps || []).sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      setCurrentRunSteps(sorted);
      setLastCrossSell(data.cross_sell || null);
      setLastDecision(data.decision || null);
      if (data.order_id) {
        setLastCreatedOrderId(data.order_id);
        setLastOrderStatus(data.status || 'PAYMENT_PENDING');
      }
      setLastMatchStatus(data.match_status === 'NO_EXACT_MATCH' ? 'NO_EXACT_MATCH' : 'EXACT_MATCH');
      setLastAlternatives(data.alternatives || []);
      setLastReason(data.reason || '');
      setAppState('result');
      await Promise.all([loadAuditLogs(), loadData(), loadHealthAndOrders()]);
    } catch {
      setAppState('error');
    } finally {
      setIsExecuting(false);
      setIsSafetyTesting(false);
    }
  };

  const handleSavePolicy = async (limit: number, sessLimit: number, locked: boolean, merchants?: string[]) => {
    const updated = await api.postPolicy(limit, sessLimit, locked, merchants);
    setMaxSpend(updated.max_spend);
    setSessionLimit(updated.session_limit);
    setPolicyLocked(updated.policy_locked);
    if (updated.approved_merchants) setApprovedMerchants(updated.approved_merchants);
    await loadAuditLogs();
  };

  return (
    <div className="min-h-screen bg-[#F6F4EF] text-[#1E1D1A] font-sans antialiased selection:bg-[#EADCC6]">
      <header className="grid grid-cols-3 items-center py-4 px-6 md:px-12 border-b border-[#E6E2D8] bg-[#F6F4EF] sticky top-0 z-40">
        <div className="flex items-center justify-start gap-3">
          <span className="text-base sm:text-[17px] font-extrabold tracking-[0.22em] uppercase font-serif">THRESHOLD</span>
          {backendError && (
            <span className="text-[8.5px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-100 animate-pulse">{backendError}</span>
          )}
        </div>

        <div className="flex items-center justify-center">
          <div className="flex items-center bg-[#EAE6DD]/70 p-1 rounded-full border border-[#E6E2D8] shadow-inner">
            {(['shop', 'growth', 'diagnostics'] as const).map(tab => (
              <button key={tab} onClick={() => setCurrentTab(tab)} className={`px-4 py-1.5 rounded-full text-[9.5px] font-extrabold tracking-wider uppercase transition-all ${currentTab === tab ? 'bg-[#1E1D1A] text-white shadow-sm' : 'text-[#8C887E] hover:text-[#1E1D1A]'}`}>{tab}</button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end">
          <button onClick={() => setIsAuditTrailOpen(true)} className="flex items-center gap-1.5 bg-white hover:bg-[#FAF8F6] text-[#1E1D1A] border border-[#E6E2D8] px-3.5 py-2 rounded-2xl text-[9px] font-extrabold uppercase tracking-wider shadow-sm transition-all">
            <History size={12} className="text-[#C8A97E]" />
            <span>Audit Log ({auditSessions.length})</span>
          </button>
        </div>
      </header>

      <main className="pb-16">
        <ErrorBoundary fallbackTitle="Threshold View Error">
          {currentTab === 'shop' && (
            <ShopTab catalog={catalog} currentGoal={currentGoal} setCurrentGoal={setCurrentGoal} isExecuting={isExecuting} onExecuteAgent={executeAgent} maxSpend={maxSpend} sessionLimit={sessionLimit} sessionSpent={sessionSpent} policyLocked={policyLocked} approvedMerchants={approvedMerchants} onSavePolicy={handleSavePolicy} onRunSafetyDemo={async () => { setDemoRunning(true); try { setDemoResult(await api.postSafetyDemo()); setIsSafetyDemoOpen(true); } finally { setDemoRunning(false); } }} demoRunning={demoRunning} />
          )}

          {currentTab === 'growth' && (
            <GrowthTab
              catalog={catalog}
              opportunities={opportunities}
              growthMetrics={growthMetrics}
              activeCampaign={activeCampaign}
              isGeneratingCampaign={isGeneratingCampaign}
              onCreateCampaign={async (pid, goal) => {
                setIsGeneratingCampaign(true);
                try {
                  const res = await api.postCreateCampaign(pid, goal);
                  const campaignData = (res && res.campaign) ? res.campaign : (res as any);
                  if (campaignData) {
                    if (!campaignData.target_product) {
                      campaignData.target_product = (res && res.product) ? res.product : catalog.find(c => c.id === pid);
                    }
                    setActiveCampaign(campaignData);
                  }
                } catch (err) {
                  console.error('Failed to create campaign:', err);
                } finally {
                  setIsGeneratingCampaign(false);
                }
              }}
              onExecuteAgent={executeAgent}
              onRefreshMetrics={async () => {
                setGrowthMetrics(await api.getGrowthMetrics());
                setOpportunities(await api.getGrowthOpportunities());
              }}
              onSimulateLift={api.postSimulateLift}
            />
          )}

          {currentTab === 'diagnostics' && (
            <DiagnosticsTab healthStatus={healthStatus} reconciliationReport={reconciliationReport} recentOrders={recentOrders} maxSpend={maxSpend} sessionLimit={sessionLimit} onRefreshDiagnostics={loadHealthAndOrders} onRefundPayment={async (order) => { setIsRefunding(order.order_id); try { await api.postRefund(order.order_id, order.amount); await loadHealthAndOrders(); } catch (err: any) { setRefundError({ message: err.message, request_id: err.request_id }); } finally { setIsRefunding(null); } }} isRefunding={isRefunding} refundError={refundError} setRefundError={setRefundError} />
          )}
        </ErrorBoundary>
      </main>

      <AgentActivityTab isOpen={isActivityOpen} onClose={() => setIsActivityOpen(false)} appState={appState} currentRunSteps={currentRunSteps} lastMatchStatus={lastMatchStatus} lastAlternatives={lastAlternatives} lastReason={lastReason} lastCrossSell={lastCrossSell} lastDecision={lastDecision} lastCreatedOrderId={lastCreatedOrderId} lastOrderStatus={lastOrderStatus} catalog={catalog} selectedProductId={null} isSafetyTesting={isSafetyTesting} onExecuteAgent={executeAgent} onVerifyPayment={async (orderId) => { setIsVerifyingPayment(orderId); try { await api.postPaymentVerify(orderId); setLastOrderStatus('COMPLETED'); await loadHealthAndOrders(); } finally { setIsVerifyingPayment(null); } }} isVerifyingPayment={isVerifyingPayment} onOpenProductDetail={() => {}} />
      <AuditTrail isOpen={isAuditTrailOpen} onClose={() => setIsAuditTrailOpen(false)} auditSessions={auditSessions} onRefreshAudit={loadAuditLogs} />
      <SafetyDemoModal isOpen={isSafetyDemoOpen} onClose={() => setIsSafetyDemoOpen(false)} demoResult={demoResult} />
    </div>
  );
}
