import { useState, useRef, useEffect } from 'react';
import { queryKnowledgeBase } from '../api';
import StatusBadge from './StatusBadge';
import SourceCard from './SourceCard';

export default function ChatPanel() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [topK, setTopK] = useState(5);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const question = input.trim();
    if (!question || loading) return;

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: question, id: Date.now() }]);
    setLoading(true);

    try {
      const result = await queryKnowledgeBase(question, topK);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: result.answer,
          sources: result.sources,
          webSearch: result.web_search_used,
          hallucination: result.hallucination_check,
          id: Date.now(),
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'error', content: err.message, id: Date.now() },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const hallLabels = {
    passed: 'Grounded',
    failed_grounding: 'Not Grounded',
    failed_relevance: 'Off Topic',
  };

  return (
    <div className="flex flex-col h-full">
      {/* Section Title */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-accent-500/15 flex items-center justify-center">
            <svg className="w-4 h-4 text-accent-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-surface-50">Ask Questions</h2>
            <p className="text-xs text-surface-200/50">Query your knowledge base</p>
          </div>
        </div>

        {/* Top-K selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-surface-200/40">Top-K</label>
          <select
            value={topK}
            onChange={(e) => setTopK(Number(e.target.value))}
            className="glass rounded-lg px-2 py-1 text-xs text-surface-100 outline-none cursor-pointer"
          >
            {[3, 5, 8, 10, 15, 20].map((k) => (
              <option key={k} value={k} className="bg-surface-900">{k}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1">
        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12 animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-surface-850 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-surface-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-surface-200/60">No questions yet</p>
            <p className="text-xs text-surface-200/30 mt-1 max-w-[240px]">
              Upload a PDF and ask questions about its content. The system will retrieve, grade, and generate answers.
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className="animate-slide-up">
            {msg.role === 'user' && (
              <div className="flex justify-end">
                <div className="max-w-[85%] bg-gradient-to-br from-accent-500 to-accent-600 rounded-2xl rounded-tr-md px-4 py-3 shadow-lg shadow-accent-500/15">
                  <p className="text-sm text-white leading-relaxed">{msg.content}</p>
                </div>
              </div>
            )}

            {msg.role === 'assistant' && (
              <div className="flex flex-col gap-3 max-w-[95%]">
                {/* Answer */}
                <div className="glass rounded-2xl rounded-tl-md px-4 py-3">
                  <p className="text-sm text-surface-100 leading-relaxed whitespace-pre-wrap">
                    {msg.content}
                  </p>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-2 px-1">
                  {msg.hallucination && (
                    <StatusBadge
                      type={msg.hallucination}
                      label={hallLabels[msg.hallucination] || msg.hallucination}
                    />
                  )}
                  {msg.webSearch && (
                    <StatusBadge type="web_search" label="Web Search Used" />
                  )}
                </div>

                {/* Sources */}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-surface-200/40 uppercase tracking-wider px-1">
                      Sources ({msg.sources.length})
                    </p>
                    {msg.sources.map((src, i) => (
                      <SourceCard key={i} source={src} index={i} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {msg.role === 'error' && (
              <div className="flex items-start gap-2 glass rounded-xl px-4 py-3 ring-1 ring-danger-500/25">
                <svg className="w-4 h-4 text-danger-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-sm text-danger-400">{msg.content}</p>
              </div>
            )}
          </div>
        ))}

        {/* Loading skeleton */}
        {loading && (
          <div className="flex flex-col gap-2 max-w-[70%] animate-fade-in">
            <div className="skeleton h-4 w-3/4" />
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-4 w-1/2" />
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="mt-4">
        <div className="glass-strong rounded-xl flex items-center gap-2 px-4 py-2.5 ring-1 ring-white/[0.04] focus-within:ring-accent-500/40 transition-all duration-300">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about your documents..."
            disabled={loading}
            className="flex-1 bg-transparent text-sm text-surface-100 placeholder:text-surface-200/30 outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-accent-500 to-accent-600 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-accent-500/25 transition-all duration-300 cursor-pointer"
          >
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}
