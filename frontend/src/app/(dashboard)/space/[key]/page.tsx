"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Plus, FileText, Settings, MoreHorizontal, Loader2 } from "lucide-react";
import { spacesApi, pagesApi } from "@/lib/api";
import { useSpaceStore, useAIStore, useAuthStore } from "@/lib/store";
import type { Space, PageTreeItem } from "@/types";
import { PageTree } from "@/components/pages/PageTree";
import { CreatePageModal } from "@/components/pages/CreatePageModal";
import { formatDate } from "@/lib/utils";

export default function SpacePage() {
  const params = useParams();
  const router = useRouter();
  const { setCurrentSpace, setPageTree, pageTree } = useSpaceStore();
  const { setPageContext } = useAIStore();
  const { user } = useAuthStore();
  const [space, setSpace] = useState<Space | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreatePage, setShowCreatePage] = useState(false);
  const isViewer = user?.role === "viewer";

  // Clear AI page context when navigating to space overview
  useEffect(() => {
    setPageContext(null);
  }, [setPageContext]);

  useEffect(() => {
    const loadSpace = async () => {
      try {
        const spaceKey = params.key as string;
        const spaceData = await spacesApi.getByKey(spaceKey);
        setSpace(spaceData);
        setCurrentSpace(spaceData);

        const tree = await pagesApi.getTree(spaceData.id);
        setPageTree(tree);
      } catch {
        router.push("/dashboard");
      } finally {
        setLoading(false);
      }
    };

    loadSpace();
  }, [params.key, router, setCurrentSpace, setPageTree]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-sage-500" />
      </div>
    );
  }

  if (!space) return null;

  return (
    <div className="flex h-full">
      {/* Page Tree Sidebar */}
      <div className="w-72 border-r border-white/10 flex flex-col bg-slate-900/50">
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-sage-900/50 flex items-center justify-center text-lg">
                {space.icon || space.name[0]}
              </span>
              <div>
                <h2 className="font-medium text-white">{space.name}</h2>
                <p className="text-xs text-gray-500">{space.key}</p>
              </div>
            </div>
            <button className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
              <Settings className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>

        {!isViewer && (
          <div className="p-3">
            <button
              onClick={() => setShowCreatePage(true)}
              className="w-full flex items-center gap-2 px-3 py-2 bg-sage-600 hover:bg-sage-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Page
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-2">
          <PageTree items={pageTree} spaceKey={space.key} />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <span className="text-4xl">{space.icon || "📚"}</span>
            <div>
              <h1 className="text-3xl font-bold text-white">{space.name}</h1>
              {space.description && (
                <p className="text-gray-400 mt-1">{space.description}</p>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <p className="text-2xl font-bold text-white">{countPages(pageTree)}</p>
              <p className="text-sm text-gray-400">Pages</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <p className="text-2xl font-bold text-white">
                {countPages(pageTree, "published")}
              </p>
              <p className="text-sm text-gray-400">Published</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <p className="text-2xl font-bold text-white">
                {countPages(pageTree, "draft")}
              </p>
              <p className="text-sm text-gray-400">Drafts</p>
            </div>
          </div>

          {/* Recent Pages */}
          <div>
            <h2 className="text-lg font-semibold text-white mb-4">Pages</h2>
            {pageTree.length === 0 ? (
              <div className="bg-white/5 border border-white/10 border-dashed rounded-xl p-8 text-center">
                <FileText className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 mb-4">No pages in this space yet</p>
                {!isViewer && (
                  <button
                    onClick={() => setShowCreatePage(true)}
                    className="px-4 py-2 bg-sage-600 hover:bg-sage-500 text-white text-sm rounded-lg transition-colors"
                  >
                    Create your first page
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {flattenTree(pageTree)
                  .slice(0, 10)
                  .map((page) => (
                    <button
                      key={page.id}
                      onClick={() =>
                        router.push(`/space/${space.key}/page/${page.slug}`)
                      }
                      className="w-full flex items-center gap-3 p-4 bg-white/5 border border-white/10 hover:border-sage-700/50 rounded-xl transition-colors text-left group"
                    >
                      <FileText className="w-5 h-5 text-gray-500" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white truncate group-hover:text-sage-300 transition-colors">
                          {page.title}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-0.5 text-xs rounded-full ${
                          page.status === "published"
                            ? "bg-green-500/10 text-green-400"
                            : "bg-yellow-500/10 text-yellow-400"
                        }`}
                      >
                        {page.status}
                      </span>
                    </button>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {space && (
        <CreatePageModal
          open={showCreatePage}
          onClose={() => setShowCreatePage(false)}
          spaceId={space.id}
          spaceKey={space.key}
        />
      )}
    </div>
  );
}

function countPages(items: PageTreeItem[], status?: string): number {
  let count = 0;
  for (const item of items) {
    if (!status || item.status === status) {
      count++;
    }
    count += countPages(item.children, status);
  }
  return count;
}

function flattenTree(items: PageTreeItem[]): PageTreeItem[] {
  const result: PageTreeItem[] = [];
  for (const item of items) {
    result.push(item);
    result.push(...flattenTree(item.children));
  }
  return result;
}

