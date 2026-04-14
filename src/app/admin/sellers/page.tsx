"use client";

import { useState, useEffect, useCallback, lazy, Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/shared/page-header";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { StatusBadge } from "@/components/shared/status-badge";
import { apiGet, apiPost, apiPut } from "@/lib/api-client";
import { API_ENDPOINTS } from "@/lib/constants";
import { formatCurrency } from "@/lib/format";
import {
  RefreshCw, CheckCircle2, XCircle, Eye, Clock, Store, MapPin, Plus, Loader2,
} from "lucide-react";
import { toast } from "sonner";

const MapPicker = lazy(() =>
  import("@/components/shared/map-picker").then((m) => ({ default: m.MapPicker }))
);

const PAGE_SIZE = 20;

interface Seller {
  id: number;
  name: string;
  username: string;
  storeName: string;
  email: string | null;
  mobile: string | null;
  balance: number;
  commission: number;
  city: string | null;
  state: string | null;
  latitude: number | null;
  longitude: number | null;
  storeDescription: string | null;
  pendingLatitude: number | null;
  pendingLongitude: number | null;
  locationStatus: number;
  status: string;
  loginStatus: string;
  remark: string | null;
}

type Tab = "all" | "pending" | "location";

export default function SellersPage() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<Tab>("all");
  const [items, setItems] = useState<Seller[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Seller | null>(null);
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "all");
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [acting, setActing] = useState(false);
  const [editingLocation, setEditingLocation] = useState(false);
  const [editLat, setEditLat] = useState<number | null>(null);
  const [editLng, setEditLng] = useState<number | null>(null);
  const [sellerHours, setSellerHours] = useState<{ dayOfWeek: number; openTime: string | null; closeTime: string | null; isClosed: boolean }[]>([]);
  const [hoursLoading, setHoursLoading] = useState(false);
  const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const formatTime = (t: string | null) => {
    if (!t) return "";
    const [h, m] = t.split(":");
    const hr = parseInt(h);
    return `${hr > 12 ? hr - 12 : hr || 12}:${m} ${hr >= 12 ? "PM" : "AM"}`;
  };

  // Add seller
  const [addOpen, setAddOpen] = useState(false);
  const emptySellerForm = {
    name: "", username: "", storeName: "", email: "", password: "", confirmPassword: "", mobile: "",
    city: "", state: "", storeDescription: "",
  };
  const [sellerForm, setSellerForm] = useState(emptySellerForm);
  const [newSellerLat, setNewSellerLat] = useState<number | null>(null);
  const [newSellerLng, setNewSellerLng] = useState<number | null>(null);
  const passwordsMatch = sellerForm.password === sellerForm.confirmPassword;
  const isSellerFormValid = sellerForm.name && sellerForm.username && sellerForm.storeName && sellerForm.email && sellerForm.password && sellerForm.confirmPassword && passwordsMatch && sellerForm.mobile;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const endpoint = tab === "pending" ? `${API_ENDPOINTS.SELLER}/pending`
        : tab === "location" ? `${API_ENDPOINTS.SELLER}/location/pending`
        : API_ENDPOINTS.SELLER;
      const countEndpoint = tab === "pending" ? `${API_ENDPOINTS.SELLER}/pending/count`
        : tab === "location" ? `${API_ENDPOINTS.SELLER}/location/pending/count`
        : `${API_ENDPOINTS.SELLER}/count`;
      const [listRes, countRes] = await Promise.all([
        apiGet<Seller[]>(`${endpoint}?skip=${page * PAGE_SIZE}&top=${PAGE_SIZE}`),
        apiGet<{ intResponse: number }>(countEndpoint),
      ]);
      setItems(listRes.successData ?? []);
      setTotal(countRes.successData?.intResponse ?? 0);
    } catch { /* ignore */ }
    setLoading(false);
  }, [tab, page]);

  useEffect(() => { setPage(0); }, [tab]);
  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleApprove(sellerId: number) {
    setActing(true);
    try {
      const resp = await apiPut<never, { boolResponse: boolean }>(`${API_ENDPOINTS.SELLER}/${sellerId}/approve`);
      if (resp.isError) {
        toast.error(resp.errorData?.displayMessage ?? "Failed to approve");
      } else {
        toast.success("Seller approved successfully! An email has been sent.");
        setSelected(null);
        fetchData();
      }
    } catch { toast.error("Error approving seller"); }
    setActing(false);
  }

  async function handleAdminSetLocation(sellerId: number) {
    if (editLat == null || editLng == null) {
      toast.warning("Please select a location on the map first.");
      return;
    }
    setActing(true);
    try {
      const resp = await apiPut<never, { boolResponse: boolean }>(
        `${API_ENDPOINTS.SELLER}/${sellerId}/location?latitude=${editLat}&longitude=${editLng}`
      );
      if (resp.isError) {
        toast.error(resp.errorData?.displayMessage ?? "Failed to update location");
      } else {
        toast.success("Seller location updated!");
        setSelected(null);
        setEditingLocation(false);
        setEditLat(null);
        setEditLng(null);
        fetchData();
      }
    } catch { toast.error("Error updating location"); }
    setActing(false);
  }

  async function handleApproveLocation(sellerId: number) {
    setActing(true);
    try {
      const resp = await apiPut<never, { boolResponse: boolean }>(`${API_ENDPOINTS.SELLER}/${sellerId}/location/approve`);
      if (resp.isError) {
        toast.error(resp.errorData?.displayMessage ?? "Failed");
      } else {
        toast.success("Location change approved!");
        fetchData();
      }
    } catch { toast.error("Error"); }
    setActing(false);
  }

  async function handleRejectLocation(sellerId: number) {
    setActing(true);
    try {
      const resp = await apiPut<never, { boolResponse: boolean }>(`${API_ENDPOINTS.SELLER}/${sellerId}/location/reject`);
      if (resp.isError) {
        toast.error(resp.errorData?.displayMessage ?? "Failed");
      } else {
        toast.success("Location change rejected.");
        fetchData();
      }
    } catch { toast.error("Error"); }
    setActing(false);
  }

  async function handleCreateSeller() {
    setActing(true);
    try {
      const { confirmPassword, ...rest } = sellerForm;
      const payload = { ...rest, latitude: newSellerLat, longitude: newSellerLng };
      const resp = await apiPost<typeof payload, { boolResponse: boolean }>(`${API_ENDPOINTS.SELLER}/admin-create`, payload);
      if (resp.isError) toast.error(resp.errorData?.displayMessage ?? "Failed to create seller");
      else {
        toast.success("Seller created successfully!");
        setAddOpen(false);
        setSellerForm(emptySellerForm);
        setNewSellerLat(null);
        setNewSellerLng(null);
        fetchData();
      }
    } catch { toast.error("Error creating seller"); }
    setActing(false);
  }

  async function handleReject(sellerId: number) {
    setActing(true);
    try {
      const reason = rejectReason.trim() || undefined;
      const url = reason
        ? `${API_ENDPOINTS.SELLER}/${sellerId}/reject?reason=${encodeURIComponent(reason)}`
        : `${API_ENDPOINTS.SELLER}/${sellerId}/reject`;
      const resp = await apiPut<never, { boolResponse: boolean }>(url);
      if (resp.isError) {
        toast.error(resp.errorData?.displayMessage ?? "Failed to reject");
      } else {
        toast.success("Seller rejected. An email has been sent.");
        setSelected(null);
        setShowReject(false);
        setRejectReason("");
        fetchData();
      }
    } catch { toast.error("Error rejecting seller"); }
    setActing(false);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Sellers" description="Manage all registered sellers">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Add Seller
          </Button>
        </div>
      </PageHeader>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        <Button variant={tab === "all" ? "default" : "outline"} size="sm" onClick={() => { setTab("all"); setStatusFilter("all"); }}>
          <Store className="h-4 w-4 mr-1.5" /> All Sellers
        </Button>
        <Button variant={tab === "pending" ? "default" : "outline"} size="sm" onClick={() => { setTab("pending"); setStatusFilter("all"); }}>
          <Clock className="h-4 w-4 mr-1.5" /> Pending Approval
        </Button>
        <Button variant={tab === "location" ? "default" : "outline"} size="sm" onClick={() => { setTab("location"); setStatusFilter("all"); }}>
          <MapPin className="h-4 w-4 mr-1.5" /> Location Requests
        </Button>
        {tab === "all" && (
          <div className="flex gap-1 rounded-lg bg-slate-100 p-0.5 ml-2">
            {["all", "active", "deactivated"].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-all capitalize ${
                  statusFilter === s
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">ID</TableHead>
                <TableHead>Store Name</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Mobile</TableHead>
                <TableHead>City</TableHead>
                {tab === "location" && <TableHead>Current Loc</TableHead>}
                {tab === "location" && <TableHead>Requested Loc</TableHead>}
                {tab === "all" && <TableHead>Balance</TableHead>}
                <TableHead>Status</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: tab === "all" ? 9 : 8 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (() => {
                const displayItems = tab === "all" && statusFilter !== "all"
                  ? items.filter((s) => s.status.toLowerCase() === statusFilter.toLowerCase())
                  : items;
                return displayItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={tab === "all" ? 9 : 8} className="text-center py-8 text-slate-500">
                    {tab === "pending" ? "No pending sellers" : "No sellers found"}
                  </TableCell>
                </TableRow>
              ) : (
                displayItems.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-xs">{s.id}</TableCell>
                    <TableCell className="font-medium">{s.storeName ?? "—"}</TableCell>
                    <TableCell>{s.name ?? "—"}</TableCell>
                    <TableCell className="text-sm">{s.email ?? "—"}</TableCell>
                    <TableCell className="text-sm">{s.mobile ?? "—"}</TableCell>
                    <TableCell className="text-sm">{s.city ?? "—"}</TableCell>
                    {tab === "location" && (
                      <TableCell className="text-xs font-mono">
                        {s.latitude && s.longitude ? `${Number(s.latitude).toFixed(4)}, ${Number(s.longitude).toFixed(4)}` : "—"}
                      </TableCell>
                    )}
                    {tab === "location" && (
                      <TableCell className="text-xs font-mono text-amber-600">
                        {s.pendingLatitude && s.pendingLongitude ? `${Number(s.pendingLatitude).toFixed(4)}, ${Number(s.pendingLongitude).toFixed(4)}` : "—"}
                      </TableCell>
                    )}
                    {tab === "all" && <TableCell>{formatCurrency(s.balance)}</TableCell>}
                    <TableCell><StatusBadge status={s.status} /></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => {
                          setSelected(s);
                          setSellerHours([]);
                          setHoursLoading(true);
                          apiGet<{ dayOfWeek: number; openTime: string | null; closeTime: string | null; isClosed: boolean }[]>(`${API_ENDPOINTS.STORE_HOURS}/${s.id}`)
                            .then((r) => setSellerHours(r.successData ?? []))
                            .catch(() => {})
                            .finally(() => setHoursLoading(false));
                        }}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {tab === "location" && s.locationStatus === 1 && (
                          <>
                            <Button variant="ghost" size="sm" className="text-emerald-600 hover:text-emerald-700" onClick={() => handleApproveLocation(s.id)} disabled={acting}>
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={() => handleRejectLocation(s.id)} disabled={acting}>
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {tab !== "location" && (s.status === "Pending" || s.status === "Unknown") && (
                          <>
                            <Button variant="ghost" size="sm" className="text-emerald-600 hover:text-emerald-700" onClick={() => handleApprove(s.id)} disabled={acting}>
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={() => { setSelected(s); setShowReject(true); }} disabled={acting}>
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              );
              })()}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <PaginationControls page={page + 1} pageSize={PAGE_SIZE} total={total} onPageChange={(p) => setPage(p - 1)} />

      {/* Seller Details Dialog */}
      <Dialog open={!!selected && !showReject} onOpenChange={(o) => { if (!o) { setSelected(null); setEditingLocation(false); setEditLat(null); setEditLng(null); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Seller Details</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-slate-500">Store:</span> <strong>{selected.storeName}</strong></div>
                <div><span className="text-slate-500">Owner:</span> <strong>{selected.name}</strong></div>
                <div><span className="text-slate-500">Username:</span> {selected.username}</div>
                <div><span className="text-slate-500">Email:</span> {selected.email ?? "—"}</div>
                <div><span className="text-slate-500">Mobile:</span> {selected.mobile ?? "—"}</div>
                <div><span className="text-slate-500">City:</span> {selected.city ?? "—"}, {selected.state ?? ""}</div>
                <div><span className="text-slate-500">Status:</span> <StatusBadge status={selected.status} /></div>
              </div>

              {/* Current Location */}
              <div className="rounded-lg border p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Current Location</p>
                  {!editingLocation && (
                    <Button variant="ghost" size="sm" className="h-6 text-xs text-indigo-600" onClick={() => {
                      setEditingLocation(true);
                      setEditLat(selected.latitude ? Number(selected.latitude) : null);
                      setEditLng(selected.longitude ? Number(selected.longitude) : null);
                    }}>
                      <MapPin className="h-3 w-3 mr-1" /> Edit
                    </Button>
                  )}
                </div>
                <p className="font-mono text-sm">
                  {selected.latitude && selected.longitude
                    ? `${Number(selected.latitude).toFixed(6)}, ${Number(selected.longitude).toFixed(6)}`
                    : "Not set"}
                </p>
              </div>

              {/* Edit Location Map */}
              {editingLocation && (
                <div className="space-y-3">
                  <Suspense fallback={<Skeleton className="h-[300px] w-full rounded-lg" />}>
                    <MapPicker
                      lat={selected.latitude ? Number(selected.latitude) : 34.0837}
                      lng={selected.longitude ? Number(selected.longitude) : 74.7973}
                      onLocationSelect={(lat, lng) => { setEditLat(lat); setEditLng(lng); }}
                      height="300px"
                    />
                  </Suspense>
                  {editLat != null && editLng != null && (
                    <p className="text-xs text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded font-mono">
                      New: {editLat.toFixed(6)}, {editLng.toFixed(6)}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => { setEditingLocation(false); setEditLat(null); setEditLng(null); }}>
                      Cancel
                    </Button>
                    <Button size="sm" onClick={() => handleAdminSetLocation(selected.id)} disabled={acting || editLat == null}>
                      {acting ? "Saving..." : "Save Location"}
                    </Button>
                  </div>
                </div>
              )}

              {/* Pending Location */}
              {selected.locationStatus === 1 && selected.pendingLatitude != null && selected.pendingLongitude != null && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-1">
                  <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide">Requested New Location</p>
                  <p className="font-mono text-sm text-amber-800">
                    {Number(selected.pendingLatitude).toFixed(6)}, {Number(selected.pendingLongitude).toFixed(6)}
                  </p>
                </div>
              )}

              {/* Store Hours */}
              <div className="rounded-lg border p-3 space-y-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Store Hours
                </p>
                {hoursLoading ? (
                  <div className="space-y-1">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-5 w-full" />)}</div>
                ) : sellerHours.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No store hours configured (always open)</p>
                ) : (
                  <div className="grid grid-cols-1 gap-0.5">
                    {DAY_NAMES.map((name, i) => {
                      const h = sellerHours.find((x) => x.dayOfWeek === i);
                      return (
                        <div key={i} className={`flex items-center justify-between py-1 px-2 rounded text-xs ${h?.isClosed ? "bg-red-50 text-red-500" : "bg-slate-50"}`}>
                          <span className="font-medium w-24">{name}</span>
                          <span>{!h ? "Not set" : h.isClosed ? "Closed" : (h.openTime === "00:00:00" && h.closeTime === "23:59:00") ? "24 Hours" : `${formatTime(h.openTime)} — ${formatTime(h.closeTime)}`}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {selected.storeDescription && <div><span className="text-slate-500">Description:</span> {selected.storeDescription}</div>}
              {selected.remark && <div><span className="text-slate-500">Remark:</span> {selected.remark}</div>}
            </div>
          )}
          <DialogFooter>
            {selected && selected.locationStatus === 1 && (
              <div className="flex gap-2 w-full">
                <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => { handleApproveLocation(selected.id); setSelected(null); }} disabled={acting}>
                  <CheckCircle2 className="mr-2 h-4 w-4" /> Approve Location
                </Button>
                <Button variant="destructive" className="flex-1" onClick={() => { handleRejectLocation(selected.id); setSelected(null); }} disabled={acting}>
                  <XCircle className="mr-2 h-4 w-4" /> Reject Location
                </Button>
              </div>
            )}
            {selected && (selected.status === "Pending" || selected.status === "Unknown") && (
              <div className="flex gap-2 w-full">
                <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => handleApprove(selected.id)} disabled={acting}>
                  <CheckCircle2 className="mr-2 h-4 w-4" /> Approve Seller
                </Button>
                <Button variant="destructive" className="flex-1" onClick={() => setShowReject(true)} disabled={acting}>
                  <XCircle className="mr-2 h-4 w-4" /> Reject Seller
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showReject} onOpenChange={(o) => { if (!o) { setShowReject(false); setRejectReason(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Seller</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              Are you sure you want to reject <strong>{selected?.storeName}</strong>? The seller will be notified by email.
            </p>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Reason (optional)</label>
              <Input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="e.g. Incomplete documents" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowReject(false); setRejectReason(""); }}>Cancel</Button>
            <Button variant="destructive" onClick={() => selected && handleReject(selected.id)} disabled={acting}>
              {acting ? "Rejecting..." : "Reject Seller"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Seller Dialog */}
      <Dialog open={addOpen} onOpenChange={(o) => { if (!o) { setSellerForm(emptySellerForm); setNewSellerLat(null); setNewSellerLng(null); } setAddOpen(o); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add Seller</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Store Info</p>
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Store Name *" value={sellerForm.storeName} onChange={(e) => setSellerForm({ ...sellerForm, storeName: e.target.value })} />
              <Input placeholder="Owner Name *" value={sellerForm.name} onChange={(e) => setSellerForm({ ...sellerForm, name: e.target.value })} />
              <Input placeholder="Username *" value={sellerForm.username} onChange={(e) => setSellerForm({ ...sellerForm, username: e.target.value })} />
              <Input placeholder="Email *" type="email" value={sellerForm.email} onChange={(e) => setSellerForm({ ...sellerForm, email: e.target.value })} />
              <Input placeholder="Password *" type="password" value={sellerForm.password} onChange={(e) => setSellerForm({ ...sellerForm, password: e.target.value })} />
              <div>
                <Input placeholder="Confirm Password *" type="password" value={sellerForm.confirmPassword} onChange={(e) => setSellerForm({ ...sellerForm, confirmPassword: e.target.value })} className={sellerForm.confirmPassword && !passwordsMatch ? "border-red-400 focus-visible:ring-red-400" : ""} />
                {sellerForm.confirmPassword && !passwordsMatch && (
                  <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                )}
              </div>
              <Input placeholder="Mobile *" value={sellerForm.mobile} onChange={(e) => setSellerForm({ ...sellerForm, mobile: e.target.value })} />
            </div>

            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide pt-2">Location</p>
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="City" value={sellerForm.city} onChange={(e) => setSellerForm({ ...sellerForm, city: e.target.value })} />
              <Input placeholder="State" value={sellerForm.state} onChange={(e) => setSellerForm({ ...sellerForm, state: e.target.value })} />
            </div>
            <div className="rounded-lg border p-3 space-y-2">
              <p className="text-xs font-semibold text-slate-500 flex items-center gap-1"><MapPin className="h-3 w-3" /> Store Location</p>
              <p className="text-xs text-slate-400">Click on the map to set the store location</p>
              <Suspense fallback={<Skeleton className="h-[250px] w-full rounded-lg" />}>
                <MapPicker
                  lat={newSellerLat ?? 34.0837}
                  lng={newSellerLng ?? 74.7973}
                  onLocationSelect={(lat, lng) => { setNewSellerLat(lat); setNewSellerLng(lng); }}
                  height="250px"
                />
              </Suspense>
              {newSellerLat != null && newSellerLng != null && (
                <p className="text-xs text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded font-mono">
                  Lat: {newSellerLat.toFixed(6)}, Lng: {newSellerLng.toFixed(6)}
                </p>
              )}
            </div>

            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide pt-2">Other <span className="text-slate-300 font-normal">(optional)</span></p>
            <Input placeholder="Store Description" value={sellerForm.storeDescription} onChange={(e) => setSellerForm({ ...sellerForm, storeDescription: e.target.value })} />
          </div>
          <DialogFooter>
            <Button onClick={handleCreateSeller} disabled={acting || !isSellerFormValid} className="w-full">
              {acting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              Create Seller
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
