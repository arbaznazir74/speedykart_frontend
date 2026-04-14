"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusBadge } from "@/components/shared/status-badge";
import { PageHeader } from "@/components/shared/page-header";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api-client";
import { API_ENDPOINTS, PlatformType } from "@/lib/constants";
import { formatCurrency } from "@/lib/format";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Loader2, Plus, Pencil, Trash2, ChefHat, X, Package, Ruler,
} from "lucide-react";

/* ────────────────────────── Types ────────────────────────── */

interface SellerProduct {
  id: number;
  name: string;
  categoryName: string | null;
}

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
}

interface UnitItem { id: number; name: string; }

interface ToppingItem {
  id: number;
  name: string;
  image: string | null;
}

interface AddOnLink { id: number; mainProductId: number; addonProductId: number; mainProductName: string | null; addonProductName: string | null; categoryId: number; }

interface ProductTopping {
  id: number;
  productId: number;
  toppingId: number;
  toppingName: string | null;
  price: number;
  isDefault: boolean;
}

/* ────────────────────────── Page ────────────────────────── */

export default function SellerHotBoxVariantsPage() {
  // Products list
  const [products, setProducts] = useState<SellerProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<SellerProduct | null>(null);

  // Variants for selected product
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [variantsLoading, setVariantsLoading] = useState(false);

  // Variant form dialog
  const [variantDialog, setVariantDialog] = useState(false);
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null);
  const [variantForm, setVariantForm] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Units for the dropdown
  const [units, setUnits] = useState<UnitItem[]>([]);
  const [newUnitOpen, setNewUnitOpen] = useState(false);
  const [newUnitName, setNewUnitName] = useState("");
  const [newUnitShortCode, setNewUnitShortCode] = useState("");
  const [newUnitSaving, setNewUnitSaving] = useState(false);

  // Delete
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Add-ons (category-based, per product)
  const [addonProductId, setAddonProductId] = useState<number | null>(null);
  const [addonLinks, setAddonLinks] = useState<AddOnLink[]>([]);
  const [addonsLoading, setAddonsLoading] = useState(false);
  const [addonSaving, setAddonSaving] = useState(false);
  const [addonError, setAddonError] = useState<string | null>(null);
  const [deleteAddonId, setDeleteAddonId] = useState<number | null>(null);
  const [addonCatId, setAddonCatId] = useState<number | null>(null);
  const [addonCatProducts, setAddonCatProducts] = useState<{ productId: number; productName: string }[]>([]);
  const [addonCatLoading, setAddonCatLoading] = useState(false);
  const [addonChecked, setAddonChecked] = useState<Set<number>>(new Set());
  const [sellerCategories, setSellerCategories] = useState<{ id: number; name: string }[]>([]);

  // Toppings
  const [toppingsOpen, setToppingsOpen] = useState(false);
  const [allToppings, setAllToppings] = useState<ToppingItem[]>([]);
  const [productToppings, setProductToppings] = useState<ProductTopping[]>([]);
  const [toppingsLoading, setToppingsLoading] = useState(false);
  const [addToppingId, setAddToppingId] = useState<number | null>(null);
  const [addToppingPrice, setAddToppingPrice] = useState("");
  const [addToppingDefault, setAddToppingDefault] = useState(false);
  const [toppingSaving, setToppingSaving] = useState(false);
  const [toppingError, setToppingError] = useState<string | null>(null);
  const [deleteToppingId, setDeleteToppingId] = useState<number | null>(null);

  // Load seller's products
  useEffect(() => {
    setProductsLoading(true);
    apiGet<SellerProduct[]>(`${API_ENDPOINTS.PRODUCT}/mine?platformType=${PlatformType.HotBox}`, { skip: 0, top: 200 })
      .then((r) => setProducts(r.successData ?? []))
      .catch(() => {})
      .finally(() => setProductsLoading(false));
  }, []);

  // Load units once
  useEffect(() => {
    apiGet<UnitItem[]>(API_ENDPOINTS.UNIT, { skip: 0, top: 200 })
      .then((r) => setUnits(r.successData ?? []))
      .catch(() => {});
    apiGet<{ id: number; name: string }[]>(API_ENDPOINTS.CATEGORY, { skip: 0, top: 200 })
      .then((r) => setSellerCategories(r.successData ?? []))
      .catch(() => {});
  }, []);

  // Load variants for selected product
  const loadVariants = useCallback(async (productId: number) => {
    setVariantsLoading(true);
    try {
      const resp = await apiGet<ProductVariant[]>(`${API_ENDPOINTS.PRODUCT_VARIANT}/product/${productId}`);
      const vList = resp.successData ?? [];
      setVariants(vList);
    } catch {
      setVariants([]);
    } finally {
      setVariantsLoading(false);
    }
  }, []);

  function selectProduct(p: SellerProduct) {
    setSelectedProduct(p);
    loadVariants(p.id);
    initAddonsForProduct(p.id);
  }

  /* ─── Variant CRUD ─── */

  function openCreateVariant() {
    setEditingVariant(null);
    setVariantForm({ productId: selectedProduct?.id, indicator: "Veg" });
    setFormError(null);
    setVariantDialog(true);
  }

  function openEditVariant(v: ProductVariant) {
    setEditingVariant(v);
    setVariantForm({
      productId: v.productId,
      name: v.name,
      indicator: v.indicator,
      price: v.price,
      discountedPrice: v.discountedPrice || 0,
      stock: v.stock,
      totalAllowedQuantity: v.totalAllowedQuantity || 0,
      isCodAllowed: v.isCodAllowed ?? true,
      description: v.description ?? "",
      imageBase64: v.imageBase64 ?? "",
    });
    setFormError(null);
    setVariantDialog(true);
  }

  function handleField(key: string, value: unknown) {
    setVariantForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleVariantSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProduct) return;
    setSaving(true);
    setFormError(null);
    try {
      if (Number(variantForm.discountedPrice) > 0 && Number(variantForm.discountedPrice) >= Number(variantForm.price)) throw new Error("Offer Price must be less than Price");
      const payload = { ...variantForm, platformType: PlatformType.HotBox };
      if (editingVariant) {
        await apiPut(`${API_ENDPOINTS.PRODUCT_VARIANT}/${editingVariant.id}`, payload);
      } else {
        await apiPost(API_ENDPOINTS.PRODUCT_VARIANT, payload);
      }
      setVariantDialog(false);
      await loadVariants(selectedProduct.id);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to save variant");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteVariant() {
    if (deleteId === null || !selectedProduct) return;
    setDeleting(true);
    try {
      await apiDelete(`${API_ENDPOINTS.PRODUCT_VARIANT}/${deleteId}`);
      setDeleteId(null);
      await loadVariants(selectedProduct.id);
    } catch {
    } finally {
      setDeleting(false);
    }
  }

  /* ─── Toppings ─── */

  async function openToppings() {
    if (!selectedProduct) return;
    setToppingsOpen(true);
    setToppingsLoading(true);
    setToppingError(null);
    setAddToppingId(null);
    setAddToppingPrice("");
    setAddToppingDefault(false);
    try {
      const [allResp, ptResp] = await Promise.all([
        apiGet<ToppingItem[]>(`${API_ENDPOINTS.TOPPING}/active`),
        apiGet<ProductTopping[]>(`${API_ENDPOINTS.PRODUCT_TOPPING}/product/${selectedProduct.id}`),
      ]);
      setAllToppings(allResp.successData ?? []);
      setProductToppings(ptResp.successData ?? []);
    } catch {
      setAllToppings([]);
      setProductToppings([]);
    } finally {
      setToppingsLoading(false);
    }
  }

  async function handleAddTopping() {
    if (!selectedProduct || !addToppingId) return;
    setToppingSaving(true);
    setToppingError(null);
    try {
      await apiPost(API_ENDPOINTS.PRODUCT_TOPPING, {
        productId: selectedProduct.id,
        toppingId: addToppingId,
        price: parseFloat(addToppingPrice) || 0,
        isDefault: addToppingDefault,
      });
      const ptResp = await apiGet<ProductTopping[]>(`${API_ENDPOINTS.PRODUCT_TOPPING}/product/${selectedProduct.id}`);
      setProductToppings(ptResp.successData ?? []);
      setAddToppingId(null);
      setAddToppingPrice("");
      setAddToppingDefault(false);
    } catch (err: unknown) {
      setToppingError(err instanceof Error ? err.message : "Failed to add topping");
    } finally {
      setToppingSaving(false);
    }
  }

  async function handleRemoveTopping() {
    if (deleteToppingId === null || !selectedProduct) return;
    try {
      await apiDelete(`${API_ENDPOINTS.PRODUCT_TOPPING}/${deleteToppingId}`);
      const ptResp = await apiGet<ProductTopping[]>(`${API_ENDPOINTS.PRODUCT_TOPPING}/product/${selectedProduct.id}`);
      setProductToppings(ptResp.successData ?? []);
    } catch {
    } finally {
      setDeleteToppingId(null);
    }
  }

  const assignedToppingIds = new Set(productToppings.map((pt) => pt.toppingId));
  const availableToppings = allToppings.filter((t) => !assignedToppingIds.has(t.id));

  /* ─── Add-ons (category-based, product-level) ─── */

  async function loadAddonsForProduct(productId: number) {
    setAddonsLoading(true); setAddonError(null);
    try {
      const r = await apiGet<AddOnLink[]>(`${API_ENDPOINTS.ADDON}/product/admin/${productId}`);
      setAddonLinks(r.successData ?? []);
    } catch { setAddonLinks([]); } finally { setAddonsLoading(false); }
  }

  function initAddonsForProduct(productId: number) {
    setAddonProductId(productId);
    loadAddonsForProduct(productId);
    setAddonCatId(null); setAddonCatProducts([]); setAddonChecked(new Set());
  }

  async function handleAddonCategorySelect(catId: number | null) {
    setAddonCatId(catId); setAddonChecked(new Set()); setAddonCatProducts([]);
    if (!catId) return;
    setAddonCatLoading(true);
    try {
      // Resolve category for each seller product via backend
      const assignedNames = new Set(addonLinks.map((a) => a.addonProductName));
      const available: { productId: number; productName: string }[] = [];
      const productCategoryMap = new Map<number, number>();
      await Promise.all(products.map(async (p) => {
        try {
          const pr = await apiGet<{ categoryId: number }>(`${API_ENDPOINTS.PRODUCT}/${p.id}`);
          if (pr.successData) productCategoryMap.set(p.id, pr.successData.categoryId);
        } catch { /* skip */ }
      }));
      for (const p of products) {
        if (productCategoryMap.get(p.id) === catId && p.id !== selectedProduct?.id && !assignedNames.has(p.name)) {
          available.push({ productId: p.id, productName: p.name });
        }
      }
      setAddonCatProducts(available);
    } catch { setAddonCatProducts([]); } finally { setAddonCatLoading(false); }
  }

  function toggleAddonCheck(productId: number) {
    setAddonChecked((prev) => { const n = new Set(prev); if (n.has(productId)) n.delete(productId); else n.add(productId); return n; });
  }

  function toggleAddonSelectAll() {
    if (addonChecked.size === addonCatProducts.length) setAddonChecked(new Set());
    else setAddonChecked(new Set(addonCatProducts.map((p) => p.productId)));
  }

  async function handleBatchAddAddons() {
    if (!addonProductId || addonChecked.size === 0) return;
    setAddonSaving(true); setAddonError(null);
    try {
      const results = await Promise.allSettled(
        Array.from(addonChecked).map((pid) => apiPost(`${API_ENDPOINTS.ADDON}/by-product`, { mainProductId: addonProductId, addonProductId: pid }))
      );
      const failed = results.filter((r) => r.status === "rejected").length;
      if (failed > 0) setAddonError(`${failed} of ${addonChecked.size} failed to add`);
      await loadAddonsForProduct(addonProductId);
      setAddonCatId(null); setAddonCatProducts([]); setAddonChecked(new Set());
    } catch (err: unknown) { setAddonError(err instanceof Error ? err.message : "Failed"); } finally { setAddonSaving(false); }
  }

  async function handleRemoveAddon() {
    if (deleteAddonId === null || !addonProductId) return;
    try {
      await apiDelete(`${API_ENDPOINTS.ADDON}/${deleteAddonId}`);
      await loadAddonsForProduct(addonProductId);
    } catch { /* empty */ } finally { setDeleteAddonId(null); }
  }

  const addonsByCategory = useMemo(() => {
    const map = new Map<number, { categoryId: number; links: AddOnLink[] }>();
    for (const a of addonLinks) {
      if (!map.has(a.categoryId)) map.set(a.categoryId, { categoryId: a.categoryId, links: [] });
      map.get(a.categoryId)!.links.push(a);
    }
    return Array.from(map.values());
  }, [addonLinks]);

  // Lowest price for display
  const lowestPrice = variants.length > 0 ? Math.min(...variants.map((v) => v.price)) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="HotBox Product Variants"
        description="Select a product, then add size variants (Half, Full, etc.) with individual prices. Manage toppings per product."
      />

      {/* Product selector */}
      <Card className="border-0 shadow-sm">
        <CardContent className="py-4">
          <Label className="text-sm font-medium mb-2 block">Select Product</Label>
          {productsLoading ? (
            <Skeleton className="h-10 w-full max-w-md" />
          ) : products.length === 0 ? (
            <p className="text-sm text-slate-400">No products found. Create a product first.</p>
          ) : (
            <select
              className="flex h-10 w-full max-w-md rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={selectedProduct?.id ?? ""}
              onChange={(e) => {
                const p = products.find((x) => x.id === Number(e.target.value));
                if (p) selectProduct(p);
              }}
            >
              <option value="">Choose a product...</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name} {p.categoryName ? `(${p.categoryName})` : ""}</option>
              ))}
            </select>
          )}
        </CardContent>
      </Card>

      {/* Selected product info + variants */}
      {selectedProduct && (
        <>
          <Card className="border-0 shadow-sm">
            <CardContent className="py-3 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <h2 className="font-semibold text-sm">{selectedProduct.name}</h2>
                {selectedProduct.categoryName && (
                  <Badge variant="outline" className="text-xs">{selectedProduct.categoryName}</Badge>
                )}
                {lowestPrice !== null && (
                  <Badge className="bg-green-100 text-green-800 text-xs">
                    Starting {formatCurrency(lowestPrice)}
                  </Badge>
                )}
                <Badge variant="outline" className="text-xs">{variants.length} variant{variants.length !== 1 ? "s" : ""}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={openToppings}>
                  <ChefHat className="h-3.5 w-3.5 mr-1" /> Toppings
                </Button>
                <Button size="sm" className="h-8 text-xs" onClick={openCreateVariant}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Variant
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm overflow-hidden">
            <CardContent className="p-0">
              {variantsLoading ? (
                <div className="p-6 space-y-3">
                  {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
                </div>
              ) : variants.length === 0 ? (
                <div className="py-16 text-center">
                  <p className="text-sm text-slate-500 font-medium">No variants yet</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Add variants like &ldquo;Half&rdquo;, &ldquo;Full&rdquo; with different prices for this product.
                  </p>
                  <Button size="sm" className="mt-4" onClick={openCreateVariant}>
                    <Plus className="h-4 w-4 mr-1" /> Add First Variant
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">ID</TableHead>
                        <TableHead>Variant Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Offer Price</TableHead>
                        <TableHead>Stock</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {variants.map((v) => (
                        <TableRow key={v.id}>
                          <TableCell className="text-xs text-muted-foreground">{v.id}</TableCell>
                          <TableCell className="font-medium text-sm">{v.name}</TableCell>
                          <TableCell><StatusBadge status={v.indicator} /></TableCell>
                          <TableCell className="font-semibold">{formatCurrency(v.price)}</TableCell>
                          <TableCell>{v.discountedPrice ? formatCurrency(v.discountedPrice) : "—"}</TableCell>
                          <TableCell>{v.stock}</TableCell>
                          <TableCell><StatusBadge status={v.status} /></TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditVariant(v)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(v.id)}>
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
        </>
      )}

      {/* ═══ Add-ons Section (separate, category-based, product-level) ═══ */}
      {selectedProduct && (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-4 space-y-4">
            <div className="flex items-center gap-2"><Package className="h-4 w-4" /><span className="font-semibold text-sm">Add-ons</span></div>

            {addonsLoading ? (
              <div className="space-y-2">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
            ) : addonsByCategory.length > 0 ? (
              <div className="space-y-3">
                {addonsByCategory.map((group) => {
                  const catName = sellerCategories.find((c) => c.id === group.categoryId)?.name ?? `Category #${group.categoryId}`;
                  return (
                    <div key={group.categoryId} className="rounded-lg border p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs font-semibold">{catName}</Badge>
                        <span className="text-xs text-muted-foreground">({group.links.length})</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {group.links.map((a) => (
                          <div key={a.id} className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs">
                            <span>{a.addonProductName ?? `#${a.addonProductId}`}</span>
                            <button type="button" className="text-destructive hover:text-destructive/80" onClick={() => setDeleteAddonId(a.id)}><X className="h-3 w-3" /></button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No add-ons assigned yet. Select a category below to add.</p>
            )}

            {addonError && <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">{addonError}</div>}

            <div className="rounded-lg border p-3 space-y-3 bg-muted/30">
              <Label className="text-xs font-semibold">Add from Category</Label>
              <select className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm" value={addonCatId ?? ""} onChange={(e) => handleAddonCategorySelect(e.target.value ? Number(e.target.value) : null)}>
                <option value="">Select a category...</option>
                {sellerCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>

              {addonCatLoading && <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading products...</div>}

              {!addonCatLoading && addonCatId && addonCatProducts.length === 0 && (
                <p className="text-xs text-muted-foreground">No available products in this category to add.</p>
              )}

              {!addonCatLoading && addonCatProducts.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 border-b pb-2">
                    <Checkbox id="addon-select-all" checked={addonChecked.size === addonCatProducts.length && addonCatProducts.length > 0} onCheckedChange={toggleAddonSelectAll} />
                    <Label htmlFor="addon-select-all" className="text-xs font-medium cursor-pointer">Select All ({addonCatProducts.length})</Label>
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {addonCatProducts.map((cp) => (
                      <div key={cp.productId} className="flex items-center gap-2 py-1">
                        <Checkbox id={`addon-${cp.productId}`} checked={addonChecked.has(cp.productId)} onCheckedChange={() => toggleAddonCheck(cp.productId)} />
                        <Label htmlFor={`addon-${cp.productId}`} className="text-xs cursor-pointer flex-1">{cp.productName}</Label>
                      </div>
                    ))}
                  </div>
                  <Button size="sm" className="h-8 text-xs" disabled={addonChecked.size === 0 || addonSaving} onClick={handleBatchAddAddons}>
                    {addonSaving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                    Add {addonChecked.size > 0 ? `${addonChecked.size} Add-on${addonChecked.size > 1 ? "s" : ""}` : "Selected"}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Variant Create/Edit Dialog ─── */}
      <Dialog open={variantDialog} onOpenChange={setVariantDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingVariant ? "Edit Variant" : "Add Variant"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleVariantSubmit} className="space-y-4">
            {formError && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
                {formError}
              </div>
            )}

            <div className="space-y-2">
              <Label>Variant Name *</Label>
              <Input required placeholder="e.g. Half, Full, Regular" value={String(variantForm.name ?? "")} onChange={(e) => handleField("name", e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><Ruler className="h-3.5 w-3.5" /> Unit (Size)</Label>
              <div className="flex items-center gap-2">
                <select
                  className="flex h-10 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={String(variantForm.unitId ?? "")}
                  onChange={(e) => handleField("unitId", e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">None (custom name)</option>
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
                <Button type="button" variant="outline" size="icon" className="h-10 w-10 shrink-0" title="Create new unit" onClick={() => { setNewUnitOpen(true); setNewUnitName(""); setNewUnitShortCode(""); }}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {newUnitOpen && (
                <div className="rounded-lg border bg-slate-50/80 p-3 space-y-2">
                  <p className="text-xs font-semibold text-slate-600">New Unit</p>
                  <Input placeholder="Unit name (e.g. Kilogram)" value={newUnitName} onChange={(e) => setNewUnitName(e.target.value)} className="h-9" />
                  <Input placeholder="Short code (e.g. kg)" value={newUnitShortCode} onChange={(e) => setNewUnitShortCode(e.target.value)} className="h-9" />
                  <div className="flex gap-2">
                    <Button type="button" size="sm" className="h-8 text-xs" disabled={newUnitSaving || !newUnitName.trim() || !newUnitShortCode.trim()} onClick={async () => {
                      setNewUnitSaving(true);
                      try {
                        const r = await apiPost<unknown, { boolResponse: boolean }>(`${API_ENDPOINTS.UNIT}/mine`, { name: newUnitName.trim(), shortCode: newUnitShortCode.trim() });
                        if (r.isError) throw new Error(r.errorData?.displayMessage ?? "Failed");
                        const refreshed = await apiGet<UnitItem[]>(API_ENDPOINTS.UNIT, { skip: 0, top: 200 });
                        setUnits(refreshed.successData ?? []);
                        setNewUnitOpen(false); setNewUnitName(""); setNewUnitShortCode("");
                      } catch { /* empty */ } finally { setNewUnitSaving(false); }
                    }}>
                      {newUnitSaving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />} Create
                    </Button>
                    <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setNewUnitOpen(false)}>Cancel</Button>
                  </div>
                </div>
              )}
              <p className="text-xs text-muted-foreground">Select a predefined unit or leave empty and use any variant name above.</p>
            </div>

            <div className="space-y-2">
              <Label>Food Type *</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                required
                value={String(variantForm.indicator ?? "Veg")}
                onChange={(e) => handleField("indicator", e.target.value)}
              >
                <option value="Veg">Veg</option>
                <option value="NonVeg">Non-Veg</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Price *</Label>
                <Input type="number" step="0.01" required placeholder="0.00" value={String(variantForm.price ?? "")} onChange={(e) => handleField("price", Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>Offer / Discounted Price</Label>
                <Input type="number" step="0.01" placeholder="0.00" value={String(variantForm.discountedPrice ?? "")} onChange={(e) => handleField("discountedPrice", Number(e.target.value))} />
                {Number(variantForm.discountedPrice) > 0 && Number(variantForm.discountedPrice) >= Number(variantForm.price) && <p className="text-xs text-destructive">Must be less than price</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Stock</Label>
                <Input type="number" placeholder="0" value={String(variantForm.stock ?? "")} onChange={(e) => handleField("stock", Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>Max Allowed Qty</Label>
                <Input type="number" placeholder="e.g. 5" value={String(variantForm.totalAllowedQuantity ?? "")} onChange={(e) => handleField("totalAllowedQuantity", Number(e.target.value))} />
                <p className="text-xs text-muted-foreground">Max items a user can add per order</p>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div><p className="text-sm font-medium">Cash on Delivery</p><p className="text-xs text-muted-foreground">Allow COD for this product</p></div>
              <button type="button" role="switch" aria-checked={!!variantForm.isCodAllowed} className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${variantForm.isCodAllowed ? "bg-primary" : "bg-slate-200"}`} onClick={() => handleField("isCodAllowed", !variantForm.isCodAllowed)}>
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${variantForm.isCodAllowed ? "translate-x-5" : "translate-x-0"}`} />
              </button>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <textarea
                className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Brief description of this variant"
                value={String(variantForm.description ?? "")}
                onChange={(e) => handleField("description", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Image</Label>
              <input
                type="file"
                accept="image/*"
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium cursor-pointer"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => {
                    const result = reader.result as string;
                    const base64 = result.includes(",") ? result.split(",")[1] : result;
                    handleField("imageBase64", base64);
                  };
                  reader.readAsDataURL(file);
                }}
              />
              {variantForm.imageBase64 ? (
                <div className="flex items-center gap-3 mt-2">
                  <img src={`data:image/jpeg;base64,${variantForm.imageBase64}`} alt="Preview" className="h-16 w-16 rounded-md object-cover border" />
                  <Button type="button" variant="ghost" size="sm" className="text-destructive text-xs" onClick={() => handleField("imageBase64", "")}>Remove</Button>
                </div>
              ) : null}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setVariantDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingVariant ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete Variant"
        description="Are you sure? This will remove this variant permanently."
        confirmLabel="Delete"
        variant="destructive"
        loading={deleting}
        onConfirm={handleDeleteVariant}
      />

      {/* ─── Toppings Dialog ─── */}
      <Dialog open={toppingsOpen} onOpenChange={setToppingsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ChefHat className="h-5 w-5" /> Toppings for &ldquo;{selectedProduct?.name}&rdquo;
            </DialogTitle>
          </DialogHeader>

          {toppingsLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Current toppings */}
              {productToppings.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Assigned Toppings</Label>
                  <div className="space-y-1">
                    {productToppings.map((pt) => (
                      <div key={pt.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium">{pt.toppingName}</span>
                          <Badge variant="outline" className="text-xs">{formatCurrency(pt.price)}</Badge>
                          {pt.isDefault && <Badge className="bg-blue-100 text-blue-700 text-xs">Default</Badge>}
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteToppingId(pt.id)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add topping */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Add Topping</Label>
                {toppingError && (
                  <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
                    {toppingError}
                  </div>
                )}
                {availableToppings.length === 0 ? (
                  <p className="text-sm text-slate-400">All toppings have been assigned, or no toppings exist. Create toppings from the admin panel.</p>
                ) : (
                  <div className="flex items-end gap-3 flex-wrap">
                    <div className="space-y-1 flex-1 min-w-[150px]">
                      <Label className="text-xs">Topping</Label>
                      <select
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                        value={addToppingId ?? ""}
                        onChange={(e) => setAddToppingId(e.target.value ? Number(e.target.value) : null)}
                      >
                        <option value="">Select...</option>
                        {availableToppings.map((t) => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1 w-28">
                      <Label className="text-xs">Extra Price</Label>
                      <Input className="h-9" type="number" step="0.01" placeholder="0" value={addToppingPrice} onChange={(e) => setAddToppingPrice(e.target.value)} />
                    </div>
                    <div className="flex items-center gap-2 pb-0.5">
                      <input type="checkbox" id="topping-default" checked={addToppingDefault} onChange={(e) => setAddToppingDefault(e.target.checked)} className="rounded" />
                      <Label htmlFor="topping-default" className="text-xs">Default</Label>
                    </div>
                    <Button size="sm" className="h-9" disabled={!addToppingId || toppingSaving} onClick={handleAddTopping}>
                      {toppingSaving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                      Add
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete topping confirm */}
      <ConfirmDialog
        open={deleteToppingId !== null}
        onOpenChange={(open) => !open && setDeleteToppingId(null)}
        title="Remove Topping"
        description="Remove this topping from the product?"
        confirmLabel="Remove"
        variant="destructive"
        loading={false}
        onConfirm={handleRemoveTopping}
      />

      <ConfirmDialog open={deleteAddonId !== null} onOpenChange={(o) => !o && setDeleteAddonId(null)} title="Remove Add-on" description="Remove this add-on link?" confirmLabel="Remove" variant="destructive" loading={false} onConfirm={handleRemoveAddon} />
    </div>
  );
}
