"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { apiGet } from "@/lib/api-client";
import { API_ENDPOINTS } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  BarChart3,
  IndianRupee,
  ShoppingCart,
  Store,
  UserPlus,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  ShieldAlert,
  CreditCard,
  Filter,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

/* ── Types matching backend AdminDashboardResponseSM ── */

interface DashboardData {
  platformKpis?: {
    gmvThisMonth?: number;
    platformCommissionEarned?: number;
    totalOrdersToday?: number;
    activeVendors?: number;
    newVendorsThisWeek?: number;
    pendingRefundRequests?: number;
  };
  orderHealth?: {
    pendingPayments?: number;
    failedPayments?: number;
    ordersByStatus?: { status: string; count: number }[];
  };
  vendorHealth?: {
    deactivatedSellers?: number;
    topVendorsBySales?: { sellerId: number; storeName: string; totalSales: number; refundRate: number }[];
    vendorsWithHighRefundRate?: { sellerId: number; storeName: string; totalSales: number; refundRate: number }[];
  };
  revenueAnalytics?: {
    commissionTrend?: { date: string; amount: number; orderCount: number }[];
    refundRatioOverlay?: { date: string; refundRatioPercentage: number }[];
  };
  paymentModeDistribution?: { mode: string; count: number; amount: number }[];
  hourlyOrderDistribution?: { hour: number; count: number }[];
  categoryRevenue?: { category: string; revenue: number; orderCount: number }[];
}

/* ── Palette ── */

const PIE_COLORS = [
  "#6366f1", "#ef4444", "#10b981", "#f59e0b",
  "#8b5cf6", "#f97316", "#06b6d4", "#ec4899", "#14b8a6", "#a855f7",
];

const GRADIENT_STYLES = [
  { bg: "from-indigo-500 to-indigo-600", icon: "bg-indigo-100 text-indigo-600" },
  { bg: "from-emerald-500 to-emerald-600", icon: "bg-emerald-100 text-emerald-600" },
  { bg: "from-amber-500 to-orange-500", icon: "bg-amber-100 text-amber-600" },
  { bg: "from-rose-500 to-pink-600", icon: "bg-rose-100 text-rose-600" },
  { bg: "from-cyan-500 to-blue-500", icon: "bg-cyan-100 text-cyan-600" },
  { bg: "from-violet-500 to-purple-600", icon: "bg-violet-100 text-violet-600" },
  { bg: "from-teal-500 to-teal-600", icon: "bg-teal-100 text-teal-600" },
];

function StatCard({
  title, value, icon: Icon, description, colorIndex = 0, onClick,
}: {
  title: string; value: string | number; icon: React.ElementType; description?: string; colorIndex?: number; onClick?: () => void;
}) {
  const s = GRADIENT_STYLES[colorIndex % GRADIENT_STYLES.length];
  return (
    <Card className={`border-0 shadow-sm hover:shadow-md transition-shadow ${onClick ? "cursor-pointer" : ""}`} onClick={onClick}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1.5">
            <p className="text-[13px] font-medium text-slate-500">{title}</p>
            <p className="text-2xl font-bold text-slate-900 tracking-tight">{value}</p>
            {description && <p className="text-xs text-slate-400">{description}</p>}
          </div>
          <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${s.bg} shadow-lg`}>
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

function toLocalDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState(toLocalDateStr(new Date()));

  const loadDashboard = useCallback(async (selectedDate?: string) => {
    setLoading(true);
    try {
      const d = selectedDate ?? dateFilter;
      const url = d
        ? `${API_ENDPOINTS.ADMIN}/dashboard?date=${d}`
        : `${API_ENDPOINTS.ADMIN}/dashboard`;
      const resp = await apiGet<DashboardData>(url);
      setData(resp.successData ?? null);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [dateFilter]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  const kpis = data?.platformKpis;
  const orderHealth = data?.orderHealth;
  const vendorHealth = data?.vendorHealth;
  const revenueTrend = data?.revenueAnalytics?.commissionTrend ?? [];
  const refundOverlay = data?.revenueAnalytics?.refundRatioOverlay ?? [];
  const ordersByStatus = orderHealth?.ordersByStatus ?? [];
  const topVendors = vendorHealth?.topVendorsBySales ?? [];
  const highRefundVendors = vendorHealth?.vendorsWithHighRefundRate ?? [];
  const paymentModes = data?.paymentModeDistribution ?? [];
  const hourlyOrders = data?.hourlyOrderDistribution ?? [];
  const categoryRevenue = data?.categoryRevenue ?? [];

  // ── Loading state ──
  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Loading your business overview…</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-[110px] rounded-2xl" />)}
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-[110px] rounded-2xl" />)}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-80 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  const totalOrders = ordersByStatus.reduce((acc, s) => acc + s.count, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Welcome back! Here&apos;s your business overview.</p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <Input
            type="date"
            className="w-44 h-9"
            value={dateFilter}
            onChange={(e) => {
              setDateFilter(e.target.value);
              loadDashboard(e.target.value);
            }}
          />
          {dateFilter && dateFilter !== toLocalDateStr(new Date()) && (
            <Button
              variant="outline"
              size="sm"
              className="h-9 text-xs"
              onClick={() => {
                const today = toLocalDateStr(new Date());
                setDateFilter(today);
                loadDashboard(today);
              }}
            >
              Today
            </Button>
          )}
          <button
            onClick={() => loadDashboard()}
            className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-indigo-600 bg-white border border-slate-200 rounded-lg px-3 py-1.5 hover:border-indigo-200 transition-all"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>
      </div>

      {/* ═══ Row 1: Primary KPIs ═══ */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="GMV (This Month)" value={formatCurrency(kpis?.gmvThisMonth ?? 0)} icon={BarChart3} colorIndex={0} onClick={() => router.push("/admin/orders")} />
        <StatCard title="Commission Earned" value={formatCurrency(kpis?.platformCommissionEarned ?? 0)} icon={IndianRupee} colorIndex={1} onClick={() => router.push("/admin/orders")} />
        <StatCard title={`Orders${dateFilter ? " (" + dateFilter + ")" : " Today"}`} value={kpis?.totalOrdersToday ?? 0} icon={ShoppingCart} description="Across platform" colorIndex={2} onClick={() => router.push("/admin/orders")} />
        <StatCard title="Active Vendors" value={kpis?.activeVendors ?? 0} icon={Store} colorIndex={3} onClick={() => router.push("/admin/sellers?status=active")} />
      </div>

      {/* ═══ Row 2: Secondary KPIs ═══ */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="New Vendors (This Week)" value={kpis?.newVendorsThisWeek ?? 0} icon={UserPlus} description="Registrations" colorIndex={4} onClick={() => router.push("/admin/sellers")} />
        <StatCard title="Pending Payments" value={orderHealth?.pendingPayments ?? 0} icon={CreditCard} description="Need review" colorIndex={5} onClick={() => router.push("/admin/orders")} />
        <StatCard title="Deactivated Sellers" value={vendorHealth?.deactivatedSellers ?? 0} icon={AlertTriangle} colorIndex={3} onClick={() => router.push("/admin/sellers?status=deactivated")} />
      </div>

      {/* ═══ Row 3: Revenue Trend + Orders by Status ═══ */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Revenue Area Chart — spans 2 cols */}
        <Card className="md:col-span-2 border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Revenue Trend (Last 30 Days)</CardTitle>
            <CardDescription>Daily paid order volume</CardDescription>
          </CardHeader>
          <CardContent>
            {revenueTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={revenueTrend}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(value: unknown) => [formatCurrency(Number(value)), "Revenue"]}
                    labelFormatter={(l: unknown) => formatDate(String(l))}
                    contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0" }}
                  />
                  <Area type="monotone" dataKey="amount" stroke="#6366f1" strokeWidth={2} fill="url(#revGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground py-16 text-center">No revenue data yet</p>
            )}
          </CardContent>
        </Card>

        {/* Orders by Status Donut */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Orders by Status</CardTitle>
            <CardDescription>{totalOrders} total orders</CardDescription>
          </CardHeader>
          <CardContent>
            {ordersByStatus.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={ordersByStatus}
                      dataKey="count"
                      nameKey="status"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                    >
                      {ordersByStatus.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-2 mt-2">
                  {ordersByStatus.map((s, i) => (
                    <div key={s.status} className="flex items-center gap-1.5 text-xs">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-slate-600">{s.status}</span>
                      <span className="font-semibold text-slate-800">{s.count}</span>
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

      {/* ═══ Row 4: Order Health + Refund Trend ═══ */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Order Health */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-amber-500" /> Order Health
            </CardTitle>
            <CardDescription>Payment status overview</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-lg bg-amber-50 p-3">
              <span className="text-sm font-medium text-amber-800">Pending Payments</span>
              <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-sm">
                {orderHealth?.pendingPayments ?? 0}
              </Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-red-50 p-3">
              <span className="text-sm font-medium text-red-800">Failed Payments</span>
              <Badge className="bg-red-100 text-red-700 border-red-200 text-sm">
                {orderHealth?.failedPayments ?? 0}
              </Badge>
            </div>
            <div className="pt-2">
              <p className="text-xs font-medium text-slate-500 mb-2 uppercase tracking-wide">Status Breakdown</p>
              <div className="space-y-1.5">
                {ordersByStatus.length > 0 ? ordersByStatus.map((s, i) => {
                  const pct = totalOrders > 0 ? (s.count / totalOrders) * 100 : 0;
                  return (
                    <div key={s.status} className="flex items-center gap-2">
                      <span className="text-xs w-28 text-slate-600 truncate">{s.status}</span>
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      </div>
                      <span className="text-xs font-semibold w-8 text-right">{s.count}</span>
                    </div>
                  );
                }) : <span className="text-sm text-muted-foreground">—</span>}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Refund Ratio Trend */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Refund / Cancellation Ratio</CardTitle>
            <CardDescription>Daily refund + cancellation % (30 days)</CardDescription>
          </CardHeader>
          <CardContent>
            {refundOverlay.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={refundOverlay}>
                  <defs>
                    <linearGradient id="refundGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 11 }} />
                  <YAxis unit="%" tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value: unknown) => [`${Number(value).toFixed(1)}%`, "Refund Rate"]}
                    labelFormatter={(l: unknown) => formatDate(String(l))}
                    contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0" }}
                  />
                  <Area type="monotone" dataKey="refundRatioPercentage" stroke="#f59e0b" strokeWidth={2} fill="url(#refundGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground py-16 text-center">No refund data yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ═══ Row 5: Order Volume + Payment Mode ═══ */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Daily Order Volume Bar Chart */}
        <Card className="md:col-span-2 border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Daily Order Volume (30 Days)</CardTitle>
            <CardDescription>Number of paid orders per day</CardDescription>
          </CardHeader>
          <CardContent>
            {revenueTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={revenueTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value: unknown) => [String(value), "Orders"]}
                    labelFormatter={(l: unknown) => formatDate(String(l))}
                    contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0" }}
                  />
                  <Bar dataKey="orderCount" fill="#8b5cf6" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground py-16 text-center">No data yet</p>
            )}
          </CardContent>
        </Card>

        {/* Payment Mode Donut */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Payment Modes</CardTitle>
            <CardDescription>This month&apos;s split</CardDescription>
          </CardHeader>
          <CardContent>
            {paymentModes.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={paymentModes}
                      dataKey="count"
                      nameKey="mode"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={72}
                      paddingAngle={3}
                    >
                      {paymentModes.map((_, i) => (
                        <Cell key={i} fill={["#10b981", "#f59e0b", "#6366f1"][i % 3]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: unknown, name: unknown) => [`${value} orders`, name === "Online" ? "Online" : name === "CashOnDelivery" ? "COD" : String(name)]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-3 mt-2 justify-center">
                  {paymentModes.map((m, i) => (
                    <div key={m.mode} className="flex items-center gap-1.5 text-xs">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: ["#10b981", "#f59e0b", "#6366f1"][i % 3] }} />
                      <span className="text-slate-600">{m.mode === "CashOnDelivery" ? "COD" : m.mode}</span>
                      <span className="font-semibold">{m.count}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground py-16 text-center">No data yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ═══ Row 6: Category Revenue + Hourly Distribution ═══ */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Category Revenue Bar */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Revenue by Category</CardTitle>
            <CardDescription>Top categories this month</CardDescription>
          </CardHeader>
          <CardContent>
            {categoryRevenue.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={categoryRevenue} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                  <YAxis dataKey="category" type="category" tick={{ fontSize: 11 }} width={100} />
                  <Tooltip
                    formatter={(value: unknown) => [formatCurrency(Number(value)), "Revenue"]}
                    contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0" }}
                  />
                  <Bar dataKey="revenue" fill="#06b6d4" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground py-16 text-center">No category data yet</p>
            )}
          </CardContent>
        </Card>

        {/* Peak Hours */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Peak Order Hours</CardTitle>
            <CardDescription>Order distribution by hour (last 7 days)</CardDescription>
          </CardHeader>
          <CardContent>
            {hourlyOrders.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={hourlyOrders}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="hour" tick={{ fontSize: 10 }} tickFormatter={(h) => `${h}:00`} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value: unknown) => [String(value), "Orders"]}
                    labelFormatter={(h: unknown) => `${h}:00 — ${Number(h) + 1}:00`}
                    contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0" }}
                  />
                  <Bar dataKey="count" fill="#f97316" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground py-16 text-center">No hourly data yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ═══ Row 7: Vendor Health ═══ */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Top Vendors */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" /> Top Vendors by Sales
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topVendors.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={topVendors} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                  <YAxis dataKey="storeName" type="category" tick={{ fontSize: 11 }} width={90} />
                  <Tooltip
                    formatter={(value: unknown) => [formatCurrency(Number(value)), "Sales"]}
                    contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0" }}
                  />
                  <Bar dataKey="totalSales" fill="#10b981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">No vendor data</p>
            )}
          </CardContent>
        </Card>

        {/* High Refund Rate */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" /> High Refund Rate Vendors
            </CardTitle>
            <CardDescription>Vendors with &gt;10% refund/cancellation rate</CardDescription>
          </CardHeader>
          <CardContent>
            {highRefundVendors.length > 0 ? (
              <div className="space-y-2">
                {highRefundVendors.map((v) => (
                  <div key={v.sellerId} className="flex items-center gap-3 rounded-lg border border-red-100 bg-red-50/50 p-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{v.storeName || `Seller ${v.sellerId}`}</p>
                      <p className="text-xs text-slate-400">{formatCurrency(v.totalSales)} total sales</p>
                    </div>
                    <Badge className="bg-red-100 text-red-700 border-red-200">{v.refundRate?.toFixed(1)}%</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-emerald-600 py-8 text-center font-medium">All vendors healthy — no high refund rates</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
