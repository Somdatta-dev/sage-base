"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { pagesApi } from "@/lib/api";
import { toast } from "sonner";
import type { PageStatus } from "@/types";

interface PublishButtonProps {
  pageId: number;
  status: PageStatus;
  onPublish: () => void;
}

export function PublishButton({ pageId, status, onPublish }: PublishButtonProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [changeSummary, setChangeSummary] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);

  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      await pagesApi.publish(pageId, changeSummary || undefined);
      toast.success("Page published successfully");
      setShowDialog(false);
      setChangeSummary("");
      onPublish();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to publish page");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleUnpublish = async () => {
    try {
      await pagesApi.unpublish(pageId);
      toast.success("Page unpublished");
      onPublish();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to unpublish page");
    }
  };

  if (status === "published") {
    return (
      <button
        onClick={handleUnpublish}
        className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
      >
        Published ✓
      </button>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowDialog(true)}
        className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
      >
        Publish
      </button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Publish Page</DialogTitle>
            <DialogDescription>
              Publishing will create a new version and update the AI knowledge base.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="summary" className="block text-sm font-medium text-gray-300 mb-2">
                Change Summary <span className="text-gray-500">(optional)</span>
              </label>
              <textarea
                id="summary"
                placeholder="Describe what changed in this version..."
                value={changeSummary}
                onChange={(e) => setChangeSummary(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setShowDialog(false)}
              disabled={isPublishing}
            >
              Cancel
            </Button>
            <Button variant="primary" onClick={handlePublish} disabled={isPublishing}>
              {isPublishing ? "Publishing..." : "Publish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
