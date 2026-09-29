// Language & Runtime categorization model for KAVO HOSTING ENGINE V3

export type RuntimeCategory = 'STATIC_WEB' | 'PHP_RUNTIME' | 'UNSUPPORTED_RUNTIME';
export type RuntimeSupport = 'WEB_RENDERABLE' | 'PHP_RUNTIME' | 'SOURCE_MANAGED' | 'RUNTIME_UNSUPPORTED';

export interface LanguageMeta {
  name: string;
  category: 'frontend' | 'backend' | 'config' | 'doc';
  runtime: RuntimeSupport;
  mime: string;
  highlightLang: string;
  notes: string;
}

export const LANGUAGE_REGISTRY: Record<string, LanguageMeta> = {
  // Frontend & Browser Renderable
  html: { name: 'HTML', category: 'frontend', runtime: 'WEB_RENDERABLE', mime: 'text/html; charset=UTF-8', highlightLang: 'html', notes: 'Native browser executable' },
  htm: { name: 'HTML', category: 'frontend', runtime: 'WEB_RENDERABLE', mime: 'text/html; charset=UTF-8', highlightLang: 'html', notes: 'Native browser executable' },
  css: { name: 'CSS', category: 'frontend', runtime: 'WEB_RENDERABLE', mime: 'text/css; charset=UTF-8', highlightLang: 'css', notes: 'Stylesheets' },
  scss: { name: 'SCSS', category: 'frontend', runtime: 'SOURCE_MANAGED', mime: 'text/x-scss; charset=UTF-8', highlightLang: 'scss', notes: 'Preprocessed stylesheet' },
  sass: { name: 'SASS', category: 'frontend', runtime: 'SOURCE_MANAGED', mime: 'text/x-sass; charset=UTF-8', highlightLang: 'sass', notes: 'Preprocessed stylesheet' },
  less: { name: 'LESS', category: 'frontend', runtime: 'SOURCE_MANAGED', mime: 'text/x-less; charset=UTF-8', highlightLang: 'less', notes: 'Preprocessed stylesheet' },
  js: { name: 'JavaScript', category: 'frontend', runtime: 'WEB_RENDERABLE', mime: 'application/javascript; charset=UTF-8', highlightLang: 'javascript', notes: 'Browser script' },
  mjs: { name: 'ES Module', category: 'frontend', runtime: 'WEB_RENDERABLE', mime: 'application/javascript; charset=UTF-8', highlightLang: 'javascript', notes: 'ECMAScript module' },
  jsx: { name: 'React JSX', category: 'frontend', runtime: 'SOURCE_MANAGED', mime: 'text/jsx; charset=UTF-8', highlightLang: 'jsx', notes: 'React JSX component' },
  ts: { name: 'TypeScript', category: 'frontend', runtime: 'SOURCE_MANAGED', mime: 'application/x-typescript; charset=UTF-8', highlightLang: 'typescript', notes: 'Compiled TypeScript source' },
  tsx: { name: 'React TSX', category: 'frontend', runtime: 'SOURCE_MANAGED', mime: 'text/tsx; charset=UTF-8', highlightLang: 'tsx', notes: 'TypeScript JSX component' },
  json: { name: 'JSON', category: 'config', runtime: 'WEB_RENDERABLE', mime: 'application/json; charset=UTF-8', highlightLang: 'json', notes: 'Data exchange object' },
  xml: { name: 'XML', category: 'config', runtime: 'WEB_RENDERABLE', mime: 'application/xml; charset=UTF-8', highlightLang: 'xml', notes: 'Structured XML document' },
  svg: { name: 'SVG Graphic', category: 'frontend', runtime: 'WEB_RENDERABLE', mime: 'image/svg+xml', highlightLang: 'xml', notes: 'Vector graphic' },

  // Backend / Scripting
  php: { name: 'PHP', category: 'backend', runtime: 'PHP_RUNTIME', mime: 'text/x-php; charset=UTF-8', highlightLang: 'php', notes: 'Supported on PHP server / CLI' },
  py: { name: 'Python', category: 'backend', runtime: 'RUNTIME_UNSUPPORTED', mime: 'text/x-python; charset=UTF-8', highlightLang: 'python', notes: 'Managed source (Python runtime not installed on shared PHP)' },
  rb: { name: 'Ruby', category: 'backend', runtime: 'RUNTIME_UNSUPPORTED', mime: 'text/x-ruby; charset=UTF-8', highlightLang: 'ruby', notes: 'Managed source (Requires Ruby runtime)' },
  pl: { name: 'Perl', category: 'backend', runtime: 'RUNTIME_UNSUPPORTED', mime: 'text/x-perl; charset=UTF-8', highlightLang: 'perl', notes: 'Managed source (Requires Perl runtime)' },
  java: { name: 'Java', category: 'backend', runtime: 'RUNTIME_UNSUPPORTED', mime: 'text/x-java; charset=UTF-8', highlightLang: 'java', notes: 'Managed source (Requires JVM runtime)' },
  kt: { name: 'Kotlin', category: 'backend', runtime: 'RUNTIME_UNSUPPORTED', mime: 'text/x-kotlin; charset=UTF-8', highlightLang: 'kotlin', notes: 'Managed source (Requires Kotlin runtime)' },
  c: { name: 'C Source', category: 'backend', runtime: 'RUNTIME_UNSUPPORTED', mime: 'text/x-c; charset=UTF-8', highlightLang: 'c', notes: 'Managed source (Requires C compiler)' },
  cpp: { name: 'C++', category: 'backend', runtime: 'RUNTIME_UNSUPPORTED', mime: 'text/x-c++; charset=UTF-8', highlightLang: 'cpp', notes: 'Managed source (Requires C++ compiler)' },
  cs: { name: 'C#', category: 'backend', runtime: 'RUNTIME_UNSUPPORTED', mime: 'text/plain; charset=UTF-8', highlightLang: 'csharp', notes: 'Managed source (Requires .NET runtime)' },
  go: { name: 'Go', category: 'backend', runtime: 'RUNTIME_UNSUPPORTED', mime: 'text/x-go; charset=UTF-8', highlightLang: 'go', notes: 'Managed source (Requires Go runtime)' },
  rs: { name: 'Rust', category: 'backend', runtime: 'RUNTIME_UNSUPPORTED', mime: 'text/rust; charset=UTF-8', highlightLang: 'rust', notes: 'Managed source (Requires Rust toolchain)' },
  swift: { name: 'Swift', category: 'backend', runtime: 'RUNTIME_UNSUPPORTED', mime: 'text/x-swift; charset=UTF-8', highlightLang: 'swift', notes: 'Managed source (Requires Swift runtime)' },
  dart: { name: 'Dart', category: 'backend', runtime: 'RUNTIME_UNSUPPORTED', mime: 'text/x-dart; charset=UTF-8', highlightLang: 'dart', notes: 'Managed source (Requires Dart SDK)' },
  lua: { name: 'Lua', category: 'backend', runtime: 'RUNTIME_UNSUPPORTED', mime: 'text/x-lua; charset=UTF-8', highlightLang: 'lua', notes: 'Managed source (Requires Lua runtime)' },
  r: { name: 'R Script', category: 'backend', runtime: 'RUNTIME_UNSUPPORTED', mime: 'text/plain; charset=UTF-8', highlightLang: 'r', notes: 'Managed source (Requires R runtime)' },
  sh: { name: 'Bash / Shell', category: 'backend', runtime: 'RUNTIME_UNSUPPORTED', mime: 'text/x-sh; charset=UTF-8', highlightLang: 'bash', notes: 'Executable in Terminal Command Center / Termux' },
  bash: { name: 'Bash', category: 'backend', runtime: 'RUNTIME_UNSUPPORTED', mime: 'text/x-sh; charset=UTF-8', highlightLang: 'bash', notes: 'Executable in Terminal Command Center' },
  ps1: { name: 'PowerShell', category: 'backend', runtime: 'RUNTIME_UNSUPPORTED', mime: 'text/plain; charset=UTF-8', highlightLang: 'powershell', notes: 'Executable in Windows PowerShell CLI' },
  sql: { name: 'SQL', category: 'backend', runtime: 'SOURCE_MANAGED', mime: 'text/x-sql; charset=UTF-8', highlightLang: 'sql', notes: 'Database schema / queries' },

  // Configuration / Data / Docs
  yaml: { name: 'YAML', category: 'config', runtime: 'SOURCE_MANAGED', mime: 'text/yaml; charset=UTF-8', highlightLang: 'yaml', notes: 'Configuration' },
  yml: { name: 'YAML', category: 'config', runtime: 'SOURCE_MANAGED', mime: 'text/yaml; charset=UTF-8', highlightLang: 'yaml', notes: 'Configuration' },
  toml: { name: 'TOML', category: 'config', runtime: 'SOURCE_MANAGED', mime: 'text/plain; charset=UTF-8', highlightLang: 'toml', notes: 'Configuration' },
  ini: { name: 'INI', category: 'config', runtime: 'SOURCE_MANAGED', mime: 'text/plain; charset=UTF-8', highlightLang: 'ini', notes: 'Configuration' },
  env: { name: 'ENV', category: 'config', runtime: 'SOURCE_MANAGED', mime: 'text/plain; charset=UTF-8', highlightLang: 'ini', notes: 'Environment configuration' },
  md: { name: 'Markdown', category: 'doc', runtime: 'SOURCE_MANAGED', mime: 'text/markdown; charset=UTF-8', highlightLang: 'markdown', notes: 'Documentation' },
  txt: { name: 'Plain Text', category: 'doc', runtime: 'SOURCE_MANAGED', mime: 'text/plain; charset=UTF-8', highlightLang: 'plaintext', notes: 'Raw text document' },
  csv: { name: 'CSV', category: 'doc', runtime: 'SOURCE_MANAGED', mime: 'text/csv; charset=UTF-8', highlightLang: 'csv', notes: 'Tabular data' },
  dockerfile: { name: 'Dockerfile', category: 'config', runtime: 'SOURCE_MANAGED', mime: 'text/plain; charset=UTF-8', highlightLang: 'dockerfile', notes: 'Container recipe' }
};

export function getFileLanguage(fileName: string): LanguageMeta {
  const clean = fileName.trim().toLowerCase();
  if (clean === 'dockerfile') return LANGUAGE_REGISTRY['dockerfile'];
  if (clean === '.env' || clean.endsWith('.env')) return LANGUAGE_REGISTRY['env'];

  const ext = clean.split('.').pop() || '';
  if (LANGUAGE_REGISTRY[ext]) {
    return LANGUAGE_REGISTRY[ext];
  }

  return {
    name: `${ext.toUpperCase()} Source`,
    category: 'config',
    runtime: 'SOURCE_MANAGED',
    mime: 'text/plain; charset=UTF-8',
    highlightLang: 'plaintext',
    notes: 'Generic source code'
  };
}

export function detectProjectCategory(fileNames: string[]): { category: RuntimeCategory; entryPoint: string; description: string } {
  const lower = fileNames.map((f) => f.toLowerCase());

  const hasIndexHtml = lower.some((f) => f === 'index.html' || f.endsWith('/index.html') || f === 'index.htm');
  const hasIndexPhp = lower.some((f) => f === 'index.php' || f.endsWith('/index.php'));
  const hasPython = lower.some((f) => f === 'main.py' || f === 'app.py' || f === 'manage.py' || f.endsWith('.py'));
  const hasNode = lower.some((f) => f === 'package.json');

  if (hasIndexHtml) {
    const entry = fileNames.find((f) => f.toLowerCase() === 'index.html' || f.toLowerCase().endsWith('/index.html')) || 'index.html';
    return {
      category: 'STATIC_WEB',
      entryPoint: entry,
      description: 'Static Web Application (HTML / CSS / JS / Assets) - Fully browser renderable'
    };
  }

  if (hasIndexPhp) {
    return {
      category: 'PHP_RUNTIME',
      entryPoint: 'index.php',
      description: 'PHP Application (Rendered via PHP gateway)'
    };
  }

  if (hasPython) {
    const entry = fileNames.find((f) => ['main.py', 'app.py', 'manage.py'].includes(f.toLowerCase())) || 'main.py';
    return {
      category: 'UNSUPPORTED_RUNTIME',
      entryPoint: entry,
      description: 'Python Project (Source Managed: Shared hosting provides no native Python WSGI daemon)'
    };
  }

  if (hasNode) {
    return {
      category: 'UNSUPPORTED_RUNTIME',
      entryPoint: 'package.json',
      description: 'Node.js / NPM Project (Source Managed: Build artifacts or bundler required for browser hosting)'
    };
  }

  // Default to first file or generic
  return {
    category: 'STATIC_WEB',
    entryPoint: fileNames[0] || 'index.html',
    description: 'Multi-language Source Repository (Managed in KAVO Engine)'
  };
}
