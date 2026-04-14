"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api-client";
import { API_ENDPOINTS, PlatformType } from "@/lib/constants";
import { useAuth } from "@/context/auth-context";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Pencil, Trash2, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ProductTiming {
  id: number;
  sellerId: number;
  productId: number;
  categoryId: number;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  isActive: boolean;
  productName: string | null;
  categoryName: string | null;
}

interface ProductItem { id: number; name: string; categoryId: number; categoryName: string | null; }

const HOURS_12 = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const MINUTES = [0, 15, 30, 45];

function pad(n: number) { return n.toString().padStart(2, "0"); }

function formatTime(h: number, m: number) {
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${pad(m)} ${suffix}`;
}

function to12h(h24: number): { hour: string; period: string } {
  const period = h24 >= 12 ? "PM" : "AM";
  const hour = h24 === 0 ? 12 : h24 > 12 ? h24 - 12 : h24;
  return { hour: hour.toString(), period };
}

function to24h(hour: string, period: string): number {
  const h = Number(hour);
  if (period === "AM") return h === 12 ? 0 : h;
  return h === 12 ? 12 : h + 12;
}

export default function SellerProductTimingsPage() {
  const { user } = useAuth();
  const sellerId = user?.id ?? 0;

  const [timings, setTimings] = useState<ProductTiming[]>([]);
  const [loading, setLoading] = useState(true);

  const [products, setProducts] = useState<ProductItem[]>([]);

  const [formOpen, setFormOpen] = useState(false);
  const [editingTiming, setEditingTiming] = useState<ProductTiming | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [selCategoryName, setSelCategoryName] = useState("");
  const [selProductName, setSelProductName] = useState("");
  const [selStartHour, setSelStartHour] = useState("8");
  const [selStartPeriod, setSelStartPeriod] = useState("AM");
  const [selStartMinute, setSelStartMinute] = useState("0");
  const [selEndHour, setSelEndHour] = useState("4");
  const [selEndPeriod, setSelEndPeriod] = useState("PM");
  const [selEndMinute, setSelEndMinute] = useState("0");

  const [deleteTiming, setDeleteTiming] = useState<ProductTiming | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadTimings = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await apiGet<ProductTiming[]>(`${API_ENDPOINTS.PRODUCT_TIMING}/seller?skip=0&top=200`);
      setTimings(resp.successData ?? []);
    } catch { /* empty */ } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    loadTimings();
    apiGet<ProductItem[]>(`${API_ENDPOINTS.PRODUCT}/mine?platformType=${PlatformType.HotBox}&skip=0&top=500`)
      .then((r) => setProducts(r.successData ?? [])).catch(() => {});
  }, [loadTimings]);

  const categories = useMemo(() => {
    const map = new Map<number, string>();
    for (const p of products) {
      if (p.categoryId && !map.has(p.categoryId)) {
        map.set(p.categoryId, p.categoryName ?? `Category #${p.categoryId}`);
      }
    }
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [products]);

  const selectedCategory = categories.find(c => c.name === selCategoryName);
  const filteredProducts = selectedCategory
    ? products.filter((p) => p.categoryId === selectedCategory.id)
    : products;

  function openCreate() {
    setEditingTiming(null);
    setSelCategoryName("");
    setSelProductName("");
    setSelStartHour("8");
    setSelStartPeriod("AM");
    setSelStartMinute("0");
    setSelEndHour("4");
    setSelEndPeriod("PM");
    setSelEndMinute("0");
    setFormError(null);
    setFormOpen(true);
  }

  function openEdit(t: ProductTiming) {
    setEditingTiming(t);
    setSelCategoryName(t.categoryName ?? "");
    setSelProductName(t.productName ?? "");
    const s12 = to12h(t.startHour);
    setSelStartHour(s12.hour);
    setSelStartPeriod(s12.period);
    setSelStartMinute(t.startMinute.toString());
    const e12 = to12h(t.endHour);
    setSelEndHour(e12.hour);
    setSelEndPeriod(e12.period);
    setSelEndMinute(t.endMinute.toString());
    setFormError(null);
    setFormOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const selectedProduct = products.find(p => p.name === selProductName);
    const selectedCat = categories.find(c => c.name === selCategoryName);
    if (!selectedProduct || !selectedCat) {
      setFormError("Please select a category and product");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const payload = {
        productId: selectedProduct.id,
        categoryId: selectedCat.id,
        startHour: to24h(selStartHour, selStartPeriod),
        startMinute: Number(selStartMinute),
        endHour: to24h(selEndHour, selEndPeriod),
        endMinute: Number(selEndMinute),
        isActive: true,
      };
      if (editingTiming) {
        const resp = await apiPut<typeof payload, ProductTiming>(`${API_ENDPOINTS.PRODUCT_TIMING}/${editingTiming.id}`, payload);
        if (resp.isError) throw new Error(resp.errorData?.displayMessage ?? "Failed to update");
      } else {
        const resp = await apiPost<typeof payload, ProductTiming>(API_ENDPOINTS.PRODUCT_TIMING, payload);
        if (resp.isError) throw new Error(resp.errorData?.displayMessage ?? "Failed to create");
      }
      setFormOpen(false);
      await loadTimings();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to save");
    } finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!deleteTiming) return;
    setDeleting(true);
    try {
      await apiDelete(`${API_ENDPOINTS.PRODUCT_TIMING}/${deleteTiming.id}`);
      setDeleteTiming(null);
      await loadTimings();
    } catch { /* empty */ } finally { setDeleting(false); }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Product Timings" description="Set time-based availability for your HotBox products. Users will see products based on the current time slot.">
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" /> Add Timing
        </Button>
      </PageHeader>

      <Card className="border-0 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}</div>
          ) : timings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Clock className="h-12 w-12 text-slate-300 mb-3" />
              <p className="text-base font-semibold text-slate-700">No timings configured</p>
              <p className="text-sm text-slate-400 mt-1">Add your first product timing to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Start Time</TableHead>
                    <TableHead>End Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {timings.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="text-xs text-muted-foreground">{t.id}</TableCell>
                      <TableCell className="font-medium">{t.productName ?? `#${t.productId}`}</TableCell>
                      <TableCell className="text-muted-foreground">{t.categoryName ?? `#${t.categoryId}`}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs font-mono">
                          {formatTime(t.startHour, t.startMinute)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs font-mono">
                          {formatTime(t.endHour, t.endMinute)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {t.isActive ? (
                          <Badge className="bg-emerald-100 text-emerald-700 text-xs">Active</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(t)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/70 hover:text-destructive" onClick={() => setDeleteTiming(t)}>
                            <Trash2 className="h-4 w-4" />
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

      {/* Create / Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTiming ? "Edit Timing" : "Add Product Timing"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            {formError && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">{formError}</div>
            )}

            <div className="space-y-2">
              <Label>Category *</Label>
              <Select value={selCategoryName} onValueChange={(v) => { setSelCategoryName(v ?? ""); setSelProductName(""); }}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Product *</Label>
              <Select value={selProductName} onValueChange={(v) => setSelProductName(v ?? "")} disabled={!selCategoryName}>
                <SelectTrigger><SelectValue placeholder={selCategoryName ? "Select product" : "Select a category first"} /></SelectTrigger>
                <SelectContent>
                  {filteredProducts.map((p) => (
                    <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <div className="flex gap-1.5 items-center">
                  <Select value={selStartHour} onValueChange={(v) => setSelStartHour(v ?? "12")}>
                    <SelectTrigger className="w-[70px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {HOURS_12.map((h) => (
                        <SelectItem key={h} value={h.toString()}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-muted-foreground font-medium">:</span>
                  <Select value={selStartMinute} onValueChange={(v) => setSelStartMinute(v ?? "0")}>
                    <SelectTrigger className="w-[70px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MINUTES.map((m) => (
                        <SelectItem key={m} value={m.toString()}>{pad(m)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={selStartPeriod} onValueChange={(v) => setSelStartPeriod(v ?? "AM")}>
                    <SelectTrigger className="w-[72px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AM">AM</SelectItem>
                      <SelectItem value="PM">PM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>End Time</Label>
                <div className="flex gap-1.5 items-center">
                  <Select value={selEndHour} onValueChange={(v) => setSelEndHour(v ?? "12")}>
                    <SelectTrigger className="w-[70px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {HOURS_12.map((h) => (
                        <SelectItem key={h} value={h.toString()}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-muted-foreground font-medium">:</span>
                  <Select value={selEndMinute} onValueChange={(v) => setSelEndMinute(v ?? "0")}>
                    <SelectTrigger className="w-[70px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MINUTES.map((m) => (
                        <SelectItem key={m} value={m.toString()}>{pad(m)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={selEndPeriod} onValueChange={(v) => setSelEndPeriod(v ?? "AM")}>
                    <SelectTrigger className="w-[72px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AM">AM</SelectItem>
                      <SelectItem value="PM">PM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="rounded-md bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-700">
              Availability: <strong>{formatTime(to24h(selStartHour, selStartPeriod), Number(selStartMinute))}</strong> → <strong>{formatTime(to24h(selEndHour, selEndPeriod), Number(selEndMinute))}</strong>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingTiming ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteTiming !== null}
        onOpenChange={(o) => !o && setDeleteTiming(null)}
        title="Delete Timing"
        description={`Remove timing for "${deleteTiming?.productName}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
