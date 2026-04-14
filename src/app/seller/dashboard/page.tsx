"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiGet } from "@/lib/api-client";
import { API_ENDPOINTS } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/format";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import {
  IndianRupee, ShoppingCart, Package, Clock, RefreshCw,
  Star, AlertTriangle, Wallet, Users, Award,
  PackageX, Ban,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell,
} from "recharts";

/* ── Types matching backend SellerDashboardSM ── */

interface SellerDashboardData {
  kpis?: {
    todayRevenue?: number;
    ordersToday?: number;
    pendingOrders?: number;
    lowStockCount?: number;
    pendingPayoutAmount?: number;
    storeRating?: number;
  };
  salesGraph?: {
    data?: { date: string; revenue: number; orderCount: number }[];
    growthPercentage?: number;
  };
  orders?: {
    pending?: number;
    processing?: number;
    shipped?: number;
    delivered?: number;
    returned?: number;
  };
  products?: {
    totalActiveProducts?: number;
    outOfStock?: number;
    rejectedProducts?: number;
    topSellingProducts?: { productVariantId: number; name: string; quantitySold: number }[];
  };
  financial?: {
    availableBalance?: number;
    lockedBalance?: number;
    commissionPaid?: number;
    upcomingPayoutDate?: string;
  };
  customers?: {
    repeatCustomerPercentage?: number;
    averageOrderValue?: number;
    bestPerformingCategory?: string;
  };
}

/* ── Palette ── */

const ORDER_PIE_COLORS = ["#6366f1", "#f59e0b", "#3b82f6", "#10b981", "#ef4444"];

const KPI_STYLES = [
  { gradient: "from-emerald-500 to-emerald-600" },
  { gradient: "from-indigo-500 to-indigo-600" },
  { gradient: "from-amber-500 to-orange-500" },
  { gradient: "from-rose-500 to-pink-600" },
  { gradient: "from-cyan-500 to-blue-500" },
  { gradient: "from-violet-500 to-purple-600" },
];

function KpiCard({
  title, value, icon: Icon, colorIndex = 0, subtitle, onClick,
}: {
  title: string; value: string | number; icon: React.ElementType; colorIndex?: number; subtitle?: string; onClick?: () => void;
}) {
  const style = KPI_STYLES[colorIndex % KPI_STYLES.length];
  return (
    <Card className={`border-0 shadow-sm hover:shadow-md transition-shadow ${onClick ? "cursor-pointer" : ""}`} onClick={onClick}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1.5">
            <p className="text-[13px] font-medium text-slate-500">{title}</p>
            <p className="text-2xl font-bold text-slate-900 tracking-tight">{value}</p>
            {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
          </div>
          <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${style.gradient} shadow-lg`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function shortDate(v: string) {
  const d = new Date(v);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

export default function SellerDashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<SellerDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await apiGet<SellerDashboardData>(`${API_ENDPOINTS.SELLER}/dashboard`);
      setData(resp.successData ?? null);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Loading ──
  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Store Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Loading…</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-[100px] rounded-2xl" />)}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-72 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  const kpis = data?.kpis;
  const salesGraph = data?.salesGraph?.data ?? [];
  const orders = data?.orders;
  const products = data?.products;
  const financial = data?.financial;
  const customers = data?.customers;
  const topProducts = products?.topSellingProducts ?? [];

  const orderPieData = [
    { name: "Pending", value: orders?.pending ?? 0 },
    { name: "Processing", value: orders?.processing ?? 0 },
    { name: "Shipped", value: orders?.shipped ?? 0 },
    { name: "Delivered", value: orders?.delivered ?? 0 },
    { name: "Returned", value: orders?.returned ?? 0 },
  ].filter((d) => d.value > 0);

  const totalOrdersAll = orderPieData.reduce((a, d) => a + d.value, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Welcome back{user?.username ? `, ${user.username}` : ""}!
          </h1>
          <p className="text-sm text-slate-500 mt-1">Here&apos;s your store performance at a glance.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      {/* ═══ KPI Cards ═══ */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <KpiCard title="Today&apos;s Revenue" value={formatCurrency(kpis?.todayRevenue ?? 0)} icon={IndianRupee} colorIndex={0} onClick={() => router.push("/seller/order-deliveries?status=delivered")} />
        <KpiCard title="Orders Today" value={kpis?.ordersToday ?? 0} icon={ShoppingCart} colorIndex={1} onClick={() => router.push("/seller/orders?date=today")} />
        <KpiCard title="Pending Orders" value={kpis?.pendingOrders ?? 0} icon={Clock} colorIndex={2} onClick={() => router.push("/seller/orders?tab=pending")} />
        <KpiCard title="Low Stock Items" value={kpis?.lowStockCount ?? 0} icon={AlertTriangle} colorIndex={3} subtitle="< 5 units" onClick={() => router.push("/seller/speedymart/inventory?lowStock=true")} />
        <KpiCard title="Store Rating" value={kpis?.storeRating ? `${kpis.storeRating.toFixed(1)} / 5` : "—"} icon={Star} colorIndex={4} />
        <KpiCard title="Active Products" value={products?.totalActiveProducts ?? 0} icon={Package} colorIndex={5} onClick={() => router.push("/seller/speedymart/products?status=active")} />
      </div>

      {/* ═══ Sales Graph + Order Status ═══ */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Sales Graph — 2 cols */}
        <Card className="md:col-span-2 border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Sales (Last 7 Days)</CardTitle>
            <CardDescription>Daily revenue from paid orders</CardDescription>
          </CardHeader>
          <CardContent>
            {salesGraph.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={salesGraph}>
                  <defs>
                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                  <Tooltip
                    formatter={(value: unknown, name: unknown) => [
                      name === "revenue" ? formatCurrency(Number(value)) : String(value),
                      name === "revenue" ? "Revenue" : "Orders",
                    ]}
                    labelFormatter={(l: unknown) => formatDate(String(l))}
                    contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0" }}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} fill="url(#salesGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground py-16 text-center">No sales data yet</p>
            )}
          </CardContent>
        </Card>

        {/* Order Status Donut */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Order Status</CardTitle>
            <CardDescription>{totalOrdersAll} total</CardDescription>
          </CardHeader>
          <CardContent>
            {orderPieData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={orderPieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={72}
                      paddingAngle={2}
                    >
                      {orderPieData.map((_, i) => (
                        <Cell key={i} fill={ORDER_PIE_COLORS[i % ORDER_PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-2 mt-2">
                  {orderPieData.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-1.5 text-xs">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: ORDER_PIE_COLORS[i % ORDER_PIE_COLORS.length] }} />
                      <span className="text-slate-600">{d.name}</span>
                      <span className="font-semibold text-slate-800">{d.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground py-16 text-center">No orders yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ═══ Orders per Day + Revenue vs Orders ═══ */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Orders Per Day Bar */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Orders Per Day</CardTitle>
            <CardDescription>Daily order count (last 7 days)</CardDescription>
          </CardHeader>
          <CardContent>
            {salesGraph.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={salesGraph}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value: unknown) => [String(value), "Orders"]}
                    labelFormatter={(l: unknown) => formatDate(String(l))}
                    contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0" }}
                  />
                  <Bar dataKey="orderCount" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground py-12 text-center">No data yet</p>
            )}
          </CardContent>
        </Card>

        {/* Top Products Bar Chart */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top Products by Quantity</CardTitle>
            <CardDescription>Best sellers by units sold</CardDescription>
          </CardHeader>
          <CardContent>
            {topProducts.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={topProducts} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={90} />
                  <Tooltip
                    formatter={(value: unknown) => [String(value), "Sold"]}
                    contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0" }}
                  />
                  <Bar dataKey="quantitySold" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground py-12 text-center">No sales data yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ═══ Financial + Customer Insights ═══ */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Financial Snapshot */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="h-4 w-4 text-indigo-500" /> Financial Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-lg bg-emerald-50 p-3">
              <span className="text-sm font-medium text-emerald-800">Available Balance</span>
              <span className="text-sm font-bold text-emerald-700">{formatCurrency(financial?.availableBalance ?? 0)}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-amber-50 p-3">
              <span className="text-sm font-medium text-amber-800">Locked Balance</span>
              <span className="text-sm font-bold text-amber-700">{formatCurrency(financial?.lockedBalance ?? 0)}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
              <span className="text-sm font-medium text-slate-700">Commission Paid</span>
              <span className="text-sm font-bold text-slate-700">{formatCurrency(financial?.commissionPaid ?? 0)}</span>
            </div>
            {financial?.upcomingPayoutDate && (
              <p className="text-xs text-slate-400 pt-1">
                Next payout: {formatDate(financial.upcomingPayoutDate)}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Customer Insights */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-violet-500" /> Customer Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-lg bg-violet-50 p-3">
              <span className="text-sm font-medium text-violet-800">Repeat Customers</span>
              <span className="text-sm font-bold text-violet-700">
                {customers?.repeatCustomerPercentage ? `${customers.repeatCustomerPercentage.toFixed(1)}%` : "—"}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-blue-50 p-3">
              <span className="text-sm font-medium text-blue-800">Avg. Order Value</span>
              <span className="text-sm font-bold text-blue-700">{formatCurrency(customers?.averageOrderValue ?? 0)}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-indigo-50 p-3">
              <span className="text-sm font-medium text-indigo-800">Best Category</span>
              <span className="text-sm font-bold text-indigo-700">{customers?.bestPerformingCategory || "—"}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ═══ Products: Top Selling + Health ═══ */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Top Selling Products */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Award className="h-4 w-4 text-amber-500" /> Top Selling Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topProducts.length > 0 ? (
              <div className="space-y-2">
                {topProducts.map((p, i) => (
                  <div key={p.productVariantId} className="flex items-center gap-3 rounded-lg border p-3 hover:bg-slate-50 transition-colors">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700 font-bold text-sm">{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{p.name}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">{p.quantitySold} sold</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">No sales data yet</p>
            )}
          </CardContent>
        </Card>

        {/* Product Health */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4 text-cyan-500" /> Product Health
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-lg bg-emerald-50 p-3">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-emerald-600" />
                <span className="text-sm font-medium text-emerald-800">Active Products</span>
              </div>
              <span className="text-lg font-bold text-emerald-700">{products?.totalActiveProducts ?? 0}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-amber-50 p-3">
              <div className="flex items-center gap-2">
                <PackageX className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-medium text-amber-800">Out of Stock</span>
              </div>
              <span className="text-lg font-bold text-amber-700">{products?.outOfStock ?? 0}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-red-50 p-3">
              <div className="flex items-center gap-2">
                <Ban className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium text-red-800">Rejected</span>
              </div>
              <span className="text-lg font-bold text-red-700">{products?.rejectedProducts ?? 0}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
