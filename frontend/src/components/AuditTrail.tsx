import { useState } from 'react';
import { X, RefreshCw } from 'lucide-react';
import { AuditSession } from '../types';

interface AuditTrailProps {
  isOpen: boolean;
  onClose: () => void;
  auditSessions: AuditSession[];
  onRefreshAudit: () => Promise<void>;
}

export function AuditTrail({
  isOpen,
  onClose,
  auditSessions,
  onRefreshAudit
}: AuditTrailProps) {
  const [selectedAuditSession, setSelectedAuditSession] = useState<AuditSession | null>(null);
  const [auditFilter, setAuditFilter] = useState<'all' | 'APPROVED' | 'REJECTED' | 'INFO' | 'ERROR'>('all');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-end z-50 animate-fade-in">
      <div className="bg-white rounded-t-3xl sm:rounded-l-3xl sm:rounded-t-none border-t sm:border-t-0 sm:border-l border-[#E6E2D8] max-w-lg w-full h-[85vh] sm:h-screen overflow-hidden shadow-2xl relative flex flex-col p-6 animate-slide-in">
        
        <button 
          onClick={() => { onClose(); setSelectedAuditSession(null); }}
          className="absolute top-4 right-4 text-[#8C887E] hover:text-[#1E1D1A] p-1.5 rounded-full border border-[#E6E2D8] bg-white transition-all hover:bg-slate-50"
        >
          <X size={14} className="stroke-[2.5]" />
        </button>

        <div className="pb-3 border-b border-[#F6F4EF] mb-3 shrink-0 flex justify-between items-end pr-8">
          <div>
            <span className="text-[8px] font-bold tracking-widest text-[#B9A382] uppercase block">AUDIT TRAIL</span>
            <h2 className="text-sm font-extrabold text-[#1E1D1A] tracking-tight mt-0.5">Financial & Policy Activity</h2>
          </div>
          <button
            onClick={onRefreshAudit}
            className="text-[#8C887E] hover:text-[#1E1D1A] p-1 rounded-lg hover:bg-slate-50 transition-all"
            title="Refresh Audit"
          >
            <RefreshCw size={13} />
          </button>
        </div>

        {!selectedAuditSession && (
          <div className="flex gap-1.5 pb-3 border-b border-[#F6F4EF] shrink-0 flex-wrap">
            {(['all', 'APPROVED', 'REJECTED', 'INFO', 'ERROR'] as const).map(flt => (
              <button
                key={flt}
                onClick={() => setAuditFilter(flt)}
                className={`px-2.5 py-1 rounded-full text-[8px] font-extrabold uppercase tracking-wider transition-all ${
                  auditFilter === flt
                    ? 'bg-[#1E1D1A] text-white'
                    : 'bg-[#FAF8F6] text-[#8C887E] border border-[#E6E2D8]'
                }`}
              >
                {flt}
              </button>
            ))}
          </div>
        )}

        {selectedAuditSession ? (
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            <button
              onClick={() => setSelectedAuditSession(null)}
              className="text-[9px] font-bold text-[#C8A97E] hover:text-[#B9A382] uppercase tracking-wider flex items-center gap-1.5 mb-2"
            >
              ← Back to History List
            </button>

            <div className="pb-3 border-b border-[#F6F4EF]">
              <span className="text-[7.5px] bg-[#EADCC6] text-[#4A3B2C] px-2 py-0.5 rounded font-mono select-none">
                RUN ID: {selectedAuditSession.runId}
              </span>
              <h4 className="font-serif font-extrabold text-sm text-[#1E1D1A] mt-2">
                {selectedAuditSession.goal || 'Safety Verification Flow'}
              </h4>
              <span className="text-[8px] text-[#8C887E] block mt-1 font-semibold">
                {new Date(selectedAuditSession.timestamp).toLocaleString()}
              </span>
            </div>

            <div className="space-y-2.5">
              <span className="text-[8px] font-extrabold text-[#8C887E] uppercase tracking-wider block">
                Execution Steps ({selectedAuditSession.logs.length})
              </span>
              {selectedAuditSession.logs.map((log, idx) => (
                <div key={idx} className="bg-[#FAF8F6] border border-[#E6E2D8] p-3 rounded-2xl space-y-1.5 text-[9px]">
                  <div className="flex justify-between items-center">
                    <span className="font-extrabold uppercase text-[7.5px] bg-white border border-[#E6E2D8] px-2 py-0.5 rounded-full text-[#4A4740]">
                      {log.actor.toUpperCase()}
                    </span>
                    <span className={`text-[7.5px] font-extrabold px-2 py-0.5 rounded-full ${
                      log.status === 'APPROVED' || log.status === 'SUCCESS' ? 'bg-emerald-50 text-emerald-600' :
                      log.status === 'REJECTED' || log.status === 'ERROR' ? 'bg-rose-50 text-rose-600' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {log.status}
                    </span>
                  </div>
                  <h5 className="font-extrabold text-[#1E1D1A] text-[9.5px]">{log.action}</h5>
                  <p className="text-[#6E6557] font-medium leading-relaxed italic">"{log.reasoning}"</p>
                </div>
              ))}
            </div>

          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 pt-2">
            {auditSessions
              .filter(session => {
                if (auditFilter === 'all') return true;
                if (auditFilter === 'APPROVED') return session.status === 'APPROVED';
                if (auditFilter === 'REJECTED') return session.status === 'REJECTED';
                if (auditFilter === 'ERROR') return session.status === 'ERROR';
                return session.logs.some(l => l.status === auditFilter);
              })
              .map((session) => {
                const isRejected = session.status === 'REJECTED';
                let badgeColor = "bg-emerald-50 text-emerald-600 border border-emerald-100";
                let badgeLabel = "✓ APPROVED";
                
                if (isRejected) {
                  badgeColor = "bg-rose-50 text-rose-600 border border-rose-100";
                  badgeLabel = "✕ BLOCKED";
                } else if (session.status === 'ERROR') {
                  badgeColor = "bg-slate-50 text-slate-500 border border-slate-200";
                  badgeLabel = "⚠ ERROR";
                }

                return (
                  <div 
                    key={session.runId}
                    onClick={() => setSelectedAuditSession(session)}
                    className="bg-white border border-[#E6E2D8]/80 hover:border-[#D1CCC2] p-3 rounded-2xl shadow-sm flex flex-col gap-2 cursor-pointer transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-[7.5px] font-extrabold px-2 py-0.5 rounded-full ${badgeColor}`}>
                        {badgeLabel}
                      </span>
                      <span className="text-[7.5px] text-[#8C887E] font-bold">
                        {new Date(session.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <h4 className="font-extrabold text-[10px] text-[#1E1D1A] uppercase tracking-wide truncate">
                        {session.goal || 'Autonomous Commerce Flow'}
                      </h4>
                      <span className="text-[8px] text-[#6E6557] font-medium leading-relaxed truncate mt-0.5">
                        {session.itemSelected ? `${session.itemSelected} (₹${session.price})` : 'Catalog Evaluation'}
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        )}

      </div>
    </div>
  );
}
