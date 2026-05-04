import { useNavigate, useLocation } from "react-router-dom";
import { Calendar, PlusCircle, Bell, Loader2, Users, Target, Zap, PencilLine, Trash2, LoaderCircle, Sparkles, Shield, Search, ChevronDown, Coins } from "lucide-react";
import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import Sidebar from "@/components/Sidebar";
import FeedbackModal from "@/components/FeedbackModal";
import SchedoraLogo from "@/components/SchedoraLogo";
import { motion, AnimatePresence } from "framer-motion";
import usePlan from "@/hooks/usePlan";

import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { PLATFORMS } from "@/constants/platforms";

const API = `/api`;

function NotificationBell() {
  const [count, setCount] = useState(0);
  const [notifs, setNotifs] = useState([]);
  const [showPanel, setShowPanel] = useState(false);

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchCount = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await axios.get(`${API}/notifications/unread-count`, {
        headers: { Authorization: `Bearer ${token}` }, withCredentials: true
      });
      setCount(res.data.count);
    } catch (e) { /* silent */ }
  };

  const openPanel = async () => {
    setShowPanel(!showPanel);
    if (!showPanel) {
      try {
        const token = localStorage.getItem('access_token');
        const res = await axios.get(`${API}/notifications`, {
          headers: { Authorization: `Bearer ${token}` }, withCredentials: true
        });
        setNotifs(res.data);
      } catch (e) { /* silent */ }
    }
  };

  const markAllRead = async () => {
    try {
      const token = localStorage.getItem('access_token');
      await axios.post(`${API}/notifications/read-all`, {}, {
        headers: { Authorization: `Bearer ${token}` }, withCredentials: true
      });
      setCount(0);
      setNotifs(prev => prev.map(n => ({ ...n, read: true })));
    } catch (e) { /* silent */ }
  };

  return (
    <div className="relative" data-testid="notification-bell-container">
      <button
        onClick={openPanel}
        className="relative rounded-2xl border border-border bg-white p-3 shadow-brutal transition hover:-translate-y-0.5"
        data-testid="notification-bell"
      >
        <Bell className="w-5 h-5" strokeWidth={3} />
        {count > 0 && (
          <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-white shadow-brutal">
            {count}
          </span>
        )}
      </button>

      <AnimatePresence>
        {showPanel && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute right-0 top-16 z-50 max-h-96 w-80 overflow-y-auto overflow-x-hidden rounded-2xl border border-border bg-white shadow-brutal-lg" 
            data-testid="notification-panel"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-white/95 p-4 backdrop-blur">
              <span className="font-black uppercase tracking-widest text-xs">Notifications</span>
              {count > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-[10px] text-primary font-black uppercase hover:underline"
                >
                  Clear All
                </button>
              )}
            </div>
            {notifs.length === 0 ? (
              <div className="p-10 text-center text-text-muted text-xs font-bold uppercase tracking-widest">No updates</div>
            ) : (
              notifs.map((n) => (
                <div
                  key={n.notification_id}
                  className={`border-b border-border p-4 transition-colors ${n.read ? 'bg-white' : 'bg-indigo-50/70 hover:bg-indigo-50'}`}
                >
                  <div className="font-black text-sm">{n.title}</div>
                  <div className="text-xs text-text-secondary mt-1">{n.message}</div>
                  <div className="text-[10px] font-bold text-text-muted mt-2 uppercase">{new Date(n.created_at).toLocaleTimeString()}</div>
                </div>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { planType, isAdmin, postsUsed, maxPosts, canAI, role, tokens } = usePlan();
  const [posts, setPosts] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [publishedByPlatform, setPublishedByPlatform] = useState([]);
  const [accountsByPlatform, setAccountsByPlatform] = useState([]);
  const [recentPublishActivity, setRecentPublishActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [busyPostId, setBusyPostId] = useState(null);
  const [showTokenMenu, setShowTokenMenu] = useState(false);

  useEffect(() => {
    fetchData();
    const refresh = () => fetchData(true);
    const interval = setInterval(refresh, 15000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const connected = params.get('connected');
    const error = params.get('error');
    if (connected) {
      toast.success(`${connected.charAt(0).toUpperCase() + connected.slice(1)} connected!`);
      navigate('/dashboard', { replace: true });
    } else if (error) {
      toast.error(`Connection failed: ${error}`);
      navigate('/dashboard', { replace: true });
    }
  }, [location.search, navigate]);

  const fetchData = async (silent = false) => {
    try {
      const token = localStorage.getItem('access_token');
      const headers = { Authorization: `Bearer ${token}` };

      const [postsRes, analyticsRes, accountsRes] = await Promise.all([
        axios.get(`${API}/posts`, { headers, withCredentials: true }),
        axios.get(`${API}/analytics/overview`, { headers, withCredentials: true }),
        axios.get(`${API}/social-accounts`, { headers, withCredentials: true })
      ]);

      const recentPosts = postsRes.data.filter(p => ['scheduled', 'published'].includes(p.status)).slice(0, 5);
      setPosts(recentPosts);
      setAnalytics(analyticsRes.data);
      setAccounts(accountsRes.data);

      const platformOrder = PLATFORMS.map((platform) => platform.id);
      const platformBreakdown = platformOrder.map((platformId) => {
        const platformAnalytics = analyticsRes.data?.platform_stats?.[platformId] || { posts: 0, impressions: 0, engagement: 0 };
        return {
          id: platformId,
          label: PLATFORMS.find((item) => item.id === platformId)?.name || platformId,
          iconText: PLATFORMS.find((item) => item.id === platformId)?.iconText || platformId.slice(0, 2).toUpperCase(),
          color: PLATFORMS.find((item) => item.id === platformId)?.color || 'bg-gray-300',
          posts: platformAnalytics.posts || 0,
          impressions: platformAnalytics.impressions || 0,
          engagement: platformAnalytics.engagement || 0
        };
      });
      setPublishedByPlatform(platformBreakdown);

      const accountBreakdown = platformOrder.map((platformId) => {
        const platformAccounts = accountsRes.data.filter((account) => account.platform === platformId);
        return {
          id: platformId,
          label: PLATFORMS.find((item) => item.id === platformId)?.name || platformId,
          iconText: PLATFORMS.find((item) => item.id === platformId)?.iconText || platformId.slice(0, 2).toUpperCase(),
          color: PLATFORMS.find((item) => item.id === platformId)?.color || 'bg-gray-300',
          count: platformAccounts.length,
          usernames: platformAccounts.slice(0, 3).map((account) => account.username || account.account_id)
        };
      });
      setAccountsByPlatform(accountBreakdown);

      const recentActivity = postsRes.data
        .filter((post) => post.status === 'published' && post.published_at)
        .sort((a, b) => new Date(b.published_at) - new Date(a.published_at))
        .slice(0, 4);
      setRecentPublishActivity(recentActivity);

      if (!silent) setLoading(false);

      // Trigger the feedback modal only when a fresh publish has just happened.
      const publishedCount = postsRes.data.filter(p => p.status === 'published').length;
      const recentlyPublished = postsRes.data.some((post) => {
        if (post.status !== 'published' || !post.published_at) return false;
        const publishedAt = new Date(post.published_at).getTime();
        if (Number.isNaN(publishedAt)) return false;
        return Date.now() - publishedAt < 15 * 60 * 1000;
      });
      const feedbackSeen = localStorage.getItem('feedbackShown');

      if (publishedCount >= 1 && recentlyPublished && !feedbackSeen) {
        setTimeout(() => {
          setShowFeedbackModal(true);
          localStorage.setItem('feedbackShown', 'true');
        }, 1200);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      if (!silent) {
        toast.error('Failed to load dashboard data');
        setLoading(false);
      }
    }
  };

  const deletePost = async (postId) => {
    if (!window.confirm("Delete this scheduled post?")) return;
    setBusyPostId(postId);
    try {
      const token = localStorage.getItem("access_token");
      await axios.delete(`${API}/posts/${postId}`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true
      });
      toast.success("Post deleted");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to delete post");
    } finally {
      setBusyPostId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex bg-background min-h-screen">
        <Sidebar active="dashboard" />
        <div className="flex-1 flex flex-col items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 0.75, ease: "linear" }}
          >
            <Loader2 className="w-12 h-12 text-primary" />
          </motion.div>
          <p className="mt-4 font-black uppercase tracking-widest text-xs animate-pulse">Syncing Ops...</p>
        </div>
      </div>
    );
  }

  const statCards = [
    { label: 'Work planned', value: analytics?.scheduled_posts || 0, icon: Target, color: 'bg-pastel-pink', note: 'Tasks and posts waiting to move' },
    { label: 'Work shipped', value: analytics?.published_posts || 0, icon: Zap, color: 'bg-pastel-blue', note: 'Client-ready output already live' },
    { label: 'Queue depth', value: analytics?.total_posts || 0, icon: Calendar, color: 'bg-pastel-yellow', note: 'All active work in the system' },
    { label: 'Delivery lanes', value: analytics?.connected_accounts || accounts.length || 0, icon: Users, color: 'bg-aiAccent', note: 'Connected channels for publishing' }
  ];

  const roleCopy = {
    admin: { label: "Admin", note: "Own the work system, approvals, and delivery standards.", action: "Open Org View", path: "/organization" },
    vp: { label: "VP", note: "See team output, clear blockers, and keep departments aligned.", action: "Review Hierarchy", path: "/organization" },
    manager: { label: "Manager", note: "Plan projects, assign ownership, and protect deadlines.", action: "Open Org View", path: "/organization" },
    team_lead: { label: "Team Lead", note: "Review tasks, balance workloads, and move work forward.", action: "Review Tasks", path: "/organization" },
    employee: { label: "Employee", note: "Work your queue, update progress, and ship clean output.", action: "My Tasks", path: "/posts/schedule" },
  };
  const activeRole = roleCopy[role || 'employee'] || roleCopy.employee;

  return (
    <div className="flex bg-background min-h-screen">
      <Sidebar active="dashboard" />

      <main className="flex-1 p-5 md:p-10 max-w-7xl mx-auto w-full">
        {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-10 flex flex-col gap-6"
          >
          <div className="rounded-[28px] border border-border bg-white/90 p-5 md:p-6 shadow-brutal-lg backdrop-blur">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <SchedoraLogo size="md" className="-ml-1 mb-2" />
                <p className="max-w-2xl text-sm md:text-base text-text-secondary">
                  Plan the work, keep client delivery moving, and turn each task into clean published output.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border-2 border-black text-xs font-black uppercase tracking-widest ${
                isAdmin ? 'bg-primary text-white' :
                planType === 'organization' ? 'bg-emerald-700 text-white' :
                planType === 'ultra_pro' ? 'bg-primary text-white' :
                planType === 'pro' ? 'bg-blue-100 text-blue-800' :
                'bg-white text-text-primary'
              }`}>
                {isAdmin && <Shield className="w-3 h-3" strokeWidth={3} />}
                {isAdmin ? 'Admin' : planType === 'ultra_pro' ? 'Ultra Pro' : planType === 'organization' ? 'Organization' : planType}
              </span>
              {!isAdmin && (
                <div className="flex items-center gap-2">
                  <div className="text-xs font-bold text-text-muted">
                    {postsUsed}/{maxPosts === null ? '∞' : maxPosts} posts
                  </div>
                  {maxPosts !== null && (
                    <div className="w-24 h-2 bg-gray-200 rounded-full border border-black overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${postsUsed / maxPosts > 0.8 ? 'bg-red-500' : 'bg-primary'}`}
                        style={{ width: `${Math.min(100, (postsUsed / maxPosts) * 100)}%` }}
                      />
                    </div>
                  )}
                  {maxPosts !== null && postsUsed >= maxPosts && (
                    <button onClick={() => navigate('/pricing')} className="text-xs font-black text-primary hover:underline">
                      Upgrade
                    </button>
                  )}
                </div>
              )}
              {!isAdmin && !canAI && (
                <button onClick={() => navigate('/pricing')} className="text-xs font-bold text-text-muted hover:text-primary flex items-center gap-1">
                  <Zap className="w-3 h-3" />Unlock AI
                </button>
              )}
              </div>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto]">
            <label className="flex items-center gap-3 rounded-2xl border border-border bg-white px-4 py-3 shadow-brutal">
              <Search className="h-4 w-4 text-text-muted" />
              <input
                type="text"
                placeholder="Search tasks, posts, projects..."
                className="w-full bg-transparent text-sm outline-none placeholder:text-text-muted"
              />
            </label>

            <div className="relative">
              <button
                type="button"
                onClick={() => setShowTokenMenu((prev) => !prev)}
                className="inline-flex h-full w-full items-center justify-between gap-3 rounded-2xl border border-border bg-white px-4 py-3 shadow-brutal"
              >
                <span className="inline-flex items-center gap-2 text-sm font-semibold">
                  <Coins className="h-4 w-4 text-primary" />
                  {tokens ?? 0} credits
                </span>
                <ChevronDown className="h-4 w-4 text-text-muted" />
              </button>
              {showTokenMenu && (
                <div className="absolute right-0 top-full z-30 mt-2 w-72 rounded-2xl border border-border bg-white p-4 shadow-brutal-lg">
                  <div className="text-[10px] font-black uppercase tracking-[0.24em] text-text-muted">Token summary</div>
                  <div className="mt-2 text-2xl font-black">{tokens ?? 0} credits</div>
                  <p className="mt-1 text-sm text-text-secondary">
                    You can create about {Math.max(0, Math.floor((tokens ?? 0) / 5))} posts with your current balance.
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate('/tokens')}
                    className="mt-4 w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-brutal transition hover:-translate-y-0.5"
                  >
                    Buy Credits
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3">
              <NotificationBell />
              <button
                onClick={() => navigate('/posts/new')}
                className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-brutal transition hover:-translate-y-0.5"
              >
                <PlusCircle className="w-5 h-5" strokeWidth={2.5} />
                New Post
              </button>
            </div>
          </div>
        </motion.div>

        <div className="grid gap-4 md:grid-cols-3 mb-12">
          <div className="brutal-card p-5 bg-white">
            <div className="text-[10px] tracking-[0.2em] uppercase font-black text-text-muted mb-2">Work mode</div>
            <div className="text-2xl font-black font-heading">{activeRole.label}</div>
            <p className="mt-2 text-sm text-text-secondary">{activeRole.note}</p>
          </div>
          <div className="brutal-card p-5 bg-white">
            <div className="text-[10px] tracking-[0.2em] uppercase font-black text-text-muted mb-2">Task coverage</div>
            <div className="text-2xl font-black font-heading">
              {planType === 'organization' || isAdmin ? 'Organization' : planType === 'ultra_pro' ? 'Ultra Pro' : planType === 'pro' ? 'Project hierarchy' : 'Solo'}
            </div>
            <p className="mt-2 text-sm text-text-secondary">
              {planType === 'organization' || isAdmin
                ? 'Departments, projects, leads, and org tasks stay connected from top to bottom.'
                : planType === 'ultra_pro'
                  ? 'All productivity tools are unlocked for faster planning and execution.'
                : planType === 'pro'
                  ? 'Managers can plan, assign, and keep delivery on track.'
                  : 'Keep it simple with solo planning and publishing.'}
            </p>
          </div>
          <div className="brutal-card p-5 bg-white">
            <div className="text-[10px] tracking-[0.2em] uppercase font-black text-text-muted mb-2">Next action</div>
            <div className="text-2xl font-black font-heading">{activeRole.action}</div>
            <button
              onClick={() => navigate(planType === 'free' ? '/pricing' : activeRole.path)}
              className="mt-4 brutal-button bg-black text-white text-[10px] px-4 py-2"
            >
              {planType === 'free' ? 'Upgrade' : 'Open'}
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {statCards.map((stat, idx) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
              whileHover={{ scale: 1.01 }}
              className={`brutal-card p-6 border-black relative overflow-hidden group h-32 flex flex-col justify-center`}
            >
              <div className={`absolute top-0 right-0 w-16 h-16 ${stat.color} translate-x-8 -translate-y-8 rounded-full opacity-20 group-hover:scale-150 transition-transform duration-200`} />
              <div className="text-[10px] tracking-[0.2em] uppercase font-black text-text-muted mb-2 flex items-center gap-2">
                <stat.icon className="w-3 h-3" /> {stat.label}
              </div>
              <div className="text-4xl font-black font-heading tracking-tight">{stat.value}</div>
              <div className="mt-3 inline-flex items-center gap-2 rounded-full border-2 border-black bg-white px-3 py-1 text-[10px] font-black uppercase tracking-widest shadow-brutal">
                <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                Live
              </div>
            </motion.div>
          ))}
        </div>

        {/* Platform Breakdown */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-12">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="brutal-card p-6 bg-white xl:col-span-2"
          >
            <div className="flex items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-black font-heading tracking-tight">Delivery by channel</h2>
                <p className="text-sm text-text-secondary">See where planned work actually becomes client-ready output.</p>
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest bg-black text-white px-3 py-1 rounded-full">Live</span>
            </div>
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {publishedByPlatform.map((platform) => (
                <div key={platform.id} className="rounded-xl border-2 border-black bg-pastel-yellow/20 p-4 shadow-brutalSoft">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className={`w-12 h-12 ${platform.color} border-2 border-black rounded-xl flex items-center justify-center text-white font-black`}>
                      {platform.iconText}
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">{platform.label}</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-end justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-text-muted">Published Posts</p>
                        <p className="text-3xl font-black font-heading">{platform.posts}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black uppercase tracking-widest text-text-muted">Impressions</p>
                        <p className="text-lg font-black">{platform.impressions.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-text-muted">
                      Engagement {platform.engagement.toLocaleString()}
                    </div>
                    <div className="h-2 rounded-full bg-white border border-black overflow-hidden">
                      <div
                        className="h-full bg-black"
                        style={{ width: `${Math.min(100, Math.max(8, platform.posts * 18))}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="brutal-card p-6 bg-white"
          >
            <div className="mb-6">
                <h2 className="text-2xl font-black font-heading tracking-tight">Publishing lanes</h2>
                <p className="text-sm text-text-secondary">Keep only the channels that support active delivery.</p>
            </div>
            <div className="space-y-3">
              {accountsByPlatform.map((platform) => (
                <div key={platform.id} className="rounded-xl border-2 border-border bg-gray-50 p-4">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 ${platform.color} border-2 border-black rounded-xl flex items-center justify-center text-white font-black text-xs`}>
                        {platform.iconText}
                      </div>
                      <div>
                        <div className="font-black text-sm">{platform.label}</div>
                        <div className="text-[10px] uppercase tracking-widest text-text-muted">{platform.count} connected</div>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate('/settings/accounts')}
                      className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline"
                    >
                      Manage
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {platform.usernames.length > 0 ? platform.usernames.map((username) => (
                      <span key={username} className="rounded-full border border-black bg-white px-2 py-1 text-[10px] font-bold">
                        {username}
                      </span>
                    )) : (
                      <span className="text-[10px] text-text-muted">No active accounts</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Upcoming Posts */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-2 brutal-card p-8 bg-white"
          >
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-black font-heading tracking-tight underline decoration-primary decoration-4 underline-offset-4">Task and delivery activity</h2>
              <button 
                onClick={() => navigate('/posts/schedule')}
                className="text-xs font-black uppercase text-text-muted hover:text-primary transition-colors"
              >
                Open work queue →
              </button>
            </div>
            
            {posts.length === 0 ? (
              <div className="text-center py-20 bg-gray-50 border-4 border-dashed border-black rounded-xl transition-colors duration-150">
                <Calendar className="w-16 h-16 mx-auto mb-4 text-black/10" />
                <p className="font-black uppercase tracking-widest text-xs text-text-muted mb-6">No task queue yet</p>
                <button
                  onClick={() => navigate('/posts/new')}
                  className="brutal-button bg-black text-white px-10 rounded-xl"
                >
                  Plan First Task
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {posts.map((post, idx) => (
                  <motion.div
                    key={post.post_id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="p-5 border-4 border-black rounded-xl hover:bg-pastel-blue/10 transition-all cursor-pointer shadow-brutalSoft hover:shadow-brutal-hover active:shadow-none hover:-translate-y-1"
                    onClick={() => navigate('/posts/schedule')}
                  >
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex gap-2">
                        {post.platforms.map((platform) => (
                          <span key={platform} className="text-[10px] tracking-widest uppercase font-black bg-pastel-yellow px-2 py-1 border-2 border-black rounded-xl">
                            {platform}
                          </span>
                        ))}
                      </div>
                      <span className="text-[10px] font-black uppercase text-text-muted">
                        {post.scheduled_time ? new Date(post.scheduled_time).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'PUBLISHED'}
                      </span>
                    </div>
                    <p className="font-bold text-sm text-text-secondary line-clamp-2 leading-relaxed">{post.content}</p>
                    {post.status === "scheduled" && (
                      <div className="mt-4 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate('/posts/schedule', { state: { editPostId: post.post_id } });
                          }}
                          className="inline-flex items-center gap-1 rounded-full border-2 border-black bg-white px-3 py-1 text-[10px] font-black uppercase tracking-widest hover:bg-black hover:text-white transition-colors"
                        >
                          <PencilLine className="w-3 h-3" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            deletePost(post.post_id);
                          }}
                          disabled={busyPostId === post.post_id}
                          className="inline-flex items-center gap-1 rounded-full border-2 border-black bg-white px-3 py-1 text-[10px] font-black uppercase tracking-widest hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-60"
                        >
                          {busyPostId === post.post_id ? <LoaderCircle className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                          Delete
                        </button>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Recent Publish Activity */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="brutal-card p-8 bg-white"
          >
            <div className="flex items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-black font-heading tracking-tight">Recent Publish Activity</h2>
                <p className="text-sm text-text-secondary">The newest live posts across your accounts.</p>
              </div>
              <Sparkles className="w-5 h-5 text-primary" />
            </div>

            {recentPublishActivity.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-black/20 bg-gray-50 p-6 text-center">
                <p className="text-sm font-medium text-text-muted">No published posts yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentPublishActivity.map((post) => (
                  <div key={post.post_id} className="rounded-xl border-2 border-black bg-pastel-blue/10 p-4">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div className="flex flex-wrap gap-2">
                        {post.platforms?.slice(0, 3).map((platform) => (
                          <span key={platform} className="rounded-full border border-black bg-white px-2 py-1 text-[10px] font-black uppercase tracking-widest">
                            {platform}
                          </span>
                        ))}
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">
                        {new Date(post.published_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-text-secondary line-clamp-3">{post.content}</p>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* AI Strategy */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="brutal-card p-8 bg-aiAccent border-black"
          >
            <div className="flex items-center gap-3 mb-6">
              <Zap className="w-8 h-8 fill-black" strokeWidth={3} />
              <h2 className="text-2xl font-black font-heading tracking-tight">AI Strategy</h2>
            </div>
            
            <div className="space-y-6 mb-10">
              {analytics?.insights?.slice(0, 4).map((insight, index) => (
                <motion.div 
                  key={index}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-start gap-4 p-4 bg-white/40 border-2 border-black rounded-xl backdrop-blur-sm shadow-brutalSoft"
                >
                  <span className="font-black text-xl text-primary">•</span>
                  <p className="text-xs font-black uppercase tracking-tight leading-tight">{insight}</p>
                </motion.div>
              ))}
            </div>
            
            <button
              onClick={() => navigate('/posts/new')}
              className="w-full brutal-button bg-black text-white text-xs py-4 flex items-center justify-center gap-2 group"
            >
              <span>GENERATE WITH AI</span>
              <Sparkles className="w-4 h-4 group-hover:rotate-12 transition-transform" />
            </button>
          </motion.div>
        </div>
      </main>

      <FeedbackModal 
        isOpen={showFeedbackModal} 
        onClose={() => setShowFeedbackModal(false)} 
        celebration={true}
      />
    </div>
  );
}
