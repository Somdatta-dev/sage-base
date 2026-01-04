"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { pagesApi } from "@/lib/api";
import { toast } from "sonner";
import type { VersionDiff } from "@/types";

interface DiffViewerProps {
  pageId: number;
  fromVersion: number;
  toVersion: number;
  open: boolean;
  onClose: () => void;
}

export function DiffViewer({
  pageId,
  fromVersion,
  toVersion,
  open,
  onClose,
}: DiffViewerProps) {
  const [diff, setDiff] = useState<VersionDiff | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchDiff();
    }
  }, [open, pageId, fromVersion, toVersion]);

  const fetchDiff = async () => {
    setLoading(true);
    try {
      const data = await pagesApi.getDiff(pageId, fromVersion, toVersion);
      setDiff(data);
    } catch (error) {
      toast.error("Failed to load diff");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const renderDiff = () => {
    if (!diff) return null;

    return (
      <div className="font-mono text-sm">
        {diff.text_diff.map((part, index) => {
          const [operation, text] = part;

          // operation: -1 = deletion, 0 = unchanged, 1 = addition
          if (operation === -1) {
            // Deletion - red background
            return (
              <div key={index} className="bg-red-50 border-l-4 border-red-500 px-2 py-1">
                <span className="text-red-700">- {text}</span>
              </div>
            );
          } else if (operation === 1) {
            // Addition - green background
            return (
              <div key={index} className="bg-green-50 border-l-4 border-green-500 px-2 py-1">
                <span className="text-green-700">+ {text}</span>
              </div>
            );
          } else {
            // Unchanged - gray
            return (
              <div key={index} className="px-2 py-1 text-gray-600">
                <span>  {text}</span>
              </div>
            );
          }
        })}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>
            Comparing Version {fromVersion} → {toVersion}
          </DialogTitle>
          <DialogDescription>
            {diff && (
              <div className="flex gap-2 mt-2">
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                  +{diff.stats.additions} additions
                </Badge>
                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
                  -{diff.stats.deletions} deletions
                </Badge>
                <Badge variant="outline">
                  {diff.stats.unchanged} unchanged
                </Badge>
              </div>
            )}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[500px]">
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading diff...</div>
          ) : diff ? (
            <div className="border rounded-lg overflow-hidden">
              {renderDiff()}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">No changes found</div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
