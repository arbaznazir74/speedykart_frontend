"use client";

import { useState, useEffect, useCallback, useMemo, Suspense } from "react";
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
import { apiGet } from "@/lib/api-client";
import { formatCurrency, formatDateTime } from "@/lib/format";
import {
  RefreshCw, Package, Truck, CheckCircle2, Clock, XCircle,
} from "lucide-react";

const PAGE_SIZE = 20;

interface OrderDelivery {
  orderId: number;
  orderNumber: string;
  orderStatus: string;
  paymentMode: string;
  amount: number;
  orderDate: string;
  deliveryStatus: string;
  deliveryBoyId: number | null;
  deliveryBoyName: string | null;
  deliveryBoyMobile: string | null;
  assignedAt: string | null;
  deliveredAt: string | null;
  isCodCollected: boolean;
  customerName: string | null;
}

function statusBadge(status: string) {
  const lower = status.toLowerCase();
  if (lower.includes("deliver")) return <Badge className="bg-emerald-100 text-emerald-700">{status}</Badge>;
  if (lower.includes("picked") || lower.includes("out")) return <Badge className="bg-blue-100 text-blue-700">{status}</Badge>;
  if (lower.includes("assign") || lower.includes("accept")) return <Badge className="bg-amber-100 text-amber-700">{status}</Badge>;
  if (lower.includes("cancel") || lower.includes("fail")) return <Badge className="bg-red-100 text-red-700">{status}</Badge>;
  return <Badge variant="secondary">{status}</Badge>;
}

const STATUS_TABS = [
  { value: "all", label: "All" },
  { value: "delivered", label: "Delivered" },
  { value: "assigned", label: "Assigned" },
  { value: "pickedup", label: "Picked Up" },
  { value: "cancelled", label: "Cancelled" },
];

function SellerOrderDeliveriesPageContent() {
  const searchParams = useSearchParams();
  const [items, setItems] = useState<OrderDelivery[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusTab, setStatusTab] = useState(searchParams.get("status") || "all");

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const [listRes, countRes] = await Promise.all([
        apiGet<OrderDelivery[]>(`api/v1/Seller/mine/order-deliveries?skip=${page * PAGE_SIZE}&top=${PAGE_SIZE}`),
        apiGet<{ intResponse: number }>("api/v1/Seller/mine/order-deliveries/count"),
      ]);
      setItems(listRes.successData ?? []);
      setTotal(countRes.successData?.intResponse ?? 0);
    } catch { /* ignore */ }
    setLoading(false);
  }, [page]);

  useEffect(() => { fetch(); }, [fetch]);

  const filteredItems = useMemo(() => {
    if (statusTab === "all") return items;
    return items.filter((item) => {
      const ds = item.deliveryStatus.toLowerCase();
      if (statusTab === "delivered") return ds.includes("deliver");
      if (statusTab === "assigned") return ds.includes("assign") || ds.includes("accept");
      if (statusTab === "pickedup") return ds.includes("picked") || ds.includes("out");
      if (statusTab === "cancelled") return ds.includes("cancel") || ds.includes("fail");
      return true;
    });
  }, [items, statusTab]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Order Deliveries"
        description="Track all your order deliveries, delivery boy assignments, and COD status"
      >
        <Button variant="outline" size="sm" onClick={fetch} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </PageHeader>

      <div className="flex gap-1 rounded-xl bg-slate-100 p-1 w-fit">
        {STATUS_TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setStatusTab(t.value)}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-all ${
              statusTab === t.value
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Order Status</TableHead>
                <TableHead>Delivery Status</TableHead>
                <TableHead>Delivery Boy</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>COD</TableHead>
                <TableHead>Delivered At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 9 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-slate-500">
                    <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    No orders yet
                  </TableCell>
                </TableRow>
              ) : (
                filteredItems.map((item) => (
                  <TableRow key={item.orderId}>
                    <TableCell className="font-mono text-xs font-medium">{item.orderNumber}</TableCell>
                    <TableCell className="text-sm">{item.customerName || "—"}</TableCell>
                    <TableCell>{statusBadge(item.orderStatus)}</TableCell>
                    <TableCell>{statusBadge(item.deliveryStatus)}</TableCell>
                    <TableCell>
                      {item.deliveryBoyName ? (
                        <div className="flex items-center gap-1.5">
                          <Truck className="h-3.5 w-3.5 text-indigo-400" />
                          <span className="text-sm">{item.deliveryBoyName}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{item.paymentMode}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(item.amount)}</TableCell>
                    <TableCell>
                      {item.paymentMode === "CashOnDelivery" ? (
                        item.isCodCollected ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <Clock className="h-4 w-4 text-orange-500" />
                        )
                      ) : (
                        <span className="text-xs text-slate-400">N/A</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {item.deliveredAt ? formatDateTime(item.deliveredAt) : "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <PaginationControls page={page + 1} pageSize={PAGE_SIZE} total={total} onPageChange={(p) => setPage(p - 1)} />
    </div>
  );
}

export default function SellerOrderDeliveriesPage() {
  return (
    <Suspense>
      <SellerOrderDeliveriesPageContent />
    </Suspense>
  );
}
