import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Star, X, Check, Copy } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "https://sechdora.onrender.com";
const API = `${BACKEND_URL}/api`;

const QUICK_TAGS = [
  "Easy to use",
  "Confusing UI",
  "Fast scheduling",
  "Bugs/issues",
  "Loved AI feature",
];

const TESTIMONIAL_PROMPT = "Schedora made scheduling my social posts feel effortless. The AI tools are fast, intuitive, and genuinely save me time every week.";

export default function FeedbackModal({ isOpen, onClose, celebration = false }) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [message, setMessage] = useState("");
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [userId, setUserId] = useState("");
  const [followUpText, setFollowUpText] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    setRating(0);
    setHoverRating(0);
    setMessage("");
    setTags([]);
    setLoading(false);
    setSubmitted(false);
    setCopied(false);
    setFollowUpText("");

    const loadMe = async () => {
      try {
        const token = localStorage.getItem("access_token");
        const res = await axios.get(`${API}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        });
        setUserId(res.data?._id || "");
      } catch {
        setUserId("");
      }
    };

    loadMe();
  }, [isOpen]);

  const toggleTag = (tag) => {
    setTags((prev) => (
      prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag]
    ));
  };

  const copyTestimonial = async () => {
    try {
      await navigator.clipboard.writeText(TESTIMONIAL_PROMPT);
      setCopied(true);
      toast.success("Testimonial copied!");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Could not copy testimonial");
    }
  };

  const handleClose = () => {
    setSubmitted(false);
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rating) {
      toast.error("Please select a rating");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const payload = {
        userId,
        rating,
        message: message.trim(),
        tags,
        createdAt: new Date().toISOString(),
      };

      await axios.post(`${API}/feedback`, payload, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });

      const nextStep = rating >= 4
        ? "Glad you like it! Would you like to share a testimonial?"
        : rating <= 2
          ? "Sorry about that. We'll fix it soon."
          : "Thanks for your feedback!";

      setFollowUpText(nextStep);
      setSubmitted(true);
      toast.success("Thanks for your feedback!");

      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      toast.error("Failed to submit feedback");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && handleClose()}
        >
          <motion.div
            initial={{ scale: 0.92, y: 24, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.92, y: 24, opacity: 0 }}
            transition={{ type: "spring", stiffness: 520, damping: 36 }}
            className="w-full max-w-md overflow-hidden rounded-xl border-4 border-black bg-white shadow-brutal-lg"
          >
            <div className={`relative border-b-4 border-black p-6 ${celebration ? "bg-aiAccent" : "bg-background"}`}>
              <button
                onClick={handleClose}
                className="absolute right-4 top-4 rounded-full border-2 border-black bg-white p-2 shadow-brutal transition-transform hover:-translate-y-0.5"
              >
                <X className="w-4 h-4" strokeWidth={3} />
              </button>

              {submitted ? (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="pr-8">
                  <div className="mb-2 text-4xl">✨</div>
                  <h2 className="text-2xl font-black font-heading tracking-tight">{followUpText}</h2>
                  <p className="mt-2 text-sm font-bold text-text-secondary">
                    Your input helps us make Schedora better for the next post.
                  </p>
                </motion.div>
              ) : (
                <div className="pr-8">
                  <div className="mb-3 text-4xl">{celebration ? "🎉" : "💬"}</div>
                  <h2 className="text-2xl font-black font-heading tracking-tight">
                    Your first post is live!
                  </h2>
                  <p className="mt-1 text-sm font-bold text-text-secondary">
                    How was your experience with Schedora?
                  </p>
                </div>
              )}
            </div>

            <div className="p-6">
              {submitted ? (
                <div className="space-y-4">
                  {rating >= 4 && (
                    <div className="rounded-xl border-4 border-black bg-aiAccent/30 p-4">
                      <p className="text-xs font-black uppercase tracking-widest text-text-muted">
                        Next step
                      </p>
                      <p className="mt-2 text-sm font-bold text-text-primary">
                        Would you like to share a testimonial?
                      </p>
                      <button
                        onClick={copyTestimonial}
                        className="mt-4 w-full brutal-button bg-primary text-white flex items-center justify-center gap-2 rounded-xl"
                      >
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        {copied ? "Copied" : "Copy testimonial"}
                      </button>
                    </div>
                  )}
                  <div className="rounded-xl border-4 border-black bg-white p-4 text-sm font-bold text-text-secondary">
                    {rating <= 2 ? "Thanks for flagging it. We'll improve this fast." : "Thanks for helping us improve."}
                  </div>
                </div>
              ) : (
                <motion.form
                  onSubmit={handleSubmit}
                  className="space-y-6"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div>
                    <label className="mb-3 block text-[10px] font-black uppercase tracking-widest text-text-muted">
                      Quick rating
                    </label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setRating(value)}
                          onMouseEnter={() => setHoverRating(value)}
                          onMouseLeave={() => setHoverRating(0)}
                          className="transition-transform hover:scale-110 active:scale-95"
                        >
                          <Star
                            className={`w-9 h-9 ${value <= (hoverRating || rating) ? "fill-primary text-primary" : "text-black/15"}`}
                            strokeWidth={1.75}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="mb-3 block text-[10px] font-black uppercase tracking-widest text-text-muted">
                      Optional feedback
                    </label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="What went well? What can we improve?"
                      className="brutal-input h-28 w-full resize-none rounded-xl text-sm"
                    />
                  </div>

                  <div>
                    <label className="mb-3 block text-[10px] font-black uppercase tracking-widest text-text-muted">
                      Quick tags
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {QUICK_TAGS.map((tag) => {
                        const active = tags.includes(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => toggleTag(tag)}
                            className={`rounded-full border-2 border-black px-3 py-2 text-xs font-black transition-all ${
                              active ? "bg-black text-white shadow-brutal" : "bg-white text-text-primary hover:bg-gray-50"
                            }`}
                          >
                            {tag}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={handleClose}
                      className="brutal-button flex-1 rounded-xl bg-white text-text-primary"
                    >
                      Skip
                    </button>
                    <button
                      type="submit"
                      disabled={loading || rating === 0}
                      className="brutal-button flex-1 rounded-xl bg-primary text-white"
                    >
                      {loading ? "Submitting..." : "Submit Feedback"}
                    </button>
                  </div>
                </motion.form>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
