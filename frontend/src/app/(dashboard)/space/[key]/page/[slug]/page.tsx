"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Save,
  Clock,
  Eye,
  Edit2,
  MoreHorizontal,
  Trash2,
  History,
  Loader2,
  Check,
} from "lucide-react";
import { spacesApi, pagesApi } from "@/lib/api";
import { useSpaceStore, useAIStore } from "@/lib/store";
import type { Page, Space } from "@/types";
import { formatDateTime } from "@/lib/utils";
import { PageEditor } from "@/components/editor/PageEditor";
import { VersionHistoryModal } from "@/components/pages/VersionHistoryModal";

export default function PageViewPage() {
  const params = useParams();
  const router = useRouter();
  const { setCurrentSpace, setPageTree } = useSpaceStore();
  const { setPageContext, pageReloadTrigger } = useAIStore();
  const [space, setSpace] = useState<Space | null>(null);
  const [page, setPage] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isEditing, setIsEditing] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [content, setContent] = useState<Record<string, unknown> | null>(null);
  const [title, setTitle] = useState("");
  const [aiEditFlash, setAiEditFlash] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const prevReloadTriggerRef = useRef(0);

  useEffect(() => {
    const load = async () => {
      try {
        const spaceKey = params.key as string;
        const slug = params.slug as string;

        const spaceData = await spacesApi.getByKey(spaceKey);
        setSpace(spaceData);
        setCurrentSpace(spaceData);

        const pageData = await pagesApi.getBySlug(spaceData.id, slug);
        setPage(pageData);
        setContent(pageData.content_json);
        setTitle(pageData.title);

        const tree = await pagesApi.getTree(spaceData.id);
        setPageTree(tree);
      } catch {
        router.push("/dashboard");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [params.key, params.slug, router, setCurrentSpace, setPageTree]);

  const handleSave = useCallback(async () => {
    if (!page) return;

    setSaving(true);
    try {
      const updated = await pagesApi.update(page.id, {
        title,
        content_json: content || undefined,
      });
      setPage(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error("Failed to save:", error);
    } finally {
      setSaving(false);
    }
  }, [page, title, content]);

  const handleContentChange = useCallback(
    (newContent: Record<string, unknown>) => {
      setContent(newContent);

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        handleSave();
      }, 2000);
    },
    [handleSave]
  );

  const handlePublish = async () => {
    if (!page) return;

    setSaving(true);
    try {
      const updated = await pagesApi.update(page.id, {
        status: "published",
      });
      setPage(updated);

      if (space) {
        const tree = await pagesApi.getTree(space.id);
        setPageTree(tree);
      }
    } catch (error) {
      console.error("Failed to publish:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!page || !space) return;

    if (!confirm("Are you sure you want to delete this page?")) return;

    try {
      await pagesApi.delete(page.id);
      const tree = await pagesApi.getTree(space.id);
      setPageTree(tree);
      router.push(`/space/${space.key}`);
    } catch (error) {
      console.error("Failed to delete:", error);
    }
  };

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Update AI context when page is loaded
  useEffect(() => {
    if (page && space) {
      setPageContext({
        pageId: page.id,
        pageTitle: page.title,
        spaceId: space.id,
      });
    }
    return () => {
      setPageContext(null);
    };
  }, [page, space, setPageContext]);

  // Reload page content when AI edits it
  useEffect(() => {
    // Only trigger reload if the trigger value actually changed (not initial mount)
    if (pageReloadTrigger > 0 && pageReloadTrigger !== prevReloadTriggerRef.current && page && space) {
      const reloadPage = async () => {
        try {
          const pageData = await pagesApi.getBySlug(space.id, page.slug);
          setPage(pageData);
          setContent(pageData.content_json);
          setTitle(pageData.title);
          
          // Trigger flash animation
          setAiEditFlash(true);
          setTimeout(() => setAiEditFlash(false), 1500);
        } catch (error) {
          console.error("Failed to reload page:", error);
        }
      };
      reloadPage();
    }
    prevReloadTriggerRef.current = pageReloadTrigger;
  }, [pageReloadTrigger, page, space]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-[#9b9b9b]" />
      </div>
    );
  }

  if (!page || !space) return null;

  return (
    <div className="h-full flex flex-col bg-[#191919]">
      {/* Header */}
      <div className="border-b border-[#2d2d2d] px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            className={`px-2 py-0.5 text-xs rounded ${
              page.status === "published"
                ? "bg-[#2e7d32]/20 text-[#66bb6a]"
                : "bg-[#f9a825]/20 text-[#ffca28]"
            }`}
          >
            {page.status}
          </span>
          <span className="text-xs text-[#6b6b6b] flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            Updated {formatDateTime(page.updated_at)}
          </span>
          <span className="text-xs text-[#6b6b6b]">v{page.version}</span>
        </div>

        <div className="flex items-center gap-1.5">
          {saving ? (
            <span className="text-xs text-[#9b9b9b] flex items-center gap-1.5 px-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Saving...
            </span>
          ) : saved ? (
            <span className="text-xs text-[#66bb6a] flex items-center gap-1.5 px-2">
              <Check className="w-3.5 h-3.5" />
              Saved
            </span>
          ) : null}

          <button
            onClick={() => setIsEditing(!isEditing)}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded transition-colors ${
              isEditing
                ? "bg-[#2383e2] text-white"
                : "bg-[#2d2d2d] text-[#9b9b9b] hover:bg-[#373737]"
            }`}
          >
            {isEditing ? (
              <>
                <Eye className="w-3.5 h-3.5" />
                Preview
              </>
            ) : (
              <>
                <Edit2 className="w-3.5 h-3.5" />
                Edit
              </>
            )}
          </button>

          {page.status === "draft" && (
            <button
              onClick={handlePublish}
              disabled={saving}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-[#2e7d32] hover:bg-[#388e3c] text-white rounded transition-colors disabled:opacity-50"
            >
              Publish
            </button>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-[#2383e2] hover:bg-[#1a6fc2] text-white rounded transition-colors disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            Save
          </button>

          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 hover:bg-[#2d2d2d] rounded transition-colors text-[#9b9b9b]"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 top-full mt-1 w-44 bg-[#252525] border border-[#373737] rounded-md shadow-lg z-20 py-1">
                  <button
                    onClick={() => {
                      setShowVersions(true);
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-[#e3e3e3] hover:bg-[#2d2d2d] transition-colors"
                  >
                    <History className="w-4 h-4" />
                    Version History
                  </button>
                  <button
                    onClick={() => {
                      handleDelete();
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-[#eb5757] hover:bg-[#2d2d2d] transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Page
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto relative">
        {/* AI Edit Flash Animation */}
        <AnimatePresence>
          {aiEditFlash && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 pointer-events-none z-20"
            >
              {/* Gradient overlay */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.3, 0] }}
                transition={{ duration: 1.5 }}
                className="absolute inset-0 bg-gradient-to-b from-purple-500/20 via-transparent to-transparent"
              />
              {/* Sparkle border effect */}
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: [0, 1, 0], scale: [0.98, 1, 1] }}
                transition={{ duration: 1.2 }}
                className="absolute inset-4 border-2 border-purple-500/50 rounded-lg"
              />
              {/* Success indicator */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: [0, 1, 1, 0], y: [-20, 0, 0, -10] }}
                transition={{ duration: 1.5, times: [0, 0.2, 0.8, 1] }}
                className="absolute top-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-medium rounded-full shadow-lg shadow-purple-500/25 flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                Page updated by AI
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="max-w-3xl mx-auto px-12 py-12">
          {isEditing ? (
            <>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-4xl font-bold text-[#e3e3e3] bg-transparent border-none outline-none mb-6 placeholder-[#4b4b4b]"
                placeholder="Untitled"
              />
              <PageEditor
                content={content}
                onChange={handleContentChange}
                editable
              />
            </>
          ) : (
            <>
              <h1 className="text-4xl font-bold text-[#e3e3e3] mb-6">{title}</h1>
              <PageEditor content={content} onChange={() => {}} editable={false} />
            </>
          )}
        </div>
      </div>

      <VersionHistoryModal
        open={showVersions}
        onClose={() => setShowVersions(false)}
        pageId={page.id}
        currentVersion={page.version}
      />
    </div>
  );
}
