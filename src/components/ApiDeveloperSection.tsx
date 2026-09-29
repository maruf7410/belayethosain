import React, { useState, useEffect } from 'react';
import {
  Key,
  Copy,
  Check,
  Eye,
  EyeOff,
  RefreshCw,
  Trash2,
  Terminal,
  Code2,
  FileCode,
  Shield,
  Zap,
  ExternalLink,
  Sparkles,
  AlertTriangle,
  Server,
  Layers,
  Activity,
  Lock,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';

interface ApiToken {
  id: string;
  name: string;
  prefix: string;
  created_at: string;
  last_used_at: string | null;
  is_active: boolean;
  rawKey?: string;
}

interface AuditLog {
  id: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  timestamp: number;
  ip: string;
}

interface ApiDeveloperSectionProps {
  currentUser: FirebaseUser;
  currentOrigin: string;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const ApiDeveloperSection: React.FC<ApiDeveloperSectionProps> = ({
  currentUser,
  currentOrigin,
  onShowToast
}) => {
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [activeRawKey, setActiveRawKey] = useState<string | null>(null);
  const [isKeyVisible, setIsKeyVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showRotateModal, setShowRotateModal] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [activeCodeTab, setActiveCodeTab] = useState<'curl' | 'node' | 'python' | 'github'>('curl');
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // 24/7 Availability Monitor State
  const [healthData, setHealthData] = useState<{
    status: string;
    uptime_seconds: number;
    hosted_sites_count: number;
    memory: { heap_used_mb: number; rss_mb: number };
    latency_ms?: number;
  } | null>(null);
  const [isTestingProbe, setIsTestingProbe] = useState(false);

  const apiBaseUrl = `${currentOrigin}/api/v1`;
  const healthProbeUrl = `${currentOrigin}/healthz`;

  const copyText = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    onShowToast('Copied to clipboard!', 'success');
    setTimeout(() => setCopiedField(null), 2500);
  };

  const testHealthProbe = async () => {
    setIsTestingProbe(true);
    const start = performance.now();
    try {
      const res = await fetch('/api/v1/health', { cache: 'no-store' });
      const latency = Math.round(performance.now() - start);
      const data = await res.json();
      if (data.status === 'healthy') {
        setHealthData({ ...data, latency_ms: latency });
        onShowToast(`Probe active! Latency: ${latency}ms, Uptime: ${Math.floor(data.uptime_seconds / 60)}m`, 'success');
      }
    } catch {
      onShowToast('Health probe connection failed', 'error');
    } finally {
      setIsTestingProbe(false);
    }
  };

  const fetchTokens = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/v1/tokens', {
        headers: { 'X-User-Uid': currentUser.uid }
      });
      const data = await res.json();
      if (data.success && data.tokens) {
        setTokens(data.tokens);
        if (data.tokens.length === 0) {
          // Generate default initial key if none exist
          await handleCreateToken('Default Production Key');
        }
      }
    } catch {
      onShowToast('Failed to load API tokens', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await fetch('/api/v1/audit-logs', {
        headers: { 'X-User-Uid': currentUser.uid }
      });
      const data = await res.json();
      if (data.success && data.audit_logs) {
        setAuditLogs(data.audit_logs);
      }
    } catch {}
  };

  useEffect(() => {
    fetchTokens();
    fetchAuditLogs();
  }, [currentUser.uid]);

  const handleCreateToken = async (name: string = 'Developer API Key') => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/v1/tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Uid': currentUser.uid
        },
        body: JSON.stringify({ name })
      });
      const data = await res.json();
      if (data.success && data.token) {
        setActiveRawKey(data.token.key);
        setIsKeyVisible(true);
        onShowToast('New API key generated successfully!', 'success');
        fetchTokens();
        fetchAuditLogs();
      } else {
        onShowToast(data.error?.message || 'Failed to generate token', 'error');
      }
    } catch {
      onShowToast('Error generating token', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRotateKey = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/v1/tokens/rotate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Uid': currentUser.uid
        },
        body: JSON.stringify({ name: 'Rotated Production Key' })
      });
      const data = await res.json();
      if (data.success && data.token) {
        setActiveRawKey(data.token.key);
        setIsKeyVisible(true);
        setShowRotateModal(false);
        onShowToast('API Key rotated! Previous keys have been invalidated.', 'success');
        fetchTokens();
        fetchAuditLogs();
      } else {
        onShowToast(data.error?.message || 'Failed to rotate key', 'error');
      }
    } catch {
      onShowToast('Error rotating key', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRevokeToken = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this API token? Any automated scripts using it will stop working immediately.')) {
      return;
    }
    try {
      const res = await fetch(`/api/v1/tokens/${id}`, {
        method: 'DELETE',
        headers: { 'X-User-Uid': currentUser.uid }
      });
      const data = await res.json();
      if (data.success) {
        setActiveRawKey(null);
        onShowToast('API token revoked.', 'info');
        fetchTokens();
        fetchAuditLogs();
      } else {
        onShowToast(data.error?.message || 'Failed to revoke token', 'error');
      }
    } catch {
      onShowToast('Error revoking token', 'error');
    }
  };

  const displayTokenString = activeRawKey
    ? isKeyVisible
      ? activeRawKey
      : `${activeRawKey.substring(0, 9)}${'•'.repeat(24)}`
    : tokens[0]
    ? isKeyVisible
      ? tokens[0].prefix
      : 'hst_live_••••••••••••••••••••••••'
    : 'No active API token';

  const codeSnippets = {
    curl: `# 1. Deploy ZIP Website Archive via cURL
curl -X POST "${apiBaseUrl}/deployments" \\
  -H "Authorization: Bearer ${activeRawKey || 'YOUR_API_KEY'}" \\
  -F "file=@my-website.zip" \\
  -F "projectName=My Landing Page"

# 2. List Your Hosted Projects
curl -X GET "${apiBaseUrl}/projects" \\
  -H "Authorization: Bearer ${activeRawKey || 'YOUR_API_KEY'}"

# 3. Check Account Quotas
curl -X GET "${apiBaseUrl}/me" \\
  -H "Authorization: Bearer ${activeRawKey || 'YOUR_API_KEY'}"`,

    node: `// Node.js (JavaScript / TypeScript with FormData & fetch)
import fs from 'fs';

async function deployProject() {
  const formData = new FormData();
  const fileBlob = new Blob([fs.readFileSync('./dist.zip')], { type: 'application/zip' });
  formData.append('file', fileBlob, 'dist.zip');
  formData.append('projectName', 'Production SaaS Web');

  const res = await fetch('${apiBaseUrl}/deployments', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ${activeRawKey || 'YOUR_API_KEY'}'
    },
    body: formData
  });

  const result = await res.json();
  if (result.success) {
    console.log('🚀 Deployed Live URL:', result.deployment.url);
    console.log('⚡ Direct Host URL:', result.deployment.direct_url);
  } else {
    console.error('Deployment error:', result.error);
  }
}

deployProject();`,

    python: `# Python (requests library)
import requests

API_URL = "${apiBaseUrl}/deployments"
API_KEY = "${activeRawKey || 'YOUR_API_KEY'}"

with open("my-build.zip", "rb") as f:
    files = {"file": ("my-build.zip", f, "application/zip")}
    data = {"projectName": "Python FastDeploy"}
    headers = {"Authorization": f"Bearer {API_KEY}"}

    response = requests.post(API_URL, headers=headers, files=files, data=data)
    result = response.json()

    if result.get("success"):
        print("✔ Deployed successfully!")
        print("Live URL:", result["deployment"]["url"])
    else:
        print("Error:", result.get("error"))`,

    github: `# .github/workflows/deploy.yml
name: Deploy to KAVO 24/7 Hosting

on:
  push:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Build Website
        run: |
          npm ci
          npm run build
          cd dist && zip -r ../dist.zip . && cd ..

      - name: Deploy via KAVO Developer API
        env:
          KAVO_API_KEY: \${{ secrets.KAVO_API_KEY }}
        run: |
          curl -X POST "${apiBaseUrl}/deployments" \\
            -H "Authorization: Bearer $KAVO_API_KEY" \\
            -F "file=@dist.zip" \\
            -F "projectName=GitHub CI/CD Deployment"`
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-5 sm:p-6 border border-indigo-800/50 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-indigo-500/10 to-transparent pointer-events-none"></div>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="p-1.5 bg-sky-500/20 text-sky-400 rounded-lg border border-sky-500/30">
                <Key className="w-4 h-4" />
              </span>
              <h2 className="text-lg font-extrabold text-white tracking-tight">Developer API &amp; CI/CD Integration</h2>
              <span className="text-[10px] px-2 py-0.5 bg-emerald-500/20 text-emerald-300 font-mono font-bold rounded-md border border-emerald-500/40">
                v1.0 REST
              </span>
              <span className="text-[10px] px-2 py-0.5 bg-sky-500/20 text-sky-300 font-mono font-bold rounded-md border border-sky-500/40 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                24/7 Uptime Engine
              </span>
            </div>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Automate deployments from GitHub Actions, GitLab CI, local CLI scripts, or Python/Node.js backends. Isolated multi-tenant security with cryptographic SHA-256 token validation and 24/7 continuous availability.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowRotateModal(true)}
              disabled={isGenerating}
              className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
              <span>Rotate API Key</span>
            </button>
          </div>
        </div>
      </div>

      {/* 24/7 Continuous API Availability & Health Probes Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-extrabold text-white">24/7 Continuous API Availability &amp; Zero-Sleep System</h3>
              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold rounded-full border border-emerald-500/40">
                PROD ACTIVE
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Native HTTP keep-alive (65s), process crash supervisor, automated temporary file purger, and dedicated zero-idle health endpoints.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={testHealthProbe}
              disabled={isTestingProbe}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold font-mono rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTestingProbe ? 'animate-spin' : ''}`} />
              <span>{isTestingProbe ? 'Probing...' : 'Test Live Probe (Ping)'}</span>
            </button>
            <a
              href={`${currentOrigin}/healthz`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-300 text-xs font-mono font-semibold rounded-xl transition-all flex items-center gap-1 border border-slate-700"
            >
              <span>/healthz</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Real-time Health Diagnostics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/80 p-3 rounded-xl border border-slate-800/80 font-mono text-xs">
          <div>
            <span className="text-[10px] text-slate-500 block uppercase">Service State</span>
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              24/7 ONLINE
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 block uppercase">Response Latency</span>
            <span className="text-sky-300 font-bold">
              {healthData?.latency_ms !== undefined ? `${healthData.latency_ms} ms` : 'Sub-5ms'}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 block uppercase">Self-Healing Watchdog</span>
            <span className="text-indigo-300 font-bold">ACTIVE (10m cycle)</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 block uppercase">Process Memory</span>
            <span className="text-amber-300 font-bold">
              {healthData ? `${healthData.memory.heap_used_mb} MB` : 'Optimal'}
            </span>
          </div>
        </div>

        {/* Infrastructure Guide Accordion */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 leading-relaxed space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-slate-300 font-bold flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-sky-400" />
              Platform Zero-Idle Configuration &amp; External Heartbeat Guide
            </span>
            <div className="flex items-center gap-2">
              <span className="text-slate-500">Monitor Heartbeat URL:</span>
              <code className="text-sky-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 font-mono text-[10px] select-all">
                {healthProbeUrl}
              </code>
              <button
                onClick={() => copyText(healthProbeUrl, 'probe-url')}
                className="text-slate-400 hover:text-white"
                title="Copy Probe URL"
              >
                {copiedField === 'probe-url' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          </div>
          <p>
            &bull; <strong>Serverless / Cloud Run:</strong> Ensure your deployment is configured with <code className="text-sky-300">--min-instances 1</code> (or CPU Allocation: <em>CPU always allocated</em>) to prevent zero-scale sleeping.
          </p>
          <p>
            &bull; <strong>Free External Monitoring:</strong> Add <code className="text-sky-300">{healthProbeUrl}</code> to a free monitoring service like <strong>UptimeRobot</strong>, <strong>BetterUptime</strong>, or <strong>Cron-job.org</strong> (interval: 3 minutes) to guarantee continuous inbound requests and 100% warm containers.
          </p>
          <p>
            &bull; <strong>Docker / Kubernetes / VPS:</strong> Use the included <code className="text-sky-300">Dockerfile</code> (with native <code className="text-sky-300">HEALTHCHECK</code>), <code className="text-sky-300">ecosystem.config.cjs</code> (PM2), or <code className="text-sky-300">kavo-api.service</code> (systemd unit with <code className="text-sky-300">Restart=always</code>).
          </p>
        </div>
      </div>

      {/* Main Grid: API Base URL & API Key */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Card 1: API Base URL */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                <Server className="w-4 h-4 text-sky-600" /> API Base Endpoint
              </span>
              <span className="text-[11px] font-mono text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                HTTPS Ready
              </span>
            </div>
            <p className="text-xs text-slate-600 mb-3">
              Standard REST base URL for all programmatic deployment, project listing, and health checks.
            </p>
            <div className="bg-slate-900 text-sky-300 font-mono text-xs p-3 rounded-xl flex items-center justify-between border border-slate-800 select-all">
              <span className="truncate mr-2">{apiBaseUrl}</span>
              <button
                onClick={() => copyText(apiBaseUrl, 'base-url')}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer flex-shrink-0"
                title="Copy API Base URL"
              >
                {copiedField === 'base-url' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Rate Limit: <strong>120 requests / min</strong></span>
            <span>Max Upload: <strong>50 MB ZIP</strong></span>
          </div>
        </div>

        {/* Card 2: Personal API Secret Key */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                <Key className="w-4 h-4 text-amber-600" /> Personal API Key (Bearer Token)
              </span>
              <span className="text-[11px] font-mono text-slate-500">
                Owner: {currentUser.displayName || currentUser.email?.split('@')[0] || 'Developer'}
              </span>
            </div>
            <p className="text-xs text-slate-600 mb-3">
              Pass this key in the <code className="bg-slate-100 px-1 py-0.5 rounded text-sky-700 font-bold">Authorization: Bearer &lt;KEY&gt;</code> header.
            </p>

            <div className="bg-slate-900 text-amber-300 font-mono text-xs p-3 rounded-xl flex items-center justify-between border border-slate-800">
              <span className="truncate mr-2 select-all">{displayTokenString}</span>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={() => setIsKeyVisible(!isKeyVisible)}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                  title={isKeyVisible ? 'Hide Key' : 'Reveal Key'}
                >
                  {isKeyVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => copyText(activeRawKey || tokens[0]?.prefix || '', 'api-key')}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                  title="Copy API Key"
                >
                  {copiedField === 'api-key' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1 text-emerald-600 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" /> SHA-256 Hashed Storage
            </span>
            <button
              onClick={() => setShowRotateModal(true)}
              className="text-sky-600 hover:text-sky-700 font-bold hover:underline cursor-pointer"
            >
              Generate New Key
            </button>
          </div>
        </div>
      </div>

      {/* Code Examples & Quickstart */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl overflow-hidden text-slate-100">
        <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-sky-400" />
            <span className="text-xs font-bold text-white font-mono">API Quickstart &amp; Code Examples</span>
          </div>

          <div className="flex bg-slate-800/80 p-0.5 rounded-lg text-xs font-mono">
            {(['curl', 'node', 'python', 'github'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveCodeTab(tab)}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer capitalize ${
                  activeCodeTab === tab ? 'bg-sky-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab === 'curl' ? 'cURL (CLI)' : tab === 'node' ? 'Node.js' : tab === 'python' ? 'Python' : 'GitHub Actions'}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 relative font-mono text-xs overflow-x-auto leading-relaxed text-sky-200 bg-slate-950/70">
          <button
            onClick={() => copyText(codeSnippets[activeCodeTab], `snippet-${activeCodeTab}`)}
            className="absolute top-3 right-3 p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer border border-slate-700/60"
            title="Copy Code Snippet"
          >
            {copiedField === `snippet-${activeCodeTab}` ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
          <pre className="whitespace-pre font-mono">{codeSnippets[activeCodeTab]}</pre>
        </div>
      </div>

      {/* API Reference & Quotas Table */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <h3 className="text-sm font-extrabold text-slate-900 mb-3 flex items-center gap-2">
          <Layers className="w-4 h-4 text-sky-600" /> API Endpoints Specification
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <th className="py-2.5 px-3 font-bold">Method</th>
                <th className="py-2.5 px-3 font-bold">Endpoint</th>
                <th className="py-2.5 px-3 font-bold">Description</th>
                <th className="py-2.5 px-3 font-bold">Payload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              <tr>
                <td className="py-2.5 px-3"><span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold">POST</span></td>
                <td className="py-2.5 px-3 text-sky-700 font-bold">/api/v1/deployments</td>
                <td className="py-2.5 px-3 font-sans text-slate-600">Deploy ZIP archive or single HTML file</td>
                <td className="py-2.5 px-3 text-slate-500">multipart/form-data (file=@app.zip)</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3"><span className="px-2 py-0.5 bg-sky-100 text-sky-800 rounded font-bold">GET</span></td>
                <td className="py-2.5 px-3 text-sky-700 font-bold">/api/v1/projects</td>
                <td className="py-2.5 px-3 font-sans text-slate-600">List all your hosted projects &amp; live URLs</td>
                <td className="py-2.5 px-3 text-slate-400">None</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3"><span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold">POST</span></td>
                <td className="py-2.5 px-3 text-sky-700 font-bold">/api/v1/projects</td>
                <td className="py-2.5 px-3 font-sans text-slate-600">Create new project workspace</td>
                <td className="py-2.5 px-3 text-slate-500">&#123; "name": "App Name", "slug": "app" &#125;</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3"><span className="px-2 py-0.5 bg-sky-100 text-sky-800 rounded font-bold">GET</span></td>
                <td className="py-2.5 px-3 text-sky-700 font-bold">/api/v1/projects/:id</td>
                <td className="py-2.5 px-3 font-sans text-slate-600">Get project details, files, and versions</td>
                <td className="py-2.5 px-3 text-slate-400">None</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3"><span className="px-2 py-0.5 bg-red-100 text-red-800 rounded font-bold">DELETE</span></td>
                <td className="py-2.5 px-3 text-sky-700 font-bold">/api/v1/projects/:id</td>
                <td className="py-2.5 px-3 font-sans text-slate-600">Delete project and purge files</td>
                <td className="py-2.5 px-3 text-slate-400">None</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3"><span className="px-2 py-0.5 bg-sky-100 text-sky-800 rounded font-bold">GET</span></td>
                <td className="py-2.5 px-3 text-sky-700 font-bold">/api/v1/me</td>
                <td className="py-2.5 px-3 font-sans text-slate-600">Account status, storage quota, and limits</td>
                <td className="py-2.5 px-3 text-slate-400">None</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Security Audit Activity */}
      {auditLogs.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-600" /> Recent Security &amp; API Events
            </h3>
            <span className="text-xs text-slate-400 font-mono">{auditLogs.length} events logged</span>
          </div>

          <div className="divide-y divide-slate-100 font-mono text-xs">
            {auditLogs.slice(0, 5).map((log) => (
              <div key={log.id} className="py-2.5 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span className="font-bold text-slate-800">{log.action}</span>
                  <span className="text-slate-400">({log.resourceType})</span>
                </div>
                <div className="flex items-center gap-3 text-slate-400 text-[11px]">
                  <span>IP: {log.ip}</span>
                  <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rotate Key Confirmation Modal */}
      {showRotateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 text-slate-900 animate-in zoom-in-95">
            <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-slate-900 mb-2">Rotate API Credential?</h3>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Generating a new key will <strong>immediately revoke and invalidate all previous API keys</strong>. Any CI/CD pipelines, automations, or scripts currently using the old token will fail until updated.
            </p>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setShowRotateModal(false)}
                disabled={isGenerating}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleRotateKey}
                disabled={isGenerating}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
              >
                {isGenerating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                <span>Confirm &amp; Rotate Key</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
