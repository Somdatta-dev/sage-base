"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Menu, Search, MoreHorizontal, Sparkles } from "lucide-react";
import { useUIStore, useSpaceStore, useAIStore } from "@/lib/store";

export function Header() {
  const pathname = usePathname();
  const { toggleSidebar, setSearchOpen } = useUIStore();
  const { currentSpace } = useSpaceStore();
  const { setAISidebarOpen } = useAIStore();

  // Generate breadcrumb from pathname
  const getBreadcrumb = () => {
    if (pathname === "/dashboard") {
      return [{ label: "Dashboard", href: "/dashboard" }];
    }

    const parts = pathname.split("/").filter(Boolean);
    const breadcrumb: { label: string; href: string }[] = [];

    if (parts[0] === "space" && parts[1]) {
      breadcrumb.push({
        label: currentSpace?.name || parts[1],
        href: `/space/${parts[1]}`,
      });

      if (parts[2] === "page" && parts[3]) {
        breadcrumb.push({
          label: decodeURIComponent(parts[3]).replace(/-/g, " "),
          href: pathname,
        });
      }
    }

    return breadcrumb;
  };

  const breadcrumb = getBreadcrumb();

  return (
    <header className="h-11 flex items-center justify-between px-3 bg-[#191919]">
      <div className="flex items-center gap-2">
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded hover:bg-[#2d2d2d] transition-colors text-[#9b9b9b] hover:text-[#e3e3e3]"
        >
          <Menu className="w-4 h-4" />
        </button>

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1 text-sm">
          {breadcrumb.map((item, index) => (
            <div key={item.href} className="flex items-center gap-1">
              {index > 0 && <span className="text-[#4b4b4b]">/</span>}
              {index === breadcrumb.length - 1 ? (
                <span className="text-[#e3e3e3]">{item.label}</span>
              ) : (
                <Link
                  href={item.href}
                  className="text-[#9b9b9b] hover:text-[#e3e3e3] transition-colors"
                >
                  {item.label}
                </Link>
              )}
            </div>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => setAISidebarOpen(true)}
          className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-[#2d2d2d] transition-colors text-[#9b9b9b] hover:text-[#e3e3e3] text-sm"
          title="AI Assistant"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">AI</span>
        </button>

        <button
          onClick={() => setSearchOpen(true)}
          className="flex items-center gap-2 px-2 py-1 rounded hover:bg-[#2d2d2d] transition-colors text-[#9b9b9b] text-sm"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Search</span>
          <kbd className="hidden sm:inline text-xs text-[#6b6b6b] ml-1">⌘K</kbd>
        </button>
      </div>
    </header>
  );
}
