import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { ArrowRight, Calendar, GraduationCap, BriefcaseBusiness, Sparkles as SparkleIcon, SkipForward, CheckCircle2, PencilLine, Clock3 } from "lucide-react";
import SchedoraLogo from "@/components/SchedoraLogo";

const API = `${process.env.REACT_APP_BACKEND_URL ?? "https://sechdora.onrender.com"}/api`;

const CREATOR_TYPES = [
  { id: "educator", label: "Educator", desc: "Online courses, tutorials, tips", icon: GraduationCap },
  { id: "creator", label: "Creator", desc: "Vlogs, content, entertainment", icon: SparkleIcon },
  { id: "business", label: "Business", desc: "Brand, product, services", icon: BriefcaseBusiness }
];

const PLATFORMS = [
  { id: "linkedin", label: "LinkedIn" },
  { id: "twitter", label: "Twitter (X)" },
  { id: "instagram", label: "Instagram", comingSoon: true },
  { id: "youtube", label: "YouTube", comingSoon: true },
  { id: "facebook", label: "Facebook", comingSoon: true }
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [creatorType, setCreatorType] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [postContent, setPostContent] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [saving, setSaving] = useState(false);

  const totalSteps = 5;

  // Set default scheduled time to tomorrow at 10 AM
  useEffect(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    setScheduledTime(tomorrow.toISOString().slice(0, 16));
  }, []);

  const togglePlatform = (id) => {
    if (PLATFORMS.find(p => p.id === id)?.comingSoon) return;
    setSelectedPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const savePreferences = async () => {
    try {
      const token = localStorage.getItem("access_token");
      await axios.post(
        `${API}/onboarding`,
        { creator_type: creatorType, preferred_platforms: selectedPlatforms },
        { headers: { Authorization: `Bearer ${token}` }, withCredentials: true }
      );
    } catch (e) {
      console.error("Onboarding save error:", e);
    }
  };

  const handleStep1Next = () => {
    if (!creatorType) {
      toast.error("Please select what you create");
      return;
    }
    if (selectedPlatforms.length === 0) {
      toast.error("Please select at least one platform");
      return;
    }
    savePreferences();
    setStep(2);
  };

  const handleConnectPlatform = (platformId) => {
    toast.info("Platform OAuth coming soon. Let’s draft your first post now.");
    setStep(3);
  };

  const scheduleFirstPost = async () => {
    if (!postContent.trim()) {
      toast.error("Write your post content first");
      return;
    }
    setSaving(true);
    try {
      const token = localStorage.getItem("access_token");
      await axios.post(
        `${API}/posts`,
        {
          content: postContent,
          platforms: selectedPlatforms,
          scheduled_time: scheduledTime || null,
          media_urls: [],
          status: scheduledTime ? "scheduled" : "draft"
        },
        { headers: { Authorization: `Bearer ${token}` }, withCredentials: true }
      );
      toast.success("Post scheduled!");
      setStep(5);
    } catch (e) {
      console.error("Schedule error:", e);
      toast.error("Failed to schedule. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col" data-testid="onboarding-container">
      {/* Progress bar */}
      <div className="w-full bg-surface border-b-2 border-border px-6 py-4">
        <div className="container mx-auto flex items-center justify-between">
          <div data-testid="onboarding-brand">
            <SchedoraLogo size="sm" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs tracking-[0.2em] uppercase font-bold text-text-muted">
              Step {Math.min(step, totalSteps)} / {totalSteps}
            </span>
            <span className="text-xs text-text-muted">
              {step <= 2 ? "~2 minutes left" : step <= 4 ? "Almost done" : ""}
            </span>
          </div>
        </div>
        <div className="container mx-auto mt-3">
          <div className="w-full h-2 bg-white border border-border rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-200 rounded-full"
              style={{ width: `${(Math.min(step, totalSteps) / totalSteps) * 100}%` }}
              data-testid="progress-bar"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-2xl">
          {/* ========== STEP 1: Personalize ========== */}
          {step === 1 && (
            <div className="space-y-8 animate-in fade-in duration-150" data-testid="onboarding-step-1">
              <div>
                <h2 className="text-4xl sm:text-5xl font-black font-heading tracking-tighter mb-3">
                  Welcome to Schedora
                </h2>
                <p className="text-base text-text-secondary">Let's set up your account in 2 minutes.</p>
              </div>

              {/* Creator type */}
              <div>
                <label className="text-xs tracking-[0.2em] uppercase font-bold text-text-muted mb-3 block">
                  What do you create?
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {CREATOR_TYPES.map((type) => {
                    const Icon = type.icon;
                    return (
                      <button
                        key={type.id}
                        onClick={() => setCreatorType(type.id)}
                        className={`brutal-card p-5 text-left transition-all ${
                          creatorType === type.id
                            ? "bg-primary text-text-primary shadow-brutal-hover translate-x-[1px] translate-y-[1px] ring-2 ring-text-primary"
                            : "brutal-card-hover"
                        }`}
                        data-testid={`creator-type-${type.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`h-11 w-11 rounded-full border-2 border-text-primary flex items-center justify-center ${creatorType === type.id ? "bg-white" : "bg-pastel-blue"}`}>
                            <Icon className="h-5 w-5 text-text-primary" />
                          </div>
                          <div>
                            <div className="font-bold text-lg leading-none">{type.label}</div>
                            <div className={`text-xs mt-1 ${creatorType === type.id ? "text-text-primary/80" : "text-text-muted"}`}>
                              {type.desc}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Platforms */}
              <div>
                <label className="text-xs tracking-[0.2em] uppercase font-bold text-text-muted mb-3 block">
                  Where do you post?
                </label>
                <div className="flex flex-wrap gap-3">
                  {PLATFORMS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => togglePlatform(p.id)}
                      disabled={p.comingSoon}
                      className={`px-5 py-3 rounded-xl border-2 border-border font-bold transition-all flex flex-col items-center ${
                        p.comingSoon ? "bg-gray-100 opacity-60 grayscale cursor-not-allowed" :
                        selectedPlatforms.includes(p.id)
                          ? "bg-primary text-white shadow-brutal"
                          : "bg-white text-text-primary hover:shadow-brutal-hover"
                      }`}
                      data-testid={`platform-select-${p.id}`}
                    >
                      <span>{p.label}</span>
                      {p.comingSoon && <span className="text-[10px] font-black tracking-widest uppercase">Soon</span>}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleStep1Next}
                className="brutal-button bg-primary text-white text-lg w-full flex items-center justify-center gap-2"
                data-testid="step1-continue"
              >
                Continue <ArrowRight className="w-5 h-5" />
              </button>

              <button
                onClick={() => { savePreferences(); navigate("/dashboard"); }}
                className="w-full text-center text-sm font-medium text-text-muted hover:text-text-primary transition-colors inline-flex items-center justify-center gap-2"
                data-testid="skip-onboarding"
              >
                <SkipForward className="w-4 h-4" />
                Skip for now
              </button>
            </div>
          )}

          {/* ========== STEP 2: Connect Account ========== */}
          {step === 2 && (
            <div className="space-y-8 animate-in fade-in duration-150" data-testid="onboarding-step-2">
              <div>
                <h2 className="text-4xl sm:text-5xl font-black font-heading tracking-tighter mb-3">
                  Connect Your First Platform
                </h2>
                <p className="text-base text-text-secondary">Start scheduling to your favourite platform.</p>
              </div>

              <div className="space-y-4">
                {selectedPlatforms.map((pid) => {
                  const platform = PLATFORMS.find((p) => p.id === pid);
                  return (
                    <button
                      key={pid}
                      onClick={() => handleConnectPlatform(pid)}
                    className="w-full brutal-card p-6 flex items-center justify-between brutal-card-hover transition-all duration-150"
                      data-testid={`connect-${pid}`}
                    >
                      <span className="font-bold text-lg">Start scheduling to {platform?.label}</span>
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setStep(3)}
                className="w-full text-center text-sm text-text-muted hover:text-text-primary transition-colors"
                data-testid="skip-connect"
              >
                Skip — I'll connect later
              </button>
            </div>
          )}

          {/* ========== STEP 3: Create First Post (AHA MOMENT) ========== */}
          {step === 3 && (
            <div className="space-y-6 animate-in fade-in duration-150" data-testid="onboarding-step-3">
              <div>
                <h2 className="text-4xl sm:text-5xl font-black font-heading tracking-tighter mb-3">
                  Create Your First Post
                </h2>
                <p className="text-base text-text-secondary">Write your first post in your own voice.</p>
              </div>

              <div className="brutal-card p-6 bg-aiAccent">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-11 w-11 rounded-full border-2 border-text-primary bg-white flex items-center justify-center">
                    <PencilLine className="w-5 h-5 text-text-primary" />
                  </div>
                  <div>
                    <div className="font-bold text-lg">Draft manually</div>
                    <div className="text-xs text-text-secondary">No generator, no extra steps. Just start writing.</div>
                  </div>
                </div>
                <label className="text-xs tracking-[0.2em] uppercase font-bold mb-3 block">
                  Your post
                </label>
                <textarea
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  rows={6}
                  placeholder="Write a post that sounds like you. Share a tip, announcement, story, or update..."
                  className="brutal-input w-full resize-none"
                  data-testid="onboarding-post-content"
                />
                <div className="mt-3 flex items-center gap-2 text-xs text-text-secondary">
                  <Clock3 className="w-3.5 h-3.5" />
                  Keep it simple: one idea, one clear message, one next step.
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex gap-4">
                  <button onClick={() => setStep(2)} className="brutal-button bg-white text-text-primary">
                    Back
                  </button>
                  <button 
                    onClick={() => postContent.trim() ? setStep(4) : toast.error("Write your post first")} 
                    className="brutal-button bg-primary text-white flex-1 flex items-center justify-center gap-2" 
                    data-testid="step3-next"
                  >
                    Next: Schedule <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
                <button 
                  onClick={() => setStep(6)} 
                  className="text-sm font-bold text-text-muted hover:text-text-primary transition-colors text-center mt-2"
                >
                  Skip this step — I'll create my first post later
                </button>
              </div>
            </div>
          )}

          {/* ========== STEP 4: Schedule ========== */}
          {step === 4 && (
            <div className="space-y-8 animate-in fade-in duration-150" data-testid="onboarding-step-4">
              <div>
                <h2 className="text-4xl sm:text-5xl font-black font-heading tracking-tighter mb-3">
                  Schedule Your Post
                </h2>
                <p className="text-base text-text-secondary">
                  Pick the best time. We recommend <strong>tomorrow at 10 AM</strong> — that's when your audience is most active.
                </p>
              </div>

              {/* Preview */}
              <div className="brutal-card p-6">
                <label className="text-xs tracking-[0.2em] uppercase font-bold text-text-muted mb-3 block">
                  Post Preview
                </label>
                <p className="text-sm mb-3">{postContent}</p>
                <div className="flex gap-2">
                  {selectedPlatforms.map((p) => (
                    <span key={p} className="text-xs tracking-[0.2em] uppercase font-bold bg-pastel-yellow px-2 py-1 border border-border rounded-xl">
                      {p}
                    </span>
                  ))}
                </div>
              </div>

              {/* Time picker */}
              <div className="brutal-card p-6">
                <label className="text-xs tracking-[0.2em] uppercase font-bold text-text-muted mb-3 block">
                  When should we publish?
                </label>
                <input
                  type="datetime-local"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="brutal-input w-full"
                  data-testid="onboarding-schedule-time"
                />
                <p className="text-xs text-text-muted mt-2">
                  <Calendar className="w-3 h-3 inline mr-1" />
                  Best times: 9–11 AM on weekdays, 10 AM–2 PM on weekends
                </p>
              </div>

              <div className="flex gap-4">
                <button onClick={() => setStep(3)} className="brutal-button bg-white text-text-primary">
                  Back
                </button>
                <button
                  onClick={scheduleFirstPost}
                  disabled={saving}
                  className="brutal-button bg-primary text-white flex-1 text-lg"
                  data-testid="schedule-first-post"
                >
                  {saving ? "Scheduling..." : "Schedule Post"}
                </button>
              </div>
            </div>
          )}

          {/* ========== STEP 5: Success ========== */}
          {step === 5 && (
            <div className="space-y-8 text-center animate-in fade-in duration-150" data-testid="onboarding-step-5">
              <div className="brutal-card p-10 bg-aiAccent inline-block mx-auto">
                <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-text-primary" />
                <h2 className="text-4xl sm:text-5xl font-black font-heading tracking-tighter mb-3">
                  Your First Post is Scheduled!
                </h2>
                <p className="text-lg text-text-secondary mb-2">
                  It will go live at {scheduledTime ? new Date(scheduledTime).toLocaleString() : "the scheduled time"}.
                </p>
                <div className="flex gap-2 justify-center mt-4">
                  {selectedPlatforms.map((p) => (
                    <span key={p} className="text-xs tracking-[0.2em] uppercase font-bold bg-white px-3 py-1 border-2 border-border rounded-xl">
                      {p}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 max-w-md mx-auto">
                <button
                  onClick={() => navigate("/dashboard")}
                  className="brutal-button bg-primary text-white"
                  data-testid="go-to-dashboard"
                >
                  Go to Dashboard
                </button>
                <button
                  onClick={() => navigate("/posts/new")}
                  className="brutal-button bg-white text-text-primary"
                  data-testid="create-another-post"
                >
                  Create Another Post
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
