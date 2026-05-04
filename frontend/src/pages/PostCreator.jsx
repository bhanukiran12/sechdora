import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Upload, Sparkles, ArrowLeft, Image as ImageIcon, Eye, PenLine, ShieldCheck, Lightbulb, Loader2, CalendarDays, Clock3, Lock } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import PostPreview from "@/components/PostPreview";
import TokenWarningModal from "@/components/TokenWarningModal";
import UpgradeModal from "@/components/UpgradeModal";
import { detectUrl, calculateTokenCost } from "@/utils/tokens";
import usePlan from "@/hooks/usePlan";

const BACKEND_URL = "/api";
const API = "/api";
const MAX_MEDIA_FILES = 10;
const MAX_FILE_SIZE_MB = 10;

const PLATFORMS = [
  { id: 'linkedin', name: 'LinkedIn' },
  { id: 'twitter', name: 'Twitter (X)' },
  { id: 'instagram', name: 'Instagram', comingSoon: true },
  { id: 'facebook', name: 'Facebook', comingSoon: true },
  { id: 'youtube', name: 'YouTube', comingSoon: true }
];

export default function PostCreator() {
  const navigate = useNavigate();
  const location = useLocation();
  const { canAI, canCustomRecurrence } = usePlan();
  const [content, setContent] = useState('');
  const [sourceTask, setSourceTask] = useState(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [connectedAccounts, setConnectedAccounts] = useState([]);
  const [targetAccounts, setTargetAccounts] = useState({});
  const [platformCaptions, setPlatformCaptions] = useState({});
  const [mediaUrls, setMediaUrls] = useState([]);
  const [mediaPreviewUrls, setMediaPreviewUrls] = useState([]);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledClock, setScheduledClock] = useState('');
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [recurrence, setRecurrence] = useState('none');
  const [customInterval, setCustomInterval] = useState({ value: 1, unit: 'hours' });
  const [autoRetry, setAutoRetry] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [tokenWarning, setTokenWarning] = useState({ open: false, tokensRequired: 3 });
  const [pendingPostStatus, setPendingPostStatus] = useState(null);
  const [upgradeModal, setUpgradeModal] = useState({ open: false, message: "" });

  const formatLocalDateInput = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    fetchConnectedAccounts();
    const defaultSchedule = new Date();
    defaultSchedule.setDate(defaultSchedule.getDate() + 1);
    defaultSchedule.setHours(10, 0, 0, 0);
    setScheduledDate(formatLocalDateInput(defaultSchedule));
    setScheduledClock(defaultSchedule.toTimeString().slice(0, 5));
  }, []);

  useEffect(() => {
    const task = location.state?.task;
    if (!task) return;
    setSourceTask(task);
    const prefilled = [task.title, task.description].filter(Boolean).join("\n\n");
    if (prefilled) {
      setContent((prev) => prev || prefilled);
    }
    if (task.project?.defaultPlatform && task.project.defaultPlatform !== 'all') {
      setSelectedPlatforms((prev) => prev.length ? prev : [task.project.defaultPlatform]);
    }
  }, [location.state]);

  const timezoneName = Intl.DateTimeFormat().resolvedOptions().timeZone || "Local time";

  const formatScheduledPreview = () => {
    if (!scheduledDate || !scheduledClock) {
      return "Pick a date and time to preview when this post will go live.";
    }

    const [year, month, day] = scheduledDate.split("-").map(Number);
    const [hours, minutes] = scheduledClock.split(":").map(Number);
    const previewDate = new Date(year, month - 1, day, hours, minutes, 0);

    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);

    const sameDay = previewDate.toDateString() === now.toDateString();
    const tomorrowDay = previewDate.toDateString() === tomorrow.toDateString();

    const dayLabel = sameDay
      ? "Today"
      : tomorrowDay
        ? "Tomorrow"
        : previewDate.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });

    const timeLabel = previewDate.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    return `${dayLabel} at ${timeLabel} ${timezoneName}`;
  };

  const setTomorrowMorning = () => {
    const defaultSchedule = new Date();
    defaultSchedule.setDate(defaultSchedule.getDate() + 1);
    defaultSchedule.setHours(10, 0, 0, 0);
    setScheduledDate(formatLocalDateInput(defaultSchedule));
    setScheduledClock(defaultSchedule.toTimeString().slice(0, 5));
  };

  const openNativePicker = (event) => {
    try {
      if (typeof event.currentTarget.showPicker === "function") {
        event.currentTarget.showPicker();
      }
    } catch (error) {
      // Some browsers only allow showPicker from direct pointer/keyboard actions.
    }
  };

  useEffect(() => {
    return () => {
      mediaPreviewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [mediaPreviewUrls]);

  useEffect(() => {
    setTargetAccounts((prev) => {
      const next = { ...prev };
      ['twitter', 'linkedin'].forEach((platformId) => {
        if (selectedPlatforms.includes(platformId)) {
          const available = connectedAccounts
            .filter((account) => account.platform === platformId)
            .map((account) => account.account_id);
          if (!next[platformId] || next[platformId].length === 0) {
            next[platformId] = available;
          }
        } else {
          delete next[platformId];
        }
      });
      return next;
    });
  }, [selectedPlatforms, connectedAccounts]);

  const fetchConnectedAccounts = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.get(`${API}/social-accounts`, {
        headers: { Authorization: `Bearer ${token}` }, withCredentials: true
      });
      setConnectedAccounts(response.data);
    } catch (error) {
      toast.error('Failed to load connected accounts');
    }
  };

  const togglePlatform = (id) => {
    if (PLATFORMS.find(p => p.id === id)?.comingSoon) return;
    setSelectedPlatforms((prev) => {
      const next = prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id];
      if (next.includes(id) && ['twitter', 'linkedin'].includes(id)) {
        const available = connectedAccounts
          .filter((account) => account.platform === id)
          .map((account) => account.account_id);
        setTargetAccounts((current) => ({ ...current, [id]: available }));
      }
      if (!next.includes(id)) {
        setTargetAccounts((current) => {
          const updated = { ...current };
          delete updated[id];
          return updated;
        });
      }
      return next;
    });
  };

  const toggleTargetAccount = (platformId, accountId) => {
    setTargetAccounts((prev) => {
      const current = prev[platformId] || [];
      return {
        ...prev,
        [platformId]: current.includes(accountId)
          ? current.filter((id) => id !== accountId)
          : [...current, accountId]
      };
    });
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    if (mediaUrls.length + files.length > MAX_MEDIA_FILES) {
      toast.error(`You can upload up to ${MAX_MEDIA_FILES} files`);
      e.target.value = '';
      return;
    }

    const validFiles = [];
    for (const file of files) {
      const isSupportedType = file.type.startsWith('image/') || file.type.startsWith('video/');
      if (!isSupportedType) {
        toast.error(`${file.name} is not a supported image or video file`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        toast.error(`${file.name} is larger than ${MAX_FILE_SIZE_MB}MB`);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) {
      e.target.value = '';
      return;
    }

    const previewBatch = validFiles.map((file) => URL.createObjectURL(file));
    setMediaPreviewUrls((prev) => [...prev, ...previewBatch]);
    setUploading(true);
    try {
      const token = localStorage.getItem('access_token');
      const uploads = validFiles.map(async (file) => {
        const fd = new FormData();
        fd.append('file', file);
        const res = await axios.post(`${API}/upload`, fd, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }, withCredentials: true });
        return res.data.url;
      });
      const urls = await Promise.all(uploads);
      setMediaUrls((prev) => [...prev, ...urls]);
      toast.success('Media uploaded');
    } catch (error) {
      previewBatch.forEach((url) => URL.revokeObjectURL(url));
      setMediaPreviewUrls((prev) => prev.filter((url) => !previewBatch.includes(url)));
      toast.error('Failed to upload media');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const removeMedia = (index) => {
    setMediaUrls((prev) => prev.filter((_, currentIndex) => currentIndex !== index));
    setMediaPreviewUrls((prev) => {
      const next = [...prev];
      const [removed] = next.splice(index, 1);
      if (removed) {
        URL.revokeObjectURL(removed);
      }
      return next;
    });
  };

  const improveCaption = async () => {
    if (!content.trim()) { toast.error('Enter a caption first'); return; }
    setGenerating(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await axios.post(`${API}/ai/improve-caption`, { caption: content, platform: selectedPlatforms[0] || 'instagram' }, { headers: { Authorization: `Bearer ${token}` }, withCredentials: true });
      const improvedCaption = res.data.improved_caption || content;
      setContent(improvedCaption);
      toast.success('Caption improved!');
    } catch (error) {
      toast.error('Failed to improve');
    } finally {
      setGenerating(false);
    }
  };

  const createPost = async (status = 'draft') => {
    if (!content.trim()) { toast.error('Enter post content'); return; }
    if (selectedPlatforms.length === 0) { toast.error('Select at least one platform'); return; }
    if (selectedPlatforms.includes('twitter') && content.length > 280) { toast.error('Twitter posts must be 280 characters or fewer'); return; }
    if (status === 'scheduled' && (!scheduledDate || !scheduledClock)) { toast.error('Select a schedule date and time'); return; }

    const { tokensRequired, type } = calculateTokenCost(content);
    
    if (type === 'url' && status === 'scheduled') {
      setTokenWarning({ open: true, tokensRequired });
      setPendingPostStatus(status);
      return;
    }
    
    await executePostCreation(status);
  };

  const effectiveRecurrence = recurrence === 'custom'
    ? `every_${customInterval.value}_${customInterval.unit}`
    : recurrence;

  const executePostCreation = async (status) => {
    try {
      const token = localStorage.getItem('access_token');
      const scheduledTime = status === 'scheduled' && scheduledDate && scheduledClock
        ? new Date(`${scheduledDate}T${scheduledClock}:00`).toISOString()
        : null;
      await axios.post(`${API}/posts`, {
        content, platforms: selectedPlatforms, platform_captions: platformCaptions,
        target_accounts: targetAccounts,
        media_urls: mediaUrls, scheduled_time: scheduledTime,
        status, recurrence: effectiveRecurrence, auto_retry: autoRetry,
        source_task_id: sourceTask?.id
      }, { headers: { Authorization: `Bearer ${token}` }, withCredentials: true });
      toast.success(status === 'scheduled' ? 'Post scheduled!' : 'Draft saved!');
      navigate('/dashboard');
} catch (error) {
      if (error.response?.data?.detail?.includes('credits') || error.response?.data?.detail?.includes('tokens')) {
        toast.error(error.response.data.detail);
      } else {
        toast.error('Failed to create post');
      }
    }
  };

  const handlePostConfirm = async () => {
    setTokenWarning({ open: false, tokensRequired: 3 });
    const accountValidationError = ['twitter', 'linkedin'].find((platformId) => {
      if (!selectedPlatforms.includes(platformId)) return false;
      const available = connectedAccounts.filter((account) => account.platform === platformId);
      if (available.length === 0) return true;
      return !(targetAccounts[platformId] && targetAccounts[platformId].length > 0);
    });
    if (accountValidationError) {
      const hasAccounts = connectedAccounts.some((account) => account.platform === accountValidationError);
      toast.error(hasAccounts ? `Select at least one ${accountValidationError === 'twitter' ? 'Twitter' : 'LinkedIn'} account` : `Connect a ${accountValidationError === 'twitter' ? 'Twitter' : 'LinkedIn'} account first`);
      return;
    }
    await executePostCreation(pendingPostStatus || 'scheduled');
    setPendingPostStatus(null);
  };

  const handleOptimizeAndPost = async () => {
    setTokenWarning({ open: false, tokensRequired: 3 });
    setGenerating(true);
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.post(`${API}/ai/optimize-post`, 
        { content, optimize_for: 'no_link' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setContent(response.data.optimized_content || response.data.content);
      toast.success('Post optimized! Link removed and converted to CTA.');
    } catch (error) {
      toast.error('Failed to optimize post');
    } finally {
      setGenerating(false);
      setPendingPostStatus(null);
    }
  };

  return (
    <>
      <TokenWarningModal
        isOpen={tokenWarning.open}
        onClose={() => setTokenWarning({ open: false, tokensRequired: 3 })}
        onConfirm={handlePostConfirm}
        onOptimize={handleOptimizeAndPost}
        tokensRequired={tokenWarning.tokensRequired}
        content={content}
      />
      <UpgradeModal
        isOpen={upgradeModal.open}
        onClose={() => setUpgradeModal({ open: false, message: "" })}
        message={upgradeModal.message}
      />
      <div className="flex" data-testid="post-creator-container">
        <Sidebar active="create" />
      <main className="flex-1 bg-background p-6 md:p-12">
        <button onClick={() => navigate('/dashboard')} className="mb-6 flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors" data-testid="back-to-dashboard">
          <ArrowLeft className="w-5 h-5" /> Back to Dashboard
        </button>
        <div className="flex justify-between items-start mb-8">
          <h1 className="text-4xl sm:text-5xl font-black font-heading tracking-tighter" data-testid="page-heading">Create Post</h1>
          <button onClick={() => setShowPreview(!showPreview)} className={`brutal-button ${showPreview ? 'bg-primary text-white' : 'bg-white text-text-primary'} flex items-center gap-2`} data-testid="toggle-preview">
            <Eye className="w-5 h-5" /> {showPreview ? 'Hide Preview' : 'Show Preview'}
          </button>
        </div>

        {sourceTask && (
          <div className="brutal-card p-4 mb-6 bg-pastel-yellow/30">
            <div className="text-[10px] uppercase tracking-[0.2em] font-black text-text-muted">Converted from task</div>
            <div className="mt-1 font-black">{sourceTask.title}</div>
            <p className="text-sm text-text-secondary mt-1">Publishing this post will mark the source task as done and link the post back to the task.</p>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className={`${showPreview ? 'lg:col-span-1' : 'lg:col-span-2'} space-y-6`}>
            {/* Platform Selection */}
            <div className="brutal-card p-6" data-testid="platform-selector">
              <label className="text-xs tracking-[0.2em] uppercase font-bold text-text-muted mb-3 block">Select Platforms</label>
              <div className="flex flex-wrap gap-3">
                {PLATFORMS.map((p) => (
                  <button 
                    key={p.id} 
                    onClick={() => togglePlatform(p.id)} 
                    disabled={p.comingSoon}
                    className={`px-4 py-2 rounded-xl border-2 border-border font-medium transition-all flex flex-col items-center ${
                      p.comingSoon ? 'bg-gray-100 opacity-60 grayscale cursor-not-allowed' : 
                      selectedPlatforms.includes(p.id) ? 'bg-primary text-white shadow-brutal' : 'bg-white text-text-primary hover:shadow-brutal-hover'
                    }`} 
                    data-testid={`platform-${p.id}`}
                  >
                    <span>{p.name}</span>
                    {p.comingSoon && <span className="text-[10px] font-black tracking-widest uppercase">Soon</span>}
                  </button>
                ))}
              </div>
            </div>

            {selectedPlatforms.some((platformId) => ['twitter', 'linkedin'].includes(platformId)) && (
              <div className="brutal-card p-6 space-y-4">
                <div>
                  <label className="text-xs tracking-[0.2em] uppercase font-bold text-text-muted mb-2 block">Target Accounts</label>
                  <p className="text-sm text-text-secondary">
                    Choose one or more connected accounts for Twitter and LinkedIn. The post will be sent to every selected account.
                  </p>
                </div>

                {selectedPlatforms.filter((platformId) => ['twitter', 'linkedin'].includes(platformId)).map((platformId) => {
                  const availableAccounts = connectedAccounts.filter((account) => account.platform === platformId);
                  const selectedAccountIds = targetAccounts[platformId] || [];

                  return (
                    <div key={platformId} className="rounded-xl border-2 border-border bg-white p-4 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h3 className="font-black capitalize">{platformId}</h3>
                          <p className="text-xs text-text-muted">
                            {availableAccounts.length ? `${availableAccounts.length} connected account${availableAccounts.length > 1 ? 's' : ''}` : 'No connected accounts yet'}
                          </p>
                        </div>
                        {availableAccounts.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setTargetAccounts((prev) => ({ ...prev, [platformId]: availableAccounts.map((account) => account.account_id) }))}
                            className="text-xs font-black uppercase tracking-widest text-primary"
                          >
                            Select all
                          </button>
                        )}
                      </div>

                      {availableAccounts.length === 0 ? (
                        <p className="text-sm text-red-600 font-medium">Connect at least one {platformId} account before scheduling.</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {availableAccounts.map((account) => {
                            const isSelected = selectedAccountIds.includes(account.account_id);
                            return (
                              <button
                                key={account.account_id}
                                type="button"
                                onClick={() => toggleTargetAccount(platformId, account.account_id)}
                                className={`rounded-xl border-2 px-3 py-2 text-xs font-bold transition-all ${
                                  isSelected ? 'bg-primary text-white border-primary' : 'bg-white text-text-primary border-border'
                                }`}
                              >
                                {account.username || account.account_id}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Content Input */}
            <div className="brutal-card p-6">
              <div className="flex justify-between items-center mb-3">
                <label className="text-xs tracking-[0.2em] uppercase font-bold text-text-muted">Post Content</label>
                {canAI ? (
                  <button onClick={improveCaption} disabled={generating} className="flex items-center gap-2 text-sm font-bold text-primary hover:underline disabled:opacity-70" data-testid="improve-caption-button">
                    {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 animate-sparkle" />}
                    {generating ? 'Improving...' : 'Improve with AI'}
                  </button>
                ) : (
                  <button
                    onClick={() => setUpgradeModal({ open: true, message: "Upgrade to Pro or Business to use AI content generation." })}
                    className="flex items-center gap-2 text-sm font-bold text-text-muted hover:text-primary transition-colors"
                    data-testid="improve-caption-button"
                  >
                    <Lock className="w-4 h-4" />
                    AI (Pro)
                  </button>
                )}
              </div>
              <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Write your post content here..." className="w-full h-40 brutal-input resize-none" data-testid="post-content-input" />
              {generating && (
                <div className="mt-3 flex items-center gap-2 text-xs font-bold text-text-muted">
                  <span className="inline-flex h-2 w-2 rounded-full bg-primary animate-pulse" />
                  AI is refining your caption
                </div>
              )}
              <div className="mt-2 text-xs text-text-muted">{content.length} characters {selectedPlatforms.includes('twitter') && content.length > 280 && <span className="text-red-500 font-bold"> (exceeds Twitter 280 limit)</span>}</div>
            </div>

            {/* Media Upload */}
            <div className="brutal-card p-6">
              <label className="text-xs tracking-[0.2em] uppercase font-bold text-text-muted mb-3 block">Media</label>
              <div className="border-2 border-dashed border-border rounded-xl p-6 text-center bg-gradient-to-br from-white to-pastel-blue/10">
                <input type="file" multiple accept="image/*,video/*" onChange={handleFileUpload} className="hidden" id="media-upload" data-testid="media-upload-input" />
                <label htmlFor="media-upload" className="cursor-pointer">
                  <Upload className="w-10 h-10 mx-auto mb-2 text-text-muted" />
                  <p className="text-sm font-medium text-text-secondary">{uploading ? 'Uploading...' : 'Click to upload'}</p>
                  <p className="mt-2 text-xs text-text-muted">Images/videos up to {MAX_FILE_SIZE_MB}MB each. Best results with clean PNG or JPG images.</p>
                </label>
              </div>
              {mediaUrls.length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {mediaUrls.map((url, i) => (
                    <div key={url} className="group relative overflow-hidden rounded-2xl border-2 border-black bg-white shadow-brutalSoft aspect-square">
                      {mediaPreviewUrls[i] ? (
                        <img
                          src={mediaPreviewUrls[i]}
                          alt={`Uploaded media ${i + 1}`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gray-50">
                          <ImageIcon className="w-8 h-8 text-text-muted" />
                        </div>
                      )}
                      <div className="absolute inset-x-0 bottom-0 bg-black/75 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                        Uploaded
                      </div>
                      <button
                        type="button"
                        onClick={() => removeMedia(i)}
                        className="absolute right-2 top-2 rounded-full border-2 border-black bg-white/90 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-text-primary transition hover:bg-red-500 hover:text-white"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Schedule + Recurrence */}
            <div className="brutal-card p-6 bg-gradient-to-br from-white to-pastel-yellow/20 border-4 border-black shadow-brutal-lg">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div>
                  <label className="text-xs tracking-[0.2em] uppercase font-bold text-text-muted mb-2 block">Schedule</label>
                  <p className="text-sm text-text-secondary">
                    Pick a publish date and time. Uses your local timezone.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={setTomorrowMorning}
                  className="rounded-full border-2 border-black bg-white px-3 py-2 text-[10px] font-black uppercase tracking-widest shadow-brutal hover:bg-black hover:text-white transition-colors whitespace-nowrap"
                >
                  Tomorrow 10 AM
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-[1.3fr_0.9fr] mb-4">
                <label className="block">
                  <span className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-text-muted">
                    <CalendarDays className="w-3 h-3" />
                    Date
                  </span>
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    onClick={openNativePicker}
                    onFocus={openNativePicker}
                    className="brutal-input w-full min-h-[52px] cursor-pointer"
                    data-testid="schedule-date-input"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-text-muted">
                    <Clock3 className="w-3 h-3" />
                    Time
                  </span>
                  <input
                    type="time"
                    value={scheduledClock}
                    onChange={(e) => setScheduledClock(e.target.value)}
                    onClick={openNativePicker}
                    onFocus={openNativePicker}
                    className="brutal-input w-full min-h-[52px] cursor-pointer"
                    data-testid="schedule-time-input"
                  />
                </label>
              </div>

              <div className="rounded-xl border-2 border-black bg-white px-4 py-3 text-[11px] font-medium text-text-secondary flex items-center justify-between gap-3 mb-4">
                <span>Timezone: {timezoneName}</span>
                <span className="font-black uppercase tracking-widest text-primary">Live local preview</span>
              </div>

              <div className="mb-4 rounded-xl border-2 border-black bg-black text-white px-4 py-3 shadow-brutal">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60 mb-1">Scheduled for</div>
                <div className="text-sm font-bold leading-snug">
                  {formatScheduledPreview()}
                </div>
              </div>

              <label className="text-xs tracking-[0.2em] uppercase font-bold text-text-muted mb-3 block">Repeat Post</label>
              <div className="flex gap-2 flex-wrap mb-3">
                {['none', 'daily', 'weekly', 'monthly'].map(r => (
                  <button key={r} onClick={() => setRecurrence(r)} className={`px-4 py-2 rounded-full border-2 border-border font-medium text-sm shadow-brutalSoft ${recurrence === r ? 'bg-primary text-white border-primary' : 'bg-white'}`} data-testid={`recurrence-${r}`}>
                    {r === 'none' ? 'One-time' : r.charAt(0).toUpperCase() + r.slice(1)}
                  </button>
                ))}
                {canCustomRecurrence ? (
                  <button onClick={() => setRecurrence('custom')} className={`px-4 py-2 rounded-full border-2 border-border font-medium text-sm shadow-brutalSoft ${recurrence === 'custom' ? 'bg-primary text-white border-primary' : 'bg-white'}`} data-testid="recurrence-custom">
                    Custom
                  </button>
                ) : (
                  <button
                    onClick={() => setUpgradeModal({ open: true, message: "Upgrade to Pro or Business to set custom repeat intervals." })}
                    className="px-4 py-2 rounded-full border-2 border-dashed border-border font-medium text-sm text-text-muted flex items-center gap-1"
                    data-testid="recurrence-custom"
                  >
                    <Lock className="w-3 h-3" /> Custom (Pro)
                  </button>
                )}
              </div>
              {recurrence === 'custom' && (
                <div className="flex items-center gap-3 mb-4 p-3 bg-white border-2 border-primary rounded-xl">
                  <span className="text-sm font-bold text-text-muted">Every</span>
                  <input
                    type="number"
                    min={1}
                    max={999}
                    value={customInterval.value}
                    onChange={(e) => setCustomInterval(prev => ({ ...prev, value: Math.max(1, parseInt(e.target.value) || 1) }))}
                    className="brutal-input w-20 text-center font-black"
                  />
                  <select
                    value={customInterval.unit}
                    onChange={(e) => setCustomInterval(prev => ({ ...prev, unit: e.target.value }))}
                    className="brutal-input font-bold"
                  >
                    <option value="minutes">Minutes</option>
                    <option value="hours">Hours</option>
                    <option value="days">Days</option>
                  </select>
                  <span className="text-xs font-bold text-primary">{customInterval.value} {customInterval.unit}</span>
                </div>
              )}

              <label className="flex items-center gap-3 cursor-pointer" data-testid="auto-retry-toggle">
                <div className={`w-12 h-6 rounded-full border-2 border-border relative transition-colors ${autoRetry ? 'bg-primary' : 'bg-gray-200'}`} onClick={() => setAutoRetry(!autoRetry)}>
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white border border-border transition-transform ${autoRetry ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </div>
                <div>
                  <span className="font-medium text-sm">Auto-retry failed posts</span>
                  <span className="block text-xs text-text-muted">Retry up to 3 times with increasing delays</span>
                </div>
              </label>
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <button 
                onClick={() => createPost('draft')} 
                disabled={uploading || generating}
                className="brutal-button bg-white text-text-primary" 
                data-testid="save-draft-button"
              >
                Save Draft
              </button>
              <button 
                onClick={() => createPost('scheduled')} 
                disabled={uploading || generating}
                className="brutal-button bg-primary text-white flex-1 flex items-center justify-center gap-2" 
                data-testid="schedule-post-button"
              >
                {(uploading || generating) ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  (scheduledDate && scheduledClock)
                    ? (recurrence !== 'none'
                        ? recurrence === 'custom'
                          ? `Repeat Every ${customInterval.value} ${customInterval.unit}`
                          : `Schedule ${recurrence.charAt(0).toUpperCase() + recurrence.slice(1)}`
                        : 'Schedule Post')
                    : 'Publish Now'
                )}
              </button>
            </div>
          </div>

          {/* Right Panel: Preview OR writing guide */}
          {showPreview ? (
            <div className="lg:col-span-2 space-y-6">
              <div className="brutal-card p-6">
                <h2 className="text-2xl font-bold font-heading mb-4">Live Preview</h2>
                {content.trim() ? (
                  <PostPreview content={content} platforms={selectedPlatforms} />
                ) : (
                  <p className="text-center py-8 text-text-muted">Type content and select platforms to see previews</p>
                )}
              </div>
            </div>
          ) : (
            <div className="brutal-card p-6 bg-aiAccent" data-testid="writing-guide">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-11 w-11 rounded-full border-2 border-text-primary bg-white flex items-center justify-center">
                  <PenLine className="w-5 h-5 text-text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold font-heading">Write your post</h2>
                  <p className="text-sm text-text-secondary">A simple structure usually performs best.</p>
                </div>
              </div>
              <div className="space-y-3 text-sm">
                <div className="bg-white border-2 border-border rounded-xl p-4 flex items-start gap-3">
                  <Lightbulb className="w-5 h-5 mt-0.5 text-primary" />
                  <p>Start with a clear hook. Tell people why the post matters in the first line.</p>
                </div>
                <div className="bg-white border-2 border-border rounded-xl p-4 flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 mt-0.5 text-primary" />
                  <p>Keep the message focused. One post, one idea, one call to action.</p>
                </div>
                <div className="bg-white border-2 border-border rounded-xl p-4 flex items-start gap-3">
                  <Sparkles className="w-5 h-5 mt-0.5 text-primary" />
                  <p>Use your own voice. That keeps the content human and consistent.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      </div>
    </>
  );
}
