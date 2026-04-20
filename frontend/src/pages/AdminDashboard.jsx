import { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import {
  Users, BarChart3, MessageSquare, Settings, CheckCircle2,
  Twitter, Linkedin, Facebook, Instagram, Youtube,
  Clock, ArrowLeft, DollarSign, Zap, TrendingUp,
  AlertCircle, Star, ExternalLink, Activity, RefreshCw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL ?? "https://sechdora.onrender.com";

const PLATFORM_ICONS = {
  twitter: Twitter, linkedin: Linkedin, facebook: Facebook,
  instagram: Instagram, youtube: Youtube
};

const USER_STATUS_STYLE = {
  active: "bg-green-100 text-green-700",
  at_risk: "bg-yellow-100 text-yellow-700",
  inactive: "bg-gray-100 text-gray-500",
};

function StatCard({ icon: Icon, value, label, sub, color = "bg-white" }) {
  return (
    <div className={`${color} border-4 border-black p-6 rounded-xl shadow-brutal`}>
      <Icon className="w-8 h-8 mb-3" />
      <div className="text-4xl font-black">{value}</div>
      <div className="font-bold text-text-secondary mt-1">{label}</div>
      {sub && <div className="text-xs font-black text-primary mt-2">{sub}</div>}
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const navigate = useNavigate();

  const authToken = localStorage.getItem('access_token');
  const headers = useMemo(() => ({ Authorization: `Bearer ${authToken}` }), [authToken]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes, feedbackRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/admin/stats`, { headers }),
        axios.get(`${BACKEND_URL}/api/admin/users`, { headers }),
        axios.get(`${BACKEND_URL}/api/admin/feedback`, { headers }),
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data);
      setFeedback(feedbackRes.data);
    } catch (err) {
      console.error("Admin access error:", err);
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  }, [headers, navigate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <BarChart3 className="w-12 h-12 text-primary animate-bounce" />
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'revenue', label: 'Revenue & Costs' },
    { id: 'users', label: 'User Behavior' },
    { id: 'feedback', label: 'Feedback' },
  ];

  const avgRating = stats?.feedback?.avg_rating ?? 0;

  return (
    <div className="min-h-screen bg-background font-sans text-text-primary">
      <div className="max-w-7xl mx-auto p-4 md:p-8">

        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 mb-4 font-bold text-sm hover:translate-x-[-4px] transition-transform"
          >
            <ArrowLeft className="w-4 h-4" /> Back to App
          </button>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-4xl md:text-5xl font-black font-heading tracking-tighter uppercase">
                Admin Control
              </h1>
              <p className="text-text-secondary font-bold">System pulse and analytics</p>
            </div>
            <button
              onClick={fetchData}
              className="brutal-button bg-white text-black flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-8 border-b-4 border-black pb-4">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2.5 rounded-xl font-black text-sm border-2 transition-all ${
                activeTab === tab.id
                  ? 'bg-black text-white border-black shadow-brutal'
                  : 'bg-white border-black hover:shadow-brutal-hover'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={Users} value={stats?.total_users ?? 0} label="Total Users"
                sub={`${stats?.verified_users ?? 0} verified`} color="bg-primary/10" />
              <StatCard icon={BarChart3} value={stats?.total_posts ?? 0} label="Live Posts"
                sub="Published via API" color="bg-secondary/10" />
              <StatCard icon={Activity} value={stats?.active_users_7d ?? 0} label="Active (7d)"
                sub="Posted this week" color="bg-green-50" />
              <StatCard icon={Settings} value={stats?.connected_accounts ?? 0} label="Connected Accounts"
                color="bg-yellow-50" />
            </div>

            {/* Platform Breakdown */}
            <div className="bg-white border-4 border-black p-6 rounded-xl shadow-brutal">
              <h3 className="text-xl font-black mb-5 flex items-center gap-2">
                <Settings className="w-5 h-5" /> Platform Connectivity
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {Object.entries(stats?.platform_stats || {}).map(([platform, count]) => {
                  const Icon = PLATFORM_ICONS[platform] || Settings;
                  return (
                    <div key={platform} className="flex flex-col items-center p-4 border-2 border-black rounded-xl bg-background">
                      <Icon className="w-6 h-6 mb-2" />
                      <div className="text-2xl font-black">{count}</div>
                      <div className="text-[10px] uppercase font-black opacity-50">{platform}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Token Usage */}
            <div className="bg-white border-4 border-black p-6 rounded-xl shadow-brutal">
              <h3 className="text-xl font-black mb-5 flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-500" /> Token Usage
              </h3>
              <div className="mb-4">
                <div className="text-4xl font-black">{stats?.tokens?.total_used ?? 0} 🪙</div>
                <div className="text-text-muted font-bold text-sm">Total credits consumed</div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Object.entries(stats?.tokens?.breakdown || {}).map(([type, count]) => (
                  <div key={type} className="p-3 bg-background border-2 border-border rounded-xl">
                    <div className="text-xs font-black uppercase text-text-muted mb-1">{type}</div>
                    <div className="text-xl font-black">{count}</div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* REVENUE & COSTS TAB */}
        {activeTab === 'revenue' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard icon={DollarSign} value={`₹${stats?.revenue?.total ?? 0}`} label="Total Revenue"
                color="bg-green-50" />
              <StatCard icon={TrendingUp} value={`₹${stats?.revenue?.from_plans ?? 0}`} label="From Plans"
                sub="Plan upgrades" color="bg-blue-50" />
              <StatCard icon={Zap} value={`₹${stats?.revenue?.from_tokens ?? 0}`} label="From Tokens"
                sub="Credit purchases" color="bg-yellow-50" />
            </div>

            {/* API Recharge Links */}
            <div className="bg-white border-4 border-black p-6 rounded-xl shadow-brutal">
              <h3 className="text-xl font-black mb-5 flex items-center gap-2">
                <ExternalLink className="w-5 h-5" /> API Dashboards
              </h3>
              <p className="text-sm text-text-muted font-bold mb-4">Quick access to recharge and monitor external APIs.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { label: "Recharge X (Twitter) API", url: "https://developer.twitter.com/en/portal/dashboard", color: "bg-black text-white" },
                  { label: "Recharge Gemini API", url: "https://aistudio.google.com/app/apikey", color: "bg-blue-50 text-blue-900" },
                  { label: "Razorpay Dashboard", url: "https://dashboard.razorpay.com/", color: "bg-blue-600 text-white" },
                  { label: "LinkedIn API", url: "https://www.linkedin.com/developers/apps", color: "bg-blue-100 text-blue-800" },
                ].map(({ label, url, color }) => (
                  <a
                    key={label}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`brutal-button ${color} flex items-center justify-between gap-2`}
                  >
                    {label} <ExternalLink className="w-4 h-4 shrink-0" />
                  </a>
                ))}
              </div>
            </div>

            {/* Revenue note */}
            <div className="bg-yellow-50 border-4 border-yellow-400 p-6 rounded-xl">
              <h3 className="font-black text-lg flex items-center gap-2 mb-3">
                <AlertCircle className="w-5 h-5 text-yellow-700" /> Cost Tracking
              </h3>
              <p className="text-sm font-bold text-yellow-800">
                External API costs (Gemini, Twitter, LinkedIn) depend on your usage tier. Monitor them directly from the dashboards above. Profit = Revenue − API costs.
              </p>
            </div>
          </motion.div>
        )}

        {/* USER BEHAVIOR TAB */}
        {activeTab === 'users' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-2">
              {[
                { label: "High Token Users", filter: (u) => u.tokens > 100, color: "bg-green-50" },
                { label: "Most Active (7d)", filter: (u) => u.recentPosts7d > 0, color: "bg-blue-50" },
                { label: "Drop-off Risk", filter: (u) => u.status === "at_risk" || u.status === "inactive", color: "bg-red-50" },
              ].map(({ label, filter, color }) => (
                <div key={label} className={`${color} border-4 border-black p-5 rounded-xl shadow-brutal`}>
                  <div className="text-3xl font-black">{users.filter(filter).length}</div>
                  <div className="font-bold text-text-secondary mt-1">{label}</div>
                </div>
              ))}
            </div>

            <div className="bg-white border-4 border-black rounded-xl shadow-brutal overflow-hidden">
              <div className="p-5 border-b-4 border-black flex items-center gap-2">
                <Users className="w-5 h-5" />
                <h3 className="font-black text-lg">All Users</h3>
                <span className="ml-auto text-xs font-black text-text-muted">Sorted by token balance</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-black text-white">
                    <tr>
                      {["Name / Email", "Plan", "Tokens", "Posts (month)", "Status", "7d Posts"].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-black uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u, i) => (
                      <tr key={u.id} className={`border-b-2 border-border ${i % 2 === 0 ? 'bg-white' : 'bg-background'}`}>
                        <td className="px-4 py-3">
                          <div className="font-bold">{u.name || "—"}</div>
                          <div className="text-text-muted text-xs">{u.email}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-black text-xs uppercase px-2 py-0.5 bg-primary/10 rounded-full">{u.plan}</span>
                        </td>
                        <td className="px-4 py-3 font-black">{u.tokens} 🪙</td>
                        <td className="px-4 py-3 font-bold">{u.postsThisMonth}</td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${USER_STATUS_STYLE[u.status] || USER_STATUS_STYLE.inactive}`}>
                            {u.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-bold">{u.recentPosts7d}</td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-text-muted font-bold">No users yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* FEEDBACK TAB */}
        {activeTab === 'feedback' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard icon={Star} value={avgRating > 0 ? avgRating.toFixed(1) : "—"} label="Avg Rating"
                sub="Out of 5 stars" color="bg-yellow-50" />
              <StatCard icon={MessageSquare} value={stats?.feedback?.total ?? 0} label="Total Feedback"
                color="bg-primary/10" />
              <div className="bg-white border-4 border-black p-5 rounded-xl shadow-brutal">
                <h3 className="font-black mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" /> Top Tags
                </h3>
                <div className="flex flex-wrap gap-2">
                  {(stats?.feedback?.top_tags || []).map(({ tag, count }) => (
                    <span key={tag} className="text-xs font-black bg-black text-white px-2 py-1 rounded-full">
                      {tag} ({count})
                    </span>
                  ))}
                  {(stats?.feedback?.top_tags || []).length === 0 && (
                    <span className="text-xs text-text-muted font-bold">No tags yet</span>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-black flex items-center gap-2">
                <MessageSquare className="w-5 h-5" /> Recent Feedback
              </h3>
              {feedback.length === 0 && (
                <div className="p-12 border-4 border-dashed border-border text-center rounded-xl opacity-50">
                  <p className="font-bold">No feedback received yet</p>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[600px] overflow-y-auto pr-1">
                {feedback.map((f, i) => (
                  <div key={i} className="bg-white border-4 border-black p-4 rounded-xl shadow-brutal-sm">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map(s => (
                          <Star key={s} className={`w-4 h-4 ${s <= f.rating ? 'fill-primary text-primary' : 'text-border'}`} />
                        ))}
                      </div>
                      {f.type && (
                        <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded-full ${
                          f.type === 'bug' ? 'bg-red-100 text-red-600' :
                          f.type === 'feature' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
                        }`}>
                          {f.type}
                        </span>
                      )}
                    </div>
                    {f.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {f.tags.map(tag => (
                          <span key={tag} className="text-[9px] font-black bg-black/10 rounded-full px-2 py-0.5">{tag}</span>
                        ))}
                      </div>
                    )}
                    {f.message && (
                      <p className="text-sm font-bold mb-2 text-text-primary break-words">"{f.message || f.comment}"</p>
                    )}
                    <div className="flex items-center gap-2 pt-2 border-t border-dashed border-border text-[10px] font-bold text-text-secondary">
                      <Clock className="w-3 h-3" />
                      {f.timestamp || f.createdAt ? new Date(f.timestamp || f.createdAt).toLocaleDateString() : ""}
                      <span className="ml-auto opacity-50 truncate">{f.user_email}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

      </div>
    </div>
  );
}
