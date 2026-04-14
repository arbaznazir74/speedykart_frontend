"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/shared/page-header";
import { apiGet, apiPost } from "@/lib/api-client";
import { formatCurrency, formatDateTime } from "@/lib/format";
import {
  RefreshCw, Loader2, Banknote, Truck, Eye, IndianRupee,
  ArrowDownCircle, CheckCircle2, Clock, Filter,
} from "lucide-react";
import { toast } from "sonner";

interface CodSummary {
  deliveryBoyId: number;
  deliveryBoyName: string;
  deliveryBoyMobile: string;
  totalCodCollected: number;
  totalCashSettled: number;
  pendingAmount: number;
  totalCodOrders: number;
}

interface CodOrder {
  orderId: number;
  orderNumber: string;
  amount: number;
  orderStatus: string;
  deliveryStatus: string;
  deliveredAt: string;
  orderDate: string;
  customerName: string;
}

interface CashCollection {
  id: number;
  amount: number;
  status: string;
  collectedAt: string;
  remarks: string;
  dateFrom: string;
  dateTo: string;
  createdAt: string;
}

function toLocalDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function SellerCodCollectionsPage() {
  const [summaries, setSummaries] = useState<CodSummary[]>([]);
  const [loading, setLoading] = useState(true);

  // Date & status filters
  const [dateFilter, setDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "collected">("all");

  // Detail dialog
  const [selected, setSelected] = useState<CodSummary | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [codOrders, setCodOrders] = useState<CodOrder[]>([]);
  const [collections, setCollections] = useState<CashCollection[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"orders" | "settlements">("orders");

  // Collect dialog
  const [collectOpen, setCollectOpen] = useState(false);
  const [collectBoy, setCollectBoy] = useState<CodSummary | null>(null);
  const [collectRemarks, setCollectRemarks] = useState("");
  const [collecting, setCollecting] = useState(false);

  // Track which delivery boys have been collected today (by id)
  const [collectedToday, setCollectedToday] = useState<Set<number>>(new Set());

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    try {
      const url = dateFilter
        ? `api/v1/Seller/mine/cod-summary?date=${dateFilter}`
        : `api/v1/Seller/mine/cod-summary`;
      const res = await apiGet<CodSummary[]>(url);
      const data = res.successData ?? [];
      setSummaries(data);

      // Check which delivery boys already have a collection for this date
      const set = new Set<number>();
      for (const s of data) {
        try {
          const colRes = await apiGet<CashCollection[]>(
            `api/v1/Seller/mine/cash-collections/${s.deliveryBoyId}?skip=0&top=200`
          );
          const cols = colRes.successData ?? [];
          const hasCollectionOnDate = cols.some((c) => {
            const cDate = c.collectedAt ? toLocalDateStr(new Date(c.collectedAt)) : "";
            return cDate === dateFilter;
          });
          if (hasCollectionOnDate) set.add(s.deliveryBoyId);
        } catch { /* ignore */ }
      }
      setCollectedToday(set);
    } catch { /* ignore */ }
    setLoading(false);
  }, [dateFilter]);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  const openDetail = async (s: CodSummary) => {
    setSelected(s);
    setDetailOpen(true);
    setActiveTab("orders");
    setDetailLoading(true);
    try {
      const [ordersRes, collectionsRes] = await Promise.all([
        apiGet<CodOrder[]>(`api/v1/Seller/mine/cod-orders/${s.deliveryBoyId}?skip=0&top=50`),
        apiGet<CashCollection[]>(`api/v1/Seller/mine/cash-collections/${s.deliveryBoyId}?skip=0&top=50`),
      ]);
      setCodOrders(ordersRes.successData ?? []);
      setCollections(collectionsRes.successData ?? []);
    } catch { /* ignore */ }
    setDetailLoading(false);
  };

  const openCollect = (s: CodSummary) => {
    setCollectBoy(s);
    setCollectRemarks("");
    setCollectOpen(true);
  };

  const handleCollect = async () => {
    if (!collectBoy || collectBoy.pendingAmount <= 0) return;
    setCollecting(true);
    try {
      await apiPost<{ deliveryBoyId: number; amount: number; remarks: string }, unknown>(
        "api/v1/Seller/mine/cash-collect",
        { deliveryBoyId: collectBoy.deliveryBoyId, amount: collectBoy.pendingAmount, remarks: collectRemarks }
      );
      toast.success(`${formatCurrency(collectBoy.pendingAmount)} collected from ${collectBoy.deliveryBoyName}`);
      setCollectedToday((prev) => new Set(prev).add(collectBoy.deliveryBoyId));
      setCollectOpen(false);
      fetchSummary();
    } catch {
      toast.error("Failed to mark as collected");
    }
    setCollecting(false);
  };

  const totalPending = summaries.reduce((acc, s) => acc + s.pendingAmount, 0);
  const totalCollected = summaries.reduce((acc, s) => acc + s.totalCodCollected, 0);
  const totalSettled = summaries.reduce((acc, s) => acc + s.totalCashSettled, 0);

  const filtered = summaries.filter((s) => {
    if (statusFilter === "pending") return !collectedToday.has(s.deliveryBoyId) && s.pendingAmount > 0;
    if (statusFilter === "collected") return collectedToday.has(s.deliveryBoyId);
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="COD Collections"
        description="Track cash-on-delivery amounts collected by your delivery boys"
      >
        <Button variant="outline" size="sm" onClick={fetchSummary} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </PageHeader>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50">
              <IndianRupee className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Total COD Collected</p>
              <p className="text-lg font-bold text-slate-900">{formatCurrency(totalCollected)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-50">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Cash Settled</p>
              <p className="text-lg font-bold text-emerald-700">{formatCurrency(totalSettled)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-50">
              <Clock className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Pending Amount</p>
              <p className="text-lg font-bold text-orange-700">{formatCurrency(totalPending)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
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
              ✕ Clear Date
            </Button>
          ) : (
            <span className="text-xs text-slate-400">All Time</span>
          )}
        </div>
        <div className="flex gap-1">
          {(["all", "pending", "collected"] as const).map((v) => (
            <Button
              key={v}
              variant={statusFilter === v ? "default" : "outline"}
              size="sm"
              className="h-9 text-xs capitalize"
              onClick={() => setStatusFilter(v)}
            >
              {v === "all" ? "All" : v === "pending" ? "Not Yet Collected" : "Collected"}
            </Button>
          ))}
        </div>
      </div>

      {/* Delivery Boys COD Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Delivery Boy</TableHead>
                <TableHead>Mobile</TableHead>
                <TableHead className="text-right">COD Collected</TableHead>
                <TableHead className="text-right">Cash Settled</TableHead>
                <TableHead className="text-right">Pending</TableHead>
                <TableHead className="text-center">Orders</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="w-32 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                    <Banknote className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    No delivery boys found
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((s) => {
                  const isCollected = collectedToday.has(s.deliveryBoyId);
                  return (
                    <TableRow key={s.deliveryBoyId}>
                      <TableCell className="font-medium">{s.deliveryBoyName}</TableCell>
                      <TableCell className="text-slate-500">{s.deliveryBoyMobile || "—"}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(s.totalCodCollected)}</TableCell>
                      <TableCell className="text-right text-emerald-600">{formatCurrency(s.totalCashSettled)}</TableCell>
                      <TableCell className="text-right">
                        <Badge className={s.pendingAmount > 0 ? "bg-orange-100 text-orange-700" : "bg-emerald-100 text-emerald-700"}>
                          {formatCurrency(s.pendingAmount)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">{s.totalCodOrders}</TableCell>
                      <TableCell className="text-center">
                        {isCollected ? (
                          <Badge className="bg-emerald-100 text-emerald-700 text-xs">
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Collected
                          </Badge>
                        ) : s.pendingAmount > 0 ? (
                          <Badge className="bg-orange-100 text-orange-700 text-xs">
                            <Clock className="h-3 w-3 mr-1" /> Pending
                          </Badge>
                        ) : (
                          <Badge className="bg-slate-100 text-slate-500 text-xs">No Dues</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDetail(s)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {!isCollected && s.pendingAmount > 0 && (
                          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => openCollect(s)}>
                            <ArrowDownCircle className="h-3.5 w-3.5 mr-1" /> Collect
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-indigo-500" />
                  {selected.deliveryBoyName} — COD Details
                </DialogTitle>
              </DialogHeader>

              {/* Tabs */}
              <div className="flex gap-2 border-b pb-2">
                <button
                  className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${activeTab === "orders" ? "bg-indigo-100 text-indigo-700" : "text-slate-500 hover:text-slate-700"}`}
                  onClick={() => setActiveTab("orders")}
                >
                  COD Orders
                </button>
                <button
                  className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${activeTab === "settlements" ? "bg-indigo-100 text-indigo-700" : "text-slate-500 hover:text-slate-700"}`}
                  onClick={() => setActiveTab("settlements")}
                >
                  Cash Settlements
                </button>
              </div>

              {detailLoading ? (
                <div className="py-8 flex justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                </div>
              ) : activeTab === "orders" ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Delivered</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {codOrders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-6 text-slate-500">No COD orders</TableCell>
                      </TableRow>
                    ) : (
                      codOrders.map((o) => (
                        <TableRow key={o.orderId}>
                          <TableCell className="font-mono text-xs">{o.orderNumber}</TableCell>
                          <TableCell>{o.customerName || "—"}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(o.amount)}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs">{o.deliveryStatus}</Badge>
                          </TableCell>
                          <TableCell className="text-xs text-slate-500">
                            {o.deliveredAt ? formatDateTime(o.deliveredAt) : "—"}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Remarks</TableHead>
                      <TableHead>Collected At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {collections.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-6 text-slate-500">No settlements yet</TableCell>
                      </TableRow>
                    ) : (
                      collections.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="text-right font-medium">{formatCurrency(c.amount)}</TableCell>
                          <TableCell>
                            <Badge className={c.status === "Collected" ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-orange-700"}>
                              {c.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-slate-500 text-xs">{c.remarks || "—"}</TableCell>
                          <TableCell className="text-xs text-slate-500">
                            {c.collectedAt ? formatDateTime(c.collectedAt) : "—"}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Collect Cash Dialog — no amount input, just confirmation */}
      <Dialog open={collectOpen} onOpenChange={setCollectOpen}>
        <DialogContent className="max-w-sm">
          {collectBoy && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Banknote className="h-5 w-5 text-emerald-500" />
                  Collect Cash
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-slate-600">
                  Collecting from <span className="font-semibold">{collectBoy.deliveryBoyName}</span>
                </p>
                <div className="rounded-lg bg-orange-50 border border-orange-200 p-4 text-center">
                  <p className="text-xs text-orange-600 mb-1">Amount to Collect</p>
                  <p className="text-2xl font-bold text-orange-700">{formatCurrency(collectBoy.pendingAmount)}</p>
                </div>
                <Textarea
                  placeholder="Remarks (optional)"
                  value={collectRemarks}
                  onChange={(e) => setCollectRemarks(e.target.value)}
                  rows={2}
                />
                <p className="text-xs text-slate-400 text-center">
                  This action is irreversible. Once marked as collected, it cannot be undone.
                </p>
                <Button className="w-full" onClick={handleCollect} disabled={collecting}>
                  {collecting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                  Mark as Collected
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
