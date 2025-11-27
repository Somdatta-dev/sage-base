"use client";

import { usePathname } from "next/navigation";
import { Menu, Search, Bell } from "lucide-react";
import { useUIStore, useSpaceStore } from "@/lib/store";

export function Header() {
  const pathname = usePathname();
  const { toggleSidebar, setSearchOpen } = useUIStore();
  const { currentSpace } = useSpaceStore();

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
    <header className="h-14 border-b border-white/10 flex items-center justify-between px-4">
      <div className="flex items-center gap-4">
        <button
          onClick={toggleSidebar}
          className="p-2 hover:bg-white/5 rounded-lg transition-colors text-gray-400 hover:text-white"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm">
          {breadcrumb.map((item, index) => (
            <div key={item.href} className="flex items-center gap-2">
              {index > 0 && <span className="text-gray-600">/</span>}
              <span
                className={
                  index === breadcrumb.length - 1
                    ? "text-white font-medium"
                    : "text-gray-400"
                }
              >
                {item.label}
              </span>
            </div>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setSearchOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg transition-colors text-gray-400 text-sm"
        >
          <Search className="w-4 h-4" />
          <span className="hidden sm:inline">Search</span>
          <kbd className="hidden sm:inline text-xs bg-white/10 px-1.5 py-0.5 rounded ml-2">
            ⌘K
          </kbd>
        </button>

        <button className="p-2 hover:bg-white/5 rounded-lg transition-colors text-gray-400 hover:text-white relative">
          <Bell className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}

