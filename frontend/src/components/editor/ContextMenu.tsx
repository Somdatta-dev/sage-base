"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Editor } from "@tiptap/react";
import {
  Copy,
  Scissors,
  ClipboardPaste,
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Trash2,
  FileText,
  Type,
  Wand2,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Minus,
} from "lucide-react";

interface ContextMenuProps {
  editor: Editor;
  position: { x: number; y: number };
  onClose: () => void;
  onAIEdit?: () => void;
}

interface MenuItem {
  label: string;
  icon: React.ReactNode;
  action: () => void;
  shortcut?: string;
  divider?: boolean;
  disabled?: boolean;
}

export function ContextMenu({ editor, position, onClose, onAIEdit }: ContextMenuProps) {
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

  const hasSelection = !editor.state.selection.empty;
  const selectedText = editor.state.doc.textBetween(
    editor.state.selection.from,
    editor.state.selection.to,
    " "
  );
  const isInTable = editor.isActive("table");

  // Clipboard operations
  const handleCut = () => {
    document.execCommand("cut");
    onClose();
  };

  const handleCopy = () => {
    document.execCommand("copy");
    onClose();
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      editor.commands.insertContent(text);
    } catch {
      document.execCommand("paste");
    }
    onClose();
  };

  const handlePasteAsMarkdown = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const html = convertMarkdownToHtml(text);
      editor.commands.insertContent(html);
    } catch (error) {
      console.error("Failed to paste:", error);
    }
    onClose();
  };

  // Convert markdown text to HTML
  const convertMarkdownToHtml = (text: string): string => {
    const lines = text.split('\n');
    let html = '';
    let inCodeBlock = false;
    let codeContent = '';
    let codeLanguage = '';

    for (const line of lines) {
      if (line.startsWith('```')) {
        if (!inCodeBlock) {
          inCodeBlock = true;
          codeLanguage = line.slice(3).trim() || 'text';
          codeContent = '';
        } else {
          html += `<pre><code class="language-${codeLanguage}">${escapeHtml(codeContent.trim())}</code></pre>`;
          inCodeBlock = false;
        }
        continue;
      }

      if (inCodeBlock) {
        codeContent += line + '\n';
        continue;
      }

      if (line.startsWith('# ')) {
        html += `<h1>${processInlineMarkdown(line.slice(2))}</h1>`;
      } else if (line.startsWith('## ')) {
        html += `<h2>${processInlineMarkdown(line.slice(3))}</h2>`;
      } else if (line.startsWith('### ')) {
        html += `<h3>${processInlineMarkdown(line.slice(4))}</h3>`;
      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        html += `<ul><li>${processInlineMarkdown(line.slice(2))}</li></ul>`;
      } else if (/^\d+\.\s/.test(line)) {
        html += `<ol><li>${processInlineMarkdown(line.replace(/^\d+\.\s/, ''))}</li></ol>`;
      } else if (line.startsWith('> ')) {
        html += `<blockquote><p>${processInlineMarkdown(line.slice(2))}</p></blockquote>`;
      } else if (line.trim() === '---' || line.trim() === '***') {
        html += '<hr>';
      } else if (line.trim()) {
        html += `<p>${processInlineMarkdown(line)}</p>`;
      }
    }

    return html;
  };

  const processInlineMarkdown = (text: string): string => {
    return text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>');
  };

  const escapeHtml = (text: string): string => {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  };

  // Formatting operations
  const handleBold = () => {
    editor.chain().focus().toggleBold().run();
    onClose();
  };

  const handleItalic = () => {
    editor.chain().focus().toggleItalic().run();
    onClose();
  };

  const handleStrike = () => {
    editor.chain().focus().toggleStrike().run();
    onClose();
  };

  const handleHeading = (level: 1 | 2 | 3) => {
    editor.chain().focus().toggleHeading({ level }).run();
    onClose();
  };

  const handleBulletList = () => {
    editor.chain().focus().toggleBulletList().run();
    onClose();
  };

  const handleOrderedList = () => {
    editor.chain().focus().toggleOrderedList().run();
    onClose();
  };

  const handleBlockquote = () => {
    editor.chain().focus().toggleBlockquote().run();
    onClose();
  };

  const handleCodeBlock = () => {
    editor.chain().focus().toggleCodeBlock().run();
    onClose();
  };

  const handleDelete = () => {
    editor.chain().focus().deleteSelection().run();
    onClose();
  };

  const handleClearFormatting = () => {
    editor.chain().focus().clearNodes().unsetAllMarks().run();
    onClose();
  };

  const handleSelectAll = () => {
    editor.chain().focus().selectAll().run();
    onClose();
  };

  // Table operations
  const handleAddRowAbove = () => {
    editor.chain().focus().addRowBefore().run();
    onClose();
  };

  const handleAddRowBelow = () => {
    editor.chain().focus().addRowAfter().run();
    onClose();
  };

  const handleDeleteRow = () => {
    editor.chain().focus().deleteRow().run();
    onClose();
  };

  const handleAddColumnLeft = () => {
    editor.chain().focus().addColumnBefore().run();
    onClose();
  };

  const handleAddColumnRight = () => {
    editor.chain().focus().addColumnAfter().run();
    onClose();
  };

  const handleDeleteColumn = () => {
    editor.chain().focus().deleteColumn().run();
    onClose();
  };

  const handleDeleteTable = () => {
    editor.chain().focus().deleteTable().run();
    onClose();
  };

  // Adjust position to keep menu in viewport
  const adjustedPosition = {
    x: Math.min(position.x, window.innerWidth - 220),
    y: Math.min(position.y, window.innerHeight - 400),
  };

  const menuItems: MenuItem[] = [
    // Clipboard
    { label: "Cut", icon: <Scissors className="w-4 h-4" />, action: handleCut, shortcut: "Ctrl+X", disabled: !hasSelection },
    { label: "Copy", icon: <Copy className="w-4 h-4" />, action: handleCopy, shortcut: "Ctrl+C", disabled: !hasSelection },
    { label: "Paste", icon: <ClipboardPaste className="w-4 h-4" />, action: handlePaste, shortcut: "Ctrl+V" },
    { label: "Paste as Markdown", icon: <FileText className="w-4 h-4" />, action: handlePasteAsMarkdown, divider: true },
    
    // AI (if selection exists)
    ...(hasSelection && onAIEdit ? [
      { label: "Edit with AI", icon: <Wand2 className="w-4 h-4" />, action: () => { onAIEdit(); onClose(); }, divider: true },
    ] : []),

    // Table operations (if in table)
    ...(isInTable ? [
      { label: "Add Row Above", icon: <ArrowUp className="w-4 h-4" />, action: handleAddRowAbove },
      { label: "Add Row Below", icon: <ArrowDown className="w-4 h-4" />, action: handleAddRowBelow },
      { label: "Delete Row", icon: <Minus className="w-4 h-4" />, action: handleDeleteRow },
      { label: "Add Column Left", icon: <ArrowLeft className="w-4 h-4" />, action: handleAddColumnLeft },
      { label: "Add Column Right", icon: <ArrowRight className="w-4 h-4" />, action: handleAddColumnRight },
      { label: "Delete Column", icon: <Minus className="w-4 h-4" />, action: handleDeleteColumn },
      { label: "Delete Table", icon: <Trash2 className="w-4 h-4" />, action: handleDeleteTable, divider: true },
    ] : []),
    
    // Formatting (if selection exists)
    ...(hasSelection ? [
      { label: "Bold", icon: <Bold className="w-4 h-4" />, action: handleBold, shortcut: "Ctrl+B" },
      { label: "Italic", icon: <Italic className="w-4 h-4" />, action: handleItalic, shortcut: "Ctrl+I" },
      { label: "Strikethrough", icon: <Strikethrough className="w-4 h-4" />, action: handleStrike, divider: true },
    ] : []),
    
    // Block formatting (hide when in table to reduce menu length)
    ...(!isInTable ? [
      { label: "Heading 1", icon: <Heading1 className="w-4 h-4" />, action: () => handleHeading(1) },
      { label: "Heading 2", icon: <Heading2 className="w-4 h-4" />, action: () => handleHeading(2) },
      { label: "Heading 3", icon: <Heading3 className="w-4 h-4" />, action: () => handleHeading(3), divider: true },
      { label: "Bullet List", icon: <List className="w-4 h-4" />, action: handleBulletList },
      { label: "Numbered List", icon: <ListOrdered className="w-4 h-4" />, action: handleOrderedList },
      { label: "Quote", icon: <Quote className="w-4 h-4" />, action: handleBlockquote },
      { label: "Code Block", icon: <Code className="w-4 h-4" />, action: handleCodeBlock, divider: true },
    ] : []),
    
    // Other actions
    { label: "Clear Formatting", icon: <Type className="w-4 h-4" />, action: handleClearFormatting, disabled: !hasSelection },
    { label: "Select All", icon: <FileText className="w-4 h-4" />, action: handleSelectAll },
    ...(hasSelection ? [
      { label: "Delete", icon: <Trash2 className="w-4 h-4" />, action: handleDelete },
    ] : []),
  ];

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
          zIndex: 100,
        }}
        className="w-52 bg-[#252525] border border-[#373737] rounded-lg shadow-2xl py-1 overflow-hidden"
      >
        {menuItems.map((item, index) => (
          <div key={index}>
            <button
              onClick={item.action}
              disabled={item.disabled}
              className={`w-full flex items-center gap-3 px-3 py-1.5 text-sm text-left transition-colors ${
                item.disabled
                  ? "text-[#6b6b6b] cursor-not-allowed"
                  : "text-[#e3e3e3] hover:bg-[#373737]"
              }`}
            >
              <span className={item.disabled ? "text-[#4b4b4b]" : "text-[#9b9b9b]"}>
                {item.icon}
              </span>
              <span className="flex-1">{item.label}</span>
              {item.shortcut && (
                <span className="text-xs text-[#6b6b6b]">{item.shortcut}</span>
              )}
            </button>
            {item.divider && <div className="my-1 border-t border-[#373737]" />}
          </div>
        ))}
      </motion.div>
    </AnimatePresence>
  );
}

