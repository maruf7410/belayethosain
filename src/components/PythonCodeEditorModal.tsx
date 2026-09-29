import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Square,
  RefreshCw,
  Save,
  Download,
  X,
  FileCode,
  Folder,
  Plus,
  Trash2,
  Terminal,
  Search,
  Replace,
  Clock,
  Cpu,
  Check,
  AlertCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  File,
  Layers,
  Zap,
  Info
} from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import { PythonBot } from './PythonBotsSection';

interface BotFileItem {
  path: string;
  name: string;
  size: number;
  is_editable: boolean;
}

interface PythonCodeEditorModalProps {
  bot: PythonBot;
  currentUser: FirebaseUser;
  onClose: () => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onBotUpdated?: () => void;
}

export const PythonCodeEditorModal: React.FC<PythonCodeEditorModalProps> = ({
  bot,
  currentUser,
  onClose,
  onShowToast,
  onBotUpdated
}) => {
  const [currentBot, setCurrentBot] = useState<PythonBot>(bot);
  const [files, setFiles] = useState<BotFileItem[]>([]);
  const [activeFilePath, setActiveFilePath] = useState<string>(bot.entry_file || 'bot.py');
  const [fileContent, setFileContent] = useState<string>('');
  const [initialContent, setInitialContent] = useState<string>('');
  const [isModified, setIsModified] = useState(false);

  // Loading states
  const [isLoadingFiles, setIsLoadingFiles] = useState(true);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);

  // Search & Replace
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [matchCount, setMatchCount] = useState(0);

  // New File State
  const [showNewFileModal, setShowNewFileModal] = useState(false);
  const [newFileName, setNewFileName] = useState('');

  // Console / Logs state
  const [showConsole, setShowConsole] = useState(true);
  const [logs, setLogs] = useState<string[]>([]);
  const [autoTail, setAutoTail] = useState(true);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const consoleBottomRef = useRef<HTMLDivElement>(null);
  const logPollingRef = useRef<NodeJS.Timeout | null>(null);
  const botPollingRef = useRef<NodeJS.Timeout | null>(null);

  // Load project files
  const fetchFiles = async () => {
    try {
      const res = await fetch(`/api/v1/bots/${currentBot.id}/files`, {
        headers: { 'X-User-Uid': currentUser.uid }
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.files)) {
        setFiles(data.files);
        // Default to entry file or first file
        if (!activeFilePath && data.files.length > 0) {
          const entry = data.files.find((f: BotFileItem) => f.path === currentBot.entry_file);
          setActiveFilePath(entry ? entry.path : data.files[0].path);
        }
      }
    } catch {
      onShowToast('Failed to load project files', 'error');
    } finally {
      setIsLoadingFiles(false);
    }
  };

  // Load file content
  const loadFileContent = async (filePath: string) => {
    setIsLoadingContent(true);
    try {
      const res = await fetch(`/api/v1/bots/${currentBot.id}/files/read?file=${encodeURIComponent(filePath)}`, {
        headers: { 'X-User-Uid': currentUser.uid }
      });
      const data = await res.json();
      if (data.success) {
        setFileContent(data.content || '');
        setInitialContent(data.content || '');
        setIsModified(false);
        setActiveFilePath(filePath);
      } else {
        onShowToast(data.error?.message || 'Failed to read file', 'error');
      }
    } catch {
      onShowToast('Error loading file content', 'error');
    } finally {
      setIsLoadingContent(false);
    }
  };

  // Poll bot runtime status
  const refreshBotStatus = async () => {
    try {
      const res = await fetch(`/api/v1/bots/${currentBot.id}`, {
        headers: { 'X-User-Uid': currentUser.uid }
      });
      const data = await res.json();
      if (data.success && data.bot) {
        setCurrentBot((prev) => ({
          ...prev,
          status: data.bot.status,
          pid: data.bot.pid,
          uptime_seconds: data.bot.uptime_seconds,
          last_error: data.bot.last_error
        }));
      }
    } catch {}
  };

  // Fetch console logs
  const fetchLogs = async () => {
    try {
      const res = await fetch(`/api/v1/bots/${currentBot.id}/logs`, {
        headers: { 'X-User-Uid': currentUser.uid }
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.logs)) {
        setLogs(data.logs);
      }
    } catch {}
  };

  useEffect(() => {
    fetchFiles();
    loadFileContent(activeFilePath || currentBot.entry_file || 'bot.py');

    botPollingRef.current = setInterval(refreshBotStatus, 4000);
    logPollingRef.current = setInterval(() => {
      if (autoTail && showConsole) {
        fetchLogs();
      }
    }, 2500);

    return () => {
      if (botPollingRef.current) clearInterval(botPollingRef.current);
      if (logPollingRef.current) clearInterval(logPollingRef.current);
    };
  }, [currentBot.id]);

  useEffect(() => {
    if (autoTail && consoleBottomRef.current) {
      consoleBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Handle Code Change
  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setFileContent(val);
    setIsModified(val !== initialContent);
  };

  // Tab key handling for indenting
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      handleSave();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleDeploy();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
      e.preventDefault();
      setShowFindReplace((prev) => !prev);
      return;
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;

      const newContent = fileContent.substring(0, start) + '    ' + fileContent.substring(end);
      setFileContent(newContent);
      setIsModified(true);

      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 4;
      }, 0);
    }
  };

  // Save File
  const handleSave = async (): Promise<boolean> => {
    if (!activeFilePath) return false;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/v1/bots/${currentBot.id}/files/write`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Uid': currentUser.uid
        },
        body: JSON.stringify({
          file: activeFilePath,
          content: fileContent
        })
      });
      const data = await res.json();
      if (data.success) {
        setInitialContent(fileContent);
        setIsModified(false);
        onShowToast(`Saved ${activeFilePath}`, 'success');
        return true;
      } else {
        onShowToast(data.error?.message || 'Failed to save file', 'error');
        return false;
      }
    } catch {
      onShowToast('Error saving file', 'error');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // Instant Deploy / Run
  const handleDeploy = async () => {
    setIsDeploying(true);
    try {
      // 1. Save modified file first
      if (isModified) {
        const saved = await handleSave();
        if (!saved) {
          setIsDeploying(false);
          return;
        }
      }

      // 2. Trigger deployment
      const res = await fetch(`/api/v1/bots/${currentBot.id}/deploy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Uid': currentUser.uid
        },
        body: JSON.stringify({
          entryFile: currentBot.entry_file,
          note: `Code Editor Deployment (${new Date().toLocaleTimeString()})`
        })
      });

      const data = await res.json();
      if (data.success) {
        onShowToast(`Version ${data.version || 'new'} deployed & running 24/7!`, 'success');
        setShowConsole(true);
        fetchLogs();
        refreshBotStatus();
        if (onBotUpdated) onBotUpdated();
      } else {
        onShowToast(data.error?.message || 'Deployment failed to launch', 'error');
      }
    } catch {
      onShowToast('Deployment connection error', 'error');
    } finally {
      setIsDeploying(false);
    }
  };

  // Start / Stop Controls
  const handleStart = async () => {
    try {
      const res = await fetch(`/api/v1/bots/${currentBot.id}/start`, {
        method: 'POST',
        headers: { 'X-User-Uid': currentUser.uid }
      });
      const data = await res.json();
      if (data.success) {
        onShowToast('Bot process started in 24/7 background mode', 'success');
        refreshBotStatus();
        fetchLogs();
      } else {
        onShowToast(data.error?.message || 'Failed to start bot', 'error');
      }
    } catch {}
  };

  const handleStop = async () => {
    try {
      const res = await fetch(`/api/v1/bots/${currentBot.id}/stop`, {
        method: 'POST',
        headers: { 'X-User-Uid': currentUser.uid }
      });
      const data = await res.json();
      if (data.success) {
        onShowToast('Bot process stopped', 'info');
        refreshBotStatus();
        fetchLogs();
      } else {
        onShowToast('Failed to stop bot', 'error');
      }
    } catch {}
  };

  const handleRestart = async () => {
    try {
      const res = await fetch(`/api/v1/bots/${currentBot.id}/restart`, {
        method: 'POST',
        headers: { 'X-User-Uid': currentUser.uid }
      });
      const data = await res.json();
      if (data.success) {
        onShowToast('Bot restarted', 'success');
        refreshBotStatus();
        fetchLogs();
      } else {
        onShowToast('Restart failed', 'error');
      }
    } catch {}
  };

  // Create new file
  const handleCreateFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim()) return;

    try {
      const res = await fetch(`/api/v1/bots/${currentBot.id}/files/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Uid': currentUser.uid
        },
        body: JSON.stringify({ file: newFileName.trim(), content: '# Python module\n' })
      });
      const data = await res.json();
      if (data.success) {
        onShowToast(`Created ${newFileName}`, 'success');
        setShowNewFileModal(false);
        setNewFileName('');
        fetchFiles();
        loadFileContent(newFileName.trim());
      } else {
        onShowToast(data.error?.message || 'Failed to create file', 'error');
      }
    } catch {}
  };

  // Delete file
  const handleDeleteFile = async (filePath: string) => {
    if (filePath === currentBot.entry_file) {
      onShowToast('Cannot delete entry script file', 'error');
      return;
    }
    if (!confirm(`Delete file "${filePath}"?`)) return;

    try {
      const res = await fetch(`/api/v1/bots/${currentBot.id}/files/delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Uid': currentUser.uid
        },
        body: JSON.stringify({ file: filePath })
      });
      const data = await res.json();
      if (data.success) {
        onShowToast(`Deleted ${filePath}`, 'info');
        fetchFiles();
        if (activeFilePath === filePath) {
          loadFileContent(currentBot.entry_file || 'bot.py');
        }
      }
    } catch {}
  };

  // Find & Replace Helpers
  const handleFind = () => {
    if (!searchQuery) return;
    const regex = new RegExp(searchQuery, 'g');
    const matches = fileContent.match(regex);
    setMatchCount(matches ? matches.length : 0);
  };

  const handleReplaceAll = () => {
    if (!searchQuery) return;
    const updated = fileContent.split(searchQuery).join(replaceQuery);
    setFileContent(updated);
    setIsModified(true);
    onShowToast(`Replaced all occurrences of "${searchQuery}"`, 'success');
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

  // Generate line numbers
  const lines = fileContent.split('\n');

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-xs flex flex-col text-slate-100 overflow-hidden animate-in fade-in select-none">
      {/* Top Application Bar */}
      <div className="h-14 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between gap-3 shrink-0">
        {/* Left: Bot Identity & Active File */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shrink-0">
            <Cpu className="w-4 h-4" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-xs sm:text-sm font-bold text-white truncate">{currentBot.name}</h2>
              {/* Bot Status Indicator */}
              {currentBot.status === 'RUNNING' && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  RUNNING (PID: {currentBot.pid || '—'})
                </span>
              )}
              {currentBot.status === 'STOPPED' && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-800 text-slate-400 border border-slate-700">
                  STOPPED
                </span>
              )}
              {currentBot.status === 'STARTING' && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                  STARTING...
                </span>
              )}
              {currentBot.status === 'RESTARTING' && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                  RESTARTING...
                </span>
              )}
              {currentBot.status === 'FAILED' && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-red-500/20 text-red-300 border border-red-500/40">
                  FAILED
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
              <span className="truncate">
                Editing: <strong className="text-sky-300">{activeFilePath}</strong>
                {isModified && <span className="text-amber-400 ml-1 font-bold">* (unsaved)</span>}
              </span>
              {currentBot.status === 'RUNNING' && (
                <span className="hidden sm:inline-flex items-center gap-1 text-slate-400">
                  <Clock className="w-3 h-3 text-emerald-400" />
                  Uptime: {formatUptime(currentBot.uptime_seconds)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Actions (Save, Deploy, Run/Stop, Download, Close) */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowFindReplace(!showFindReplace)}
            className={`p-1.5 rounded-lg border text-xs font-mono transition-colors cursor-pointer ${
              showFindReplace
                ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
            title="Find &amp; Replace (Ctrl+F)"
          >
            <Search className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => handleSave()}
            disabled={isSaving || !isModified}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-bold rounded-xl border border-slate-700 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-40"
            title="Save file to disk (Ctrl+S)"
          >
            <Save className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isSaving ? 'Saving...' : 'Save'}</span>
          </button>

          {/* ONE-CLICK DEPLOY BUTTON */}
          <button
            onClick={handleDeploy}
            disabled={isDeploying}
            className="px-4 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold font-mono rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            title="Save, Build Version Snapshot, and Deploy 24/7 (Ctrl+Enter)"
          >
            <Zap className={`w-3.5 h-3.5 fill-white ${isDeploying ? 'animate-bounce' : ''}`} />
            <span>{isDeploying ? 'Deploying...' : 'Deploy & Run 24/7'}</span>
          </button>

          {/* Process Controls */}
          {currentBot.status === 'RUNNING' ? (
            <div className="flex items-center gap-1">
              <button
                onClick={handleRestart}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors cursor-pointer"
                title="Restart Process"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleStop}
                className="px-2.5 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 font-mono text-xs rounded-xl border border-red-500/40 transition-colors cursor-pointer flex items-center gap-1"
                title="Stop Process"
              >
                <Square className="w-3 h-3 fill-red-400 text-red-400" />
                <span className="hidden sm:inline">Stop</span>
              </button>
            </div>
          ) : (
            <button
              onClick={handleStart}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 font-mono text-xs rounded-xl border border-slate-700 transition-colors cursor-pointer flex items-center gap-1"
              title="Start Process"
            >
              <Play className="w-3 h-3 fill-emerald-400 text-emerald-400" />
              <span>Start</span>
            </button>
          )}

          <a
            href={`/api/v1/bots/${currentBot.id}/download`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors cursor-pointer"
            title="Download Project ZIP"
          >
            <Download className="w-3.5 h-3.5" />
          </a>

          {/* Close Editor Notice: leaves bot running 24/7 */}
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer ml-1"
            title="Close Editor (Bot keeps running in background)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: File Explorer */}
        <div className="w-56 sm:w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0">
          <div className="p-3 border-b border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Folder className="w-3.5 h-3.5 text-amber-400" />
              Project Files
            </span>
            <button
              onClick={() => setShowNewFileModal(true)}
              className="p-1 text-slate-400 hover:text-emerald-400 cursor-pointer"
              title="Create New File"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {isLoadingFiles ? (
              <div className="p-3 text-xs text-slate-500 font-mono">Loading files...</div>
            ) : files.length === 0 ? (
              <div className="p-3 text-xs text-slate-500">No files found</div>
            ) : (
              files.map((file) => {
                const isActive = file.path === activeFilePath;
                const isEntry = file.path === currentBot.entry_file;

                return (
                  <div
                    key={file.path}
                    onClick={() => {
                      if (file.path !== activeFilePath) {
                        loadFileContent(file.path);
                      }
                    }}
                    className={`group flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-mono cursor-pointer transition-colors ${
                      isActive
                        ? 'bg-slate-800 text-sky-300 font-bold border border-slate-700'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate min-w-0">
                      <FileCode className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-sky-400' : 'text-slate-500'}`} />
                      <span className="truncate">{file.path}</span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 ml-1">
                      {isEntry && (
                        <span className="text-[9px] px-1 py-0.2 bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/40">
                          ENTRY
                        </span>
                      )}
                      {!isEntry && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteFile(file.path);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-500 hover:text-red-400 transition-opacity"
                          title="Delete file"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Quick Notice in Sidebar */}
          <div className="p-3 border-t border-slate-800 bg-slate-950/50 text-[10px] text-slate-400 leading-relaxed font-mono">
            <div className="flex items-center gap-1 text-slate-300 font-bold mb-0.5">
              <Info className="w-3 h-3 text-sky-400" />
              24/7 Persistence
            </div>
            Closing this editor leaves your Python bot continuously running on the server.
          </div>
        </div>

        {/* Center / Right: Code Editor & Integrated Console */}
        <div className="flex-1 flex flex-col bg-slate-950 overflow-hidden relative">
          {/* Find & Replace Bar (Collapsible) */}
          {showFindReplace && (
            <div className="p-2.5 bg-slate-900 border-b border-slate-800 flex items-center gap-2 flex-wrap text-xs font-mono">
              <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
                <Search className="w-3 h-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Find..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyUp={(e) => { if (e.key === 'Enter') handleFind(); }}
                  className="bg-transparent border-none text-white focus:outline-none w-32 sm:w-44 text-xs"
                />
              </div>

              <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
                <Replace className="w-3 h-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Replace with..."
                  value={replaceQuery}
                  onChange={(e) => setReplaceQuery(e.target.value)}
                  className="bg-transparent border-none text-white focus:outline-none w-32 sm:w-44 text-xs"
                />
              </div>

              <button
                onClick={handleReplaceAll}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-sky-300 rounded-lg text-xs font-bold cursor-pointer"
              >
                Replace All
              </button>
              <button
                onClick={() => setShowFindReplace(false)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Main Editor Text Area with Line Numbers */}
          <div className="flex-1 flex overflow-hidden relative font-mono text-xs select-text">
            {isLoadingContent ? (
              <div className="flex-1 flex items-center justify-center text-slate-500">
                <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                <span>Loading {activeFilePath}...</span>
              </div>
            ) : (
              <>
                {/* Gutter / Line Numbers */}
                <div className="w-12 py-3 bg-slate-900/60 text-slate-500 text-right pr-3 select-none shrink-0 font-mono text-xs leading-5 border-r border-slate-800/60">
                  {lines.map((_, idx) => (
                    <div key={idx} className="h-5">{idx + 1}</div>
                  ))}
                </div>

                {/* Code Textarea */}
                <textarea
                  ref={textareaRef}
                  value={fileContent}
                  onChange={handleCodeChange}
                  onKeyDown={handleKeyDown}
                  spellCheck={false}
                  className="flex-1 p-3 bg-transparent text-emerald-200 focus:outline-none resize-none leading-5 font-mono text-xs overflow-y-auto whitespace-pre tab-4"
                  placeholder="# Write your Python code here..."
                />
              </>
            )}
          </div>

          {/* Bottom Integrated Console / Live Output Panel */}
          <div className={`border-t border-slate-800 bg-slate-900/95 flex flex-col transition-all ${showConsole ? 'h-52 sm:h-64' : 'h-8'}`}>
            {/* Console Toolbar Header */}
            <div
              onClick={() => setShowConsole(!showConsole)}
              className="h-8 px-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between cursor-pointer select-none text-xs font-mono"
            >
              <div className="flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-bold text-slate-200">Live Console &amp; Background Execution Logs</span>
                {currentBot.status === 'RUNNING' && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                )}
                <span className="text-[10px] text-slate-500">({logs.length} lines)</span>
              </div>

              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => setAutoTail(!autoTail)}
                  className={`text-[10px] px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                    autoTail ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  Tail: {autoTail ? 'ON' : 'OFF'}
                </button>
                <button
                  onClick={fetchLogs}
                  className="p-1 text-slate-400 hover:text-white cursor-pointer"
                  title="Refresh console"
                >
                  <RefreshCw className="w-3 h-3" />
                </button>
                <button
                  onClick={() => setShowConsole(!showConsole)}
                  className="p-1 text-slate-400 hover:text-white cursor-pointer"
                >
                  {showConsole ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Console Logs Body */}
            {showConsole && (
              <div className="flex-1 p-3 bg-slate-950 font-mono text-[11px] overflow-y-auto leading-relaxed text-sky-200 select-text">
                {logs.length === 0 ? (
                  <div className="text-slate-500">No output logged yet. Press &quot;Deploy &amp; Run 24/7&quot; to start.</div>
                ) : (
                  logs.map((log, idx) => (
                    <div key={idx} className="whitespace-pre-wrap break-all hover:bg-slate-900/40 px-1 rounded">
                      {log}
                    </div>
                  ))
                )}
                <div ref={consoleBottomRef} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New File Modal */}
      {showNewFileModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-5 text-white shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="text-xs font-bold font-mono text-white flex items-center gap-2">
                <FileCode className="w-4 h-4 text-emerald-400" />
                Create New Project File
              </h3>
              <button onClick={() => setShowNewFileModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateFile} className="space-y-3">
              <div>
                <label className="block text-[11px] font-mono text-slate-300 mb-1">File Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. config.py or utils.py"
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewFileModal(false)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 text-xs font-mono rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold rounded-xl cursor-pointer"
                >
                  Create File
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
