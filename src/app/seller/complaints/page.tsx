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
import { apiGet, apiPut } from "@/lib/api-client";
import { formatCurrency, formatDateTime } from "@/lib/format";
import {
  Eye, MessageSquare, RefreshCw, Loader2, Package, MapPin, Truck,
  User, Mail, Phone, Clock, AlertTriangle,
} from "lucide-react";

interface ComplaintItem {
  productName: string | null;
  variantName: string | null;
  indicator: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface ComplaintAddress {
  name: string | null;
  mobile: string | null;
  address: string | null;
  landmark: string | null;
  pincode: string | null;
  city: string | null;
  state: string | null;
}

interface ComplaintDeliveryBoy {
  id: number;
  name: string | null;
  mobile: string | null;
  email: string | null;
  deliveryStatus: string | null;
  assignedAt: string | null;
  deliveredAt: string | null;
}

interface Complaint {
  id: number;
  email: string;
  message: string;
  status: string;
  sellerReply: string | null;
  repliedAt: string | null;
  createdAt: string;
  orderId: number;
  orderNumber: string;
  orderAmount: number;
  orderStatus: string;
  paymentStatus: string;
  paymentMode: string;
  deliveryCharge: number;
  platformCharge: number;
  cutleryCharge: number;
  lowCartFeeCharge: number;
  tipAmount: number;
  orderDate: string | null;
  userId: number;
  customerName: string | null;
  customerMobile: string | null;
  customerEmail: string | null;
  deliveryAddress: ComplaintAddress | null;
  deliveryBoy: ComplaintDeliveryBoy | null;
  items: ComplaintItem[];
}

const STATUS_COLORS: Record<string, string> = {
  Open: "bg-red-100 text-red-800",
  InProgress: "bg-yellow-100 text-yellow-800",
  Resolved: "bg-green-100 text-green-800",
  Closed: "bg-slate-100 text-slate-800",
};

const PAGE_SIZE = 10;

export default function SellerComplaintsPage() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Complaint | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replyStatus, setReplyStatus] = useState("2");
  const [replying, setReplying] = useState(false);

  const fetchComplaints = useCallback(async () => {
    setLoading(true);
    try {
      const [listRes, countRes] = await Promise.all([
        apiGet<Complaint[]>(`api/v1/Order/complaints/seller?skip=${page * PAGE_SIZE}&top=${PAGE_SIZE}`),
        apiGet<{ intResponse: number }>("api/v1/Order/complaints/seller/count"),
      ]);
      setComplaints(listRes.successData ?? []);
      setTotal(countRes.successData?.intResponse ?? 0);
    } catch { /* ignore */ }
    setLoading(false);
  }, [page]);

  useEffect(() => { fetchComplaints(); }, [fetchComplaints]);

  const openDetail = (c: Complaint) => {
    setSelected(c);
    setReplyText(c.sellerReply ?? "");
    setReplyStatus(c.status === "Resolved" ? "2" : c.status === "Closed" ? "3" : "1");
    setDialogOpen(true);
  };

  const handleReply = async () => {
    if (!selected || !replyText.trim()) return;
    setReplying(true);
    try {
      await apiPut(`api/v1/Order/complaints/seller/${selected.id}/reply`, {
        reply: replyText,
        status: parseInt(replyStatus),
      });
      setDialogOpen(false);
      fetchComplaints();
    } catch { /* ignore */ }
    setReplying(false);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customer Complaints"
        description="Review and respond to customer issues with their orders"
      >
        <Button variant="outline" size="sm" onClick={fetchComplaints} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">Order #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Message</TableHead>
                <TableHead className="w-24">Status</TableHead>
                <TableHead className="w-28">Amount</TableHead>
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
              ) : complaints.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-slate-500">
                    No complaints yet
                  </TableCell>
                </TableRow>
              ) : (
                complaints.map((c) => (
                  <TableRow key={c.id} className="cursor-pointer hover:bg-slate-50" onClick={() => openDetail(c)}>
                    <TableCell className="font-semibold text-slate-900">#{c.orderNumber}</TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{c.customerName ?? "—"}</div>
                      <div className="text-xs text-slate-500">{c.email}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-slate-700 truncate max-w-[200px]">{c.message}</div>
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[c.status] ?? "bg-slate-100 text-slate-700"}>
                        {c.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{formatCurrency(c.orderAmount)}</TableCell>
                    <TableCell className="text-xs text-slate-500">{formatDateTime(c.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); openDetail(c); }}>
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

      {/* Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  Complaint — Order #{selected.orderNumber}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-5 mt-2">
                {/* Complaint message */}
                <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Mail className="h-4 w-4 text-red-600" />
                    <span className="text-sm font-semibold text-red-800">Customer Complaint</span>
                    <Badge className={STATUS_COLORS[selected.status] ?? ""} >{selected.status}</Badge>
                  </div>
                  <p className="text-sm text-slate-700">{selected.message}</p>
                  <div className="text-xs text-slate-500 mt-2">
                    From: {selected.email} · {formatDateTime(selected.createdAt)}
                  </div>
                </div>

                {/* Seller reply */}
                {selected.sellerReply && (
                  <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <MessageSquare className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-semibold text-green-800">Your Reply</span>
                    </div>
                    <p className="text-sm text-slate-700">{selected.sellerReply}</p>
                    <div className="text-xs text-slate-500 mt-2">
                      {selected.repliedAt ? formatDateTime(selected.repliedAt) : ""}
                    </div>
                  </div>
                )}

                {/* Order details */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg border p-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                      <Package className="h-4 w-4" /> Order Info
                    </div>
                    <div className="text-xs space-y-1 text-slate-600">
                      <p>Order #: <span className="font-medium text-slate-900">{selected.orderNumber}</span></p>
                      <p>Status: <Badge variant="outline" className="text-[10px] ml-1">{selected.orderStatus}</Badge></p>
                      <p>Payment: {selected.paymentMode} · {selected.paymentStatus}</p>
                      <p>Total: <span className="font-semibold">{formatCurrency(selected.orderAmount)}</span></p>
                      <p>Delivery: {formatCurrency(selected.deliveryCharge)}</p>
                      {selected.tipAmount > 0 && <p>Tip: {formatCurrency(selected.tipAmount)}</p>}
                      {selected.platformCharge > 0 && <p>Platform: {formatCurrency(selected.platformCharge)}</p>}
                      {selected.cutleryCharge > 0 && <p>Cutlery: {formatCurrency(selected.cutleryCharge)}</p>}
                      {selected.lowCartFeeCharge > 0 && <p>Low Cart Fee: {formatCurrency(selected.lowCartFeeCharge)}</p>}
                      <p>Date: {selected.orderDate ? formatDateTime(selected.orderDate) : "—"}</p>
                    </div>
                  </div>

                  <div className="rounded-lg border p-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                      <User className="h-4 w-4" /> Customer
                    </div>
                    <div className="text-xs space-y-1 text-slate-600">
                      <p className="font-medium text-slate-900">{selected.customerName ?? "—"}</p>
                      {selected.customerMobile && (
                        <p className="flex items-center gap-1"><Phone className="h-3 w-3" />{selected.customerMobile}</p>
                      )}
                      {selected.customerEmail && (
                        <p className="flex items-center gap-1"><Mail className="h-3 w-3" />{selected.customerEmail}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Delivery address + boy */}
                <div className="grid grid-cols-2 gap-4">
                  {selected.deliveryAddress && (
                    <div className="rounded-lg border p-4 space-y-2">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                        <MapPin className="h-4 w-4" /> Delivery Address
                      </div>
                      <div className="text-xs space-y-1 text-slate-600">
                        <p className="font-medium text-slate-900">{selected.deliveryAddress.name}</p>
                        <p>{selected.deliveryAddress.address}</p>
                        {selected.deliveryAddress.landmark && <p>Landmark: {selected.deliveryAddress.landmark}</p>}
                        <p>{selected.deliveryAddress.city}, {selected.deliveryAddress.pincode}</p>
                        {selected.deliveryAddress.mobile && (
                          <p className="flex items-center gap-1"><Phone className="h-3 w-3" />{selected.deliveryAddress.mobile}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {selected.deliveryBoy ? (
                    <div className="rounded-lg border p-4 space-y-2">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                        <Truck className="h-4 w-4" /> Delivery Boy
                      </div>
                      <div className="text-xs space-y-1 text-slate-600">
                        <p className="font-medium text-slate-900">{selected.deliveryBoy.name ?? "—"}</p>
                        {selected.deliveryBoy.mobile && (
                          <p className="flex items-center gap-1"><Phone className="h-3 w-3" />{selected.deliveryBoy.mobile}</p>
                        )}
                        {selected.deliveryBoy.email && (
                          <p className="flex items-center gap-1"><Mail className="h-3 w-3" />{selected.deliveryBoy.email}</p>
                        )}
                        <p>Status: <Badge variant="outline" className="text-[10px] ml-1">{selected.deliveryBoy.deliveryStatus}</Badge></p>
                        {selected.deliveryBoy.assignedAt && (
                          <p className="flex items-center gap-1"><Clock className="h-3 w-3" />Assigned: {formatDateTime(selected.deliveryBoy.assignedAt)}</p>
                        )}
                        {selected.deliveryBoy.deliveredAt && (
                          <p className="flex items-center gap-1"><Clock className="h-3 w-3" />Delivered: {formatDateTime(selected.deliveryBoy.deliveredAt)}</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border p-4 flex items-center justify-center text-xs text-slate-400">
                      No delivery boy assigned
                    </div>
                  )}
                </div>

                {/* Order items */}
                {selected.items.length > 0 && (
                  <div className="rounded-lg border">
                    <div className="p-3 border-b bg-slate-50">
                      <span className="text-sm font-semibold text-slate-800">Order Items</span>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>Variant</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead className="text-right">Qty</TableHead>
                          <TableHead className="text-right">Price</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selected.items.map((item, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{item.productName ?? "—"}</TableCell>
                            <TableCell>{item.variantName ?? "—"}</TableCell>
                            <TableCell>
                              {item.indicator && (
                                <Badge variant="outline" className={item.indicator === "Veg" ? "text-green-600 border-green-300" : "text-red-600 border-red-300"}>
                                  {item.indicator}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">{item.quantity}</TableCell>
                            <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                            <TableCell className="text-right font-medium">{formatCurrency(item.totalPrice)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Reply form */}
                <div className="rounded-lg border p-4 space-y-3">
                  <div className="text-sm font-semibold text-slate-800">Reply to Complaint</div>
                  <Textarea
                    placeholder="Write your response to the customer..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    rows={3}
                  />
                  <div className="flex items-center gap-3">
                    <select
                      className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={replyStatus}
                      onChange={(e) => setReplyStatus(e.target.value)}
                    >
                      <option value="1">In Progress</option>
                      <option value="2">Resolved</option>
                      <option value="3">Closed</option>
                    </select>
                    <Button onClick={handleReply} disabled={replying || !replyText.trim()}>
                      {replying ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <MessageSquare className="h-4 w-4 mr-2" />}
                      {selected.sellerReply ? "Update Reply" : "Send Reply"}
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
