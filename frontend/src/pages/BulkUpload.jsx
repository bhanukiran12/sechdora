import Sidebar from "@/components/Sidebar";
import { useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { 
  Upload, CheckCircle, XCircle, Download, 
  Plus, Send, LayoutGrid, FileSpreadsheet, Loader2, AlertTriangle, Zap
} from "lucide-react";
import BulkPostCard from "@/components/BulkPostCard";
import { motion, AnimatePresence } from "framer-motion";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "https://sechdora.onrender.com";
const API = `${BACKEND_URL}/api`;

export default function BulkUpload() {
  const [activeMode, setActiveMode] = useState('manual');
  const [loading, setLoading] = useState(false);
  const [manualPosts, setManualPosts] = useState([
    { content: '', platforms: [], media_urls: [], scheduled_time: '' },
    { content: '', platforms: [], media_urls: [], scheduled_time: '' }
  ]);
  const [csvPreview, setCsvPreview] = useState([]);
  const [csvFileName, setCsvFileName] = useState("");
  const [uploadResult, setUploadResult] = useState(null);

  const parseMediaUrls = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value.filter(Boolean);
    return String(value)
      .split(/[;|]/)
      .map((item) => item.trim())
      .filter(Boolean);
  };

  const addManualPost = () => {
    setManualPosts([...manualPosts, { content: '', platforms: [], media_urls: [], scheduled_time: '' }]);
  };

  const removeManualPost = (index) => {
    if (manualPosts.length <= 1) { toast.error("At least one post is required"); return; }
    setManualPosts(manualPosts.filter((_, i) => i !== index));
  };

  const updateManualPost = (index, updatedPost) => {
    const updated = [...manualPosts];
    updated[index] = updatedPost;
    setManualPosts(updated);
  };

  const validatePosts = (posts) => {
    for (let i = 0; i < posts.length; i++) {
      const p = posts[i];
      const hasMedia = (p.media_urls && p.media_urls.length > 0) || p.media_url;
      if (!p.content?.trim() && !hasMedia) return `Post #${i + 1} needs content or media`;
      if (!p.platforms || p.platforms.length === 0) return `Post #${i + 1} needs at least one platform`;
      if (!p.scheduled_time) return `Post #${i + 1} needs a scheduled time`;
    }
    return null;
  };

  const submitManualPosts = async () => {
    const error = validatePosts(manualPosts);
    if (error) { toast.error(error); return; }
    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.post(`${API}/posts/bulk-create`, { posts: manualPosts }, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true
      });
      toast.success(`🚀 ${response.data.success} posts scheduled successfully!`);
      setManualPosts([{ content: '', platforms: [], media_urls: [], scheduled_time: '' }]);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to schedule posts");
    } finally {
      setLoading(false);
    }
  };

  const handleCsvSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.name.endsWith('.csv')) { toast.error('Please select a valid CSV file'); return; }
    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const lines = text.split("\n");
      const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
      const parsed = lines.slice(1).filter(l => l.trim()).map((line) => {
        const values = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.trim().replace(/^"|"$/g, ''));
        const row = {};
        headers.forEach((h, i) => { row[h] = values[i] || ""; });
        row.media_urls = parseMediaUrls(row.media_urls || row.media_url);
        row.ui_error = !row.content && !(row.media_urls && row.media_urls.length) ? "Missing content" :
                       !row.platforms ? "Missing platforms" :
                       !row.scheduled_time ? "Missing time" : null;
        return row;
      });
      setCsvPreview(parsed);
      setUploadResult(null);
    };
    reader.readAsText(file);
  };

  const submitCsvData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.post(`${API}/posts/bulk-create`, { posts: csvPreview }, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true
      });
      setUploadResult(response.data);
      if (response.data.success > 0) {
        toast.success(`Batch processed: ${response.data.success} posts scheduled!`);
        setCsvPreview([]); setCsvFileName("");
      }
    } catch (err) {
      toast.error("Failed to process CSV data");
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    const csvContent = "content,platforms,scheduled_time,media_urls\n" +
      "Sample post content,linkedin,2026-05-20T10:00:00,https://example.com/img-1.jpg;https://example.com/img-2.jpg";
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'schedora-bulk-template.csv'; a.click();
  };

  return (
    <div className="flex bg-background min-h-screen">
      <Sidebar active="bulk" />

      <main className="flex-1 p-6 md:p-12 max-w-7xl mx-auto w-full">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12 flex flex-col md:flex-row justify-between items-end gap-6"
        >
          <div>
            <h1 className="text-5xl font-black font-heading tracking-tighter mb-2 flex items-center gap-3">
              Bulk Manager <Zap className="w-8 h-8 text-primary fill-primary" />
            </h1>
            <p className="text-text-secondary font-bold max-w-md">
              Schedule weeks of content in minutes. Your content machine.
            </p>
          </div>

          {/* Mode Switcher — refined with 12px radii */}
          <div className="flex bg-white border-4 border-black p-1.5 shadow-brutal rounded-xl gap-1">
            {[
              { id: 'manual', icon: LayoutGrid, label: 'Manual Editor' },
              { id: 'csv', icon: FileSpreadsheet, label: 'CSV Upload' }
            ].map((mode) => (
              <motion.button
                key={mode.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveMode(mode.id)}
                className={`flex items-center gap-2 px-6 py-2.5 font-black text-xs uppercase tracking-widest rounded-xl transition-all ${
                  activeMode === mode.id
                    ? 'bg-primary text-white shadow-brutal-hover'
                    : 'bg-transparent text-black hover:bg-black/5'
                }`}
              >
                <mode.icon className="w-4 h-4" />
                {mode.label}
              </motion.button>
            ))}
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {activeMode === 'manual' ? (
            <motion.div
              key="manual"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.1 }}
              className="space-y-6"
            >
              {/* Cards */}
              <div className="space-y-2">
                {manualPosts.map((post, idx) => (
                  <BulkPostCard
                    key={idx}
                    index={idx}
                    post={post}
                    updatePost={updateManualPost}
                    removePost={removeManualPost}
                  />
                ))}
              </div>

              {/* Action Bar */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-between items-center bg-white border-4 border-black p-6 shadow-brutal rounded-xl sticky bottom-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-black text-white flex items-center justify-center font-black text-lg border-2 border-black">
                    {manualPosts.length}
                  </div>
                  <span className="font-black uppercase tracking-widest text-sm">
                    Post{manualPosts.length !== 1 ? 's' : ''} Ready
                  </span>
                </div>
                <div className="flex gap-4">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={addManualPost}
                    className="brutal-button bg-white text-black flex items-center gap-2 rounded-xl"
                  >
                    <Plus className="w-5 h-5" strokeWidth={3} /> Add Post
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={submitManualPosts}
                    disabled={loading}
                    className="brutal-button bg-primary text-white flex items-center gap-3 px-8 shadow-brutal-lg rounded-xl"
                  >
                    {loading
                      ? <Loader2 className="w-5 h-5 animate-spin" />
                      : <Send className="w-5 h-5" strokeWidth={3} />
                    }
                    {loading ? 'Scheduling...' : 'Schedule All'}
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="csv"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.1 }}
              className="space-y-8"
            >
              {!csvPreview.length ? (
                <>
                  {/* CSV Dropzone */}
                  <motion.div
                    whileHover={{ scale: 1.002 }}
                    className="brutal-card p-20 text-center border-dashed bg-white group hover:bg-aiAccent/5 transition-colors rounded-xl"
                  >
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleCsvSelect}
                      className="hidden"
                      id="csv-input"
                    />
                    <label htmlFor="csv-input" className="cursor-pointer block">
                      <motion.div
                        whileHover={{ rotate: 3, scale: 1.05 }}
                        className="w-24 h-24 bg-primary border-4 border-black rounded-xl flex items-center justify-center mx-auto mb-8 shadow-brutal"
                      >
                        <Upload className="w-12 h-12 text-white" strokeWidth={2.5} />
                      </motion.div>
                      <h2 className="text-3xl font-black mb-2 font-heading">Drop your CSV here</h2>
                      <p className="text-text-muted font-bold mb-8">or click to browse files</p>
                      <span className="brutal-button bg-black text-white px-10 py-3 inline-block">
                        Select CSV File
                      </span>
                    </label>
                  </motion.div>

                  {/* Template Helper */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                    className="brutal-card p-8 bg-aiAccent flex flex-col md:flex-row justify-between items-center gap-6 rounded-xl"
                  >
                    <div>
                      <h3 className="text-2xl font-black mb-2 font-heading">Need a starting point?</h3>
                      <p className="text-sm font-bold opacity-80">
                        Our CSV template has everything pre-configured to start scheduling in bulk.
                      </p>
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={downloadTemplate}
                        className="brutal-button bg-white text-black flex items-center gap-2 whitespace-nowrap"
                    >
                      <Download className="w-5 h-5" strokeWidth={3} /> Download Template
                    </motion.button>
                  </motion.div>
                </>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-6"
                >
                  {/* CSV Preview Header */}
                  <div className="brutal-card p-6 bg-white flex justify-between items-center rounded-xl">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-aiAccent border-4 border-black flex items-center justify-center shadow-brutal">
                        <CheckCircle className="w-6 h-6 text-black" strokeWidth={3} />
                      </div>
                      <div>
                        <h3 className="font-black text-xl font-heading">{csvFileName}</h3>
                        <p className="text-xs text-text-muted uppercase font-black tracking-widest">
                          {csvPreview.length} rows detected — review before scheduling
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <button
                        onClick={() => { setCsvPreview([]); setCsvFileName(""); }}
                        className="brutal-button bg-white text-red-600 border-red-600 rounded-xl"
                      >
                        Reset
                      </button>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={submitCsvData}
                        className="brutal-button bg-primary text-white flex items-center gap-2 rounded-xl"
                        disabled={loading}
                      >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" strokeWidth={3} />}
                        Schedule {csvPreview.length} Posts
                      </motion.button>
                    </div>
                  </div>

                  {/* Preview Table */}
                  <div className="brutal-card p-0 overflow-hidden bg-white">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-black text-white text-[10px] uppercase tracking-[0.2em]">
                            <th className="p-4 border-r border-white/20">Status</th>
                            <th className="p-4 border-r border-white/20">Content</th>
                            <th className="p-4 border-r border-white/20">Platforms</th>
                            <th className="p-4 border-r border-white/20">Media</th>
                            <th className="p-4">Schedule</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y-2 divide-black text-sm">
                          {csvPreview.map((row, idx) => (
                            <motion.tr
                              key={idx}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.02 }}
                              className={row.ui_error ? "bg-red-50" : "hover:bg-aiAccent/5 transition-colors"}
                            >
                              <td className="p-4 border-r border-black font-black text-center">
                                {row.ui_error ? (
                                  <div className="group relative inline-block">
                                    <AlertTriangle className="w-5 h-5 text-red-500" />
                                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-44 p-2 bg-black text-white text-[10px] rounded-xl border-2 border-white z-50">
                                      {row.ui_error}
                                    </div>
                                  </div>
                                ) : (
                                  <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                                )}
                              </td>
                              <td className="p-4 border-r border-black">
                                <input
                                  value={row.content}
                                  onChange={(e) => {
                                    const updated = [...csvPreview];
                                    updated[idx].content = e.target.value;
                                    updated[idx].ui_error = !e.target.value && !updated[idx].media_url ? "Missing content" : null;
                                    setCsvPreview(updated);
                                  }}
                                  className="w-full bg-transparent outline-none font-bold focus:ring-0"
                                />
                              </td>
                              <td className="p-4 border-r border-black">
                                <span className="bg-pastel-yellow px-2 py-1 rounded-xl font-black text-[10px] border-2 border-black uppercase">
                                  {row.platforms || "None"}
                                </span>
                              </td>
                              <td className="p-4 border-r border-black">
                                <div className="flex flex-wrap gap-2">
                                  {(row.media_urls && row.media_urls.length > 0) ? (
                                    row.media_urls.map((mediaUrl, mediaIdx) => (
                                      <span key={`${idx}-${mediaIdx}`} className="bg-aiAccent/40 px-2 py-1 rounded-xl font-black text-[10px] border-2 border-black">
                                        {mediaIdx + 1}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-xs text-text-muted font-bold">No media</span>
                                  )}
                                </div>
                              </td>
                              <td className="p-4 font-mono text-xs font-bold">{row.scheduled_time}</td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Upload Result */}
                  {uploadResult && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={`brutal-card p-6 ${uploadResult.failed > 0 ? 'bg-red-50 border-red-600' : 'bg-aiAccent border-black'}`}
                    >
                      <div className="flex items-center gap-3">
                        {uploadResult.failed > 0 ? (
                          <XCircle className="w-6 h-6 text-red-600" strokeWidth={3} />
                        ) : (
                          <CheckCircle className="w-6 h-6 text-green-600" strokeWidth={3} />
                        )}
                        <div>
                          <p className="font-black">
                            ✅ {uploadResult.success} scheduled · ❌ {uploadResult.failed} failed
                          </p>
                          {uploadResult.errors?.length > 0 && (
                            <ul className="text-xs text-red-700 mt-2 space-y-1 font-bold">
                              {uploadResult.errors.map((e, i) => <li key={i}>• {e}</li>)}
                            </ul>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
