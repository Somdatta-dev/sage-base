"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Languages, Loader2, Search, Globe, Check } from "lucide-react";
import { aiApi } from "@/lib/api";

interface TranslateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTranslate: (translatedText: string, targetLanguage: string) => void;
  textToTranslate: string;
  mode: "selection" | "page";
}

// Popular languages shown at top
const POPULAR_LANGUAGES = ["es", "fr", "de", "zh", "ja", "pt", "ar", "hi", "ko", "ru"];

export function TranslateModal({
  isOpen,
  onClose,
  onTranslate,
  textToTranslate,
  mode,
}: TranslateModalProps) {
  const [languages, setLanguages] = useState<Record<string, string>>({});
  const [selectedLanguage, setSelectedLanguage] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch supported languages
  useEffect(() => {
    if (isOpen && Object.keys(languages).length === 0) {
      loadLanguages();
    }
  }, [isOpen]);

  const loadLanguages = async () => {
    setLoading(true);
    try {
      const response = await aiApi.getTranslateLanguages();
      setLanguages(response.languages);
    } catch (err) {
      console.error("Failed to load languages:", err);
      setError("Failed to load languages");
    } finally {
      setLoading(false);
    }
  };

  const handleTranslate = async () => {
    if (!selectedLanguage || translating) return;

    setTranslating(true);
    setError(null);

    try {
      const response = await aiApi.translate(textToTranslate, selectedLanguage);
      onTranslate(response.translated_text, response.target_language_name);
      onClose();
    } catch (err) {
      console.error("Translation failed:", err);
      setError("Translation failed. Please try again.");
    } finally {
      setTranslating(false);
    }
  };

  // Filter languages based on search
  const filteredLanguages = Object.entries(languages).filter(([code, name]) =>
    name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Separate popular and other languages
  const popularLangs = filteredLanguages.filter(([code]) => POPULAR_LANGUAGES.includes(code));
  const otherLangs = filteredLanguages.filter(([code]) => !POPULAR_LANGUAGES.includes(code));

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-[#252525] border border-[#373737] rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#373737]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                <Languages className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-sm font-medium text-[#e3e3e3]">
                  Translate {mode === "page" ? "Page" : "Selection"}
                </h2>
                <p className="text-xs text-[#6b6b6b]">
                  {textToTranslate.length > 50
                    ? `${textToTranslate.slice(0, 50)}...`
                    : textToTranslate.slice(0, 50)}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-[#373737] text-[#9b9b9b] hover:text-[#e3e3e3] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Search */}
          <div className="px-4 py-3 border-b border-[#373737]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b6b6b]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search languages..."
                className="w-full pl-9 pr-4 py-2 bg-[#191919] border border-[#373737] rounded-lg text-sm text-[#e3e3e3] placeholder-[#6b6b6b] focus:outline-none focus:border-blue-500"
                autoFocus
              />
            </div>
          </div>

          {/* Language List */}
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              </div>
            ) : (
              <>
                {/* Popular Languages */}
                {popularLangs.length > 0 && !searchQuery && (
                  <div className="px-4 py-2">
                    <p className="text-xs font-medium text-[#6b6b6b] mb-2 flex items-center gap-1.5">
                      <Globe className="w-3 h-3" /> Popular
                    </p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {popularLangs.map(([code, name]) => (
                        <button
                          key={code}
                          onClick={() => setSelectedLanguage(code)}
                          className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                            selectedLanguage === code
                              ? "bg-blue-500/20 text-blue-400 border border-blue-500/50"
                              : "bg-[#2d2d2d] text-[#9b9b9b] hover:bg-[#373737] hover:text-[#e3e3e3] border border-transparent"
                          }`}
                        >
                          <span>{name}</span>
                          {selectedLanguage === code && (
                            <Check className="w-3.5 h-3.5" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Divider */}
                {popularLangs.length > 0 && otherLangs.length > 0 && !searchQuery && (
                  <div className="border-t border-[#373737] my-2" />
                )}

                {/* All Languages */}
                {(searchQuery ? filteredLanguages : otherLangs).length > 0 && (
                  <div className="px-4 py-2">
                    {!searchQuery && (
                      <p className="text-xs font-medium text-[#6b6b6b] mb-2">
                        All Languages
                      </p>
                    )}
                    <div className="space-y-1">
                      {(searchQuery ? filteredLanguages : otherLangs).map(([code, name]) => (
                        <button
                          key={code}
                          onClick={() => setSelectedLanguage(code)}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                            selectedLanguage === code
                              ? "bg-blue-500/20 text-blue-400 border border-blue-500/50"
                              : "bg-[#2d2d2d] text-[#9b9b9b] hover:bg-[#373737] hover:text-[#e3e3e3] border border-transparent"
                          }`}
                        >
                          <span>{name}</span>
                          {selectedLanguage === code && (
                            <Check className="w-3.5 h-3.5" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {filteredLanguages.length === 0 && (
                  <div className="px-4 py-8 text-center text-sm text-[#6b6b6b]">
                    No languages found
                  </div>
                )}
              </>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="px-4 py-2 bg-red-500/10 border-t border-red-500/20">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Footer */}
          <div className="px-4 py-3 border-t border-[#373737] flex items-center justify-between">
            <p className="text-xs text-[#6b6b6b]">
              {selectedLanguage
                ? `Translate to ${languages[selectedLanguage]}`
                : "Select a language"}
            </p>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-3 py-1.5 text-sm text-[#9b9b9b] hover:text-[#e3e3e3] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleTranslate}
                disabled={!selectedLanguage || translating}
                className="px-4 py-1.5 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm text-white font-medium transition-all flex items-center gap-2"
              >
                {translating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Translating...
                  </>
                ) : (
                  <>
                    <Languages className="w-3.5 h-3.5" />
                    Translate
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
