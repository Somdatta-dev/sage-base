"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Loader2 } from "lucide-react";
import { pagesApi } from "@/lib/api";
import { useSpaceStore } from "@/lib/store";

interface CreatePageModalProps {
  open: boolean;
  onClose: () => void;
  spaceId: number;
  spaceKey: string;
  parentId?: number;
}

export function CreatePageModal({
  open,
  onClose,
  spaceId,
  spaceKey,
  parentId,
}: CreatePageModalProps) {
  const router = useRouter();
  const { setPageTree } = useSpaceStore();
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const page = await pagesApi.create({
        space_id: spaceId,
        parent_id: parentId || null,
        title,
        status: "draft",
      });

      // Refresh page tree
      const tree = await pagesApi.getTree(spaceId);
      setPageTree(tree);

      // Navigate to new page
      router.push(`/space/${spaceKey}/page/${page.slug}`);
      onClose();
      setTitle("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create page");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl shadow-2xl animate-fade-in">
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-xl font-semibold text-white">Create New Page</h2>
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

          <div>
            <label
              htmlFor="page-title"
              className="block text-sm font-medium text-gray-300 mb-2"
            >
              Page Title
            </label>
            <input
              id="page-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-transparent transition-all"
              placeholder="Getting Started"
              autoFocus
              required
            />
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-white/5 hover:bg-white/10 text-white font-medium rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !title}
              className="flex-1 py-3 px-4 bg-gradient-to-r from-sage-600 to-sage-700 hover:from-sage-500 hover:to-sage-600 text-white font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Page"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

