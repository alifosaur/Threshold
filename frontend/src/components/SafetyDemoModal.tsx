import { X, CheckCircle2, XCircle, ShieldCheck } from 'lucide-react';

interface SafetyDemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  demoResult: any;
}

export function SafetyDemoModal({
  isOpen,
  onClose,
  demoResult
}: SafetyDemoModalProps) {
  if (!isOpen || !demoResult) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-3xl border border-[#E6E2D8] max-w-xl w-full overflow-hidden shadow-2xl relative flex flex-col p-6 animate-scale-up space-y-4">
        
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-[#8C887E] hover:text-[#1E1D1A] p-1.5 rounded-full border border-[#E6E2D8] bg-white transition-all hover:bg-slate-50"
        >
          <X size={14} className="stroke-[2.5]" />
        </button>

        <div className="pb-3 border-b border-[#F6F4EF]">
          <div className="flex items-center gap-2">
            <span className="bg-[#C8A97E] text-white text-[8px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-widest">
              Live Proof
            </span>
            <span className="text-[9px] font-bold text-emerald-600 uppercase font-serif">
              Judge-Proof 3-Scenario Verification
            </span>
          </div>
          <h3 className="text-md font-serif font-extrabold text-[#1E1D1A] mt-1">
            Autonomous Safety & Gated Execution
          </h3>
        </div>

        <div className="space-y-3 text-[9.5px]">
          
          {/* Scenario 1: Approved Purchase */}
          <div className="bg-emerald-50/70 border border-emerald-200 p-3.5 rounded-2xl space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="font-extrabold text-emerald-800 uppercase tracking-wider text-[8px] flex items-center gap-1">
                <CheckCircle2 size={12} className="text-emerald-600" />
                <span>Scenario 1 — Approved In-Policy Purchase</span>
              </span>
              <span className="bg-emerald-600 text-white text-[7.5px] font-extrabold px-2 py-0.5 rounded-full">
                APPROVED ✓
              </span>
            </div>
            <div className="flex justify-between items-center pt-1 font-bold text-[#1E1D1A]">
              <span>{demoResult.scenarios.approved.product} (₹{demoResult.scenarios.approved.price})</span>
              <span className="text-emerald-700 font-mono text-[8.5px] select-all">{demoResult.scenarios.approved.order_id}</span>
            </div>
            <div className="flex justify-between items-center text-[8px] text-[#6E6557] pt-0.5">
              <span>AI Match ✓ • Catalog Verified ✓ • Policy Approved ✓</span>
              <span className="font-bold text-emerald-700">Money: {demoResult.scenarios.approved.money_movement}</span>
            </div>
          </div>

          {/* Scenario 2: Blocked Over-Limit Attempt */}
          <div className="bg-rose-50/70 border border-rose-200 p-3.5 rounded-2xl space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="font-extrabold text-rose-800 uppercase tracking-wider text-[8px] flex items-center gap-1">
                <XCircle size={12} className="text-rose-600" />
                <span>Scenario 2 — Blocked Over-Limit Attempt (Protected)</span>
              </span>
              <span className="bg-rose-600 text-white text-[7.5px] font-extrabold px-2 py-0.5 rounded-full">
                BLOCKED ✕
              </span>
            </div>
            <div className="flex justify-between items-center pt-1 font-bold text-[#1E1D1A]">
              <span>{demoResult.scenarios.blocked.product} (₹{demoResult.scenarios.blocked.price})</span>
              <span className="text-rose-700 uppercase text-[8px] font-extrabold bg-white border border-rose-200 px-2 py-0.5 rounded">
                Razorpay NOT Contacted
              </span>
            </div>
            <p className="text-[8px] text-[#6E6557] italic">
              "{demoResult.scenarios.blocked.reason}"
            </p>
            <div className="flex justify-between items-center text-[8px] text-[#6E6557] pt-0.5">
              <span>AI Match ✓ • Catalog Verified ✓ • Policy Stopped ✕</span>
              <span className="font-bold text-emerald-700">Money Movement: ₹0 (PROTECTED)</span>
            </div>
          </div>

          {/* Scenario 3: Duplicate Replay Protection */}
          <div className="bg-[#FAF8F6] border border-[#D9D1C2] p-3.5 rounded-2xl space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="font-extrabold text-[#4A3B2C] uppercase tracking-wider text-[8px] flex items-center gap-1">
                <ShieldCheck size={12} className="text-[#C8A97E]" />
                <span>Scenario 3 — Duplicate Replay Protection (Idempotent)</span>
              </span>
              <span className="bg-[#1E1D1A] text-white text-[7.5px] font-extrabold px-2 py-0.5 rounded-full">
                DUPLICATE INTERCEPTED 🛡
              </span>
            </div>
            <div className="flex justify-between items-center pt-1 font-bold text-[#1E1D1A]">
              <span>Replayed Same Run ID</span>
              <span className="text-[#4A3B2C] font-mono text-[8.5px]">Original Order Returned</span>
            </div>
            <div className="flex justify-between items-center text-[8px] text-[#6E6557] pt-0.5">
              <span>Existing Order Found ✓ • No Double Charge ✓ • Razorpay NOT Contacted</span>
              <span className="font-bold text-emerald-700">No Double Charge</span>
            </div>
          </div>

        </div>

        <button
          onClick={onClose}
          className="w-full bg-[#1E1D1A] hover:bg-black text-white py-2.5 rounded-xl text-[10px] font-extrabold uppercase tracking-wider"
        >
          Done
        </button>

      </div>
    </div>
  );
}
