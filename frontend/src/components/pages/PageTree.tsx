"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  ChevronRight,
  ChevronDown,
  FileText,
  MoreHorizontal,
  Plus,
} from "lucide-react";
import type { PageTreeItem } from "@/types";
import { cn } from "@/lib/utils";

interface PageTreeProps {
  items: PageTreeItem[];
  spaceKey: string;
  depth?: number;
}

export function PageTree({ items, spaceKey, depth = 0 }: PageTreeProps) {
  if (items.length === 0) {
    return depth === 0 ? (
      <p className="px-3 py-2 text-sm text-gray-600">No pages</p>
    ) : null;
  }

  return (
    <div className="space-y-0.5">
      {items.map((item) => (
        <PageTreeNode key={item.id} item={item} spaceKey={spaceKey} depth={depth} />
      ))}
    </div>
  );
}

interface PageTreeNodeProps {
  item: PageTreeItem;
  spaceKey: string;
  depth: number;
}

function PageTreeNode({ item, spaceKey, depth }: PageTreeNodeProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(true);

  const isActive = pathname === `/space/${spaceKey}/page/${item.slug}`;
  const hasChildren = item.children.length > 0;

  return (
    <div>
      <div
        className={cn(
          "group flex items-center gap-1 px-2 py-1.5 rounded-lg cursor-pointer transition-colors",
          isActive
            ? "bg-sage-900/50 text-sage-300"
            : "text-gray-400 hover:text-white hover:bg-white/5"
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="p-0.5 hover:bg-white/10 rounded transition-colors"
          >
            {expanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        ) : (
          <span className="w-5" />
        )}

        <button
          onClick={() => router.push(`/space/${spaceKey}/page/${item.slug}`)}
          className="flex-1 flex items-center gap-2 text-left min-w-0"
        >
          <FileText className="w-4 h-4 flex-shrink-0" />
          <span className="truncate text-sm">{item.title}</span>
        </button>

        <div className="hidden group-hover:flex items-center gap-0.5">
          <button className="p-1 hover:bg-white/10 rounded transition-colors">
            <Plus className="w-3 h-3" />
          </button>
          <button className="p-1 hover:bg-white/10 rounded transition-colors">
            <MoreHorizontal className="w-3 h-3" />
          </button>
        </div>
      </div>

      {hasChildren && expanded && (
        <PageTree items={item.children} spaceKey={spaceKey} depth={depth + 1} />
      )}
    </div>
  );
}

