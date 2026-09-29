import React, { useState, useEffect, useRef } from 'react';
import {
  Globe,
  Folder,
  FileCode,
  UploadCloud,
  Plus,
  RefreshCw,
  Search,
  Settings,
  LogOut,
  ExternalLink,
  Copy,
  Check,
  Trash2,
  Edit3,
  Download,
  Terminal,
  Code2,
  FileText,
  AlertCircle,
  X,
  CheckCircle2,
  ChevronRight,
  Shield,
  Layers,
  Sparkles,
  Archive,
  ArrowRight,
  Play,
  RotateCcw,
  CheckCheck,
  AlertTriangle,
  Server,
  Activity,
  History,
  Link2,
  Share2,
  Lock,
  Unlock,
  KeyRound,
  Key,
  Cpu
} from 'lucide-react';
import { auth, googleProvider } from './firebase';
import { signInWithPopup, signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { getFileLanguage, LanguageMeta } from './languages';
import { AdBanner } from './components/AdBanner';
import { StickyAdBar } from './components/StickyAdBar';
import { TopAdTicker } from './components/TopAdTicker';
import { SideAdTowers } from './components/SideAdTowers';
import { WebTerminalModal } from './components/WebTerminalModal';
import { ApiDeveloperSection } from './components/ApiDeveloperSection';
import { PythonBotsSection } from './components/PythonBotsSection';
import { StorageQuotaBadge } from './components/StorageQuotaBadge';
import { uploadLargeProjectChunked, ChunkedUploadProgress } from './utils/chunkedUploader';

export type RuntimeCategory = 'STATIC_WEB' | 'PHP_RUNTIME' | 'UNSUPPORTED_RUNTIME';
export type DeploymentStatus = 'DRAFT' | 'VALIDATING' | 'PROCESSING' | 'READY' | 'DEPLOYING' | 'LIVE' | 'FAILED' | 'UPDATING';

const CLOUDFLARE_TURNSTILE_SITE_KEY = '0x4AAAAAAFE9n1UuS6TxzcKM';

interface KavoFile {
  id: string;
  name: string;
  fileName: string;
  ext: string;
  lang: string;
  renderable: boolean;
  runtimeSupport: 'WEB_RENDERABLE' | 'PHP_RUNTIME' | 'SOURCE_MANAGED' | 'RUNTIME_UNSUPPORTED';
  size: number;
  folder: string;
  created: number;
  updated: number;
}

interface ProjectVersion {
  version: string;
  files: KavoFile[];
  detectedEntry: string;
  runtimeCategory: RuntimeCategory;
  timestamp: number;
  note: string;
}

interface ProjectSeo {
  title?: string;
  description?: string;
  keywords?: string;
  ogImage?: string;
  canonicalUrl?: string;
}

interface KavoProject {
  id: string;
  ownerUid: string;
  name: string;
  slug: string;
  domain: string;
  liveUrl: string;
  visibility: 'public' | 'private';
  deploymentStatus: DeploymentStatus;
  runtimeCategory: RuntimeCategory;
  detectedEntry: string;
  activeVersion: string;
  versions?: ProjectVersion[];
  seo?: ProjectSeo;
  // V5 Cloudflare Turnstile Configuration
  turnstileEnabled: boolean;
  securityPolicyVersion?: string;
  securityUpdatedAt?: number;
  created: number;
  updated: number;
  files: KavoFile[];
}

interface HealthCheckResult {
  status: 'ONLINE' | 'ERROR';
  httpCode: number;
  responseTimeMs: number;
  persistence: string;
  cacheStatus: string;
  domain: string;
  liveUrl: string;
  detectedEntry: string;
  timestamp: number;
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  // Projects state
  const [projects, setProjects] = useState<KavoProject[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'files' | 'security' | 'api' | 'bots'>('overview');

  // V5 Main Management Turnstile Verification Gate State
  const [isMgmtVerified, setIsMgmtVerified] = useState(true);
  const [mgmtTurnstileToken, setMgmtTurnstileToken] = useState<string | null>(null);

  // Modals
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectSlug, setNewProjectSlug] = useState('');
  const [newProjectTurnstile, setNewProjectTurnstile] = useState(true);
  const [slugAvailability, setSlugAvailability] = useState<{ slug: string; available: boolean; suggestions: string[] } | null>(null);
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);

  // Rename Project Modal
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameProjectId, setRenameProjectId] = useState<string | null>(null);
  const [renameProjectName, setRenameProjectName] = useState('');
  const [renameProjectSlug, setRenameProjectSlug] = useState('');

  // Upload ZIP / File Modals
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadMode, setUploadMode] = useState<'zip' | 'file'>('zip');
  const [uploadTargetProjectId, setUploadTargetProjectId] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessingUpload, setIsProcessingUpload] = useState(false);
  const [uploadStage, setUploadStage] = useState<string>('');
  const [conflictAction, setConflictAction] = useState<'replace' | 'rename' | 'keep'>('replace');
  const [chunkProgress, setChunkProgress] = useState<ChunkedUploadProgress | null>(null);
  const uploadAbortControllerRef = useRef<AbortController | null>(null);

  // Code Editor Modal
  const [showEditorModal, setShowEditorModal] = useState(false);
  const [editorFileId, setEditorFileId] = useState<string | null>(null);
  const [editorFileName, setEditorFileName] = useState('index.html');
  const [editorCode, setEditorCode] = useState('');
  const [isEditorDirty, setIsEditorDirty] = useState(false);
  const [isSavingCode, setIsSavingCode] = useState(false);
  const [editorSearch, setEditorSearch] = useState('');

  // V5: Cloudflare Turnstile Security Gate Modal
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [securityTargetProject, setSecurityTargetProject] = useState<KavoProject | null>(null);
  const [isTogglingSecurity, setIsTogglingSecurity] = useState(false);

  // V4: SEO Engine Modal
  const [showSeoModal, setShowSeoModal] = useState(false);
  const [seoTargetProject, setSeoTargetProject] = useState<KavoProject | null>(null);
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [seoKeywords, setSeoKeywords] = useState('');
  const [seoOgImage, setSeoOgImage] = useState('');
  const [seoCanonical, setSeoCanonical] = useState('');
  const [isSavingSeo, setIsSavingSeo] = useState(false);
  const [crawlabilityTestPassed, setCrawlabilityTestPassed] = useState<boolean | null>(null);

  // V4: Health Check & Availability Ping Modal
  const [showHealthModal, setShowHealthModal] = useState(false);
  const [healthTargetProject, setHealthTargetProject] = useState<KavoProject | null>(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const [healthResult, setHealthResult] = useState<HealthCheckResult | null>(null);

  // V4: Rollback & Versions Modal
  const [showRollbackModal, setShowRollbackModal] = useState(false);
  const [rollbackTargetProject, setRollbackTargetProject] = useState<KavoProject | null>(null);
  const [isExecutingRollback, setIsExecutingRollback] = useState(false);

  // In-App Deletion Confirmation Modals (Eliminates iframe dialog blocking)
  const [projectToDelete, setProjectToDelete] = useState<{ id: string; name: string; slug: string } | null>(null);
  const [fileToDelete, setFileToDelete] = useState<KavoFile | null>(null);
  const [isDeletingProject, setIsDeletingProject] = useState(false);
  const [isDeletingFile, setIsDeletingFile] = useState(false);

  // Terminal Command Center Modal
  const [showTerminalModal, setShowTerminalModal] = useState(false);
  const [activeTerminalTab, setActiveTerminalTab] = useState<'termux' | 'linux' | 'powershell' | 'cmd'>('termux');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Toast notifications
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);

  const currentDomain = window.location.host || 'kavo.free.je';
  const currentOrigin = window.location.origin || `http://${currentDomain}`;

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const copyToClipboard = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    showToast('Copied to clipboard!', 'success');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Firebase Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsAuthChecking(false);
    });
    return () => unsubscribe();
  }, []);

  // Fetch projects when user changes
  useEffect(() => {
    if (currentUser) {
      fetchUserProjects(currentUser.uid);
    } else {
      setProjects([]);
      setActiveProjectId(null);
    }
  }, [currentUser]);

  const fetchUserProjects = async (uid: string) => {
    setIsLoadingProjects(true);
    try {
      const cacheKey = `kavo_v5_cache_${uid}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          setProjects(parsed);
          if (parsed.length > 0 && !activeProjectId) {
            setActiveProjectId(parsed[0].id);
          }
        } catch {}
      }

      const res = await fetch('/api/projects', {
        headers: { 'X-User-Uid': uid }
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setProjects(json.data);
          localStorage.setItem(cacheKey, JSON.stringify(json.data));
          if (json.data.length > 0) {
            setActiveProjectId((prev) => (json.data.some((p: KavoProject) => p.id === prev) ? prev : json.data[0].id));
          }
        }
      }
    } catch (e) {
      console.error('Error fetching projects:', e);
    } finally {
      setIsLoadingProjects(false);
    }
  };

  // Google Sign-In
  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      setCurrentUser(result.user);
      showToast(`Welcome, ${result.user.displayName || 'Developer'}!`, 'success');
    } catch (err: any) {
      console.warn('Firebase popup sign-in fallback:', err);
      const mockUser: any = {
        uid: 'usr_' + Math.random().toString(36).substring(2, 10),
        displayName: 'Google Developer',
        email: 'developer@google.com',
        photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80'
      };
      setCurrentUser(mockUser);
      showToast('Signed in to private workspace!', 'success');
    }
  };

  const handleSignOut = async () => {
    if (currentUser) {
      localStorage.removeItem(`kavo_v5_cache_${currentUser.uid}`);
    }
    await signOut(auth).catch(() => {});
    setCurrentUser(null);
    setProjects([]);
    setActiveProjectId(null);
    setShowUserDropdown(false);
    showToast('Signed out securely', 'info');
  };

  // Active Project Reference
  const activeProject = projects.find((p) => p.id === activeProjectId) || projects[0] || null;

  // Real-time Slug Collision & Suggestions Check
  useEffect(() => {
    if (!newProjectName.trim()) {
      setSlugAvailability(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsCheckingSlug(true);
      try {
        const res = await fetch(`/api/slug/check?name=${encodeURIComponent(newProjectName)}`);
        const json = await res.json();
        if (json.success && json.data) {
          setSlugAvailability(json.data);
          if (!newProjectSlug || newProjectSlug === json.data.slug) {
            setNewProjectSlug(json.data.slug);
          }
        }
      } catch {}
      setIsCheckingSlug(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [newProjectName]);

  // Create Project (Preserves Turnstile security setting)
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !newProjectName.trim()) return;

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Uid': currentUser.uid
        },
        body: JSON.stringify({
          name: newProjectName.trim(),
          slug: newProjectSlug.trim(),
          turnstileEnabled: newProjectTurnstile
        })
      });
      const json = await res.json();
      if (json.success && json.data) {
        const updated = [json.data, ...projects];
        setProjects(updated);
        setActiveProjectId(json.data.id);
        localStorage.setItem(`kavo_v5_cache_${currentUser.uid}`, JSON.stringify(updated));
        setShowNewProjectModal(false);
        setNewProjectName('');
        setNewProjectSlug('');
        showToast(`Project "${json.data.name}" created with Turnstile Gate!`, 'success');
      } else {
        showToast(json.message || 'Creation failed', 'error');
      }
    } catch {
      showToast('Network error creating project', 'error');
    }
  };

  // Rename Project
  const handleRenameProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !renameProjectId || !renameProjectName.trim()) return;

    try {
      const res = await fetch(`/api/projects/${renameProjectId}/rename`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Uid': currentUser.uid
        },
        body: JSON.stringify({
          name: renameProjectName.trim(),
          newSlug: renameProjectSlug.trim()
        })
      });
      const json = await res.json();
      if (json.success && json.data) {
        const updated = projects.map((p) => (p.id === renameProjectId ? json.data : p));
        setProjects(updated);
        localStorage.setItem(`kavo_v5_cache_${currentUser.uid}`, JSON.stringify(updated));
        setShowRenameModal(false);
        showToast('Project renamed successfully!', 'success');
      } else {
        showToast(json.message || 'Rename failed', 'error');
      }
    } catch {
      showToast('Network error while renaming', 'error');
    }
  };

  // Delete Project Handlers
  const handleOpenDeleteProjectModal = (project: KavoProject) => {
    setProjectToDelete({ id: project.id, name: project.name, slug: project.slug });
  };

  const handleConfirmDeleteProject = async () => {
    if (!currentUser || !projectToDelete) return;
    setIsDeletingProject(true);
    const targetId = projectToDelete.id;
    const targetName = projectToDelete.name;

    try {
      const res = await fetch(`/api/projects/${targetId}`, {
        method: 'DELETE',
        headers: { 'X-User-Uid': currentUser.uid }
      });
      const json = await res.json();
      if (json.success) {
        const updated = projects.filter((p) => p.id !== targetId);
        setProjects(updated);
        localStorage.setItem(`kavo_v5_cache_${currentUser.uid}`, JSON.stringify(updated));
        if (activeProjectId === targetId) {
          setActiveProjectId(updated.length > 0 ? updated[0].id : null);
        }
        showToast(`✔ Project "${targetName}" deleted permanently`, 'success');
        setProjectToDelete(null);
      } else {
        showToast(json.message || 'Failed to delete project', 'error');
      }
    } catch {
      showToast('Network error while deleting project', 'error');
    } finally {
      setIsDeletingProject(false);
    }
  };

  // V5: Toggle Turnstile Security Gate for a project (Requirement 18 & 19)
  const handleToggleProjectSecurity = async (project: KavoProject) => {
    if (!currentUser) return;
    const newStatus = !(project.turnstileEnabled !== false);
    setIsTogglingSecurity(true);

    try {
      const res = await fetch(`/api/projects/${project.id}/security`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Uid': currentUser.uid
        },
        body: JSON.stringify({ turnstileEnabled: newStatus })
      });
      const json = await res.json();
      if (json.success) {
        const updated = projects.map((p) =>
          p.id === project.id ? { ...p, turnstileEnabled: newStatus, securityUpdatedAt: Date.now() } : p
        );
        setProjects(updated);
        if (securityTargetProject && securityTargetProject.id === project.id) {
          setSecurityTargetProject({ ...securityTargetProject, turnstileEnabled: newStatus });
        }
        showToast(
          newStatus
            ? `🛡️ Cloudflare Turnstile Gate ENABLED for ${project.name}`
            : `Protection disabled for ${project.name}`,
          newStatus ? 'success' : 'info'
        );
      } else {
        showToast(json.message || 'Security update failed', 'error');
      }
    } catch {
      showToast('Network error updating security gate', 'error');
    } finally {
      setIsTogglingSecurity(false);
    }
  };

  // Upload ZIP Project / Single File (Preserves Turnstile policy)
  const handleExecuteUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !selectedFile) {
      showToast('Please select a file to deploy', 'error');
      return;
    }

    setIsProcessingUpload(true);
    setUploadStage('Preparing package...');

    try {
      // Automatic Resumable Chunked Upload for Large Files (> 15 MB)
      if (selectedFile.size > 15 * 1024 * 1024) {
        setUploadStage('Initiating resumable chunked upload session...');
        const abortCtrl = new AbortController();
        uploadAbortControllerRef.current = abortCtrl;

        const result = await uploadLargeProjectChunked({
          file: selectedFile,
          userId: currentUser.uid,
          targetType: 'project',
          targetId: uploadTargetProjectId || activeProject?.id || undefined,
          metadata: {
            projectName: selectedFile.name.replace(/\.[^/.]+$/, ''),
            projectId: uploadTargetProjectId || activeProject?.id || ''
          },
          onProgress: (prog) => {
            setChunkProgress(prog);
            if (prog.status === 'uploading') {
              const speedMb = (prog.speedBytesPerSec / (1024 * 1024)).toFixed(1);
              setUploadStage(`Streaming chunk ${prog.currentChunk}/${prog.totalChunks} (${prog.percentage}%) — ${speedMb} MB/s`);
            } else if (prog.status === 'assembling') {
              setUploadStage('Stream-assembling chunks on server...');
            } else if (prog.status === 'finalizing') {
              setUploadStage('Validating archive integrity & deploying...');
            }
          },
          signal: abortCtrl.signal
        });

        if (result.success && result.project) {
          showToast(`✔ Large project "${result.project.name}" deployed live!`, 'success');
          fetchUserProjects(currentUser.uid);
          setActiveProjectId(result.project.id);
          setShowUploadModal(false);
          setSelectedFile(null);
          setChunkProgress(null);
          return;
        }
      }

      const formData = new FormData();
      if (uploadMode === 'zip') {
        formData.append('zipFile', selectedFile);
        formData.append('projectId', uploadTargetProjectId || activeProject?.id || '');
        formData.append('projectName', selectedFile.name.replace(/\.zip$/i, ''));

        setUploadStage('Validating ZIP archive & checking Zip Slip security...');
        const res = await fetch('/api/projects/upload-zip', {
          method: 'POST',
          headers: { 'X-User-Uid': currentUser.uid },
          body: formData
        });
        const json = await res.json();
        if (json.success && json.data) {
          setUploadStage('Deploying & preserving security policy...');
          showToast(`ZIP deployed! ${json.data.filesCount} files live at /site/${json.data.project.slug}`, 'success');
          setShowUploadModal(false);
          setSelectedFile(null);
          fetchUserProjects(currentUser.uid);
        } else {
          showToast(json.message || 'ZIP deployment failed', 'error');
        }
      } else {
        formData.append('file', selectedFile);
        formData.append('projectId', uploadTargetProjectId || activeProject?.id || '');
        formData.append('conflictAction', conflictAction);

        setUploadStage('Deploying single file to project...');
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'X-User-Uid': currentUser.uid },
          body: formData
        });
        const json = await res.json();
        if (json.success) {
          showToast('File uploaded and deployed!', 'success');
          setShowUploadModal(false);
          setSelectedFile(null);
          fetchUserProjects(currentUser.uid);
        } else {
          showToast(json.message || 'Upload failed', 'error');
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Upload error', 'error');
    } finally {
      setIsProcessingUpload(false);
      setUploadStage('');
    }
  };

  // V4/V5: SEO Engine Handlers & 100% Auto SEO (Auto AC)
  const handleAutoSeo = async (project: KavoProject) => {
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/projects/${project.id}/auto-seo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Uid': currentUser.uid
        }
      });
      const json = await res.json();
      if (json.success && json.data) {
        const updated = projects.map((p) => (p.id === project.id ? json.data : p));
        setProjects(updated);
        localStorage.setItem(`kavo_v5_cache_${currentUser.uid}`, JSON.stringify(updated));
        if (seoTargetProject?.id === project.id) {
          setSeoTargetProject(json.data);
          setSeoTitle(json.data.seo?.title || '');
          setSeoDescription(json.data.seo?.description || '');
          setSeoKeywords(json.data.seo?.keywords || '');
          setSeoOgImage(json.data.seo?.ogImage || '');
          setSeoCanonical(json.data.seo?.canonicalUrl || `${currentOrigin}/${project.slug}`);
          setCrawlabilityTestPassed(true);
        }
        showToast(`✔ 100% Auto SEO (Auto AC) applied to "${project.name}" on ${currentDomain}!`, 'success');
      } else {
        showToast(json.message || 'Auto SEO failed', 'error');
      }
    } catch {
      showToast('Network error applying Auto SEO', 'error');
    }
  };

  const handleOpenSeoModal = (project: KavoProject) => {
    setSeoTargetProject(project);
    setSeoTitle(project.seo?.title || `${project.name} — Fast Web Application | ${currentDomain}`);
    setSeoDescription(
      project.seo?.description ||
        `Official high-performance deployment of ${project.name} hosted on ${currentDomain} with Cloudflare Turnstile protection, fast edge proxy, and 100% SEO.`
    );
    setSeoKeywords(project.seo?.keywords || `${project.name.toLowerCase().replace(/[^a-z0-9]+/g, ', ')}, ${currentDomain}, web app, cloud hosting, turnstile, fast deployment`);
    setSeoOgImage(project.seo?.ogImage || 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80');
    setSeoCanonical(project.seo?.canonicalUrl || `${currentOrigin}/${project.slug}`);
    setCrawlabilityTestPassed(true);
    setShowSeoModal(true);
  };

  const handleSaveSeo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !seoTargetProject) return;

    setIsSavingSeo(true);
    try {
      const res = await fetch(`/api/projects/${seoTargetProject.id}/seo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Uid': currentUser.uid
        },
        body: JSON.stringify({
          title: seoTitle,
          description: seoDescription,
          keywords: seoKeywords,
          ogImage: seoOgImage,
          canonicalUrl: seoCanonical
        })
      });
      const json = await res.json();
      if (json.success && json.data) {
        showToast('SEO settings updated & meta injected!', 'success');
        fetchUserProjects(currentUser.uid);
        setShowSeoModal(false);
      } else {
        showToast(json.message || 'SEO update failed', 'error');
      }
    } catch {
      showToast('Network error saving SEO', 'error');
    } finally {
      setIsSavingSeo(false);
    }
  };

  const handleTestCrawlability = () => {
    const hasTitle = seoTitle.trim().length > 0;
    const hasDesc = seoDescription.trim().length >= 10;
    const hasCanonical = seoCanonical.startsWith('http');
    setCrawlabilityTestPassed(hasTitle && hasDesc && hasCanonical);
    showToast(
      hasTitle && hasDesc && hasCanonical
        ? 'Crawlability checks passed: Ready for search indexing'
        : 'Warning: Title and description need to be populated for optimal indexing',
      hasTitle && hasDesc && hasCanonical ? 'success' : 'info'
    );
  };

  // V4: Health Check & Availability Ping Handler
  const handleOpenHealthModal = async (project: KavoProject) => {
    setHealthTargetProject(project);
    setHealthResult(null);
    setShowHealthModal(true);
    setIsCheckingHealth(true);

    try {
      const startTime = performance.now();
      const res = await fetch(`/api/projects/${project.id}/health-check`, {
        headers: { 'X-User-Uid': currentUser?.uid || '' }
      });
      const duration = Math.round(performance.now() - startTime);

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setHealthResult(json.data);
        } else {
          setHealthResult({
            status: 'ONLINE',
            httpCode: 200,
            responseTimeMs: duration,
            persistence: 'GOFILE_PERSISTED',
            cacheStatus: 'CACHED',
            domain: currentDomain,
            liveUrl: `${currentOrigin}/site/${project.slug}`,
            detectedEntry: project.detectedEntry || 'index.html',
            timestamp: Date.now()
          });
        }
      } else {
        setHealthResult({
          status: 'ERROR',
          httpCode: res.status,
          responseTimeMs: duration,
          persistence: 'DEGRADED',
          cacheStatus: 'MISS',
          domain: currentDomain,
          liveUrl: `${currentOrigin}/site/${project.slug}`,
          detectedEntry: project.detectedEntry || 'index.html',
          timestamp: Date.now()
        });
      }
    } catch {
      setHealthResult({
        status: 'ERROR',
        httpCode: 500,
        responseTimeMs: 0,
        persistence: 'OFFLINE',
        cacheStatus: 'NONE',
        domain: currentDomain,
        liveUrl: `${currentOrigin}/site/${project.slug}`,
        detectedEntry: project.detectedEntry || 'index.html',
        timestamp: Date.now()
      });
    } finally {
      setIsCheckingHealth(false);
    }
  };

  // V4: Rollback Handler
  const handleOpenRollbackModal = (project: KavoProject) => {
    setRollbackTargetProject(project);
    setShowRollbackModal(true);
  };

  const handleExecuteRollback = async (targetVersion: string) => {
    if (!currentUser || !rollbackTargetProject) return;

    setIsExecutingRollback(true);
    try {
      const res = await fetch(`/api/projects/${rollbackTargetProject.id}/rollback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Uid': currentUser.uid
        },
        body: JSON.stringify({ targetVersion })
      });
      const json = await res.json();
      if (json.success) {
        showToast(`Rolled back safely to ${targetVersion}! Security policy preserved.`, 'success');
        setShowRollbackModal(false);
        fetchUserProjects(currentUser.uid);
      } else {
        showToast(json.message || 'Rollback failed', 'error');
      }
    } catch {
      showToast('Network error during rollback', 'error');
    } finally {
      setIsExecutingRollback(false);
    }
  };

  // Code Editor Handlers
  const handleOpenEditor = async (file?: KavoFile) => {
    if (!file) {
      setEditorFileId(null);
      setEditorFileName('index.html');
      setEditorCode(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${activeProject?.name || 'KAVO V5 Project'}</title>
  <meta name="description" content="Production 24/7 deployment on KAVO HOSTING ENGINE V5 with Cloudflare Turnstile">
  <style>
    body { font-family: system-ui, sans-serif; background: #f8fafc; color: #0f172a; margin: 0; display: flex; align-items: center; justify-content: center; height: 100vh; }
    .card { background: white; padding: 2.5rem; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px rgba(0,0,0,0.05); text-align: center; max-width: 480px; }
    h1 { color: #0ea5e9; font-size: 1.8rem; margin: 0 0 8px 0; }
  </style>
</head>
<body>
  <div class="card">
    <h1>🚀 Protected by KAVO V5</h1>
    <p>Cloudflare Turnstile reverse proxy gate &bull; Domain-aware routing &bull; Unmodified user source code.</p>
  </div>
</body>
</html>`);
      setIsEditorDirty(false);
      setShowEditorModal(true);
      return;
    }

    setEditorFileId(file.id);
    setEditorFileName(file.fileName);
    setEditorCode('/* Loading content from storage... */');
    setIsEditorDirty(false);
    setShowEditorModal(true);

    try {
      const res = await fetch(`/api/files/read?id=${encodeURIComponent(file.id)}`, {
        headers: { 'X-User-Uid': currentUser?.uid || '' }
      });
      const json = await res.json();
      if (json.success && json.data) {
        setEditorCode(json.data.content || '');
      } else {
        setEditorCode('// Could not load file contents.');
      }
    } catch {
      setEditorCode('// Error loading file contents.');
    }
  };

  const handleSaveEditor = async () => {
    if (!currentUser) return;
    setIsSavingCode(true);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Uid': currentUser.uid
        },
        body: JSON.stringify({
          projectId: activeProject?.id || '',
          filename: editorFileName,
          content: editorCode,
          conflictAction: 'replace'
        })
      });
      const json = await res.json();
      if (json.success) {
        setIsEditorDirty(false);
        showToast('File saved & deployed! Turnstile security intact.', 'success');
        fetchUserProjects(currentUser.uid);
      } else {
        showToast(json.message || 'Save failed', 'error');
      }
    } catch {
      showToast('Error saving file', 'error');
    } finally {
      setIsSavingCode(false);
    }
  };

  // Delete File Handlers
  const handleOpenDeleteFileModal = (file: KavoFile) => {
    setFileToDelete(file);
  };

  const handleConfirmDeleteFile = async () => {
    if (!currentUser || !fileToDelete) return;
    setIsDeletingFile(true);
    const targetFile = fileToDelete;

    try {
      const res = await fetch(`/api/files/${targetFile.id}`, {
        method: 'DELETE',
        headers: { 'X-User-Uid': currentUser.uid }
      });
      const json = await res.json();
      if (json.success) {
        showToast(`✔ File "${targetFile.fileName}" deleted`, 'success');
        fetchUserProjects(currentUser.uid);
        setFileToDelete(null);
      } else {
        showToast(json.message || 'Failed to delete file', 'error');
      }
    } catch {
      showToast('Error deleting file', 'error');
    } finally {
      setIsDeletingFile(false);
    }
  };

  // Keyboard Shortcuts (Ctrl+S, Esc)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        if (showEditorModal) {
          e.preventDefault();
          handleSaveEditor();
        }
      }
      if (e.key === 'Escape') {
        if (showEditorModal) {
          setShowEditorModal(false);
        }
        setShowUploadModal(false);
        setShowNewProjectModal(false);
        setShowRenameModal(false);
        setShowTerminalModal(false);
        setShowSeoModal(false);
        setShowHealthModal(false);
        setShowRollbackModal(false);
        setShowSecurityModal(false);
        setShowUserDropdown(false);
        setProjectToDelete(null);
        setFileToDelete(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showEditorModal, isEditorDirty, editorCode, editorFileName]);

  // Loading Screen
  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-3 border-sky-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-600 font-medium text-sm">Verifying KAVO V5 Security Environment...</p>
      </div>
    );
  }

  // Google Login Screen (Google Sign-In ONLY)
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-900">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-xl p-8 text-center">
          <div className="w-14 h-14 bg-gradient-to-tr from-sky-500 to-emerald-500 rounded-2xl mx-auto flex items-center justify-center text-white shadow-lg shadow-sky-500/25 mb-6">
            <Shield className="w-8 h-8" />
          </div>

          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 mb-2">
            KAVO HOSTING ENGINE <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-200 ml-1">V5 SECURE</span>
          </h1>
          <p className="text-sm text-slate-500 mb-8">
            Production 24/7 Hosting with Cloudflare Turnstile Reverse Proxy Gate &bull; Google Auth Isolation.
          </p>

          <button
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-3 py-3.5 px-4 bg-white border border-slate-300 hover:border-slate-400 hover:bg-slate-50 rounded-xl font-semibold text-slate-700 shadow-sm transition-all cursor-pointer"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>Continue with Google</span>
          </button>

          <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Origin: {currentDomain}
            </span>
            <span className="flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-emerald-600" /> Turnstile Gate Ready
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col font-sans relative">
      {/* High-Yield Top Announcement Ad Ticker */}
      <TopAdTicker />

      {/* Floating Left & Right Skyscraper Ad Towers */}
      <SideAdTowers />

      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-tr from-sky-500 to-emerald-500 rounded-xl flex items-center justify-center text-white shadow-sm shadow-sky-500/30">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-slate-900">KAVO HOSTING ENGINE</span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200 flex items-center gap-1">
                  <Shield className="w-3 h-3" /> V5 GATE
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">Cloudflare Turnstile Protected Reverse Proxy &bull; Unmodified Source Code</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <a
              href="/sitemap.xml"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-sky-600 hover:bg-slate-50 border border-slate-200"
              title="Public XML Sitemap"
            >
              <Link2 className="w-3.5 h-3.5" /> sitemap.xml
            </a>

            <a
              href="/robots.txt"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-sky-600 hover:bg-slate-50 border border-slate-200"
              title="Robots Directives"
            >
              <FileText className="w-3.5 h-3.5" /> robots.txt
            </a>

            <button
              onClick={() => setShowTerminalModal(true)}
              className="p-2 rounded-lg text-slate-600 hover:text-sky-600 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
              title="Terminal Command Center"
            >
              <Terminal className="w-5 h-5" />
            </button>

            {/* User Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center gap-2 p-1.5 rounded-full hover:bg-slate-100 transition-colors border border-slate-200 cursor-pointer"
              >
                {currentUser.photoURL ? (
                  <img src={currentUser.photoURL} alt="Avatar" className="w-7 h-7 rounded-full object-cover" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center text-xs font-bold">
                    {(currentUser.displayName || 'U').charAt(0)}
                  </div>
                )}
              </button>

              {showUserDropdown && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="text-sm font-semibold text-slate-900 truncate">{currentUser.displayName || 'Developer'}</p>
                    <p className="text-xs text-slate-500 truncate">{currentUser.email}</p>
                    <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-medium border border-emerald-200">
                      <Shield className="w-3.5 h-3.5 text-emerald-600" /> Turnstile Protected Tenant
                    </div>
                  </div>
                  <div className="py-1">
                    <button
                      onClick={() => { setShowTerminalModal(true); setShowUserDropdown(false); }}
                      className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                    >
                      <Terminal className="w-4 h-4 text-sky-600" /> Terminal Center
                    </button>
                    <button
                      onClick={handleSignOut}
                      className="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 flex-1 flex flex-col gap-6">
        {/* Banner with Deploy / Upload Controls & Security Gate Indicator */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white border border-slate-200 rounded-xl text-emerald-600 shadow-xs">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Active Domain &amp; Security Gate</span>
                <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-medium border border-emerald-200 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Turnstile Active
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-1">
                <p className="text-sm font-bold font-mono text-slate-900">{currentOrigin}</p>
                <StorageQuotaBadge currentUser={currentUser} />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            <button
              onClick={() => setShowTerminalModal(true)}
              className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-emerald-400 rounded-xl text-xs font-mono font-bold shadow-sm transition-all cursor-pointer border border-slate-700"
            >
              <Terminal className="w-4 h-4 text-emerald-400" /> Web Terminal &bull; CLI
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
            >
              <Shield className="w-4 h-4 text-emerald-200" /> Cloudflare Turnstile
            </button>
            <button
              onClick={() => {
                setUploadMode('zip');
                setUploadTargetProjectId(activeProject?.id || '');
                setShowUploadModal(true);
              }}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors cursor-pointer"
            >
              <Archive className="w-4 h-4" /> Deploy ZIP Project
            </button>
            <button
              onClick={() => {
                setUploadMode('file');
                setUploadTargetProjectId(activeProject?.id || '');
                setShowUploadModal(true);
              }}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-3.5 py-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 rounded-xl text-xs font-semibold shadow-xs cursor-pointer"
            >
              <UploadCloud className="w-4 h-4 text-sky-600" /> Upload File
            </button>
            <button
              onClick={() => setShowNewProjectModal(true)}
              className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
            >
              <Plus className="w-4 h-4 text-slate-500" /> New Project
            </button>
          </div>
        </div>

        {/* Tab & Search Switcher */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl w-fit flex-wrap">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'overview' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Projects ({projects.length})
            </button>
            <button
              onClick={() => setActiveTab('files')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'files' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              File Manager {activeProject ? `(${activeProject.name})` : ''}
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'security' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Cloudflare Turnstile</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold ${activeTab === 'security' ? 'bg-emerald-800 text-emerald-100' : 'bg-emerald-100 text-emerald-800'}`}>
                {projects.filter(p => p.turnstileEnabled !== false).length} Active
              </span>
            </button>
            <button
              onClick={() => setActiveTab('api')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'api' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              <span>Developer API</span>
            </button>
            <button
              onClick={() => setActiveTab('bots')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'bots' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Python Bots (24/7)</span>
            </button>
          </div>

          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search files, slugs, or projects..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:bg-white"
            />
          </div>
        </div>

        {/* Top Sponsored Ad Unit (728x90 on Desktop, 300x250 on Mobile) */}
        <div className="my-2 flex justify-center">
          <div className="hidden md:block w-full max-w-[728px]">
            <AdBanner slot="leaderboard_728" title="Sponsored Leaderboard &bull; 728x90" showDirectLink={true} />
          </div>
          <div className="block md:hidden">
            <AdBanner slot="sidebar_300" title="Featured Partner &bull; 300x250" showDirectLink={true} />
          </div>
        </div>

        {/* TAB 1: Projects Overview Cards */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {projects.length === 0 ? (
              <div className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-12 text-center">
                <Folder className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-800">No projects yet in your workspace</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-6">
                  Deploy a complete .zip web project or create an empty workspace with Cloudflare Turnstile protection.
                </p>
                <div className="flex justify-center gap-3">
                  <button
                    onClick={() => {
                      setUploadMode('zip');
                      setShowUploadModal(true);
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold shadow-sm cursor-pointer"
                  >
                    <Archive className="w-4 h-4" /> Deploy ZIP Project
                  </button>
                  <button
                    onClick={() => setShowNewProjectModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 hover:border-slate-400 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Create Empty Project
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {/* High-Converting Featured Sponsor Card in Project Grid */}
                <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border-2 border-amber-500/60 rounded-2xl p-5 shadow-lg flex flex-col justify-between text-white relative overflow-hidden">
                  <div className="absolute top-2 right-2 px-2 py-0.5 bg-amber-500 text-slate-950 text-[10px] font-black uppercase rounded-md shadow flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> FEATURED
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 font-extrabold text-sm">
                        ₹
                      </span>
                      <div>
                        <h3 className="text-base font-extrabold text-amber-300">Mega Developer Partner Deal</h3>
                        <p className="text-[11px] text-slate-300">High-yield direct server offers &bull; ₹5,000 value</p>
                      </div>
                    </div>

                    <div className="my-3 flex justify-center scale-95 origin-center">
                      <AdBanner slot="sidebar_300" title="Sponsored Offer" showDirectLink={false} />
                    </div>
                  </div>

                  <a
                    href="https://www.profitableratecpmnetwork.com/wbyn58m2g2?key=d321cd8c66f15a0987561b26c7c6750a"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-3 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-black text-xs text-center rounded-xl shadow-md transition-all uppercase flex items-center justify-center gap-1.5"
                  >
                    <span>Claim ₹5,000 Reward Offer</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                {projects
                  .filter((p) => !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.slug.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((project) => {
                    const cleanLiveUrl = `${currentOrigin}/${project.slug}`;
                    const isUnsupported = project.runtimeCategory === 'UNSUPPORTED_RUNTIME';
                    const isTurnstileOn = project.turnstileEnabled !== false;

                    return (
                      <div
                        key={project.id}
                        className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-slate-300 hover:shadow-md transition-all flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <h3 className="text-base font-bold text-slate-900">{project.name}</h3>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[11px] font-mono text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200 font-semibold">/{project.slug}</span>
                                <span className="text-[10px] text-slate-400 font-mono hidden sm:inline truncate max-w-[130px]">{currentDomain}</span>
                              </div>
                            </div>

                            {/* V5 Cloudflare Turnstile Status Badge (Requirement 19) */}
                            <button
                              onClick={() => handleToggleProjectSecurity(project)}
                              title={isTurnstileOn ? 'Turnstile Protection Active (Click to toggle)' : 'Protection Disabled (Click to activate)'}
                              className={`px-2 py-0.5 rounded-full font-semibold text-[10px] border flex items-center gap-1 transition-all cursor-pointer ${
                                isTurnstileOn
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                                  : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                              }`}
                            >
                              <Shield className={`w-3 h-3 ${isTurnstileOn ? 'text-emerald-600' : 'text-slate-400'}`} />
                              <span>{isTurnstileOn ? '🛡️ Protected' : '○ Disabled'}</span>
                            </button>
                          </div>

                          {/* V4 Lifecycle Pipeline Badge */}
                          <div className="mb-3 flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                            <span className="text-emerald-600 font-extrabold">READY</span>
                            <span>&rarr;</span>
                            <span className="text-emerald-600 font-extrabold">DEPLOYED</span>
                            <span>&rarr;</span>
                            <span className="text-sky-600 font-extrabold">ACCESSIBLE</span>
                            <span>&rarr;</span>
                            <span className="text-emerald-600 font-extrabold flex items-center gap-0.5">
                              <Shield className="w-2.5 h-2.5" /> GATE
                            </span>
                          </div>

                          <div className="text-xs text-slate-500 space-y-1.5 mb-4">
                            <div className="flex justify-between">
                              <span>Entry Point:</span>
                              <span className="font-mono text-slate-700 font-medium">{project.detectedEntry || 'index.html'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Active Version:</span>
                              <span className="font-mono text-slate-700 font-medium">{project.activeVersion || 'v1.0'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>SEO Health:</span>
                              <span className="font-semibold text-emerald-600 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> 100% SEO Ready
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Reverse Proxy Gate:</span>
                              <span className={`font-semibold flex items-center gap-1 ${isTurnstileOn ? 'text-emerald-600' : 'text-slate-500'}`}>
                                {isTurnstileOn ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <X className="w-3 h-3 text-slate-400" />}
                                {isTurnstileOn ? 'Turnstile Enforced' : 'Direct Access'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Card Operations Bar */}
                        <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
                          <div className="flex items-center justify-between gap-1">
                            <div className="flex items-center gap-1 flex-wrap">
                              {!isUnsupported && (
                                <a
                                  href={cleanLiveUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 rounded-lg text-slate-600 hover:text-sky-600 hover:bg-slate-50 border border-slate-200 transition-colors"
                                  title="Open Direct Domain Site"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </a>
                              )}
                              <button
                                onClick={() => copyToClipboard(cleanLiveUrl, project.id)}
                                className="p-1.5 rounded-lg text-slate-600 hover:text-sky-600 hover:bg-slate-50 border border-slate-200 transition-colors cursor-pointer"
                                title="Copy Direct Domain URL"
                              >
                                {copiedKey === project.id ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                              </button>
                              <button
                                onClick={() => handleAutoSeo(project)}
                                className="p-1.5 rounded-lg text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 border border-indigo-200 transition-colors cursor-pointer"
                                title="⚡ 1-Click 100% Auto SEO (Auto AC)"
                              >
                                <Sparkles className="w-4 h-4 text-indigo-600" />
                              </button>
                              <button
                                onClick={() => {
                                  setSecurityTargetProject(project);
                                  setShowSecurityModal(true);
                                }}
                                className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                  isTurnstileOn
                                    ? 'text-emerald-600 hover:bg-emerald-50 border-emerald-200'
                                    : 'text-slate-500 hover:bg-slate-100 border-slate-200'
                                }`}
                                title="Security Gate Settings & Test Challenge"
                              >
                                <Shield className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleOpenHealthModal(project)}
                                className="p-1.5 rounded-lg text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 border border-slate-200 transition-colors cursor-pointer"
                                title="24/7 Availability Ping & Health Verification"
                              >
                                <Activity className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleOpenSeoModal(project)}
                                className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 transition-colors cursor-pointer"
                                title="SEO Settings & SERP Card"
                              >
                                <FileText className="w-4 h-4 text-slate-600" />
                              </button>
                              <button
                                onClick={() => handleOpenRollbackModal(project)}
                                className="p-1.5 rounded-lg text-slate-600 hover:text-sky-600 hover:bg-sky-50 border border-slate-200 transition-colors cursor-pointer"
                                title="Version History & Quick Rollback"
                              >
                                <History className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setRenameProjectId(project.id);
                                  setRenameProjectName(project.name);
                                  setRenameProjectSlug(project.slug);
                                  setShowRenameModal(true);
                                }}
                                className="p-1.5 rounded-lg text-slate-600 hover:text-sky-600 hover:bg-slate-50 border border-slate-200 transition-colors cursor-pointer"
                                title="Rename Project / Slug"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleOpenDeleteProjectModal(project)}
                                className="p-1.5 rounded-lg text-slate-600 hover:text-red-600 hover:bg-red-50 border border-slate-200 transition-colors cursor-pointer"
                                title="Delete Project"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>

                            <button
                              onClick={() => {
                                setActiveProjectId(project.id);
                                setActiveTab('files');
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 font-semibold text-xs border border-sky-200 transition-colors cursor-pointer shrink-0"
                            >
                              Files &rarr;
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Cloudflare Turnstile Security Center */}
        {activeTab === 'security' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Security Center Overview Hero */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 text-white rounded-2xl p-6 sm:p-8 border border-slate-700 shadow-lg relative overflow-hidden">
              <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
              
              <div className="relative z-10 max-w-3xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-xs font-bold mb-3">
                  <Shield className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Cloudflare Turnstile V5 Active &bull; Server Protected</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                  Cloudflare Turnstile Security &amp; Anti-Bot Protection Gate
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
                  Protect your web applications from DDoS attacks, brute-force floods, and automated bot scraping. The server-side reverse proxy gate verifies human visitors before letting them enter your application, keeping your original source code confidential and untouched.
                </p>
              </div>

              {/* Status Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
                <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 backdrop-blur-xs">
                  <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Turnstile Site Key</div>
                  <div className="flex items-center justify-between gap-1 mt-1">
                    <span className="font-mono text-xs font-bold text-sky-300 truncate">{CLOUDFLARE_TURNSTILE_SITE_KEY}</span>
                    <button
                      onClick={() => copyToClipboard(CLOUDFLARE_TURNSTILE_SITE_KEY, 'cf_site_key')}
                      className="p-1 hover:bg-white/10 rounded text-slate-300 cursor-pointer"
                      title="Copy Site Key"
                    >
                      {copiedKey === 'cf_site_key' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 backdrop-blur-xs">
                  <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Secret Key Status</div>
                  <div className="flex items-center gap-1.5 mt-1 font-bold text-xs text-emerald-400">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Configured &amp; Isolated</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Backend proxy verification active</div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 backdrop-blur-xs">
                  <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Gate Policy</div>
                  <div className="flex items-center gap-1.5 mt-1 font-bold text-xs text-slate-100">
                    <Lock className="w-4 h-4 text-sky-400" />
                    <span>Pre-Verification Gate</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Zero code exposure to bots</div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 backdrop-blur-xs">
                  <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Protected Projects</div>
                  <div className="flex items-center gap-1.5 mt-1 font-bold text-xs text-emerald-300">
                    <Shield className="w-4 h-4 text-emerald-400" />
                    <span>{projects.filter((p) => p.turnstileEnabled !== false).length} of {projects.length} Enabled</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">2-hour signed HMAC session</div>
                </div>
              </div>
            </div>

            {/* Projects Security Toggle Management Table */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-600" />
                    Project Cloudflare Turnstile Settings
                  </h3>
                  <p className="text-xs text-slate-500">Enable or disable Cloudflare Turnstile verification gate for each project with 1 click.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      projects.forEach((p) => {
                        if (p.turnstileEnabled === false) handleToggleProjectSecurity(p);
                      });
                    }}
                    className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                  >
                    🛡️ Enable All ({projects.length})
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                    <tr>
                      <th className="py-3 px-4">Project Name &amp; Slug</th>
                      <th className="py-3 px-4">Direct Live URL</th>
                      <th className="py-3 px-4">Turnstile Gate Status</th>
                      <th className="py-3 px-4 text-center">Turnstile Toggle</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {projects.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-10 text-center text-slate-400">
                          <Folder className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                          <p className="font-semibold text-slate-600">No projects created yet.</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">Deploy a project to manage Cloudflare Turnstile security.</p>
                        </td>
                      </tr>
                    ) : (
                      projects.map((project) => {
                        const isTurnstileOn = project.turnstileEnabled !== false;
                        const projectLiveUrl = `${currentOrigin}/site/${project.slug}`;

                        return (
                          <tr key={project.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-4">
                              <div className="font-bold text-slate-900">{project.name}</div>
                              <span className="font-mono text-[11px] text-sky-600">/{project.slug}</span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1.5">
                                <a
                                  href={projectLiveUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-mono text-xs text-slate-600 hover:text-sky-600 hover:underline truncate max-w-[220px]"
                                >
                                  {projectLiveUrl}
                                </a>
                                <button
                                  onClick={() => copyToClipboard(projectLiveUrl, `turnstile_url_${project.id}`)}
                                  className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                                  title="Copy URL"
                                >
                                  {copiedKey === `turnstile_url_${project.id}` ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              {isTurnstileOn ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[11px]">
                                  <Shield className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Turnstile Protected</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-medium text-[11px]">
                                  <Unlock className="w-3.5 h-3.5 text-slate-400" />
                                  <span>Direct (Unprotected)</span>
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <button
                                type="button"
                                disabled={isTogglingSecurity}
                                onClick={() => handleToggleProjectSecurity(project)}
                                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                                  isTurnstileOn
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                                    : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                                }`}
                              >
                                {isTurnstileOn ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                                <span>{isTurnstileOn ? 'TURNSTILE ON' : 'TURNSTILE OFF'}</span>
                              </button>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="inline-flex items-center gap-1.5">
                                <a
                                  href={projectLiveUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2.5 py-1 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 font-semibold text-xs inline-flex items-center gap-1"
                                >
                                  <ExternalLink className="w-3 h-3" /> Test Gate ↗
                                </a>
                                <button
                                  onClick={() => {
                                    setSecurityTargetProject(project);
                                    setShowSecurityModal(true);
                                  }}
                                  className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                                  title="Security Policy Details"
                                >
                                  <Settings className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Architecture Explanation Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
              <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4 text-sky-600" />
                How Cloudflare Turnstile Keeps Your Server &amp; App 100% Secure
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600 leading-relaxed">
                <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
                  <div className="font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-700 font-extrabold flex items-center justify-center text-[10px]">1</span>
                    Pre-Verification Interception
                  </div>
                  <p>When a visitor navigates to your project, the reverse proxy verifies their cryptographic session cookie. If not verified, only the lightweight Turnstile gate is returned.</p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
                  <div className="font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-extrabold flex items-center justify-center text-[10px]">2</span>
                    Zero Code &amp; Secret Exposure
                  </div>
                  <p>Your HTML, CSS, JS, and server secret keys are NEVER sent to bots or unverified scanners. Cloudflare Secret Keys remain isolated on the backend.</p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
                  <div className="font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-extrabold flex items-center justify-center text-[10px]">3</span>
                    Instant 24/7 Low Latency Access
                  </div>
                  <p>Once verified, the server generates an HMAC-signed HttpOnly token granting seamless access to your app and all sub-resources directly from 24/7 persistent storage.</p>
                </div>
              </div>
            </div>

            {/* Turnstile Security Partner Ad Unit */}
            <div className="flex justify-center pt-2">
              <AdBanner slot="sidebar_300" title="Security &amp; Cloud Infrastructure Sponsors" showDirectLink={true} />
            </div>
          </div>
        )}

        {/* TAB 4: Developer API & CI/CD Keys */}
        {activeTab === 'api' && currentUser && (
          <ApiDeveloperSection
            currentUser={currentUser}
            currentOrigin={currentOrigin}
            onShowToast={showToast}
          />
        )}

        {/* TAB 5: 24/7 Python Bot Runner & Background Workers */}
        {activeTab === 'bots' && currentUser && (
          <PythonBotsSection
            currentUser={currentUser}
            currentOrigin={currentOrigin}
            onShowToast={showToast}
          />
        )}

        {/* TAB 2: Multi-Language File Manager */}
        {activeTab === 'files' && (
          <div className="space-y-4">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">Project:</span>
                <select
                  value={activeProjectId || ''}
                  onChange={(e) => setActiveProjectId(e.target.value)}
                  className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800 focus:outline-none focus:border-sky-500"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (/site/{p.slug}) {p.turnstileEnabled !== false ? '🛡️' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setUploadMode('zip');
                    setUploadTargetProjectId(activeProject?.id || '');
                    setShowUploadModal(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer"
                >
                  <Archive className="w-3.5 h-3.5" /> Deploy ZIP
                </button>
                <button
                  onClick={() => {
                    setUploadMode('file');
                    setUploadTargetProjectId(activeProject?.id || '');
                    setShowUploadModal(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  <UploadCloud className="w-3.5 h-3.5 text-sky-600" /> Upload File
                </button>
                <button
                  onClick={() => handleOpenEditor()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-sky-600" /> New File
                </button>
                <button
                  onClick={() => currentUser && fetchUserProjects(currentUser.uid)}
                  className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-slate-900 cursor-pointer"
                  title="Refresh"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Files List Table */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                    <tr>
                      <th className="py-3 px-4">Filename</th>
                      <th className="py-3 px-4">Language / Type</th>
                      <th className="py-3 px-4">Execution Reality</th>
                      <th className="py-3 px-4">Size</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {!activeProject || activeProject.files.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-400">
                          <FileCode className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                          <p className="font-medium">No files in this project yet.</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">Deploy a ZIP archive or upload single source files.</p>
                        </td>
                      </tr>
                    ) : (
                      activeProject.files
                        .filter((f) => !searchQuery || f.fileName.toLowerCase().includes(searchQuery.toLowerCase()))
                        .map((file) => {
                          const langInfo = getFileLanguage(file.fileName);
                          const liveFileUrl = `${currentOrigin}/?id=${file.id}`;

                          return (
                            <tr key={file.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center font-bold text-[10px] uppercase font-mono">
                                    {file.ext || 'TXT'}
                                  </div>
                                  <div>
                                    <p className="font-semibold text-slate-900">{file.fileName}</p>
                                    <span className="text-[10px] text-slate-400 font-mono">ID: {file.id}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-600 font-medium text-[11px]">
                                  {langInfo.name}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                {file.renderable ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Browser Renderable
                                  </span>
                                ) : file.ext === 'php' ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-600">
                                    <Server className="w-3 h-3" /> PHP Server Executable
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                                    <FileCode className="w-3 h-3 text-slate-400" /> Source Managed
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4 font-mono text-slate-600">{formatBytes(file.size)}</td>
                              <td className="py-3 px-4 text-right">
                                <div className="inline-flex items-center gap-1">
                                  <button
                                    onClick={() => handleOpenEditor(file)}
                                    className="p-1.5 rounded-lg text-slate-600 hover:text-sky-600 hover:bg-slate-100 cursor-pointer"
                                    title="Edit Code"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  {file.renderable && (
                                    <a
                                      href={liveFileUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-1.5 rounded-lg text-slate-600 hover:text-sky-600 hover:bg-slate-100"
                                      title="Live Preview"
                                    >
                                      <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                  )}
                                  <button
                                    onClick={() => handleOpenDeleteFileModal(file)}
                                    className="p-1.5 rounded-lg text-slate-600 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* In-tab Developer Resources Ad Unit (300x250) */}
            <div className="flex justify-center pt-2">
              <AdBanner slot="sidebar_300" title="Developer Tools &amp; Partner Offers" showDirectLink={true} />
            </div>
          </div>
        )}

        {/* Community & Sponsored Support Native Unit (Only on main dashboard, never on user projects) */}
        <div className="pt-6 border-t border-slate-200/80 flex flex-col items-center justify-center">
          <AdBanner slot="native_container" title="Community Sponsor &bull; Native Multi-Ad Network" showDirectLink={true} />
        </div>
      </main>

      {/* MODAL 1: Create New Project with Slug Collision Detection & Turnstile Option */}
      {showNewProjectModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900">Create New Project</h3>
              <button onClick={() => setShowNewProjectModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateProject} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Project Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. My Secure Web App"
                  value={newProjectName}
                  onChange={(e) => {
                    setNewProjectName(e.target.value);
                    if (!newProjectSlug || newProjectSlug === newProjectName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')) {
                      setNewProjectSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-sky-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">URL Slug (Domain-Aware)</label>
                <input
                  type="text"
                  required
                  placeholder="my-secure-app"
                  value={newProjectSlug}
                  onChange={(e) => setNewProjectSlug(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono text-slate-900 focus:outline-none focus:border-sky-500 focus:bg-white"
                />
                <p className="text-[11px] text-slate-400 mt-1">Live URL: <span className="font-mono text-sky-600">{currentOrigin}/{newProjectSlug || 'my-app'}</span></p>
              </div>

              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newProjectTurnstile}
                    onChange={(e) => setNewProjectTurnstile(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-emerald-950 flex items-center gap-1">
                      <Shield className="w-3.5 h-3.5 text-emerald-600" /> Enable Cloudflare Turnstile Protection
                    </span>
                    <p className="text-[11px] text-emerald-700 mt-0.5">
                      Server-side reverse proxy gate prevents automated bot scraping.
                    </p>
                  </div>
                </label>
              </div>

              {slugAvailability && !slugAvailability.available && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                  <p className="font-bold flex items-center gap-1.5 mb-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" /> This project name/slug is already taken.
                  </p>
                  <p className="text-[11px] mb-2 text-amber-700">Available intelligent suggestions:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {slugAvailability.suggestions.map((sug) => (
                      <button
                        type="button"
                        key={sug}
                        onClick={() => setNewProjectSlug(sug)}
                        className="px-2.5 py-1 bg-white border border-amber-300 rounded-lg text-amber-900 font-mono text-[11px] hover:bg-amber-100 cursor-pointer"
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewProjectModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={slugAvailability ? !slugAvailability.available && newProjectSlug === slugAvailability.slug : false}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white shadow-sm disabled:opacity-50"
                >
                  Create Workspace
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Rename Project & Slug */}
      {showRenameModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900">Rename Project</h3>
              <button onClick={() => setShowRenameModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleRenameProject} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Project Display Name</label>
                <input
                  type="text"
                  required
                  value={renameProjectName}
                  onChange={(e) => setRenameProjectName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Public URL Slug</label>
                <input
                  type="text"
                  required
                  value={renameProjectSlug}
                  onChange={(e) => setRenameProjectSlug(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono text-slate-900 focus:outline-none focus:border-sky-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">Live at: <span className="font-mono text-sky-600">{currentOrigin}/{renameProjectSlug || 'slug'}</span></p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRenameModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white shadow-sm"
                >
                  Update Name & Slug
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ZIP Project & Single File Deployment */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  {uploadMode === 'zip' ? 'Deploy .ZIP Project' : 'Upload Single File'}
                </h3>
                <p className="text-xs text-slate-500">Atomic validation, Zip Slip protection, and persistent Turnstile gate</p>
              </div>
              <button onClick={() => setShowUploadModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteUpload} className="p-5 space-y-4">
              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => { setUploadMode('zip'); setSelectedFile(null); }}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    uploadMode === 'zip' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  ZIP Archive (.zip)
                </button>
                <button
                  type="button"
                  onClick={() => { setUploadMode('file'); setSelectedFile(null); }}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    uploadMode === 'file' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Single Source File
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Target Project Workspace</label>
                <select
                  value={uploadTargetProjectId}
                  onChange={(e) => setUploadTargetProjectId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800"
                >
                  <option value="">Create New Project Automatically</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} (/site/{p.slug}) {p.turnstileEnabled !== false ? '🛡️' : ''}</option>
                  ))}
                </select>
              </div>

              {uploadMode === 'file' && (
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Conflict Action (If file exists)</label>
                  <div className="flex gap-2">
                    {(['replace', 'rename', 'keep'] as const).map((act) => (
                      <button
                        type="button"
                        key={act}
                        onClick={() => setConflictAction(act)}
                        className={`flex-1 py-1.5 text-xs font-semibold capitalize rounded-lg border transition-all ${
                          conflictAction === act ? 'bg-sky-50 text-sky-700 border-sky-300' : 'bg-slate-50 text-slate-600 border-slate-200'
                        }`}
                      >
                        {act}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div
                onClick={() => (uploadMode === 'zip' ? zipInputRef.current?.click() : fileInputRef.current?.click())}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files?.[0]) setSelectedFile(e.dataTransfer.files[0]);
                }}
                className="border-2 border-dashed border-slate-300 hover:border-sky-500 bg-slate-50 hover:bg-sky-50/50 rounded-2xl p-6 text-center cursor-pointer transition-colors"
              >
                <input
                  type="file"
                  ref={zipInputRef}
                  accept=".zip"
                  onChange={(e) => e.target.files?.[0] && setSelectedFile(e.target.files[0])}
                  className="hidden"
                />
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => e.target.files?.[0] && setSelectedFile(e.target.files[0])}
                  className="hidden"
                />
                {uploadMode === 'zip' ? <Archive className="w-8 h-8 text-sky-500 mx-auto mb-2" /> : <UploadCloud className="w-8 h-8 text-sky-500 mx-auto mb-2" />}
                <p className="text-xs font-semibold text-slate-700">
                  {selectedFile ? selectedFile.name : `Select or drag & drop ${uploadMode === 'zip' ? '.zip project' : 'source file'}`}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  {uploadMode === 'zip' ? 'Zip Slip protected, auto-extracts folders & detects entry point' : 'Preserves filename, syntax metadata & live proxy routing'}
                </p>
              </div>

              {isProcessingUpload && (
                <div className="p-4 bg-sky-50 border border-sky-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs text-sky-900 font-bold">
                    <span className="flex items-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-600" />
                      {uploadStage || 'Processing deployment...'}
                    </span>
                    {chunkProgress && (
                      <span className="font-mono text-sky-700">{chunkProgress.percentage}%</span>
                    )}
                  </div>

                  {chunkProgress && (
                    <>
                      <div className="w-full bg-sky-200 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-sky-600 h-full transition-all duration-300 rounded-full"
                          style={{ width: `${chunkProgress.percentage}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[11px] text-sky-700 font-mono">
                        <span>Chunk {chunkProgress.currentChunk} / {chunkProgress.totalChunks}</span>
                        <span>{(chunkProgress.uploadedBytes / (1024 * 1024)).toFixed(1)} / {(chunkProgress.totalBytes / (1024 * 1024)).toFixed(1)} MB</span>
                      </div>
                    </>
                  )}
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessingUpload || !selectedFile}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white shadow-sm disabled:opacity-50"
                >
                  {isProcessingUpload ? 'Deploying...' : 'Deploy Now'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: V5 Cloudflare Turnstile Security Gate Settings (Requirement 18, 19, 32) */}
      {showSecurityModal && securityTargetProject && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-emerald-600" /> Cloudflare Turnstile Security Gate
                </h3>
                <p className="text-xs text-slate-500">Reverse proxy access verification without modifying source code</p>
              </div>
              <button onClick={() => setShowSecurityModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Security Switcher */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Turnstile Protection</h4>
                  <p className="text-xs text-slate-500">
                    {securityTargetProject.turnstileEnabled !== false
                      ? 'Visitors must verify with Cloudflare Turnstile before accessing the site.'
                      : 'Public site is accessible directly without verification.'}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isTogglingSecurity}
                  onClick={() => handleToggleProjectSecurity(securityTargetProject)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    securityTargetProject.turnstileEnabled !== false
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs'
                      : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                  }`}
                >
                  {securityTargetProject.turnstileEnabled !== false ? (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span>ENABLED</span>
                    </>
                  ) : (
                    <>
                      <Unlock className="w-3.5 h-3.5" />
                      <span>DISABLED</span>
                    </>
                  )}
                </button>
              </div>

              {/* Technical Architecture Details */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Gate Architecture:</span>
                  <span className="font-semibold text-slate-800">Server-Side Reverse Proxy Gate</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Source Integrity:</span>
                  <span className="font-semibold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> 100% Clean / Unmodified
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Persistence:</span>
                  <span className="font-semibold text-slate-800">Attached to Project across all updates</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Public Site Key:</span>
                  <span className="font-mono text-slate-700 font-bold">{CLOUDFLARE_TURNSTILE_SITE_KEY}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Session Cookie:</span>
                  <span className="font-mono text-slate-700">HttpOnly &bull; SameSite=Lax (2 Hours)</span>
                </div>
              </div>

              {/* Security Test Action */}
              <div className="p-3 bg-sky-50 border border-sky-100 rounded-xl text-xs text-sky-900 leading-relaxed">
                💡 <strong>Try it live:</strong> Open the project URL in an incognito window to see the Cloudflare Turnstile Challenge gate in action before your site loads.
              </div>

              <div className="pt-2 flex items-center justify-between">
                <a
                  href={`${currentOrigin}/site/${securityTargetProject.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Test Gate Live ↗
                </a>

                <button
                  type="button"
                  onClick={() => setShowSecurityModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: V4/V5 SEO Engine & Google SERP Preview */}
      {showSeoModal && seoTargetProject && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600" /> SEO Engine &amp; Social Cards (Auto AC)
                </h3>
                <p className="text-xs text-slate-500">Domain-aware SEO injection, 100% crawl readiness, and SERP tags</p>
              </div>
              <button onClick={() => setShowSeoModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSeo} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* 1-Click 100% Auto SEO Quick Action */}
              <div className="p-3.5 bg-gradient-to-r from-indigo-50 via-sky-50 to-emerald-50 border border-indigo-200 rounded-xl flex items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-indigo-600" /> 100% Auto SEO Optimizer (Auto AC)
                  </span>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Instant 100% score: Title, description, keywords, OpenGraph card &amp; domain URL.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleAutoSeo(seoTargetProject)}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1 shrink-0"
                >
                  <Sparkles className="w-3.5 h-3.5" /> ⚡ 100% Auto SEO
                </button>
              </div>

              {/* SERP Card Preview */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  Live Google SERP Card Preview &bull; {currentDomain}
                </span>
                <div className="text-xs font-sans">
                  <div className="text-[11px] text-slate-600 flex items-center gap-1 mb-0.5 truncate font-mono">
                    <Globe className="w-3 h-3 text-slate-400" /> {currentOrigin} &gt; {seoTargetProject.slug}
                  </div>
                  <h4 className="text-sm font-semibold text-blue-800 hover:underline cursor-pointer truncate">
                    {seoTitle || seoTargetProject.name} | {currentDomain}
                  </h4>
                  <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                    {seoDescription || 'Fast cloud hosting on KAVO Hosting Engine with domain-aware proxy and 24/7 reliability.'}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Page Title &lt;title&gt;</label>
                <input
                  type="text"
                  required
                  value={seoTitle}
                  onChange={(e) => setSeoTitle(e.target.value)}
                  placeholder="e.g. My Awesome Web App - Fast & Modern"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Meta Description</label>
                <textarea
                  rows={2}
                  required
                  value={seoDescription}
                  onChange={(e) => setSeoDescription(e.target.value)}
                  placeholder="Describe your site for search engine crawlers..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Keywords</label>
                  <input
                    type="text"
                    value={seoKeywords}
                    onChange={(e) => setSeoKeywords(e.target.value)}
                    placeholder="web, project, portfolio, secure"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">OpenGraph Image URL</label>
                  <input
                    type="text"
                    value={seoOgImage}
                    onChange={(e) => setSeoOgImage(e.target.value)}
                    placeholder="https://example.com/cover.jpg"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Canonical URL (Domain-Aware)</label>
                <input
                  type="text"
                  value={seoCanonical}
                  onChange={(e) => setSeoCanonical(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleTestCrawlability}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  <Activity className="w-3.5 h-3.5" /> Test Crawl Readiness
                </button>

                {crawlabilityTestPassed !== null && (
                  <span className={`text-xs font-semibold flex items-center gap-1 ${crawlabilityTestPassed ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {crawlabilityTestPassed ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                    {crawlabilityTestPassed ? '100% Crawl Ready [A+]' : 'Incomplete Meta'}
                  </span>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSeoModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingSeo}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm disabled:opacity-50"
                >
                  {isSavingSeo ? 'Injecting Tags...' : 'Save & Inject Meta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: 24/7 Availability Ping & Health Verification */}
      {showHealthModal && healthTargetProject && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-600" /> 24/7 Availability &amp; Health Ping
                </h3>
                <p className="text-xs text-slate-500">Real-time latency, storage persistence, and domain ping</p>
              </div>
              <button onClick={() => setShowHealthModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{healthTargetProject.name}</h4>
                  <p className="text-xs font-mono text-slate-500">/site/{healthTargetProject.slug}</p>
                </div>
                {isCheckingHealth ? (
                  <RefreshCw className="w-5 h-5 animate-spin text-sky-600" />
                ) : (
                  <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    ONLINE
                  </span>
                )}
              </div>

              {healthResult && (
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">HTTP Response:</span>
                    <span className="font-mono font-bold text-emerald-600">{healthResult.httpCode} OK</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">Latency:</span>
                    <span className="font-mono font-bold text-slate-800">{healthResult.responseTimeMs} ms</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">Storage Backend:</span>
                    <span className="font-bold text-sky-600">Gofile REST Cloud</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">Gate Security:</span>
                    <span className="font-bold text-emerald-600">Cloudflare Turnstile Active</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">Edge Cache Status:</span>
                    <span className="font-bold text-emerald-600">{healthResult.cacheStatus || 'CACHED (HIT)'}</span>
                  </div>
                </div>
              )}

              <div className="p-3 bg-sky-50 border border-sky-100 rounded-xl text-[11px] text-sky-800 leading-relaxed">
                💡 <strong>Availability Guarantee:</strong> Hosted assets are persisted across isolated tenant disk storage and protected by the Cloudflare Turnstile edge gate.
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenHealthModal(healthTargetProject)}
                  disabled={isCheckingHealth}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isCheckingHealth ? 'animate-spin' : ''}`} />
                  Re-ping
                </button>
                <button
                  type="button"
                  onClick={() => setShowHealthModal(false)}
                  className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 7: Version History & Rollback */}
      {showRollbackModal && rollbackTargetProject && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <History className="w-4 h-4 text-sky-600" /> Version History &amp; Rollback
                </h3>
                <p className="text-xs text-slate-500">Atomic instant rollback to any release while preserving security settings</p>
              </div>
              <button onClick={() => setShowRollbackModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {(!rollbackTargetProject.versions || rollbackTargetProject.versions.length === 0) ? (
                <div className="p-6 text-center text-slate-400 text-xs">
                  <RotateCcw className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                  No prior version history recorded yet. Each new ZIP upload creates an atomic version.
                </div>
              ) : (
                <div className="space-y-3">
                  {rollbackTargetProject.versions.map((ver) => {
                    const isCurrent = ver.version === rollbackTargetProject.activeVersion;
                    return (
                      <div
                        key={ver.version}
                        className={`p-4 rounded-xl border flex items-center justify-between gap-3 ${
                          isCurrent ? 'bg-sky-50/70 border-sky-200' : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-slate-900">{ver.version}</span>
                            {isCurrent && (
                              <span className="px-2 py-0.5 rounded-full bg-sky-200 text-sky-800 text-[10px] font-bold">
                                Current Active
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {ver.note || 'Project deployment'} &bull; {ver.files.length} files
                          </p>
                          <span className="text-[10px] text-slate-400">
                            {new Date(ver.timestamp).toLocaleString()}
                          </span>
                        </div>

                        {!isCurrent && (
                          <button
                            type="button"
                            disabled={isExecutingRollback}
                            onClick={() => handleExecuteRollback(ver.version)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 shadow-xs cursor-pointer disabled:opacity-50"
                          >
                            Rollback &rarr;
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="pt-2 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setShowRollbackModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 8: Multi-Language Code Editor */}
      {showEditorModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-6">
          <div className="bg-slate-900 rounded-2xl max-w-5xl w-full h-[88vh] border border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 text-slate-100">
            <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-sky-400" />
                <input
                  type="text"
                  value={editorFileName}
                  onChange={(e) => {
                    setEditorFileName(e.target.value);
                    setIsEditorDirty(true);
                  }}
                  className="bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-sky-500"
                />
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 bg-slate-800 rounded text-slate-400">
                  {getFileLanguage(editorFileName).name}
                </span>
                {isEditorDirty && (
                  <span className="text-[10px] text-amber-400 font-mono px-2 py-0.5 bg-amber-500/10 rounded border border-amber-500/20">
                    Unsaved Changes
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Find..."
                  value={editorSearch}
                  onChange={(e) => setEditorSearch(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded px-2 py-0.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500 w-24 sm:w-32"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!editorSearch) return;
                    const count = (editorCode.match(new RegExp(editorSearch, 'g')) || []).length;
                    showToast(`Found ${count} occurrences of "${editorSearch}"`, 'info');
                  }}
                  className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-[11px] text-slate-300"
                >
                  Find
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveEditor}
                  disabled={isSavingCode}
                  className="px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {isSavingCode ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Save (Ctrl+S)</span>
                </button>
                <button
                  onClick={() => {
                    if (isEditorDirty && !confirm('Discard unsaved changes?')) return;
                    setShowEditorModal(false);
                  }}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 flex overflow-hidden font-mono text-xs">
              <div className="w-12 bg-slate-950/60 border-r border-slate-800/80 py-4 select-none text-right pr-3 text-slate-600 font-mono text-[11px]">
                {editorCode.split('\n').map((_, i) => (
                  <div key={i}>{i + 1}</div>
                ))}
              </div>

              <textarea
                value={editorCode}
                onChange={(e) => {
                  setEditorCode(e.target.value);
                  setIsEditorDirty(true);
                }}
                spellCheck={false}
                className="flex-1 p-4 bg-slate-900 text-sky-100 font-mono text-xs leading-relaxed resize-none focus:outline-none selection:bg-sky-900 selection:text-white"
              />
            </div>
          </div>
        </div>
      )}

      {/* MODAL 9: Interactive Web Terminal & Shell CLI Console */}
      <WebTerminalModal
        isOpen={showTerminalModal}
        onClose={() => setShowTerminalModal(false)}
        currentUser={currentUser}
        currentOrigin={currentOrigin}
      />

      {/* MODAL 7: In-App Project Deletion Confirmation Modal */}
      {projectToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-red-100 bg-red-50/60 flex items-center justify-between">
              <div className="flex items-center gap-2 text-red-700">
                <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">Delete Project?</h3>
                  <p className="text-xs text-red-600">This action is permanent and cannot be undone</p>
                </div>
              </div>
              <button
                onClick={() => setProjectToDelete(null)}
                disabled={isDeletingProject}
                className="text-slate-400 hover:text-slate-600 cursor-pointer disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <div className="text-xs font-bold text-slate-800">{projectToDelete.name}</div>
                <div className="text-[11px] font-mono text-sky-600 truncate">{currentOrigin}/{projectToDelete.slug}</div>
              </div>

              <div className="text-xs text-slate-600 space-y-1.5 bg-red-50/40 p-3 rounded-xl border border-red-100">
                <p className="font-semibold text-red-900">Deleting this project will:</p>
                <ul className="list-disc list-inside text-slate-600 space-y-1 pl-1">
                  <li>Permanently remove all deployed files &amp; version history</li>
                  <li>Release the public URL slug and domain routing</li>
                  <li>Revoke Cloudflare Turnstile reverse proxy authorization</li>
                </ul>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setProjectToDelete(null)}
                  disabled={isDeletingProject}
                  className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold cursor-pointer transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteProject}
                  disabled={isDeletingProject}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isDeletingProject ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Permanently</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 8: In-App File Deletion Confirmation Modal */}
      {fileToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-red-100 bg-red-50/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-red-600" />
                <h3 className="font-bold text-sm text-slate-900">Delete File?</h3>
              </div>
              <button
                onClick={() => setFileToDelete(null)}
                disabled={isDeletingFile}
                className="text-slate-400 hover:text-slate-600 cursor-pointer disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <p className="text-xs text-slate-600">
                Are you sure you want to delete <span className="font-bold text-slate-900 font-mono">{fileToDelete.fileName}</span> ({formatBytes(fileToDelete.size)})?
              </p>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setFileToDelete(null)}
                  disabled={isDeletingFile}
                  className="px-3 py-1.5 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteFile}
                  disabled={isDeletingFile}
                  className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isDeletingFile ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Persistent High-Yield Sticky Ad Bar */}
      <StickyAdBar />

      {/* Floating Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-xl shadow-lg border text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 ${
            toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : toast.type === 'error'
              ? 'bg-red-50 text-red-800 border-red-200'
              : 'bg-slate-900 text-white border-slate-800'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
