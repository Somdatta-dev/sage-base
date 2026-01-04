"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, CheckCircle, XCircle } from "lucide-react";
import { pagesApi } from "@/lib/api";
import { toast } from "sonner";
import type { UpdateRequest } from "@/types";

export function UpdateRequestList() {
  const [open, setOpen] = useState(false);
  const [requests, setRequests] = useState<UpdateRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [reviewingId, setReviewingId] = useState<number | null>(null);
  const [reviewMessage, setReviewMessage] = useState("");

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const data = await pagesApi.getPendingUpdateRequests();
      setRequests(data);
    } catch (error) {
      console.error("Failed to fetch update requests:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchRequests();
    }
  }, [open]);

  const handleApprove = async (requestId: number) => {
    try {
      await pagesApi.approveUpdateRequest(requestId, reviewMessage || undefined);
      toast.success("Update request approved and published");
      setReviewMessage("");
      setReviewingId(null);
      fetchRequests();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to approve request");
    }
  };

  const handleReject = async (requestId: number) => {
    try {
      await pagesApi.rejectUpdateRequest(requestId, reviewMessage || undefined);
      toast.success("Update request rejected");
      setReviewMessage("");
      setReviewingId(null);
      fetchRequests();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to reject request");
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-4 w-4" />
          {requests.length > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {requests.length}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Pending Update Requests</DialogTitle>
          <DialogDescription>
            Review and approve changes submitted by other users
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[500px] pr-4">
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : requests.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No pending update requests
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <div
                  key={request.id}
                  className="border rounded-lg p-4 hover:bg-gray-50"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-semibold">{request.title}</h4>
                      <p className="text-sm text-gray-500">
                        Requested {formatDate(request.created_at)}
                      </p>
                    </div>
                    <Badge variant="outline">Pending</Badge>
                  </div>

                  {request.message && (
                    <div className="bg-blue-50 border border-blue-200 rounded p-3 my-3">
                      <p className="text-sm text-gray-700">{request.message}</p>
                    </div>
                  )}

                  {request.content_text && (
                    <div className="bg-gray-50 rounded p-3 my-3">
                      <p className="text-xs text-gray-600 mb-1">Preview:</p>
                      <p className="text-sm line-clamp-3">{request.content_text}</p>
                    </div>
                  )}

                  {reviewingId === request.id ? (
                    <div className="mt-3 space-y-3">
                      <div>
                        <Label htmlFor={`review-${request.id}`}>
                          Review Message (optional)
                        </Label>
                        <Textarea
                          id={`review-${request.id}`}
                          value={reviewMessage}
                          onChange={(e) => setReviewMessage(e.target.value)}
                          placeholder="Add a message to the requester..."
                          rows={2}
                          className="mt-1"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleApprove(request.id)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve & Publish
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleReject(request.id)}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setReviewingId(null);
                            setReviewMessage("");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setReviewingId(request.id)}
                      >
                        Review
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
