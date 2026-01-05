"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Send,
  Sparkles,
  Loader2,
  Search,
  Globe,
  FileText,
  Trash2,
  MessageCircle,
  ChevronLeft,
  Paperclip,
  X,
  FileUp,
  Plus,
  Check,
} from "lucide-react";
import { useAIStore } from "@/lib/store";
import { aiApi, pagesApi } from "@/lib/api";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls?: Array<{ name: string; args: Record<string, unknown> }>;
  timestamp: Date;
  attachment?: {
    documentId: string;
    filename: string;
  };
}

interface AttachedDocument {
  documentId: string;
  filename: string;
  preview: string;
}

export function AISidebar() {
  const {
    messages,
    addMessage,
    clearMessages,
    aiEnabled,
    aiSidebarOpen,
    setAISidebarOpen,
    pageContext,
    triggerPageReload,
  } = useAIStore();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [inserting, setInserting] = useState(false);
  const [attachedDoc, setAttachedDoc] = useState<AttachedDocument | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Find the most recent draft_content across all messages
  const latestDraft = messages
    .slice()
    .reverse()
    .find(msg => msg.toolCalls?.some(tc => tc.name === "draft_content"));

  useEffect(() => {
    if (aiSidebarOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [aiSidebarOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const result = await aiApi.uploadDocument(file);
      setAttachedDoc({
        documentId: result.document_id,
        filename: result.filename,
        preview: result.markdown_preview,
      });
    } catch (error) {
      console.error("Failed to upload document:", error);
      // Show error in chat
      addMessage({
        id: Date.now().toString(),
        role: "assistant",
        content: `❌ Failed to upload document: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
      });
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const clearAttachment = () => {
    setAttachedDoc(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
      attachment: attachedDoc ? {
        documentId: attachedDoc.documentId,
        filename: attachedDoc.filename,
      } : undefined,
    };

    addMessage(userMessage);
    const currentInput = input.trim();
    const currentDocId = attachedDoc?.documentId;
    setInput("");
    setAttachedDoc(null); // Clear attachment after sending
    setLoading(true);

    try {
      const response = await aiApi.chat(
        currentInput,
        pageContext?.spaceId,
        pageContext?.pageId,
        currentDocId
      );

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response.response,
        toolCalls: response.tool_calls,
        timestamp: new Date(),
      };

      addMessage(assistantMessage);

      // If AI edited a page, trigger reload
      if (response.page_edited) {
        triggerPageReload();
      }

      // If AI created a page from document, could navigate or show link
      if (response.page_created && response.created_page_slug) {
        // Page was created - the response message will contain the details
      }
    } catch {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
      };
      addMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleInsertContent = async (content: string) => {
    if (!pageContext || inserting) return;

    setInserting(true);
    try {
      await pagesApi.appendContent(pageContext.pageId, content);
      triggerPageReload();

      addMessage({
        id: Date.now().toString(),
        role: "assistant",
        content: "✅ Content inserted successfully!",
        timestamp: new Date(),
      });
    } catch (error) {
      console.error("Failed to insert content:", error);
      addMessage({
        id: Date.now().toString(),
        role: "assistant",
        content: "❌ Failed to insert content. Please try again.",
        timestamp: new Date(),
      });
    } finally {
      setInserting(false);
    }
  };

  const handleSummarizePage = async () => {
    if (!pageContext || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: `Summarize "${pageContext.pageTitle}"`,
      timestamp: new Date(),
    };

    addMessage(userMessage);
    setLoading(true);

    try {
      const response = await aiApi.summarize(pageContext.pageId);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `## Summary: ${response.page_title}\n\n${response.summary}`,
        timestamp: new Date(),
      };

      addMessage(assistantMessage);
    } catch {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Sorry, I couldn't summarize this page. Please try again.",
        timestamp: new Date(),
      };
      addMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleClearChat = async () => {
    clearMessages();
    try {
      await aiApi.clearSession();
    } catch {
      // Ignore errors
    }
  };

  const getToolIcon = (toolName: string) => {
    switch (toolName) {
      case "search_knowledge_base":
        return <Search className="w-3 h-3" />;
      case "web_search":
        return <Globe className="w-3 h-3" />;
      case "summarize_page":
        return <FileText className="w-3 h-3" />;
      case "edit_page_content":
        return <FileText className="w-3 h-3" />;
      case "import_document_to_page":
        return <FileUp className="w-3 h-3" />;
      default:
        return <Sparkles className="w-3 h-3" />;
    }
  };

  return (
    <>
      {/* Floating Bubble Button - Always visible when sidebar is closed */}
      <AnimatePresence>
        {!aiSidebarOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            onClick={() => setAISidebarOpen(true)}
            className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg shadow-purple-500/25 flex items-center justify-center text-white hover:shadow-xl hover:shadow-purple-500/30 transition-shadow"
          >
            <MessageCircle className="w-6 h-6" />
            {/* Notification dot if AI is ready */}
            {aiEnabled && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-[#191919]"
              />
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence>
        {aiSidebarOpen && (
          <>
            {/* Backdrop for mobile */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/20 z-40 lg:hidden"
              onClick={() => setAISidebarOpen(false)}
            />

            {/* Sidebar Panel */}
            <motion.aside
              initial={{ x: "100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed right-0 top-0 bottom-0 w-[380px] max-w-full bg-[#202020] border-l border-[#373737] shadow-2xl z-50 flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#373737]">
                <div className="flex items-center gap-2">
                  <motion.div
                    initial={{ rotate: -180, scale: 0 }}
                    animate={{ rotate: 0, scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                    className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center"
                  >
                    <Sparkles className="w-4 h-4 text-white" />
                  </motion.div>
                  <div>
                    <span className="font-medium text-[#e3e3e3] text-sm">SageBase AI</span>
                    {!aiEnabled && (
                      <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-[#373737] text-[#9b9b9b]">
                        Not configured
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {messages.length > 0 && (
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleClearChat}
                      className="p-1.5 rounded hover:bg-[#373737] text-[#9b9b9b] hover:text-[#e3e3e3] transition-colors"
                      title="Clear chat"
                    >
                      <Trash2 className="w-4 h-4" />
                    </motion.button>
                  )}
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setAISidebarOpen(false)}
                    className="p-1.5 rounded hover:bg-[#373737] text-[#9b9b9b] hover:text-[#e3e3e3] transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4 rotate-180" />
                  </motion.button>
                </div>
              </div>

              {/* Summarize Current Page Button - Only show when on a page */}
              {pageContext && aiEnabled && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="px-4 py-2 border-b border-[#373737]"
                >
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSummarizePage}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 text-purple-300 hover:from-purple-500/30 hover:to-pink-500/30 disabled:opacity-50 transition-all text-sm"
                  >
                    <FileText className="w-4 h-4" />
                    Summarize "{pageContext.pageTitle.slice(0, 20)}{pageContext.pageTitle.length > 20 ? '...' : ''}"
                  </motion.button>
                </motion.div>
              )}

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="h-full flex flex-col items-center justify-center text-center px-4"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 200, delay: 0.3 }}
                      className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-4"
                    >
                      <Sparkles className="w-8 h-8 text-white" />
                    </motion.div>
                    <h3 className="text-lg font-medium text-[#e3e3e3] mb-2">
                      How can I help?
                    </h3>
                    <p className="text-sm text-[#9b9b9b] mb-6">
                      {pageContext
                        ? `I can help with "${pageContext.pageTitle}" or search your knowledge base.`
                        : "Search knowledge base, find info on the web, or summarize content."}
                    </p>
                    <div className="space-y-2 w-full">
                      {pageContext ? (
                        // Context-aware suggestions when on a page
                        <>
                          <motion.button
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.4 }}
                            onClick={handleSummarizePage}
                            disabled={loading || !aiEnabled}
                            className="w-full text-left px-3 py-2 rounded-lg bg-[#2d2d2d] hover:bg-[#373737] text-sm text-[#9b9b9b] hover:text-[#e3e3e3] transition-colors disabled:opacity-50"
                          >
                            📄 Summarize this page
                          </motion.button>
                        </>
                      ) : (
                        // Default suggestions when not on a page
                        [
                          "Search knowledge base for...",
                          "Find news about...",
                          "Help me write documentation",
                        ].map((suggestion, i) => (
                          <motion.button
                            key={suggestion}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.4 + i * 0.1 }}
                            onClick={() => setInput(suggestion)}
                            className="w-full text-left px-3 py-2 rounded-lg bg-[#2d2d2d] hover:bg-[#373737] text-sm text-[#9b9b9b] hover:text-[#e3e3e3] transition-colors"
                          >
                            {suggestion}
                          </motion.button>
                        ))
                      )}
                    </div>
                  </motion.div>
                ) : (
                  <AnimatePresence mode="popLayout">
                    {messages.map((message) => (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className={`flex ${message.role === "user" ? "justify-end" : "justify-start"
                          }`}
                      >
                        <div
                          className={`max-w-[85%] rounded-xl px-3 py-2 ${message.role === "user"
                            ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                            : "bg-[#2d2d2d] text-[#e3e3e3]"
                            }`}
                        >
                          {/* Tool calls indicator */}
                          {message.toolCalls && message.toolCalls.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {message.toolCalls.map((tool, idx) => {
                                if (tool.name === "draft_content") return null;
                                return (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-[#373737]/50 text-[#9b9b9b]"
                                  >
                                    {getToolIcon(tool.name)}
                                    {tool.name}
                                  </span>
                                );
                              })}
                            </div>
                          )}

                          {/* Draft Content Card - Only show for the most recent draft */}
                          {latestDraft && latestDraft.id === message.id && message.toolCalls && message.toolCalls.find(t => t.name === "draft_content") && (() => {
                            const draft = message.toolCalls!.find(t => t.name === "draft_content")!;
                            const content = draft.args?.content as string;
                            if (!content) return null;
                            return (
                              <div className="mt-1 mb-3 bg-[#1a1a1a] border border-[#373737] rounded-lg overflow-hidden w-full">
                                <div className="flex items-center justify-between px-3 py-2 bg-[#252525] border-b border-[#373737]">
                                  <span className="text-xs font-medium text-[#e3e3e3] flex items-center gap-1.5">
                                    <FileUp className="w-3 h-3 text-purple-400" /> Generated Draft
                                  </span>
                                  {pageContext && (
                                    <button
                                      onClick={() => handleInsertContent(content)}
                                      disabled={inserting}
                                      className="flex items-center gap-1.5 px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded transition-colors disabled:opacity-50"
                                    >
                                      {inserting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                                      Insert
                                    </button>
                                  )}
                                </div>
                                <div className="p-3 max-h-60 overflow-y-auto text-xs prose prose-invert prose-sm">
                                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {content}
                                  </ReactMarkdown>
                                </div>
                              </div>
                            );
                          })()}

                          {/* Attachment indicator for user messages */}
                          {message.attachment && (
                            <div className="flex items-center gap-1 mb-1 text-xs opacity-80">
                              <FileUp className="w-3 h-3" />
                              <span className="truncate max-w-[150px]">{message.attachment.filename}</span>
                            </div>
                          )}
                          {message.role === "assistant" ? (
                            (message.content !== "DRAFT_GENERATED") && (
                              <div className="text-sm prose prose-sm prose-invert max-w-none prose-p:my-2 prose-p:leading-relaxed prose-headings:mt-4 prose-headings:mb-2 prose-headings:font-semibold prose-h2:text-base prose-h3:text-sm prose-ul:my-2 prose-ol:my-2 prose-li:my-1 prose-code:bg-[#373737] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-purple-300 prose-code:text-xs prose-pre:bg-[#1a1a1a] prose-pre:border prose-pre:border-[#373737] prose-pre:rounded-lg prose-strong:text-purple-300 prose-strong:font-semibold first:prose-headings:mt-0">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                  {message.content}
                                </ReactMarkdown>
                              </div>
                            )
                          ) : (
                            <div className="text-sm whitespace-pre-wrap">
                              {message.content}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
                {loading && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-start"
                  >
                    <div className="bg-[#2d2d2d] rounded-xl px-4 py-3 flex items-center gap-2">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      >
                        <Loader2 className="w-4 h-4 text-purple-400" />
                      </motion.div>
                      <span className="text-sm text-[#9b9b9b]">Thinking...</span>
                    </div>
                  </motion.div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="p-3 border-t border-[#373737]"
              >
                {/* Attached Document Preview */}
                <AnimatePresence>
                  {attachedDoc && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="mb-2 p-2 bg-[#2d2d2d] border border-purple-500/30 rounded-lg"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-purple-400" />
                          <span className="text-xs text-[#e3e3e3] truncate max-w-[200px]">
                            {attachedDoc.filename}
                          </span>
                        </div>
                        <button
                          onClick={clearAttachment}
                          className="p-1 hover:bg-[#373737] rounded text-[#9b9b9b] hover:text-[#e3e3e3]"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      <p className="text-xs text-[#6b6b6b] mt-1 line-clamp-2">
                        {attachedDoc.preview.slice(0, 100)}...
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Uploading indicator */}
                <AnimatePresence>
                  {uploading && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="mb-2 p-2 bg-[#2d2d2d] rounded-lg flex items-center gap-2"
                    >
                      <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                      <span className="text-xs text-[#9b9b9b]">Processing document...</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <form onSubmit={handleSubmit} className="flex gap-2">
                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.pptx,.xlsx,.html,.md,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />

                  {/* Attachment button */}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={!aiEnabled || loading || uploading}
                    className="px-2 py-2 bg-[#2d2d2d] hover:bg-[#373737] border border-[#373737] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-[#9b9b9b] hover:text-[#e3e3e3] transition-all"
                    title="Attach document (PDF, DOCX, etc.)"
                  >
                    <Paperclip className="w-4 h-4" />
                  </motion.button>

                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={
                      attachedDoc
                        ? "Ask about this document or say 'import to page'..."
                        : aiEnabled
                          ? "Ask anything..."
                          : "Configure OPENAI_API_KEY"
                    }
                    disabled={!aiEnabled || loading}
                    className="flex-1 resize-none px-3 py-3 bg-[#2d2d2d] border border-[#373737] rounded-lg text-sm text-[#e3e3e3] placeholder-[#6b6b6b] focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    rows={2}
                    style={{ minHeight: "60px", maxHeight: "120px" }}
                  />
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="submit"
                    disabled={!input.trim() || loading || !aiEnabled}
                    className="px-3 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white transition-all shadow-lg shadow-purple-500/20"
                  >
                    <Send className="w-4 h-4" />
                  </motion.button>
                </form>
              </motion.div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
