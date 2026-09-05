import { 
  X, 
  Search, 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Loader2
} from 'lucide-react';
import { 
  AuditLogEntry, 
  CatalogItem, 
  PolicyDecisionObject, 
  CrossSellItem 
} from '../types';

interface AgentActivityTabProps {
  isOpen: boolean;
  onClose: () => void;
  appState: 'idle' | 'working' | 'result' | 'error';
  currentRunSteps: AuditLogEntry[];
  lastMatchStatus: 'EXACT_MATCH' | 'NO_EXACT_MATCH' | null;
  lastAlternatives: number[];
  lastReason: string;
  lastCrossSell: CrossSellItem | null;
  lastDecision: PolicyDecisionObject | null;
  lastCreatedOrderId: string | null;
  lastOrderStatus: string;
  catalog: CatalogItem[];
  selectedProductId: number | null;
  isSafetyTesting: boolean;
  onExecuteAgent: (goal: string, isSafetyTest?: boolean) => void;
  onVerifyPayment: (orderId: string) => Promise<void>;
  isVerifyingPayment: string | null;
  onOpenProductDetail: (item: CatalogItem) => void;
}

export function AgentActivityTab({
  isOpen,
  onClose,
  appState,
  currentRunSteps,
  lastMatchStatus,
  lastAlternatives,
  lastReason,
  lastCrossSell,
  lastDecision,
  lastCreatedOrderId,
  lastOrderStatus,
  catalog,
  selectedProductId,
  isSafetyTesting,
  onExecuteAgent,
  onVerifyPayment,
  isVerifyingPayment,
  onOpenProductDetail
}: AgentActivityTabProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-3xl border border-[#E6E2D8] max-w-md w-full overflow-hidden shadow-2xl relative flex flex-col p-6 animate-scale-up">
        
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-[#8C887E] hover:text-[#1E1D1A] p-1.5 rounded-full border border-[#E6E2D8] bg-white transition-all hover:bg-slate-50"
        >
          <X size={14} className="stroke-[2.5]" />
        </button>

        <div className="pb-3 border-b border-[#F6F4EF] mb-4">
          <span className="text-[8px] font-bold tracking-widest text-[#B9A382] uppercase block">DECISION ENGINE</span>
          <h2 className="text-sm font-extrabold text-[#1E1D1A] tracking-tight mt-0.5">Autonomous Execution Timeline</h2>
        </div>

        <div className="flex-1 overflow-y-auto max-h-[75vh]">
          
          {appState === 'working' && (
            <div className="space-y-4 py-8 px-4 flex flex-col justify-center">
              <div className="flex gap-3 items-center">
                <div className="h-6 w-6 rounded-full bg-[#FAF8F5] text-[#8C887E] border border-[#E6E2D8] flex items-center justify-center font-bold text-[9px] shrink-0">
                  01
                </div>
                <div>
                  <div className="font-bold text-[#8C887E] uppercase tracking-wider text-[7.5px]">01 USER INTENT</div>
                  <div className="font-extrabold text-[#1E1D1A] text-xs">Analyzing natural language query...</div>
                </div>
              </div>

              <div className="flex gap-3 items-center">
                <div className="h-6 w-6 rounded-full bg-[#FAF8F5] text-[#8C887E] border border-[#E6E2D8] flex items-center justify-center font-bold text-[9px] shrink-0 animate-bounce">
                  <Search size={11} />
                </div>
                <div>
                  <div className="font-bold text-[#8C887E] uppercase tracking-wider text-[7.5px]">02-03 CATALOG RESOLUTION</div>
                  <div className="font-extrabold text-[#8C887E]">Authoritative SQLite lookup...</div>
                </div>
              </div>

              <div className="flex gap-3 items-center">
                <div className="h-6 w-6 rounded-full bg-[#FAF8F5] text-[#8C887E] border border-[#E6E2D8] flex items-center justify-center font-bold text-[9px] shrink-0">
                  <ShieldAlert size={11} />
                </div>
                <div>
                  <div className="font-bold text-[#8C887E] uppercase tracking-wider text-[7.5px]">04-05 POLICY & PAYMENT</div>
                  <div className="font-extrabold text-[#8C887E]">Gating money movement...</div>
                </div>
              </div>
            </div>
          )}

          {appState === 'result' && (
            <div className="space-y-4 w-full">
              
              {lastMatchStatus === 'EXACT_MATCH' ? (
                (() => {
                  const rejection = currentRunSteps.find(s => 
                    (s.actor === 'policy_engine' && (s.status === 'REJECTED' || s.status === 'FAILED')) ||
                    s.status === 'REJECTED'
                  );
                  
                  const isBlocked = 
                    isSafetyTesting || 
                    !!rejection || 
                    (lastDecision as any)?.status === 'BLOCKED' || 
                    (lastDecision as any)?.status === 'REJECTED' ||
                    lastDecision?.razorpay_contacted === false;

                  const resolvedItemId = 
                    (lastDecision as any)?.item_id ||
                    currentRunSteps.find(s => (s.details as any)?.item_id)?.details?.item_id ||
                    currentRunSteps.find(s => (s.details as any)?.selected_item_id)?.details?.selected_item_id ||
                    (currentRunSteps.find(s => (s.details as any)?.product_id)?.details as any)?.product_id ||
                    selectedProductId;

                  const item = 
                    (resolvedItemId ? catalog.find(i => i.id === Number(resolvedItemId)) : null) ||
                    (lastDecision?.product ? catalog.find(i => i.name.toLowerCase() === lastDecision.product?.toLowerCase()) : null) ||
                    (lastDecision?.product ? {
                      id: 0,
                      name: lastDecision.product,
                      price: lastDecision.price || lastDecision.amount || 0,
                      merchant: lastDecision.merchant || 'Catalog Merchant',
                      image_url: '/products/product_1.jpg',
                      tags: 'product',
                      stock: 10,
                      currency: 'INR'
                    } as CatalogItem : null) ||
                    catalog[0];

                  return (
                    <div className="space-y-4">
                      <div className="flex gap-3 p-3 bg-[#FAF8F6] border border-[#E6E2D8]/60 rounded-2xl items-center">
                        <img 
                          src={item?.image_url} 
                          alt={item?.name} 
                          className="h-12 w-12 rounded-xl object-cover border border-[#E6E2D8]/80 bg-white" 
                        />
                        <div className="flex flex-col min-w-0">
                          <span className="text-[7px] font-extrabold text-[#C8A97E] uppercase tracking-widest leading-none">Best Match Found</span>
                          <h4 className="font-extrabold text-[11px] text-[#1E1D1A] uppercase tracking-wide truncate mt-1">{item?.name}</h4>
                          <span className="text-[8.5px] text-[#8C887E] truncate font-semibold mt-0.5">{item?.merchant} • ₹{item?.price}</span>
                        </div>
                      </div>

                      {/* 6-Step Decision Timeline */}
                      <div className="space-y-2 bg-[#FAF8F6] p-3.5 rounded-2xl border border-[#E6E2D8]/60 text-[8.5px]">
                        <span className="font-extrabold text-[#8C887E] uppercase tracking-wider block mb-1">
                          Agent Decision Timeline
                        </span>
                        <div className="flex justify-between items-center text-[#6E6557]">
                          <span>01 USER INTENT:</span>
                          <span className="text-emerald-700 font-extrabold">CONFIRMED ✓</span>
                        </div>
                        <div className="flex justify-between items-center text-[#6E6557]">
                          <span>02 AI MATCH:</span>
                          <span className="text-emerald-700 font-extrabold">EXACT_MATCH ✓</span>
                        </div>
                        <div className="flex justify-between items-center text-[#6E6557]">
                          <span>03 CATALOG VALIDATION:</span>
                          <span className="text-emerald-700 font-extrabold">SQLITE VERIFIED ✓</span>
                        </div>
                        <div className="flex justify-between items-center text-[#6E6557]">
                          <span>04 POLICY EVALUATION:</span>
                          {isBlocked ? (
                            <span className="text-rose-600 font-extrabold">BLOCKED ✕</span>
                          ) : (
                            <span className="text-emerald-700 font-extrabold">APPROVED ✓</span>
                          )}
                        </div>
                        <div className="flex justify-between items-center text-[#6E6557]">
                          <span>05 PAYMENT GATE:</span>
                          {isBlocked ? (
                            <span className="text-rose-600 font-extrabold">NOT CONTACTED 🛡</span>
                          ) : (
                            <span className="text-emerald-700 font-extrabold">ORDER CREATED ✓</span>
                          )}
                        </div>
                        <div className="flex justify-between items-center text-[#6E6557]">
                          <span>06 AUDIT RECORD:</span>
                          <span className="text-emerald-700 font-extrabold">PERMANENTLY SAVED ✓</span>
                        </div>
                      </div>

                      {/* Blocked Safety Card or Payment State Machine Outcome */}
                      {isBlocked ? (
                        <div className="bg-rose-50/80 border border-rose-200 rounded-2xl p-4 flex flex-col space-y-2">
                          <div className="flex items-center gap-2 text-rose-800">
                            <XCircle size={15} />
                            <span className="text-[10.5px] font-extrabold uppercase tracking-wide">Purchase Blocked by Policy</span>
                          </div>
                          <p className="text-[9px] text-rose-700 leading-relaxed font-medium">
                            {lastDecision?.reason || rejection?.reasoning || 'Transaction exceeds configured spending limit or fails merchant authorization policy.'}
                          </p>
                          <div className="bg-white/80 border border-rose-100 p-2.5 rounded-xl text-[8px] text-rose-800 space-y-1">
                            <div className="flex justify-between">
                              <span className="font-bold">Violated Rule:</span>
                              <span className="font-extrabold">{lastDecision?.rule_violated || 'spending_limit'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="font-bold">Razorpay Contacted:</span>
                              <span className="font-extrabold">false (Zero Money Movement)</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 space-y-3">
                          <div className="flex justify-between items-center text-emerald-900">
                            <div className="flex items-center gap-1.5 font-extrabold text-[10.5px] uppercase tracking-wide">
                              <CheckCircle2 size={15} className="text-emerald-600" />
                              <span>Order Gated & Initialized</span>
                            </div>
                            <span className="text-[8px] bg-emerald-100/80 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                              {lastOrderStatus}
                            </span>
                          </div>

                          <div className="bg-white/90 border border-emerald-100 p-2.5 rounded-xl text-[8px] text-emerald-900 space-y-1">
                            <div className="flex justify-between">
                              <span className="font-bold">Razorpay Order ID:</span>
                              <span className="font-extrabold font-mono">{lastCreatedOrderId || 'order_active'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="font-bold">Amount:</span>
                              <span className="font-extrabold">₹{item?.price}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="font-bold">Payment State:</span>
                              <span className="font-extrabold text-indigo-700">{lastOrderStatus}</span>
                            </div>
                          </div>

                          {lastOrderStatus === 'PAYMENT_PENDING' && lastCreatedOrderId && (
                            <button
                              onClick={() => onVerifyPayment(lastCreatedOrderId)}
                              disabled={isVerifyingPayment === lastCreatedOrderId}
                              className="w-full bg-emerald-700 hover:bg-emerald-800 text-white py-2.5 rounded-xl text-[9px] font-extrabold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-sm"
                            >
                              {isVerifyingPayment === lastCreatedOrderId ? (
                                <Loader2 className="animate-spin" size={12} />
                              ) : (
                                <span>Simulate Gateway Payment Verification</span>
                              )}
                            </button>
                          )}

                          {lastOrderStatus === 'COMPLETED' && (
                            <div className="text-center text-[8.5px] font-extrabold text-emerald-800 bg-emerald-100/60 py-1.5 rounded-lg">
                              ✓ Transaction Fully Settled & Completed
                            </div>
                          )}

                          {lastCrossSell && item && (
                            <div className="pt-2.5 border-t border-emerald-200/60 text-left w-full space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-[8px] font-extrabold text-[#C8A97E] uppercase tracking-widest flex items-center gap-1">
                                  <span>✨ AI REVENUE OPPORTUNITY</span>
                                </span>
                                <span className="text-[7.5px] bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full font-extrabold uppercase">
                                  Recommendation Only
                                </span>
                              </div>

                              <div className="bg-white border border-[#E6E2D8] p-3 rounded-2xl flex flex-col space-y-2.5 shadow-sm">
                                <div className="flex items-center gap-2.5">
                                  <img
                                    src={lastCrossSell.image_url}
                                    alt={lastCrossSell.name}
                                    className="h-11 w-11 rounded-xl object-cover border border-[#E6E2D8] bg-[#FAF8F6] shrink-0"
                                  />
                                  <div className="flex flex-col min-w-0 flex-1">
                                    <h5 className="font-extrabold text-[10px] text-[#1E1D1A] truncate">{lastCrossSell.name}</h5>
                                    <span className="text-[8px] text-[#8C887E] font-bold">₹{lastCrossSell.price} • {lastCrossSell.merchant}</span>
                                    <p className="text-[8px] text-[#6E6557] italic line-clamp-2 mt-0.5">"{lastCrossSell.reasoning}"</p>
                                  </div>
                                </div>

                                {/* Basket & Policy Breakdown */}
                                <div className="bg-[#FAF8F6] border border-[#E6E2D8]/60 p-2 rounded-xl text-[8px] space-y-1 text-[#6E6557]">
                                  <div className="flex justify-between">
                                    <span>Primary Purchase:</span>
                                    <span className="font-bold text-[#1E1D1A]">{item.name} (₹{item.price})</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Incremental Revenue:</span>
                                    <span className="font-extrabold text-emerald-700">+₹{lastCrossSell.price}</span>
                                  </div>
                                  <div className="flex justify-between border-t border-[#E6E2D8]/40 pt-1 font-extrabold text-[#1E1D1A]">
                                    <span>Potential Basket:</span>
                                    <span>₹{item.price + lastCrossSell.price}</span>
                                  </div>
                                  {lastDecision?.transaction_limit && (
                                    <div className="flex justify-between text-[7.5px] text-[#8C887E]">
                                      <span>Policy Headroom:</span>
                                      <span>₹{Math.max(0, lastDecision.transaction_limit - item.price)} available under ₹{lastDecision.transaction_limit} limit</span>
                                    </div>
                                  )}
                                </div>

                                <div className="text-[7.5px] text-[#8C887E] italic text-center">
                                  🔒 Recommendation ≠ Authorization. Requires explicit buyer approval.
                                </div>

                                <button
                                  onClick={() => {
                                    onExecuteAgent(`buy ${lastCrossSell.name.toLowerCase()} from ${lastCrossSell.merchant}`, false);
                                  }}
                                  className="w-full bg-[#1E1D1A] hover:bg-black text-white py-2 rounded-xl text-[8.5px] font-extrabold uppercase tracking-wider transition-all shadow-sm flex items-center justify-center gap-1.5"
                                >
                                  <span>Authorize & Buy Recommended Item (+₹{lastCrossSell.price})</span>
                                </button>
                              </div>
                            </div>
                          )}

                          <button 
                            onClick={onClose}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl text-[10px] font-extrabold uppercase tracking-wider"
                          >
                            Done
                          </button>
                        </div>
                      )}

                    </div>
                  );
                })()
              ) : (
                // NO EXACT MATCH VIEWS
                <div className="space-y-4">
                  <div className="bg-amber-50 border border-amber-100 p-3.5 rounded-2xl flex items-start gap-2.5">
                    <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={15} />
                    <div className="flex flex-col text-[10px]">
                      <span className="font-extrabold text-[#1E1D1A]">I couldn't find a matching product in the catalog.</span>
                      <p className="text-[#6E6557] font-medium mt-1 leading-relaxed italic">
                        "{lastReason}"
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-[8px] font-extrabold text-[#8C887E] tracking-widest uppercase block border-t border-[#F6F4EF] pt-3">
                      Closest alternatives:
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      {lastAlternatives.map(altId => {
                        const alt = catalog.find(c => c.id === altId);
                        if (!alt) return null;
                        return (
                          <div
                            key={alt.id}
                            onClick={() => {
                              onClose();
                              onOpenProductDetail(alt);
                            }}
                            className="bg-[#FAF8F6] border border-[#E6E2D8] p-2 rounded-2xl flex gap-2 items-center cursor-pointer hover:bg-white transition-all"
                          >
                            <img src={alt.image_url} alt={alt.name} className="h-8 w-8 rounded-lg object-cover" />
                            <div className="flex flex-col min-w-0">
                              <span className="text-[8px] font-bold text-[#1E1D1A] truncate">{alt.name}</span>
                              <span className="text-[7.5px] text-[#8C887E]">₹{alt.price}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <button 
                    onClick={onClose}
                    className="w-full bg-[#1E1D1A] hover:bg-black text-white py-2.5 rounded-xl text-[10px] font-extrabold uppercase tracking-wider"
                  >
                    Browse Available Products
                  </button>
                </div>
              )}

            </div>
          )}

          {appState === 'error' && (
            <div className="text-center py-6 px-4 flex flex-col items-center justify-center space-y-3 max-w-[260px] mx-auto">
              <div className="p-2.5 bg-rose-50 rounded-full border border-rose-100 text-rose-500">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="text-[10.5px] font-extrabold text-[#1E1D1A] uppercase tracking-wide">⚠ Request Stopped</h3>
                <p className="text-[9px] text-[#8C887E] mt-1 leading-relaxed">
                  The autonomous action was safely halted by Threshold's fail-closed guardrails.
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-full bg-[#FAF8F6] hover:bg-[#F2ECE3] border border-[#E6E2D8] text-[#1E1D1A] py-2 rounded-xl text-[9px] font-extrabold uppercase tracking-wider"
              >
                Dismiss
              </button>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
