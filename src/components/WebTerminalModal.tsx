import React, { useState, useEffect, useRef } from 'react';
import { Terminal, X, Play, Copy, Check, Sparkles, Trash2, ArrowRight, CornerDownLeft, RefreshCw } from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';

interface WebTerminalModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: FirebaseUser | null;
  currentOrigin: string;
}

interface TerminalLog {
  id: string;
  type: 'input' | 'output' | 'error' | 'system';
  text: string;
  timestamp: string;
}

export const WebTerminalModal: React.FC<WebTerminalModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  currentOrigin
}) => {
  const [activeTab, setActiveTab] = useState<'terminal' | 'remote_cli'>('terminal');
  const [inputCommand, setInputCommand] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [isExecuting, setIsExecuting] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [logs, setLogs] = useState<TerminalLog[]>([
    {
      id: 'init-1',
      type: 'system',
      text: '═══════════════════════════════════════════════════════════════════════\n   KAVO HOSTING ENGINE V5.0 — INTERACTIVE DEVELOPER TERMINAL CONSOLE\n   Connected to Live Cloudflare Turnstile & 24/7 Persistent Storage\n═══════════════════════════════════════════════════════════════════════\nType "help" or "?" to see available commands, or "list" to view hosted sites.\n',
      timestamp: new Date().toLocaleTimeString()
    }
  ]);

  const terminalEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
        terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [isOpen, logs]);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const executeCommand = async (cmdToRun?: string) => {
    const command = (cmdToRun !== undefined ? cmdToRun : inputCommand).trim();
    if (!command) return;

    // Append user input to logs
    const inputLog: TerminalLog = {
      id: `in-${Date.now()}-${Math.random()}`,
      type: 'input',
      text: `kavo@v5:~$ ${command}`,
      timestamp: new Date().toLocaleTimeString()
    };

    setLogs((prev) => [...prev, inputLog]);
    setHistory((prev) => [command, ...prev.filter((c) => c !== command)]);
    setHistoryIndex(-1);
    setInputCommand('');

    if (command.toLowerCase() === 'clear' || command.toLowerCase() === 'cls') {
      setLogs([]);
      return;
    }

    setIsExecuting(true);

    try {
      const token = currentUser ? await currentUser.getIdToken() : null;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-User-Uid': currentUser?.uid || 'anonymous_cli'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/terminal/exec', {
        method: 'POST',
        headers,
        body: JSON.stringify({ command })
      });

      const data = await res.json();

      const outputLog: TerminalLog = {
        id: `out-${Date.now()}-${Math.random()}`,
        type: data.success ? 'output' : 'error',
        text: data.output || (data.success ? 'Command executed successfully.' : 'Command returned empty result.'),
        timestamp: new Date().toLocaleTimeString()
      };

      setLogs((prev) => [...prev, outputLog]);
    } catch (err: any) {
      const errorLog: TerminalLog = {
        id: `err-${Date.now()}-${Math.random()}`,
        type: 'error',
        text: `Error executing command: ${err.message || 'Network error'}`,
        timestamp: new Date().toLocaleTimeString()
      };
      setLogs((prev) => [...prev, errorLog]);
    } finally {
      setIsExecuting(false);
      setTimeout(() => {
        inputRef.current?.focus();
        terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      executeCommand();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0) {
        const nextIndex = Math.min(historyIndex + 1, history.length - 1);
        setHistoryIndex(nextIndex);
        setInputCommand(history[nextIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const prevIndex = historyIndex - 1;
        setHistoryIndex(prevIndex);
        setInputCommand(history[prevIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInputCommand('');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-in fade-in zoom-in-95">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-4xl w-full h-[88vh] max-h-[750px] shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Terminal Header Bar */}
        <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between gap-3 select-none">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 mr-2">
              <span className="w-3 h-3 rounded-full bg-rose-500 inline-block"></span>
              <span className="w-3 h-3 rounded-full bg-amber-500 inline-block"></span>
              <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span>
            </div>
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span className="font-mono text-xs font-extrabold text-white tracking-wide">
              KAVO HOSTING ENGINE V5 &bull; SHELL CONSOLE
            </span>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-mono border border-emerald-500/30">
              100% LIVE
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-slate-800 p-0.5 rounded-lg text-xs font-semibold">
              <button
                onClick={() => setActiveTab('terminal')}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  activeTab === 'terminal' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Web Terminal
              </button>
              <button
                onClick={() => setActiveTab('remote_cli')}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  activeTab === 'remote_cli' ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Remote CLI Scripts
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {activeTab === 'terminal' ? (
          <>
            {/* Quick Command Toolbar */}
            <div className="bg-slate-950/60 px-4 py-2 border-b border-slate-800/80 flex items-center gap-1.5 overflow-x-auto text-[11px] font-mono scrollbar-none">
              <span className="text-slate-500 text-[10px] uppercase font-bold pr-1">Shortcuts:</span>
              {[
                { label: 'help', cmd: 'help' },
                { label: 'list', cmd: 'list' },
                { label: 'status', cmd: 'status' },
                { label: 'whoami', cmd: 'whoami' },
                { label: 'date', cmd: 'date' },
                { label: 'clear', cmd: 'clear' }
              ].map((item) => (
                <button
                  key={item.cmd}
                  onClick={() => executeCommand(item.cmd)}
                  disabled={isExecuting}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-sky-300 hover:text-white rounded-md transition-colors whitespace-nowrap cursor-pointer border border-slate-700/60 active:scale-95"
                >
                  {item.label}
                </button>
              ))}

              <div className="ml-auto flex items-center gap-1.5">
                <button
                  onClick={() => setLogs([])}
                  className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                  title="Clear Console Screen"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Terminal Console Output Window */}
            <div
              onClick={() => inputRef.current?.focus()}
              className="flex-1 bg-slate-950 p-4 font-mono text-xs overflow-y-auto space-y-2 selection:bg-emerald-900 selection:text-white cursor-text"
            >
              {logs.map((log) => (
                <div key={log.id} className="leading-relaxed whitespace-pre-wrap">
                  {log.type === 'input' && (
                    <div className="text-emerald-400 font-bold flex items-start gap-1">
                      <span>{log.text}</span>
                    </div>
                  )}
                  {log.type === 'output' && <div className="text-slate-300">{log.text}</div>}
                  {log.type === 'error' && <div className="text-rose-400 font-semibold">{log.text}</div>}
                  {log.type === 'system' && <div className="text-sky-400 font-medium">{log.text}</div>}
                </div>
              ))}

              {isExecuting && (
                <div className="flex items-center gap-2 text-amber-400 font-mono text-xs">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Executing command on KAVO Engine...</span>
                </div>
              )}

              <div ref={terminalEndRef} />
            </div>

            {/* Interactive Command Input Line */}
            <div className="bg-slate-950 p-3 border-t border-slate-800 flex items-center gap-2">
              <span className="font-mono text-emerald-400 font-bold text-xs select-none">kavo@v5:~$</span>
              <input
                ref={inputRef}
                type="text"
                value={inputCommand}
                onChange={(e) => setInputCommand(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder='Type a command (e.g. "help", "list", "status", "turnstile <slug> on") and press Enter...'
                disabled={isExecuting}
                spellCheck={false}
                autoComplete="off"
                className="flex-1 bg-transparent text-emerald-100 font-mono text-xs focus:outline-none placeholder-slate-600 selection:bg-emerald-800"
              />
              <button
                onClick={() => executeCommand()}
                disabled={isExecuting || !inputCommand.trim()}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-lg font-mono text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
              >
                <span>Run</span>
                <CornerDownLeft className="w-3.5 h-3.5" />
              </button>
            </div>
          </>
        ) : (
          /* Remote CLI Tab */
          <div className="flex-1 bg-slate-950 p-6 overflow-y-auto space-y-5 text-xs font-mono">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <h4 className="text-white font-bold text-sm mb-1 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-sky-400" /> Remote CLI One-Liner Execution
              </h4>
              <p className="text-slate-400 text-xs mb-3">
                Run KAVO commands directly from Termux (Android), Ubuntu, Debian, macOS, or PowerShell terminal:
              </p>

              {/* Linux / macOS / Termux */}
              <div className="space-y-2 mb-4">
                <span className="text-[11px] font-bold text-sky-300">Linux / macOS / Termux (Bash):</span>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center justify-between text-emerald-300">
                  <span className="overflow-x-auto select-all">curl -sSL {currentOrigin}/cli | bash</span>
                  <button
                    onClick={() => copyToClipboard(`curl -sSL ${currentOrigin}/cli | bash`, 'bash-cmd')}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                  >
                    {copiedKey === 'bash-cmd' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Direct API Endpoint */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-amber-300">Direct Command Execution via cURL API:</span>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center justify-between text-amber-200">
                  <span className="overflow-x-auto select-all">
                    curl -X POST {currentOrigin}/api/terminal/exec -H "Content-Type: application/json" -d '{`{"command":"list"}`}'
                  </span>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        `curl -X POST ${currentOrigin}/api/terminal/exec -H "Content-Type: application/json" -d '{"command":"list"}'`,
                        'curl-api'
                      )
                    }
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                  >
                    {copiedKey === 'curl-api' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-2">
              <h5 className="text-white font-bold text-xs">Supported Terminal Commands:</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] text-slate-300">
                <div><strong className="text-emerald-400">help</strong> : Display full command manual</div>
                <div><strong className="text-emerald-400">list / ls</strong> : List all hosted projects &amp; live URLs</div>
                <div><strong className="text-emerald-400">files &lt;slug&gt;</strong> : List files inside project</div>
                <div><strong className="text-emerald-400">cat &lt;slug&gt; &lt;file&gt;</strong> : Read file contents</div>
                <div><strong className="text-emerald-400">create &lt;name&gt;</strong> : Create new project</div>
                <div><strong className="text-emerald-400">turnstile &lt;slug&gt; &lt;on|off&gt;</strong> : Toggle Turnstile</div>
                <div><strong className="text-emerald-400">health &lt;slug&gt;</strong> : Ping &amp; latency report</div>
                <div><strong className="text-emerald-400">status</strong> : System memory &amp; uptime</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
