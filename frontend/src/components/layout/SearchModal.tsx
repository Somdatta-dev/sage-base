"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, FileText, FolderOpen, X, Loader2, Sparkles } from "lucide-react";
import { useUIStore, useSpaceStore } from "@/lib/store";
import { searchApi } from "@/lib/api";
import type { Page } from "@/types";
import { cn } from "@/lib/utils";

interface SemanticSearchResult {
  page_id: number;
  title: string;
  content_preview: string;
  score: number;
}

export function SearchModal() {
  const router = useRouter();
  const { searchOpen, setSearchOpen } = useUIStore();
  const { spaces } = useSpaceStore();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Page[]>([]);
  const [loading, setLoading] = useState(false);
  const [semanticResults, setSemanticResults] = useState<SemanticSearchResult[]>([]);
  const [isSemanticSearch, setIsSemanticSearch] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [semanticSearchEnabled, setSemanticSearchEnabled] = useState<boolean | null>(null);

  // Check semantic search status on mount
  useEffect(() => {
    const checkSemanticStatus = async () => {
      try {
        const status = await searchApi.semanticStatus();
        console.log("Semantic search status:", status);
        setSemanticSearchEnabled(status.enabled);
      } catch (err) {
        console.error("Failed to check semantic search status:", err);
        setSemanticSearchEnabled(false);
      }
    };
    checkSemanticStatus();
  }, []);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setSemanticResults([]);
      setIsSemanticSearch(false);
      return;
    }

    setLoading(true);
    setSemanticResults([]);
    setIsSemanticSearch(false);
    
    try {
      // First try keyword search
      const pages = await searchApi.search(q);
      setResults(pages);
      setSelectedIndex(0);
      
      // If no results and semantic search is enabled, try it automatically
      if (pages.length === 0 && semanticSearchEnabled) {
        try {
          console.log("No keyword results, trying semantic search...");
          const semanticPages = await searchApi.semantic(q);
          console.log("Semantic search results:", semanticPages);
          setSemanticResults(semanticPages);
          setIsSemanticSearch(true);
        } catch (err) {
          // Semantic search might have failed
          console.error("Semantic search error:", err);
        }
      }
    } catch (err) {
      console.error("Search error:", err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [semanticSearchEnabled]);

  useEffect(() => {
    const timer = setTimeout(() => {
      search(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, search]);

  // Calculate total results for keyboard navigation
  const totalResults = results.length + semanticResults.length;

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
        setSelectedIndex((i) => Math.min(i + 1, totalResults - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && totalResults > 0) {
        // Handle keyword search result
        if (selectedIndex < results.length && results[selectedIndex]) {
          const page = results[selectedIndex];
          const space = spaces.find((s) => s.id === page.space_id);
          if (space) {
            router.push(`/space/${space.key}/page/${page.slug}`);
            setSearchOpen(false);
          }
        }
        // Handle semantic search result
        else if (semanticResults[selectedIndex - results.length]) {
          const semanticPage = semanticResults[selectedIndex - results.length];
          // Navigate using page_id - need to find the page first
          handleSemanticResultClick(semanticPage.page_id);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [searchOpen, setSearchOpen, results, semanticResults, selectedIndex, spaces, router, totalResults]);

  // Function to handle semantic result navigation
  const handleSemanticResultClick = async (pageId: number) => {
    try {
      const { pagesApi } = await import("@/lib/api");
      const page = await pagesApi.get(pageId);
      const space = spaces.find((s) => s.id === page.space_id);
      if (space) {
        router.push(`/space/${space.key}/page/${page.slug}`);
        setSearchOpen(false);
      }
    } catch (error) {
      console.error("Failed to navigate to page:", error);
    }
  };

  useEffect(() => {
    if (!searchOpen) {
      setQuery("");
      setResults([]);
      setSemanticResults([]);
      setIsSemanticSearch(false);
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
          {/* Keyword search results */}
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

          {/* Semantic search results (shown when keyword search returns no results) */}
          {isSemanticSearch && semanticResults.length > 0 && (
            <div className="py-2">
              <div className="px-4 py-2 flex items-center gap-2 text-xs text-gray-500 border-b border-white/5">
                <Sparkles className="w-3 h-3" />
                <span>Semantic search results</span>
              </div>
              {semanticResults.map((result, index) => {
                const adjustedIndex = results.length + index;
                return (
                  <button
                    key={result.page_id}
                    onClick={() => handleSemanticResultClick(result.page_id)}
                    className={cn(
                      "w-full flex items-start gap-3 px-4 py-3 text-left transition-colors",
                      adjustedIndex === selectedIndex
                        ? "bg-sage-900/50"
                        : "hover:bg-white/5"
                    )}
                  >
                    <Sparkles className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">
                        {result.title}
                      </p>
                      <p className="text-sm text-gray-500 truncate mt-0.5">
                        {result.content_preview.slice(0, 100)}...
                      </p>
                    </div>
                    <span className="px-2 py-0.5 text-xs rounded-full bg-purple-500/10 text-purple-400">
                      {Math.round(result.score * 100)}% match
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* No results at all */}
          {query && results.length === 0 && semanticResults.length === 0 && !loading && (
            <div className="p-8 text-center">
              <FileText className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No results found</p>
              <p className="text-sm text-gray-600 mt-1">
                Try different keywords
              </p>
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

