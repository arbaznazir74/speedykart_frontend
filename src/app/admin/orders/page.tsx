"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-header";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { StatusBadge } from "@/components/shared/status-badge";
import { OrderDetailDialog, OrderSummary } from "@/components/shared/order-detail-dialog";
import { apiGet } from "@/lib/api-client";
import { API_ENDPOINTS } from "@/lib/constants";
import { formatCurrency, formatDateTime } from "@/lib/format";
import {
  Eye, RefreshCw, Store, ArrowLeft, TrendingUp, IndianRupee,
  ShoppingCart, CalendarDays, Search,
} from "lucide-react";

/* ── Types ── */

interface Seller {
  id: number;
  name: string;
  storeName: string | null;
  businessName: string | null;
  image: string | null;
}

interface SellerEarnings {
  todayEarnings: number;
  monthEarnings: number;
  todayOrders: number;
  monthOrders: number;
}

interface Order {
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
}

interface SellerOrderItem {
  id: number;
  orderId: number;
  customerName: string | null;
  productVariantId: number;
  productName: string | null;
  productImage: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  paymentStatus: string | null;
  orderStatus: string | null;
  paymentMode: string | null;
  selectedToppings: string | null;
  selectedAddons: string | null;
}

export default function OrdersPage() {
  // ─── Seller list state ───
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [sellersLoading, setSellersLoading] = useState(true);
  const [sellerSearch, setSellerSearch] = useState("");

  // ─── Selected seller state ───
  const [selectedSeller, setSelectedSeller] = useState<Seller | null>(null);
  const [earnings, setEarnings] = useState<SellerEarnings | null>(null);
  const [earningsLoading, setEarningsLoading] = useState(false);

  // ─── Orders state (all orders or seller orders) ───
  const [orders, setOrders] = useState<Order[]>([]);
  const [sellerItems, setSellerItems] = useState<SellerOrderItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [detailOrder, setDetailOrder] = useState<OrderSummary | null>(null);
  const pageSize = 15;

  // ─── Load sellers ───
  useEffect(() => {
    (async () => {
      setSellersLoading(true);
      try {
        const resp = await apiGet<Seller[]>(API_ENDPOINTS.SELLER, { skip: 0, top: 200 });
        setSellers(resp.successData ?? []);
      } catch {
        setSellers([]);
      } finally {
        setSellersLoading(false);
      }
    })();
  }, []);

  // ─── Load seller earnings ───
  const loadEarnings = useCallback(async (sellerId: number) => {
    setEarningsLoading(true);
    try {
      const resp = await apiGet<SellerEarnings>(`${API_ENDPOINTS.ORDER}/seller-earnings?sellerId=${sellerId}`);
      setEarnings(resp.successData ?? null);
    } catch {
      setEarnings(null);
    } finally {
      setEarningsLoading(false);
    }
  }, []);

  // ─── Load seller order items ───
  const loadSellerOrders = useCallback(async (sellerId: number, p: number) => {
    setLoading(true);
    setPage(p);
    try {
      const skip = (p - 1) * pageSize;
      const [listResp, countResp] = await Promise.all([
        apiGet<SellerOrderItem[]>(`${API_ENDPOINTS.ORDER}/seller-orders?sellerId=${sellerId}`, { skip, top: pageSize }),
        apiGet<{ intResponse: number }>(`${API_ENDPOINTS.ORDER}/seller-orders/count?sellerId=${sellerId}`),
      ]);
      setSellerItems(listResp.successData ?? []);
      setTotal(countResp.successData?.intResponse ?? 0);
    } catch {
      setSellerItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // ─── Load all orders (global view) ───
  const loadAllOrders = useCallback(async (p: number) => {
    setLoading(true);
    setPage(p);
    try {
      const skip = (p - 1) * pageSize;
      const [listResp, countResp] = await Promise.all([
        apiGet<Order[]>(API_ENDPOINTS.ORDER, { skip, top: pageSize, orderby: "id desc" }),
        apiGet<{ intResponse: number }>(`${API_ENDPOINTS.ORDER}/count`),
      ]);
      setOrders(listResp.successData ?? []);
      setTotal(countResp.successData?.intResponse ?? 0);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // ─── Select a seller ───
  function handleSelectSeller(seller: Seller) {
    setSelectedSeller(seller);
    setSellerItems([]);
    setOrders([]);
    setTotal(0);
    setPage(1);
    loadEarnings(seller.id);
    loadSellerOrders(seller.id, 1);
  }

  // ─── Go back to seller list ───
  function handleBack() {
    setSelectedSeller(null);
    setEarnings(null);
    setSellerItems([]);
    setOrders([]);
    setTotal(0);
    setPage(1);
  }

  function formatPaymentMode(mode: string | number | null): string {
    if (!mode && mode !== 0) return "—";
    if (typeof mode === "string") {
      if (mode === "CashOnDelivery") return "COD";
      return mode;
    }
    return mode === 1 ? "COD" : "Online";
  }

  const filteredSellers = sellers.filter((s) => {
    const q = sellerSearch.toLowerCase();
    return (
      s.name?.toLowerCase().includes(q) ||
      s.storeName?.toLowerCase().includes(q) ||
      s.businessName?.toLowerCase().includes(q)
    );
  });

  // ════════════════════════════════
  // RENDER: Seller selected → show their orders
  // ════════════════════════════════
  if (selectedSeller) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={`Orders — ${selectedSeller.storeName || selectedSeller.name}`}
          description={`Viewing orders for ${selectedSeller.name}`}
        >
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleBack}>
              <ArrowLeft className="mr-2 h-4 w-4" /> All Sellers
            </Button>
            <Button variant="outline" size="sm" onClick={() => { loadEarnings(selectedSeller.id); loadSellerOrders(selectedSeller.id, page); }}>
              <RefreshCw className="mr-2 h-4 w-4" /> Refresh
            </Button>
          </div>
        </PageHeader>

        {/* ── Earnings Cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {earningsLoading ? (
            <>
              {[...Array(4)].map((_, i) => (
                <Card key={i} className="border-0 shadow-sm">
                  <CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent>
                </Card>
              ))}
            </>
          ) : (
            <>
              <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-white">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                      <IndianRupee className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-medium">Today&apos;s Earnings</p>
                      <p className="text-lg font-bold text-emerald-700">{formatCurrency(earnings?.todayEarnings ?? 0)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-white">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center">
                      <TrendingUp className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-medium">This Month</p>
                      <p className="text-lg font-bold text-blue-700">{formatCurrency(earnings?.monthEarnings ?? 0)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-white">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center">
                      <ShoppingCart className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-medium">Orders Today</p>
                      <p className="text-lg font-bold text-amber-700">{earnings?.todayOrders ?? 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-white">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-purple-100 flex items-center justify-center">
                      <CalendarDays className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-medium">Orders This Month</p>
                      <p className="text-lg font-bold text-purple-700">{earnings?.monthOrders ?? 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* ── Seller Orders Table (grouped by orderId) ── */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-3">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
              </div>
            ) : sellerItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                  <ShoppingCart className="h-6 w-6 text-slate-400" />
                </div>
                <p className="text-base font-semibold text-slate-700">No orders found</p>
                <p className="text-sm text-slate-400 mt-1">This seller has no orders yet</p>
              </div>
            ) : (() => {
              const grouped = sellerItems.reduce<Record<number, SellerOrderItem[]>>((acc, item) => {
                (acc[item.orderId] ??= []).push(item);
                return acc;
              }, {});
              const orderRows = Object.entries(grouped).map(([oid, items]) => {
                const first = items[0];
                return {
                  orderId: Number(oid),
                  customerName: first.customerName,
                  productSummary: items.map((i) => i.productName || "Item").join(", "),
                  itemCount: items.reduce((s, i) => s + i.quantity, 0),
                  unitPrice: items.length === 1 ? items[0].unitPrice : undefined,
                  total: items.reduce((s, i) => s + i.totalPrice, 0),
                  paymentMode: first.paymentMode,
                  orderStatus: first.orderStatus,
                  paymentStatus: first.paymentStatus,
                  sellerId: selectedSeller.id,
                };
              });
              return (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order #</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Unit Price</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead>Payment</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Payment Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orderRows.map((row) => (
                        <TableRow key={row.orderId}>
                          <TableCell className="font-semibold text-slate-900">#{row.orderId}</TableCell>
                          <TableCell>{row.customerName || "—"}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{row.productSummary}</TableCell>
                          <TableCell className="text-right">{row.itemCount}</TableCell>
                          <TableCell className="text-right">{row.unitPrice != null ? formatCurrency(row.unitPrice) : "—"}</TableCell>
                          <TableCell className="text-right font-semibold">{formatCurrency(row.total)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{formatPaymentMode(row.paymentMode)}</Badge>
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={row.orderStatus ?? "Unknown"} />
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={row.paymentStatus ?? "Unknown"} />
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setDetailOrder({
                                id: row.orderId,
                                orderNumber: String(row.orderId),
                                customerName: row.customerName ?? "",
                                userId: 0,
                                sellerId: row.sellerId,
                                amount: row.total,
                                deliveryCharge: 0,
                                platormCharge: 0,
                                cutlaryCharge: 0,
                                lowCartFeeCharge: 0,
                                tipAmount: 0,
                                orderStatus: row.orderStatus ?? "",
                                paymentStatus: row.paymentStatus ?? "",
                                paymentMode: row.paymentMode ?? "",
                                createdAt: "",
                              })}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              );
            })()}
          </CardContent>
        </Card>

        <PaginationControls page={page} pageSize={pageSize} total={total} onPageChange={(p) => loadSellerOrders(selectedSeller.id, p)} />

        <OrderDetailDialog
          order={detailOrder}
          open={!!detailOrder}
          onClose={() => setDetailOrder(null)}
        />
      </div>
    );
  }

  // ════════════════════════════════
  // RENDER: No seller selected → show seller list
  // ════════════════════════════════
  return (
    <div className="space-y-6">
      <PageHeader title="Orders" description="Select a seller to view their orders and earnings" />

      {/* ── Seller Search ── */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search sellers..."
          value={sellerSearch}
          onChange={(e) => setSellerSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* ── Seller Grid ── */}
      {sellersLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="border-0 shadow-sm">
              <CardContent className="p-5"><Skeleton className="h-20 w-full" /></CardContent>
            </Card>
          ))}
        </div>
      ) : filteredSellers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
            <Store className="h-6 w-6 text-slate-400" />
          </div>
          <p className="text-base font-semibold text-slate-700">No sellers found</p>
          <p className="text-sm text-slate-400 mt-1">
            {sellerSearch ? "Try a different search term" : "Add sellers to get started"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredSellers.map((seller) => (
            <Card
              key={seller.id}
              className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
              onClick={() => handleSelectSeller(seller)}
            >
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shrink-0">
                    {(seller.storeName || seller.name || "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                      {seller.storeName || seller.name}
                    </p>
                    {seller.storeName && seller.name !== seller.storeName && (
                      <p className="text-xs text-slate-500 truncate">{seller.name}</p>
                    )}
                    {seller.businessName && (
                      <p className="text-xs text-slate-400 truncate">{seller.businessName}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Order Detail Dialog (reused) */}
      <OrderDetailDialog
        order={detailOrder}
        open={!!detailOrder}
        onClose={() => setDetailOrder(null)}
      />
    </div>
  );
}
