import { useState } from "react";
import { AlertTriangle, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TokenWarningModal({
  isOpen,
  onClose,
  onConfirm,
  onOptimize,
  tokensRequired,
  content,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white border-4 border-black rounded-2xl p-6 max-w-md w-full mx-4 shadow-brutal-lg">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1 hover:bg-gray-100 rounded-full"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-yellow-100 border-2 border-yellow-400 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-yellow-600" strokeWidth={3} />
          </div>

          <h2 className="text-xl font-black mb-2">⚠️ Link detected in your post</h2>
          <p className="text-text-secondary mb-4">
            Posts with links consume significantly more credits.
          </p>

          <div className="bg-gray-50 border-2 border-black rounded-xl p-4 mb-6 text-left">
            <div className="flex justify-between font-bold mb-2">
              <span>This post will use:</span>
              <span className="text-red-600">{tokensRequired} credits</span>
            </div>
            <div className="text-sm text-text-muted">
              Standard posts use only 3 credits
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={onOptimize}
              className="brutal-button bg-aiAccent text-black flex items-center justify-center gap-2 w-full"
            >
              <Sparkles className="w-4 h-4" />
              Optimize Post (Recommended)
            </button>
            <button
              onClick={onConfirm}
              className="brutal-button bg-primary text-white w-full"
            >
              Post Anyway
            </button>
            <button
              onClick={onClose}
              className="text-sm font-bold text-text-muted hover:text-text-primary"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}