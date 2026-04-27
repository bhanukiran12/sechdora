import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Check, X, Zap, Crown, Star } from "lucide-react";
import SchedoraLogo from "@/components/SchedoraLogo";

const BACKEND_URL = "/api";
const API = "/api";

const DEFAULT_PLANS = [
  { id: "free", name: "Free", price: 0, maxAccounts: 1, maxPostsPerMonth: 10, aiEnabled: false, prioritySupport: false },
  { id: "pro", name: "Pro", price: 999, maxAccounts: 5, maxPostsPerMonth: 100, aiEnabled: true, prioritySupport: false },
  { id: "business", name: "Business", price: 2999, maxAccounts: 15, maxPostsPerMonth: "unlimited", aiEnabled: true, prioritySupport: true },
];

const FEATURES = [
  { key: "maxAccounts", label: "Connected Accounts", format: (v) => v },
  { key: "maxPostsPerMonth", label: "Posts / Month", format: (v) => v === "unlimited" ? "Unlimited" : v },
  { key: "aiEnabled", label: "AI Content Generation", bool: true },
  { key: "prioritySupport", label: "Priority Support", bool: true },
];

export default function PricingPage() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState(DEFAULT_PLANS);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(null);
  const [token] = useState(() => localStorage.getItem("access_token"));

  useEffect(() => {
    const fetchData = async () => {
      try {
        const plansRes = await axios.get(`${API}/pricing/plans`);
        const plansData = plansRes.data;
        setPlans(Array.isArray(plansData) ? plansData : []);
        if (token) {
          const planRes = await axios.get(`${API}/user/plan`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setCurrentPlan(planRes.data);
        }
      } catch (err) {
        console.error("Failed to fetch plans:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token]);

  const loadRazorpay = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) { resolve(true); return; }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleUpgrade = async (planId) => {
    if (!token) { navigate("/login"); return; }
    if (planId === "free") return;
    setPaying(planId);
    try {
      const loaded = await loadRazorpay();
      if (!loaded) { toast.error("Payment service unavailable. Try again."); return; }

      const orderRes = await axios.post(`${API}/create-order`, { plan: planId }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const { order_id, amount, currency, key } = orderRes.data;

      const options = {
        key,
        amount,
        currency,
        name: "Schedora",
        description: `${planId.charAt(0).toUpperCase() + planId.slice(1)} Plan`,
        order_id,
        handler: async (response) => {
          try {
            const verifyRes = await axios.post(`${API}/verify-payment`, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              plan: planId,
            }, { headers: { Authorization: `Bearer ${token}` } });
            toast.success(verifyRes.data.message);
            const planRes = await axios.get(`${API}/user/plan`, { headers: { Authorization: `Bearer ${token}` } });
            setCurrentPlan(planRes.data);
            navigate("/dashboard");
          } catch (e) {
            toast.error(e.response?.data?.detail || "Payment verification failed");
          }
        },
        prefill: { name: "", email: "" },
        theme: { color: "#FF4500" },
      };
      const rz = new window.Razorpay(options);
      rz.open();
    } catch (err) {
      const detail = err.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Failed to initiate payment");
    } finally {
      setPaying(null);
    }
  };

  const planMeta = {
    free:     { icon: Star,  color: "bg-white",   badge: null,             tagline: "For getting started",                              btnClass: "bg-white text-text-primary" },
    pro:      { icon: Zap,   color: "bg-blue-50", badge: "Popular",        tagline: "For active individual users",                       btnClass: "bg-blue-600 text-white" },
    business: { icon: Crown, color: "bg-primary", badge: "Best for teams", tagline: "Best suited for teams and higher usage needs", btnClass: "bg-black text-white" },
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-xl font-black animate-pulse">Loading plans...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <button onClick={() => navigate(token ? "/dashboard" : "/")} className="inline-block mb-8">
            <SchedoraLogo size="sm" />
          </button>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tighter mb-4">
            Plans that match your usage.
          </h1>
          <p className="text-text-secondary text-lg max-w-xl mx-auto">
            Start free. Upgrade when your usage or team grows.
          </p>
          {(currentPlan?.planType || currentPlan?.plan?.planType) && (
            <div className="mt-4 inline-block bg-yellow-100 border-2 border-yellow-400 rounded-full px-5 py-2 font-bold text-sm text-yellow-800">
              Current plan: {(currentPlan?.planType || currentPlan?.plan?.planType || 'free').charAt(0).toUpperCase() + (currentPlan?.planType || currentPlan?.plan?.planType || 'free').slice(1)}
            </div>
          )}
        </div>

        
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {Array.isArray(plans) && plans.length > 0 ? plans.map((plan) => {
            const meta = planMeta[plan.id] || planMeta.free;
            const Icon = meta.icon;
            const isCurrent = currentPlan?.planType === plan.id;
            const isBusiness = plan.id === "business";

            return (
              <div
                key={plan.id}
                className={`relative border-4 border-black rounded-2xl p-6 flex flex-col ${meta.color} ${
                  isBusiness ? "shadow-brutal-lg scale-105" : "shadow-brutal"
                } transition-transform`}
              >
                {meta.badge && (
                  <div className={`absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 ${isBusiness ? "bg-primary" : "bg-blue-600"} text-white text-xs font-black border-2 border-black rounded-full whitespace-nowrap`}>
                    {meta.badge}
                  </div>
                )}

                <div className={`w-12 h-12 rounded-xl border-2 border-black flex items-center justify-center mb-4 ${isBusiness ? "bg-black" : "bg-white"} shadow-brutal-sm`}>
                  <Icon className={`w-6 h-6 ${isBusiness ? "text-primary" : "text-text-primary"}`} strokeWidth={3} />
                </div>

                <h2 className="text-2xl font-black mb-1">{plan.name}</h2>
                <div className="text-3xl font-black mb-1">
                  {plan.price === 0 ? "Free" : `₹${plan.price.toLocaleString()}`}
                  {plan.price > 0 && <span className={`text-base font-bold ${isBusiness ? "text-white/80" : "text-text-secondary"}`}>/mo</span>}
                </div>
                <div className={`text-sm mb-2 font-medium ${isBusiness ? "text-white/80" : "text-text-secondary"}`}>
                  {plan.price === 0 ? "Forever free" : "Billed monthly"}
                </div>
                {meta.tagline && (
                  <div className={`text-xs font-bold mb-5 ${isBusiness ? "text-white/90" : "text-text-muted"}`}>
                    {meta.tagline}
                  </div>
                )}

                <ul className="space-y-2 flex-1 mb-6">
                  <li className="flex items-center gap-2 text-sm font-bold">
                    <Check className={`w-4 h-4 shrink-0 ${isBusiness ? "text-white" : "text-green-600"}`} strokeWidth={3} />
                    {plan.maxAccounts} connected account{plan.maxAccounts !== 1 ? "s" : ""}
                  </li>
                  <li className="flex items-center gap-2 text-sm font-bold">
                    <Check className={`w-4 h-4 shrink-0 ${isBusiness ? "text-white" : "text-green-600"}`} strokeWidth={3} />
                    {plan.maxPostsPerMonth === "unlimited" ? "Unlimited posts/month" : `${plan.maxPostsPerMonth} posts/month`}
                  </li>
                  {[
                    { key: "aiEnabled", label: "AI content generation" },
                    { key: "prioritySupport", label: "Priority support" },
                  ].map(({ key, label }) => (
                    <li key={key} className={`flex items-center gap-2 text-sm font-bold ${!plan[key] ? (isBusiness ? "text-white/70" : "text-text-muted") : ""}`}>
                      {plan[key]
                        ? <Check className={`w-4 h-4 shrink-0 ${isBusiness ? "text-white" : "text-green-600"}`} strokeWidth={3} />
                        : <X className={`w-4 h-4 shrink-0 ${isBusiness ? "text-white/70" : "text-text-muted"}`} strokeWidth={3} />
                      }
                      {label}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={isCurrent || plan.id === "free" || paying === plan.id}
                  className={`w-full brutal-button py-3 font-black text-sm ${meta.btnClass} ${
                    isCurrent ? "opacity-60 cursor-default" : ""
                  }`}
                >
                  {paying === plan.id ? "Processing..." :
                   isCurrent ? "Current Plan" :
                   plan.id === "free" ? "Free Forever" :
                   `Upgrade to ${plan.name}`}
                </button>
              </div>
            );
          }) : null}
        </div>

        {/* Feature Comparison Table */}
        <div className="border-4 border-black rounded-2xl overflow-hidden shadow-brutal bg-white">
          <div className="bg-black text-white p-4">
            <h3 className="text-lg font-black">Full Feature Comparison</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-4 border-black">
                  <th className="text-left p-4 font-black text-sm">Feature</th>
                  {(plans || []).map((p) => (
                    <th key={p.id} className="p-4 font-black text-sm text-center">{p.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {FEATURES.map((feat, i) => (
                  <tr key={feat.key} className={`border-b-2 border-black/10 ${i % 2 === 0 ? "" : "bg-surface"}`}>
                    <td className="p-4 font-bold text-sm">{feat.label}</td>
                    {(plans || []).map((p) => (
                      <td key={p.id} className="p-4 text-center text-sm font-bold">
                        {feat.bool ? (
                          p[feat.key]
                            ? <Check className="w-5 h-5 text-green-600 mx-auto" strokeWidth={3} />
                            : <X className="w-5 h-5 text-red-400 mx-auto" strokeWidth={3} />
                        ) : (
                          <span>{feat.format(p[feat.key])}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-center text-text-muted text-sm mt-8">
          Payments processed securely by Razorpay · Cancel anytime · No hidden fees
        </p>
      </div>
    </div>
  );
}
