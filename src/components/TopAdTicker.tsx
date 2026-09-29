import React from 'react';
import { Flame, Sparkles, ExternalLink, ShieldCheck, Zap } from 'lucide-react';

export const TopAdTicker: React.FC = () => {
  return (
    <aside aria-label="Sponsored Promotions" className="w-full bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border-b border-indigo-500/30 px-3 py-1.5 shadow-md">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-md font-extrabold text-[11px] animate-pulse">
            <Flame className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            HIGH REVENUE SPONSOR
          </span>
          <span className="hidden sm:inline text-slate-300 font-medium">
            Exclusive Developer Cloud &amp; Hosting Deals &bull; Instant Access
          </span>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="https://www.profitableratecpmnetwork.com/wbyn58m2g2?key=d321cd8c66f15a0987561b26c7c6750a"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-0.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-black text-[11px] rounded-md shadow transition-transform hover:scale-105 active:scale-95 cursor-pointer"
          >
            <Zap className="w-3 h-3 fill-slate-950" />
            <span>CLAIM REWARD OFFER &rarr;</span>
          </a>

          <a
            href="https://www.profitableratecpmnetwork.com/wbyn58m2g2?key=d321cd8c66f15a0987561b26c7c6750a"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:flex items-center gap-1 text-sky-300 hover:text-white font-semibold text-[11px] hover:underline"
          >
            <Sparkles className="w-3 h-3 text-sky-400" />
            <span>Featured CPM Partner</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </aside>
  );
};
