"use client";

import { useEffect, useState } from "react";
import { X, Clock, Loader2, ChevronRight } from "lucide-react";
import { pagesApi } from "@/lib/api";
import type { PageVersion } from "@/types";
import { formatDateTime } from "@/lib/utils";

interface VersionHistoryModalProps {
  open: boolean;
  onClose: () => void;
  pageId: number;
  currentVersion: number;
}

export function VersionHistoryModal({
  open,
  onClose,
  pageId,
  currentVersion,
}: VersionHistoryModalProps) {
  const [versions, setVersions] = useState<PageVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<PageVersion | null>(null);

  useEffect(() => {
    if (open) {
      loadVersions();
    }
  }, [open, pageId]);

  const loadVersions = async () => {
    setLoading(true);
    try {
      const data = await pagesApi.getVersions(pageId);
      setVersions(data);
    } catch (error) {
      console.error("Failed to load versions:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-3xl h-[80vh] bg-slate-900 border border-white/10 rounded-2xl shadow-2xl animate-fade-in flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-sage-400" />
            Version History
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Version List */}
          <div className="w-72 border-r border-white/10 overflow-y-auto">
            <div className="p-4">
              {/* Current Version */}
              <div className="mb-4">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                  Current Version
                </p>
                <div className="px-4 py-3 bg-sage-900/50 rounded-lg">
                  <p className="font-medium text-sage-300">
                    Version {currentVersion}
                  </p>
                  <p className="text-xs text-gray-500">Live</p>
                </div>
              </div>

              {/* Previous Versions */}
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                Previous Versions
              </p>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
                </div>
              ) : versions.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">
                  No previous versions
                </p>
              ) : (
                <div className="space-y-2">
                  {versions.map((version) => (
                    <button
                      key={version.id}
                      onClick={() => setSelectedVersion(version)}
                      className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                        selectedVersion?.id === version.id
                          ? "bg-white/10"
                          : "hover:bg-white/5"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-white">
                          Version {version.version}
                        </p>
                        <ChevronRight className="w-4 h-4 text-gray-500" />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDateTime(version.created_at)}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Version Preview */}
          <div className="flex-1 overflow-y-auto p-6">
            {selectedVersion ? (
              <div>
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-white mb-1">
                    Version {selectedVersion.version}
                  </h3>
                  <p className="text-sm text-gray-400">
                    Saved on {formatDateTime(selectedVersion.created_at)}
                  </p>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                  <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono">
                    {JSON.stringify(selectedVersion.content_json, null, 2)}
                  </pre>
                </div>

                <div className="mt-6 flex gap-3">
                  <button className="px-4 py-2 bg-sage-600 hover:bg-sage-500 text-white text-sm rounded-lg transition-colors">
                    Restore This Version
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <p>Select a version to preview</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

