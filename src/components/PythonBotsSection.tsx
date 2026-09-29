import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Square,
  RefreshCw,
  Terminal,
  Plus,
  Trash2,
  Sliders,
  FileCode,
  Archive,
  Activity,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Copy,
  Check,
  Clock,
  Cpu,
  Shield,
  ExternalLink,
  X,
  UploadCloud,
  ChevronRight,
  Eye,
  EyeOff,
  Code2,
  Sparkles,
  Zap,
  Download
} from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import { PythonCodeEditorModal } from './PythonCodeEditorModal';
import { uploadLargeProjectChunked, ChunkedUploadProgress } from '../utils/chunkedUploader';

export interface PythonBot {
  id: string;
  name: string;
  description: string;
  entry_file: string;
  status: 'STOPPED' | 'STARTING' | 'RUNNING' | 'FAILED' | 'RESTARTING';
  restart_policy: 'always' | 'on-failure' | 'never';
  restart_count: number;
  pid: number | null;
  uptime_seconds: number;
  files_count: number;
  last_exit_code: number | null;
  last_error: string | null;
  env_vars_count: number;
  created_at: string;
  updated_at: string;
}

interface PythonBotsSectionProps {
  currentUser: FirebaseUser;
  currentOrigin: string;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const PythonBotsSection: React.FC<PythonBotsSectionProps> = ({
  currentUser,
  currentOrigin,
  onShowToast
}) => {
  const [bots, setBots] = useState<PythonBot[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Active Code Editor
  const [activeEditorBot, setActiveEditorBot] = useState<PythonBot | null>(null);

  // Live Logs Modal
  const [activeBotForLogs, setActiveBotForLogs] = useState<PythonBot | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [autoTail, setAutoTail] = useState(true);

  // Deploy New Bot Modal
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [creationMode, setCreationMode] = useState<'editor' | 'file' | 'zip'>('editor');
  const [selectedTemplate, setSelectedTemplate] = useState<'heartbeat' | 'telegram' | 'api_monitor'>('heartbeat');

  const [botFile, setBotFile] = useState<File | null>(null);
  const [botName, setBotName] = useState('');
  const [botDescription, setBotDescription] = useState('');
  const [entryFile, setEntryFile] = useState('bot.py');
  const [restartPolicy, setRestartPolicy] = useState<'always' | 'on-failure' | 'never'>('always');
  const [envPairs, setEnvPairs] = useState<{ key: string; value: string }[]>([
    { key: 'PYTHONUNBUFFERED', value: '1' }
  ]);
  const [autoStart, setAutoStart] = useState(true);
  const [openInEditorAfterUpload, setOpenInEditorAfterUpload] = useState(true);
  const [isDeploying, setIsDeploying] = useState(false);
  const [botUploadProgress, setBotUploadProgress] = useState<ChunkedUploadProgress | null>(null);

  // Config / Edit Modal
  const [configBot, setConfigBot] = useState<PythonBot | null>(null);
  const [configEnvPairs, setConfigEnvPairs] = useState<{ key: string; value: string }[]>([]);
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // Action busy states
  const [busyActionBotId, setBusyActionBotId] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const logsEndRef = useRef<HTMLDivElement>(null);
  const logPollingRef = useRef<NodeJS.Timeout | null>(null);

  const fetchBots = async () => {
    try {
      const res = await fetch('/api/v1/bots', {
        headers: { 'X-User-Uid': currentUser.uid }
      });
      const data = await res.json();
      if (data.success && data.bots) {
        setBots(data.bots);
      }
    } catch {
      onShowToast('Failed to load Python bots', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBots();
    const interval = setInterval(fetchBots, 5000);
    return () => clearInterval(interval);
  }, [currentUser.uid]);

  // Log Polling
  const fetchLogs = async (botId: string) => {
    try {
      const res = await fetch(`/api/v1/bots/${botId}/logs`, {
        headers: { 'X-User-Uid': currentUser.uid }
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.logs)) {
        setLogs(data.logs);
      }
    } catch {}
  };

  useEffect(() => {
    if (activeBotForLogs) {
      setIsLoadingLogs(true);
      fetchLogs(activeBotForLogs.id).finally(() => setIsLoadingLogs(false));

      if (logPollingRef.current) clearInterval(logPollingRef.current);
      logPollingRef.current = setInterval(() => {
        if (autoTail && activeBotForLogs) {
          fetchLogs(activeBotForLogs.id);
        }
      }, 2500);

      return () => {
        if (logPollingRef.current) clearInterval(logPollingRef.current);
      };
    }
  }, [activeBotForLogs?.id, autoTail]);

  useEffect(() => {
    if (autoTail && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const handleStartBot = async (botId: string) => {
    setBusyActionBotId(botId);
    try {
      const res = await fetch(`/api/v1/bots/${botId}/start`, {
        method: 'POST',
        headers: { 'X-User-Uid': currentUser.uid }
      });
      const data = await res.json();
      if (data.success) {
        onShowToast('Bot started in 24/7 background mode', 'success');
        fetchBots();
      } else {
        onShowToast(data.error?.message || data.message || 'Failed to start bot', 'error');
      }
    } catch {
      onShowToast('Error starting bot', 'error');
    } finally {
      setBusyActionBotId(null);
    }
  };

  const handleStopBot = async (botId: string) => {
    setBusyActionBotId(botId);
    try {
      const res = await fetch(`/api/v1/bots/${botId}/stop`, {
        method: 'POST',
        headers: { 'X-User-Uid': currentUser.uid }
      });
      const data = await res.json();
      if (data.success) {
        onShowToast('Bot stopped cleanly', 'info');
        fetchBots();
      } else {
        onShowToast('Failed to stop bot', 'error');
      }
    } catch {
      onShowToast('Error stopping bot', 'error');
    } finally {
      setBusyActionBotId(null);
    }
  };

  const handleRestartBot = async (botId: string) => {
    setBusyActionBotId(botId);
    try {
      const res = await fetch(`/api/v1/bots/${botId}/restart`, {
        method: 'POST',
        headers: { 'X-User-Uid': currentUser.uid }
      });
      const data = await res.json();
      if (data.success) {
        onShowToast('Bot restarted successfully', 'success');
        fetchBots();
      } else {
        onShowToast(data.error?.message || data.message || 'Failed to restart bot', 'error');
      }
    } catch {
      onShowToast('Error restarting bot', 'error');
    } finally {
      setBusyActionBotId(null);
    }
  };

  const handleDeleteBot = async (botId: string, name: string) => {
    if (!confirm(`Are you sure you want to stop and delete bot "${name}"? All project files and logs will be permanently deleted.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/v1/bots/${botId}`, {
        method: 'DELETE',
        headers: { 'X-User-Uid': currentUser.uid }
      });
      const data = await res.json();
      if (data.success) {
        onShowToast('Bot deleted successfully', 'info');
        if (activeBotForLogs?.id === botId) {
          setActiveBotForLogs(null);
        }
        if (activeEditorBot?.id === botId) {
          setActiveEditorBot(null);
        }
        fetchBots();
      } else {
        onShowToast('Failed to delete bot', 'error');
      }
    } catch {
      onShowToast('Error deleting bot', 'error');
    }
  };

  const handleClearLogs = async (botId: string) => {
    try {
      await fetch(`/api/v1/bots/${botId}/logs`, {
        method: 'DELETE',
        headers: { 'X-User-Uid': currentUser.uid }
      });
      setLogs([]);
      onShowToast('Logs cleared', 'info');
    } catch {}
  };

  // Creation Handler (Editor / File / ZIP)
  const handleCreateBot = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsDeploying(true);
    try {
      if (creationMode === 'editor') {
        // Mode 1: Online Code Editor from Scratch or Template
        const res = await fetch('/api/v1/bots/create-empty', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Uid': currentUser.uid
          },
          body: JSON.stringify({
            name: botName.trim() || 'Python Worker Bot',
            description: botDescription.trim() || 'Persistent 24/7 background worker',
            entryFile: entryFile.trim() || 'bot.py',
            template: selectedTemplate
          })
        });

        const data = await res.json();
        if (data.success && data.bot) {
          onShowToast('Project created! Opening Code Editor...', 'success');
          setShowDeployModal(false);
          setBotName('');
          setBotDescription('');
          fetchBots();
          setActiveEditorBot(data.bot);
        } else {
          onShowToast(data.error?.message || 'Failed to create bot', 'error');
        }
      } else {
        // Mode 2 & 3: Upload .py or .zip file
        if (!botFile) {
          onShowToast('Please select a file to upload', 'error');
          setIsDeploying(false);
          return;
        }

        const envObj: Record<string, string> = {};
        envPairs.forEach((p) => {
          if (p.key.trim()) envObj[p.key.trim()] = p.value;
        });

        // Use Resumable Chunked Uploader for Large Files (> 10MB)
        if (botFile.size > 10 * 1024 * 1024) {
          const result = await uploadLargeProjectChunked({
            file: botFile,
            userId: currentUser.uid,
            targetType: 'bot',
            metadata: {
              name: botName.trim() || botFile.name.replace(/\.[^/.]+$/, ''),
              description: botDescription.trim(),
              entryFile: entryFile.trim() || 'bot.py',
              restartPolicy,
              autoStart,
              envVars: envObj
            },
            onProgress: (prog) => {
              setBotUploadProgress(prog);
            }
          });

          if (result.success && result.bot) {
            onShowToast('Large Python project uploaded, assembled & running 24/7!', 'success');
            setShowDeployModal(false);
            setBotFile(null);
            setBotName('');
            setBotDescription('');
            setBotUploadProgress(null);
            fetchBots();
            if (openInEditorAfterUpload) {
              setActiveEditorBot(result.bot);
            }
            return;
          }
        }

        const formData = new FormData();
        formData.append('file', botFile);
        formData.append('name', botName.trim() || botFile.name.replace(/\.[^/.]+$/, ''));
        formData.append('description', botDescription.trim());
        formData.append('entryFile', entryFile.trim() || 'bot.py');
        formData.append('restartPolicy', restartPolicy);
        formData.append('autoStart', String(autoStart));
        formData.append('envVars', JSON.stringify(envObj));

        const res = await fetch('/api/v1/bots', {
          method: 'POST',
          headers: { 'X-User-Uid': currentUser.uid },
          body: formData
        });

        const data = await res.json();
        if (data.success && data.bot) {
          onShowToast('Python bot deployed & running 24/7 in background!', 'success');
          setShowDeployModal(false);
          setBotFile(null);
          setBotName('');
          setBotDescription('');
          fetchBots();

          if (openInEditorAfterUpload) {
            setActiveEditorBot(data.bot);
          }
        } else {
          onShowToast(data.error?.message || data.message || 'Deployment failed', 'error');
        }
      }
    } catch {
      onShowToast('Error creating bot', 'error');
    } finally {
      setIsDeploying(false);
    }
  };

  const handleOpenConfig = async (bot: PythonBot) => {
    setConfigBot(bot);
    try {
      const res = await fetch(`/api/v1/bots/${bot.id}`, {
        headers: { 'X-User-Uid': currentUser.uid }
      });
      const data = await res.json();
      if (data.success && data.bot.env_vars) {
        const pairs = Object.entries(data.bot.env_vars).map(([k, v]) => ({ key: k, value: String(v) }));
        setConfigEnvPairs(pairs.length > 0 ? pairs : [{ key: 'PYTHONUNBUFFERED', value: '1' }]);
      }
    } catch {}
  };

  const handleSaveConfig = async () => {
    if (!configBot) return;
    setIsSavingConfig(true);
    try {
      const envObj: Record<string, string> = {};
      configEnvPairs.forEach((p) => {
        if (p.key.trim()) envObj[p.key.trim()] = p.value;
      });

      const res = await fetch(`/api/v1/bots/${configBot.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Uid': currentUser.uid
        },
        body: JSON.stringify({
          name: configBot.name,
          description: configBot.description,
          entryFile: configBot.entry_file,
          restartPolicy: configBot.restart_policy,
          envVars: envObj
        })
      });

      const data = await res.json();
      if (data.success) {
        onShowToast('Bot configuration saved! Restart bot to apply changes.', 'success');
        setConfigBot(null);
        fetchBots();
      } else {
        onShowToast('Failed to save configuration', 'error');
      }
    } catch {
      onShowToast('Error saving configuration', 'error');
    } finally {
      setIsSavingConfig(false);
    }
  };

  const formatUptime = (seconds: number) => {
    if (!seconds || seconds <= 0) return '0s';
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    parts.push(`${s}s`);
    return parts.join(' ');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white rounded-2xl p-5 sm:p-6 border border-emerald-800/50 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-emerald-500/10 to-transparent pointer-events-none"></div>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30">
                <Cpu className="w-4 h-4" />
              </span>
              <h2 className="text-lg font-extrabold text-white tracking-tight">24/7 Python Bot &amp; Background Worker Engine</h2>
              <span className="text-[10px] px-2 py-0.5 bg-emerald-500/20 text-emerald-300 font-mono font-bold rounded-md border border-emerald-500/40 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                ACTIVE RUNNER + CODE EDITOR
              </span>
            </div>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Write, edit, and run Python code in the browser. Deploy Discord bots, Telegram pollers, automated scrapers, and 24/7 workers. Workers run persistently in the backend even when you close the website or log out.
            </p>
          </div>

          <button
            onClick={() => {
              setCreationMode('editor');
              setShowDeployModal(true);
            }}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>New Python Bot</span>
          </button>
        </div>
      </div>

      {/* Bots Grid */}
      {isLoading ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
          <RefreshCw className="w-6 h-6 animate-spin text-slate-400 mx-auto mb-2" />
          <p className="text-xs text-slate-500">Loading your background workers...</p>
        </div>
      ) : bots.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-300 p-8 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
            <Code2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">No Python Bots Running</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mb-5 leading-relaxed">
            Write code in the built-in online editor, upload a single Python file, or drop a complete ZIP project to launch a persistent 24/7 background worker process.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => {
                setCreationMode('editor');
                setShowDeployModal(true);
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer inline-flex items-center gap-2"
            >
              <Code2 className="w-4 h-4" />
              <span>Write in Code Editor</span>
            </button>
            <button
              onClick={() => {
                setCreationMode('file');
                setShowDeployModal(true);
              }}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer inline-flex items-center gap-2"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload .py / ZIP</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {bots.map((bot) => {
            const isRunning = bot.status === 'RUNNING';
            const isBusy = busyActionBotId === bot.id;

            return (
              <div
                key={bot.id}
                className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl p-5 shadow-xs transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900">{bot.name}</h3>
                        {isRunning && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            RUNNING
                          </span>
                        )}
                        {bot.status === 'STOPPED' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            STOPPED
                          </span>
                        )}
                        {bot.status === 'STARTING' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            STARTING...
                          </span>
                        )}
                        {bot.status === 'RESTARTING' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                            RESTARTING...
                          </span>
                        )}
                        {bot.status === 'FAILED' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-red-100 text-red-800 border border-red-200">
                            FAILED
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{bot.description || 'No description'}</p>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenConfig(bot)}
                        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        title="Environment Variables &amp; Config"
                      >
                        <Sliders className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteBot(bot.id, bot.name)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete Bot"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Runtime Stats Strip */}
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 grid grid-cols-3 gap-2 font-mono text-xs mb-4">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">Uptime</span>
                      <span className="text-slate-800 font-bold">{isRunning ? formatUptime(bot.uptime_seconds) : '—'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">PID / Entry</span>
                      <span className="text-slate-800 font-semibold truncate block">
                        {isRunning ? `${bot.pid}` : bot.entry_file}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">Auto-Restart</span>
                      <span className="text-slate-800 font-semibold capitalize">{bot.restart_policy}</span>
                    </div>
                  </div>

                  {bot.last_error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-2.5 text-xs font-mono mb-3 line-clamp-2">
                      <span className="font-bold">Error:</span> {bot.last_error}
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    {/* OPEN ONLINE CODE EDITOR */}
                    <button
                      onClick={() => setActiveEditorBot(bot)}
                      className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-mono text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 border border-emerald-200"
                      title="Open in Online Python Code Editor"
                    >
                      <Code2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Code Editor</span>
                    </button>

                    <button
                      onClick={() => setActiveBotForLogs(bot)}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-sky-300 font-mono text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Terminal className="w-3.5 h-3.5 text-sky-400" />
                      <span>Console</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {isRunning ? (
                      <>
                        <button
                          onClick={() => handleRestartBot(bot.id)}
                          disabled={isBusy}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-1 disabled:opacity-50"
                          title="Restart Bot Process"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isBusy ? 'animate-spin' : ''}`} />
                          <span>Restart</span>
                        </button>
                        <button
                          onClick={() => handleStopBot(bot.id)}
                          disabled={isBusy}
                          className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1 disabled:opacity-50"
                        >
                          <Square className="w-3.5 h-3.5 fill-red-600 text-red-600" />
                          <span>Stop</span>
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleStartBot(bot.id)}
                        disabled={isBusy}
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50 shadow-xs"
                      >
                        <Play className="w-3.5 h-3.5 fill-white" />
                        <span>{isBusy ? 'Starting...' : 'Start Bot'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Deploy / Create New Bot Modal */}
      {showDeployModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl p-6 text-slate-900 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Create &amp; Deploy Python Bot</h3>
                  <p className="text-xs text-slate-500">Persistent 24/7 background process execution</p>
                </div>
              </div>
              <button
                onClick={() => setShowDeployModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Creation Pathway Tabs */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl mb-4 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setCreationMode('editor')}
                className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  creationMode === 'editor' ? 'bg-white text-emerald-800 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Code2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Write in Code Editor</span>
              </button>
              <button
                type="button"
                onClick={() => setCreationMode('file')}
                className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  creationMode === 'file' ? 'bg-white text-emerald-800 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileCode className="w-3.5 h-3.5 text-emerald-600" />
                <span>Upload .py File</span>
              </button>
              <button
                type="button"
                onClick={() => setCreationMode('zip')}
                className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  creationMode === 'zip' ? 'bg-white text-emerald-800 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Archive className="w-3.5 h-3.5 text-emerald-600" />
                <span>Upload ZIP Project</span>
              </button>
            </div>

            <form onSubmit={handleCreateBot} className="space-y-4">
              {creationMode === 'editor' ? (
                /* Online Code Editor Starter Templates */
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Choose Starter Template</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div
                      onClick={() => setSelectedTemplate('heartbeat')}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        selectedTemplate === 'heartbeat'
                          ? 'border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-500'
                          : 'border-slate-200 hover:border-slate-300 bg-slate-50'
                      }`}
                    >
                      <Zap className="w-4 h-4 text-emerald-600 mb-1" />
                      <div className="text-xs font-bold text-slate-900">Worker Loop</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">Clean 24/7 background heartbeat task</div>
                    </div>

                    <div
                      onClick={() => setSelectedTemplate('telegram')}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        selectedTemplate === 'telegram'
                          ? 'border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-500'
                          : 'border-slate-200 hover:border-slate-300 bg-slate-50'
                      }`}
                    >
                      <Sparkles className="w-4 h-4 text-sky-600 mb-1" />
                      <div className="text-xs font-bold text-slate-900">Telegram Bot</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">24/7 Polling with standard library</div>
                    </div>

                    <div
                      onClick={() => setSelectedTemplate('api_monitor')}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        selectedTemplate === 'api_monitor'
                          ? 'border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-500'
                          : 'border-slate-200 hover:border-slate-300 bg-slate-50'
                      }`}
                    >
                      <Activity className="w-4 h-4 text-amber-600 mb-1" />
                      <div className="text-xs font-bold text-slate-900">Uptime Poller</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">24/7 external API/URL monitor</div>
                    </div>
                  </div>
                </div>
              ) : (
                /* File / ZIP Upload Area */
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {creationMode === 'file' ? 'Upload Python Script (.py)' : 'Upload ZIP Project Archive'}
                  </label>
                  <div className="border-2 border-dashed border-slate-200 hover:border-emerald-500 rounded-xl p-4 text-center cursor-pointer transition-colors bg-slate-50 relative">
                    <input
                      type="file"
                      accept={creationMode === 'file' ? '.py' : '.zip'}
                      required
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setBotFile(file);
                          if (!botName) setBotName(file.name.replace(/\.[^/.]+$/, ''));
                          if (file.name.endsWith('.py')) setEntryFile(file.name);
                        }
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <div className="flex flex-col items-center">
                      <UploadCloud className="w-8 h-8 text-emerald-600 mb-1" />
                      {botFile ? (
                        <span className="text-xs font-mono font-bold text-emerald-700">{botFile.name} ({(botFile.size / 1024).toFixed(1)} KB)</span>
                      ) : (
                        <>
                          <span className="text-xs font-semibold text-slate-700">Click to browse or drop {creationMode === 'file' ? '.py file' : '.zip archive'}</span>
                          <span className="text-[10px] text-slate-400 mt-0.5">Validated against ZIP Slip and sandboxed</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Bot Name</label>
                  <input
                    type="text"
                    required
                    value={botName}
                    onChange={(e) => setBotName(e.target.value)}
                    placeholder="e.g. My Telegram Bot"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Entry Script File</label>
                  <input
                    type="text"
                    required
                    value={entryFile}
                    onChange={(e) => setEntryFile(e.target.value)}
                    placeholder="bot.py or main.py"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description (Optional)</label>
                <input
                  type="text"
                  value={botDescription}
                  onChange={(e) => setBotDescription(e.target.value)}
                  placeholder="Automated moderation worker"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {creationMode !== 'editor' && (
                <>
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="openEditorCheck"
                      checked={openInEditorAfterUpload}
                      onChange={(e) => setOpenInEditorAfterUpload(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <label htmlFor="openEditorCheck" className="text-xs text-slate-700 cursor-pointer font-semibold">
                      Open code in Online Editor immediately after upload
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="autoStartCheck"
                      checked={autoStart}
                      onChange={(e) => setAutoStart(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <label htmlFor="autoStartCheck" className="text-xs text-slate-700 cursor-pointer">
                      Start process immediately in 24/7 background mode
                    </label>
                  </div>
                </>
              )}

              {botUploadProgress && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1.5 font-mono">
                  <div className="flex justify-between text-xs text-emerald-900 font-bold">
                    <span>Streaming chunk {botUploadProgress.currentChunk} of {botUploadProgress.totalChunks}...</span>
                    <span>{botUploadProgress.percentage}%</span>
                  </div>
                  <div className="w-full bg-emerald-200 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-600 h-full transition-all duration-300 rounded-full"
                      style={{ width: `${botUploadProgress.percentage}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-emerald-700">
                    <span>Status: {botUploadProgress.status}</span>
                    <span>{(botUploadProgress.uploadedBytes / (1024 * 1024)).toFixed(1)} / {(botUploadProgress.totalBytes / (1024 * 1024)).toFixed(1)} MB</span>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowDeployModal(false)}
                  disabled={isDeploying}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isDeploying || (creationMode !== 'editor' && !botFile)}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-sm disabled:opacity-50"
                >
                  {isDeploying ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : creationMode === 'editor' ? (
                    <Code2 className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4 fill-white" />
                  )}
                  <span>
                    {isDeploying
                      ? 'Creating...'
                      : creationMode === 'editor'
                      ? 'Open in Code Editor'
                      : 'Deploy & Run 24/7'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Online Python Code Editor Modal */}
      {activeEditorBot && (
        <PythonCodeEditorModal
          bot={activeEditorBot}
          currentUser={currentUser}
          onClose={() => {
            setActiveEditorBot(null);
            fetchBots();
          }}
          onShowToast={onShowToast}
          onBotUpdated={fetchBots}
        />
      )}

      {/* Live Console / Logs Modal */}
      {activeBotForLogs && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 rounded-2xl max-w-4xl w-full border border-slate-800 shadow-2xl flex flex-col h-[80vh] text-white overflow-hidden">
            {/* Console Header */}
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <Terminal className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="text-xs font-bold text-white font-mono flex items-center gap-2">
                    <span>{activeBotForLogs.name} — Live stdout/stderr</span>
                    {activeBotForLogs.status === 'RUNNING' && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    )}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-mono">
                    PID: {activeBotForLogs.pid || 'Inactive'} &bull; Status: {activeBotForLogs.status}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAutoTail(!autoTail)}
                  className={`px-2.5 py-1 text-[11px] font-mono rounded-lg transition-colors cursor-pointer border ${
                    autoTail ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  Auto-Tail: {autoTail ? 'ON' : 'PAUSED'}
                </button>
                <button
                  onClick={() => fetchLogs(activeBotForLogs.id)}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors cursor-pointer"
                  title="Refresh Logs"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleClearLogs(activeBotForLogs.id)}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors cursor-pointer"
                  title="Clear Console Output"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setActiveBotForLogs(null)}
                  className="p-1.5 text-slate-400 hover:text-white cursor-pointer ml-2"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Console Output Terminal */}
            <div className="flex-1 p-4 bg-slate-950/90 font-mono text-xs overflow-y-auto leading-relaxed text-sky-200 select-text">
              {isLoadingLogs ? (
                <div className="text-slate-500">Connecting to live process stream...</div>
              ) : logs.length === 0 ? (
                <div className="text-slate-500">No output logged yet. Waiting for process events...</div>
              ) : (
                logs.map((log, idx) => (
                  <div key={idx} className="whitespace-pre-wrap break-all hover:bg-slate-900/40 px-1 rounded">
                    {log}
                  </div>
                ))
              )}
              <div ref={logsEndRef} />
            </div>

            {/* Console Footer */}
            <div className="p-3 bg-slate-950 border-t border-slate-800 text-[11px] text-slate-400 font-mono flex items-center justify-between">
              <span>Live background worker telemetry &bull; Runs 24/7 independently</span>
              <span>{logs.length} lines</span>
            </div>
          </div>
        </div>
      )}

      {/* Config / Environment Variables Modal */}
      {configBot && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 text-slate-900 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-600" />
                Configure Bot: {configBot.name}
              </h3>
              <button onClick={() => setConfigBot(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Bot Name</label>
                <input
                  type="text"
                  value={configBot.name}
                  onChange={(e) => setConfigBot({ ...configBot, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Entry Script File</label>
                <input
                  type="text"
                  value={configBot.entry_file}
                  onChange={(e) => setConfigBot({ ...configBot, entry_file: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Restart Recovery Policy</label>
                <select
                  value={configBot.restart_policy}
                  onChange={(e) => setConfigBot({ ...configBot, restart_policy: e.target.value as any })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                >
                  <option value="always">Always (24/7 Continuous auto-restart)</option>
                  <option value="on-failure">On Failure (Restart only on crash exit)</option>
                  <option value="never">Never (Do not auto-restart)</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">Environment Variables (Secrets)</label>
                  <button
                    type="button"
                    onClick={() => setConfigEnvPairs([...configEnvPairs, { key: '', value: '' }])}
                    className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer"
                  >
                    + Add
                  </button>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto p-1 bg-slate-50 rounded-xl border border-slate-100">
                  {configEnvPairs.map((pair, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="KEY"
                        value={pair.key}
                        onChange={(e) => {
                          const updated = [...configEnvPairs];
                          updated[idx].key = e.target.value;
                          setConfigEnvPairs(updated);
                        }}
                        className="flex-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-mono"
                      />
                      <input
                        type="password"
                        placeholder="VALUE"
                        value={pair.value}
                        onChange={(e) => {
                          const updated = [...configEnvPairs];
                          updated[idx].value = e.target.value;
                          setConfigEnvPairs(updated);
                        }}
                        className="flex-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setConfigEnvPairs(configEnvPairs.filter((_, i) => i !== idx))}
                        className="text-slate-400 hover:text-red-600 p-1"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 mt-5">
              <button
                type="button"
                onClick={() => setConfigBot(null)}
                disabled={isSavingConfig}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveConfig}
                disabled={isSavingConfig}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
              >
                {isSavingConfig ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>Save Configuration</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
