"use client";

import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { apiGet, apiPut } from "@/lib/api-client";
import { API_ENDPOINTS } from "@/lib/constants";
import { formatCurrency } from "@/lib/format";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { PageHeader } from "@/components/shared/page-header";
import { SellerPicker, PickerSeller } from "@/components/shared/seller-picker";
import {
  CheckCircle, XCircle, Loader2, Package, Search, Filter,
  Eye, EyeOff, ShieldBan, Clock, FileText, Layers,
} from "lucide-react";
import { toast } from "sonner";

interface ProductVariant {
  id: number;
  name: string;
  price: number;
  discountedPrice: number;
  stock: number;
  status: string;
  platformType: string;
  productId: number;
  categoryId: number | null;
  imageBase64: string | null;
  description: string | null;
  indicator: string | null;
}

const STATUS_MAP: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  Draft:           { label: "Draft",    color: "bg-slate-100 text-slate-600 border-slate-200",   icon: FileText },
  PendingApproval: { label: "Pending",  color: "bg-amber-50 text-amber-700 border-amber-200",   icon: Clock },
  Active:          { label: "Active",   color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle },
  Inactive:        { label: "Inactive", color: "bg-slate-50 text-slate-500 border-slate-200",   icon: EyeOff },
  Rejected:        { label: "Rejected", color: "bg-red-50 text-red-700 border-red-200",         icon: XCircle },
  Blocked:         { label: "Blocked",  color: "bg-red-100 text-red-800 border-red-300",        icon: ShieldBan },
  OutOfStock:      { label: "Out of Stock", color: "bg-orange-50 text-orange-700 border-orange-200", icon: Package },
};

const STATUS_NUM: Record<number, string> = {
  0: "Draft", 1: "PendingApproval", 2: "Active", 3: "Inactive",
  4: "Rejected", 5: "Blocked", 6: "OutOfStock",
};

function resolveStatus(s: string | number): string {
  if (typeof s === "number") return STATUS_NUM[s] ?? String(s);
  return s;
}

function IndicatorDot({ indicator }: { indicator: string | null }) {
  if (!indicator) return null;
  const c = indicator === "Veg" ? "bg-green-500" : indicator === "NonVeg" ? "bg-red-500" : "bg-yellow-500";
  return <span className={`inline-block h-2 w-2 rounded-sm ${c} shrink-0`} title={indicator} />;
}

export default function ProductListingsPage() {
  const [selectedSeller, setSelectedSeller] = useState<PickerSeller | null>(null);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQ, setSearchQ] = useState("");
  const pageSize = 20;

  const loadVariants = useCallback(async (seller: PickerSeller, pg: number) => {
    setLoading(true);
    try {
      const skip = (pg - 1) * pageSize;
      const [listResp, countResp] = await Promise.all([
        apiGet<ProductVariant[]>(`${API_ENDPOINTS.PRODUCT_VARIANT}/seller/${seller.id}?skip=${skip}&top=${pageSize}`),
        apiGet<{ intResponse: number }>(`${API_ENDPOINTS.PRODUCT_VARIANT}/seller/count/${seller.id}`),
      ]);
      setVariants(listResp.successData ?? []);
      setTotal(countResp.successData?.intResponse ?? 0);
    } catch {
      setVariants([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, []);

  function selectSeller(s: PickerSeller) {
    setSelectedSeller(s);
    setSelected(new Set());
    setPage(1);
    setStatusFilter("all");
    setSearchQ("");
    loadVariants(s, 1);
  }

  function handlePageChange(pg: number) {
    setPage(pg);
    if (selectedSeller) loadVariants(selectedSeller, pg);
  }

  function toggleSelect(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === displayed.length) setSelected(new Set());
    else setSelected(new Set(displayed.map((v) => v.id)));
  }

  async function bulkStatus(status: number) {
    if (selected.size === 0) return;
    setSaving(true);
    try {
      await apiPut<{ ids: number[]; status: number }, unknown>(
        `${API_ENDPOINTS.PRODUCT_VARIANT}/status/bulk`,
        { ids: Array.from(selected), status }
      );
      toast.success(`${selected.size} product(s) ${status === 2 ? "approved" : "rejected"}`);
      setSelected(new Set());
      if (selectedSeller) await loadVariants(selectedSeller, page);
    } catch {
      toast.error("Failed to update status");
    } finally {
      setSaving(false);
    }
  }

  const displayed = variants
    .filter((v) => statusFilter === "all" || resolveStatus(v.status) === statusFilter)
    .filter((v) => searchQ === "" || v.name.toLowerCase().includes(searchQ.toLowerCase()));

  // Status summary counts
  const statusCounts = variants.reduce<Record<string, number>>((acc, v) => {
    const s = resolveStatus(v.status);
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <PageHeader
        title="Product Listings"
        description="Review, approve or reject product variants submitted by sellers"
      />

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        <SellerPicker selected={selectedSeller} onSelect={selectSeller} title="Sellers" />

        <div className="space-y-4">
          {!selectedSeller ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="py-24 text-center">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                  <Layers className="h-8 w-8 text-slate-300" />
                </div>
                <p className="text-lg font-semibold text-slate-600">Select a seller</p>
                <p className="text-sm text-slate-400 mt-1 max-w-xs mx-auto">
                  Choose a seller from the list to view and manage their product listings
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Status summary pills */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setStatusFilter("all")}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    statusFilter === "all"
                      ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  All ({total})
                </button>
                {Object.entries(statusCounts).map(([status, count]) => {
                  const meta = STATUS_MAP[status];
                  if (!meta) return null;
                  return (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        statusFilter === status
                          ? `${meta.color}`
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {meta.label} ({count})
                    </button>
                  );
                })}
              </div>

              {/* Toolbar */}
              <Card className="border-0 shadow-sm">
                <CardContent className="py-3 flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <h2 className="font-semibold text-sm">{selectedSeller.storeName || selectedSeller.name}</h2>
                    <Badge variant="outline" className="text-xs font-normal">{total} products</Badge>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Search products..."
                        className="pl-8 h-8 w-48 text-xs"
                        value={searchQ}
                        onChange={(e) => setSearchQ(e.target.value)}
                      />
                    </div>
                    {selected.size > 0 && (
                      <div className="flex items-center gap-2 ml-2 pl-2 border-l border-slate-200">
                        <Badge className="bg-indigo-100 text-indigo-700 border-0">{selected.size} selected</Badge>
                        <Button size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700 shadow-sm" disabled={saving}
                          onClick={() => bulkStatus(2)}>
                          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <CheckCircle className="h-3.5 w-3.5 mr-1" />}
                          Approve
                        </Button>
                        <Button size="sm" variant="destructive" className="h-8 shadow-sm" disabled={saving}
                          onClick={() => bulkStatus(4)}>
                          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <XCircle className="h-3.5 w-3.5 mr-1" />}
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Table */}
              <Card className="border-0 shadow-sm overflow-hidden">
                <CardContent className="p-0">
                  {loading ? (
                    <div className="p-6 space-y-3">
                      {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
                    </div>
                  ) : displayed.length === 0 ? (
                    <div className="py-20 text-center">
                      <Filter className="h-10 w-10 mx-auto text-slate-200 mb-3" />
                      <p className="text-sm font-medium text-slate-500">No products found</p>
                      <p className="text-xs text-slate-400 mt-1">Try adjusting your search or filter</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50/80">
                            <TableHead className="w-10 pl-4">
                              <Checkbox
                                checked={selected.size === displayed.length && displayed.length > 0}
                                onCheckedChange={toggleSelectAll}
                              />
                            </TableHead>
                            <TableHead className="w-16">Product</TableHead>
                            <TableHead></TableHead>
                            <TableHead>Platform</TableHead>
                            <TableHead className="text-right">Price</TableHead>
                            <TableHead className="text-right">Disc. Price</TableHead>
                            <TableHead className="text-right">Stock</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right pr-4">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {displayed.map((v) => {
                            const sl = resolveStatus(v.status);
                            const meta = STATUS_MAP[sl];
                            const StatusIcon = meta?.icon ?? Eye;
                            const hasDiscount = v.discountedPrice > 0 && v.discountedPrice < v.price;
                            return (
                              <TableRow
                                key={v.id}
                                className={`transition-colors ${selected.has(v.id) ? "bg-indigo-50/40" : "hover:bg-slate-50/50"}`}
                              >
                                <TableCell className="pl-4">
                                  <Checkbox checked={selected.has(v.id)} onCheckedChange={() => toggleSelect(v.id)} />
                                </TableCell>
                                <TableCell>
                                  {v.imageBase64 ? (
                                    <img
                                      src={`data:image/png;base64,${v.imageBase64}`}
                                      alt=""
                                      className="h-10 w-10 rounded-lg object-cover border border-slate-200"
                                    />
                                  ) : (
                                    <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center">
                                      <Package className="h-4 w-4 text-slate-300" />
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1.5">
                                    <IndicatorDot indicator={v.indicator} />
                                    <div>
                                      <p className="font-medium text-sm text-slate-800 leading-tight">{v.name}</p>
                                      <p className="text-[11px] text-muted-foreground">ID: {v.id}</p>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant="outline"
                                    className={`text-[11px] font-medium ${
                                      v.platformType === "HotBox"
                                        ? "border-orange-200 text-orange-600 bg-orange-50"
                                        : "border-blue-200 text-blue-600 bg-blue-50"
                                    }`}
                                  >
                                    {v.platformType}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right font-medium tabular-nums">
                                  {hasDiscount ? (
                                    <span className="line-through text-slate-400 text-xs">{formatCurrency(v.price)}</span>
                                  ) : (
                                    formatCurrency(v.price)
                                  )}
                                </TableCell>
                                <TableCell className="text-right tabular-nums">
                                  {hasDiscount ? (
                                    <span className="font-semibold text-emerald-700">{formatCurrency(v.discountedPrice)}</span>
                                  ) : (
                                    <span className="text-slate-400">—</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right tabular-nums">
                                  <span className={v.stock <= 0 ? "text-red-500 font-medium" : ""}>{v.stock}</span>
                                </TableCell>
                                <TableCell>
                                  <Badge className={`text-[11px] border ${meta?.color ?? "bg-slate-100"}`}>
                                    <StatusIcon className="h-3 w-3 mr-1" />
                                    {meta?.label ?? sl}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right pr-4">
                                  <div className="flex items-center justify-end gap-1">
                                    {sl !== "Active" && (
                                      <Button size="sm" variant="ghost"
                                        className="h-7 text-xs text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50"
                                        onClick={async () => { setSelected(new Set([v.id])); await bulkStatus(2); }}>
                                        <CheckCircle className="h-3 w-3 mr-1" /> Approve
                                      </Button>
                                    )}
                                    {sl !== "Rejected" && sl !== "Active" && (
                                      <Button size="sm" variant="ghost"
                                        className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                                        onClick={async () => { setSelected(new Set([v.id])); await bulkStatus(4); }}>
                                        <XCircle className="h-3 w-3 mr-1" /> Reject
                                      </Button>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>

              <PaginationControls page={page} pageSize={pageSize} total={total} onPageChange={handlePageChange} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
