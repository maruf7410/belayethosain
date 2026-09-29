import React, { useEffect, useRef } from 'react';
import { ExternalLink, Sparkles } from 'lucide-react';

export type AdSlotType = 'leaderboard_728' | 'sidebar_300' | 'native_container';

interface AdBannerProps {
  slot: AdSlotType;
  title?: string;
  className?: string;
  showDirectLink?: boolean;
}

export const AdBanner: React.FC<AdBannerProps> = ({
  slot,
  title,
  className = '',
  showDirectLink = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = '';

    const iframe = document.createElement('iframe');
    iframe.style.border = 'none';
    iframe.style.overflow = 'hidden';
    iframe.scrolling = 'no';
    iframe.marginHeight = '0';
    iframe.marginWidth = '0';

    if (slot === 'leaderboard_728') {
      iframe.style.width = '728px';
      iframe.style.maxWidth = '100%';
      iframe.style.height = '90px';
    } else if (slot === 'sidebar_300') {
      iframe.style.width = '300px';
      iframe.style.maxWidth = '100%';
      iframe.style.height = '250px';
    } else if (slot === 'native_container') {
      iframe.style.width = '100%';
      iframe.style.maxWidth = '728px';
      iframe.style.height = '110px';
    }

    containerRef.current.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (doc) {
      doc.open();

      if (slot === 'leaderboard_728') {
        doc.write(`<!DOCTYPE html>
<html>
<head>
  <style>body{margin:0;padding:0;display:flex;justify-content:center;align-items:center;background:transparent;overflow:hidden;}</style>
</head>
<body>
  <script type="text/javascript">
    atOptions = {
      'key' : '8055cfc74fae1118b0e119f84b501675',
      'format' : 'iframe',
      'height' : 90,
      'width' : 728,
      'params' : {}
    };
  </script>
  <script type="text/javascript" src="https://www.highrevenueformat.com/8055cfc74fae1118b0e119f84b501675/invoke.js"></script>
</body>
</html>`);
      } else if (slot === 'sidebar_300') {
        doc.write(`<!DOCTYPE html>
<html>
<head>
  <style>body{margin:0;padding:0;display:flex;justify-content:center;align-items:center;background:transparent;overflow:hidden;}</style>
</head>
<body>
  <script type="text/javascript">
    atOptions = {
      'key' : '24c56745e340f753762f00b250d2d13a',
      'format' : 'iframe',
      'height' : 250,
      'width' : 300,
      'params' : {}
    };
  </script>
  <script type="text/javascript" src="https://www.highrevenueformat.com/24c56745e340f753762f00b250d2d13a/invoke.js"></script>
</body>
</html>`);
      } else if (slot === 'native_container') {
        doc.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      display: flex;
      justify-content: center;
      align-items: center;
      background: transparent;
      overflow: hidden;
      font-family: system-ui, sans-serif;
    }
    #container-69ed18ff9128b4be6b0746f1097cf697 {
      width: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
    }
  </style>
</head>
<body>
  <div id="container-69ed18ff9128b4be6b0746f1097cf697"></div>
  <script async="async" data-cfasync="false" src="https://pl31557835.profitableratecpmnetwork.com/69ed18ff9128b4be6b0746f1097cf697/invoke.js"></script>
</body>
</html>`);
      }

      doc.close();
    }
  }, [slot]);

  const defaultTitle =
    slot === 'leaderboard_728'
      ? 'Sponsored Leaderboard'
      : slot === 'sidebar_300'
      ? 'Recommended Partner'
      : 'Community Support Banner';

  return (
    <div className={`flex flex-col items-center justify-center my-3 ${className}`}>
      <div className="w-full flex items-center justify-between px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider text-slate-400">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          <span>{title || defaultTitle}</span>
        </div>
        {showDirectLink && (
          <a
            href="https://www.profitableratecpmnetwork.com/wbyn58m2g2?key=d321cd8c66f15a0987561b26c7c6750a"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sky-600 hover:text-sky-700 font-semibold normal-case tracking-normal hover:underline"
          >
            <Sparkles className="w-3 h-3 text-sky-500" />
            <span>Featured Offer</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
        )}
      </div>
      <div
        ref={containerRef}
        className="w-full flex items-center justify-center rounded-xl bg-slate-50/50 p-2 border border-slate-200/60 overflow-hidden"
      />
    </div>
  );
};
