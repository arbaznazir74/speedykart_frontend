"use client";

import { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
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
import { API_ENDPOINTS, PlatformType } from "@/lib/constants";
import { formatCurrency, getImageSrc } from "@/lib/format";
import { useAuth } from "@/context/auth-context";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Loader2, Plus, Pencil, Trash2, Search, ArrowLeft, X, Ruler, Package,
} from "lucide-react";

/* ── Types ── */

interface SellerProduct {
  id: number;
  name: string;
  slug: string;
  sellerId: number;
  categoryId: number;
  categoryName: string | null;
  brandId: number;
  brandName: string | null;
  taxPercentage: number | null;
  description: string | null;
}
interface LookupItem { id: number; name: string; }
interface UnitItem { id: number; name: string; shortCode: string; parentId: number | null; conversion: number | null; }
interface ProductUnitItem { id: number; productVariantId: number; unitId: number; unitName: string | null; quantity: number; }

interface ProductVariant {
  id: number;
  productId: number;
  name: string;
  price: number;
  discountedPrice: number;
  stock: number;
  totalAllowedQuantity: number;
  isCodAllowed: boolean;
  status: string;
  indicator: string;
  description: string | null;
  imageBase64: string | null;
  unitName?: string | null;
  unitId?: number | null;
  unitQuantity?: number;
  productUnitId?: number;
}

/* ── Page ── */

function SellerSpeedyMartProductsPageContent() {
  const { user } = useAuth();
  const sellerId = user?.id ?? 0;
  const searchParams = useSearchParams();

  const [products, setProducts] = useState<SellerProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">(searchParams.get("status") === "active" ? "active" : "all");
  const [productStatuses, setProductStatuses] = useState<Record<number, string[]>>({});

  const [categories, setCategories] = useState<LookupItem[]>([]);
  const [brands, setBrands] = useState<LookupItem[]>([]);

  /* ─── Create Dialog ─── */
  const [createOpen, setCreateOpen] = useState(false);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [hasVariants, setHasVariants] = useState(true);
  const [inlineVariant, setInlineVariant] = useState<Record<string, unknown>>({});

  /* ─── Manage (detail view) ─── */
  const [managingProduct, setManagingProduct] = useState<SellerProduct | null>(null);
  const [editFormData, setEditFormData] = useState<Record<string, unknown>>({});
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  /* ─── Variants ─── */
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [variantsLoading, setVariantsLoading] = useState(false);
  const [variantDialog, setVariantDialog] = useState(false);
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null);
  const [variantForm, setVariantForm] = useState<Record<string, unknown>>({});
  const [variantSaving, setVariantSaving] = useState(false);
  const [variantError, setVariantError] = useState<string | null>(null);
  const [deleteVariantId, setDeleteVariantId] = useState<number | null>(null);
  const [deletingVariant, setDeletingVariant] = useState(false);
  const [singleVariantForm, setSingleVariantForm] = useState<Record<string, unknown>>({});
  const [singleVariantError, setSingleVariantError] = useState<string | null>(null);

  /* ─── Units ─── */
  const [units, setUnits] = useState<UnitItem[]>([]);
  const [newUnitOpen, setNewUnitOpen] = useState(false);
  const [newUnitName, setNewUnitName] = useState("");
  const [newUnitShortCode, setNewUnitShortCode] = useState("");
  const [newUnitSaving, setNewUnitSaving] = useState(false);

  /* ─── Delete ─── */
  const [deleteProduct, setDeleteProduct] = useState<SellerProduct | null>(null);
  const [deleting, setDeleting] = useState(false);

  /* ═══════════ Data Loading ═══════════ */

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await apiGet<SellerProduct[]>(`${API_ENDPOINTS.PRODUCT}/mine?platformType=${PlatformType.SpeedyMart}&skip=0&top=500`);
      setProducts(resp.successData ?? []);
    } catch { /* empty */ } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    loadProducts();
    apiGet<LookupItem[]>(`${API_ENDPOINTS.CATEGORY}/parent/seller?platform=2&sellerId=${sellerId}&skip=0&top=200`)
      .then((r) => setCategories(r.successData ?? [])).catch(() => {});
    apiGet<LookupItem[]>(API_ENDPOINTS.BRAND, { top: 200 })
      .then((r) => setBrands(r.successData ?? [])).catch(() => {});
    apiGet<UnitItem[]>(`${API_ENDPOINTS.UNIT}/mine?skip=0&top=200`)
      .then((r) => setUnits(r.successData ?? [])).catch(() => {});
    // Load all variant statuses for filtering
    apiGet<ProductVariant[]>(`${API_ENDPOINTS.PRODUCT_VARIANT}/mine?skip=0&top=2000`)
      .then((r) => {
        const map: Record<number, string[]> = {};
        for (const v of r.successData ?? []) {
          if (!map[v.productId]) map[v.productId] = [];
          map[v.productId].push(v.status);
        }
        setProductStatuses(map);
      }).catch(() => {});
  }, [loadProducts, sellerId]);

  const filtered = useMemo(() => {
    let result = products;
    if (search) result = result.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));
    if (statusFilter === "active") result = result.filter((p) => (productStatuses[p.id] ?? []).some((s) => s === "Active"));
    else if (statusFilter === "inactive") result = result.filter((p) => !(productStatuses[p.id] ?? []).some((s) => s === "Active"));
    return result;
  }, [products, search, statusFilter, productStatuses]);

  /* ═══════════ Create Product ═══════════ */

  function handleField(key: string, value: unknown) { setFormData((prev) => ({ ...prev, [key]: value })); }
  function handleInlineField(key: string, value: unknown) { setInlineVariant((prev) => ({ ...prev, [key]: value })); }

  function openCreate() {
    setFormData({}); setFormError(null);
    setHasVariants(true); setInlineVariant({});
    setCreateOpen(true);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); setFormError(null); setSaving(true);
    try {
      if (!hasVariants && (!inlineVariant.price || Number(inlineVariant.price) <= 0)) throw new Error("Price is required");
      if (!hasVariants && Number(inlineVariant.discountedPrice) > 0 && Number(inlineVariant.discountedPrice) >= Number(inlineVariant.price)) throw new Error("Offer Price must be less than Price");
      const resp = await apiPost<unknown, SellerProduct>(`${API_ENDPOINTS.PRODUCT}/mine`, {
        ...formData, platformType: PlatformType.SpeedyMart,
      });
      if (resp.isError) throw new Error(resp.errorData?.displayMessage ?? "Failed to create");
      const createdProduct = resp.successData;
      if (!hasVariants && createdProduct) {
        const vr = await apiPost<unknown, { id: number }>(`${API_ENDPOINTS.PRODUCT_VARIANT}/mine`, {
          productId: createdProduct.id, name: createdProduct.name,
          price: Number(inlineVariant.price) || 0, discountedPrice: Number(inlineVariant.discountedPrice) || 0,
          stock: Number(inlineVariant.stock) || 0, totalAllowedQuantity: Number(inlineVariant.totalAllowedQuantity) || 0,
          isCodAllowed: inlineVariant.isCodAllowed ?? true,
          description: inlineVariant.description ?? "",
          imageBase64: inlineVariant.imageBase64 ?? "", platformType: PlatformType.SpeedyMart,
        });
        const createdVariantId = vr.successData?.id;
        if (createdVariantId && inlineVariant.unitId && Number(inlineVariant.unitId) > 0) {
          await apiPost(API_ENDPOINTS.PRODUCT_UNIT, { productVariantId: createdVariantId, unitId: Number(inlineVariant.unitId), quantity: Number(inlineVariant.unitQuantity) || 1 }).catch(() => {});
        }
      }
      setCreateOpen(false); await loadProducts();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to save");
    } finally { setSaving(false); }
  }

  /* ═══════════ Delete Product ═══════════ */

  async function handleDeleteProduct() {
    if (!deleteProduct) return;
    setDeleting(true);
    try {
      const vResp = await apiGet<ProductVariant[]>(`${API_ENDPOINTS.PRODUCT_VARIANT}/mine/products/${deleteProduct.id}?skip=0&top=100`);
      for (const v of vResp.successData ?? []) { await apiDelete(`${API_ENDPOINTS.PRODUCT_VARIANT}/mine/${v.id}`); }
      await apiDelete(`${API_ENDPOINTS.PRODUCT}/mine/${deleteProduct.id}`);
      setDeleteProduct(null); await loadProducts();
    } catch { /* empty */ } finally { setDeleting(false); }
  }

  /* ═══════════ Manage Product (Detail View) ═══════════ */

  function openManage(p: SellerProduct) {
    setManagingProduct(p);
    setEditFormData({ name: p.name, slug: p.slug, categoryId: p.categoryId, brandId: p.brandId, description: p.description ?? "", taxPercentage: p.taxPercentage ?? 0 });
    setEditError(null);
    loadVariants(p.id);
  }
  function closeManage() { setManagingProduct(null); setVariants([]); }

  async function handleSaveAll() {
    if (!managingProduct) return;
    setEditSaving(true); setEditError(null); setSingleVariantError(null);
    try {
      const payload = { ...editFormData, platformType: PlatformType.SpeedyMart };
      const resp = await apiPut(`${API_ENDPOINTS.PRODUCT}/mine?id=${managingProduct.id}`, payload);
      if (resp.isError) throw new Error(resp.errorData?.displayMessage ?? "Failed to update product info");
      if (variants.length === 1) {
        const sv = variants[0];
        if (Number(singleVariantForm.discountedPrice) > 0 && Number(singleVariantForm.discountedPrice) >= Number(singleVariantForm.price)) throw new Error("Offer Price must be less than Price");
        const { unitId: selUnitId, unitQuantity: selQty, ...rest } = singleVariantForm as Record<string, unknown>;
        const vPayload = { ...rest, productId: sv.productId, platformType: PlatformType.SpeedyMart };
        const r = await apiPut(`${API_ENDPOINTS.PRODUCT_VARIANT}/mine?id=${sv.id}`, vPayload);
        if (r.isError) throw new Error(r.errorData?.displayMessage ?? "Failed to update variant");
        if (selUnitId && Number(selUnitId) > 0) {
          if (sv.productUnitId) { await apiDelete(`${API_ENDPOINTS.PRODUCT_UNIT}/${sv.productUnitId}`).catch(() => {}); }
          await apiPost(API_ENDPOINTS.PRODUCT_UNIT, { productVariantId: sv.id, unitId: Number(selUnitId), quantity: Number(selQty) || 1 }).catch(() => {});
        }
      }
      await loadProducts();
      const freshResp = await apiGet<SellerProduct[]>(`${API_ENDPOINTS.PRODUCT}/mine?platformType=${PlatformType.SpeedyMart}&skip=0&top=500`);
      const fresh = (freshResp.successData ?? []).find((p) => p.id === managingProduct.id);
      if (fresh) setManagingProduct(fresh);
      await loadVariants(managingProduct.id);
      const { toast: t } = await import("sonner"); t.success("All changes saved!");
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : "Failed to save");
    } finally { setEditSaving(false); }
  }

  /* ═══════════ Variants ═══════════ */

  const loadVariants = useCallback(async (productId: number) => {
    setVariantsLoading(true);
    try {
      const r = await apiGet<ProductVariant[]>(`${API_ENDPOINTS.PRODUCT_VARIANT}/mine/products/${productId}?skip=0&top=100`);
      const vList = r.successData ?? [];
      const enriched = await Promise.all(vList.map(async (v) => {
        try {
          const pu = await apiGet<ProductUnitItem>(`${API_ENDPOINTS.PRODUCT_UNIT}/variant/${v.id}`);
          if (pu.successData) return { ...v, unitName: pu.successData.unitName, unitId: pu.successData.unitId, unitQuantity: pu.successData.quantity, productUnitId: pu.successData.id };
        } catch { /* no unit */ }
        return v;
      }));
      setVariants(enriched);
      if (enriched.length === 1) {
        const sv = enriched[0];
        setSingleVariantForm({ name: sv.name, indicator: sv.indicator, price: sv.price, discountedPrice: sv.discountedPrice || 0, stock: sv.stock, totalAllowedQuantity: sv.totalAllowedQuantity || 0, isCodAllowed: sv.isCodAllowed ?? true, description: sv.description ?? "", imageBase64: sv.imageBase64 ?? "", unitId: sv.unitId ?? "", unitQuantity: sv.unitQuantity ?? 1 });
        setSingleVariantError(null);
      }
    } catch { setVariants([]); } finally { setVariantsLoading(false); }
  }, []);

  function handleVField(key: string, value: unknown) { setVariantForm((prev) => ({ ...prev, [key]: value })); }
  function handleSVField(key: string, value: unknown) { setSingleVariantForm((prev) => ({ ...prev, [key]: value })); }

  function openCreateVariant() {
    if (!managingProduct) return;
    setEditingVariant(null); setVariantForm({ productId: managingProduct.id }); setVariantError(null); setVariantDialog(true);
  }
  function openEditVariant(v: ProductVariant) {
    setEditingVariant(v);
    setVariantForm({ productId: v.productId, name: v.name, price: v.price, discountedPrice: v.discountedPrice || 0, stock: v.stock, totalAllowedQuantity: v.totalAllowedQuantity || 0, isCodAllowed: v.isCodAllowed ?? true, description: v.description ?? "", imageBase64: v.imageBase64 ?? "", unitId: v.unitId ?? "", unitQuantity: v.unitQuantity ?? 1 });
    setVariantError(null); setVariantDialog(true);
  }

  async function handleVariantSubmit(e: React.FormEvent) {
    e.preventDefault(); if (!managingProduct) return;
    setVariantSaving(true); setVariantError(null);
    try {
      if (Number(variantForm.discountedPrice) > 0 && Number(variantForm.discountedPrice) >= Number(variantForm.price)) throw new Error("Offer Price must be less than Price");
      const { unitId: selUnitId, unitQuantity: selQty, ...rest } = variantForm as Record<string, unknown>;
      const payload = { ...rest, platformType: PlatformType.SpeedyMart };
      let variantId: number | null = null;
      if (editingVariant) {
        const r = await apiPut(`${API_ENDPOINTS.PRODUCT_VARIANT}/mine?id=${editingVariant.id}`, payload);
        if (r.isError) throw new Error(r.errorData?.displayMessage ?? "Failed");
        variantId = editingVariant.id;
      } else {
        const r = await apiPost<unknown, { id: number }>(`${API_ENDPOINTS.PRODUCT_VARIANT}/mine`, payload);
        if (r.isError) throw new Error(r.errorData?.displayMessage ?? "Failed");
        variantId = r.successData?.id ?? null;
      }
      if (variantId && selUnitId && Number(selUnitId) > 0) {
        if (editingVariant?.productUnitId) { await apiDelete(`${API_ENDPOINTS.PRODUCT_UNIT}/${editingVariant.productUnitId}`).catch(() => {}); }
        await apiPost(API_ENDPOINTS.PRODUCT_UNIT, { productVariantId: variantId, unitId: Number(selUnitId), quantity: Number(selQty) || 1 }).catch(() => {});
      }
      setVariantDialog(false); await loadVariants(managingProduct.id);
    } catch (err: unknown) { setVariantError(err instanceof Error ? err.message : "Failed"); } finally { setVariantSaving(false); }
  }

  async function handleDeleteVariant() {
    if (deleteVariantId === null || !managingProduct) return;
    setDeletingVariant(true);
    try { await apiDelete(`${API_ENDPOINTS.PRODUCT_VARIANT}/mine/${deleteVariantId}`); setDeleteVariantId(null); await loadVariants(managingProduct.id); }
    catch { /* empty */ } finally { setDeletingVariant(false); }
  }

  async function handleCreateUnit() {
    if (!newUnitName.trim() || !newUnitShortCode.trim()) return;
    setNewUnitSaving(true);
    try {
      const r = await apiPost<unknown, { boolResponse: boolean }>(`${API_ENDPOINTS.UNIT}/mine`, { name: newUnitName.trim(), shortCode: newUnitShortCode.trim() });
      if (r.isError) throw new Error(r.errorData?.displayMessage ?? "Failed");
      const refreshed = await apiGet<UnitItem[]>(`${API_ENDPOINTS.UNIT}/mine?skip=0&top=200`);
      setUnits(refreshed.successData ?? []);
      setNewUnitOpen(false); setNewUnitName(""); setNewUnitShortCode("");
    } catch { /* empty */ } finally { setNewUnitSaving(false); }
  }

  /* ═══════════ RENDER ═══════════ */

  if (managingProduct) {
    const lowestPrice = variants.length > 0 ? Math.min(...variants.map((v) => v.price)) : null;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-slate-100" onClick={closeManage}><ArrowLeft className="h-4 w-4" /></Button>
            <div>
              <h1 className="text-xl font-bold tracking-tight">{managingProduct.name}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant="outline" className="text-xs font-normal">{managingProduct.categoryName ?? "—"}</Badge>
                {managingProduct.brandName && <Badge variant="secondary" className="text-xs">{managingProduct.brandName}</Badge>}
                {lowestPrice !== null && <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-medium">From {formatCurrency(lowestPrice)}</Badge>}
                <Badge variant="secondary" className="text-xs">{variants.length} variant{variants.length !== 1 ? "s" : ""}</Badge>
              </div>
            </div>
          </div>
          <Button size="sm" onClick={handleSaveAll} disabled={editSaving} className="px-5">
            {editSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Changes
          </Button>
        </div>

        {editError && <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">{editError}</div>}
        {singleVariantError && <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">{singleVariantError}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 space-y-6">
            <Card className="border shadow-none">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center gap-2 pb-1 border-b">
                  <Pencil className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold">Product Info</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Name</Label>
                    <Input className="h-9" value={String(editFormData.name ?? "")} onChange={(e) => { const name = e.target.value; setEditFormData((p) => ({ ...p, name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") })); }} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Category</Label>
                    <select className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm" value={String(editFormData.categoryId ?? "")} onChange={(e) => setEditFormData((p) => ({ ...p, categoryId: Number(e.target.value) }))}>
                      {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Brand</Label>
                    <select className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm" value={String(editFormData.brandId ?? "")} onChange={(e) => setEditFormData((p) => ({ ...p, brandId: Number(e.target.value) }))}>
                      <option value="">No brand</option>
                      {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Tax %</Label>
                    <Input className="h-9" type="number" step="0.01" value={String(editFormData.taxPercentage ?? "")} onChange={(e) => setEditFormData((p) => ({ ...p, taxPercentage: Number(e.target.value) }))} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border shadow-none overflow-hidden">
              <CardContent className="p-0">
                {variantsLoading ? (
                  <div className="p-5 space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}</div>
                ) : variants.length === 0 ? (
                  <div className="py-14 text-center">
                    <Package className="h-8 w-8 mx-auto text-slate-300 mb-3" />
                    <p className="text-sm font-medium text-slate-600">No variants yet</p>
                    <p className="text-xs text-slate-400 mt-1 mb-4">Add variants with prices and stock</p>
                    <Button size="sm" onClick={openCreateVariant}><Plus className="h-4 w-4 mr-1" /> Add Variant</Button>
                  </div>
                ) : variants.length === 1 ? (
                  <div className="p-5 space-y-4">
                    <div className="flex items-center gap-2 pb-1 border-b">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <h3 className="text-sm font-semibold">Pricing & Details</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Price *</Label><Input className="h-9" type="number" step="0.01" placeholder="0.00" value={String(singleVariantForm.price ?? "")} onChange={(e) => handleSVField("price", Number(e.target.value))} /></div>
                      <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Offer Price</Label><Input className="h-9" type="number" step="0.01" placeholder="0.00" value={String(singleVariantForm.discountedPrice ?? "")} onChange={(e) => handleSVField("discountedPrice", Number(e.target.value))} />{Number(singleVariantForm.discountedPrice) > 0 && Number(singleVariantForm.discountedPrice) >= Number(singleVariantForm.price) && <p className="text-xs text-destructive">Must be less than price</p>}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Stock</Label><Input className="h-9" type="number" placeholder="0" value={String(singleVariantForm.stock ?? "")} disabled title="Manage stock from Inventory page" /></div>
                      <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Max Allowed Qty</Label><Input className="h-9" type="number" placeholder="e.g. 5" value={String(singleVariantForm.totalAllowedQuantity ?? "")} onChange={(e) => handleSVField("totalAllowedQuantity", Number(e.target.value))} /></div>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-muted/40 p-3">
                      <div><p className="text-sm font-medium">Cash on Delivery</p><p className="text-xs text-muted-foreground">Allow COD for this product</p></div>
                      <button type="button" role="switch" aria-checked={!!singleVariantForm.isCodAllowed} className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${singleVariantForm.isCodAllowed ? "bg-primary" : "bg-slate-200"}`} onClick={() => handleSVField("isCodAllowed", !singleVariantForm.isCodAllowed)}>
                        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${singleVariantForm.isCodAllowed ? "translate-x-5" : "translate-x-0"}`} />
                      </button>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1.5"><Ruler className="h-3 w-3" /> Unit</Label>
                      <div className="flex items-center gap-2">
                        <select className="flex h-9 flex-1 rounded-md border border-input bg-background px-3 py-1 text-sm" value={String(singleVariantForm.unitId ?? "")} onChange={(e) => handleSVField("unitId", e.target.value ? Number(e.target.value) : "")}>
                          <option value="">No unit</option>
                          {units.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.shortCode})</option>)}
                        </select>
                        <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => { setNewUnitOpen(true); setNewUnitName(""); setNewUnitShortCode(""); }}><Plus className="h-3.5 w-3.5" /></Button>
                      </div>
                      {Number(singleVariantForm.unitId) > 0 && (
                        <Input type="number" step="0.01" min="0" placeholder="Quantity" className="h-9 mt-1" value={String(singleVariantForm.unitQuantity ?? "")} onChange={(e) => handleSVField("unitQuantity", Number(e.target.value))} />
                      )}
                    </div>
                    <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Description</Label>
                      <textarea className="flex min-h-[56px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground" placeholder="Brief description" value={String(singleVariantForm.description ?? "")} onChange={(e) => handleSVField("description", e.target.value)} />
                    </div>
                    <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Image</Label>
                      <input type="file" accept="image/*" className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium cursor-pointer"
                        onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => { const s = rd.result as string; handleSVField("imageBase64", s.includes(",") ? s.split(",")[1] : s); }; rd.readAsDataURL(f); }} />
                      {singleVariantForm.imageBase64 ? (<div className="flex items-center gap-3 mt-2"><img src={getImageSrc(String(singleVariantForm.imageBase64 ?? ""))} alt="" className="h-14 w-14 rounded-lg object-cover border" /><Button type="button" variant="ghost" size="sm" className="text-destructive text-xs h-7" onClick={() => handleSVField("imageBase64", "")}>Remove</Button></div>) : null}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between px-5 py-3 border-b">
                      <h3 className="text-sm font-semibold flex items-center gap-2"><Package className="h-4 w-4 text-muted-foreground" /> Variants</h3>
                      <Button size="sm" className="h-7 text-xs" onClick={openCreateVariant}><Plus className="h-3.5 w-3.5 mr-1" /> Add</Button>
                    </div>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader><TableRow>
                          <TableHead className="w-12 pl-5">ID</TableHead><TableHead>Name</TableHead><TableHead>Unit</TableHead>
                          <TableHead>Price</TableHead><TableHead>Offer</TableHead><TableHead>Stock</TableHead>
                          <TableHead>Status</TableHead><TableHead className="text-right pr-5">Actions</TableHead>
                        </TableRow></TableHeader>
                        <TableBody>
                          {variants.map((v) => (
                            <TableRow key={v.id}>
                              <TableCell className="text-xs text-muted-foreground pl-5">{v.id}</TableCell>
                              <TableCell className="font-medium text-sm">{v.name}</TableCell>
                              <TableCell className="text-sm">{v.unitName ? <Badge variant="outline" className="text-xs"><Ruler className="h-3 w-3 mr-1" />{v.unitName}</Badge> : <span className="text-muted-foreground text-xs">—</span>}</TableCell>
                              <TableCell className="font-semibold">{formatCurrency(v.price)}</TableCell>
                              <TableCell>{v.discountedPrice ? formatCurrency(v.discountedPrice) : "—"}</TableCell>
                              <TableCell>{v.stock}</TableCell>
                              <TableCell><StatusBadge status={v.status} /></TableCell>
                              <TableCell className="text-right pr-5">
                                <div className="flex items-center justify-end gap-1">
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditVariant(v)}><Pencil className="h-3 w-3" /></Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteVariantId(v.id)}><Trash2 className="h-3 w-3" /></Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2 space-y-6">
            {variants.length === 1 && (
              <Button size="sm" variant="outline" className="w-full" onClick={openCreateVariant}><Plus className="h-3.5 w-3.5 mr-1" /> Add Another Variant</Button>
            )}
          </div>
        </div>

        <Dialog open={variantDialog} onOpenChange={setVariantDialog}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editingVariant ? "Edit Variant" : "Add Variant"}</DialogTitle></DialogHeader>
            <form onSubmit={handleVariantSubmit} className="space-y-4">
              {variantError && <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">{variantError}</div>}
              <div className="space-y-2"><Label>Variant Name *</Label><Input required placeholder="e.g. 500g, 1kg" value={String(variantForm.name ?? "")} onChange={(e) => handleVField("name", e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Price *</Label><Input type="number" step="0.01" required placeholder="0.00" value={String(variantForm.price ?? "")} onChange={(e) => handleVField("price", Number(e.target.value))} /></div>
                <div className="space-y-2"><Label>Offer Price</Label><Input type="number" step="0.01" placeholder="0.00" value={String(variantForm.discountedPrice ?? "")} onChange={(e) => handleVField("discountedPrice", Number(e.target.value))} />{Number(variantForm.discountedPrice) > 0 && Number(variantForm.discountedPrice) >= Number(variantForm.price) && <p className="text-xs text-destructive">Must be less than price</p>}</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Stock</Label><Input type="number" placeholder="0" value={String(variantForm.stock ?? "")} onChange={(e) => handleVField("stock", Number(e.target.value))} disabled={!!editingVariant} title={editingVariant ? "Manage stock from Inventory page" : ""} /></div>
                <div className="space-y-2"><Label>Max Allowed Qty</Label><Input type="number" placeholder="e.g. 5" value={String(variantForm.totalAllowedQuantity ?? "")} onChange={(e) => handleVField("totalAllowedQuantity", Number(e.target.value))} /></div>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div><p className="text-sm font-medium">Cash on Delivery</p><p className="text-xs text-muted-foreground">Allow COD</p></div>
                <button type="button" role="switch" aria-checked={!!variantForm.isCodAllowed} className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${variantForm.isCodAllowed ? "bg-primary" : "bg-slate-200"}`} onClick={() => handleVField("isCodAllowed", !variantForm.isCodAllowed)}>
                  <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${variantForm.isCodAllowed ? "translate-x-5" : "translate-x-0"}`} />
                </button>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5"><Ruler className="h-3.5 w-3.5" /> Unit</Label>
                <div className="flex items-center gap-2">
                  <select className="flex h-10 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm" value={String(variantForm.unitId ?? "")} onChange={(e) => handleVField("unitId", e.target.value ? Number(e.target.value) : "")}>
                    <option value="">No unit</option>
                    {units.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.shortCode})</option>)}
                  </select>
                  <Button type="button" variant="outline" size="icon" className="h-10 w-10 shrink-0" onClick={() => { setNewUnitOpen(true); setNewUnitName(""); setNewUnitShortCode(""); }}><Plus className="h-4 w-4" /></Button>
                </div>
                {Number(variantForm.unitId) > 0 && (
                  <div className="space-y-1"><Label className="text-xs text-muted-foreground">Quantity</Label><Input type="number" step="0.01" min="0" placeholder="1" className="h-9" value={String(variantForm.unitQuantity ?? "")} onChange={(e) => handleVField("unitQuantity", Number(e.target.value))} /></div>
                )}
              </div>
              <div className="space-y-2"><Label>Description</Label>
                <textarea className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder="Brief description" value={String(variantForm.description ?? "")} onChange={(e) => handleVField("description", e.target.value)} />
              </div>
              <div className="space-y-2"><Label>Image</Label>
                <input type="file" accept="image/*" className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium cursor-pointer"
                  onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = () => { const s = r.result as string; handleVField("imageBase64", s.includes(",") ? s.split(",")[1] : s); }; r.readAsDataURL(f); }} />
                {variantForm.imageBase64 ? (<div className="flex items-center gap-3 mt-2"><img src={getImageSrc(String(variantForm.imageBase64 ?? ""))} alt="" className="h-16 w-16 rounded-md object-cover border" /><Button type="button" variant="ghost" size="sm" className="text-destructive text-xs" onClick={() => handleVField("imageBase64", "")}>Remove</Button></div>) : null}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setVariantDialog(false)}>Cancel</Button>
                <Button type="submit" disabled={variantSaving}>{variantSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{editingVariant ? "Update" : "Create"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <ConfirmDialog open={deleteVariantId !== null} onOpenChange={(o) => !o && setDeleteVariantId(null)} title="Delete Variant" description="This will remove this variant permanently." confirmLabel="Delete" variant="destructive" loading={deletingVariant} onConfirm={handleDeleteVariant} />
      </div>
    );
  }

  /* ─── MAIN LIST VIEW ─── */
  return (
    <div className="space-y-6">
      <PageHeader title="My SpeedyMart Products" description="Manage your grocery & mart products" actionLabel="Add Product" onAction={openCreate}>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 rounded-lg bg-slate-100 p-0.5">
            {(["all", "active", "inactive"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setStatusFilter(v)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-all capitalize ${
                  statusFilter === v
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search..." className="pl-9 w-52" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
      </PageHeader>

      <Card className="border-0 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4"><Search className="h-6 w-6 text-slate-400" /></div>
              <p className="text-base font-semibold text-slate-700">No products found</p>
              <p className="text-sm text-slate-400 mt-1">Create a product or adjust your search</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead className="w-12">ID</TableHead><TableHead>Product Name</TableHead><TableHead>Category</TableHead>
                  <TableHead>Brand</TableHead><TableHead>Tax %</TableHead><TableHead className="w-28 text-right">Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {filtered.map((p) => (
                    <TableRow key={p.id} className="hover:bg-slate-50">
                      <TableCell className="text-xs text-muted-foreground">{p.id}</TableCell>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>{p.categoryName ?? "—"}</TableCell>
                      <TableCell>{p.brandName ?? "—"}</TableCell>
                      <TableCell>{p.taxPercentage != null ? `${p.taxPercentage}%` : "—"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openManage(p)}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteProduct(p)}><Trash2 className="h-3.5 w-3.5" /></Button>
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

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Create Product</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            {formError && <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">{formError}</div>}
            <div className="space-y-2"><Label>Product Name *</Label><Input required placeholder="Enter product name" value={String(formData.name ?? "")} onChange={(e) => handleField("name", e.target.value)} /></div>
            <div className="space-y-2"><Label>Slug</Label><Input placeholder="product-slug" value={String(formData.slug ?? "")} onChange={(e) => handleField("slug", e.target.value)} /></div>
            <div className="space-y-2"><Label>Category *</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required value={String(formData.categoryId ?? "")} onChange={(e) => handleField("categoryId", Number(e.target.value))}>
                <option value="">Select...</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-2"><Label>Brand</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={String(formData.brandId ?? "")} onChange={(e) => handleField("brandId", Number(e.target.value))}>
                <option value="">No brand</option>{brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div className="space-y-2"><Label>Tax / GST %</Label><Input type="number" step="0.01" placeholder="0" value={String(formData.taxPercentage ?? "")} onChange={(e) => handleField("taxPercentage", Number(e.target.value))} /></div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div><p className="text-sm font-medium">Has Variants?</p><p className="text-xs text-muted-foreground">Enable for sizes like 250g, 500g, 1kg</p></div>
              <button type="button" role="switch" aria-checked={hasVariants} className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${hasVariants ? "bg-primary" : "bg-slate-200"}`} onClick={() => setHasVariants(!hasVariants)}>
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${hasVariants ? "translate-x-5" : "translate-x-0"}`} />
              </button>
            </div>

            {!hasVariants && (
              <div className="space-y-4 rounded-lg border p-4 bg-slate-50/50">
                <p className="text-sm font-semibold text-slate-700">Product Details</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Price *</Label><Input type="number" step="0.01" required placeholder="0.00" value={String(inlineVariant.price ?? "")} onChange={(e) => handleInlineField("price", Number(e.target.value))} /></div>
                  <div className="space-y-2"><Label>Offer Price</Label><Input type="number" step="0.01" placeholder="0.00" value={String(inlineVariant.discountedPrice ?? "")} onChange={(e) => handleInlineField("discountedPrice", Number(e.target.value))} />{Number(inlineVariant.discountedPrice) > 0 && Number(inlineVariant.discountedPrice) >= Number(inlineVariant.price) && <p className="text-xs text-destructive">Must be less than price</p>}</div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Stock</Label><Input type="number" placeholder="0" value={String(inlineVariant.stock ?? "")} onChange={(e) => handleInlineField("stock", Number(e.target.value))} /></div>
                  <div className="space-y-2"><Label>Max Allowed Qty</Label><Input type="number" placeholder="e.g. 5" value={String(inlineVariant.totalAllowedQuantity ?? "")} onChange={(e) => handleInlineField("totalAllowedQuantity", Number(e.target.value))} /></div>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5"><Ruler className="h-3.5 w-3.5" /> Unit</Label>
                  <select className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm" value={String(inlineVariant.unitId ?? "")} onChange={(e) => handleInlineField("unitId", e.target.value ? Number(e.target.value) : "")}>
                    <option value="">No unit</option>
                    {units.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.shortCode})</option>)}
                  </select>
                  {Number(inlineVariant.unitId) > 0 && (
                    <Input type="number" step="0.01" min="0" placeholder="Quantity" className="h-9" value={String(inlineVariant.unitQuantity ?? "")} onChange={(e) => handleInlineField("unitQuantity", Number(e.target.value))} />
                  )}
                </div>
                <div className="space-y-2"><Label>Image</Label>
                  <input type="file" accept="image/*" className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium cursor-pointer"
                    onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => { const s = rd.result as string; handleInlineField("imageBase64", s.includes(",") ? s.split(",")[1] : s); }; rd.readAsDataURL(f); }} />
                  {inlineVariant.imageBase64 ? (<div className="flex items-center gap-3 mt-2"><img src={getImageSrc(String(inlineVariant.imageBase64 ?? ""))} alt="" className="h-16 w-16 rounded-md object-cover border" /><Button type="button" variant="ghost" size="sm" className="text-destructive text-xs" onClick={() => handleInlineField("imageBase64", "")}>Remove</Button></div>) : null}
                </div>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={deleteProduct !== null} onOpenChange={(o) => !o && setDeleteProduct(null)} title="Delete Product" description={`Delete "${deleteProduct?.name}"? This will remove it only from your store.`} confirmLabel="Delete" variant="destructive" loading={deleting} onConfirm={handleDeleteProduct} />

      <Dialog open={newUnitOpen} onOpenChange={setNewUnitOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Ruler className="h-5 w-5" /> Create New Unit</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Unit Name *</Label><Input required placeholder="e.g. Kilogram, Piece" value={newUnitName} onChange={(e) => setNewUnitName(e.target.value)} /></div>
            <div className="space-y-2"><Label>Short Code *</Label><Input required placeholder="e.g. kg, pc" value={newUnitShortCode} onChange={(e) => setNewUnitShortCode(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setNewUnitOpen(false)}>Cancel</Button>
            <Button type="button" disabled={newUnitSaving || !newUnitName.trim() || !newUnitShortCode.trim()} onClick={handleCreateUnit}>
              {newUnitSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create Unit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function SellerSpeedyMartProductsPage() {
  return (
    <Suspense>
      <SellerSpeedyMartProductsPageContent />
    </Suspense>
  );
}
