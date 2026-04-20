import { motion, AnimatePresence } from "framer-motion";
import { X, Zap, ArrowRight } from "lucide-react";
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
            className="relative z-10 bg-white border-4 border-black rounded-2xl shadow-brutal-lg w-full max-w-md p-8"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1 hover:bg-black/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center justify-center w-14 h-14 bg-primary rounded-xl border-4 border-black shadow-brutal mb-6 mx-auto">
              <Zap className="w-7 h-7 text-white" strokeWidth={3} />
            </div>

            <h2 className="text-2xl font-black text-center mb-3 leading-tight">
              Upgrade Your Plan
            </h2>

            <p className="text-text-secondary text-center mb-6 font-medium">
              {message || "Upgrade your plan to unlock this feature and take your social media to the next level."}
            </p>

            {feature && (
              <div className="bg-yellow-50 border-2 border-yellow-400 rounded-xl p-3 mb-6 text-sm font-bold text-center text-yellow-800">
                Feature: {feature}
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={handleUpgrade}
                className="w-full brutal-button bg-primary text-white py-3 font-black flex items-center justify-center gap-2 text-base"
              >
                <Zap className="w-5 h-5" strokeWidth={3} />
                View Pricing Plans
                <ArrowRight className="w-5 h-5" strokeWidth={3} />
              </button>
              <button
                onClick={onClose}
                className="w-full brutal-button bg-white text-text-primary py-3 font-bold text-sm"
              >
                Maybe Later
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
