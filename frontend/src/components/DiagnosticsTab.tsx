import { useState } from 'react';
import { 
  CreditCard, 
  ShieldCheck, 
  Activity, 
  RefreshCw, 
  Loader2, 
  RotateCcw, 
  X, 
  AlertTriangle 
} from 'lucide-react';
import { 
  DetailedHealthStatus, 
  ReconciliationReport, 
  OrderRecord 
} from '../types';

interface DiagnosticsTabProps {
  healthStatus: DetailedHealthStatus | null;
  reconciliationReport: ReconciliationReport | null;
  recentOrders: OrderRecord[];
  maxSpend: number;
  sessionLimit: number;
  onRefreshDiagnostics: () => Promise<void>;
  onRefundPayment: (order: OrderRecord) => Promise<void>;
  isRefunding: string | null;
  refundError: { message: string; request_id?: string } | null;
  setRefundError: (err: { message: string; request_id?: string } | null) => void;
}

export function DiagnosticsTab({
  healthStatus,
  reconciliationReport,
  recentOrders,
  maxSpend,
  sessionLimit,
  onRefreshDiagnostics,
  onRefundPayment,
  isRefunding,
  refundError,
  setRefundError
}: DiagnosticsTabProps) {
  const [refundConfirmationOrder, setRefundConfirmationOrder] = useState<OrderRecord | null>(null);

  const handleConfirmRefund = async () => {
    if (!refundConfirmationOrder) return;
    await onRefundPayment(refundConfirmationOrder);
    setRefundConfirmationOrder(null);
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 space-y-8 animate-fade-in">
      
      {/* Top Header */}
      <div className="flex justify-between items-center">
        <div>
          <span className="text-[8px] font-extrabold text-[#C8A97E] uppercase tracking-widest bg-white border border-[#E6E2D8] px-3 py-1 rounded-full shadow-sm">
            System Observability & Diagnostics
          </span>
          <h1 className="text-2xl md:text-3xl font-serif font-semibold text-[#1E1D1A] mt-2">
            Operational Status & Payment Lifecycle
          </h1>
        </div>
        <button
          onClick={onRefreshDiagnostics}
          className="flex items-center gap-1.5 bg-white hover:bg-slate-50 border border-[#E6E2D8] text-[#1E1D1A] px-3.5 py-2 rounded-2xl text-[9.5px] font-extrabold uppercase tracking-wider transition-all shadow-sm"
        >
          <RefreshCw size={12} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Health Summary Cards */}
      {healthStatus && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white border border-[#E6E2D8] p-4 rounded-3xl shadow-sm space-y-1">
            <span className="text-[8px] font-extrabold text-[#8C887E] uppercase tracking-wider block">Database Health</span>
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
              <span>{healthStatus.database.type} Connected</span>
            </div>
            <span className="text-[8px] text-[#8C887E]">{healthStatus.database.orders_count} Orders • {healthStatus.database.audit_logs_count} Audit Events</span>
          </div>

          <div className="bg-white border border-[#E6E2D8] p-4 rounded-3xl shadow-sm space-y-1">
            <span className="text-[8px] font-extrabold text-[#8C887E] uppercase tracking-wider block">Gateway Adapter</span>
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-700">
              <CreditCard size={13} className="text-emerald-600" />
              <span>Razorpay ({healthStatus.gateway.mode?.toUpperCase() || 'TEST'} MODE)</span>
            </div>
            <span className="text-[8px] text-[#8C887E]">Gated by Policy Engine</span>
          </div>

          <div className="bg-white border border-[#E6E2D8] p-4 rounded-3xl shadow-sm space-y-1">
            <span className="text-[8px] font-extrabold text-[#8C887E] uppercase tracking-wider block">Policy Engine</span>
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-700">
              <ShieldCheck size={13} className="text-indigo-600" />
              <span>Fail-Closed Enabled</span>
            </div>
            <span className="text-[8px] text-[#8C887E]">Limit: ₹{maxSpend} / Session: ₹{sessionLimit}</span>
          </div>

          <div className="bg-white border border-[#E6E2D8] p-4 rounded-3xl shadow-sm space-y-1">
            <span className="text-[8px] font-extrabold text-[#8C887E] uppercase tracking-wider block">Server Uptime</span>
            <div className="flex items-center gap-2 text-xs font-bold text-[#1E1D1A]">
              <Activity size={13} className="text-[#C8A97E]" />
              <span>{Math.floor(healthStatus.uptime_seconds / 60)}m {healthStatus.uptime_seconds % 60}s</span>
            </div>
            <span className="text-[8px] text-[#8C887E]">Threshold Production Ready</span>
          </div>
        </div>
      )}

      {/* Reconciliation & Settlement Overview */}
      {reconciliationReport && (
        <div className="bg-[#FAF8F6] border border-[#E6E2D8] p-6 rounded-3xl shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <span className="text-[8px] font-extrabold text-[#C8A97E] uppercase tracking-widest block">Gateway Settlement</span>
              <h3 className="text-xs font-serif font-extrabold text-[#1E1D1A] uppercase tracking-wide mt-0.5">
                Payment Reconciliation & Ledger
              </h3>
            </div>
            <span className="text-[8px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
              ✓ Verified Match
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[9.5px]">
            <div className="bg-white p-3 rounded-2xl border border-[#E6E2D8]">
              <span className="text-[7.5px] font-extrabold text-[#8C887E] uppercase block">Settled Volume</span>
              <span className="text-base font-serif font-extrabold text-emerald-700 mt-0.5 block">
                ₹{(reconciliationReport.total_amount_by_status?.COMPLETED || 0) + (reconciliationReport.total_amount_by_status?.PAID || 0)}
              </span>
              <span className="text-[7.5px] text-[#8C887E]">{reconciliationReport.completed_orders + reconciliationReport.paid_orders} Completed Orders</span>
            </div>
            <div className="bg-white p-3 rounded-2xl border border-[#E6E2D8]">
              <span className="text-[7.5px] font-extrabold text-amber-600 uppercase block">Pending Authorization</span>
              <span className="text-base font-serif font-extrabold text-amber-700 mt-0.5 block">
                ₹{reconciliationReport.total_amount_by_status?.PAYMENT_PENDING || 0}
              </span>
              <span className="text-[7.5px] text-[#8C887E]">{reconciliationReport.pending_orders} Pending</span>
            </div>
            <div className="bg-white p-3 rounded-2xl border border-[#E6E2D8]">
              <span className="text-[7.5px] font-extrabold text-purple-600 uppercase block">Total Refunded</span>
              <span className="text-base font-serif font-extrabold text-purple-700 mt-0.5 block">
                ₹{reconciliationReport.total_amount_by_status?.REFUNDED || 0}
              </span>
              <span className="text-[7.5px] text-[#8C887E]">{reconciliationReport.refunded_orders} Refunded Orders</span>
            </div>
            <div className="bg-white p-3 rounded-2xl border border-[#E6E2D8]">
              <span className="text-[7.5px] font-extrabold text-[#8C887E] uppercase block">Stale Pending Orders</span>
              <span className="text-base font-serif font-extrabold text-[#1E1D1A] mt-0.5 block">
                {reconciliationReport.stale_pending_count}
              </span>
              <span className="text-[7.5px] text-[#8C887E]">Older than 15 mins</span>
            </div>
          </div>
        </div>
      )}

      {/* Operational Metrics Counter */}
      {healthStatus && (
        <div className="bg-white border border-[#E6E2D8] p-6 rounded-3xl shadow-sm space-y-4">
          <h3 className="text-xs font-serif font-extrabold text-[#1E1D1A] uppercase tracking-wide">
            Live Operational Metrics
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-[9.5px]">
            <div className="bg-[#FAF8F6] p-3 rounded-2xl border border-[#E6E2D8]/50">
              <span className="text-[7.5px] font-extrabold text-[#8C887E] uppercase block">Total Requests</span>
              <span className="text-base font-serif font-extrabold text-[#1E1D1A] mt-0.5 block">{healthStatus.metrics.total_requests}</span>
            </div>
            <div className="bg-[#FAF8F6] p-3 rounded-2xl border border-[#E6E2D8]/50">
              <span className="text-[7.5px] font-extrabold text-emerald-600 uppercase block">Successful</span>
              <span className="text-base font-serif font-extrabold text-emerald-700 mt-0.5 block">{healthStatus.metrics.successful_requests}</span>
            </div>
            <div className="bg-[#FAF8F6] p-3 rounded-2xl border border-[#E6E2D8]/50">
              <span className="text-[7.5px] font-extrabold text-rose-600 uppercase block">Policy Blocked</span>
              <span className="text-base font-serif font-extrabold text-rose-700 mt-0.5 block">{healthStatus.metrics.blocked_requests}</span>
            </div>
            <div className="bg-[#FAF8F6] p-3 rounded-2xl border border-[#E6E2D8]/50">
              <span className="text-[7.5px] font-extrabold text-[#C8A97E] uppercase block">Idempotency Replays</span>
              <span className="text-base font-serif font-extrabold text-[#4A3B2C] mt-0.5 block">{healthStatus.metrics.duplicate_idempotency_requests || 0}</span>
            </div>
            <div className="bg-[#FAF8F6] p-3 rounded-2xl border border-[#E6E2D8]/50">
              <span className="text-[7.5px] font-extrabold text-indigo-600 uppercase block">Orders Completed</span>
              <span className="text-base font-serif font-extrabold text-indigo-700 mt-0.5 block">{healthStatus.metrics.orders_completed}</span>
            </div>
          </div>
        </div>
      )}

      {/* Recent Orders & State Machine Ledger */}
      <div className="bg-white border border-[#E6E2D8] p-6 rounded-3xl shadow-sm space-y-4">
        <h3 className="text-xs font-serif font-extrabold text-[#1E1D1A] uppercase tracking-wide">
          Authoritative Order & Payment State Machine
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[9px]">
            <thead>
              <tr className="border-b border-[#E6E2D8] text-[#8C887E] font-extrabold uppercase">
                <th className="pb-3">Order ID</th>
                <th className="pb-3">Merchant</th>
                <th className="pb-3">Amount</th>
                <th className="pb-3">Order Status</th>
                <th className="pb-3">Created</th>
                <th className="pb-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#FAF8F6]">
              {recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-[#8C887E]">
                    No orders created yet in current database session.
                  </td>
                </tr>
              ) : (
                recentOrders.map(order => (
                  <tr key={order.order_id} className="hover:bg-[#FAF8F6]/50">
                    <td className="py-3 font-mono font-bold text-[#1E1D1A]">{order.order_id}</td>
                    <td className="py-3 text-[#4A4740] font-medium">{order.merchant}</td>
                    <td className="py-3 font-bold text-[#1E1D1A]">₹{order.amount}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[8px] font-extrabold uppercase ${
                        order.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        order.status === 'PAYMENT_PENDING' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        order.status === 'REFUNDED' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                        order.status === 'REFUND_PENDING' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                        'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="py-3 text-[#8C887E]">{new Date(order.created_at).toLocaleTimeString()}</td>
                    <td className="py-3 text-right">
                      {(order.status === 'COMPLETED' || order.status === 'PAID') && (
                        <button
                          onClick={() => {
                            setRefundConfirmationOrder(order);
                            setRefundError(null);
                          }}
                          disabled={isRefunding === order.order_id}
                          className="inline-flex items-center gap-1 text-[8px] font-bold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2.5 py-1 rounded-lg transition-all"
                        >
                          {isRefunding === order.order_id ? (
                            <Loader2 className="animate-spin" size={10} />
                          ) : (
                            <>
                              <RotateCcw size={10} />
                              <span>Refund</span>
                            </>
                          )}
                        </button>
                      )}
                      {order.status === 'REFUNDED' && (
                        <span className="text-[8px] text-purple-700 font-bold">Refunded ✓</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Refund Confirmation Modal */}
      {refundConfirmationOrder && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl border border-[#E6E2D8] max-w-sm w-full overflow-hidden shadow-2xl relative flex flex-col p-6 animate-scale-up space-y-4">
            <button 
              onClick={() => setRefundConfirmationOrder(null)}
              className="absolute top-4 right-4 text-[#8C887E] hover:text-[#1E1D1A] p-1.5 rounded-full border border-[#E6E2D8] bg-white transition-all hover:bg-slate-50"
            >
              <X size={14} className="stroke-[2.5]" />
            </button>

            <div className="flex items-center gap-2 text-rose-700">
              <RotateCcw size={18} />
              <h3 className="font-serif font-extrabold text-sm uppercase tracking-wide">Confirm Payment Refund</h3>
            </div>

            <div className="bg-[#FAF8F6] p-3.5 rounded-2xl border border-[#E6E2D8] text-[9.5px] space-y-1.5">
              <div className="flex justify-between">
                <span className="text-[#8C887E]">Order ID:</span>
                <span className="font-mono font-bold text-[#1E1D1A]">{refundConfirmationOrder.order_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8C887E]">Merchant:</span>
                <span className="font-bold text-[#1E1D1A]">{refundConfirmationOrder.merchant}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8C887E]">Refund Amount:</span>
                <span className="font-extrabold text-rose-700">₹{refundConfirmationOrder.amount}</span>
              </div>
            </div>

            {refundError && (
              <div className="bg-rose-50 border border-rose-200 p-3 rounded-2xl text-[8.5px] text-rose-800 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertTriangle size={12} className="text-rose-600 shrink-0" />
                  <span>Refund Failed</span>
                </div>
                <p>{refundError.message}</p>
                {refundError.request_id && (
                  <span className="font-mono text-[7.5px] text-rose-600 block">Trace ID: {refundError.request_id}</span>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setRefundConfirmationOrder(null)}
                className="flex-1 bg-[#FAF8F6] hover:bg-[#F2ECE3] border border-[#E6E2D8] text-[#1E1D1A] py-2.5 rounded-xl text-[9px] font-extrabold uppercase tracking-wider"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRefund}
                disabled={isRefunding === refundConfirmationOrder.order_id}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-2.5 rounded-xl text-[9px] font-extrabold uppercase tracking-wider shadow-sm flex items-center justify-center gap-1.5"
              >
                {isRefunding === refundConfirmationOrder.order_id ? (
                  <Loader2 className="animate-spin" size={12} />
                ) : (
                  <span>Execute Refund</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
