"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/shared/page-header";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api-client";
import { API_ENDPOINTS } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import {
  Eye, MessageSquare, RefreshCw, Loader2, Send, Trash2,
  CheckCircle2, User, Mail, Phone, Clock,
} from "lucide-react";

/* ─── types ─── */
interface SupportTicket {
  id: number;
  userId: number;
  subject: string;
  message: string;
  email: string;
  mobile: string;
  adminResponse: string | null;
  isResolved: boolean;
  createdAt: string;
}

interface Reply {
  id: number;
  supportRequestId: number;
  message: string;
  senderRole: string;
  senderId: number;
  createdAt: string;
}

const PAGE_SIZE = 10;
const EP = API_ENDPOINTS.USER_SUPPORT; // "api/v1/UserSupport"

export default function UserSupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);

  const [selected, setSelected] = useState<SupportTicket | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [replies, setReplies] = useState<Reply[]>([]);
  const [repliesLoading, setRepliesLoading] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  /* ── list ── */
  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const [listRes, countRes] = await Promise.all([
        apiGet<SupportTicket[]>(`${EP}?skip=${page * PAGE_SIZE}&top=${PAGE_SIZE}`),
        apiGet<{ intResponse: number }>(`${EP}/count`),
      ]);
      setTickets(listRes.successData ?? []);
      setTotal(countRes.successData?.intResponse ?? 0);
    } catch { /* ignore */ }
    setLoading(false);
  }, [page]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  /* ── replies ── */
  const fetchReplies = useCallback(async (ticketId: number) => {
    setRepliesLoading(true);
    try {
      const res = await apiGet<Reply[]>(`${EP}/${ticketId}/replies?skip=0&top=200`);
      setReplies(res.successData ?? []);
    } catch { /* ignore */ }
    setRepliesLoading(false);
  }, []);

  const openDetail = (t: SupportTicket) => {
    setSelected(t);
    setReplyText("");
    setDialogOpen(true);
    fetchReplies(t.id);
  };

  /* ── send reply ── */
  const handleSendReply = async () => {
    if (!selected || !replyText.trim()) return;
    setSending(true);
    try {
      await apiPost(`${EP}/${selected.id}/reply`, { message: replyText });
      setReplyText("");
      fetchReplies(selected.id);
    } catch { /* ignore */ }
    setSending(false);
  };

  /* ── resolve ── */
  const handleResolve = async () => {
    if (!selected) return;
    setResolving(true);
    try {
      await apiPut(`${EP}/resolve/${selected.id}?adminResponse=${encodeURIComponent(replyText || "Resolved by admin")}`);
      setDialogOpen(false);
      fetchTickets();
    } catch { /* ignore */ }
    setResolving(false);
  };

  /* ── delete ── */
  const handleDelete = async (id: number) => {
    setDeleting(true);
    try {
      await apiDelete(`${EP}/${id}`);
      setDialogOpen(false);
      fetchTickets();
    } catch { /* ignore */ }
    setDeleting(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="User Support" description="Manage user support tickets and reply threads">
        <Button variant="outline" size="sm" onClick={fetchTickets} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </PageHeader>

      {/* Ticket table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">ID</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Message</TableHead>
                <TableHead className="w-24">Status</TableHead>
                <TableHead className="w-36">Date</TableHead>
                <TableHead className="w-20 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : tickets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-slate-500">
                    No support tickets
                  </TableCell>
                </TableRow>
              ) : (
                tickets.map((t) => (
                  <TableRow key={t.id} className="cursor-pointer hover:bg-slate-50" onClick={() => openDetail(t)}>
                    <TableCell className="font-medium">{t.id}</TableCell>
                    <TableCell className="font-semibold text-slate-900 max-w-[160px] truncate">{t.subject}</TableCell>
                    <TableCell>
                      <div className="text-xs text-slate-500">ID: {t.userId}</div>
                      {t.email && <div className="text-xs text-slate-500">{t.email}</div>}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-slate-700 line-clamp-2 max-w-[200px]">{t.message}</span>
                    </TableCell>
                    <TableCell>
                      <Badge className={t.isResolved
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                      }>
                        {t.isResolved ? "Resolved" : "Open"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">{formatDateTime(t.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); openDetail(t); }}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <PaginationControls page={page + 1} pageSize={PAGE_SIZE} total={total} onPageChange={(p) => setPage(p - 1)} />

      {/* Detail + Reply Thread Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-indigo-500" />
                  {selected.subject}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 mt-2">
                {/* Ticket info */}
                <div className="rounded-lg border bg-slate-50 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge className={selected.isResolved ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>
                      {selected.isResolved ? "Resolved" : "Open"}
                    </Badge>
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {formatDateTime(selected.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700">{selected.message}</p>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><User className="h-3 w-3" /> User #{selected.userId}</span>
                    {selected.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {selected.email}</span>}
                    {selected.mobile && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {selected.mobile}</span>}
                  </div>
                </div>

                {/* Legacy admin response */}
                {selected.adminResponse && (
                  <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                    <div className="text-xs font-semibold text-green-800 mb-1">Admin Resolution</div>
                    <p className="text-sm text-slate-700">{selected.adminResponse}</p>
                  </div>
                )}

                {/* Reply thread */}
                <div className="rounded-lg border">
                  <div className="p-3 border-b bg-slate-50 flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-800">Conversation</span>
                    <Button variant="ghost" size="sm" onClick={() => fetchReplies(selected.id)} disabled={repliesLoading}>
                      <RefreshCw className={`h-3 w-3 mr-1 ${repliesLoading ? "animate-spin" : ""}`} /> Refresh
                    </Button>
                  </div>

                  <div className="p-4 space-y-3 max-h-[300px] overflow-y-auto">
                    {repliesLoading ? (
                      <div className="flex items-center justify-center py-6">
                        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                      </div>
                    ) : replies.length === 0 ? (
                      <div className="text-center py-6 text-xs text-slate-400">
                        No replies yet. Start the conversation below.
                      </div>
                    ) : (
                      replies.map((r) => {
                        const isAdmin = r.senderRole === "Admin";
                        return (
                          <div key={r.id} className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}>
                            <div className={`max-w-[80%] rounded-lg p-3 ${
                              isAdmin
                                ? "bg-indigo-50 border border-indigo-200"
                                : "bg-slate-100 border border-slate-200"
                            }`}>
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`text-[10px] font-semibold ${isAdmin ? "text-indigo-700" : "text-slate-600"}`}>
                                  {isAdmin ? "Admin" : "User"}
                                </span>
                                <span className="text-[10px] text-slate-400">{formatDateTime(r.createdAt)}</span>
                              </div>
                              <p className="text-sm text-slate-800">{r.message}</p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Reply input */}
                  {!selected.isResolved && (
                    <div className="p-3 border-t bg-white">
                      <div className="flex gap-2">
                        <Textarea
                          placeholder="Type your reply..."
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          rows={2}
                          className="flex-1 resize-none"
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              handleSendReply();
                            }
                          }}
                        />
                        <Button
                          size="icon"
                          className="h-auto"
                          onClick={handleSendReply}
                          disabled={sending || !replyText.trim()}
                        >
                          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 pt-2">
                  {!selected.isResolved && (
                    <Button onClick={handleResolve} disabled={resolving} className="bg-green-600 hover:bg-green-700">
                      {resolving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                      Resolve Ticket
                    </Button>
                  )}
                  <Button variant="destructive" onClick={() => handleDelete(selected.id)} disabled={deleting}>
                    {deleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
                    Delete
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
