"use client";

import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { Blockquote } from "@tiptap/extension-blockquote";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { common, createLowlight } from "lowlight";
import { CodeBlockComponent } from "./CodeBlock";
import { BlockquoteComponent } from "./BlockquoteBlock";

// Create lowlight instance with common languages
const lowlight = createLowlight(common);

// Custom CodeBlock with syntax highlighting and action buttons
export const CustomCodeBlock = CodeBlockLowlight.extend({
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockComponent);
  },
}).configure({
  lowlight,
  defaultLanguage: "plaintext",
});

// Custom Blockquote with action buttons
export const CustomBlockquote = Blockquote.extend({
  addNodeView() {
    return ReactNodeViewRenderer(BlockquoteComponent);
  },
});

