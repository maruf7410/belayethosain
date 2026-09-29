import React, { useState, useEffect } from 'react';
import { Sparkles, ExternalLink, X, Flame, ShieldCheck, Zap } from 'lucide-react';
import { AdBanner } from './AdBanner';

export const StickyAdBar: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // Auto-refresh ad creative every 25s to multiply impressions & revenue
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshKey((prev) => prev + 1);
    }, 25000);
    return () => clearInterval(interval);
  }, []);

  if (!isVisible) return null;

  return (
    <aside aria-label="Bottom Sponsored Ads" className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/98 backdrop-blur-md border-t-2 border-indigo-500 shadow-2xl p-2 animate-in slide-in-from-bottom duration-300">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2">
        {/* Left: High-Yield Direct Partner CTA */}
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-1.5">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-black text-amber-300 flex items-center gap-1 uppercase tracking-tight">
              <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span>SPONSORED MEGA DEAL</span>
            </span>
          </div>

          <a
            href="https://www.profitableratecpmnetwork.com/wbyn58m2g2?key=d321cd8c66f15a0987561b26c7c6750a"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-black text-xs rounded-lg shadow-md transition-transform hover:scale-105 active:scale-95"
          >
            <Zap className="w-3.5 h-3.5 fill-slate-950" />
            <span>CLAIM 5,000 RS &rarr;</span>
          </a>
        </div>

        {/* Center: Live Rotating Ad Unit */}
        <div className="w-full md:w-auto flex justify-center overflow-hidden max-h-[105px]">
          <div key={refreshKey} className="scale-90 sm:scale-95 origin-center">
            <AdBanner slot="leaderboard_728" title="High-Yield CPM Partner" showDirectLink={false} />
          </div>
        </div>

        {/* Right: Security Badge & Close */}
        <div className="flex items-center gap-2 text-[10px] text-slate-400">
          <a
            href="https://www.profitableratecpmnetwork.com/wbyn58m2g2?key=d321cd8c66f15a0987561b26c7c6750a"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1 text-sky-400 hover:underline font-semibold"
          >
            <Sparkles className="w-3 h-3" /> Partner Offer
          </a>
          <button
            onClick={() => setIsVisible(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Minimize"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
