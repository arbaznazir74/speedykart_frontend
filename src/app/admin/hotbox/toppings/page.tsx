"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/shared/status-badge";
import { PageHeader } from "@/components/shared/page-header";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api-client";
import { API_ENDPOINTS } from "@/lib/constants";
import { formatCurrency } from "@/lib/format";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Loader2, Plus, Pencil, Trash2, Search, Check, X, Eye, ChefHat,
} from "lucide-react";

/* ── Types ── */

interface Topping {
  id: number;
  name: string;
  price: number;
  image?: string;
  status: string;
  suggestedBySellerId: number | null;
  createdBy: string | null;
}

interface ProductToppingUsage {
  id: number;
  productId: number;
  toppingId: number;
  productName: string;
  sellerName: string;
  sellerId: number;
  price: number;
  isDefault: boolean;
}

interface SellerItem {
  id: number;
  name: string;
  businessName?: string;
}

export default function HotBoxToppingsPage() {
  /* ─── State ─── */
  const [toppings, setToppings] = useState<Topping[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  // Create/Edit
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Topping | null>(null);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Delete
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Usage detail
  const [usageTopping, setUsageTopping] = useState<Topping | null>(null);
  const [usageData, setUsageData] = useState<ProductToppingUsage[]>([]);
  const [usageLoading, setUsageLoading] = useState(false);

  // Pending approvals
  const [pendingToppings, setPendingToppings] = useState<Topping[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [approving, setApproving] = useState<number | null>(null);

  // Sellers map
  const [sellers, setSellers] = useState<SellerItem[]>([]);

  /* ─── Load Data ─── */
  const loadToppings = useCallback(async (p = 1) => {
    setLoading(true);
    const skip = (p - 1) * pageSize;
    try {
      const [listR, countR] = await Promise.all([
        apiGet<Topping[]>(`${API_ENDPOINTS.TOPPING}?skip=${skip}&top=${pageSize}`),
        apiGet<{ intResponse: number }>(`${API_ENDPOINTS.TOPPING}/count`),
      ]);
      setToppings(listR.successData ?? []);
      setTotal(countR.successData?.intResponse ?? 0);
      setPage(p);
    } catch { /* empty */ } finally { setLoading(false); }
  }, []);

  const loadPending = useCallback(async () => {
    setPendingLoading(true);
    try {
      const r = await apiGet<Topping[]>(`${API_ENDPOINTS.TOPPING}/pending`);
      setPendingToppings(r.successData ?? []);
    } catch { /* empty */ } finally { setPendingLoading(false); }
  }, []);

  useEffect(() => {
    loadToppings(1);
    loadPending();
    apiGet<SellerItem[]>(API_ENDPOINTS.SELLER, { skip: 0, top: 500 })
      .then((r) => setSellers(r.successData ?? [])).catch(() => {});
  }, [loadToppings, loadPending]);

  const sellerMap = Object.fromEntries(sellers.map((s) => [s.id, s.businessName || s.name]));

  /* ─── Create / Edit ─── */
  function openCreate() {
    setEditing(null);
    setFormData({ name: "", price: 0 });
    setFormError(null);
    setDialogOpen(true);
  }
  function openEdit(t: Topping) {
    setEditing(t);
    setFormData({ name: t.name, price: t.price });
    setFormError(null);
    setDialogOpen(true);
  }
  function handleField(key: string, value: unknown) {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSaving(true);
    try {
      if (editing) {
        const resp = await apiPut(`${API_ENDPOINTS.TOPPING}/${editing.id}`, formData);
        if (resp.isError) throw new Error(resp.errorData?.displayMessage ?? "Failed to update");
      } else {
        const resp = await apiPost(API_ENDPOINTS.TOPPING, formData);
        if (resp.isError) throw new Error(resp.errorData?.displayMessage ?? "Failed to create");
      }
      setDialogOpen(false);
      await loadToppings(page);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to save");
    } finally { setSaving(false); }
  }

  /* ─── Delete ─── */
  async function handleDelete() {
    if (deleteId === null) return;
    setDeleting(true);
    try {
      await apiDelete(`${API_ENDPOINTS.TOPPING}/${deleteId}`);
      setDeleteId(null);
      await loadToppings(page);
    } catch { /* empty */ } finally { setDeleting(false); }
  }

  /* ─── Usage ─── */
  async function openUsage(t: Topping) {
    setUsageTopping(t);
    setUsageLoading(true);
    try {
      const r = await apiGet<ProductToppingUsage[]>(`${API_ENDPOINTS.PRODUCT_TOPPING}/by-topping/${t.id}`);
      setUsageData(r.successData ?? []);
    } catch { setUsageData([]); } finally { setUsageLoading(false); }
  }

  /* ─── Pending Approval ─── */
  async function approveTopping(id: number) {
    setApproving(id);
    try {
      await apiPut(`${API_ENDPOINTS.TOPPING}/approve/${id}`, {});
      await Promise.all([loadToppings(page), loadPending()]);
    } catch { /* empty */ } finally { setApproving(null); }
  }
  async function rejectTopping(id: number) {
    setApproving(id);
    try {
      await apiPut(`${API_ENDPOINTS.TOPPING}/reject/${id}`, {});
      await loadPending();
    } catch { /* empty */ } finally { setApproving(null); }
  }

  /* ─── Filter ─── */
  const filtered = search
    ? toppings.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()))
    : toppings;

  const totalPages = Math.ceil(total / pageSize);

  /* ═══════════ RENDER ═══════════ */
  return (
    <div className="space-y-6">
      <PageHeader title="HotBox Toppings" description="Manage toppings — set default prices, see usage across products & sellers" actionLabel="Add Topping" onAction={openCreate}>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search..." className="pl-9 w-52" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </PageHeader>

      {/* Pending Approvals */}
      {pendingToppings.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50 shadow-sm">
          <CardContent className="py-4 space-y-3">
            <p className="text-sm font-semibold text-amber-800 flex items-center gap-2">
              <ChefHat className="h-4 w-4" /> Pending Seller Suggestions ({pendingToppings.length})
            </p>
            <div className="space-y-2">
              {pendingLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                pendingToppings.map((pt) => (
                  <div key={pt.id} className="flex items-center justify-between rounded-lg border border-amber-200 bg-white px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">{pt.name}</span>
                      {pt.suggestedBySellerId && (
                        <Badge variant="outline" className="text-xs">
                          by {sellerMap[pt.suggestedBySellerId] ?? `Seller #${pt.suggestedBySellerId}`}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button size="sm" variant="outline" className="h-7 text-xs text-green-700 border-green-300 hover:bg-green-50"
                        disabled={approving === pt.id} onClick={() => approveTopping(pt.id)}>
                        {approving === pt.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 mr-1" />}
                        Approve
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs text-red-700 border-red-300 hover:bg-red-50"
                        disabled={approving === pt.id} onClick={() => rejectTopping(pt.id)}>
                        <X className="h-3 w-3 mr-1" /> Reject
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Toppings Table */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4"><Search className="h-6 w-6 text-slate-400" /></div>
              <p className="text-base font-semibold text-slate-700">No toppings found</p>
              <p className="text-sm text-slate-400 mt-1">Create a topping or adjust your search</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">ID</TableHead>
                    <TableHead>Topping Name</TableHead>
                    <TableHead>Default Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="text-xs text-muted-foreground">{t.id}</TableCell>
                      <TableCell className="font-medium">{t.name}</TableCell>
                      <TableCell className="font-semibold">{formatCurrency(t.price ?? 0)}</TableCell>
                      <TableCell><StatusBadge status={t.status} /></TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {t.suggestedBySellerId
                          ? <Badge variant="outline" className="text-xs">Seller: {sellerMap[t.suggestedBySellerId] ?? `#${t.suggestedBySellerId}`}</Badge>
                          : <span className="text-xs">Admin</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="View usage" onClick={() => openUsage(t)}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(t)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(t.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => loadToppings(page - 1)}>Prev</Button>
          <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => loadToppings(page + 1)}>Next</Button>
        </div>
      )}

      {/* ── Create / Edit Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Topping" : "Create Topping"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">{formError}</div>
            )}
            <div className="space-y-2">
              <Label>Topping Name *</Label>
              <Input required placeholder="e.g. Extra Cheese" value={String(formData.name ?? "")} onChange={(e) => handleField("name", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Default Price *</Label>
              <Input type="number" step="0.01" required placeholder="0.00" value={String(formData.price ?? "")} onChange={(e) => handleField("price", Number(e.target.value))} />
              <p className="text-xs text-muted-foreground">This price is used by default when assigning to products. Admin can override per-product.</p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editing ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Usage Dialog ── */}
      <Dialog open={usageTopping !== null} onOpenChange={(o) => !o && setUsageTopping(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" /> Usage — &ldquo;{usageTopping?.name}&rdquo;
            </DialogTitle>
          </DialogHeader>
          {usageLoading ? (
            <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : usageData.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-slate-500">This topping is not assigned to any products yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Default price: <strong>{formatCurrency(usageTopping?.price ?? 0)}</strong> · Used in <strong>{usageData.length}</strong> product-seller assignment{usageData.length !== 1 ? "s" : ""}
              </p>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Seller</TableHead>
                      <TableHead>Assigned Price</TableHead>
                      <TableHead>Default?</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usageData.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium text-sm">{u.productName}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{u.sellerName ?? `#${u.sellerId}`}</Badge>
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold">{formatCurrency(u.price)}</span>
                          {u.price !== (usageTopping?.price ?? 0) && (
                            <Badge className="ml-2 bg-amber-100 text-amber-700 text-xs">overridden</Badge>
                          )}
                        </TableCell>
                        <TableCell>{u.isDefault ? <Badge className="bg-blue-100 text-blue-700 text-xs">Default</Badge> : "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm ── */}
      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete Topping"
        description="Are you sure? Toppings assigned to products cannot be deleted."
        confirmLabel="Delete"
        variant="destructive"
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
