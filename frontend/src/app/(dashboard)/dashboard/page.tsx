"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, FolderOpen, FileText, Clock, TrendingUp } from "lucide-react";
import { useSpaceStore, useAuthStore, useAIStore } from "@/lib/store";

import { spacesApi } from "@/lib/api";
import { pagesApi } from "@/lib/api";
import type { Page } from "@/types";
import { formatDate } from "@/lib/utils";
import { CreateSpaceModal } from "@/components/spaces/CreateSpaceModal";

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { spaces, setSpaces } = useSpaceStore();
  const { setPageContext } = useAIStore();
  const [recentPages, setRecentPages] = useState<Page[]>([]);
  const [showCreateSpace, setShowCreateSpace] = useState(false);
  const isViewer = user?.role === "viewer";

  // Clear AI page context when navigating to dashboard
  useEffect(() => {
    setPageContext(null);
  }, [setPageContext]);

  useEffect(() => {
    spacesApi.list().then(setSpaces).catch(console.error);
  }, [setSpaces]);

  useEffect(() => {
    const loadRecentPages = async () => {
      if (spaces.length === 0) return;

      try {
        const allPages: Page[] = [];
        for (const space of spaces.slice(0, 5)) {
          const pages = await pagesApi.listBySpace(space.id);
          allPages.push(...pages);
        }
        // Sort by updated_at and take top 10
        allPages.sort(
          (a, b) =>
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );
        setRecentPages(allPages.slice(0, 10));
      } catch {
        // Ignore errors
      }
    };

    loadRecentPages();
  }, [spaces]);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Welcome Section */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-white mb-2">
          Welcome back{user?.email ? `, ${user.email.split("@")[0]}` : ""}
        </h1>
        <p className="text-gray-400">
          Here&apos;s what&apos;s happening in your knowledge base
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-sage-900/50 flex items-center justify-center">
              <FolderOpen className="w-6 h-6 text-sage-400" />
            </div>
            <div>
              <p className="text-3xl font-bold text-white">{spaces.length}</p>
              <p className="text-sm text-gray-400">Spaces</p>
            </div>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-900/50 flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <p className="text-3xl font-bold text-white">
                {recentPages.length}
              </p>
              <p className="text-sm text-gray-400">Recent Pages</p>
            </div>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-900/50 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <p className="text-3xl font-bold text-white">
                {
                  recentPages.filter(
                    (p) =>
                      new Date(p.updated_at) >
                      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                  ).length
                }
              </p>
              <p className="text-sm text-gray-400">Updated This Week</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Spaces */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-sage-400" />
              Your Spaces
            </h2>
            {!isViewer && (
              <button
                onClick={() => setShowCreateSpace(true)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-sage-600 hover:bg-sage-500 text-white rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                New Space
              </button>
            )}
          </div>

          <div className="space-y-3">
            {spaces.length === 0 ? (
              <div className="bg-white/5 border border-white/10 border-dashed rounded-xl p-8 text-center">
                <FolderOpen className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 mb-4">No spaces yet</p>
                {!isViewer && (
                  <button
                    onClick={() => setShowCreateSpace(true)}
                    className="px-4 py-2 bg-sage-600 hover:bg-sage-500 text-white text-sm rounded-lg transition-colors"
                  >
                    Create your first space
                  </button>
                )}
              </div>
            ) : (
              spaces.slice(0, 5).map((space) => (
                <Link
                  key={space.id}
                  href={`/space/${space.key}`}
                  className="block bg-white/5 border border-white/10 hover:border-sage-700/50 rounded-xl p-4 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-sage-900/50 flex items-center justify-center text-lg">
                      {space.icon || space.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-white truncate group-hover:text-sage-300 transition-colors">
                        {space.name}
                      </h3>
                      <p className="text-sm text-gray-500 truncate">
                        {space.key} · {space.description || "No description"}
                      </p>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Recent Pages */}
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-blue-400" />
            Recent Pages
          </h2>

          <div className="space-y-3">
            {recentPages.length === 0 ? (
              <div className="bg-white/5 border border-white/10 border-dashed rounded-xl p-8 text-center">
                <FileText className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">No pages yet</p>
                <p className="text-sm text-gray-500 mt-1">
                  Create a space and start documenting
                </p>
              </div>
            ) : (
              recentPages.map((page) => {
                const space = spaces.find((s) => s.id === page.space_id);
                return (
                  <Link
                    key={page.id}
                    href={`/space/${space?.key}/page/${page.slug}`}
                    className="block bg-white/5 border border-white/10 hover:border-sage-700/50 rounded-xl p-4 transition-colors group"
                  >
                    <div className="flex items-start gap-3">
                      <FileText className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-white truncate group-hover:text-sage-300 transition-colors">
                          {page.title}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {space?.name} · Updated {formatDate(page.updated_at)}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-0.5 text-xs rounded-full ${
                          page.status === "published"
                            ? "bg-green-500/10 text-green-400"
                            : page.status === "draft"
                              ? "bg-yellow-500/10 text-yellow-400"
                              : "bg-gray-500/10 text-gray-400"
                        }`}
                      >
                        {page.status}
                      </span>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </div>

      <CreateSpaceModal
        open={showCreateSpace}
        onClose={() => setShowCreateSpace(false)}
      />
    </div>
  );
}

