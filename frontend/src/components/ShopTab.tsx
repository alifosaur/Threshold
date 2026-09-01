import { useState, FormEvent } from 'react';
import { 
  Search, 
  ArrowRight, 
  Sparkles,
  ShieldAlert, 
  X, 
  Lock, 
  Unlock, 
  Loader2,
  Sliders
} from 'lucide-react';
import { CatalogItem } from '../types';

interface ShopTabProps {
  catalog: CatalogItem[];
  currentGoal: string;
  setCurrentGoal: (goal: string) => void;
  isExecuting: boolean;
  onExecuteAgent: (goal: string, isSafetyTest?: boolean) => void;
  maxSpend: number;
  sessionLimit: number;
  sessionSpent: number;
  policyLocked: boolean;
  approvedMerchants: string[];
  onSavePolicy: (limit: number, sessLimit: number, locked: boolean, merchants?: string[]) => Promise<void>;
  onRunSafetyDemo: () => Promise<void>;
  demoRunning: boolean;
}

export function ShopTab({
  catalog,
  currentGoal,
  setCurrentGoal,
  isExecuting,
  onExecuteAgent,
  maxSpend,
  sessionLimit,
  sessionSpent,
  policyLocked,
  approvedMerchants,
  onSavePolicy,
  onRunSafetyDemo,
  demoRunning
}: ShopTabProps) {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'apparel' | 'accessories' | 'electronics' | 'home'>('all');
  const [selectedDetailProduct, setSelectedDetailProduct] = useState<CatalogItem | null>(null);
  const [showControlsModal, setShowControlsModal] = useState<boolean>(false);
  const [editingLimit, setEditingLimit] = useState<string>(String(maxSpend));
  const [editingSessionLimit, setEditingSessionLimit] = useState<string>(String(sessionLimit));
  const [editingMerchants, setEditingMerchants] = useState<string>(approvedMerchants.join(', '));

  const filteredCatalog = catalog.filter(item => {
    if (selectedCategory === 'all') return true;
    return item.tags.toLowerCase().includes(selectedCategory);
  });

  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!currentGoal.trim()) return;
    onExecuteAgent(currentGoal, false);
  };

  const handleSuggestionClick = (text: string) => {
    setCurrentGoal(text);
    onExecuteAgent(text, false);
  };

  const buyDetailProduct = () => {
    if (!selectedDetailProduct) return;
    onExecuteAgent(`buy ${selectedDetailProduct.name.toLowerCase()} from ${selectedDetailProduct.merchant}`, false);
    setSelectedDetailProduct(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-8 animate-fade-in">
      
      {/* Top Hero Banner & Prompt Interface */}
      <div className="bg-white rounded-3xl border border-[#E6E2D8] p-6 md:p-8 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="text-[8px] font-extrabold text-[#C8A97E] uppercase tracking-widest bg-[#FAF8F6] border border-[#E6E2D8] px-3 py-1 rounded-full shadow-sm">
              Autonomous Commerce Platform
            </span>
            <h1 className="text-2xl md:text-3xl font-serif font-semibold text-[#1E1D1A] mt-2">
              Curated Catalog & AI Buyer
            </h1>
            <p className="text-xs text-[#8C887E] mt-1 max-w-xl">
              Describe what you want to buy. The agent resolves the exact item, passes Policy Engine guardrails, and creates an order.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={() => {
                setEditingLimit(String(maxSpend));
                setEditingSessionLimit(String(sessionLimit));
                setEditingMerchants(approvedMerchants.join(', '));
                setShowControlsModal(true);
              }}
              className="flex items-center gap-2 bg-[#FAF8F6] hover:bg-[#F2ECE3] border border-[#E6E2D8] text-[#1E1D1A] px-4 py-2.5 rounded-2xl text-[9.5px] font-extrabold uppercase tracking-wider transition-all shadow-sm"
            >
              <Sliders size={13} className="text-[#C8A97E]" />
              <span>Guardrails (Limit: ₹{maxSpend.toLocaleString()})</span>
            </button>
          </div>
        </div>

        {/* Natural Language Prompt Input */}
        <form onSubmit={handleFormSubmit} className="relative">
          <div className="relative flex items-center">
            <input
              type="text"
              value={currentGoal}
              onChange={(e) => setCurrentGoal(e.target.value)}
              placeholder="e.g. 'buy me a black oversized tee' or 'buy luxury cotton shirt from Luxe Mart'..."
              className="w-full bg-[#FAF8F6] border border-[#E6E2D8] focus:border-[#C8A97E] text-xs font-medium text-[#1E1D1A] placeholder-[#A39E93] rounded-2xl py-4 pl-12 pr-32 focus:outline-none transition-all shadow-inner"
            />
            <Search className="absolute left-4 text-[#8C887E]" size={16} />
            <button
              type="submit"
              disabled={isExecuting || !currentGoal.trim()}
              className="absolute right-2.5 bg-[#1E1D1A] hover:bg-black text-white px-5 py-2.5 rounded-xl text-[10px] font-extrabold tracking-wider uppercase transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50"
            >
              {isExecuting ? (
                <Loader2 className="animate-spin" size={12} />
              ) : (
                <>
                  <span>Instruct AI</span>
                  <ArrowRight size={12} />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Suggestion Chips */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-[8.5px]">
          <span className="font-bold text-[#8C887E] uppercase tracking-wider">Try Demo Intent:</span>
          <button
            onClick={() => handleSuggestionClick('buy a black oversized tee')}
            className="bg-[#FAF8F6] hover:bg-[#F2ECE3] border border-[#E6E2D8] text-[#4A4740] px-2.5 py-1 rounded-full font-medium transition-all"
          >
            "buy a black oversized tee" (₹699 ✓ Approved)
          </button>
          <button
            onClick={() => handleSuggestionClick('buy a sand cotton shirt from Luxe Mart')}
            className="bg-[#FAF8F6] hover:bg-[#F2ECE3] border border-[#E6E2D8] text-[#4A4740] px-2.5 py-1 rounded-full font-medium transition-all"
          >
            "buy sand shirt from Luxe Mart" (₹899 ✓ Authorized)
          </button>
          <button
            onClick={() => handleSuggestionClick('buy premium noise cancelling headphones')}
            className="bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 px-2.5 py-1 rounded-full font-medium transition-all"
          >
            "buy premium headphones" (₹4,999 ✕ Over Limit)
          </button>
          <button
            onClick={() => handleSuggestionClick('buy me a sports baseball cap')}
            className="bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 px-2.5 py-1 rounded-full font-medium transition-all"
          >
            "buy sports cap" (NO_EXACT_MATCH)
          </button>
        </div>
      </div>

      {/* Category Pills Filter */}
      <div className="flex items-center justify-between gap-4 border-b border-[#E6E2D8] pb-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {(['all', 'apparel', 'accessories', 'electronics', 'home'] as const).map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider transition-all ${
                selectedCategory === cat
                  ? 'bg-[#1E1D1A] text-white shadow-sm'
                  : 'bg-white border border-[#E6E2D8] text-[#8C887E] hover:text-[#1E1D1A]'
              }`}
            >
              {cat === 'all' ? 'All Products' : cat}
            </button>
          ))}
        </div>
        <span className="text-[9px] font-bold text-[#8C887E] shrink-0">
          Showing {filteredCatalog.length} of {catalog.length} items
        </span>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCatalog.map(item => {
          const isOverLimit = item.price > maxSpend;
          const isUnauthorized = !approvedMerchants.includes(item.merchant);

          return (
            <div
              key={item.id}
              onClick={() => setSelectedDetailProduct(item)}
              className="bg-white rounded-3xl border border-[#E6E2D8] overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col"
            >
              <div className="aspect-[4/3] bg-[#FAF8F6] relative overflow-hidden border-b border-[#E6E2D8]/60">
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <span className="absolute top-3 left-3 bg-[#1E1D1A]/90 backdrop-blur-sm text-white px-2.5 py-1 rounded-full text-[7.5px] font-extrabold uppercase tracking-widest shadow-sm">
                  {item.tags.split(',')[0]}
                </span>
                {isOverLimit ? (
                  <span className="absolute top-3 right-3 bg-rose-500 text-white px-2 py-0.5 rounded-full text-[7px] font-extrabold uppercase tracking-wider shadow-sm">
                    Exceeds Limit
                  </span>
                ) : isUnauthorized ? (
                  <span className="absolute top-3 right-3 bg-amber-500 text-white px-2 py-0.5 rounded-full text-[7px] font-extrabold uppercase tracking-wider shadow-sm">
                    Unapproved Merchant
                  </span>
                ) : (
                  <span className="absolute top-3 right-3 bg-emerald-600 text-white px-2 py-0.5 rounded-full text-[7px] font-extrabold uppercase tracking-wider shadow-sm">
                    Policy Approved
                  </span>
                )}
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <span className="text-[7.5px] font-extrabold text-[#C8A97E] uppercase tracking-widest block">
                    {item.merchant}
                  </span>
                  <h3 className="text-xs font-serif font-extrabold text-[#1E1D1A] uppercase tracking-wide mt-1 group-hover:text-[#C8A97E] transition-colors">
                    {item.name}
                  </h3>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-[#FAF8F6]">
                  <div>
                    <span className="text-[7.5px] text-[#8C887E] uppercase tracking-wider font-bold block">Price</span>
                    <span className="text-sm font-extrabold text-[#1E1D1A]">₹{item.price.toLocaleString()}</span>
                  </div>
                  <button className="bg-[#FAF8F6] group-hover:bg-[#1E1D1A] group-hover:text-white border border-[#E6E2D8] text-[#1E1D1A] px-3 py-1.5 rounded-xl text-[8.5px] font-extrabold uppercase tracking-wider transition-all flex items-center gap-1">
                    <span>Inspect</span>
                    <ArrowRight size={10} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Product Detail Modal */}
      {selectedDetailProduct && (
        <div 
          onClick={() => setSelectedDetailProduct(null)}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl border border-[#E6E2D8] max-w-md w-full overflow-hidden shadow-2xl relative flex flex-col p-6 animate-scale-up cursor-default"
          >
            <button 
              onClick={() => setSelectedDetailProduct(null)}
              className="absolute top-5 right-5 z-20 text-[#8C887E] hover:text-[#1E1D1A] p-1.5 rounded-full border border-[#E6E2D8] bg-white transition-all hover:bg-slate-50 shadow-sm flex items-center justify-center"
              aria-label="Close modal"
            >
              <X size={14} className="stroke-[2.5]" />
            </button>

            <div className="w-full aspect-[4/3] rounded-2xl bg-[#FAF8F6] overflow-hidden border border-[#E6E2D8]/50 relative mb-4">
              <img 
                src={selectedDetailProduct.image_url} 
                alt={selectedDetailProduct.name} 
                className="w-full h-full object-cover"
              />
              <span className="absolute top-3 left-3 bg-[#1E1D1A] text-white px-2.5 py-1 rounded-full text-[7px] font-extrabold uppercase tracking-widest shadow-sm">
                ID: {selectedDetailProduct.id}
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <span className="text-[8px] font-extrabold tracking-widest text-[#C8A97E] uppercase block">
                  {selectedDetailProduct.tags.split(',')[0]}
                </span>
                <h3 className="text-md font-serif font-extrabold text-[#1E1D1A] uppercase tracking-wide mt-1">
                  {selectedDetailProduct.name}
                </h3>
                <span className="text-[9px] text-[#8C887E] font-bold uppercase tracking-wider block mt-0.5">
                  Supplied by {selectedDetailProduct.merchant}
                </span>
              </div>

              <div className="flex justify-between items-center bg-[#FAF8F6] p-3.5 rounded-2xl border border-[#E6E2D8]/50">
                <div className="flex flex-col">
                  <span className="text-[8px] font-bold text-[#8C887E] uppercase tracking-wider">Purchase Price</span>
                  <span className="text-md font-extrabold text-[#1E1D1A] mt-0.5">₹{selectedDetailProduct.price.toLocaleString()}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[8px] font-bold text-[#8C887E] uppercase tracking-wider">Availability</span>
                  <span className="text-[9px] font-extrabold text-emerald-600 uppercase mt-0.5 bg-emerald-50 px-2 py-0.5 border border-emerald-100 rounded-full leading-none select-none">
                    ● In Stock
                  </span>
                </div>
              </div>

              <div className={`rounded-2xl p-3 flex items-start gap-2.5 text-[9px] border ${
                selectedDetailProduct.price > maxSpend
                  ? 'bg-rose-50 border-rose-100 text-rose-800'
                  : (sessionSpent + selectedDetailProduct.price) > sessionLimit
                  ? 'bg-rose-50 border-rose-100 text-rose-800'
                  : !approvedMerchants.includes(selectedDetailProduct.merchant)
                  ? 'bg-amber-50 border-amber-100 text-amber-800'
                  : 'bg-emerald-50 border-emerald-100 text-emerald-800'
              }`}>
                <ShieldAlert size={15} className={`shrink-0 mt-0.5 ${
                  selectedDetailProduct.price > maxSpend || (sessionSpent + selectedDetailProduct.price) > sessionLimit
                    ? 'text-rose-600'
                    : !approvedMerchants.includes(selectedDetailProduct.merchant)
                    ? 'text-amber-600'
                    : 'text-emerald-600'
                }`} />
                <div className="flex flex-col">
                  <span className="font-extrabold uppercase tracking-wide">
                    {selectedDetailProduct.price > maxSpend
                      ? '⚠️ Exceeds Txn Spend Limit'
                      : (sessionSpent + selectedDetailProduct.price) > sessionLimit
                      ? '⚠️ Exceeds Session Spend Limit'
                      : !approvedMerchants.includes(selectedDetailProduct.merchant)
                      ? '⚠️ Unauthorized Merchant'
                      : '🔒 Protected by Threshold'}
                  </span>
                  <span className="font-medium mt-0.5 leading-relaxed">
                    {selectedDetailProduct.price > maxSpend
                      ? `Price (₹${selectedDetailProduct.price.toLocaleString()}) exceeds your ₹${maxSpend.toLocaleString()} transaction limit. Policy Engine will block this transaction.`
                      : (sessionSpent + selectedDetailProduct.price) > sessionLimit
                      ? `Adding ₹${selectedDetailProduct.price.toLocaleString()} brings session spend to ₹${(sessionSpent + selectedDetailProduct.price).toLocaleString()}, exceeding your ₹${sessionLimit.toLocaleString()} session limit.`
                      : !approvedMerchants.includes(selectedDetailProduct.merchant)
                      ? `Merchant "${selectedDetailProduct.merchant}" is not whitelisted (${approvedMerchants.join(', ')}). Policy Engine will block this transaction.`
                      : `Within your ₹${maxSpend.toLocaleString()} txn limit and ₹${sessionLimit.toLocaleString()} session limit (Approved merchant: ${selectedDetailProduct.merchant}).`}
                  </span>
                </div>
              </div>

              <button 
                onClick={buyDetailProduct}
                className="w-full bg-[#1E1D1A] hover:bg-black text-white py-3.5 rounded-2xl text-xs font-bold transition-all shadow-md uppercase tracking-wider flex items-center justify-center gap-2 group"
              >
                <span>Buy with Threshold</span>
                <ArrowRight size={14} className="stroke-[2.5] transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Controls / Guardrails Modal */}
      {showControlsModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl border border-[#E6E2D8] max-w-md w-full overflow-hidden shadow-2xl relative flex flex-col p-6 animate-scale-up">
            <button 
              onClick={() => setShowControlsModal(false)}
              className="absolute top-4 right-4 text-[#8C887E] hover:text-[#1E1D1A] p-1.5 rounded-full border border-[#E6E2D8] bg-white transition-all hover:bg-slate-50"
            >
              <X size={14} className="stroke-[2.5]" />
            </button>

            <div className="pb-3 border-b border-[#F6F4EF] mb-4">
              <span className="text-[8px] font-bold tracking-widest text-[#B9A382] uppercase block">THRESHOLD POLICY ENGINE</span>
              <h2 className="text-sm font-extrabold text-[#1E1D1A] tracking-tight mt-0.5">Autonomous Commerce Guardrails</h2>
            </div>

            <div className="space-y-4">
              <div className="bg-[#FAF8F6] p-3.5 rounded-2xl border border-[#E6E2D8] space-y-2">
                <div className="flex justify-between items-center text-[9px]">
                  <span className="font-extrabold text-[#1E1D1A] uppercase tracking-wider">Session Spending Tracker</span>
                  <span className="font-bold text-[#8C887E]">₹{sessionSpent.toLocaleString()} / ₹{sessionLimit.toLocaleString()}</span>
                </div>
                <div className="w-full bg-[#EAE6DD] rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-emerald-600 h-full rounded-full transition-all"
                    style={{ width: `${Math.min(100, (sessionSpent / (sessionLimit || 1)) * 100)}%` }}
                  ></div>
                </div>
                <span className="text-[7.5px] text-[#8C887E] block leading-tight">
                  Total cumulative test spend processed this session across approved orders.
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col">
                  <label className="text-[8px] font-extrabold text-[#8C887E] uppercase tracking-wider mb-1">
                    Txn Limit (₹)
                  </label>
                  <input 
                    type="number"
                    disabled={policyLocked}
                    value={editingLimit}
                    onChange={(e) => setEditingLimit(e.target.value)}
                    className="bg-white border border-[#E6E2D8] rounded-xl px-3 py-2 text-xs font-bold text-[#1E1D1A] focus:outline-none focus:border-[#C8A97E] disabled:bg-slate-50"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-[8px] font-extrabold text-[#8C887E] uppercase tracking-wider mb-1">
                    Session Limit (₹)
                  </label>
                  <input 
                    type="number"
                    disabled={policyLocked}
                    value={editingSessionLimit}
                    onChange={(e) => setEditingSessionLimit(e.target.value)}
                    className="bg-white border border-[#E6E2D8] rounded-xl px-3 py-2 text-xs font-bold text-[#1E1D1A] focus:outline-none focus:border-[#C8A97E] disabled:bg-slate-50"
                  />
                </div>
              </div>

              <div className="flex flex-col">
                <label className="text-[8px] font-extrabold text-[#8C887E] uppercase tracking-wider mb-1">
                  Approved Merchants (comma-separated)
                </label>
                <input 
                  type="text"
                  disabled={policyLocked}
                  value={editingMerchants}
                  onChange={(e) => setEditingMerchants(e.target.value)}
                  placeholder="Razorpay Store, Luxe Mart, Urban Basics"
                  className="bg-white border border-[#E6E2D8] rounded-xl px-3 py-2 text-xs font-bold text-[#1E1D1A] focus:outline-none focus:border-[#C8A97E] disabled:bg-slate-50"
                />
              </div>

              {policyLocked ? (
                <button 
                  onClick={() => onSavePolicy(maxSpend, sessionLimit, false, approvedMerchants)}
                  className="w-full bg-slate-100 hover:bg-slate-200 border border-slate-200 text-[#4A4740] py-2 rounded-xl text-[9px] font-extrabold transition-all uppercase tracking-wider flex items-center justify-center gap-1.5"
                >
                  <Unlock size={11} />
                  <span>Unlock Safety Guardrails</span>
                </button>
              ) : (
                <button 
                  onClick={() => {
                    const l = parseFloat(editingLimit) || 1000;
                    const s = parseFloat(editingSessionLimit) || 1500;
                    const mList = editingMerchants
                      .split(',')
                      .map(m => m.trim())
                      .filter(m => m.length > 0);
                    onSavePolicy(l, s, true, mList.length > 0 ? mList : approvedMerchants);
                  }}
                  className="w-full bg-[#1E1D1A] hover:bg-black text-white py-2 rounded-xl text-[9px] font-extrabold transition-all shadow-sm uppercase tracking-wider flex items-center justify-center gap-1.5"
                >
                  <Lock size={11} />
                  <span>Lock Policy Limits & Whitelist</span>
                </button>
              )}

              <div className="bg-[#FAF8F6] p-3 rounded-2xl border border-[#E6E2D8]/50 flex flex-col text-[8.5px]">
                <span className="font-extrabold text-[#8C887E] tracking-wider uppercase">APPROVED MERCHANTS WHITELIST</span>
                <div className="flex gap-2 mt-1.5 flex-wrap">
                  {approvedMerchants.map(m => (
                    <span key={m} className="bg-white border border-[#E6E2D8] px-2 py-0.5 rounded-md font-bold text-emerald-700">
                      ✓ {m}
                    </span>
                  ))}
                </div>
              </div>

              <div className="border-t border-[#F6F4EF] pt-3 flex flex-col gap-2">
                <button
                  onClick={onRunSafetyDemo}
                  disabled={demoRunning}
                  className="w-full bg-[#C8A97E] hover:bg-[#B9A382] text-white py-2.5 rounded-xl text-[9.5px] font-extrabold transition-all shadow-sm uppercase tracking-wider flex items-center justify-center gap-2"
                >
                  {demoRunning ? (
                    <Loader2 className="animate-spin" size={13} />
                  ) : (
                    <>
                      <Sparkles size={13} />
                      <span>Run Judge-Proof Safety Demo</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
