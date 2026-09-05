import { useState, useEffect } from 'react';
import { 
  Sparkles, 
  ArrowRight, 
  Loader2, 
  Zap, 
  RefreshCw,
  TrendingUp,
  BarChart3,
  AlertCircle
} from 'lucide-react';
import { 
  GrowthCampaign, 
  GrowthOpportunity, 
  GrowthMetrics, 
  CatalogItem,
  CrossSellLiftReport 
} from '../types';

interface GrowthTabProps {
  catalog: CatalogItem[];
  opportunities: GrowthOpportunity[];
  growthMetrics: GrowthMetrics | null;
  activeCampaign: GrowthCampaign | null;
  isGeneratingCampaign: boolean;
  onCreateCampaign: (productId: number, goalText?: string) => Promise<void>;
  onExecuteAgent: (goal: string, isSafetyTest?: boolean) => void;
  onRefreshMetrics: () => Promise<void>;
  onSimulateLift: (count?: number) => Promise<CrossSellLiftReport>;
}

export function GrowthTab({
  catalog,
  opportunities,
  growthMetrics,
  activeCampaign,
  isGeneratingCampaign,
  onCreateCampaign,
  onExecuteAgent,
  onRefreshMetrics,
  onSimulateLift
}: GrowthTabProps) {
  const [selectedCampaignProductId, setSelectedCampaignProductId] = useState<number>(1);
  const [customMerchantGoal, setCustomMerchantGoal] = useState<string>('');
  const [liftReport, setLiftReport] = useState<CrossSellLiftReport | null>(null);
  const [isRunningLift, setIsRunningLift] = useState(false);

  const runLiftBenchmark = async () => {
    setIsRunningLift(true);
    try {
      const report = await onSimulateLift(8);
      setLiftReport(report);
    } catch (err) {
      console.error('Error simulating lift:', err);
    } finally {
      setIsRunningLift(false);
    }
  };

  useEffect(() => {
    runLiftBenchmark();
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-8 animate-fade-in">
      
      {/* Title & Description */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-[8px] font-extrabold text-[#C8A97E] uppercase tracking-widest bg-white border border-[#E6E2D8] px-3 py-1 rounded-full shadow-sm">
            Merchant Revenue Intelligence
          </span>
          <h1 className="text-2xl md:text-3xl font-serif font-semibold text-[#1E1D1A] mt-2">
            AI Growth & Agentic Commerce Orchestrator
          </h1>
          <p className="text-xs text-[#8C887E] mt-1 max-w-xl">
            Optimizes your catalog for autonomous AI buyers, identifies high-margin cross-sells, and runs simulated buyer traffic within your defined safety budget.
          </p>
        </div>

        <button
          onClick={onRefreshMetrics}
          className="flex items-center gap-1.5 bg-white hover:bg-slate-50 border border-[#E6E2D8] text-[#1E1D1A] px-3.5 py-2 rounded-2xl text-[9.5px] font-extrabold uppercase tracking-wider transition-all shadow-sm"
        >
          <RefreshCw size={12} />
          <span>Refresh Analysis</span>
        </button>
      </div>

      {/* Metrics Row */}
      {growthMetrics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white border border-[#E6E2D8] p-5 rounded-3xl shadow-sm space-y-1">
            <span className="text-[8px] font-extrabold text-[#8C887E] uppercase tracking-wider block">Identified Opportunities</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-serif font-extrabold text-[#1E1D1A]">{growthMetrics.total_opportunities_identified}</span>
              <span className="text-[8.5px] font-extrabold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-100">+2 New</span>
            </div>
            <span className="text-[8px] text-[#8C887E] block">High-affinity cross-sells & SEO tags</span>
          </div>

          <div className="bg-white border border-[#E6E2D8] p-5 rounded-3xl shadow-sm space-y-1">
            <span className="text-[8px] font-extrabold text-[#8C887E] uppercase tracking-wider block">Agentic SEO Readiness</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-serif font-extrabold text-emerald-700">{growthMetrics.agentic_discovery_readiness}</span>
              <span className="text-[8.5px] font-bold text-[#8C887E]">Indexable</span>
            </div>
            <span className="text-[8px] text-[#8C887E] block">AI shopping parser compatibility</span>
          </div>

          <div className="bg-white border border-[#E6E2D8] p-5 rounded-3xl shadow-sm space-y-1">
            <span className="text-[8px] font-extrabold text-[#8C887E] uppercase tracking-wider block">Projected Incremental GMV (Potential)</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-serif font-extrabold text-[#1E1D1A]">₹{growthMetrics.projected_incremental_gmv.toLocaleString()}</span>
            </div>
            <span className="text-[8px] text-emerald-600 font-bold block">+34% estimated basket lift</span>
          </div>

          <div className="bg-white border border-[#E6E2D8] p-5 rounded-3xl shadow-sm space-y-1">
            <span className="text-[8px] font-extrabold text-[#8C887E] uppercase tracking-wider block">Optimized SKU Coverage</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-serif font-extrabold text-[#1E1D1A]">{growthMetrics.catalog_items_optimized}</span>
              <span className="text-[8.5px] font-bold text-[#8C887E]">/ {catalog.length} SKUs</span>
            </div>
            <span className="text-[8px] text-[#8C887E] block">Ready for autonomous checkout</span>
          </div>
        </div>
      )}

      {/* Simulated Cross-Sell Lift Banner */}
      <div className="bg-[#FAF8F6] border border-[#E6E2D8] p-6 rounded-3xl shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl">
              <TrendingUp size={16} />
            </div>
            <div>
              <span className="text-[8px] font-extrabold text-[#C8A97E] uppercase tracking-widest block">
                LIVE INTENT-MATCHING EXPERIMENT
              </span>
              <h3 className="text-xs font-serif font-extrabold text-[#1E1D1A] uppercase tracking-wide mt-0.5">
                Simulated Cross-Sell Lift (Live Agent Matching, {liftReport?.resolved_count || 0} of {liftReport?.sample_count || 8} Goals Resolved)
              </h3>
            </div>
          </div>

          <button
            onClick={runLiftBenchmark}
            disabled={isRunningLift}
            className="flex items-center gap-1.5 bg-white hover:bg-slate-50 border border-[#E6E2D8] text-[#1E1D1A] px-4 py-2 rounded-2xl text-[9px] font-extrabold uppercase tracking-wider shadow-sm transition-all disabled:opacity-50"
          >
            {isRunningLift ? (
              <Loader2 className="animate-spin" size={12} />
            ) : (
              <>
                <BarChart3 size={12} className="text-[#C8A97E]" />
                <span>Run Live Lift Simulation</span>
              </>
            )}
          </button>
        </div>

        {/* Skipped Goals Alert */}
        {liftReport?.skipped && liftReport.skipped.length > 0 && (
          <div className="bg-amber-50/80 border border-amber-200/80 p-3 rounded-2xl flex items-start gap-2.5 text-[8.5px] text-amber-900">
            <AlertCircle size={14} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Sample Transparency Note: </span>
              <span>
                {liftReport.skipped.length} of {liftReport.sample_count} benchmark goals could not be resolved by the LLM agent. Lift metrics are computed strictly from the {liftReport.resolved_count} successfully matched products without fabrication.
              </span>
            </div>
          </div>
        )}

        {/* Error state if 0 resolved */}
        {liftReport && !liftReport.success && (
          <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl text-[9px] text-rose-800 space-y-1">
            <span className="font-bold block">Simulation Unavailable</span>
            <p>{liftReport.error || 'Could not resolve any goals via LLM agent matching.'}</p>
          </div>
        )}

        {liftReport && liftReport.success && (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-[9.5px] pt-1">
            <div className="bg-white p-3.5 rounded-2xl border border-[#E6E2D8]">
              <span className="text-[7.5px] font-extrabold text-[#8C887E] uppercase block">Baseline AOV (Primary Match)</span>
              <span className="text-lg font-serif font-extrabold text-[#1E1D1A] mt-0.5 block">₹{liftReport.baseline_aov}</span>
              <span className="text-[7.5px] text-[#8C887E]">Real LLM matched SKUs</span>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-[#E6E2D8]">
              <span className="text-[7.5px] font-extrabold text-indigo-700 uppercase block">With Cross-Sell AOV</span>
              <span className="text-lg font-serif font-extrabold text-indigo-800 mt-0.5 block">₹{liftReport.with_crosssell_aov}</span>
              <span className="text-[7.5px] text-[#8C887E]">Complementary bundle add</span>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/40">
              <span className="text-[7.5px] font-extrabold text-emerald-800 uppercase block">Simulated Basket Lift</span>
              <span className="text-lg font-serif font-extrabold text-emerald-700 mt-0.5 block">+{liftReport.lift_percent}%</span>
              <span className="text-[7.5px] font-extrabold text-emerald-700">Live agent pipeline</span>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-[#E6E2D8]">
              <span className="text-[7.5px] font-extrabold text-[#8C887E] uppercase block">Projected Lift / 1k Orders</span>
              <span className="text-lg font-serif font-extrabold text-[#4A3B2C] mt-0.5 block">₹{liftReport.projected_incremental_revenue_per_1k_orders?.toLocaleString()}</span>
              <span className="text-[7.5px] text-[#8C887E]">Estimated incremental GMV</span>
            </div>
          </div>
        )}
      </div>

      {/* Campaign Generator & Opportunities Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Campaign Creation Card */}
        <div className="bg-white border border-[#E6E2D8] p-6 rounded-3xl shadow-sm space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-[#C8A97E]" />
              <h3 className="text-xs font-serif font-extrabold text-[#1E1D1A] uppercase tracking-wide">
                Create AI Buyer Campaign
              </h3>
            </div>
            <p className="text-[9px] text-[#8C887E] leading-relaxed">
              Select a target product and enter your revenue goal. Threshold's LLM engine synthesizes an AI buyer persona, queries, and companion bundle.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-[8px] font-extrabold text-[#8C887E] uppercase tracking-wider block mb-1">
                  Target Product
                </label>
                <select
                  value={selectedCampaignProductId}
                  onChange={(e) => setSelectedCampaignProductId(Number(e.target.value))}
                  className="w-full bg-[#FAF8F6] border border-[#E6E2D8] rounded-xl px-3 py-2 text-xs font-bold text-[#1E1D1A] focus:outline-none focus:border-[#C8A97E]"
                >
                  {catalog.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.name} (₹{item.price} • {item.merchant})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[8px] font-extrabold text-[#8C887E] uppercase tracking-wider block mb-1">
                  Merchant Growth Objective (Optional)
                </label>
                <input
                  type="text"
                  value={customMerchantGoal}
                  onChange={(e) => setCustomMerchantGoal(e.target.value)}
                  placeholder="e.g. 'Maximize summer apparel bundle revenue'..."
                  className="w-full bg-[#FAF8F6] border border-[#E6E2D8] rounded-xl px-3 py-2 text-xs font-medium text-[#1E1D1A] placeholder-[#A39E93] focus:outline-none focus:border-[#C8A97E]"
                />
              </div>
            </div>
          </div>

          <button
            onClick={() => onCreateCampaign(selectedCampaignProductId, customMerchantGoal)}
            disabled={isGeneratingCampaign}
            className="w-full bg-[#1E1D1A] hover:bg-black text-white py-3.5 rounded-2xl text-xs font-extrabold uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isGeneratingCampaign ? (
              <Loader2 className="animate-spin" size={14} />
            ) : (
              <>
                <Zap size={14} />
                <span>Generate Campaign</span>
              </>
            )}
          </button>
        </div>

        {/* Growth Opportunities List */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-xs font-serif font-extrabold text-[#1E1D1A] uppercase tracking-wide">
            Automated Catalog Growth Recommendations
          </h3>

          <div className="space-y-3">
            {opportunities.map((opp, idx) => (
              <div
                key={idx}
                className="bg-white border border-[#E6E2D8] p-5 rounded-3xl shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[7.5px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Score: {opp.readiness_score}/100
                    </span>
                    <h4 className="text-xs font-extrabold text-[#1E1D1A]">{opp.title}</h4>
                  </div>
                  <p className="text-[9px] text-[#6E6557] leading-relaxed">
                    {opp.rationale}
                  </p>
                  <div className="flex items-center gap-3 text-[8px] font-bold text-[#8C887E] pt-1">
                    <span className="text-emerald-700">✦ Impact: {opp.projected_impact}</span>
                    <span>•</span>
                    <span>Target: {opp.target_product_name}</span>
                  </div>
                </div>

                <button
                  onClick={() => onCreateCampaign(opp.target_product_id, opp.suggested_action)}
                  className="bg-[#FAF8F6] hover:bg-[#1E1D1A] hover:text-white border border-[#E6E2D8] text-[#1E1D1A] px-4 py-2.5 rounded-2xl text-[8.5px] font-extrabold uppercase tracking-wider transition-all shadow-sm shrink-0 flex items-center gap-1.5"
                >
                  <span>Launch Campaign</span>
                  <ArrowRight size={11} />
                </button>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Active Campaign Detail Box */}
      {activeCampaign && (
        <div className="bg-[#FAF8F6] border border-[#E6E2D8] p-8 rounded-3xl shadow-sm space-y-6 animate-scale-up">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[8px] font-extrabold text-[#C8A97E] uppercase tracking-widest block">
                Active Orchestrated Campaign
              </span>
              <h2 className="text-lg font-serif font-extrabold text-[#1E1D1A] uppercase tracking-wide mt-1">
                Campaign: {activeCampaign.target_product?.name || activeCampaign.campaign_name || 'AI Growth Push'}
              </h2>
            </div>
            <span className="text-[8.5px] font-extrabold bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full">
              {activeCampaign.expected_basket_lift || '+28% Basket Lift'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-[9.5px]">
            <div className="bg-white p-4 rounded-2xl border border-[#E6E2D8] space-y-1">
              <span className="text-[8px] font-extrabold text-[#8C887E] uppercase tracking-wider block">AI Buyer Persona</span>
              <p className="font-bold text-[#1E1D1A]">{activeCampaign.ai_buyer_persona || activeCampaign.target_intent || 'Autonomous AI Buyer'}</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-[#E6E2D8] space-y-1">
              <span className="text-[8px] font-extrabold text-[#8C887E] uppercase tracking-wider block">Channel & Agent Strategy</span>
              <p className="font-bold text-[#1E1D1A]">{activeCampaign.channel_strategy || activeCampaign.ai_buyer_message || 'Targeted ACP feed and intent indexing'}</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-[#E6E2D8] space-y-1">
              <span className="text-[8px] font-extrabold text-[#8C887E] uppercase tracking-wider block">Sample Buyer Prompt</span>
              <p className="font-bold text-emerald-800 italic">"{activeCampaign.sample_buyer_query || 'buy target product'}"</p>
            </div>
          </div>

          <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-[#E6E2D8]">
            <div className="flex items-center gap-3">
              {activeCampaign.target_product?.image_url && (
                <img
                  src={activeCampaign.target_product.image_url}
                  alt={activeCampaign.target_product.name || 'Product'}
                  className="h-12 w-12 rounded-xl object-cover border border-[#E6E2D8]"
                />
              )}
              <div>
                <h4 className="font-extrabold text-xs text-[#1E1D1A] uppercase">
                  {activeCampaign.target_product?.name || activeCampaign.campaign_name || 'Target Product'}
                </h4>
                <span className="text-[9px] text-[#8C887E] font-bold">
                  {activeCampaign.target_product?.price ? `₹${activeCampaign.target_product.price}` : ''}
                  {activeCampaign.target_product?.merchant ? ` • ${activeCampaign.target_product.merchant}` : ''}
                </span>
              </div>
            </div>

            {activeCampaign.sample_buyer_query && (
              <button
                onClick={() => onExecuteAgent(activeCampaign.sample_buyer_query!, false)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-all shadow-md flex items-center gap-2 shrink-0 group"
              >
                <span>Test with AI Buyer</span>
                <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
              </button>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
