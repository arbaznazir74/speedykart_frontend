"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/shared/page-header";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { apiGet } from "@/lib/api-client";
import { formatCurrency } from "@/lib/format";
import {
  RefreshCw, Truck, Phone, Mail, BarChart3, Wifi, WifiOff,
} from "lucide-react";

const PAGE_SIZE = 20;

interface DeliveryBoy {
  id: number;
  name: string;
  username: string;
  email: string;
  mobile: string;
  address: string;
  status: string;
  loginStatus: string;
  paymentType: number;
  isAvailable: number;
  sellerId: number;
}

interface Stats {
  deliveryBoyId: number;
  deliveryBoyName: string;
  totalDeliveries: number;
  deliveredCount: number;
  assignedCount: number;
  pickedUpCount: number;
  totalDeliveredAmount: number;
  isOnline: boolean;
  paymentType: string;
}

const PAYMENT_TYPE_LABELS: Record<number, string> = { 0: "Unknown", 1: "Salaried", 2: "Commission" };

export default function SellerDeliveryBoysPage() {
  const [boys, setBoys] = useState<DeliveryBoy[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);

  // Stats dialog
  const [selected, setSelected] = useState<DeliveryBoy | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsOpen, setStatsOpen] = useState(false);

  const fetchBoys = useCallback(async () => {
    setLoading(true);
    try {
      const [listRes, countRes] = await Promise.all([
        apiGet<DeliveryBoy[]>(`api/v1/Seller/mine/delivery-boys?skip=${page * PAGE_SIZE}&top=${PAGE_SIZE}`),
        apiGet<{ intResponse: number }>("api/v1/Seller/mine/delivery-boys/count"),
      ]);
      setBoys(listRes.successData ?? []);
      setTotal(countRes.successData?.intResponse ?? 0);
    } catch { /* ignore */ }
    setLoading(false);
  }, [page]);

  useEffect(() => { fetchBoys(); }, [fetchBoys]);

  const openStats = async (boy: DeliveryBoy) => {
    setSelected(boy);
    setStatsOpen(true);
    setStats(null);
    try {
      const res = await apiGet<Stats>(`api/v1/Seller/mine/delivery-boy/${boy.id}/stats`);
      setStats(res.successData ?? null);
    } catch { setStats(null); }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Delivery Boys"
        description="View delivery boys assigned to your store by admin"
      >
        <Button variant="outline" size="sm" onClick={fetchBoys} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Mobile</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Online</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Stats</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : boys.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                    <Truck className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    No delivery boys assigned to your store yet. Contact admin.
                  </TableCell>
                </TableRow>
              ) : (
                boys.map((boy) => (
                  <TableRow key={boy.id}>
                    <TableCell className="font-medium">{boy.name}</TableCell>
                    <TableCell>{boy.mobile || "—"}</TableCell>
                    <TableCell className="text-slate-500 text-xs">{boy.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{PAYMENT_TYPE_LABELS[boy.paymentType] ?? "Unknown"}</Badge>
                    </TableCell>
                    <TableCell>
                      {boy.isAvailable === 1
                        ? <Badge className="bg-emerald-100 text-emerald-700 text-xs"><Wifi className="h-3 w-3 mr-1" />Online</Badge>
                        : <Badge variant="secondary" className="bg-slate-100 text-slate-500 text-xs"><WifiOff className="h-3 w-3 mr-1" />Offline</Badge>}
                    </TableCell>
                    <TableCell>
                      <Badge variant={boy.status === "Active" ? "default" : "secondary"}
                        className={boy.status === "Active" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}>
                        {boy.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="View Stats" onClick={() => openStats(boy)}>
                        <BarChart3 className="h-4 w-4" />
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

      {/* Stats Dialog */}
      <Dialog open={statsOpen} onOpenChange={setStatsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-indigo-500" />
              {selected?.name} — Stats
            </DialogTitle>
          </DialogHeader>
          {stats ? (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-2xl font-bold text-indigo-600">{stats.deliveredCount}</p>
                  <p className="text-xs text-slate-500">Delivered</p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-2xl font-bold text-amber-600">{stats.assignedCount}</p>
                  <p className="text-xs text-slate-500">Assigned</p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-2xl font-bold text-blue-600">{stats.pickedUpCount}</p>
                  <p className="text-xs text-slate-500">Picked Up</p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-2xl font-bold text-slate-700">{stats.totalDeliveries}</p>
                  <p className="text-xs text-slate-500">Total</p>
                </div>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <p className="text-2xl font-bold text-emerald-600">{formatCurrency(stats.totalDeliveredAmount)}</p>
                <p className="text-xs text-slate-500">Total Delivered Amount</p>
              </div>
              <div className="flex items-center justify-between px-1">
                <span className="text-slate-500">Payment Type:</span>
                <Badge variant="outline">{stats.paymentType}</Badge>
              </div>
              <div className="flex items-center justify-between px-1">
                <span className="text-slate-500">Status:</span>
                {stats.isOnline
                  ? <Badge className="bg-emerald-100 text-emerald-700">Online</Badge>
                  : <Badge variant="secondary">Offline</Badge>}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
