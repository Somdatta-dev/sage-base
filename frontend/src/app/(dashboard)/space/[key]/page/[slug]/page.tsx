"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
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
import { useSpaceStore } from "@/lib/store";
import type { Page, Space } from "@/types";
import { formatDateTime } from "@/lib/utils";
import { PageEditor } from "@/components/editor/PageEditor";
import { VersionHistoryModal } from "@/components/pages/VersionHistoryModal";

export default function PageViewPage() {
  const params = useParams();
  const router = useRouter();
  const { setCurrentSpace, setPageTree } = useSpaceStore();
  const [space, setSpace] = useState<Space | null>(null);
  const [page, setPage] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isEditing, setIsEditing] = useState(true); // Start in edit mode
  const [showMenu, setShowMenu] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [content, setContent] = useState<Record<string, unknown> | null>(null);
  const [title, setTitle] = useState("");
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

      // Auto-save after 2 seconds of inactivity
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

      // Refresh tree
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-sage-500" />
      </div>
    );
  }

  if (!page || !space) return null;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-white/10 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span
            className={`px-2 py-0.5 text-xs rounded-full ${
              page.status === "published"
                ? "bg-green-500/10 text-green-400"
                : "bg-yellow-500/10 text-yellow-400"
            }`}
          >
            {page.status}
          </span>
          <span className="text-sm text-gray-500 flex items-center gap-1">
            <Clock className="w-4 h-4" />
            Updated {formatDateTime(page.updated_at)}
          </span>
          <span className="text-sm text-gray-500">v{page.version}</span>
        </div>

        <div className="flex items-center gap-2">
          {saving ? (
            <span className="text-sm text-gray-400 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </span>
          ) : saved ? (
            <span className="text-sm text-green-400 flex items-center gap-2">
              <Check className="w-4 h-4" />
              Saved
            </span>
          ) : null}

          <button
            onClick={() => setIsEditing(!isEditing)}
            className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors ${
              isEditing
                ? "bg-sage-600 text-white"
                : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10"
            }`}
          >
            {isEditing ? (
              <>
                <Eye className="w-4 h-4" />
                Preview
              </>
            ) : (
              <>
                <Edit2 className="w-4 h-4" />
                Edit
              </>
            )}
          </button>

          {page.status === "draft" && (
            <button
              onClick={handlePublish}
              disabled={saving}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              Publish
            </button>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-sage-600 hover:bg-sage-500 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            Save
          </button>

          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 top-full mt-1 w-48 bg-slate-800 border border-white/10 rounded-lg shadow-xl z-20 py-1">
                  <button
                    onClick={() => {
                      setShowVersions(true);
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:bg-white/5 transition-colors"
                  >
                    <History className="w-4 h-4" />
                    Version History
                  </button>
                  <button
                    onClick={() => {
                      handleDelete();
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-white/5 transition-colors"
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
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-8 py-10">
          {isEditing ? (
            <>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-4xl font-bold text-white bg-transparent border-none outline-none mb-8 placeholder-gray-600"
                placeholder="Page Title"
              />
              <PageEditor
                content={content}
                onChange={handleContentChange}
                editable
              />
            </>
          ) : (
            <>
              <h1 className="text-4xl font-bold text-white mb-8">{title}</h1>
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

