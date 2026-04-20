import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, TrendingUp, Zap, RefreshCw, ShoppingCart,
  Clock, BarChart3, Lightbulb, CheckCircle2
} from "lucide-react";
import Sidebar from "@/components/Sidebar";

const API = `${process.env.REACT_APP_BACKEND_URL ?? "https://sechdora.onrender.com"}/api`;

const TOKEN_PACKS = [
  { id: "pack_200", tokens: 200, price: 199, label: "Starter", color: "bg-blue-50 border-blue-400", badge: "" },
  { id: "pack_500", tokens: 500, price: 399, label: "Pro", color: "bg-primary/10 border-primary", badge: "Most Popular" },
  { id: "pack_1000", tokens: 1000, price: 699, label: "Power", color: "bg-purple-50 border-purple-400", badge: "Best Value" },
];

const TYPE_LABELS = {
  standard: "Standard Post",
  url: "Link Post",
  ai_caption: "AI Caption",
  job_generation: "Job Generation",
  job_export: "Job Export",
  lead_outreach: "Lead Outreach",
  token_purchase: "Purchase",
  credit: "Credit Added",
  unknown: "Other",
};

const TYPE_COLORS = {
  standard: "bg-blue-100 text-blue-700",
  url: "bg-orange-100 text-orange-700",
  ai_caption: "bg-purple-100 text-purple-700",
  job_generation: "bg-green-100 text-green-700",
  job_export: "bg-teal-100 text-teal-700",
  token_purchase: "bg-yellow-100 text-yellow-700",
  credit: "bg-emerald-100 text-emerald-700",
  unknown: "bg-gray-100 text-gray-600",
};

function loadRazorpay() {
  return new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function TokenDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(null);

  const authToken = localStorage.getItem("access_token");
  const headers = { Authorization: `Bearer ${authToken}` };

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, historyRes] = await Promise.all([
        axios.get(`${API}/tokens/stats`, { headers }),
        axios.get(`${API}/tokens/history?limit=50`, { headers }),
      ]);
      setStats(statsRes.data);
      setHistory(historyRes.data);
    } catch (err) {
      toast.error("Failed to load token data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleBuy = async (pack) => {
    setBuying(pack.id);
    try {
      const ok = await loadRazorpay();
      if (!ok) { toast.error("Payment SDK failed to load."); return; }

      const orderRes = await axios.post(`${API}/tokens/buy`, { pack_id: pack.id }, { headers });
      const { order_id, amount, currency, key } = orderRes.data;

      const options = {
        key,
        amount,
        currency,
        name: "Schedora Credits",
        description: `${pack.tokens} credits — ${pack.label} pack`,
        order_id,
        handler: async (response) => {
          try {
            const verifyRes = await axios.post(`${API}/tokens/verify-purchase`, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              pack_id: pack.id,
            }, { headers });
            toast.success(verifyRes.data.message || `${pack.tokens} credits added!`);
            await fetchData();
          } catch {
            toast.error("Payment verification failed. Contact support.");
          }
        },
        prefill: {},
        theme: { color: "#6d28d9" },
      };
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      if (err.response?.status === 503) {
        toast.error("Payment not configured yet. Contact support.");
      } else {
        toast.error("Failed to initiate payment.");
      }
    } finally {
      setBuying(null);
    }
  };

  if (loading) {
    return (
      <div className="flex">
        <Sidebar active="tokens" />
        <main className="flex-1 flex items-center justify-center min-h-screen bg-background">
          <div className="text-center">
            <span className="text-5xl animate-bounce block mb-3">🪙</span>
            <p className="font-black text-lg uppercase tracking-widest">Loading credits...</p>
          </div>
        </main>
      </div>
    );
  }

  const breakdown = stats?.breakdown || {};
  const totalTypes = Object.keys(breakdown).filter(k => k !== "credit");
  const topType = totalTypes.sort((a, b) => (breakdown[b] || 0) - (breakdown[a] || 0))[0];

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar active="tokens" />
      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        <button
          onClick={() => navigate("/dashboard")}
          className="mb-6 flex items-center gap-2 text-text-secondary hover:text-text-primary font-bold transition-colors"
        >
          <ArrowLeft className="w-5 h-5" /> Back to Dashboard
        </button>

        <div className="max-w-5xl mx-auto space-y-8">

          {/* Page Header */}
          <div>
            <h1 className="text-4xl md:text-5xl font-black font-heading tracking-tighter uppercase">
              🪙 Credits
            </h1>
            <p className="text-text-secondary font-bold mt-1">
              Track usage, buy more, stay unblocked.
            </p>
          </div>

          {/* Balance Card */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-gradient-to-br from-yellow-50 to-amber-100 border-4 border-black p-8 rounded-2xl shadow-brutal-lg"
          >
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div>
                <div className="text-xs font-black uppercase tracking-widest text-yellow-700 mb-2">Credits Remaining</div>
                <div className="text-7xl font-black text-black flex items-end gap-3">
                  <span>{stats?.balance ?? 0}</span>
                  <span className="text-3xl mb-2 opacity-50">🪙</span>
                </div>
                <div className="mt-2 text-base font-bold text-yellow-800">
                  ~{stats?.postsLeft ?? 0} standard posts left
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => navigate("/pricing")}
                  className="brutal-button bg-white text-black flex items-center gap-2"
                >
                  <Zap className="w-4 h-4" /> Upgrade Plan
                </button>
                <button
                  onClick={fetchData}
                  className="flex items-center gap-2 px-4 py-2 border-2 border-black rounded-xl font-bold text-sm hover:bg-white transition-colors"
                >
                  <RefreshCw className="w-4 h-4" /> Refresh
                </button>
              </div>
            </div>

            {/* Usage bar */}
            {stats?.totalUsed > 0 && (
              <div className="mt-6">
                <div className="flex justify-between text-xs font-black uppercase tracking-widest text-yellow-700 mb-2">
                  <span>Total used</span>
                  <span>{stats.totalUsed} credits</span>
                </div>
                <div className="h-3 bg-yellow-200 rounded-full border-2 border-yellow-400 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-yellow-500 to-amber-400 rounded-full"
                    style={{ width: `${Math.min(100, (stats.totalUsed / (stats.totalUsed + stats.balance)) * 100)}%` }}
                  />
                </div>
              </div>
            )}
          </motion.div>

          {/* Insights */}
          {stats?.insights?.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xl font-black flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-yellow-500" /> Smart Insights
              </h2>
              {stats.insights.map((insight, i) => (
                <motion.div
                  key={i}
                  initial={{ x: -10, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-start gap-3 p-4 bg-white border-4 border-black rounded-xl shadow-brutal-sm"
                >
                  <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <p className="font-bold text-sm text-text-primary">{insight}</p>
                </motion.div>
              ))}
            </div>
          )}

          {/* Buy Tokens */}
          <div>
            <h2 className="text-xl font-black flex items-center gap-2 mb-4">
              <ShoppingCart className="w-5 h-5" /> Buy Credits
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {TOKEN_PACKS.map((pack, i) => (
                <motion.div
                  key={pack.id}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: i * 0.1 }}
                  className={`relative border-4 ${pack.color} p-6 rounded-2xl flex flex-col gap-3 shadow-brutal`}
                >
                  {pack.badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                      {pack.badge}
                    </div>
                  )}
                  <div className="text-xs font-black uppercase tracking-widest text-text-muted">{pack.label}</div>
                  <div className="text-4xl font-black">
                    🪙 {pack.tokens}
                  </div>
                  <div className="text-sm text-text-secondary font-bold">
                    ~{Math.floor(pack.tokens / 3)} standard posts
                  </div>
                  <div className="text-2xl font-black">₹{pack.price}</div>
                  <button
                    onClick={() => handleBuy(pack)}
                    disabled={buying === pack.id}
                    className="brutal-button bg-black text-white w-full flex items-center justify-center gap-2 mt-2"
                  >
                    {buying === pack.id ? "Processing..." : "Buy Now"}
                  </button>
                </motion.div>
              ))}
            </div>
            <p className="mt-3 text-xs text-text-muted font-bold text-center">
              Secure payments via Razorpay · Credits never expire
            </p>
          </div>

          {/* Usage Breakdown */}
          {Object.keys(breakdown).length > 0 && (
            <div>
              <h2 className="text-xl font-black flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5" /> Usage Breakdown
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Object.entries(breakdown)
                  .filter(([k]) => k !== "credit")
                  .sort((a, b) => b[1] - a[1])
                  .map(([type, count]) => (
                    <div key={type} className="bg-white border-4 border-black p-4 rounded-xl shadow-brutal-sm">
                      <div className={`inline-block text-[10px] font-black uppercase px-2 py-0.5 rounded-full mb-2 ${TYPE_COLORS[type] || TYPE_COLORS.unknown}`}>
                        {TYPE_LABELS[type] || type}
                      </div>
                      <div className="text-2xl font-black">{count}</div>
                      <div className="text-xs text-text-muted font-bold">credits used</div>
                    </div>
                  ))}
              </div>
              {topType && (
                <div className="mt-3 p-4 bg-orange-50 border-4 border-orange-400 rounded-xl">
                  <p className="text-sm font-bold text-orange-800">
                    💡 Most credits spent on <strong>{TYPE_LABELS[topType] || topType}</strong> ({breakdown[topType]} credits).
                    {topType === "url" && " Consider removing links from posts to use 85% fewer credits."}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Activity Log */}
          <div>
            <h2 className="text-xl font-black flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5" /> Recent Activity
            </h2>
            <div className="space-y-2">
              {history.length === 0 && (
                <div className="p-12 border-4 border-dashed border-border text-center rounded-xl opacity-50">
                  <p className="font-bold">No activity yet</p>
                  <p className="text-sm text-text-muted mt-1">Create your first post to see credits in action.</p>
                </div>
              )}
              {history.map((log, i) => {
                const type = log.type || "unknown";
                const isCredit = type === "credit" || log.tokens < 0;
                const absTokens = Math.abs(log.tokens ?? 0);
                const ts = log.createdAt;
                const dateStr = ts
                  ? new Date(ts).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                  : "";
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="flex items-center justify-between bg-white border-2 border-black rounded-xl px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-black uppercase px-2 py-0.5 rounded-full ${TYPE_COLORS[type] || TYPE_COLORS.unknown}`}>
                        {TYPE_LABELS[type] || type}
                      </span>
                      <span className="text-xs font-bold text-text-muted">{dateStr}</span>
                    </div>
                    <div className={`font-black text-sm ${isCredit ? "text-green-600" : "text-red-600"}`}>
                      {isCredit ? "+" : "-"}{absTokens} 🪙
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Credit cost reference */}
          <div className="bg-white border-4 border-black rounded-2xl p-6">
            <h2 className="font-black text-lg mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" /> Credit Costs
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: "AI Caption", cost: 1, icon: "✨" },
                { label: "Standard Post", cost: 3, icon: "📝" },
                { label: "Link Post", cost: 20, icon: "🔗" },
                { label: "Job Generation", cost: 15, icon: "💼" },
                { label: "Job Export", cost: 10, icon: "📤" },
                { label: "Lead Outreach", cost: 10, icon: "📨" },
              ].map(({ label, cost, icon }) => (
                <div key={label} className="flex items-center justify-between p-3 bg-background border-2 border-border rounded-xl">
                  <span className="text-sm font-bold flex items-center gap-1.5">
                    <span>{icon}</span> {label}
                  </span>
                  <span className="font-black text-sm">{cost} 🪙</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
