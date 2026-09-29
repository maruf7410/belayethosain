import React, { useState, useEffect } from 'react';
import { Sparkles, ExternalLink, Zap } from 'lucide-react';
import { AdBanner } from './AdBanner';

export const SideAdTowers: React.FC = () => {
  const [cycleKey, setCycleKey] = useState(0);

  // Periodic refresh to multiply ad impression revenue
  useEffect(() => {
    const timer = setInterval(() => {
      setCycleKey((prev) => prev + 1);
    }, 28000);
    return () => clearInterval(timer);
  }, []);

  return (
    <>
      {/* Left Tower Ad on 2XL screens */}
      <aside aria-label="Sponsored Partners Left" className="hidden 2xl:flex fixed left-3 top-24 bottom-24 w-[160px] flex-col justify-between items-center z-30 pointer-events-auto bg-slate-900/40 backdrop-blur-xs p-2 rounded-2xl border border-slate-700/50 shadow-xl overflow-hidden">
        <div className="w-full text-center">
          <span className="text-[10px] font-black uppercase text-amber-400 flex items-center justify-center gap-1">
            <Sparkles className="w-3 h-3" /> SPONSOR
          </span>
        </div>

        <div key={`left-${cycleKey}`} className="w-full flex justify-center scale-90 -my-4 origin-center">
          <AdBanner slot="sidebar_300" title="Hot Offer" showDirectLink={false} />
        </div>

        <a
          href="https://www.profitableratecpmnetwork.com/wbyn58m2g2?key=d321cd8c66f15a0987561b26c7c6750a"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-1.5 px-1 bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-[10px] text-center rounded-lg shadow uppercase transition-transform hover:scale-105 block"
        >
          <span>Claim &rarr;</span>
        </a>
      </aside>

      {/* Right Tower Ad on 2XL screens */}
      <aside aria-label="Sponsored Partners Right" className="hidden 2xl:flex fixed right-3 top-24 bottom-24 w-[160px] flex-col justify-between items-center z-30 pointer-events-auto bg-slate-900/40 backdrop-blur-xs p-2 rounded-2xl border border-slate-700/50 shadow-xl overflow-hidden">
        <div className="w-full text-center">
          <span className="text-[10px] font-black uppercase text-emerald-400 flex items-center justify-center gap-1">
            <Zap className="w-3 h-3" /> TOP EARN
          </span>
        </div>

        <div key={`right-${cycleKey}`} className="w-full flex justify-center scale-90 -my-4 origin-center">
          <AdBanner slot="sidebar_300" title="Premium Ad" showDirectLink={false} />
        </div>

        <a
          href="https://www.profitableratecpmnetwork.com/wbyn58m2g2?key=d321cd8c66f15a0987561b26c7c6750a"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-1.5 px-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[10px] text-center rounded-lg shadow uppercase transition-transform hover:scale-105 block"
        >
          <span>Offer &rarr;</span>
        </a>
      </aside>
    </>
  );
};
