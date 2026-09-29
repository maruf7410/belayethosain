import React, { useState, useEffect } from 'react';
import { HardDrive, RefreshCw, AlertCircle, ShieldCheck } from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';

interface StorageQuotaBadgeProps {
  currentUser: FirebaseUser;
}

export const StorageQuotaBadge: React.FC<StorageQuotaBadgeProps> = ({ currentUser }) => {
  const [quota, setQuota] = useState<{
    usedBytes: number;
    quotaBytes: number;
    usagePercent: number;
    filesCount: number;
    maxSingleUploadBytes: number;
  } | null>(null);

  const fetchQuota = async () => {
    try {
      const res = await fetch('/api/v1/storage/quota', {
        headers: { 'X-User-Uid': currentUser.uid }
      });
      const data = await res.json();
      if (data.success) {
        setQuota({
          usedBytes: data.used_bytes || 0,
          quotaBytes: data.quota_bytes || 5 * 1024 * 1024 * 1024,
          usagePercent: data.usage_percent || 0,
          filesCount: data.files_count || 0,
          maxSingleUploadBytes: data.max_single_upload_bytes || 2 * 1024 * 1024 * 1024
        });
      }
    } catch {}
  };

  useEffect(() => {
    fetchQuota();
    const interval = setInterval(fetchQuota, 15000);
    return () => clearInterval(interval);
  }, [currentUser.uid]);

  if (!quota) return null;

  const formatSize = (bytes: number) => {
    if (bytes >= 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="flex items-center gap-3 bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 font-mono">
      <div className="flex items-center gap-1.5">
        <HardDrive className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        <span className="hidden sm:inline text-slate-400">Storage:</span>
        <span className="text-white font-bold">{formatSize(quota.usedBytes)}</span>
        <span className="text-slate-500">/ {formatSize(quota.quotaBytes)}</span>
      </div>

      <div className="w-16 sm:w-24 bg-slate-800 h-1.5 rounded-full overflow-hidden shrink-0">
        <div
          className={`h-full transition-all rounded-full ${
            quota.usagePercent > 85 ? 'bg-red-500' : quota.usagePercent > 60 ? 'bg-amber-400' : 'bg-emerald-400'
          }`}
          style={{ width: `${Math.max(2, quota.usagePercent)}%` }}
        />
      </div>

      <span className="text-[10px] text-slate-400 hidden md:inline">
        ({quota.usagePercent}% used)
      </span>
    </div>
  );
};
