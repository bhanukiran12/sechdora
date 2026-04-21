import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Briefcase, Plus, Trash2, Copy, Download, Lock, Sparkles, Search, Send, Users, Calendar, Loader2 } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import UpgradeModal from "@/components/UpgradeModal";

const BACKEND_URL = "/api";
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
    skills: [], skillInput: "", salary: "", job_type: "Full-time",
  });

  // Lead outreach state
  const [leadsModalOpen, setLeadsModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [leads, setLeads] = useState([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [selectedLeads, setSelectedLeads] = useState([]);
  const [sendingOutreach, setSendingOutreach] = useState(false);
  const [outreachStats, setOutreachStats] = useState(null);

  const fetchAll = useCallback(async () => {
    const authHeaders = { Authorization: `Bearer ${token}` };
    setLoading(true);
    try {
      const planRes = await axios.get(`${API}/user/plan`, { headers: authHeaders });
      setPlanInfo(planRes.data);

      if (planRes.data.plan?.jobPosting) {
        const [jobsRes, statsRes] = await Promise.all([
          axios.get(`${API}/job-posts`, { headers: authHeaders }),
          planRes.data.plan?.jobExport ? axios.get(`${API}/job-posts/outreach/stats`, { headers: authHeaders }) : null
        ]);
        setJobs(jobsRes.data);
        if (statsRes?.data) setOutreachStats(statsRes.data);
      }
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (typeof detail === "object" && detail?.upgrade) {
        setUpgradeModal({ open: true, message: detail.message });
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  const headers = { Authorization: `Bearer ${token}` };

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
        title: form.title,
        company: form.company,
        location: form.location,
        description: form.description,
        requirements: form.skills,
        salary: form.salary,
        job_type: form.job_type,
      }, { headers });
      setJobs([res.data, ...jobs]);
      setForm({ title: "", company: "", location: "", description: "", skills: [], skillInput: "", salary: "", job_type: "Full-time" });
      setShowForm(false);
      toast.success("Job post created!" + (planInfo?.plan?.aiEnabled ? " AI content generated." : ""));
      // Refresh outreach stats if business
      if (planInfo?.plan?.jobExport) {
        const statsRes = await axios.get(`${API}/job-posts/outreach/stats`, { headers });
        setOutreachStats(statsRes.data);
      }
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

  const handleFindLeads = async (job) => {
    if (!planInfo?.plan?.jobExport) {
      setUpgradeModal({ open: true, message: "Upgrade to Business plan to find and outreach candidates." });
      return;
    }
    setSelectedJob(job);
    setLeadsModalOpen(true);
    setLeadsLoading(true);
    setSelectedLeads([]);
    try {
      const res = await axios.get(`${API}/job-posts/${job.job_id}/leads`, { headers });
      setLeads(res.data.leads);
    } catch (err) {
      toast.error("Failed to load leads");
      setLeadsModalOpen(false);
    } finally {
      setLeadsLoading(false);
    }
  };

  const handleSendOutreach = async () => {
    if (selectedLeads.length === 0) {
      toast.error("Select at least one candidate");
      return;
    }
    if (!window.confirm(`Send this job to ${selectedLeads.length} candidate(s)? This will use 10 tokens.`)) {
      return;
    }
    setSendingOutreach(true);
    try {
      const res = await axios.post(`${API}/job-posts/${selectedJob.job_id}/send-outreach`, {
        lead_ids: selectedLeads
      }, { headers });
      toast.success(res.data.message);
      setLeadsModalOpen(false);
      // Refresh stats
      const statsRes = await axios.get(`${API}/job-posts/outreach/stats`, { headers });
      setOutreachStats(statsRes.data);
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (detail?.includes("Daily outreach limit")) {
        toast.error("Daily limit reached. Try again tomorrow.");
      } else if (detail?.includes("Not enough credits")) {
        setUpgradeModal({ open: true, message: "Not enough credits to send outreach. Buy more tokens or upgrade." });
      } else {
        toast.error(typeof detail === "string" ? detail : "Failed to send outreach");
      }
    } finally {
      setSendingOutreach(false);
    }
  };

  const toggleLeadSelection = (leadId) => {
    setSelectedLeads(prev =>
      prev.includes(leadId) ? prev.filter(id => id !== leadId) : [...prev, leadId]
    );
  };

  const handleExport = async (job) => {
    if (!planInfo?.plan?.jobExport) {
      setUpgradeModal({ open: true, message: "Upgrade to Business plan to export job posts." });
      return;
    }
    try {
      const res = await axios.post(`${API}/job-posts/${job.job_id}/export`, {}, { headers });
      const { content, title } = res.data;
      const blob = new Blob([content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `job-${title.replace(/\s+/g, "-").toLowerCase()}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported! ${res.data.tokens_used} tokens used.`);
      // Refresh job list (in case tokens ran out)
      fetchAll();
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (typeof detail === "object" && detail?.upgrade) {
        setUpgradeModal({ open: true, message: detail.message });
      } else {
        toast.error(typeof detail === "string" ? detail : "Export failed");
      }
    }
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
              {(planInfo.planType || 'free').charAt(0).toUpperCase() + (planInfo.planType || 'free').slice(1)} Plan
              {planInfo.plan?.aiEnabled && " · AI Enabled"}
            </div>
          )}

          {/* Outreach Stats (Business only) */}
          {planInfo?.plan?.jobExport && outreachStats && (
            <div className="inline-flex items-center gap-4 px-4 py-2 rounded-full border-2 border-black font-bold text-sm mb-6 bg-green-50">
              <Users className="w-4 h-4" strokeWidth={3} />
              <span>Outreach: {outreachStats.sent_today}/{outreachStats.daily_cap} used today</span>
              {outreachStats.remaining_today > 0 ? (
                <span className="text-green-700">· {outreachStats.remaining_today} remaining</span>
              ) : (
                <span className="text-red-600">· Limit reached</span>
              )}
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
                   <label className="block text-xs font-black uppercase tracking-widest mb-1">Skills (tags)</label>
                   <div className="flex flex-wrap gap-2 mb-2">
                     {form.skills.map((skill, idx) => (
                       <span key={idx} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 border-2 border-black rounded-full font-bold text-sm">
                         {skill}
                         <button type="button" onClick={() => setForm({ ...form, skills: form.skills.filter((_, i) => i !== idx) })} className="text-red-600 hover:bg-black hover:text-white rounded-full p-0.5">
                           ×
                         </button>
                       </span>
                     ))}
                   </div>
                   <div className="flex gap-2">
                     <input
                       value={form.skillInput || ""}
                       onChange={(e) => setForm({ ...form, skillInput: e.target.value })}
                       onKeyDown={(e) => {
                         if (e.key === "Enter") {
                           e.preventDefault();
                           const val = e.target.value.trim();
                           if (val && !form.skills.includes(val)) {
                             setForm({ ...form, skills: [...form.skills, val] });
                             setForm({ ...form, skillInput: "" });
                           }
                         }
                       }}
                       className="brutal-input flex-1"
                       placeholder="Type a skill and press Enter"
                     />
                     <button type="button" onClick={() => {
                       const val = form.skillInput?.trim();
                       if (val && !form.skills.includes(val)) {
                         setForm({ ...form, skills: [...form.skills, val], skillInput: "" });
                       }
                     }} className="brutal-button bg-blue-600 text-white font-black px-4">
                       Add
                     </button>
                   </div>
                 </div>
                 <div className="sm:col-span-2">
                   <label className="block text-xs font-black uppercase tracking-widest mb-1">Job Description</label>
                   <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                     className="brutal-input w-full" rows={3} placeholder="Brief job description..." />
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
                             className={`p-2 border-2 border-black rounded-lg transition-colors ${planInfo?.plan?.jobExport ? "hover:bg-black hover:text-white" : "opacity-40"}`}
                             title={planInfo?.plan?.jobExport ? "Export" : "Upgrade to export"}>
                             <Download className="w-4 h-4" strokeWidth={3} />
                           </button>
                           {planInfo?.plan?.jobExport && (
                             <button onClick={() => handleFindLeads(job)}
                               className="p-2 border-2 border-black rounded-lg hover:bg-black hover:text-white transition-colors bg-blue-50"
                               title="Find candidates">
                               <Search className="w-4 h-4" strokeWidth={3} />
                           </button>
                           )}
                           <button onClick={() => handleDelete(job.job_id)}
                             className="p-2 border-2 border-red-500 rounded-lg hover:bg-red-500 hover:text-white text-red-500 transition-colors" title="Delete">
                             <Trash2 className="w-4 h-4" strokeWidth={3} />
                           </button>
                         </div>
                       </div>
                      <div className="bg-surface border-2 border-black/10 rounded-xl p-4">
                        <p className="text-sm font-medium whitespace-pre-wrap leading-relaxed">{job.generated_content}</p>
                       </div>
                       {!planInfo?.plan?.jobExport && (
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

      {/* Leads Selection Modal */}
      {leadsModalOpen && selectedJob && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white border-4 border-black rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-brutal-lg">
            <div className="p-6 border-b-4 border-black bg-primary text-white">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black flex items-center gap-2">
                  <Search className="w-6 h-6" strokeWidth={3} />
                  Find Candidates for {selectedJob.title}
                </h2>
                <button onClick={() => setLeadsModalOpen(false)} className="text-white hover:underline font-bold">Close</button>
              </div>
              <p className="text-sm mt-1 text-white/80">{selectedJob.company} · {selectedJob.location || "Remote"}</p>
            </div>

            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {leadsLoading ? (
                <div className="flex items-center justify-center py-12 gap-3">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span className="font-bold">Finding matching candidates...</span>
                </div>
              ) : (
                <>
                  <p className="text-sm text-text-secondary mb-4 font-bold">
                    Select candidates to send this job to. <span className="text-primary font-black">Cost: 10 tokens</span> per batch (any number of leads).
                    {outreachStats && <span className="block mt-1">Daily cap: {outreachStats.sent_today}/{outreachStats.daily_cap} used.</span>}
                  </p>
                  <div className="space-y-2">
                    {leads.map((lead) => (
                      <label key={lead.id} className={`flex items-start gap-3 p-3 border-2 border-black rounded-xl cursor-pointer transition-colors ${selectedLeads.includes(lead.id) ? "bg-primary text-white" : "hover:bg-surface"}`}>
                        <input
                          type="checkbox"
                          checked={selectedLeads.includes(lead.id)}
                          onChange={() => toggleLeadSelection(lead.id)}
                          className="mt-1 w-5 h-5 accent-black border-black"
                        />
                        <div className="flex-1">
                          <div className="font-black flex items-center gap-2">
                            {lead.name}
                            <span className={`text-xs px-2 py-0.5 rounded-full ${selectedLeads.includes(lead.id) ? "bg-white text-black" : "bg-black text-white"}`}>
                              {lead.match_score}% match
                            </span>
                          </div>
                          <p className={`text-sm font-bold ${selectedLeads.includes(lead.id) ? "text-white/90" : "text-text-secondary"}`}>{lead.title} · {lead.location}</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {lead.skills.map((s, i) => (
                              <span key={i} className={`text-xs px-2 py-0.5 rounded-full border ${selectedLeads.includes(lead.id) ? "border-white/30 text-white" : "border-black/20"}`}>{s}</span>
                            ))}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="p-6 border-t-4 border-black bg-surface flex items-center justify-between">
              <div className="text-sm font-bold">
                {selectedLeads.length} lead(s) selected
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setLeadsModalOpen(false)}
                  className="brutal-button bg-white text-text-primary font-black"
                  disabled={sendingOutreach}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendOutreach}
                  disabled={sendingOutreach || selectedLeads.length === 0}
                  className="brutal-button bg-primary text-white font-black flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sendingOutreach ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" strokeWidth={3} />
                      Send to {selectedLeads.length}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <UpgradeModal
        isOpen={upgradeModal.open}
        onClose={() => setUpgradeModal({ open: false, message: "" })}
        message={upgradeModal.message}
        feature="Job Posts"
      />
    </div>
  );
}
