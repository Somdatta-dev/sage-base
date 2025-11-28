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
} from "lucide-react";
import { useAIStore } from "@/lib/store";
import { aiApi } from "@/lib/api";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls?: Array<{ name: string; args: Record<string, unknown> }>;
  timestamp: Date;
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (aiSidebarOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [aiSidebarOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    addMessage(userMessage);
    setInput("");
    setLoading(true);

    try {
      const response = await aiApi.chat(input.trim(), pageContext?.spaceId, pageContext?.pageId);

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
                          <motion.button
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.5 }}
                            onClick={() => setInput(`Explain the code in "${pageContext.pageTitle}"`)}
                            className="w-full text-left px-3 py-2 rounded-lg bg-[#2d2d2d] hover:bg-[#373737] text-sm text-[#9b9b9b] hover:text-[#e3e3e3] transition-colors"
                          >
                            💡 Explain the code
                          </motion.button>
                          <motion.button
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.6 }}
                            onClick={() => setInput("Find related pages in the knowledge base")}
                            className="w-full text-left px-3 py-2 rounded-lg bg-[#2d2d2d] hover:bg-[#373737] text-sm text-[#9b9b9b] hover:text-[#e3e3e3] transition-colors"
                          >
                            🔍 Find related pages
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
                        className={`flex ${
                          message.role === "user" ? "justify-end" : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[85%] rounded-xl px-3 py-2 ${
                            message.role === "user"
                              ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                              : "bg-[#2d2d2d] text-[#e3e3e3]"
                          }`}
                        >
                          {/* Tool calls indicator */}
                          {message.toolCalls && message.toolCalls.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {message.toolCalls.map((tool, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-[#373737]/50 text-[#9b9b9b]"
                                >
                                  {getToolIcon(tool.name)}
                                  {tool.name.replace(/_/g, " ")}
                                </span>
                              ))}
                            </div>
                          )}
                          {message.role === "assistant" ? (
                            <div className="text-sm prose prose-sm prose-invert max-w-none prose-p:my-2 prose-p:leading-relaxed prose-headings:mt-4 prose-headings:mb-2 prose-headings:font-semibold prose-h2:text-base prose-h3:text-sm prose-ul:my-2 prose-ol:my-2 prose-li:my-1 prose-code:bg-[#373737] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-purple-300 prose-code:text-xs prose-pre:bg-[#1a1a1a] prose-pre:border prose-pre:border-[#373737] prose-pre:rounded-lg prose-strong:text-purple-300 prose-strong:font-semibold first:prose-headings:mt-0">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {message.content}
                              </ReactMarkdown>
                            </div>
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
                <form onSubmit={handleSubmit} className="flex gap-2">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={
                      aiEnabled
                        ? "Ask anything..."
                        : "Configure OPENAI_API_KEY"
                    }
                    disabled={!aiEnabled || loading}
                    className="flex-1 resize-none px-3 py-2 bg-[#2d2d2d] border border-[#373737] rounded-lg text-sm text-[#e3e3e3] placeholder-[#6b6b6b] focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    rows={1}
                    style={{ minHeight: "40px", maxHeight: "100px" }}
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
