"use client";

import { useEditor, EditorContent, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { EditorToolbar } from "./EditorToolbar";
import { SlashCommand } from "./SlashCommand";
import { ResizableImage } from "./ResizableImage";
import { CustomCodeBlock, CustomBlockquote } from "./CustomExtensions";
import { AISelectionPopup } from "../ai/AISelectionPopup";
import { useAIStore } from "@/lib/store";

interface PageEditorProps {
  content: Record<string, unknown> | null;
  onChange: (content: Record<string, unknown>) => void;
  editable?: boolean;
}

interface SelectionState {
  text: string;
  position: { x: number; y: number };
  from: number;
  to: number;
}

export function PageEditor({
  content,
  onChange,
  editable = true,
}: PageEditorProps) {
  const { aiEnabled } = useAIStore();
  const [selection, setSelection] = useState<SelectionState | null>(null);
  const [showFlash, setShowFlash] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: false,
        blockquote: false,
      }),
      CustomCodeBlock,
      CustomBlockquote,
      Placeholder.configure({
        placeholder: ({ node }) => {
          if (node.type.name === "heading") {
            return `Heading ${node.attrs.level}`;
          }
          return "Start writing, or press '/' for commands...";
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-[#e3e3e3] underline hover:text-[#9b9b9b] cursor-pointer",
        },
      }),
      ResizableImage,
      TaskList.configure({
        HTMLAttributes: { class: "not-prose" },
      }),
      TaskItem.configure({
        nested: true,
        HTMLAttributes: { class: "flex gap-2 items-start" },
      }),
      SlashCommand,
    ],
    content: content as JSONContent,
    editable,
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON() as Record<string, unknown>);
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-invert prose-lg max-w-none focus:outline-none min-h-[300px]",
      },
    },
    immediatelyRender: false,
  });

  // Handle text selection
  const handleSelectionChange = useCallback(() => {
    if (!editor || !editable || !aiEnabled) return;

    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, " ");

    if (selectedText && selectedText.trim().length > 3) {
      // Get selection coordinates
      const domSelection = window.getSelection();
      if (domSelection && domSelection.rangeCount > 0) {
        const range = domSelection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        setSelection({
          text: selectedText,
          position: {
            x: rect.left + rect.width / 2 - 150, // Center the popup
            y: rect.bottom + 10,
          },
          from,
          to,
        });
      }
    } else {
      setSelection(null);
    }
  }, [editor, editable, aiEnabled]);

  // Listen for selection changes
  useEffect(() => {
    if (!editor) return;

    const handleMouseUp = (e: MouseEvent) => {
      // Don't recalculate selection if clicking inside the AI popup
      if (popupRef.current && popupRef.current.contains(e.target as Node)) {
        return;
      }
      // Small delay to ensure selection is complete
      setTimeout(handleSelectionChange, 10);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      // Check for selection with shift+arrow keys
      if (e.shiftKey) {
        setTimeout(handleSelectionChange, 10);
      }
    };

    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("keyup", handleKeyUp);

    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("keyup", handleKeyUp);
    };
  }, [editor, handleSelectionChange]);

  // Handle text replacement with animation
  const handleReplaceText = useCallback(
    (newText: string) => {
      if (!editor || !selection) return;

      // Trigger flash animation
      setShowFlash(true);

      // Replace the text
      editor
        .chain()
        .focus()
        .setTextSelection({ from: selection.from, to: selection.to })
        .deleteSelection()
        .insertContent(newText)
        .run();

      // Hide popup
      setSelection(null);

      // Reset flash after animation
      setTimeout(() => setShowFlash(false), 500);
    },
    [editor, selection]
  );

  const handleClosePopup = useCallback(() => {
    setSelection(null);
  }, []);

  useEffect(() => {
    if (editor && content) {
      const currentContent = JSON.stringify(editor.getJSON());
      const newContent = JSON.stringify(content);
      if (currentContent !== newContent && newContent !== "null") {
        editor.commands.setContent(content as JSONContent);
      }
    }
  }, [content, editor]);

  useEffect(() => {
    if (editor) {
      editor.setEditable(editable);
    }
  }, [editor, editable]);

  if (!editor) {
    return (
      <div className="min-h-[300px] animate-pulse bg-white/5 rounded-lg" />
    );
  }

  return (
    <div className="novel-editor relative">
      {editable && <EditorToolbar editor={editor} />}
      
      {/* Flash animation overlay */}
      <AnimatePresence>
        {showFlash && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 pointer-events-none z-10"
            style={{
              background: "linear-gradient(to right, transparent, rgba(139, 92, 246, 0.1), transparent)",
            }}
          />
        )}
      </AnimatePresence>

      <EditorContent editor={editor} />

      {/* AI Selection Popup */}
      <AnimatePresence>
        {selection && editable && aiEnabled && (
          <div ref={popupRef}>
            <AISelectionPopup
              selectedText={selection.text}
              position={selection.position}
              onClose={handleClosePopup}
              onReplace={handleReplaceText}
            />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
