"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { Sparkles, Send, Loader2, X, Wand2, GripHorizontal } from "lucide-react";
import { aiApi } from "@/lib/api";
import { useAIStore } from "@/lib/store";

interface AISelectionPopupProps {
  selectedText: string;
  position: { x: number; y: number };
  onClose: () => void;
  onReplace: (newText: string) => void;
}

export function AISelectionPopup({
  selectedText,
  position,
  onClose,
  onReplace,
}: AISelectionPopupProps) {
  const { aiEnabled } = useAIStore();
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || loading || !aiEnabled) return;

    setLoading(true);

    try {
      const response = await aiApi.editText(selectedText, prompt);
      onReplace(response.edited_text);
    } catch (error) {
      console.error("Failed to edit text:", error);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    { label: "Improve writing", prompt: "Improve the writing quality and clarity" },
    { label: "Fix grammar", prompt: "Fix any grammar and spelling errors" },
    { label: "Make shorter", prompt: "Make this text more concise" },
    { label: "Make longer", prompt: "Expand on this text with more details" },
    { label: "Simplify", prompt: "Simplify this text for easier understanding" },
    { label: "Professional", prompt: "Make this text more professional" },
  ];

  const handleQuickAction = async (actionPrompt: string) => {
    if (loading || !aiEnabled) return;

    setLoading(true);

    try {
      const response = await aiApi.editText(selectedText, actionPrompt);
      onReplace(response.edited_text);
    } catch (error) {
      console.error("Failed to edit text:", error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate position to keep popup in viewport
  // If near bottom, show above selection instead
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
  const popupHeight = 280; // Approximate popup height
  const showAbove = position.y + popupHeight > viewportHeight - 20;
  
  const adjustedPosition = {
    x: Math.max(10, Math.min(position.x, (typeof window !== 'undefined' ? window.innerWidth : 1200) - 320)),
    y: showAbove ? Math.max(10, position.y - popupHeight - 20) : Math.max(10, position.y),
  };

  return (
    <AnimatePresence>
      <motion.div
        ref={popupRef}
        drag
        dragControls={dragControls}
        dragMomentum={false}
        dragElastic={0}
        initial={{ opacity: 0, scale: 0.9, y: showAbove ? -10 : 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: showAbove ? -10 : 10 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        style={{
          position: "fixed",
          left: adjustedPosition.x,
          top: adjustedPosition.y,
          zIndex: 100,
        }}
        className="w-[300px] bg-[#252525] border border-[#373737] rounded-xl shadow-2xl overflow-hidden cursor-default"
      >
        {/* Draggable Header */}
        <div 
          className="flex items-center justify-between px-3 py-2 border-b border-[#373737] bg-[#202020] cursor-grab active:cursor-grabbing"
          onPointerDown={(e) => dragControls.start(e)}
        >
          <div className="flex items-center gap-2">
            <GripHorizontal className="w-4 h-4 text-[#6b6b6b]" />
            <motion.div
              animate={{ rotate: [0, 15, -15, 0] }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="w-6 h-6 rounded-md bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center"
            >
              <Wand2 className="w-3.5 h-3.5 text-white" />
            </motion.div>
            <span className="text-sm font-medium text-[#e3e3e3]">Edit with AI</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[#373737] text-[#9b9b9b] hover:text-[#e3e3e3] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Selected text preview */}
        <div className="px-3 py-2 border-b border-[#373737]">
          <p className="text-xs text-[#6b6b6b] mb-1">Selected text:</p>
          <p className="text-xs text-[#9b9b9b] line-clamp-2 italic">
            "{selectedText.slice(0, 100)}{selectedText.length > 100 ? "..." : ""}"
          </p>
        </div>

        {/* Quick actions */}
        <div className="p-2">
          <div className="flex flex-wrap gap-1.5 mb-2">
            {quickActions.map((action) => (
              <motion.button
                key={action.label}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleQuickAction(action.prompt)}
                disabled={loading || !aiEnabled}
                className="px-2.5 py-1 text-xs rounded-full bg-[#2d2d2d] hover:bg-[#373737] text-[#9b9b9b] hover:text-[#e3e3e3] transition-colors disabled:opacity-50"
              >
                {action.label}
              </motion.button>
            ))}
          </div>

          {/* Custom prompt input */}
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Or type custom instruction..."
              disabled={loading || !aiEnabled}
              className="flex-1 px-3 py-2 bg-[#2d2d2d] border border-[#373737] rounded-lg text-sm text-[#e3e3e3] placeholder-[#6b6b6b] focus:outline-none focus:border-purple-500 disabled:opacity-50"
            />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="submit"
              disabled={!prompt.trim() || loading || !aiEnabled}
              className="px-3 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 rounded-lg text-white transition-all"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </motion.button>
          </form>
        </div>

        {/* Loading overlay */}
        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#202020]/80 backdrop-blur-sm flex items-center justify-center"
            >
              <div className="flex flex-col items-center gap-2">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <Sparkles className="w-6 h-6 text-purple-400" />
                </motion.div>
                <span className="text-sm text-[#9b9b9b]">Editing...</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}

