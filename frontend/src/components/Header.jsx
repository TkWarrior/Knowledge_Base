import { useEffect, useState } from 'react';
import { fetchCollections, healthCheck } from '../api';

export default function Header() {
  const [stats, setStats] = useState(null);
  const [healthy, setHealthy] = useState(null);

  useEffect(() => {
    healthCheck()
      .then(() => setHealthy(true))
      .catch(() => setHealthy(false));

    fetchCollections()
      .then((data) => {
        const col = data.collections?.find((c) => c.name === 'knowledge_base');
        if (col) setStats(col);
      })
      .catch(() => {});
  }, []);

  const refreshStats = () => {
    fetchCollections()
      .then((data) => {
        const col = data.collections?.find((c) => c.name === 'knowledge_base');
        if (col) setStats(col);
      })
      .catch(() => {});
  };

  useEffect(() => {
    window.addEventListener('stats-refresh', refreshStats);
    return () => window.removeEventListener('stats-refresh', refreshStats);
  }, []);

  return (
    <header className="glass-strong sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {/* Logo */}
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-500 to-accent-600 flex items-center justify-center shadow-lg shadow-accent-500/25">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>

        <div>
          <h1 className="text-lg font-bold text-surface-50 leading-tight">Knowledge Base</h1>
          <p className="text-xs text-surface-200/70 font-medium">Corrective RAG Pipeline</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Stats Badge */}
        {stats && (
          <div className="glass rounded-lg px-3 py-1.5 flex items-center gap-2 text-xs font-medium animate-fade-in">
            <span className="text-accent-400">{stats.points_count}</span>
            <span className="text-surface-200/60">vectors stored</span>
          </div>
        )}

        {/* Health Indicator  */}
        <div className={`w-2.5 h-2.5 rounded-full transition-colors duration-500 ${
          healthy === true ? 'bg-success-400 shadow-[0_0_8px] shadow-success-400/50' :
          healthy === false ? 'bg-danger-400 shadow-[0_0_8px] shadow-danger-400/50' :
          'bg-surface-700 animate-pulse'
        }`} title={healthy === true ? 'API healthy' : healthy === false ? 'API unreachable' : 'Checking...'} />
      </div>
    </header>
  );
}
