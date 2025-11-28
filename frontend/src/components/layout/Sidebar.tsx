"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  ChevronRight,
  ChevronDown,
  Plus,
  LogOut,
  Search,
  FileText,
  Users,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore, useUIStore, useSpaceStore } from "@/lib/store";
import { spacesApi } from "@/lib/api";

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
      <aside className="w-12 bg-[#202020] flex flex-col py-3 shrink-0">
        <div className="flex items-center justify-center mb-6">
          <div className="w-7 h-7 rounded bg-[#373737] flex items-center justify-center text-[#9b9b9b] text-sm font-medium">
            S
          </div>
        </div>
        <nav className="flex-1 flex flex-col items-center gap-1">
          <Link
            href="/dashboard"
            className={cn(
              "p-2 rounded transition-colors",
              pathname === "/dashboard" 
                ? "bg-[#373737] text-[#e3e3e3]" 
                : "text-[#9b9b9b] hover:bg-[#2d2d2d]"
            )}
          >
            <Home className="w-4 h-4" />
          </Link>
          <button
            onClick={() => setSearchOpen(true)}
            className="p-2 rounded text-[#9b9b9b] hover:bg-[#2d2d2d] transition-colors"
          >
            <Search className="w-4 h-4" />
          </button>
        </nav>
      </aside>
    );
  }

  return (
    <aside className="w-60 bg-[#202020] flex flex-col shrink-0">
      {/* Workspace header */}
      <div className="px-3 py-3 flex items-center gap-2">
        <div className="w-5 h-5 rounded bg-gradient-to-br from-[#ff6b6b] to-[#ffa502] flex items-center justify-center">
          <span className="text-white text-xs font-semibold">S</span>
        </div>
        <span className="text-sm font-medium text-[#e3e3e3]">{user?.full_name || user?.email?.split('@')[0] || 'Workspace'}</span>
      </div>

      {/* Search */}
      <div className="px-2 mb-2">
        <button
          onClick={() => setSearchOpen(true)}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-[#9b9b9b] hover:bg-[#2d2d2d] transition-colors text-sm"
        >
          <Search className="w-4 h-4" />
          <span>Search</span>
          <kbd className="ml-auto text-xs text-[#6b6b6b]">⌘K</kbd>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2">
        <div className="space-y-0.5">
          <Link
            href="/dashboard"
            className={cn(
              "flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors",
              pathname === "/dashboard"
                ? "bg-[#373737] text-[#e3e3e3]"
                : "text-[#9b9b9b] hover:bg-[#2d2d2d]"
            )}
          >
            <Home className="w-4 h-4" />
            <span>Dashboard</span>
          </Link>

          {isAdmin && (
            <Link
              href="/admin"
              className={cn(
                "flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors",
                pathname === "/admin"
                  ? "bg-[#373737] text-[#e3e3e3]"
                  : "text-[#9b9b9b] hover:bg-[#2d2d2d]"
              )}
            >
              <Users className="w-4 h-4" />
              <span>User Management</span>
            </Link>
          )}
        </div>

        {/* Spaces */}
        <div className="mt-6">
          <div className="flex items-center justify-between px-2 mb-1">
            <span className="text-xs font-medium text-[#6b6b6b] uppercase tracking-wider">
              Spaces
            </span>
            <button
              onClick={() => setCreateSpaceOpen(true)}
              className="p-0.5 hover:bg-[#2d2d2d] rounded transition-colors"
              title="Create Space"
            >
              <Plus className="w-3.5 h-3.5 text-[#6b6b6b]" />
            </button>
          </div>

          <div className="space-y-0.5">
            {spaces.map((space) => (
              <div key={space.id}>
                <button
                  onClick={() => toggleSpace(space.key)}
                  className={cn(
                    "w-full flex items-center gap-1.5 px-2 py-1.5 rounded text-sm transition-colors text-left",
                    pathname?.startsWith(`/space/${space.key}`)
                      ? "bg-[#373737] text-[#e3e3e3]"
                      : "text-[#9b9b9b] hover:bg-[#2d2d2d]"
                  )}
                >
                  {expandedSpaces.has(space.key) ? (
                    <ChevronDown className="w-3 h-3 flex-shrink-0 text-[#6b6b6b]" />
                  ) : (
                    <ChevronRight className="w-3 h-3 flex-shrink-0 text-[#6b6b6b]" />
                  )}
                  <span className="truncate">{space.name}</span>
                </button>

                {expandedSpaces.has(space.key) && (
                  <div className="ml-4 mt-0.5 space-y-0.5">
                    <Link
                      href={`/space/${space.key}`}
                      className="flex items-center gap-2 px-2 py-1 text-sm text-[#9b9b9b] hover:bg-[#2d2d2d] rounded transition-colors"
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

      {/* User footer */}
      <div className="mt-auto px-2 py-3 border-t border-[#2d2d2d]">
        <div className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[#2d2d2d] transition-colors cursor-pointer group">
          <div className="w-5 h-5 rounded-full bg-[#373737] flex items-center justify-center text-[#9b9b9b] text-xs">
            {user?.email?.[0]?.toUpperCase() || "?"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-[#9b9b9b] truncate">
              {user?.email}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="p-1 opacity-0 group-hover:opacity-100 hover:bg-[#373737] rounded transition-all"
            title="Logout"
          >
            <LogOut className="w-3.5 h-3.5 text-[#9b9b9b]" />
          </button>
        </div>
      </div>
    </aside>
  );
}
