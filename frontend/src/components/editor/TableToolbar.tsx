"use client";

import { type Editor } from "@tiptap/react";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Minus,
  Trash2,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  RowsIcon,
  Columns,
  MergeIcon,
  SplitIcon,
} from "lucide-react";

interface TableToolbarProps {
  editor: Editor;
}

export function TableToolbar({ editor }: TableToolbarProps) {
  const [isInTable, setIsInTable] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  const updatePosition = useCallback(() => {
    if (!editor) return;
    
    // Check if we're in a table
    const tableNode = editor.isActive("table");
    setIsInTable(tableNode);

    if (tableNode) {
      // Find the table element
      const tableElement = editor.view.dom.querySelector("table");
      if (tableElement) {
        const tableRect = tableElement.getBoundingClientRect();
        const editorRect = editor.view.dom.getBoundingClientRect();
        
        setPosition({
          top: tableRect.top - editorRect.top - 45,
          left: tableRect.left - editorRect.left,
        });
      }
    }
  }, [editor]);

  useEffect(() => {
    if (!editor) return;

    // Update on selection change
    editor.on("selectionUpdate", updatePosition);
    editor.on("transaction", updatePosition);

    return () => {
      editor.off("selectionUpdate", updatePosition);
      editor.off("transaction", updatePosition);
    };
  }, [editor, updatePosition]);

  if (!isInTable || !position) return null;

  const ToolbarButton = ({
    onClick,
    disabled,
    children,
    title,
    variant = "default",
  }: {
    onClick: () => void;
    disabled?: boolean;
    children: React.ReactNode;
    title: string;
    variant?: "default" | "danger";
  }) => (
    <button
      onMouseDown={(e) => {
        e.preventDefault(); // Prevent focus loss from editor
        e.stopPropagation();
      }}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      disabled={disabled}
      title={title}
      className={`p-1.5 rounded transition-colors disabled:opacity-30 ${
        variant === "danger"
          ? "text-red-400 hover:bg-red-500/20 hover:text-red-300"
          : "text-[#9b9b9b] hover:bg-[#373737] hover:text-[#e3e3e3]"
      }`}
    >
      {children}
    </button>
  );

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -5 }}
        onMouseDown={(e) => {
          e.preventDefault(); // Prevent focus loss from editor
          e.stopPropagation();
        }}
        style={{
          position: "absolute",
          top: position.top,
          left: position.left,
          zIndex: 50,
        }}
        className="flex items-center gap-0.5 px-2 py-1 bg-[#252525] border border-[#373737] rounded-lg shadow-xl"
      >
        {/* Row operations */}
        <div className="flex items-center gap-0.5 pr-2 border-r border-[#373737]">
          <span className="text-xs text-[#6b6b6b] px-1">Row</span>
          <ToolbarButton
            onClick={() => editor.chain().focus().addRowBefore().run()}
            disabled={!editor.can().addRowBefore()}
            title="Add row above"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().addRowAfter().run()}
            disabled={!editor.can().addRowAfter()}
            title="Add row below"
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().deleteRow().run()}
            disabled={!editor.can().deleteRow()}
            title="Delete row"
            variant="danger"
          >
            <Minus className="w-3.5 h-3.5" />
          </ToolbarButton>
        </div>

        {/* Column operations */}
        <div className="flex items-center gap-0.5 px-2 border-r border-[#373737]">
          <span className="text-xs text-[#6b6b6b] px-1">Col</span>
          <ToolbarButton
            onClick={() => editor.chain().focus().addColumnBefore().run()}
            disabled={!editor.can().addColumnBefore()}
            title="Add column left"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().addColumnAfter().run()}
            disabled={!editor.can().addColumnAfter()}
            title="Add column right"
          >
            <ArrowRight className="w-3.5 h-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().deleteColumn().run()}
            disabled={!editor.can().deleteColumn()}
            title="Delete column"
            variant="danger"
          >
            <Minus className="w-3.5 h-3.5" />
          </ToolbarButton>
        </div>

        {/* Merge/Split */}
        <div className="flex items-center gap-0.5 px-2 border-r border-[#373737]">
          <ToolbarButton
            onClick={() => editor.chain().focus().mergeCells().run()}
            disabled={!editor.can().mergeCells()}
            title="Merge cells"
          >
            <MergeIcon className="w-3.5 h-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().splitCell().run()}
            disabled={!editor.can().splitCell()}
            title="Split cell"
          >
            <SplitIcon className="w-3.5 h-3.5" />
          </ToolbarButton>
        </div>

        {/* Toggle header */}
        <div className="flex items-center gap-0.5 px-2 border-r border-[#373737]">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeaderRow().run()}
            title="Toggle header row"
          >
            <RowsIcon className="w-3.5 h-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeaderColumn().run()}
            title="Toggle header column"
          >
            <Columns className="w-3.5 h-3.5" />
          </ToolbarButton>
        </div>

        {/* Delete table */}
        <div className="flex items-center gap-0.5 pl-1">
          <ToolbarButton
            onClick={() => editor.chain().focus().deleteTable().run()}
            disabled={!editor.can().deleteTable()}
            title="Delete table"
            variant="danger"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </ToolbarButton>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
