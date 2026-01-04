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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
      <Button
        variant="outline"
        size="sm"
        onClick={handleUnpublish}
        className="text-green-600 border-green-600 hover:bg-green-50"
      >
        Published ✓
      </Button>
    );
  }

  return (
    <>
      <Button
        onClick={() => setShowDialog(true)}
        size="sm"
        className="bg-blue-600 hover:bg-blue-700"
      >
        Publish
      </Button>

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
              <Label htmlFor="summary">
                Change Summary <span className="text-gray-500">(optional)</span>
              </Label>
              <Textarea
                id="summary"
                placeholder="Describe what changed in this version..."
                value={changeSummary}
                onChange={(e) => setChangeSummary(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDialog(false)}
              disabled={isPublishing}
            >
              Cancel
            </Button>
            <Button onClick={handlePublish} disabled={isPublishing}>
              {isPublishing ? "Publishing..." : "Publish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
