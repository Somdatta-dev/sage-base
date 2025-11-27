"use client";

import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { spacesApi } from "@/lib/api";
import { useSpaceStore } from "@/lib/store";
import { generateSpaceKey } from "@/lib/utils";

interface CreateSpaceModalProps {
  open: boolean;
  onClose: () => void;
}

const SPACE_ICONS = ["📚", "🚀", "💡", "🔧", "📱", "🎨", "📊", "🔒", "🌐", "⚡"];

export function CreateSpaceModal({ open, onClose }: CreateSpaceModalProps) {
  const { spaces, setSpaces } = useSpaceStore();
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("📚");
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleNameChange = (value: string) => {
    setName(value);
    if (!key || key === generateSpaceKey(name)) {
      setKey(generateSpaceKey(value));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const space = await spacesApi.create({
        name,
        key,
        description: description || undefined,
        icon,
        is_private: isPrivate,
      });
      setSpaces([...spaces, space]);
      onClose();
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create space");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName("");
    setKey("");
    setDescription("");
    setIcon("📚");
    setIsPrivate(false);
    setError("");
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-lg bg-slate-900 border border-white/10 rounded-2xl shadow-2xl animate-fade-in">
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-xl font-semibold text-white">Create New Space</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-5">
            {/* Icon Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Icon
              </label>
              <div className="flex flex-wrap gap-2">
                {SPACE_ICONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setIcon(emoji)}
                    className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all ${
                      icon === emoji
                        ? "bg-sage-600 ring-2 ring-sage-400"
                        : "bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Name */}
            <div>
              <label
                htmlFor="space-name"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Space Name
              </label>
              <input
                id="space-name"
                type="text"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-transparent transition-all"
                placeholder="Engineering Docs"
                required
              />
            </div>

            {/* Key */}
            <div>
              <label
                htmlFor="space-key"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Space Key
              </label>
              <input
                id="space-key"
                type="text"
                value={key}
                onChange={(e) => setKey(e.target.value.toUpperCase())}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-transparent transition-all font-mono"
                placeholder="ENG"
                maxLength={10}
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                Used in URLs: /space/{key || "KEY"}
              </p>
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="space-desc"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Description (optional)
              </label>
              <textarea
                id="space-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-transparent transition-all resize-none"
                placeholder="A short description of this space..."
                rows={2}
              />
            </div>

            {/* Privacy */}
            <div className="flex items-center gap-3">
              <input
                id="space-private"
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="w-4 h-4 rounded bg-white/5 border-white/10 text-sage-600 focus:ring-sage-500"
              />
              <label
                htmlFor="space-private"
                className="text-sm text-gray-300"
              >
                Make this space private (only you can access)
              </label>
            </div>
          </div>

          <div className="flex gap-3 mt-8">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-white/5 hover:bg-white/10 text-white font-medium rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name || !key}
              className="flex-1 py-3 px-4 bg-gradient-to-r from-sage-600 to-sage-700 hover:from-sage-500 hover:to-sage-600 text-white font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Space"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

