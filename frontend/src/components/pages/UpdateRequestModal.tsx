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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { pagesApi } from "@/lib/api";
import { toast } from "sonner";

interface UpdateRequestModalProps {
  pageId: number;
  currentTitle: string;
  currentContent: Record<string, unknown> | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function UpdateRequestModal({
  pageId,
  currentTitle,
  currentContent,
  open,
  onClose,
  onSuccess,
}: UpdateRequestModalProps) {
  const [title, setTitle] = useState(currentTitle);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    setIsSubmitting(true);
    try {
      await pagesApi.createUpdateRequest(pageId, {
        title: title.trim(),
        content_json: currentContent || undefined,
        message: message.trim() || undefined,
      });
      toast.success("Update request submitted successfully");
      setMessage("");
      onClose();
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit request");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Submit Update Request</DialogTitle>
          <DialogDescription>
            This page requires approval. The page owner will review your changes
            before they are published.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Page Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter page title"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="message">
              Message to Page Owner <span className="text-gray-500">(optional)</span>
            </Label>
            <Textarea
              id="message"
              placeholder="Describe your changes and why they should be approved..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              💡 <strong>Tip:</strong> Your current edits will be included in this
              request. The page owner can review the full diff before approving.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Submit Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
