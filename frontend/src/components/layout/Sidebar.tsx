"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Book,
  Home,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Plus,
  LogOut,
  Search,
  FileText,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore, useUIStore, useSpaceStore } from "@/lib/store";
import { spacesApi } from "@/lib/api";
import type { Space } from "@/types";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();
  const { setSearchOpen, setCreateSpaceOpen, sidebarCollapsed } = useUIStore();
  const { spaces, setSpaces } = useSpaceStore();
  const [expandedSpaces, setExpandedSpaces] = useState<Set<string>>(new Set());

  useEffect(() => {
    spacesApi.list().then(setSpaces).catch(console.error);
  }, [setSpaces]);

  const toggleSpace = (key: string) => {
    setExpandedSpaces((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleLogout = () => {
    clearAuth();
    router.push("/login");
  };

  const isAdmin = user?.role === "admin";

  if (sidebarCollapsed) {
    return (
      <aside className="w-16 bg-slate-900 border-r border-white/10 flex flex-col py-4">
        <div className="flex items-center justify-center mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sage-500 to-sage-700 flex items-center justify-center">
            <Book className="w-5 h-5 text-white" />
          </div>
        </div>
        <nav className="flex-1 flex flex-col items-center gap-2">
          <Link
            href="/dashboard"
            className={cn(
              "p-3 rounded-lg transition-colors",
              pathname === "/dashboard" ? "bg-sage-900/50 text-sage-300" : "text-gray-400 hover:text-white hover:bg-white/5"
            )}
          >
            <Home className="w-5 h-5" />
          </Link>
          <button
            onClick={() => setSearchOpen(true)}
            className="p-3 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <Search className="w-5 h-5" />
          </button>
        </nav>
      </aside>
    );
  }

  return (
    <aside className="w-64 bg-slate-900 border-r border-white/10 flex flex-col">
      {/* Logo */}
      <div className="p-4 border-b border-white/10">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sage-500 to-sage-700 flex items-center justify-center">
            <Book className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-semibold text-white">SageBase</span>
        </Link>
      </div>

      {/* Search */}
      <div className="p-4">
        <button
          onClick={() => setSearchOpen(true)}
          className="w-full flex items-center gap-3 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-gray-400 text-sm transition-colors"
        >
          <Search className="w-4 h-4" />
          <span>Search...</span>
          <kbd className="ml-auto text-xs bg-white/10 px-1.5 py-0.5 rounded">⌘K</kbd>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-4">
        <div className="space-y-1">
          <Link
            href="/dashboard"
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors mb-1",
              pathname === "/dashboard"
                ? "bg-sage-900/50 text-sage-300"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            )}
          >
            <Home className="w-4 h-4" />
            <span>Dashboard</span>
          </Link>

          {isAdmin && (
            <Link
              href="/admin"
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors mb-1",
                pathname === "/admin"
                  ? "bg-sage-900/50 text-sage-300"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              )}
            >
              <Users className="w-4 h-4" />
              <span>User Management</span>
            </Link>
          )}
        </div>

        {/* Spaces */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Spaces
            </span>
            <button
              onClick={() => setCreateSpaceOpen(true)}
              className="p-1 hover:bg-white/10 rounded transition-colors"
              title="Create Space"
            >
              <Plus className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          <div className="space-y-1">
            {spaces.map((space) => (
              <div key={space.id}>
                <button
                  onClick={() => toggleSpace(space.key)}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-left",
                    pathname?.startsWith(`/space/${space.key}`)
                      ? "bg-sage-900/50 text-sage-300"
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  {expandedSpaces.has(space.key) ? (
                    <ChevronDown className="w-4 h-4 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 flex-shrink-0" />
                  )}
                  <FolderOpen className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{space.name}</span>
                </button>

                {expandedSpaces.has(space.key) && (
                  <div className="ml-6 mt-1 space-y-1">
                    <Link
                      href={`/space/${space.key}`}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-300 hover:bg-white/5 rounded-lg transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>All Pages</span>
                    </Link>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </nav>

      {/* User */}
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-sage-700 flex items-center justify-center text-white text-sm font-medium">
            {user?.email?.[0]?.toUpperCase() || "?"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {user?.email}
            </p>
            <p className="text-xs text-gray-500 capitalize">
              {user?.role || "Member"}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            title="Logout"
          >
            <LogOut className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>
    </aside>
  );
}
