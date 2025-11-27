"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, FileText, FolderOpen, X, Loader2 } from "lucide-react";
import { useUIStore, useSpaceStore } from "@/lib/store";
import { searchApi } from "@/lib/api";
import type { Page } from "@/types";
import { cn } from "@/lib/utils";

export function SearchModal() {
  const router = useRouter();
  const { searchOpen, setSearchOpen } = useUIStore();
  const { spaces } = useSpaceStore();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Page[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const pages = await searchApi.search(q);
      setResults(pages);
      setSelectedIndex(0);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      search(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, search]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(!searchOpen);
      }

      if (!searchOpen) return;

      if (e.key === "Escape") {
        setSearchOpen(false);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && results[selectedIndex]) {
        const page = results[selectedIndex];
        const space = spaces.find((s) => s.id === page.space_id);
        if (space) {
          router.push(`/space/${space.key}/page/${page.slug}`);
          setSearchOpen(false);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [searchOpen, setSearchOpen, results, selectedIndex, spaces, router]);

  useEffect(() => {
    if (!searchOpen) {
      setQuery("");
      setResults([]);
      setSelectedIndex(0);
    }
  }, [searchOpen]);

  if (!searchOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setSearchOpen(false)}
      />

      <div className="relative w-full max-w-2xl bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
          <Search className="w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages..."
            className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none text-lg"
            autoFocus
          />
          {loading && <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />}
          <button
            onClick={() => setSearchOpen(false)}
            className="p-1 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {query && results.length === 0 && !loading && (
            <div className="p-8 text-center">
              <FileText className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No results found</p>
              <p className="text-sm text-gray-600 mt-1">
                Try different keywords
              </p>
            </div>
          )}

          {results.length > 0 && (
            <div className="py-2">
              {results.map((page, index) => {
                const space = spaces.find((s) => s.id === page.space_id);
                return (
                  <button
                    key={page.id}
                    onClick={() => {
                      if (space) {
                        router.push(`/space/${space.key}/page/${page.slug}`);
                        setSearchOpen(false);
                      }
                    }}
                    className={cn(
                      "w-full flex items-start gap-3 px-4 py-3 text-left transition-colors",
                      index === selectedIndex
                        ? "bg-sage-900/50"
                        : "hover:bg-white/5"
                    )}
                  >
                    <FileText className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">
                        {page.title}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <FolderOpen className="w-3 h-3" />
                        <span>{space?.name}</span>
                      </div>
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
                );
              })}
            </div>
          )}

          {!query && (
            <div className="p-8 text-center">
              <p className="text-gray-400">Start typing to search</p>
              <p className="text-sm text-gray-600 mt-1">
                Search across all spaces and pages
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-white/10 flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-white/10 rounded">↑</kbd>
            <kbd className="px-1.5 py-0.5 bg-white/10 rounded">↓</kbd>
            to navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-white/10 rounded">↵</kbd>
            to select
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-white/10 rounded">esc</kbd>
            to close
          </span>
        </div>
      </div>
    </div>
  );
}

