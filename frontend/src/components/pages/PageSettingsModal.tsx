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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Settings } from "lucide-react";
import { pagesApi } from "@/lib/api";
import { toast } from "sonner";
import type { EditMode } from "@/types";

interface PageSettingsModalProps {
  pageId: number;
  currentEditMode: EditMode;
  onUpdate: () => void;
}

export function PageSettingsModal({
  pageId,
  currentEditMode,
  onUpdate,
}: PageSettingsModalProps) {
  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState<EditMode>(currentEditMode);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await pagesApi.updateSettings(pageId, editMode);
      toast.success("Page settings updated");
      setOpen(false);
      onUpdate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update settings");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Page Settings</DialogTitle>
          <DialogDescription>
            Configure who can edit this page
          </DialogDescription>
        </DialogHeader>

        <div className="py-6">
          <Label className="text-base font-semibold mb-4 block">
            Edit Permissions
          </Label>
          <RadioGroup
            value={editMode}
            onValueChange={(value) => setEditMode(value as EditMode)}
          >
            <div className="flex items-start space-x-3 space-y-0 p-4 border border-[#373737] rounded-lg hover:bg-[#2d2d2d] transition-colors">
              <RadioGroupItem value="anyone" id="anyone" />
              <div className="flex-1">
                <Label htmlFor="anyone" className="font-medium cursor-pointer text-[#e3e3e3]">
                  📝 Anyone can edit
                </Label>
                <p className="text-sm text-[#9b9b9b] mt-1">
                  Collaborative mode. Any authenticated user can edit and publish
                  changes directly.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 space-y-0 p-4 border border-[#373737] rounded-lg hover:bg-[#2d2d2d] transition-colors mt-3">
              <RadioGroupItem value="approval" id="approval" />
              <div className="flex-1">
                <Label htmlFor="approval" className="font-medium cursor-pointer text-[#e3e3e3]">
                  🔒 Requires approval
                </Label>
                <p className="text-sm text-[#9b9b9b] mt-1">
                  Controlled mode. Other users can submit update requests which you
                  must approve before publishing.
                </p>
              </div>
            </div>
          </RadioGroup>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Settings"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
