import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Check, Zap, Users, Mail, Layers } from "lucide-react";
import SchedoraLogo from "@/components/SchedoraLogo";

const API = "/api";

const PRODUCT_CARDS = [
  {
    title: "Scheduler",
    subtitle: "Schedule posts across channels with precision.",
    pricing: "Credits",
    items: ["Create post = 2 credits", "Publish to platform = 3–5 credits", "AI content generation = 1 credit"],
    icon: Zap,
  },
  {
    title: "Tasks",
    subtitle: "Track work, notes, and todos without extra usage fees.",
    pricing: "Free + subscription",
    items: ["Basic tasks are free", "Pro unlocks workflow features", "Business enables team hierarchy"],
    icon: Layers,
  },
  {
    title: "Teams",
    subtitle: "Run project work and collaboration with clear team pricing.",
    pricing: "Subscription",
    items: ["Free basic team access", "Pro supports 5 members", "Business supports unlimited members"],
    icon: Users,
  },
  {
    title: "Forms",
    subtitle: "Collect responses with usage-based billing.",
    pricing: "Responses",
    items: ["50 free responses / month", "Media uploads are tracked separately", "Purchase response packages anytime"],
    icon: Mail,
  },
];

const CREDIT_PACKAGES = [
  { id: "pack_200", label: "Starter", price: 199, credits: 200 },
  { id: "pack_600", label: "Popular", price: 499, credits: 600, highlight: true },
  { id: "pack_1500", label: "Power", price: 999, credits: 1500 },
];

const SUBSCRIPTION_PLANS = [
  {
    id: "pro",
    title: "PRO",
    price: 999,
    items: ["Priority processing", "Advanced scheduler features", "Basic analytics", "Up to 5 team members"],
  },
  {
    id: "business",
    title: "BUSINESS",
    price: 2999,
    items: ["Full team workflows", "Advanced analytics", "Role hierarchy", "Unlimited team members"],
    highlight: true,
  },
];

const FORM_PLANS = [
  { title: "Free", price: "₹0", details: ["50 responses / month", "Text submissions free", "Media uploads tracked"] },
  { title: "100 responses", price: "₹99", details: ["100 response credits", "Best for light forms", "Buffer for media uploads"] },
  { title: "500 responses", price: "₹399", details: ["500 response credits", "For growing forms", "Great for recurring surveys"] },
  { title: "2000 responses", price: "₹999", details: ["2000 response credits", "Scale with heavier forms", "Built for campaigns"] },
];

const COMPARISON_ROWS = [
  { feature: "Scheduler access", free: "Basic", pro: "Advanced", business: "Advanced" },
  { feature: "Tasks", free: "Free", pro: "Free", business: "Free" },
  { feature: "Teams", free: "1 team", pro: "Up to 5 members", business: "Unlimited members" },
  { feature: "Forms", free: "50 responses / month", pro: "Response packs", business: "Response packs" },
  { feature: "Analytics", free: "Basic", pro: "Basic", business: "Advanced" },
  { feature: "Roles", free: "None", pro: "Manager role", business: "Hierarchy" },
  { feature: "Priority support", free: "No", pro: "No", business: "Yes" },
];

const FAQ_ITEMS = [
  { q: "Do I need to pay for all products?", a: "No. Micronova is modular, so you only pay for the products you use." },
  { q: "Can I use only one product?", a: "Yes. Scheduler, Tasks, Teams, and Forms all work independently." },
  { q: "When are credits used?", a: "Credits are used only for Scheduler actions like creating posts and generating content." },
  { q: "Do credits expire?", a: "Credits do not expire while your account is active." },
  { q: "What happens if I run out of credits?", a: "Buy another pack anytime to continue scheduling without interruption." },
  { q: "Can I upgrade later?", a: "Yes. Upgrade anytime to Pro or Business and keep using your credits." },
  { q: "Are tasks free?", a: "Yes. Basic tasks are free, with subscriptions unlocking advanced team workflows." },
  { q: "How are posts charged?", a: "Scheduler posts are charged: create = 2 credits, publish = 3–5 credits, AI = 1 credit." },
];

export default function PricingPage() {
  const navigate = useNavigate();
  const [currentPlan, setCurrentPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processingPlan, setProcessingPlan] = useState(null);
  const token = localStorage.getItem("access_token");

  useEffect(() => {
    const fetchPlan = async () => {
      try {
        if (!token) return;
        const res = await axios.get(`${API}/billing/plan`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCurrentPlan(res.data);
      } catch (err) {
        console.error("Failed to load billing plan", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPlan();
  }, [token]);

  const loadRazorpay = () => new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

  const handleSubscribe = async (planId) => {
    if (!token) { navigate("/login"); return; }
    setProcessingPlan(planId);
    try {
      const loaded = await loadRazorpay();
      if (!loaded) { toast.error("Payment service unavailable."); return; }
      const orderRes = await axios.post(`${API}/billing/subscribe`, { plan: planId }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const { order_id, amount, currency, key } = orderRes.data;
      const options = {
        key,
        amount,
        currency,
        name: "Micronova",
        description: `${planId.toUpperCase()} subscription`,
        order_id,
        handler: async (response) => {
          try {
            await axios.post(`${API}/verify-payment`, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              plan: planId,
            }, { headers: { Authorization: `Bearer ${token}` } });
            toast.success("Subscription activated.");
            const planRes = await axios.get(`${API}/billing/plan`, { headers: { Authorization: `Bearer ${token}` } });
            setCurrentPlan(planRes.data);
            navigate("/dashboard");
          } catch (err) {
            toast.error(err.response?.data?.detail || "Payment verification failed.");
          }
        },
        prefill: {},
        theme: { color: "#111827" },
      };
      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Unable to start subscription checkout.");
    } finally {
      setProcessingPlan(null);
    }
  };

  const activePlanLabel = () => {
    if (!currentPlan) return "Free";
    return currentPlan.planType ? currentPlan.planType.toUpperCase() : "Free";
  };

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="mx-auto max-w-6xl">
        <section className="text-center mb-16">
          <SchedoraLogo size="md" className="mx-auto mb-6" />
          <div className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-black bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.3em] text-text-muted shadow-brutal mb-6">
            Current plan: {loading ? "Loading..." : activePlanLabel()}
          </div>
          <h1 className="text-5xl font-black tracking-tight mb-4">Simple pricing. Pay for what you use.</h1>
          <p className="mx-auto max-w-2xl text-lg text-text-secondary">Use any Micronova product independently, or combine them as you grow. Billing stays clean and modular.</p>
        </section>

        <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4 mb-16">
          {PRODUCT_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.title} className="rounded-3xl border-4 border-black bg-white p-8 shadow-brutal">
                <div className="mb-5 inline-flex items-center gap-3 rounded-full bg-slate-100 px-4 py-2 text-xs font-black uppercase tracking-[0.24em] text-text-muted">
                  <Icon className="w-4 h-4" /> {card.title}
                </div>
                <h2 className="text-2xl font-black mb-3">{card.pricing}</h2>
                <p className="text-text-secondary mb-6">{card.subtitle}</p>
                <ul className="space-y-3 text-sm font-bold text-text-primary">
                  {card.items.map((item) => (
                    <li key={item} className="flex items-start gap-3"><Check className="w-4 h-4 text-green-600 mt-1" strokeWidth={3} />{item}</li>
                  ))}
                </ul>
              </div>
            );
          })}
        </section>

        <section className="grid gap-6 md:grid-cols-3 mb-16">
          {[
            { title: "Create post", value: "2 credits", caption: "Scheduler action" },
            { title: "AI content", value: "1 credit", caption: "Scheduler action" },
            { title: "Media form", value: "2 response units", caption: "Forms action" },
          ].map((item) => (
            <div key={item.title} className="rounded-3xl border-4 border-black bg-white p-8 shadow-brutal">
              <p className="text-xs uppercase tracking-[0.3em] font-black text-text-muted mb-3">{item.title}</p>
              <p className="text-4xl font-black mb-3">{item.value}</p>
              <p className="text-sm text-text-secondary">{item.caption}</p>
            </div>
          ))}
        </section>

        <section className="mb-16">
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] font-black text-primary mb-2">Credit packages</p>
              <h2 className="text-4xl font-black">Pay-as-you-go credits for Scheduler.</h2>
            </div>
            <p className="max-w-2xl text-text-secondary">Buy credits only when you need them and keep Scheduler billing transparent.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {CREDIT_PACKAGES.map((pack) => (
              <div key={pack.id} className={`rounded-3xl border-4 p-8 shadow-brutal ${pack.highlight ? 'border-primary bg-primary/10' : 'border-black bg-white'}`}>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <p className="text-sm uppercase tracking-[0.25em] font-black text-text-muted">{pack.label}</p>
                  {pack.highlight && <span className="rounded-full bg-black px-3 py-1 text-[10px] font-black uppercase text-white">Popular</span>}
                </div>
                <p className="text-5xl font-black mb-3">₹{pack.price}</p>
                <p className="mb-6 text-sm font-bold text-text-secondary">{pack.credits} credits</p>
                <button onClick={() => navigate('/tokens')} className={`w-full rounded-2xl px-4 py-3 text-sm font-black ${pack.highlight ? 'bg-black text-white' : 'bg-white text-black border-2 border-black'}`}>
                  Buy Credits
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-16">
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] font-black text-primary mb-2">Subscription plans</p>
              <h2 className="text-4xl font-black">Team plans built for growth.</h2>
            </div>
            <p className="max-w-2xl text-text-secondary">Choose Pro for advanced scheduling or Business for full team workflow and hierarchy.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {SUBSCRIPTION_PLANS.map((plan) => (
              <div key={plan.id} className={`rounded-3xl border-4 p-8 shadow-brutal ${plan.highlight ? 'border-primary bg-primary/10' : 'border-black bg-white'}`}>
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] font-black text-text-muted">{plan.title}</p>
                    <p className="text-4xl font-black">₹{plan.price}/mo</p>
                  </div>
                  {plan.highlight && <strong className="rounded-full bg-black px-3 py-1 text-[10px] font-black uppercase text-white">Best value</strong>}
                </div>
                <ul className="space-y-3 mb-8 text-sm font-bold text-text-primary">
                  {plan.items.map((item) => (
                    <li key={item} className="flex items-start gap-3"><Check className="w-4 h-4 text-green-600 mt-1" strokeWidth={3} />{item}</li>
                  ))}
                </ul>
                <button onClick={() => handleSubscribe(plan.id)} className={`w-full rounded-2xl px-4 py-3 text-sm font-black ${plan.highlight ? 'bg-black text-white' : 'bg-white text-black border-2 border-black'}`}>
                  {processingPlan === plan.id ? 'Processing…' : `Choose ${plan.title}`}
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-16 overflow-hidden rounded-3xl border-4 border-black bg-white shadow-brutal">
          <div className="bg-black px-6 py-5 text-white">
            <h3 className="text-lg font-black">Feature comparison</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-4 border-black bg-slate-50">
                  <th className="p-4 text-left font-black">Feature</th>
                  <th className="p-4 text-center font-black">Free</th>
                  <th className="p-4 text-center font-black">Pro</th>
                  <th className="p-4 text-center font-black">Business</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row, idx) => (
                  <tr key={row.feature} className={`border-b border-black/10 ${idx % 2 === 1 ? 'bg-surface' : ''}`}>
                    <td className="p-4 font-bold text-text-primary">{row.feature}</td>
                    <td className="p-4 text-center">{row.free}</td>
                    <td className="p-4 text-center">{row.pro}</td>
                    <td className="p-4 text-center">{row.business}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-16 rounded-3xl border-4 border-black bg-slate-50 p-8 shadow-brutal">
          <h2 className="text-4xl font-black mb-6">Simple pricing for data collection</h2>
          <div className="grid gap-6 lg:grid-cols-4">
            {FORM_PLANS.map((plan) => (
              <div key={plan.title} className="rounded-3xl border-4 border-black bg-white p-6 shadow-brutal">
                <div className="mb-4 text-sm uppercase tracking-[0.24em] font-black text-text-muted">{plan.title}</div>
                <div className="text-3xl font-black mb-5">{plan.price}</div>
                <ul className="space-y-3 mb-6 text-sm font-bold text-text-primary">
                  {plan.details.map((detail) => (
                    <li key={detail} className="flex items-start gap-3"><Check className="w-4 h-4 text-green-600 mt-1" strokeWidth={3} />{detail}</li>
                  ))}
                </ul>
                {plan.price !== '₹0' && (
                  <button onClick={() => navigate('/pricing')} className="w-full rounded-2xl bg-black px-4 py-3 text-sm font-black text-white">
                    Buy this plan
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2 mb-20">
          {FAQ_ITEMS.map((item) => (
            <div key={item.q} className="rounded-3xl border-4 border-black bg-white p-8 shadow-brutal">
              <p className="text-sm font-black mb-3">{item.q}</p>
              <p className="text-text-secondary text-sm">{item.a}</p>
            </div>
          ))}
        </section>

        <p className="text-center text-sm text-text-muted">
          Micronova keeps each product billing separate: Scheduler uses credits, Forms uses response packages, and Teams uses subscriptions.
        </p>
      </div>
    </div>
  );
}
