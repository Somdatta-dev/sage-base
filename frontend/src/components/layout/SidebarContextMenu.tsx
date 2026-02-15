"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FilePlus,
  FolderPlus,
  Pencil,
  Trash2,
  Copy,
  ExternalLink,
  Star,
  Archive,
} from "lucide-react";

export type ContextTarget = 
  | { type: "space"; spaceId: number; spaceKey: string; spaceName: string }
  | { type: "page"; pageId: number; pageSlug: string; pageTitle: string; spaceKey: string; spaceId: number }
  | { type: "sidebar"; }
  | null;

interface SidebarContextMenuProps {
  position: { x: number; y: number };
  target: ContextTarget;
  onClose: () => void;
  onCreatePage?: (spaceKey: string) => void;
  onCreateSpace?: () => void;
  onRename?: (target: ContextTarget) => void;
  onDelete?: (target: ContextTarget) => void;
  onDuplicate?: (target: ContextTarget) => void;
  onOpenInNewTab?: (target: ContextTarget) => void;
  isViewer?: boolean;
}

interface MenuItem {
  label: string;
  icon: React.ReactNode;
  action: () => void;
  divider?: boolean;
  danger?: boolean;
}

export function SidebarContextMenu({
  position,
  target,
  onClose,
  onCreatePage,
  onCreateSpace,
  onRename,
  onDelete,
  onDuplicate,
  onOpenInNewTab,
  isViewer,
}: SidebarContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  if (!target) return null;

  // Build menu items based on target type
  const menuItems: MenuItem[] = [];

  if (target.type === "sidebar") {
    // Right-click on empty sidebar area
    if (!isViewer) {
      menuItems.push({
        label: "New Space",
        icon: <FolderPlus className="w-4 h-4" />,
        action: () => { onCreateSpace?.(); onClose(); },
      });
    }
  } else if (target.type === "space") {
    // Right-click on a space
    if (!isViewer) {
      menuItems.push({
        label: "New Page",
        icon: <FilePlus className="w-4 h-4" />,
        action: () => { onCreatePage?.(target.spaceKey); onClose(); },
      });
      menuItems.push({
        label: "Rename Space",
        icon: <Pencil className="w-4 h-4" />,
        action: () => { onRename?.(target); onClose(); },
        divider: true,
      });
      menuItems.push({
        label: "Delete Space",
        icon: <Trash2 className="w-4 h-4" />,
        action: () => { onDelete?.(target); onClose(); },
        danger: true,
      });
    }
  } else if (target.type === "page") {
    // Right-click on a page
    menuItems.push({
      label: "Open in New Tab",
      icon: <ExternalLink className="w-4 h-4" />,
      action: () => { onOpenInNewTab?.(target); onClose(); },
    });
    if (!isViewer) {
      menuItems.push({
        label: "Duplicate Page",
        icon: <Copy className="w-4 h-4" />,
        action: () => { onDuplicate?.(target); onClose(); },
      });
      menuItems.push({
        label: "Rename Page",
        icon: <Pencil className="w-4 h-4" />,
        action: () => { onRename?.(target); onClose(); },
        divider: true,
      });
      menuItems.push({
        label: "Delete Page",
        icon: <Trash2 className="w-4 h-4" />,
        action: () => { onDelete?.(target); onClose(); },
        danger: true,
      });
    }
  }

  // Adjust position to keep menu in viewport
  const adjustedPosition = {
    x: Math.min(position.x, window.innerWidth - 200),
    y: Math.min(position.y, window.innerHeight - (menuItems.length * 36 + 20)),
  };

  return (
    <AnimatePresence>
      <motion.div
        ref={menuRef}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.1 }}
        style={{
          position: "fixed",
          left: adjustedPosition.x,
          top: adjustedPosition.y,
          zIndex: 1000,
        }}
        className="w-48 bg-[#252525] border border-[#373737] rounded-lg shadow-2xl py-1 overflow-hidden"
      >
        {menuItems.map((item, index) => (
          <div key={index}>
            <button
              onClick={item.action}
              className={`w-full flex items-center gap-3 px-3 py-2 text-sm text-left transition-colors ${
                item.danger
                  ? "text-red-400 hover:bg-red-500/10"
                  : "text-[#e3e3e3] hover:bg-[#373737]"
              }`}
            >
              <span className={item.danger ? "text-red-400" : "text-[#9b9b9b]"}>
                {item.icon}
              </span>
              <span>{item.label}</span>
            </button>
            {item.divider && <div className="my-1 border-t border-[#373737]" />}
          </div>
        ))}
      </motion.div>
    </AnimatePresence>
  );
}

