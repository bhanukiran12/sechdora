import { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Mail, ShoppingCart, RefreshCw, CheckCircle2 } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import SchedoraLogo from "@/components/SchedoraLogo";

const API = "/api";

const FORM_PACKS = [
  { id: "pack_100", title: "100 responses", price: 99, description: "Best for light forms." },
  { id: "pack_500", title: "500 responses", price: 399, description: "For growing response volume." },
  { id: "pack_2000", title: "2000 responses", price: 999, description: "Scale with heavy campaigns." },
];

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

export default function FormsDashboard() {
  const navigate = useNavigate();
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(null);

  const token = localStorage.getItem("access_token");
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const fetchUsage = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/forms/usage`, { headers });
      setUsage(response.data);
    } catch (err) {
      toast.error("Failed to load form usage.");
    } finally {
      setLoading(false);
    }
  }, [headers]);

  useEffect(() => { fetchUsage(); }, [fetchUsage]);

  const handleBuyPack = async (pack) => {
    if (!token) { navigate("/login"); return; }
    setBuying(pack.id);
    try {
      const loaded = await loadRazorpay();
      if (!loaded) { toast.error("Payment service unavailable."); return; }
      const orderRes = await axios.post(`${API}/forms/buy-plan`, { pack_id: pack.id }, { headers });
      const { order_id, amount, currency, key } = orderRes.data;
      const options = {
        key,
        amount,
        currency,
        name: "Micronova Forms",
        description: `${pack.title} package`,
        order_id,
        handler: async (response) => {
          try {
            await axios.post(`${API}/forms/verify-purchase`, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              pack_id: pack.id,
            }, { headers });
            toast.success("Form response package added.");
            await fetchUsage();
          } catch (error) {
            toast.error(error.response?.data?.detail || "Failed to verify purchase.");
          }
        },
        prefill: {},
        theme: { color: "#111827" },
      };
      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Unable to start purchase.");
    } finally {
      setBuying(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-background">
        <Sidebar active="forms" />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <SchedoraLogo size="xl" className="mx-auto mb-6" />
            <p className="text-xl font-black uppercase tracking-[0.3em]">Loading form usage...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar active="forms" />
      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        <button onClick={() => navigate("/dashboard")} className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-text-secondary hover:text-text-primary">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>

        <div className="max-w-6xl mx-auto space-y-10">
          <div>
            <div className="flex flex-wrap items-center gap-4">
              <div className="rounded-3xl border-4 border-black bg-white p-6 shadow-brutal inline-flex items-center gap-3">
                <Mail className="w-6 h-6 text-primary" />
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] font-black text-text-muted">Forms dashboard</p>
                  <h1 className="text-4xl font-black">Usage and response packs</h1>
                </div>
              </div>
              <div className="rounded-3xl border-4 border-black bg-white p-6 shadow-brutal">
                <p className="text-xs uppercase tracking-[0.24em] font-black text-text-muted">Billing model</p>
                <p className="font-black">Separate from Scheduler credits</p>
              </div>
            </div>
            <p className="mt-4 max-w-3xl text-text-secondary">Track response usage, buy response packages, and keep forms billing independent from Scheduler credits.</p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="rounded-3xl border-4 border-black bg-white p-6 shadow-brutal">
              <p className="text-xs uppercase tracking-[0.24em] font-black text-text-muted mb-3">Responses used</p>
              <p className="text-5xl font-black mb-3">{usage.responsesUsed ?? 0}</p>
              <p className="text-sm text-text-secondary">Responses consumed this month</p>
            </div>
            <div className="rounded-3xl border-4 border-black bg-white p-6 shadow-brutal">
              <p className="text-xs uppercase tracking-[0.24em] font-black text-text-muted mb-3">Free remaining</p>
              <p className="text-5xl font-black mb-3">{usage.freeResponsesRemaining ?? 0}</p>
              <p className="text-sm text-text-secondary">Free responses left this period</p>
            </div>
            <div className="rounded-3xl border-4 border-black bg-white p-6 shadow-brutal">
              <p className="text-xs uppercase tracking-[0.24em] font-black text-text-muted mb-3">Purchased balance</p>
              <p className="text-5xl font-black mb-3">{usage.formCreditsBalance ?? 0}</p>
              <p className="text-sm text-text-secondary">Response credits available</p>
            </div>
          </div>

          <div className="rounded-3xl border-4 border-black bg-white p-8 shadow-brutal">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] font-black text-text-muted">Response pack purchase</p>
                <h2 className="text-3xl font-black">Buy more form responses</h2>
              </div>
              <button onClick={fetchUsage} className="inline-flex items-center gap-2 rounded-2xl border-2 border-black bg-white px-4 py-3 text-sm font-black hover:bg-slate-100 transition">
                <RefreshCw className="w-4 h-4" /> Refresh usage
              </button>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {FORM_PACKS.map((pack) => (
                <motion.div key={pack.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border-4 border-black bg-slate-50 p-6 shadow-brutal">
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-xl font-black">{pack.title}</p>
                    <span className="text-xs uppercase tracking-[0.24em] font-black text-text-muted">Forms</span>
                  </div>
                  <p className="text-4xl font-black mb-3">₹{pack.price}</p>
                  <p className="mb-6 text-sm text-text-secondary">{pack.description}</p>
                  <button onClick={() => handleBuyPack(pack)} disabled={buying === pack.id} className="w-full rounded-2xl bg-black px-4 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60">
                    {buying === pack.id ? "Processing..." : "Buy package"}
                  </button>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border-4 border-black bg-white p-8 shadow-brutal">
            <h3 className="text-2xl font-black mb-4">Form usage details</h3>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-border bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.24em] font-black text-text-muted">Media responses</p>
                <p className="text-3xl font-black mt-3">{usage.mediaResponses ?? 0}</p>
              </div>
              <div className="rounded-2xl border border-border bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.24em] font-black text-text-muted">Media storage used</p>
                <p className="text-3xl font-black mt-3">{usage.mediaStorageUsed ?? 0} KB</p>
              </div>
              <div className="rounded-2xl border border-border bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.24em] font-black text-text-muted">Billing period</p>
                <p className="text-3xl font-black mt-3">{usage.period || "—"}</p>
              </div>
            </div>
            <div className="mt-6 rounded-2xl border border-border bg-gray-50 p-4 text-sm text-text-secondary">
              <p className="font-bold">Note:</p>
              <p>Forms billing is separate from Scheduler credits. Media uploads count as premium response units and are tracked in your usage.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
