import { useState } from 'react';

export default function SourceCard({ source, index }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="glass rounded-lg overflow-hidden transition-all duration-300 animate-fade-in"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-white/[0.03] transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-3 min-w-0">
          {/* PDF icon */}
          <div className="shrink-0 w-8 h-8 rounded-lg bg-accent-500/15 flex items-center justify-center">
            <svg className="w-4 h-4 text-accent-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>

          <div className="min-w-0">
            <p className="text-sm font-medium text-surface-100 truncate">{source.source}</p>
            {source.page !== null && source.page !== undefined && (
              <p className="text-xs text-surface-200/50 mt-0.5">Page {source.page + 1}</p>
            )}
          </div>
        </div>

        <svg
          className={`w-4 h-4 text-surface-200/40 shrink-0 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <div className={`overflow-hidden transition-all duration-300 ${expanded ? 'max-h-60' : 'max-h-0'}`}>
        <div className="px-4 pb-3 border-t border-white/[0.04]">
          <p className="text-xs text-surface-200/60 leading-relaxed pt-3 whitespace-pre-wrap">
            {source.content}
          </p>
        </div>
      </div>
    </div>
  );
}
