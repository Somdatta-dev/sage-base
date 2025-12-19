"use client";

import { type Editor } from "@tiptap/react";
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  List,
  ListOrdered,
  Quote,
  Heading1,
  Heading2,
  Heading3,
  Link,
  Image,
  CheckSquare,
  Minus,
  Undo,
  Redo,
  Languages,
  Table,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCallback, useState, useRef, useEffect } from "react";
import { filesApi } from "@/lib/api";
import { TranslateModal } from "./TranslateModal";
import { useAIStore } from "@/lib/store";

interface EditorToolbarProps {
  editor: Editor;
}

export function EditorToolbar({ editor }: EditorToolbarProps) {
  const { aiEnabled } = useAIStore();
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [showTranslateModal, setShowTranslateModal] = useState(false);
  const [showTablePicker, setShowTablePicker] = useState(false);
  const [hoveredTableSize, setHoveredTableSize] = useState({ rows: 0, cols: 0 });
  const tablePickerRef = useRef<HTMLDivElement>(null);

  // Close table picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (tablePickerRef.current && !tablePickerRef.current.contains(e.target as Node)) {
        setShowTablePicker(false);
        setHoveredTableSize({ rows: 0, cols: 0 });
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const insertTable = useCallback((rows: number, cols: number) => {
    editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run();
    setShowTablePicker(false);
    setHoveredTableSize({ rows: 0, cols: 0 });
  }, [editor]);

  const addImage = useCallback(async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      if (input.files?.length) {
        try {
          const response = await filesApi.upload(input.files[0]);
          editor
            .chain()
            .focus()
            .insertContent({
              type: "image",
              attrs: { src: response.url },
            })
            .run();
        } catch (error) {
          console.error("Failed to upload image:", error);
        }
      }
    };
    input.click();
  }, [editor]);

  const setLink = useCallback(() => {
    if (linkUrl) {
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: linkUrl })
        .run();
    } else {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    }
    setShowLinkInput(false);
    setLinkUrl("");
  }, [editor, linkUrl]);

  // Get all text content from the editor for translation
  const getPageContent = useCallback(() => {
    return editor.state.doc.textContent;
  }, [editor]);

  // Handle translated page content - replaces entire document text
  const handlePageTranslate = useCallback((translatedText: string) => {
    // Replace the entire content with translated text
    // This creates a simple paragraph structure
    editor
      .chain()
      .focus()
      .selectAll()
      .deleteSelection()
      .insertContent(translatedText)
      .run();
  }, [editor]);

  const ToolbarButton = ({
    onClick,
    isActive,
    disabled,
    children,
    title,
  }: {
    onClick: () => void;
    isActive?: boolean;
    disabled?: boolean;
    children: React.ReactNode;
    title: string;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "p-1.5 rounded transition-colors disabled:opacity-30",
        isActive
          ? "bg-[#373737] text-[#e3e3e3]"
          : "text-[#9b9b9b] hover:bg-[#2d2d2d] hover:text-[#e3e3e3]"
      )}
    >
      {children}
    </button>
  );

  return (
    <div className="flex flex-wrap items-center gap-0.5 p-1.5 mb-4 bg-[#252525] border border-[#373737] rounded-md">
      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        title="Undo"
      >
        <Undo className="w-4 h-4" />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        title="Redo"
      >
        <Redo className="w-4 h-4" />
      </ToolbarButton>

      <div className="w-px h-5 bg-[#373737] mx-1" />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive("bold")}
        title="Bold"
      >
        <Bold className="w-4 h-4" />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive("italic")}
        title="Italic"
      >
        <Italic className="w-4 h-4" />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={editor.isActive("strike")}
        title="Strikethrough"
      >
        <Strikethrough className="w-4 h-4" />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCode().run()}
        isActive={editor.isActive("code")}
        title="Inline Code"
      >
        <Code className="w-4 h-4" />
      </ToolbarButton>

      <div className="w-px h-5 bg-[#373737] mx-1" />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        isActive={editor.isActive("heading", { level: 1 })}
        title="Heading 1"
      >
        <Heading1 className="w-4 h-4" />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive("heading", { level: 2 })}
        title="Heading 2"
      >
        <Heading2 className="w-4 h-4" />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        isActive={editor.isActive("heading", { level: 3 })}
        title="Heading 3"
      >
        <Heading3 className="w-4 h-4" />
      </ToolbarButton>

      <div className="w-px h-5 bg-[#373737] mx-1" />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive("bulletList")}
        title="Bullet List"
      >
        <List className="w-4 h-4" />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive("orderedList")}
        title="Numbered List"
      >
        <ListOrdered className="w-4 h-4" />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleTaskList().run()}
        isActive={editor.isActive("taskList")}
        title="Task List"
      >
        <CheckSquare className="w-4 h-4" />
      </ToolbarButton>

      <div className="w-px h-5 bg-[#373737] mx-1" />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={editor.isActive("blockquote")}
        title="Quote"
      >
        <Quote className="w-4 h-4" />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title="Divider"
      >
        <Minus className="w-4 h-4" />
      </ToolbarButton>

      <div className="w-px h-5 bg-[#373737] mx-1" />

      <div className="relative">
        <ToolbarButton
          onClick={() => setShowLinkInput(!showLinkInput)}
          isActive={editor.isActive("link")}
          title="Add Link"
        >
          <Link className="w-4 h-4" />
        </ToolbarButton>

        {showLinkInput && (
          <div className="absolute top-full left-0 mt-2 p-2 bg-[#252525] border border-[#373737] rounded-md shadow-lg z-10">
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://..."
              className="w-48 px-2 py-1.5 bg-[#191919] border border-[#373737] rounded text-sm text-[#e3e3e3] placeholder-[#6b6b6b] focus:outline-none focus:border-[#2383e2]"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  setLink();
                }
                if (e.key === "Escape") {
                  setShowLinkInput(false);
                }
              }}
              autoFocus
            />
          </div>
        )}
      </div>

      <ToolbarButton onClick={addImage} title="Add Image">
        <Image className="w-4 h-4" />
      </ToolbarButton>

      {/* Table with size picker */}
      <div className="relative" ref={tablePickerRef}>
        <ToolbarButton
          onClick={() => setShowTablePicker(!showTablePicker)}
          isActive={showTablePicker}
          title="Insert Table"
        >
          <Table className="w-4 h-4" />
        </ToolbarButton>

        {showTablePicker && (
          <div className="absolute top-full left-0 mt-2 p-3 bg-[#252525] border border-[#373737] rounded-lg shadow-xl z-20">
            <div className="mb-2 text-center">
              <span className="text-sm text-[#e3e3e3]">
                {hoveredTableSize.rows > 0 && hoveredTableSize.cols > 0
                  ? `${hoveredTableSize.rows} × ${hoveredTableSize.cols}`
                  : "Select table size"}
              </span>
            </div>
            
            <div 
              className="grid gap-1"
              style={{ gridTemplateColumns: "repeat(8, 1fr)" }}
              onMouseLeave={() => setHoveredTableSize({ rows: 0, cols: 0 })}
            >
              {Array.from({ length: 8 }).map((_, rowIndex) =>
                Array.from({ length: 8 }).map((_, colIndex) => {
                  const isHighlighted =
                    rowIndex < hoveredTableSize.rows && colIndex < hoveredTableSize.cols;

                  return (
                    <button
                      key={`${rowIndex}-${colIndex}`}
                      onMouseEnter={() => setHoveredTableSize({ rows: rowIndex + 1, cols: colIndex + 1 })}
                      onClick={() => insertTable(rowIndex + 1, colIndex + 1)}
                      className={`w-5 h-5 rounded-sm border transition-all ${
                        isHighlighted
                          ? "bg-blue-500 border-blue-400"
                          : "bg-[#373737] hover:bg-[#454545] border-[#454545]"
                      }`}
                    />
                  );
                })
              )}
            </div>

            <div className="mt-2 pt-2 border-t border-[#373737] flex justify-center">
              <button
                onClick={() => insertTable(3, 3)}
                className="text-xs text-[#9b9b9b] hover:text-[#e3e3e3] transition-colors"
              >
                Quick insert 3×3
              </button>
            </div>
          </div>
        )}
      </div>

      {aiEnabled && (
        <>
          <div className="w-px h-5 bg-[#373737] mx-1" />
          <ToolbarButton
            onClick={() => setShowTranslateModal(true)}
            title="Translate Page"
          >
            <Languages className="w-4 h-4" />
          </ToolbarButton>
        </>
      )}

      {/* Translate Modal */}
      <TranslateModal
        isOpen={showTranslateModal}
        onClose={() => setShowTranslateModal(false)}
        onTranslate={handlePageTranslate}
        textToTranslate={getPageContent()}
        mode="page"
      />
    </div>
  );
}
