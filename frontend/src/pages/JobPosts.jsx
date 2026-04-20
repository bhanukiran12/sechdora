import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Briefcase, Plus, Trash2, Copy, Download, Lock, Sparkles } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import UpgradeModal from "@/components/UpgradeModal";

const API = "/api";

export default function JobPosts() {
  const [jobs, setJobs] = useState([]);
  const [planInfo, setPlanInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [upgradeModal, setUpgradeModal] = useState({ open: false, message: "" });
  const token = localStorage.getItem("access_token");

  const [form, setForm] = useState({
    title: "", company: "", location: "", description: "",
    requirements: "", salary: "", job_type: "Full-time",
  });

  const headers = { Authorization: `Bearer ${token}` };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const planRes = await axios.get(`${API}/user/plan`, { headers });
      setPlanInfo(planRes.data);

      if (planRes.data.plan?.jobPosting) {
        const jobsRes = await axios.get(`${API}/job-posts`, { headers });
        setJobs(jobsRes.data);
      }
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (typeof detail === "object" && detail?.upgrade) {
        setUpgradeModal({ open: true, message: detail.message });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!planInfo?.plan?.jobPosting) {
      setUpgradeModal({ open: true, message: "Upgrade to Pro or Business to create job posts." });
      return;
    }
    setCreating(true);
    try {
      const res = await axios.post(`${API}/job-posts`, {
        ...form,
        requirements: form.requirements.split("\n").filter(Boolean),
      }, { headers });
      setJobs([res.data, ...jobs]);
      setForm({ title: "", company: "", location: "", description: "", requirements: "", salary: "", job_type: "Full-time" });
      setShowForm(false);
      toast.success("Job post created!" + (planInfo?.plan?.aiEnabled ? " AI content generated." : ""));
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (typeof detail === "object" && detail?.upgrade) {
        setUpgradeModal({ open: true, message: detail.message });
      } else {
        toast.error(typeof detail === "string" ? detail : "Failed to create job post");
      }
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (jobId) => {
    try {
      await axios.delete(`${API}/job-posts/${jobId}`, { headers });
      setJobs(jobs.filter((j) => j.job_id !== jobId));
      toast.success("Job post deleted");
    } catch {
      toast.error("Failed to delete");
    }
  };

  const handleCopy = (content) => {
    navigator.clipboard.writeText(content);
    toast.success("Copied to clipboard!");
  };

  const handleExport = (job) => {
    if (!job.can_export) {
      setUpgradeModal({ open: true, message: "Upgrade to Business plan to export job posts." });
      return;
    }
    const blob = new Blob([job.generated_content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `job-${job.title.replace(/\s+/g, "-").toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Job post exported!");
  };

  const isLocked = planInfo && !planInfo.plan?.jobPosting;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar active="jobs" />

      <main className="flex-1 overflow-y-auto p-6 sm:p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-black tracking-tighter flex items-center gap-2">
                <Briefcase className="w-8 h-8" strokeWidth={3} />
                Job Posts
              </h1>
              <p className="text-text-secondary mt-1">
                {planInfo?.plan?.aiEnabled
                  ? "AI-powered job posts for social media"
                  : "Create job posts for social media"}
              </p>
            </div>
            {!isLocked && (
              <button
                onClick={() => setShowForm(!showForm)}
                className="brutal-button bg-primary text-white flex items-center gap-2 font-black"
              >
                <Plus className="w-5 h-5" strokeWidth={3} />
                New Job Post
              </button>
            )}
          </div>

          {/* Plan Badge */}
          {planInfo && (
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border-2 border-black font-bold text-sm mb-6 ${
              planInfo.planType === "business" ? "bg-primary text-white" :
              planInfo.planType === "pro" ? "bg-blue-100 text-blue-800" :
              "bg-gray-100 text-gray-700"
            }`}>
              {planInfo.plan?.aiEnabled && <Sparkles className="w-4 h-4" strokeWidth={3} />}
              {planInfo.planType.charAt(0).toUpperCase() + planInfo.planType.slice(1)} Plan
              {planInfo.plan?.aiEnabled && " · AI Enabled"}
            </div>
          )}

          {/* Locked State */}
          {isLocked && (
            <div className="border-4 border-black rounded-2xl p-12 text-center bg-white shadow-brutal">
              <Lock className="w-16 h-16 mx-auto mb-4 text-text-muted" />
              <h2 className="text-2xl font-black mb-2">Job Posts Locked</h2>
              <p className="text-text-secondary mb-6">
                Upgrade to Pro or Business plan to create and manage job posts.
              </p>
              <button
                onClick={() => setUpgradeModal({ open: true, message: "Upgrade to Pro or Business to access the Job Posts module." })}
                className="brutal-button bg-primary text-white font-black"
              >
                View Pricing Plans
              </button>
            </div>
          )}

          {/* Create Form */}
          {showForm && !isLocked && (
            <div className="border-4 border-black rounded-2xl p-6 bg-white shadow-brutal mb-8">
              <h2 className="text-xl font-black mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5" strokeWidth={3} />
                Create Job Post
                {planInfo?.plan?.aiEnabled && (
                  <span className="text-xs bg-yellow-200 border-2 border-yellow-500 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> AI
                  </span>
                )}
              </h2>
              <form onSubmit={handleCreate} className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest mb-1">Job Title *</label>
                  <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="brutal-input w-full" placeholder="e.g. Senior React Developer" />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest mb-1">Company *</label>
                  <input required value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })}
                    className="brutal-input w-full" placeholder="e.g. Acme Corp" />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest mb-1">Location</label>
                  <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}
                    className="brutal-input w-full" placeholder="e.g. Bangalore / Remote" />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest mb-1">Salary</label>
                  <input value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })}
                    className="brutal-input w-full" placeholder="e.g. ₹15-20 LPA" />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest mb-1">Job Type</label>
                  <select value={form.job_type} onChange={(e) => setForm({ ...form, job_type: e.target.value })}
                    className="brutal-input w-full">
                    {["Full-time", "Part-time", "Contract", "Internship", "Freelance"].map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-black uppercase tracking-widest mb-1">Description</label>
                  <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="brutal-input w-full" rows={3} placeholder="Brief job description..." />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-black uppercase tracking-widest mb-1">Requirements (one per line)</label>
                  <textarea value={form.requirements} onChange={(e) => setForm({ ...form, requirements: e.target.value })}
                    className="brutal-input w-full" rows={3} placeholder="3+ years React experience&#10;TypeScript proficiency&#10;Strong communication skills" />
                </div>
                <div className="sm:col-span-2 flex gap-3">
                  <button type="submit" disabled={creating}
                    className="brutal-button bg-primary text-white font-black flex items-center gap-2">
                    {creating ? "Generating..." : (planInfo?.plan?.aiEnabled ? "Generate with AI" : "Create Post")}
                    {planInfo?.plan?.aiEnabled && <Sparkles className="w-4 h-4" strokeWidth={3} />}
                  </button>
                  <button type="button" onClick={() => setShowForm(false)}
                    className="brutal-button bg-white text-text-primary font-bold">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Job Posts List */}
          {!isLocked && (
            <>
              {loading ? (
                <div className="text-center py-12 text-text-secondary font-bold animate-pulse">Loading...</div>
              ) : jobs.length === 0 ? (
                <div className="border-4 border-black rounded-2xl p-12 text-center bg-white shadow-brutal">
                  <Briefcase className="w-12 h-12 mx-auto mb-3 text-text-muted" />
                  <p className="font-black text-xl mb-2">No job posts yet</p>
                  <p className="text-text-secondary">Click "New Job Post" to create your first one.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {jobs.map((job) => (
                    <div key={job.job_id} className="border-4 border-black rounded-2xl p-5 bg-white shadow-brutal">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <h3 className="font-black text-lg">{job.title}</h3>
                          <p className="text-text-secondary text-sm font-bold">
                            {job.company} · {job.location || "Remote"} · {job.job_type}
                            {job.salary && ` · ${job.salary}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button onClick={() => handleCopy(job.generated_content)}
                            className="p-2 border-2 border-black rounded-lg hover:bg-black hover:text-white transition-colors" title="Copy">
                            <Copy className="w-4 h-4" strokeWidth={3} />
                          </button>
                          <button onClick={() => handleExport(job)}
                            className={`p-2 border-2 border-black rounded-lg transition-colors ${job.can_export ? "hover:bg-black hover:text-white" : "opacity-40"}`}
                            title={job.can_export ? "Export" : "Upgrade to export"}>
                            <Download className="w-4 h-4" strokeWidth={3} />
                          </button>
                          <button onClick={() => handleDelete(job.job_id)}
                            className="p-2 border-2 border-red-500 rounded-lg hover:bg-red-500 hover:text-white text-red-500 transition-colors" title="Delete">
                            <Trash2 className="w-4 h-4" strokeWidth={3} />
                          </button>
                        </div>
                      </div>
                      <div className="bg-surface border-2 border-black/10 rounded-xl p-4">
                        <p className="text-sm font-medium whitespace-pre-wrap leading-relaxed">{job.generated_content}</p>
                      </div>
                      {!job.can_export && (
                        <p className="text-xs text-text-muted mt-2 font-bold">
                          🔒 Upgrade to Business plan to export
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <UpgradeModal
        isOpen={upgradeModal.open}
        onClose={() => setUpgradeModal({ open: false, message: "" })}
        message={upgradeModal.message}
        feature="Job Posts"
      />
    </div>
  );
}
