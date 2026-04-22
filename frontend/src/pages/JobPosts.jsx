import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { toast } from "sonner";
import {
  Briefcase,
  Plus,
  Trash2,
  Copy,
  Download,
  Lock,
  Sparkles,
  Search,
  Loader2,
  Pencil,
  FileSpreadsheet,
  RefreshCw,
  Users,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import UpgradeModal from "@/components/UpgradeModal";

const API = "/api";
const OUTREACH_BATCH_COST = 10;

const createEmptyJobForm = () => ({
  title: "",
  company: "",
  location: "",
  description: "",
  skills: [],
  skillInput: "",
  salary: "",
  job_type: "Full-time",
});

const createManualBulkRow = () => ({
  title: "",
  company: "",
  location: "",
  description: "",
  requirements: [],
  requirementInput: "",
  salary: "",
  job_type: "Full-time",
});

const JOB_TYPES = ["Full-time", "Part-time", "Contract", "Internship", "Freelance"];

function parseCsvLine(line) {
  const cells = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];
    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      i += 1;
      continue;
    }
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }

  cells.push(current.trim());
  return cells;
}

function csvToJobs(text) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map((header) => header.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || "";
    });
    return {
      title: row.title || "",
      company: row.company || "",
      location: row.location || "",
      description: row.description || "",
      requirements: (row.requirements || row.skills || "")
        .split(/[;,]/)
        .map((item) => item.trim())
        .filter(Boolean),
      salary: row.salary || "",
      job_type: row.job_type || "Full-time",
    };
  });
}

function normalizeJobPayload(form) {
  return {
    title: form.title.trim(),
    company: form.company.trim(),
    location: form.location.trim(),
    description: form.description.trim(),
    requirements: (form.skills || form.requirements || []).map((item) => item.trim()).filter(Boolean),
    salary: form.salary.trim(),
    job_type: form.job_type.trim(),
  };
}

function validateJobPayload(payload) {
  const requiredFields = ["title", "company", "location", "description", "salary", "job_type"];
  const missing = requiredFields.filter((field) => !payload[field]);
  if (missing.length > 0) {
    return `Missing required fields: ${missing.join(", ").replaceAll("_", " ")}`;
  }
  if (!payload.requirements || payload.requirements.length === 0) {
    return "At least one skill is required";
  }
  return null;
}

export default function JobPosts() {
  const token = localStorage.getItem("access_token");
  const headers = { Authorization: `Bearer ${token}` };
  const pollRef = useRef(null);

  const [jobs, setJobs] = useState([]);
  const [planInfo, setPlanInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingJobId, setEditingJobId] = useState(null);
  const [showBulkPanel, setShowBulkPanel] = useState(false);
  const [bulkMode, setBulkMode] = useState("manual");
  const [bulkRows, setBulkRows] = useState([createManualBulkRow(), createManualBulkRow()]);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkCsvName, setBulkCsvName] = useState("");
  const [upgradeModal, setUpgradeModal] = useState({ open: false, message: "" });

  const [form, setForm] = useState(createEmptyJobForm());

  const [leadsModalOpen, setLeadsModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [leads, setLeads] = useState([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [selectedLeads, setSelectedLeads] = useState([]);
  const [sendingOutreach, setSendingOutreach] = useState(false);
  const [outreachStats, setOutreachStats] = useState(null);

  const fetchAll = useCallback(async (silent = false) => {
    if (!token) return;
    const authHeaders = { Authorization: `Bearer ${token}` };
    if (!silent) setLoading(true);
    try {
      const planRes = await axios.get(`${API}/user/plan`, { headers: authHeaders });
      setPlanInfo(planRes.data);

      if (planRes.data.plan?.jobPosting) {
        const requests = [
          axios.get(`${API}/job-posts`, { headers: authHeaders }),
        ];
        if (planRes.data.plan?.jobExport) {
          requests.push(axios.get(`${API}/job-posts/outreach/stats`, { headers: authHeaders }));
        }
        const [jobsRes, statsRes] = await Promise.all(requests);
        setJobs(jobsRes.data);
        setOutreachStats(statsRes?.data || null);
      }
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (!silent) {
        if (typeof detail === "object" && detail?.upgrade) {
          setUpgradeModal({ open: true, message: detail.message });
        } else if (typeof detail === "string") {
          toast.error(detail);
        }
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    const refresh = () => fetchAll(true);
    pollRef.current = window.setInterval(refresh, 15000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [fetchAll]);

  const resetForm = () => {
    setForm(createEmptyJobForm());
    setEditingJobId(null);
    setShowForm(false);
  };

  const submitJob = async (payload, existingJobId = null) => {
    if (existingJobId) {
      const res = await axios.put(`${API}/job-posts/${existingJobId}`, payload, { headers });
      setJobs((prev) => prev.map((job) => (job.job_id === existingJobId ? res.data : job)));
      return res.data;
    }
    const res = await axios.post(`${API}/job-posts`, payload, { headers });
    setJobs((prev) => [res.data, ...prev]);
    return res.data;
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!planInfo?.plan?.jobPosting) {
      setUpgradeModal({ open: true, message: "Upgrade to Pro or Business to create job posts." });
      return;
    }

    const payload = normalizeJobPayload(form);
    const validationError = validateJobPayload(payload);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setCreating(true);
    try {
      const createdJob = await submitJob(payload, editingJobId);
      resetForm();
      await fetchAll(true);
      toast.success(
        editingJobId
          ? "Job post updated."
          : `Job post created${planInfo?.plan?.aiEnabled ? " with AI content." : "."}`
      );
      if (!editingJobId && createdJob) {
        setSelectedJob(createdJob);
      }
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (typeof detail === "object" && detail?.upgrade) {
        setUpgradeModal({ open: true, message: detail.message });
      } else {
        toast.error(typeof detail === "string" ? detail : "Failed to save job post");
      }
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (job) => {
    setEditingJobId(job.job_id);
    setForm({
      title: job.title || "",
      company: job.company || "",
      location: job.location || "",
      description: job.description || "",
      skills: job.requirements || [],
      skillInput: "",
      salary: job.salary || "",
      job_type: job.job_type || "Full-time",
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (jobId) => {
    try {
      await axios.delete(`${API}/job-posts/${jobId}`, { headers });
      setJobs((prev) => prev.filter((job) => job.job_id !== jobId));
      toast.success("Job post deleted");
    } catch {
      toast.error("Failed to delete");
    }
  };

  const handleCopy = (content) => {
    navigator.clipboard.writeText(content || "");
    toast.success("Copied to clipboard");
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
    } catch {
      toast.error("Failed to load candidates");
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

    setSendingOutreach(true);
    try {
      const res = await axios.post(
        `${API}/job-posts/${selectedJob.job_id}/send-outreach`,
        { lead_ids: selectedLeads },
        { headers }
      );
      toast.success(res.data.message);
      setLeadsModalOpen(false);
      await fetchAll(true);
    } catch (err) {
      const detail = err.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Failed to send outreach");
    } finally {
      setSendingOutreach(false);
    }
  };

  const handleExport = async (job) => {
    if (!planInfo?.plan?.jobExport) {
      setUpgradeModal({ open: true, message: "Upgrade to Business plan to export job posts." });
      return;
    }
    try {
      const res = await axios.post(`${API}/job-posts/${job.job_id}/export`, {}, { headers });
      const blob = new Blob([res.data.content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `job-${job.title.replace(/\s+/g, "-").toLowerCase()}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported. ${res.data.tokens_used} credits used.`);
      await fetchAll(true);
    } catch (err) {
      const detail = err.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Export failed");
    }
  };

  const addSkillToForm = () => {
    const value = form.skillInput.trim();
    if (!value || form.skills.includes(value)) return;
    setForm((prev) => ({ ...prev, skills: [...prev.skills, value], skillInput: "" }));
  };

  const updateBulkRow = (index, patch) => {
    setBulkRows((prev) => prev.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
  };

  const addBulkRowSkill = (index) => {
    const row = bulkRows[index];
    const value = row.requirementInput.trim();
    if (!value || row.requirements.includes(value)) return;
    updateBulkRow(index, { requirements: [...row.requirements, value], requirementInput: "" });
  };

  const submitBulkRows = async () => {
    const jobsToCreate = bulkRows
      .map((row) => normalizeJobPayload(row))
      .filter((row) => Object.values(row).some((value) => (Array.isArray(value) ? value.length > 0 : value)));

    if (jobsToCreate.length === 0) {
      toast.error("Add at least one job post to bulk create");
      return;
    }

    const firstError = jobsToCreate.map(validateJobPayload).find(Boolean);
    if (firstError) {
      toast.error(firstError);
      return;
    }

    setBulkUploading(true);
    try {
      const res = await axios.post(`${API}/job-posts/bulk-create`, { jobs: jobsToCreate }, { headers });
      if (res.data.success > 0) {
        toast.success(`${res.data.success} job posts created`);
        setBulkRows([createManualBulkRow(), createManualBulkRow()]);
        await fetchAll(true);
      }
      if (res.data.errors?.length) {
        toast.error(res.data.errors[0]);
      }
    } catch (err) {
      const detail = err.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Bulk create failed");
    } finally {
      setBulkUploading(false);
    }
  };

  const handleCsvUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setBulkCsvName(file.name);
    try {
      const text = await file.text();
      const jobsFromCsv = csvToJobs(text);
      if (jobsFromCsv.length === 0) {
        toast.error("CSV has no usable rows");
        return;
      }
      setBulkUploading(true);
      const res = await axios.post(`${API}/job-posts/bulk-create`, { jobs: jobsFromCsv }, { headers });
      if (res.data.success > 0) {
        toast.success(`${res.data.success} job posts created from CSV`);
        await fetchAll(true);
      }
      if (res.data.errors?.length) {
        toast.error(res.data.errors[0]);
      }
    } catch {
      toast.error("Failed to import CSV");
    } finally {
      setBulkUploading(false);
      event.target.value = "";
    }
  };

  const toggleLeadSelection = (leadId) => {
    setSelectedLeads((prev) => (
      prev.includes(leadId) ? prev.filter((id) => id !== leadId) : [...prev, leadId]
    ));
  };

  const isLocked = planInfo && !planInfo.plan?.jobPosting;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar active="jobs" />

      <main className="flex-1 overflow-y-auto p-6 sm:p-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8 flex items-center justify-between gap-4">
            <div>
              <h1 className="flex items-center gap-2 text-3xl font-black tracking-tighter">
                <Briefcase className="h-8 w-8" strokeWidth={3} />
                Job Posts
              </h1>
              <p className="mt-1 text-text-secondary">
                Create, edit, bulk import, and turn job posts into outreach workflows.
              </p>
            </div>
            {!isLocked && (
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    resetForm();
                    setShowForm((prev) => !prev);
                  }}
                  className="brutal-button bg-primary text-white flex items-center gap-2 font-black"
                >
                  <Plus className="w-5 h-5" strokeWidth={3} />
                  {showForm && !editingJobId ? "Hide Form" : "New Job Post"}
                </button>
                <button
                  onClick={() => setShowBulkPanel((prev) => !prev)}
                  className="brutal-button bg-white text-text-primary flex items-center gap-2 font-black"
                >
                  <FileSpreadsheet className="w-5 h-5" strokeWidth={3} />
                  Bulk Import
                </button>
                <button
                  onClick={() => fetchAll(true)}
                  className="brutal-button bg-white text-text-primary flex items-center gap-2 font-black"
                >
                  <RefreshCw className="w-5 h-5" strokeWidth={3} />
                  Refresh
                </button>
              </div>
            )}
          </div>

          {planInfo && (
            <div className="mb-6 flex flex-wrap items-center gap-3">
              <div className={`inline-flex items-center gap-2 rounded-full border-2 border-black px-4 py-2 text-sm font-bold ${
                planInfo.planType === "business" ? "bg-primary text-white" :
                planInfo.planType === "pro" ? "bg-blue-100 text-blue-800" :
                "bg-gray-100 text-gray-700"
              }`}>
                {planInfo.plan?.aiEnabled && <Sparkles className="w-4 h-4" strokeWidth={3} />}
                {(planInfo.planType || "free").toUpperCase()} PLAN
              </div>
              {planInfo.plan?.jobExport && outreachStats && (
                <div className="inline-flex items-center gap-2 rounded-full border-2 border-black bg-green-50 px-4 py-2 text-sm font-bold">
                  <Users className="w-4 h-4" strokeWidth={3} />
                  Outreach credits: {outreachStats.sent_today}/{outreachStats.daily_cap} batches used today
                </div>
              )}
            </div>
          )}

          {isLocked && (
            <div className="border-4 border-black rounded-2xl bg-white p-12 text-center shadow-brutal">
              <Lock className="mx-auto mb-4 h-16 w-16 text-text-muted" />
              <h2 className="mb-2 text-2xl font-black">Job Posts Locked</h2>
              <p className="mb-6 text-text-secondary">
                Upgrade to Pro or Business to create and manage job posts.
              </p>
              <button
                onClick={() => setUpgradeModal({ open: true, message: "Upgrade to Pro or Business to access Job Posts." })}
                className="brutal-button bg-primary text-white font-black"
              >
                View Pricing Plans
              </button>
            </div>
          )}

          {showForm && !isLocked && (
            <div className="mb-8 rounded-2xl border-4 border-black bg-white p-6 shadow-brutal">
              <h2 className="mb-4 flex items-center gap-2 text-xl font-black">
                {editingJobId ? <Pencil className="w-5 h-5" strokeWidth={3} /> : <Plus className="w-5 h-5" strokeWidth={3} />}
                {editingJobId ? "Edit Job Post" : "Create Job Post"}
              </h2>
              <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-black uppercase tracking-widest">Job Title *</label>
                  <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="brutal-input w-full" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-black uppercase tracking-widest">Company *</label>
                  <input required value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className="brutal-input w-full" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-black uppercase tracking-widest">Location *</label>
                  <input required value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="brutal-input w-full" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-black uppercase tracking-widest">Salary *</label>
                  <input required value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} className="brutal-input w-full" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-black uppercase tracking-widest">Job Type *</label>
                  <select value={form.job_type} onChange={(e) => setForm({ ...form, job_type: e.target.value })} className="brutal-input w-full">
                    {JOB_TYPES.map((type) => <option key={type}>{type}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-black uppercase tracking-widest">Skills / Requirements *</label>
                  <div className="mb-2 flex flex-wrap gap-2">
                    {form.skills.map((skill, index) => (
                      <span key={`${skill}-${index}`} className="inline-flex items-center gap-1 rounded-full border-2 border-black bg-blue-100 px-3 py-1 text-sm font-bold">
                        {skill}
                        <button type="button" onClick={() => setForm((prev) => ({ ...prev, skills: prev.skills.filter((_, i) => i !== index) }))}>×</button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      value={form.skillInput}
                      onChange={(e) => setForm((prev) => ({ ...prev, skillInput: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addSkillToForm();
                        }
                      }}
                      className="brutal-input flex-1"
                      placeholder="Type a skill and press Enter"
                    />
                    <button type="button" onClick={addSkillToForm} className="brutal-button bg-blue-600 px-4 text-white font-black">Add</button>
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-black uppercase tracking-widest">Job Description *</label>
                  <textarea required rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="brutal-input w-full" />
                </div>
                <div className="sm:col-span-2 flex gap-3">
                  <button type="submit" disabled={creating} className="brutal-button bg-primary text-white font-black flex items-center gap-2">
                    {creating ? "Saving..." : editingJobId ? "Save Changes" : planInfo?.plan?.aiEnabled ? "Generate with AI" : "Create Job Post"}
                    {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                  </button>
                  <button type="button" onClick={resetForm} className="brutal-button bg-white text-text-primary font-black">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {showBulkPanel && !isLocked && (
            <div className="mb-8 rounded-2xl border-4 border-black bg-white p-6 shadow-brutal">
              <div className="mb-4 flex items-center justify-between gap-4">
                <h2 className="text-xl font-black">Bulk Job Upload</h2>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setBulkMode("manual")} className={`brutal-button ${bulkMode === "manual" ? "bg-primary text-white" : "bg-white"}`}>Manual Editor</button>
                  <button type="button" onClick={() => setBulkMode("csv")} className={`brutal-button ${bulkMode === "csv" ? "bg-primary text-white" : "bg-white"}`}>CSV Upload</button>
                </div>
              </div>

              {bulkMode === "manual" ? (
                <div className="space-y-4">
                  {bulkRows.map((row, index) => (
                    <div key={index} className="rounded-2xl border-2 border-black bg-surface p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <div className="font-black">Draft #{index + 1}</div>
                        {bulkRows.length > 1 && (
                          <button type="button" onClick={() => setBulkRows((prev) => prev.filter((_, rowIndex) => rowIndex !== index))} className="rounded-lg border-2 border-red-500 px-3 py-1 text-xs font-black text-red-500">Remove</button>
                        )}
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <input value={row.title} onChange={(e) => updateBulkRow(index, { title: e.target.value })} className="brutal-input" placeholder="Job title" />
                        <input value={row.company} onChange={(e) => updateBulkRow(index, { company: e.target.value })} className="brutal-input" placeholder="Company" />
                        <input value={row.location} onChange={(e) => updateBulkRow(index, { location: e.target.value })} className="brutal-input" placeholder="Location" />
                        <input value={row.salary} onChange={(e) => updateBulkRow(index, { salary: e.target.value })} className="brutal-input" placeholder="Salary" />
                        <select value={row.job_type} onChange={(e) => updateBulkRow(index, { job_type: e.target.value })} className="brutal-input">
                          {JOB_TYPES.map((type) => <option key={type}>{type}</option>)}
                        </select>
                        <div className="sm:col-span-2">
                          <textarea value={row.description} onChange={(e) => updateBulkRow(index, { description: e.target.value })} className="brutal-input w-full" rows={3} placeholder="Description" />
                        </div>
                        <div className="sm:col-span-2">
                          <div className="mb-2 flex flex-wrap gap-2">
                            {row.requirements.map((skill, skillIndex) => (
                              <span key={`${skill}-${skillIndex}`} className="inline-flex items-center gap-1 rounded-full border-2 border-black bg-blue-100 px-3 py-1 text-sm font-bold">
                                {skill}
                                <button type="button" onClick={() => updateBulkRow(index, { requirements: row.requirements.filter((_, i) => i !== skillIndex) })}>×</button>
                              </span>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <input
                              value={row.requirementInput}
                              onChange={(e) => updateBulkRow(index, { requirementInput: e.target.value })}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  addBulkRowSkill(index);
                                }
                              }}
                              className="brutal-input flex-1"
                              placeholder="Type a skill and press Enter"
                            />
                            <button type="button" onClick={() => addBulkRowSkill(index)} className="brutal-button bg-blue-600 px-4 text-white font-black">Add</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setBulkRows((prev) => [...prev, createManualBulkRow()])} className="brutal-button bg-white text-text-primary font-black">Add Row</button>
                    <button type="button" onClick={submitBulkRows} disabled={bulkUploading} className="brutal-button bg-primary text-white font-black">
                      {bulkUploading ? "Creating..." : "Create Bulk Job Posts"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border-2 border-dashed border-black bg-surface p-6 text-center">
                  <FileSpreadsheet className="mx-auto mb-3 h-10 w-10" />
                  <p className="mb-2 font-black">Upload CSV with columns:</p>
                  <p className="mb-4 text-sm text-text-secondary">`title,company,location,description,requirements,salary,job_type`</p>
                  <input type="file" accept=".csv" onChange={handleCsvUpload} className="mx-auto block" />
                  {bulkCsvName && <p className="mt-3 text-sm font-bold">Selected: {bulkCsvName}</p>}
                </div>
              )}
            </div>
          )}

          {!isLocked && (
            <>
              {loading ? (
                <div className="py-12 text-center font-bold text-text-secondary animate-pulse">Loading...</div>
              ) : jobs.length === 0 ? (
                <div className="rounded-2xl border-4 border-black bg-white p-12 text-center shadow-brutal">
                  <Briefcase className="mx-auto mb-3 h-12 w-12 text-text-muted" />
                  <p className="mb-2 text-xl font-black">No job posts yet</p>
                  <p className="text-text-secondary">Create one job or import many at once.</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {jobs.map((job) => (
                    <div key={job.job_id} className="rounded-2xl border-4 border-black bg-white p-5 shadow-brutal">
                      <div className="mb-4 flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-xl font-black">{job.title}</h3>
                          <p className="text-sm font-bold text-text-secondary">
                            {job.company} · {job.location} · {job.job_type} · {job.salary}
                          </p>
                          <p className="mt-1 text-xs font-bold uppercase tracking-widest text-text-muted">
                            Created {new Date(job.created_at).toLocaleString()}
                            {job.updated_at && ` · Updated ${new Date(job.updated_at).toLocaleString()}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button onClick={() => startEdit(job)} className="rounded-lg border-2 border-black p-2 hover:bg-black hover:text-white" title="Edit">
                            <Pencil className="w-4 h-4" strokeWidth={3} />
                          </button>
                          <button onClick={() => handleCopy(job.generated_content)} className="rounded-lg border-2 border-black p-2 hover:bg-black hover:text-white" title="Copy">
                            <Copy className="w-4 h-4" strokeWidth={3} />
                          </button>
                          <button onClick={() => handleExport(job)} className={`rounded-lg border-2 border-black p-2 ${planInfo?.plan?.jobExport ? "hover:bg-black hover:text-white" : "opacity-40"}`} title="Export">
                            <Download className="w-4 h-4" strokeWidth={3} />
                          </button>
                          {planInfo?.plan?.jobExport && (
                            <button onClick={() => handleFindLeads(job)} className="rounded-lg border-2 border-black bg-blue-50 px-3 py-2 text-xs font-black uppercase tracking-wider hover:bg-black hover:text-white" title="Find candidates">
                              Find Candidates · {OUTREACH_BATCH_COST} credits
                            </button>
                          )}
                          <button onClick={() => handleDelete(job.job_id)} className="rounded-lg border-2 border-red-500 p-2 text-red-500 hover:bg-red-500 hover:text-white" title="Delete">
                            <Trash2 className="w-4 h-4" strokeWidth={3} />
                          </button>
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
                        <div className="rounded-xl border-2 border-black/10 bg-surface p-4">
                          <div className="mb-2 text-xs font-black uppercase tracking-widest text-text-muted">Generated Job Post Copy</div>
                          <p className="whitespace-pre-wrap text-sm font-medium leading-relaxed">{job.generated_content}</p>
                        </div>
                        <div className="space-y-3">
                          <div className="rounded-xl border-2 border-black/10 bg-white p-4">
                            <div className="mb-2 text-xs font-black uppercase tracking-widest text-text-muted">Description</div>
                            <p className="text-sm whitespace-pre-wrap">{job.description}</p>
                          </div>
                          <div className="rounded-xl border-2 border-black/10 bg-white p-4">
                            <div className="mb-2 text-xs font-black uppercase tracking-widest text-text-muted">Skills</div>
                            <div className="flex flex-wrap gap-2">
                              {(job.requirements || []).map((skill) => (
                                <span key={skill} className="rounded-full border-2 border-black bg-blue-100 px-3 py-1 text-xs font-black">{skill}</span>
                              ))}
                            </div>
                          </div>
                          <div className="rounded-xl border-2 border-black/10 bg-white p-4">
                            <div className="mb-1 text-xs font-black uppercase tracking-widest text-text-muted">Credits</div>
                            <p className="text-sm font-bold">Generation used: {job.tokens_used || 0} credits</p>
                            <p className="text-sm font-bold">Candidate outreach: {OUTREACH_BATCH_COST} credits per batch</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {leadsModalOpen && selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-2xl border-4 border-black bg-white shadow-brutal-lg">
            <div className="border-b-4 border-black bg-primary p-6 text-white">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-xl font-black">
                  <Search className="w-6 h-6" strokeWidth={3} />
                  Find Candidates for {selectedJob.title}
                </h2>
                <button onClick={() => setLeadsModalOpen(false)} className="font-bold hover:underline">Close</button>
              </div>
              <p className="mt-1 text-sm text-white/80">
                {selectedJob.company} · {selectedJob.location}
              </p>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-6">
              {leadsLoading ? (
                <div className="flex items-center justify-center gap-3 py-12">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span className="font-bold">Finding matching candidates...</span>
                </div>
              ) : (
                <>
                  <p className="mb-4 text-sm font-bold text-text-secondary">
                    Candidate outreach uses <span className="text-primary">{OUTREACH_BATCH_COST} credits</span> per batch, no matter how many leads you choose.
                  </p>
                  <div className="space-y-2">
                    {leads.map((lead) => (
                      <label key={lead.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 border-black p-3 ${selectedLeads.includes(lead.id) ? "bg-primary text-white" : "hover:bg-surface"}`}>
                        <input type="checkbox" checked={selectedLeads.includes(lead.id)} onChange={() => toggleLeadSelection(lead.id)} className="mt-1 h-5 w-5 accent-black" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 font-black">
                            {lead.name}
                            <span className={`rounded-full px-2 py-0.5 text-xs ${selectedLeads.includes(lead.id) ? "bg-white text-black" : "bg-black text-white"}`}>
                              {lead.match_score}% match
                            </span>
                          </div>
                          <p className={`text-sm font-bold ${selectedLeads.includes(lead.id) ? "text-white/90" : "text-text-secondary"}`}>
                            {lead.title} · {lead.location}
                          </p>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {lead.skills.map((skill, index) => (
                              <span key={`${lead.id}-${index}`} className={`rounded-full border px-2 py-0.5 text-xs ${selectedLeads.includes(lead.id) ? "border-white/30 text-white" : "border-black/20"}`}>
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center justify-between border-t-4 border-black bg-surface p-6">
              <div className="text-sm font-bold">{selectedLeads.length} lead(s) selected</div>
              <div className="flex gap-3">
                <button onClick={() => setLeadsModalOpen(false)} className="brutal-button bg-white text-text-primary font-black" disabled={sendingOutreach}>Cancel</button>
                <button onClick={handleSendOutreach} disabled={sendingOutreach || selectedLeads.length === 0} className="brutal-button bg-primary text-white font-black flex items-center gap-2 disabled:opacity-50">
                  {sendingOutreach ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Send Outreach
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
      />
    </div>
  );
}
