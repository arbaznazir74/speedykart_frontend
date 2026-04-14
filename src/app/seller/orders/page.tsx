"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-header";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { OrderDetailDialog, OrderSummary } from "@/components/shared/order-detail-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { apiGet, apiPut } from "@/lib/api-client";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { Eye, Check, X, RefreshCw, Loader2, Truck, Clock, Timer, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface SellerOrder {
  id: number;
  orderNumber: string;
  receipt: string;
  userId: number;
  sellerId: number | null;
  customerName: string;
  amount: number;
  tipAmount: number;
  paidAmount: number;
  dueAmount: number;
  refundAmount: number;
  deliveryCharge: number;
  platormCharge: number;
  cutlaryCharge: number;
  lowCartFeeCharge: number;
  currency: string;
  orderStatus: string;
  paymentStatus: string;
  paymentMode: string | number;
  addressId: number;
  expectedDeliveryDate: string | null;
  isCutlaryInculded: boolean;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string | null;
  orderItems?: { id: number; productName: string; quantity: number; price: number; total: number }[];
}

function formatPaymentMode(mode: string | number): string {
  if (typeof mode === "string") {
    if (mode === "CashOnDelivery") return "COD";
    return mode;
  }
  return mode === 1 ? "COD" : "Online";
}

interface DeliveryBoy {
  id: number;
  name: string;
  mobile: string;
  isAvailable: number;
  status: string;
}

const PENDING_STATUSES = ["Created", "Processing"];
const ASSIGNABLE_STATUSES = ["SellerAccepted", "Processing", "Created"];

function toLocalDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function SellerOrdersPage() {
  const searchParams = useSearchParams();
  const [orders, setOrders] = useState<SellerOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [detailOrder, setDetailOrder] = useState<OrderSummary | null>(null);
  const [cancelOrderId, setCancelOrderId] = useState<number | null>(null);
  const [tab, setTab] = useState(searchParams.get("tab") || "all");
  const [dateFilter, setDateFilter] = useState(() => {
    const d = searchParams.get("date");
    if (d === "today") return toLocalDateStr(new Date());
    return d || "";
  });

  // Accept with prep time
  const [acceptOpen, setAcceptOpen] = useState(false);
  const [acceptOrderId, setAcceptOrderId] = useState<number | null>(null);
  const [prepTime, setPrepTime] = useState<number>(15);
  const [accepting, setAccepting] = useState(false);

  const PREP_TIME_OPTIONS = [10, 15, 20, 25, 30, 40, 45, 60, 90];

  // Assign delivery boy
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignOrderId, setAssignOrderId] = useState<number | null>(null);
  const [dBoys, setDBoys] = useState<DeliveryBoy[]>([]);
  const [selectedDBoy, setSelectedDBoy] = useState("");
  const [assigning, setAssigning] = useState(false);
  const pageSize = 10;

  const load = useCallback(async (p: number) => {
    setLoading(true);
    setPage(p);
    try {
      const skip = (p - 1) * pageSize;
      const [resp, countResp] = await Promise.all([
        apiGet<SellerOrder[]>("api/v1/Seller/mine/seller-orders", { skip, top: pageSize }),
        apiGet<{ intResponse: number }>("api/v1/Seller/mine/seller-orders/count"),
      ]);
      setOrders(resp.successData ?? []);
      setTotal(countResp.successData?.intResponse ?? 0);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(1); }, [load]);

  async function handleAcceptOrder() {
    if (!acceptOrderId) return;
    setAccepting(true);
    try {
      const resp = await apiPut(`api/v1/Seller/mine/order/${acceptOrderId}/accept?preparationTimeInMinutes=${prepTime}`);
      if (resp.isError) { toast.error(resp.errorData?.displayMessage ?? "Failed to accept"); return; }
      toast.success(`Order accepted! Preparation time: ${prepTime} min`);
      setAcceptOpen(false);
      await load(page);
    } catch { toast.error("Failed to accept order"); }
    finally { setAccepting(false); }
  }

  async function handleCancelOrder(orderId: number) {
    setActionLoading(orderId);
    try {
      await apiPut(`api/v1/Seller/mine/order/${orderId}/cancel`);
      await load(page);
    } catch { /* error handled */ }
    finally { setActionLoading(null); setCancelOrderId(null); }
  }

  const openAssignDialog = async (orderId: number) => {
    setAssignOrderId(orderId);
    setSelectedDBoy("");
    setAssignOpen(true);
    try {
      const res = await apiGet<DeliveryBoy[]>("api/v1/Seller/mine/delivery-boys?skip=0&top=100");
      setDBoys(res.successData ?? []);
    } catch { setDBoys([]); }
  };

  const handleAssignDBoy = async () => {
    if (!assignOrderId || !selectedDBoy) return;
    setAssigning(true);
    try {
      const resp = await apiPut(`api/v1/Seller/mine/order/${assignOrderId}/assign-delivery-boy/${selectedDBoy}`);
      if (resp.isError) toast.error(resp.errorData?.displayMessage ?? "Failed to assign");
      else { toast.success("Delivery boy assigned to order!"); setAssignOpen(false); load(page); }
    } catch { toast.error("Error assigning delivery boy"); }
    setAssigning(false);
  };

  const filteredOrders = useMemo(() => {
    let result = orders;
    if (tab === "pending") result = result.filter((o) => PENDING_STATUSES.includes(o.orderStatus));
    else if (tab === "accepted") result = result.filter((o) => o.orderStatus === "SellerAccepted");
    else if (tab === "completed") result = result.filter((o) => o.orderStatus === "Delivered");
    if (dateFilter) {
      result = result.filter((o) => {
        if (!o.createdAt) return false;
        const orderDate = toLocalDateStr(new Date(o.createdAt));
        return orderDate === dateFilter;
      });
    }
    return result;
  }, [orders, tab, dateFilter]);

  return (
    <div className="space-y-6">
      <PageHeader title="Incoming Orders" description="Manage your store orders">
        <Button variant="outline" size="sm" onClick={() => load(page)}>
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
      <div className="flex gap-1 rounded-xl bg-slate-100 p-1 w-fit">
        {[
          { value: "all", label: "All" },
          { value: "pending", label: "Pending" },
          { value: "accepted", label: "Accepted" },
          { value: "completed", label: "Completed" },
        ].map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-all ${
              tab === t.value
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-slate-400" />
        <Input
          type="date"
          className="w-44 h-9"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
        />
        {dateFilter ? (
          <Button variant="outline" size="sm" className="h-9 text-xs text-red-600 border-red-200 hover:bg-red-50" onClick={() => setDateFilter("")}>
            ✕ Clear
          </Button>
        ) : (
          <span className="text-xs text-slate-400">All Dates</span>
        )}
      </div>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                <Eye className="h-6 w-6 text-slate-400" />
              </div>
              <p className="text-base font-semibold text-slate-700">No orders found</p>
              <p className="text-sm text-slate-400 mt-1">Orders will appear here when customers place them</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-semibold text-slate-900">#{order.orderNumber || order.id}</TableCell>
                      <TableCell>{order.customerName || `User ${order.userId}`}</TableCell>
                      <TableCell className="font-semibold">{formatCurrency(order.amount)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{formatPaymentMode(order.paymentMode)}</Badge>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={order.orderStatus} />
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {order.createdAt ? formatDateTime(order.createdAt) : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDetailOrder(order as unknown as OrderSummary)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {PENDING_STATUSES.includes(order.orderStatus) && (
                            <>
                              <Button
                                size="icon"
                                className="h-8 w-8 bg-emerald-500 hover:bg-emerald-600 text-white"
                                disabled={actionLoading === order.id}
                                onClick={() => { setAcceptOrderId(order.id); setPrepTime(15); setAcceptOpen(true); }}
                              >
                                {actionLoading === order.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                              </Button>
                              <Button
                                size="icon"
                                variant="destructive"
                                className="h-8 w-8"
                                disabled={actionLoading === order.id}
                                onClick={() => setCancelOrderId(order.id)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {ASSIGNABLE_STATUSES.includes(order.orderStatus) && (
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              title="Assign Delivery Boy"
                              onClick={() => openAssignDialog(order.id)}
                            >
                              <Truck className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <PaginationControls page={page} pageSize={pageSize} total={total} onPageChange={load} />

      {/* Cancel confirm */}
      <ConfirmDialog
        open={cancelOrderId !== null}
        onOpenChange={(open) => !open && setCancelOrderId(null)}
        title="Cancel Order"
        description="Are you sure you want to cancel this order? This cannot be undone."
        confirmLabel="Cancel Order"
        variant="destructive"
        loading={actionLoading !== null}
        onConfirm={() => { if (cancelOrderId) handleCancelOrder(cancelOrderId); }}
      />

      {/* Accept with Preparation Time */}
      <Dialog open={acceptOpen} onOpenChange={setAcceptOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-emerald-500" />
              Accept Order
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
              <p className="text-sm text-amber-800 font-medium">Initiating your order will take time</p>
              <p className="text-xs text-amber-600 mt-1">Select how long it will take to prepare this order. The customer will see a live countdown.</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Preparation Time</label>
              <div className="grid grid-cols-3 gap-2">
                {PREP_TIME_OPTIONS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setPrepTime(t)}
                    className={`flex items-center justify-center gap-1.5 rounded-lg border-2 px-3 py-2.5 text-sm font-medium transition-all ${
                      prepTime === t
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <Timer className="h-3.5 w-3.5" />
                    {t} min
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-lg bg-slate-50 border p-3 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                <Clock className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">{prepTime} minutes</p>
                <p className="text-xs text-slate-500">Customer will see a countdown timer for this duration</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAcceptOpen(false)}>Cancel</Button>
            <Button onClick={handleAcceptOrder} disabled={accepting} className="bg-emerald-500 hover:bg-emerald-600">
              {accepting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
              Accept Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Delivery Boy */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-indigo-500" />
              Assign Delivery Boy
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-500">Select a delivery boy for order <strong>#{assignOrderId}</strong>:</p>
            {dBoys.length === 0 ? (
              <p className="text-sm text-amber-600">No delivery boys available. Contact admin.</p>
            ) : (
              <Select value={selectedDBoy} onValueChange={(v) => setSelectedDBoy(v ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select delivery boy..." />
                </SelectTrigger>
                <SelectContent>
                  {dBoys.filter(d => d.status === "Active").map((d) => (
                    <SelectItem key={d.id} value={d.id.toString()}>
                      {d.name} ({d.mobile || "no phone"}) {d.isAvailable === 1 ? "🟢" : "🔴"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <DialogFooter>
            <Button onClick={handleAssignDBoy} disabled={assigning || !selectedDBoy} className="w-full">
              {assigning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Truck className="h-4 w-4 mr-2" />}
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Order detail */}
      <OrderDetailDialog
        order={detailOrder}
        open={!!detailOrder}
        onClose={() => setDetailOrder(null)}
      />
    </div>
  );
}
