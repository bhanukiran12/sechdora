import { motion, AnimatePresence } from "framer-motion";
import { X, Zap, ArrowRight, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function UpgradeModal({ isOpen, onClose, message, feature }) {
  const navigate = useNavigate();

  const handleUpgrade = () => {
    onClose();
    navigate("/pricing");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", duration: 0.4 }}
            className="relative z-10 w-full max-w-4xl overflow-hidden rounded-[28px] border border-border bg-white p-6 shadow-brutal-lg md:p-8"
          >
            <button
              onClick={onClose}
              className="absolute right-4 top-4 rounded-full border border-border bg-white p-2 transition-colors hover:bg-gray-50"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="rounded-[24px] bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-text-muted">
                  <Zap className="h-3 w-3 text-primary" />
                  Upgrade
                </div>
                <h2 className="mt-4 text-3xl font-black tracking-tight text-text-primary">
                  Unlock the team workflow
                </h2>
                <p className="mt-3 text-sm leading-6 text-text-secondary">
                  {message || "Upgrade your plan to unlock this feature and keep content, tasks, and publishing in one streamlined workspace."}
                </p>

                {feature && (
                  <div className="mt-4 rounded-2xl border border-border bg-white p-4 text-sm font-medium text-text-primary shadow-brutal">
                    Feature requested: <span className="font-semibold">{feature}</span>
                  </div>
                )}

                <div className="mt-6 space-y-3 text-sm text-text-secondary">
                  {["Higher limits", "Team collaboration", "Priority workflows"].map((item) => (
                    <div key={item} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-500" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  { name: "Free", accent: "bg-white", note: "Solo workflow", cta: "Stay Free" },
                  { name: "Pro", accent: "bg-blue-50", note: "Small teams", cta: "See Pro" },
                  { name: "Business", accent: "bg-primary/10 ring-2 ring-primary", note: "Recommended", cta: "Go Business" },
                ].map((plan) => (
                  <div key={plan.name} className={`rounded-[24px] border border-border p-4 shadow-brutal ${plan.accent}`}>
                    <div className="text-[10px] font-black uppercase tracking-[0.24em] text-text-muted">{plan.name}</div>
                    <div className="mt-3 text-xl font-black tracking-tight text-text-primary">{plan.note}</div>
                    <p className="mt-2 text-sm text-text-secondary">Clean pricing with only the essentials surfaced.</p>
                    <button
                      onClick={handleUpgrade}
                      className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5"
                    >
                      {plan.cta}
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
