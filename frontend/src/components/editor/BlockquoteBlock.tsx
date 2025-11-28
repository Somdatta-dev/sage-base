"use client";

import { NodeViewContent, NodeViewWrapper, NodeViewProps } from "@tiptap/react";
import { Copy, Trash2, Check } from "lucide-react";
import { useState } from "react";

export function BlockquoteComponent({ node, deleteNode }: NodeViewProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const text = node.textContent;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = () => {
    deleteNode();
  };

  return (
    <NodeViewWrapper className="relative group my-3">
      {/* Action buttons */}
      <div className="absolute right-2 top-2 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <button
          onClick={handleCopy}
          className="p-1.5 rounded hover:bg-[#373737] text-[#9b9b9b] hover:text-[#e3e3e3] transition-colors"
          title="Copy quote"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-green-500" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
        </button>
        <button
          onClick={handleDelete}
          className="p-1.5 rounded hover:bg-[#373737] text-[#9b9b9b] hover:text-[#eb5757] transition-colors"
          title="Delete block"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Blockquote content - Notion style */}
      <blockquote className="border-l-[3px] border-[#373737] pl-4 py-1 text-[#e3e3e3]">
        <NodeViewContent />
      </blockquote>
    </NodeViewWrapper>
  );
}
