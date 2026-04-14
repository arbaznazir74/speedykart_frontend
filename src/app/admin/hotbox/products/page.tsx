"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusBadge } from "@/components/shared/status-badge";
import { PageHeader } from "@/components/shared/page-header";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { TagPicker } from "@/components/shared/tag-picker";
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
  Loader2, Plus, Pencil, Trash2, Search, ChefHat, ArrowLeft, X, UserPlus, Users, Ruler, Package,
} from "lucide-react";

/* ── Types ── */

interface HotBoxProduct {
  id: number;
  name: string;
  slug: string;
  sellerId: number;
  categoryId: number;
  categoryName: string | null;
  taxPercentage: number | null;
  tags: string | null;
}
interface ProductGroup {
  key: string;
  name: string;
  categoryId: number;
  categoryName: string | null;
  taxPercentage: number | null;
  tags: string | null;
  products: HotBoxProduct[];
}
interface LookupItem { id: number; name: string; }
interface SellerItem { id: number; name: string; businessName: string | null; }
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
}

interface ToppingItem { id: number; name: string; price: number; image: string | null; }
interface AddOnLink { id: number; mainProductId: number; addonProductId: number; mainProductName: string | null; addonProductName: string | null; categoryId: number; }
interface ProductTopping {
  id: number;
  productId: number;
  toppingId: number;
  toppingName: string | null;
  price: number;
  isDefault: boolean;
}

/* ── Page ── */

export default function HotBoxProductsPage() {
  /* ─── Product List State ─── */
  const [products, setProducts] = useState<HotBoxProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  /* ─── Lookups ─── */
  const [categories, setCategories] = useState<LookupItem[]>([]);
  const [sellers, setSellers] = useState<SellerItem[]>([]);

  /* ─── Create Dialog ─── */
  const [createOpen, setCreateOpen] = useState(false);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [selectedSellerIds, setSelectedSellerIds] = useState<number[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [hasVariants, setHasVariants] = useState(true);
  const [inlineVariant, setInlineVariant] = useState<Record<string, unknown>>({});
  const [inlineToppings, setInlineToppings] = useState<{ toppingId: number; price: number; isDefault: boolean }[]>([]);
  const [inlineAllToppings, setInlineAllToppings] = useState<ToppingItem[]>([]);
  const [inlineAddToppingId, setInlineAddToppingId] = useState<number | null>(null);
  const [inlineAddToppingPrice, setInlineAddToppingPrice] = useState("");
  const [inlineAddToppingDefault, setInlineAddToppingDefault] = useState(false);

  /* ─── Inline add-ons for creation form ─── */
  const [inlineAddonCatId, setInlineAddonCatId] = useState<number | null>(null);
  const [inlineAddonCatProducts, setInlineAddonCatProducts] = useState<{ productId: number; productName: string }[]>([]);
  const [inlineAddonCatLoading, setInlineAddonCatLoading] = useState(false);
  const [inlineAddonChecked, setInlineAddonChecked] = useState<Set<number>>(new Set());
  const [inlineAddons, setInlineAddons] = useState<{ productId: number; productName: string }[]>([]);

  /* ─── Manage (group detail view) ─── */
  const [managingGroup, setManagingGroup] = useState<ProductGroup | null>(null);
  const [editFormData, setEditFormData] = useState<Record<string, unknown>>({});
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [selectedSellerProduct, setSelectedSellerProduct] = useState<HotBoxProduct | null>(null);
  const [addSellerOpen, setAddSellerOpen] = useState(false);
  const [addSellerIds, setAddSellerIds] = useState<number[]>([]);
  const [addSellerSaving, setAddSellerSaving] = useState(false);

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
  const [singleVariantSaving, setSingleVariantSaving] = useState(false);
  const [singleVariantError, setSingleVariantError] = useState<string | null>(null);

  /* ─── Toppings ─── */
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
  const [newToppingOpen, setNewToppingOpen] = useState(false);
  const [newToppingName, setNewToppingName] = useState("");
  const [newToppingPrice, setNewToppingPrice] = useState("");
  const [newToppingSaving, setNewToppingSaving] = useState(false);

  /* ─── Add-ons (category-based, per product) ─── */
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

  /* ─── Units ─── */
  const [units, setUnits] = useState<UnitItem[]>([]);
  const [newUnitOpen, setNewUnitOpen] = useState(false);
  const [newUnitName, setNewUnitName] = useState("");
  const [newUnitShortCode, setNewUnitShortCode] = useState("");
  const [newUnitSaving, setNewUnitSaving] = useState(false);

  /* ─── Delete ─── */
  const [deleteGroup, setDeleteGroup] = useState<ProductGroup | null>(null);
  const [deleting, setDeleting] = useState(false);

  /* ═══════════ Data Loading ═══════════ */

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await apiGet<HotBoxProduct[]>(`${API_ENDPOINTS.PRODUCT}?platformType=${PlatformType.HotBox}&skip=0&top=500`);
      setProducts(resp.successData ?? []);
    } catch { /* empty */ } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    loadProducts();
    apiGet<LookupItem[]>(`${API_ENDPOINTS.CATEGORY}/parent/admin?platform=1&skip=0&top=200`)
      .then((r) => setCategories(r.successData ?? [])).catch(() => {});
    apiGet<SellerItem[]>(API_ENDPOINTS.SELLER, { skip: 0, top: 500 })
      .then((r) => setSellers(r.successData ?? [])).catch(() => {});
    apiGet<UnitItem[]>(`${API_ENDPOINTS.UNIT}?skip=0&top=200`)
      .then((r) => setUnits(r.successData ?? [])).catch(() => {});
  }, [loadProducts]);

  const sellerMap = useMemo(() => Object.fromEntries(sellers.map((s) => [s.id, s.businessName || s.name])), [sellers]);

  /* Group products by name + categoryId */
  const groups: ProductGroup[] = useMemo(() => {
    const map = new Map<string, ProductGroup>();
    for (const p of products) {
      const key = `${p.name.toLowerCase().trim()}__${p.categoryId}`;
      if (!map.has(key)) {
        map.set(key, { key, name: p.name, categoryId: p.categoryId, categoryName: p.categoryName, taxPercentage: p.taxPercentage, tags: p.tags, products: [] });
      }
      map.get(key)!.products.push(p);
    }
    return Array.from(map.values());
  }, [products]);

  const filtered = search
    ? groups.filter((g) => g.name.toLowerCase().includes(search.toLowerCase()))
    : groups;

  /* ═══════════ Create Product ═══════════ */

  function toggleSeller(id: number) {
    setSelectedSellerIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }
  function handleSelectAll(checked: boolean) {
    setSelectAll(checked);
    setSelectedSellerIds(checked ? sellers.map((s) => s.id) : []);
  }
  function handleField(key: string, value: unknown) { setFormData((prev) => ({ ...prev, [key]: value })); }
  function handleInlineField(key: string, value: unknown) { setInlineVariant((prev) => ({ ...prev, [key]: value })); }

  function openCreate() {
    setFormData({}); setSelectedSellerIds([]); setSelectAll(false); setFormError(null);
    setHasVariants(true); setInlineVariant({ indicator: "Veg" }); setInlineToppings([]);
    setInlineAddToppingId(null); setInlineAddToppingPrice(""); setInlineAddToppingDefault(false);
    setInlineAddonCatId(null); setInlineAddonCatProducts([]); setInlineAddonCatLoading(false); setInlineAddonChecked(new Set()); setInlineAddons([]);
    apiGet<ToppingItem[]>(`${API_ENDPOINTS.TOPPING}/active`).then((r) => setInlineAllToppings(r.successData ?? [])).catch(() => {});
    setCreateOpen(true);
  }
  function addInlineTopping() {
    if (!inlineAddToppingId || inlineToppings.some((t) => t.toppingId === inlineAddToppingId)) return;
    setInlineToppings((prev) => [...prev, { toppingId: inlineAddToppingId, price: parseFloat(inlineAddToppingPrice) || 0, isDefault: inlineAddToppingDefault }]);
    setInlineAddToppingId(null); setInlineAddToppingPrice(""); setInlineAddToppingDefault(false);
  }
  function removeInlineTopping(tid: number) { setInlineToppings((prev) => prev.filter((t) => t.toppingId !== tid)); }

  async function handleInlineAddonCatSelect(catId: number | null) {
    setInlineAddonCatId(catId); setInlineAddonChecked(new Set()); setInlineAddonCatProducts([]);
    if (!catId) return;
    setInlineAddonCatLoading(true);
    try {
      const catProds = products.filter((p) => p.categoryId === catId);
      const alreadyAdded = new Set(inlineAddons.map((a) => a.productId));
      setInlineAddonCatProducts(catProds.filter((p) => !alreadyAdded.has(p.id)).map((p) => ({ productId: p.id, productName: p.name })));
    } catch { setInlineAddonCatProducts([]); } finally { setInlineAddonCatLoading(false); }
  }

  function addInlineAddonsFromChecked() {
    const toAdd = inlineAddonCatProducts.filter((p) => inlineAddonChecked.has(p.productId));
    setInlineAddons((prev) => [...prev, ...toAdd.filter((a) => !prev.some((x) => x.productId === a.productId))]);
    setInlineAddonCatId(null); setInlineAddonCatProducts([]); setInlineAddonChecked(new Set());
  }

  function removeInlineAddon(pid: number) { setInlineAddons((prev) => prev.filter((a) => a.productId !== pid)); }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); setFormError(null); setSaving(true);
    try {
      if (selectedSellerIds.length === 0) throw new Error("Select at least one seller");
      if (!hasVariants && (!inlineVariant.price || Number(inlineVariant.price) <= 0)) throw new Error("Price is required");
      if (!hasVariants && Number(inlineVariant.discountedPrice) > 0 && Number(inlineVariant.discountedPrice) >= Number(inlineVariant.price)) throw new Error("Offer Price must be less than Price");
      const resp = await apiPost<unknown, HotBoxProduct[]>(`${API_ENDPOINTS.PRODUCT}/admin`, {
        product: { ...formData, platformType: PlatformType.HotBox }, sellerIds: selectedSellerIds,
      });
      if (resp.isError) throw new Error(resp.errorData?.displayMessage ?? "Failed to create");
      if (!hasVariants && resp.successData) {
        for (const prod of resp.successData) {
          const vr = await apiPost<unknown, { id: number }>(`${API_ENDPOINTS.PRODUCT_VARIANT}/admin`, {
            productId: prod.id, name: prod.name, indicator: inlineVariant.indicator ?? "Veg",
            price: Number(inlineVariant.price) || 0, discountedPrice: Number(inlineVariant.discountedPrice) || 0,
            stock: Number(inlineVariant.stock) || 0, totalAllowedQuantity: Number(inlineVariant.totalAllowedQuantity) || 0,
            isCodAllowed: inlineVariant.isCodAllowed ?? true,
            description: inlineVariant.description ?? "",
            imageBase64: inlineVariant.imageBase64 ?? "", platformType: PlatformType.HotBox,
          });
          const createdVariantId = vr.successData?.id;
          if (createdVariantId && inlineVariant.unitId && Number(inlineVariant.unitId) > 0) {
            await apiPost(API_ENDPOINTS.PRODUCT_UNIT, { productVariantId: createdVariantId, unitId: Number(inlineVariant.unitId), quantity: Number(inlineVariant.unitQuantity) || 1 }).catch(() => {});
          }
          for (const t of inlineToppings) {
            await apiPost(API_ENDPOINTS.PRODUCT_TOPPING, { productId: prod.id, toppingId: t.toppingId, price: t.price, isDefault: t.isDefault });
          }
          for (const addon of inlineAddons) {
            await apiPost(`${API_ENDPOINTS.ADDON}/by-product`, { mainProductId: prod.id, addonProductId: addon.productId }).catch(() => {});
          }
        }
      }
      setCreateOpen(false); await loadProducts();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to save");
    } finally { setSaving(false); }
  }

  /* ═══════════ Delete Group ═══════════ */

  async function handleDeleteGroup() {
    if (!deleteGroup) return;
    setDeleting(true);
    try {
      for (const p of deleteGroup.products) {
        const vResp = await apiGet<ProductVariant[]>(`${API_ENDPOINTS.PRODUCT_VARIANT}/product/${p.id}`);
        for (const v of vResp.successData ?? []) { await apiDelete(`${API_ENDPOINTS.PRODUCT_VARIANT}/admin/${v.id}`); }
        await apiDelete(`${API_ENDPOINTS.PRODUCT}/admin/${p.id}`);
      }
      setDeleteGroup(null); await loadProducts();
    } catch { /* empty */ } finally { setDeleting(false); }
  }

  /* ═══════════ Manage Group (Detail View) ═══════════ */

  function openManageGroup(g: ProductGroup) {
    setManagingGroup(g);
    setEditFormData({ name: g.name, slug: g.products[0]?.slug ?? "", categoryId: g.categoryId, taxPercentage: g.taxPercentage ?? 0, tags: g.products[0]?.tags ?? "" });
    setEditError(null);
    const first = g.products[0] ?? null;
    setSelectedSellerProduct(first);
    if (first) { loadVariants(first.id); initAddonsForProduct(first.id); loadToppingsInline(first.id); }
  }
  function closeManage() { setManagingGroup(null); setSelectedSellerProduct(null); setVariants([]); setAddonLinks([]); setAddonProductId(null); }

  function selectSeller(p: HotBoxProduct) {
    setSelectedSellerProduct(p);
    loadVariants(p.id);
    initAddonsForProduct(p.id);
    loadToppingsInline(p.id);
  }

  async function loadToppingsInline(productId: number) {
    setToppingsLoading(true);
    try {
      const [a, b] = await Promise.all([
        apiGet<ToppingItem[]>(`${API_ENDPOINTS.TOPPING}/active`),
        apiGet<ProductTopping[]>(`${API_ENDPOINTS.PRODUCT_TOPPING}/product/${productId}`),
      ]);
      setAllToppings(a.successData ?? []);
      setProductToppings(b.successData ?? []);
    } catch { setAllToppings([]); setProductToppings([]); } finally { setToppingsLoading(false); }
  }

  async function handleSaveAll() {
    setEditSaving(true); setEditError(null); setSingleVariantError(null);
    try {
      // Save product info
      if (managingGroup) {
        const baseSlug = String(editFormData.slug ?? "").replace(/-s\d+$/, "");
        for (let i = 0; i < managingGroup.products.length; i++) {
          const p = managingGroup.products[i];
          const uniqueSlug = i === 0 ? baseSlug : `${baseSlug}-s${p.sellerId}`;
          const payload = { ...editFormData, slug: uniqueSlug, platformType: PlatformType.HotBox, sellerId: p.sellerId };
          const resp = await apiPut(`${API_ENDPOINTS.PRODUCT}/admin/${p.id}`, payload);
          if (resp.isError) throw new Error(resp.errorData?.displayMessage ?? "Failed to update product info");
        }
      }
      // Save single variant if exists
      if (selectedSellerProduct && variants.length === 1) {
        const sv = variants[0];
        if (Number(singleVariantForm.discountedPrice) > 0 && Number(singleVariantForm.discountedPrice) >= Number(singleVariantForm.price)) throw new Error("Offer Price must be less than Price");
        const { unitId: selUnitId, unitQuantity: selQty, ...rest } = singleVariantForm as Record<string, unknown>;
        const payload = { ...rest, productId: sv.productId, platformType: PlatformType.HotBox };
        const r = await apiPut(`${API_ENDPOINTS.PRODUCT_VARIANT}/admin/${sv.id}`, payload);
        if (r.isError) throw new Error(r.errorData?.displayMessage ?? "Failed to update variant");
        if (selUnitId && Number(selUnitId) > 0) {
          if ((sv as ProductVariant & { productUnitId?: number }).productUnitId) {
            await apiDelete(`${API_ENDPOINTS.PRODUCT_UNIT}/${(sv as ProductVariant & { productUnitId?: number }).productUnitId}`).catch(() => {});
          }
          await apiPost(API_ENDPOINTS.PRODUCT_UNIT, { productVariantId: sv.id, unitId: Number(selUnitId), quantity: Number(selQty) || 1 }).catch(() => {});
        }
      }
      // Refresh
      await loadProducts();
      if (managingGroup) {
        const freshResp = await apiGet<HotBoxProduct[]>(`${API_ENDPOINTS.PRODUCT}?platformType=${PlatformType.HotBox}&skip=0&top=500`);
        const freshProducts = freshResp.successData ?? [];
        const key = `${(editFormData.name as string || managingGroup.name).toLowerCase().trim()}__${editFormData.categoryId ?? managingGroup.categoryId}`;
        const freshGroup = freshProducts.filter((p) => `${p.name.toLowerCase().trim()}__${p.categoryId}` === key);
        if (freshGroup.length > 0) {
          setManagingGroup({ key, name: freshGroup[0].name, categoryId: freshGroup[0].categoryId, categoryName: freshGroup[0].categoryName, taxPercentage: freshGroup[0].taxPercentage, tags: freshGroup[0].tags, products: freshGroup });
        }
      }
      if (selectedSellerProduct) await loadVariants(selectedSellerProduct.id);
      const { toast: t } = await import("sonner"); t.success("All changes saved!");
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : "Failed to save");
    } finally { setEditSaving(false); }
  }

  /* Edit product info (updates all copies in the group) */
  async function handleEditSave() {
    if (!managingGroup) return;
    setEditSaving(true); setEditError(null);
    try {
      const baseSlug = String(editFormData.slug ?? "").replace(/-s\d+$/, "");
      for (let i = 0; i < managingGroup.products.length; i++) {
        const p = managingGroup.products[i];
        const uniqueSlug = i === 0 ? baseSlug : `${baseSlug}-s${p.sellerId}`;
        const payload = { ...editFormData, slug: uniqueSlug, platformType: PlatformType.HotBox, sellerId: p.sellerId };
        const resp = await apiPut(`${API_ENDPOINTS.PRODUCT}/admin/${p.id}`, payload);
        if (resp.isError) throw new Error(resp.errorData?.displayMessage ?? "Failed to update");
      }
      await loadProducts();
      // Refresh the managing group
      const freshResp = await apiGet<HotBoxProduct[]>(`${API_ENDPOINTS.PRODUCT}?platformType=${PlatformType.HotBox}&skip=0&top=500`);
      const freshProducts = freshResp.successData ?? [];
      const key = `${(editFormData.name as string || managingGroup.name).toLowerCase().trim()}__${editFormData.categoryId ?? managingGroup.categoryId}`;
      const freshGroup = freshProducts.filter((p) => `${p.name.toLowerCase().trim()}__${p.categoryId}` === key);
      if (freshGroup.length > 0) {
        const g: ProductGroup = { key, name: freshGroup[0].name, categoryId: freshGroup[0].categoryId, categoryName: freshGroup[0].categoryName, taxPercentage: freshGroup[0].taxPercentage, tags: freshGroup[0].tags, products: freshGroup };
        setManagingGroup(g);
      }
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : "Failed to update");
    } finally { setEditSaving(false); }
  }

  /* Add sellers to group */
  async function handleAddSellers() {
    if (!managingGroup || addSellerIds.length === 0) return;
    setAddSellerSaving(true);
    try {
      const ref = managingGroup.products[0];
      const resp = await apiPost(`${API_ENDPOINTS.PRODUCT}/admin`, {
        product: { name: ref.name, slug: ref.slug, categoryId: ref.categoryId, taxPercentage: ref.taxPercentage, platformType: PlatformType.HotBox },
        sellerIds: addSellerIds,
      });
      if (resp.isError) throw new Error(resp.errorData?.displayMessage ?? "Failed");
      setAddSellerOpen(false); setAddSellerIds([]);
      await loadProducts();
      // Refresh group
      const freshResp = await apiGet<HotBoxProduct[]>(`${API_ENDPOINTS.PRODUCT}?platformType=${PlatformType.HotBox}&skip=0&top=500`);
      const fp = freshResp.successData ?? [];
      const matching = fp.filter((p) => p.name.toLowerCase().trim() === ref.name.toLowerCase().trim() && p.categoryId === ref.categoryId);
      if (matching.length > 0) {
        setManagingGroup({ key: managingGroup.key, name: matching[0].name, categoryId: matching[0].categoryId, categoryName: matching[0].categoryName, taxPercentage: matching[0].taxPercentage, tags: matching[0].tags, products: matching });
      }
    } catch { /* empty */ } finally { setAddSellerSaving(false); }
  }

  /* Remove a seller from group */
  async function removeSeller(p: HotBoxProduct) {
    if (!managingGroup) return;
    if (managingGroup.products.length <= 1) return; // can't remove the last one
    try {
      // Delete all variants of this product first (backend blocks delete if variants exist)
      const vResp = await apiGet<ProductVariant[]>(`${API_ENDPOINTS.PRODUCT_VARIANT}/product/${p.id}`);
      for (const v of vResp.successData ?? []) {
        await apiDelete(`${API_ENDPOINTS.PRODUCT_VARIANT}/admin/${v.id}`);
      }
      await apiDelete(`${API_ENDPOINTS.PRODUCT}/admin/${p.id}`);
      await loadProducts();
      const remaining = managingGroup.products.filter((x) => x.id !== p.id);
      setManagingGroup({ ...managingGroup, products: remaining });
      if (selectedSellerProduct?.id === p.id) {
        setSelectedSellerProduct(remaining[0] ?? null);
        if (remaining[0]) { loadVariants(remaining[0].id); initAddonsForProduct(remaining[0].id); }
        else { setVariants([]); setAddonLinks([]); setAddonProductId(null); }
      }
    } catch { /* empty */ }
  }

  /* ═══════════ Variants ═══════════ */

  const loadVariants = useCallback(async (productId: number) => {
    setVariantsLoading(true);
    try {
      const r = await apiGet<ProductVariant[]>(`${API_ENDPOINTS.PRODUCT_VARIANT}/product/${productId}`);
      const vList = r.successData ?? [];
      const enriched = await Promise.all(vList.map(async (v) => {
        try {
          const pu = await apiGet<ProductUnitItem>(`${API_ENDPOINTS.PRODUCT_UNIT}/variant/${v.id}`);
          if (pu.successData) {
            return { ...v, unitName: pu.successData.unitName, unitId: pu.successData.unitId, unitQuantity: pu.successData.quantity, productUnitId: pu.successData.id };
          }
        } catch { /* no unit assigned */ }
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

  function openCreateVariant() {
    if (!selectedSellerProduct) return;
    setEditingVariant(null); setVariantForm({ productId: selectedSellerProduct.id, indicator: "Veg" }); setVariantError(null); setVariantDialog(true);
  }
  function openEditVariant(v: ProductVariant) {
    setEditingVariant(v);
    setVariantForm({ productId: v.productId, name: v.name, indicator: v.indicator, price: v.price, discountedPrice: v.discountedPrice || 0, stock: v.stock, totalAllowedQuantity: v.totalAllowedQuantity || 0, isCodAllowed: v.isCodAllowed ?? true, description: v.description ?? "", imageBase64: v.imageBase64 ?? "", unitId: v.unitId ?? "", unitQuantity: v.unitQuantity ?? 1 });
    setVariantError(null); setVariantDialog(true);
  }

  async function handleVariantSubmit(e: React.FormEvent) {
    e.preventDefault(); if (!selectedSellerProduct) return;
    setVariantSaving(true); setVariantError(null);
    try {
      if (Number(variantForm.discountedPrice) > 0 && Number(variantForm.discountedPrice) >= Number(variantForm.price)) throw new Error("Offer Price must be less than Price");
      const { unitId: selUnitId, unitQuantity: selQty, ...rest } = variantForm as Record<string, unknown>;
      const payload = { ...rest, platformType: PlatformType.HotBox };
      let variantId: number | null = null;

      if (editingVariant) {
        const r = await apiPut(`${API_ENDPOINTS.PRODUCT_VARIANT}/admin/${editingVariant.id}`, payload);
        if (r.isError) throw new Error(r.errorData?.displayMessage ?? "Failed");
        variantId = editingVariant.id;
      } else {
        const r = await apiPost<unknown, { id: number }>(`${API_ENDPOINTS.PRODUCT_VARIANT}/admin`, payload);
        if (r.isError) throw new Error(r.errorData?.displayMessage ?? "Failed");
        variantId = r.successData?.id ?? null;
      }

      if (variantId && selUnitId && Number(selUnitId) > 0) {
        if (editingVariant && (editingVariant as ProductVariant & { productUnitId?: number }).productUnitId) {
          await apiDelete(`${API_ENDPOINTS.PRODUCT_UNIT}/${(editingVariant as ProductVariant & { productUnitId?: number }).productUnitId}`).catch(() => {});
        }
        await apiPost(API_ENDPOINTS.PRODUCT_UNIT, { productVariantId: variantId, unitId: Number(selUnitId), quantity: Number(selQty) || 1 }).catch(() => {});
      }

      setVariantDialog(false); await loadVariants(selectedSellerProduct.id);
    } catch (err: unknown) { setVariantError(err instanceof Error ? err.message : "Failed"); } finally { setVariantSaving(false); }
  }

  async function handleDeleteVariant() {
    if (deleteVariantId === null || !selectedSellerProduct) return;
    setDeletingVariant(true);
    try { await apiDelete(`${API_ENDPOINTS.PRODUCT_VARIANT}/admin/${deleteVariantId}`); setDeleteVariantId(null); await loadVariants(selectedSellerProduct.id); }
    catch { /* empty */ } finally { setDeletingVariant(false); }
  }

  /* ═══════════ Single Variant Inline Edit ═══════════ */

  function handleSVField(key: string, value: unknown) { setSingleVariantForm((prev) => ({ ...prev, [key]: value })); }

  async function handleSingleVariantSave() {
    if (!selectedSellerProduct || variants.length !== 1) return;
    const sv = variants[0];
    setSingleVariantSaving(true); setSingleVariantError(null);
    try {
      const { unitId: selUnitId, unitQuantity: selQty, ...rest } = singleVariantForm as Record<string, unknown>;
      const payload = { ...rest, productId: sv.productId, platformType: PlatformType.HotBox };
      const r = await apiPut(`${API_ENDPOINTS.PRODUCT_VARIANT}/admin/${sv.id}`, payload);
      if (r.isError) throw new Error(r.errorData?.displayMessage ?? "Failed");

      if (selUnitId && Number(selUnitId) > 0) {
        if ((sv as ProductVariant & { productUnitId?: number }).productUnitId) {
          await apiDelete(`${API_ENDPOINTS.PRODUCT_UNIT}/${(sv as ProductVariant & { productUnitId?: number }).productUnitId}`).catch(() => {});
        }
        await apiPost(API_ENDPOINTS.PRODUCT_UNIT, { productVariantId: sv.id, unitId: Number(selUnitId), quantity: Number(selQty) || 1 }).catch(() => {});
      }
      await loadVariants(selectedSellerProduct.id);
    } catch (err: unknown) { setSingleVariantError(err instanceof Error ? err.message : "Failed"); } finally { setSingleVariantSaving(false); }
  }

  /* ═══════════ Units Helper ═══════════ */

  async function handleCreateUnit() {
    if (!newUnitName.trim() || !newUnitShortCode.trim()) return;
    setNewUnitSaving(true);
    try {
      const r = await apiPost<unknown, { boolResponse: boolean }>(API_ENDPOINTS.UNIT, { name: newUnitName.trim(), shortCode: newUnitShortCode.trim() });
      if (r.isError) throw new Error(r.errorData?.displayMessage ?? "Failed");
      const refreshed = await apiGet<UnitItem[]>(`${API_ENDPOINTS.UNIT}?skip=0&top=200`);
      setUnits(refreshed.successData ?? []);
      setNewUnitOpen(false); setNewUnitName(""); setNewUnitShortCode("");
    } catch { /* empty */ } finally { setNewUnitSaving(false); }
  }

  /* ═══════════ Toppings ═══════════ */

  async function openToppings() {
    if (!selectedSellerProduct) return;
    setToppingsOpen(true); setToppingsLoading(true); setToppingError(null);
    setAddToppingId(null); setAddToppingPrice(""); setAddToppingDefault(false);
    try {
      const [a, b] = await Promise.all([
        apiGet<ToppingItem[]>(`${API_ENDPOINTS.TOPPING}/active`),
        apiGet<ProductTopping[]>(`${API_ENDPOINTS.PRODUCT_TOPPING}/product/${selectedSellerProduct.id}`),
      ]);
      setAllToppings(a.successData ?? []); setProductToppings(b.successData ?? []);
    } catch { setAllToppings([]); setProductToppings([]); } finally { setToppingsLoading(false); }
  }

  async function handleAddTopping() {
    if (!selectedSellerProduct || !addToppingId) return;
    setToppingSaving(true); setToppingError(null);
    try {
      await apiPost(API_ENDPOINTS.PRODUCT_TOPPING, { productId: selectedSellerProduct.id, toppingId: addToppingId, price: parseFloat(addToppingPrice) || 0, isDefault: addToppingDefault });
      const r = await apiGet<ProductTopping[]>(`${API_ENDPOINTS.PRODUCT_TOPPING}/product/${selectedSellerProduct.id}`);
      setProductToppings(r.successData ?? []); setAddToppingId(null); setAddToppingPrice(""); setAddToppingDefault(false);
    } catch (err: unknown) { setToppingError(err instanceof Error ? err.message : "Failed"); } finally { setToppingSaving(false); }
  }

  async function handleRemoveTopping() {
    if (deleteToppingId === null || !selectedSellerProduct) return;
    try {
      await apiDelete(`${API_ENDPOINTS.PRODUCT_TOPPING}/${deleteToppingId}`);
      const r = await apiGet<ProductTopping[]>(`${API_ENDPOINTS.PRODUCT_TOPPING}/product/${selectedSellerProduct.id}`);
      setProductToppings(r.successData ?? []);
    } catch { /* empty */ } finally { setDeleteToppingId(null); }
  }

  async function handleCreateNewTopping() {
    if (!newToppingName.trim()) return;
    setNewToppingSaving(true); setToppingError(null);
    try {
      const r = await apiPost<unknown, { boolResponse: boolean }>(API_ENDPOINTS.TOPPING, { name: newToppingName.trim(), price: parseFloat(newToppingPrice) || 0 });
      if (r.isError) throw new Error(r.errorData?.displayMessage ?? "Failed to create topping");
      const refreshed = await apiGet<ToppingItem[]>(`${API_ENDPOINTS.TOPPING}/active`);
      setAllToppings(refreshed.successData ?? []);
      setNewToppingName(""); setNewToppingPrice(""); setNewToppingOpen(false);
      const { toast: t } = await import("sonner"); t.success("Topping created!");
    } catch (err: unknown) { setToppingError(err instanceof Error ? err.message : "Failed to create"); } finally { setNewToppingSaving(false); }
  }

  const assignedToppingIds = new Set(productToppings.map((pt) => pt.toppingId));
  const availableToppings = allToppings.filter((t) => !assignedToppingIds.has(t.id));

  /* ═══════════ Add-ons (category-based, product-level) ═══════════ */

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
      const catProds = products.filter((p) => p.categoryId === catId);
      const assignedNames = new Set(addonLinks.map((a) => a.addonProductName));
      const available = catProds
        .filter((p) => p.id !== selectedSellerProduct?.id && !assignedNames.has(p.name))
        .map((p) => ({ productId: p.id, productName: p.name }));
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

  /* ═══════════ RENDER ═══════════ */

  /* ─── MANAGE GROUP VIEW ─── */
  if (managingGroup) {
    const assignedSellerIds = new Set(managingGroup.products.map((p) => p.sellerId));
    const unassignedSellers = sellers.filter((s) => !assignedSellerIds.has(s.id));
    const lowestPrice = variants.length > 0 ? Math.min(...variants.map((v) => v.price)) : null;

    return (
      <div className="space-y-6">
        {/* ─── Header ─── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-slate-100" onClick={closeManage}><ArrowLeft className="h-4 w-4" /></Button>
            <div>
              <h1 className="text-xl font-bold tracking-tight">{managingGroup.name}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant="outline" className="text-xs font-normal">{managingGroup.categoryName ?? "—"}</Badge>
                {lowestPrice !== null && <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-medium">From {formatCurrency(lowestPrice)}</Badge>}
                <Badge variant="secondary" className="text-xs">{variants.length} variant{variants.length !== 1 ? "s" : ""}</Badge>
              </div>
            </div>
          </div>
          {selectedSellerProduct && (
            <Button size="sm" onClick={handleSaveAll} disabled={editSaving} className="px-5">
              {editSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Changes
            </Button>
          )}
        </div>

        {editError && <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">{editError}</div>}
        {singleVariantError && <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">{singleVariantError}</div>}

        {/* ─── Sellers Row ─── */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Seller</span>
          {managingGroup.products.map((p) => (
            <button key={p.id} type="button" className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${selectedSellerProduct?.id === p.id ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted hover:bg-muted/80 text-foreground"}`} onClick={() => selectSeller(p)}>
              {sellerMap[p.sellerId] ?? `#${p.sellerId}`}
              {managingGroup.products.length > 1 && (
                <span className="ml-1.5 inline-flex" onClick={(e) => { e.stopPropagation(); removeSeller(p); }}>
                  <X className="h-3 w-3 opacity-60 hover:opacity-100" />
                </span>
              )}
            </button>
          ))}
          {unassignedSellers.length > 0 && (
            <Button size="sm" variant="ghost" className="h-8 rounded-full text-xs text-muted-foreground" onClick={() => { setAddSellerIds([]); setAddSellerOpen(true); }}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add
            </Button>
          )}
        </div>

        {selectedSellerProduct && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* ═══ LEFT COLUMN: Product Info + Variant ═══ */}
            <div className="lg:col-span-3 space-y-6">
              {/* Product Info */}
              <Card className="border shadow-none">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center gap-2 pb-1 border-b">
                    <Pencil className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-sm font-semibold">Product Info</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                      <Label className="text-xs text-muted-foreground">Tax %</Label>
                      <Input className="h-9" type="number" step="0.01" value={String(editFormData.taxPercentage ?? "")} onChange={(e) => setEditFormData((p) => ({ ...p, taxPercentage: Number(e.target.value) }))} />
                    </div>
                  </div>
                  <TagPicker label="Tags" value={String(editFormData.tags ?? "")} onChange={(v) => setEditFormData((p) => ({ ...p, tags: v }))} />
                </CardContent>
              </Card>

              {/* Variant(s) */}
              <Card className="border shadow-none overflow-hidden">
                <CardContent className="p-0">
                  {variantsLoading ? (
                    <div className="p-5 space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}</div>
                  ) : variants.length === 0 ? (
                    <div className="py-14 text-center">
                      <Package className="h-8 w-8 mx-auto text-slate-300 mb-3" />
                      <p className="text-sm font-medium text-slate-600">No variants yet</p>
                      <p className="text-xs text-slate-400 mt-1 mb-4">Add variants like Half, Full, Small, Medium</p>
                      <Button size="sm" onClick={openCreateVariant}><Plus className="h-4 w-4 mr-1" /> Add Variant</Button>
                    </div>
                  ) : variants.length === 1 ? (
                    <div className="p-5 space-y-4">
                      <div className="flex items-center gap-2 pb-1 border-b">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <h3 className="text-sm font-semibold">Pricing & Details</h3>
                      </div>
                      <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Food Type</Label>
                        <select className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm" value={String(singleVariantForm.indicator ?? "Veg")} onChange={(e) => handleSVField("indicator", e.target.value)}>
                          <option value="Veg">Veg</option><option value="NonVeg">Non-Veg</option>
                        </select>
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
                        <Label className="text-xs text-muted-foreground flex items-center gap-1.5"><Ruler className="h-3 w-3" /> Serving Unit</Label>
                        <div className="flex items-center gap-2">
                          <select className="flex h-9 flex-1 rounded-md border border-input bg-background px-3 py-1 text-sm" value={String(singleVariantForm.unitId ?? "")} onChange={(e) => handleSVField("unitId", e.target.value ? Number(e.target.value) : "")}>
                            <option value="">No unit</option>
                            {units.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.shortCode})</option>)}
                          </select>
                          <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0" title="Create new unit" onClick={() => { setNewUnitOpen(true); setNewUnitName(""); setNewUnitShortCode(""); }}>
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
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
                        {singleVariantForm.imageBase64 ? (<div className="flex items-center gap-3 mt-2"><img src={`data:image/jpeg;base64,${singleVariantForm.imageBase64}`} alt="" className="h-14 w-14 rounded-lg object-cover border" /><Button type="button" variant="ghost" size="sm" className="text-destructive text-xs h-7" onClick={() => handleSVField("imageBase64", "")}>Remove</Button></div>) : null}
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
                            <TableHead className="w-12 pl-5">ID</TableHead><TableHead>Name</TableHead><TableHead>Unit</TableHead><TableHead>Type</TableHead>
                            <TableHead>Price</TableHead><TableHead>Offer</TableHead><TableHead>Stock</TableHead>
                            <TableHead>Status</TableHead><TableHead className="text-right pr-5">Actions</TableHead>
                          </TableRow></TableHeader>
                          <TableBody>
                            {variants.map((v) => (
                              <TableRow key={v.id}>
                                <TableCell className="text-xs text-muted-foreground pl-5">{v.id}</TableCell>
                                <TableCell className="font-medium text-sm">{v.name}</TableCell>
                                <TableCell className="text-sm">{v.unitName ? <Badge variant="outline" className="text-xs"><Ruler className="h-3 w-3 mr-1" />{v.unitName}</Badge> : <span className="text-muted-foreground text-xs">—</span>}</TableCell>
                                <TableCell><StatusBadge status={v.indicator} /></TableCell>
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

            {/* ═══ RIGHT COLUMN: Toppings + Add-ons ═══ */}
            <div className="lg:col-span-2 space-y-6">
              {/* Toppings */}
              <Card className="border shadow-none">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center justify-between pb-1 border-b">
                    <h3 className="text-sm font-semibold flex items-center gap-2"><ChefHat className="h-4 w-4 text-amber-500" /> Toppings</h3>
                    {productToppings.length > 0 && <Badge variant="secondary" className="text-xs">{productToppings.length}</Badge>}
                  </div>

                  {toppingsLoading ? (
                    <div className="space-y-2">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-8 w-full rounded-lg" />)}</div>
                  ) : productToppings.length > 0 ? (
                    <div className="space-y-1.5">
                      {productToppings.map((pt) => (
                        <div key={pt.id} className="group flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 hover:bg-muted/60 transition-colors">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-sm font-medium truncate">{pt.toppingName}</span>
                            <span className="text-xs text-muted-foreground shrink-0">{formatCurrency(pt.price)}</span>
                            {pt.isDefault && <span className="text-[10px] font-medium text-blue-600 bg-blue-50 rounded px-1.5 py-0.5 shrink-0">Default</span>}
                          </div>
                          <button type="button" className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive/70 hover:text-destructive" onClick={() => setDeleteToppingId(pt.id)}>
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground py-2">No toppings yet</p>
                  )}

                  {toppingError && <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive">{toppingError}</div>}

                  <div className="space-y-2 pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground">Add Topping</Label>
                      <Button type="button" variant="ghost" size="sm" className="h-6 text-xs text-muted-foreground px-2" onClick={() => setNewToppingOpen(!newToppingOpen)}>
                        <Plus className="h-3 w-3 mr-1" /> New
                      </Button>
                    </div>

                    {newToppingOpen && (
                      <div className="rounded-lg border border-dashed p-3 space-y-2 bg-amber-50/50">
                        <p className="text-xs font-medium">Create New Topping</p>
                        <div className="flex items-center gap-2">
                          <Input className="h-9 flex-1" placeholder="Topping name" value={newToppingName} onChange={(e) => setNewToppingName(e.target.value)} />
                          <Input className="h-9 w-24" type="number" step="0.01" placeholder="Price" value={newToppingPrice} onChange={(e) => setNewToppingPrice(e.target.value)} />
                          <Button size="sm" className="h-9 shrink-0" disabled={!newToppingName.trim() || newToppingSaving} onClick={handleCreateNewTopping}>{newToppingSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Create"}</Button>
                        </div>
                      </div>
                    )}

                    {availableToppings.length > 0 ? (
                      <>
                        <select className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm" value={addToppingId ?? ""} onChange={(e) => { const v = e.target.value ? Number(e.target.value) : null; setAddToppingId(v); const tp = availableToppings.find((x) => x.id === v); if (tp) setAddToppingPrice(String(tp.price ?? 0)); }}>
                          <option value="">Select topping...</option>
                          {availableToppings.map((t) => <option key={t.id} value={t.id}>{t.name} ({formatCurrency(t.price)})</option>)}
                        </select>
                        {addToppingId && (
                          <div className="flex items-center gap-2">
                            <Input className="h-9 flex-1" type="number" step="0.01" placeholder="Price" value={addToppingPrice} onChange={(e) => setAddToppingPrice(e.target.value)} />
                            <div className="flex items-center gap-1.5 shrink-0"><input type="checkbox" id="tp-inline-def" checked={addToppingDefault} onChange={(e) => setAddToppingDefault(e.target.checked)} className="rounded" /><Label htmlFor="tp-inline-def" className="text-xs">Default</Label></div>
                            <Button size="sm" className="h-9 shrink-0" disabled={toppingSaving} onClick={handleAddTopping}>{toppingSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Add"}</Button>
                          </div>
                        )}
                      </>
                    ) : !toppingsLoading && allToppings.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No toppings exist yet. Create one above.</p>
                    ) : !toppingsLoading ? (
                      <p className="text-xs text-muted-foreground">All toppings already assigned.</p>
                    ) : null}
                  </div>
                </CardContent>
              </Card>

              {/* Add-ons */}
              <Card className="border shadow-none">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center justify-between pb-1 border-b">
                    <h3 className="text-sm font-semibold flex items-center gap-2"><Package className="h-4 w-4 text-indigo-500" /> Add-ons</h3>
                    {addonLinks.length > 0 && <Badge variant="secondary" className="text-xs">{addonLinks.length}</Badge>}
                  </div>

                  {addonsLoading ? (
                    <div className="space-y-2">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-8 w-full rounded-lg" />)}</div>
                  ) : addonsByCategory.length > 0 ? (
                    <div className="space-y-3">
                      {addonsByCategory.map((group) => {
                        const catName = categories.find((c) => c.id === group.categoryId)?.name ?? `Category #${group.categoryId}`;
                        return (
                          <div key={group.categoryId} className="space-y-1.5">
                            <p className="text-xs font-medium text-muted-foreground">{catName} <span className="text-muted-foreground/60">({group.links.length})</span></p>
                            <div className="flex flex-wrap gap-1.5">
                              {group.links.map((a) => (
                                <span key={a.id} className="group inline-flex items-center gap-1 rounded-md bg-indigo-50 text-indigo-700 px-2.5 py-1 text-xs font-medium">
                                  {a.addonProductName ?? `#${a.addonProductId}`}
                                  <button type="button" className="opacity-0 group-hover:opacity-100 transition-opacity text-indigo-400 hover:text-destructive" onClick={() => setDeleteAddonId(a.id)}><X className="h-3 w-3" /></button>
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground py-2">No add-ons yet</p>
                  )}

                  {addonError && <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive">{addonError}</div>}

                  <div className="space-y-2 pt-2 border-t">
                    <Label className="text-xs text-muted-foreground">Add from Category</Label>
                    <select className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm" value={addonCatId ?? ""} onChange={(e) => handleAddonCategorySelect(e.target.value ? Number(e.target.value) : null)}>
                      <option value="">Select a category...</option>
                      {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>

                    {addonCatLoading && <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading...</div>}
                    {!addonCatLoading && addonCatId && addonCatProducts.length === 0 && <p className="text-xs text-muted-foreground">No available products.</p>}

                    {!addonCatLoading && addonCatProducts.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 border-b pb-2">
                          <Checkbox id="addon-select-all" checked={addonChecked.size === addonCatProducts.length && addonCatProducts.length > 0} onCheckedChange={toggleAddonSelectAll} />
                          <Label htmlFor="addon-select-all" className="text-xs font-medium cursor-pointer">Select All ({addonCatProducts.length})</Label>
                        </div>
                        <div className="max-h-40 overflow-y-auto space-y-0.5">
                          {addonCatProducts.map((cp) => (
                            <div key={cp.productId} className="flex items-center gap-2 py-1 rounded px-1 hover:bg-muted/40 transition-colors">
                              <Checkbox id={`addon-${cp.productId}`} checked={addonChecked.has(cp.productId)} onCheckedChange={() => toggleAddonCheck(cp.productId)} />
                              <Label htmlFor={`addon-${cp.productId}`} className="text-xs cursor-pointer flex-1">{cp.productName}</Label>
                            </div>
                          ))}
                        </div>
                        <Button size="sm" className="h-8 text-xs w-full" disabled={addonChecked.size === 0 || addonSaving} onClick={handleBatchAddAddons}>
                          {addonSaving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                          Add {addonChecked.size > 0 ? `${addonChecked.size} Add-on${addonChecked.size > 1 ? "s" : ""}` : "Selected"}
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Add Variant (shown when single variant) */}
              {variants.length === 1 && (
                <Button size="sm" variant="outline" className="w-full" onClick={openCreateVariant}><Plus className="h-3.5 w-3.5 mr-1" /> Add Another Variant</Button>
              )}
            </div>
          </div>
        )}

        {/* ── Dialogs ── */}
        {/* Variant Dialog */}
        <Dialog open={variantDialog} onOpenChange={setVariantDialog}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editingVariant ? "Edit Variant" : "Add Variant"}</DialogTitle></DialogHeader>
            <form onSubmit={handleVariantSubmit} className="space-y-4">
              {variantError && <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">{variantError}</div>}
              <div className="space-y-2"><Label>Variant Name *</Label><Input required placeholder="e.g. Half, Full" value={String(variantForm.name ?? "")} onChange={(e) => handleVField("name", e.target.value)} /></div>
              <div className="space-y-2"><Label>Food Type *</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required value={String(variantForm.indicator ?? "Veg")} onChange={(e) => handleVField("indicator", e.target.value)}>
                  <option value="Veg">Veg</option><option value="NonVeg">Non-Veg</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Price *</Label><Input type="number" step="0.01" required placeholder="0.00" value={String(variantForm.price ?? "")} onChange={(e) => handleVField("price", Number(e.target.value))} /></div>
                <div className="space-y-2"><Label>Offer Price</Label><Input type="number" step="0.01" placeholder="0.00" value={String(variantForm.discountedPrice ?? "")} onChange={(e) => handleVField("discountedPrice", Number(e.target.value))} />{Number(variantForm.discountedPrice) > 0 && Number(variantForm.discountedPrice) >= Number(variantForm.price) && <p className="text-xs text-destructive">Must be less than price</p>}</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Stock</Label><Input type="number" placeholder="0" value={String(variantForm.stock ?? "")} onChange={(e) => handleVField("stock", Number(e.target.value))} disabled={!!editingVariant} title={editingVariant ? "Manage stock from Inventory page" : ""} /></div>
                <div className="space-y-2"><Label>Max Allowed Qty</Label><Input type="number" placeholder="e.g. 5" value={String(variantForm.totalAllowedQuantity ?? "")} onChange={(e) => handleVField("totalAllowedQuantity", Number(e.target.value))} /><p className="text-xs text-muted-foreground">Max items per order</p></div>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div><p className="text-sm font-medium">Cash on Delivery</p><p className="text-xs text-muted-foreground">Allow COD for this product</p></div>
                <button type="button" role="switch" aria-checked={!!variantForm.isCodAllowed} className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${variantForm.isCodAllowed ? "bg-primary" : "bg-slate-200"}`} onClick={() => handleVField("isCodAllowed", !variantForm.isCodAllowed)}>
                  <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${variantForm.isCodAllowed ? "translate-x-5" : "translate-x-0"}`} />
                </button>
              </div>
              {/* Unit selection */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5"><Ruler className="h-3.5 w-3.5" /> Serving Unit</Label>
                <div className="flex items-center gap-2">
                  <select className="flex h-10 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm" value={String(variantForm.unitId ?? "")} onChange={(e) => handleVField("unitId", e.target.value ? Number(e.target.value) : "")}>
                    <option value="">No unit</option>
                    {units.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.shortCode})</option>)}
                  </select>
                  <Button type="button" variant="outline" size="icon" className="h-10 w-10 shrink-0" title="Create new unit" onClick={() => { setNewUnitOpen(true); setNewUnitName(""); setNewUnitShortCode(""); }}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {Number(variantForm.unitId) > 0 && (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Quantity</Label>
                    <Input type="number" step="0.01" min="0" placeholder="1" className="h-9" value={String(variantForm.unitQuantity ?? "")} onChange={(e) => handleVField("unitQuantity", Number(e.target.value))} />
                  </div>
                )}
              </div>
              <div className="space-y-2"><Label>Description</Label>
                <textarea className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder="Brief description" value={String(variantForm.description ?? "")} onChange={(e) => handleVField("description", e.target.value)} />
              </div>
              <div className="space-y-2"><Label>Image</Label>
                <input type="file" accept="image/*" className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium cursor-pointer"
                  onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = () => { const s = r.result as string; handleVField("imageBase64", s.includes(",") ? s.split(",")[1] : s); }; r.readAsDataURL(f); }} />
                {variantForm.imageBase64 ? (<div className="flex items-center gap-3 mt-2"><img src={`data:image/jpeg;base64,${variantForm.imageBase64}`} alt="" className="h-16 w-16 rounded-md object-cover border" /><Button type="button" variant="ghost" size="sm" className="text-destructive text-xs" onClick={() => handleVField("imageBase64", "")}>Remove</Button></div>) : null}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setVariantDialog(false)}>Cancel</Button>
                <Button type="submit" disabled={variantSaving}>{variantSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{editingVariant ? "Update" : "Create"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <ConfirmDialog open={deleteVariantId !== null} onOpenChange={(o) => !o && setDeleteVariantId(null)} title="Delete Variant" description="This will remove this variant permanently." confirmLabel="Delete" variant="destructive" loading={deletingVariant} onConfirm={handleDeleteVariant} />

        {/* Toppings Dialog */}
        <Dialog open={toppingsOpen} onOpenChange={setToppingsOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="flex items-center gap-2"><ChefHat className="h-5 w-5" /> Toppings — {sellerMap[selectedSellerProduct?.sellerId ?? 0] ?? ""}</DialogTitle></DialogHeader>
            {toppingsLoading ? <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div> : (
              <div className="space-y-6">
                {productToppings.length > 0 && (<div className="space-y-2"><Label className="text-sm font-medium">Assigned</Label><div className="space-y-1">
                  {productToppings.map((pt) => (<div key={pt.id} className="flex items-center justify-between rounded-lg border px-3 py-2"><div className="flex items-center gap-3"><span className="text-sm font-medium">{pt.toppingName}</span><Badge variant="outline" className="text-xs">{formatCurrency(pt.price)}</Badge>{pt.isDefault && <Badge className="bg-blue-100 text-blue-700 text-xs">Default</Badge>}</div><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteToppingId(pt.id)}><X className="h-3.5 w-3.5" /></Button></div>))}
                </div></div>)}
                <div className="space-y-3"><Label className="text-sm font-medium">Add Topping</Label>
                  {toppingError && <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">{toppingError}</div>}
                  {availableToppings.length === 0 ? <p className="text-sm text-slate-400">All toppings assigned or none exist.</p> : (
                    <div className="flex items-end gap-3 flex-wrap">
                      <div className="space-y-1 flex-1 min-w-[150px]"><select className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm" value={addToppingId ?? ""} onChange={(e) => { const v = e.target.value ? Number(e.target.value) : null; setAddToppingId(v); const tp = availableToppings.find((x) => x.id === v); if (tp) setAddToppingPrice(String(tp.price ?? 0)); }}><option value="">Select...</option>{availableToppings.map((t) => <option key={t.id} value={t.id}>{t.name} ({formatCurrency(t.price)})</option>)}</select></div>
                      <div className="w-28"><Input className="h-9" type="number" step="0.01" placeholder="0" value={addToppingPrice} onChange={(e) => setAddToppingPrice(e.target.value)} /></div>
                      <div className="flex items-center gap-2 pb-0.5"><input type="checkbox" id="tp-def" checked={addToppingDefault} onChange={(e) => setAddToppingDefault(e.target.checked)} className="rounded" /><Label htmlFor="tp-def" className="text-xs">Default</Label></div>
                      <Button size="sm" className="h-9" disabled={!addToppingId || toppingSaving} onClick={handleAddTopping}>{toppingSaving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />} Add</Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
        <ConfirmDialog open={deleteToppingId !== null} onOpenChange={(o) => !o && setDeleteToppingId(null)} title="Remove Topping" description="Remove this topping?" confirmLabel="Remove" variant="destructive" loading={false} onConfirm={handleRemoveTopping} />

        <ConfirmDialog open={deleteAddonId !== null} onOpenChange={(o) => !o && setDeleteAddonId(null)} title="Remove Add-on" description="Remove this add-on link?" confirmLabel="Remove" variant="destructive" loading={false} onConfirm={handleRemoveAddon} />

        {/* Add Seller Dialog */}
        <Dialog open={addSellerOpen} onOpenChange={setAddSellerOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Add Sellers</DialogTitle></DialogHeader>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {unassignedSellers.map((s) => (
                <div key={s.id} className="flex items-center gap-2">
                  <Checkbox id={`as-${s.id}`} checked={addSellerIds.includes(s.id)} onCheckedChange={() => setAddSellerIds((p) => p.includes(s.id) ? p.filter((x) => x !== s.id) : [...p, s.id])} />
                  <Label htmlFor={`as-${s.id}`} className="text-sm cursor-pointer">{s.businessName || s.name} (#{s.id})</Label>
                </div>
              ))}
              {unassignedSellers.length === 0 && <p className="text-sm text-slate-400">All sellers already assigned.</p>}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddSellerOpen(false)}>Cancel</Button>
              <Button disabled={addSellerIds.length === 0 || addSellerSaving} onClick={handleAddSellers}>
                {addSellerSaving && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Add {addSellerIds.length > 0 ? `(${addSellerIds.length})` : ""}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  /* ─── MAIN LIST VIEW ─── */
  return (
    <div className="space-y-6">
      <PageHeader title="HotBox Products" description="Manage food delivery products" actionLabel="Add Product" onAction={openCreate}>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search..." className="pl-9 w-52" value={search} onChange={(e) => setSearch(e.target.value)} />
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
                  <TableHead>Product Name</TableHead><TableHead>Category</TableHead>
                  <TableHead>Sellers</TableHead><TableHead>Tax %</TableHead>
                  <TableHead className="w-28 text-right">Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {filtered.map((g) => (
                    <TableRow key={g.key} className="hover:bg-slate-50">
                      <TableCell className="font-medium">{g.name}</TableCell>
                      <TableCell>{g.categoryName ?? "—"}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {g.products.map((p) => (
                            <Badge key={p.id} variant="outline" className="text-xs">{sellerMap[p.sellerId] ?? `#${p.sellerId}`}</Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>{g.taxPercentage != null ? `${g.taxPercentage}%` : "—"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openManageGroup(g)}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteGroup(g)}><Trash2 className="h-3.5 w-3.5" /></Button>
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

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Create Product</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            {formError && <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">{formError}</div>}
            <div className="space-y-2"><Label>Product Name *</Label><Input required placeholder="e.g. Chicken Biryani" value={String(formData.name ?? "")} onChange={(e) => handleField("name", e.target.value)} /></div>
            <div className="space-y-2"><Label>Slug</Label><Input placeholder="chicken-biryani" value={String(formData.slug ?? "")} onChange={(e) => handleField("slug", e.target.value)} /></div>
            <TagPicker label="Tags" value={String(formData.tags ?? "")} onChange={(v) => handleField("tags", v)} />
            <div className="space-y-2"><Label>Category *</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required value={String(formData.categoryId ?? "")} onChange={(e) => handleField("categoryId", Number(e.target.value))}>
                <option value="">Select...</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-2"><Label>Tax / GST %</Label><Input type="number" step="0.01" placeholder="0" value={String(formData.taxPercentage ?? "")} onChange={(e) => handleField("taxPercentage", Number(e.target.value))} /></div>

            {/* Has Variants toggle */}
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div><p className="text-sm font-medium">Has Variants?</p><p className="text-xs text-muted-foreground">Enable for sizes like Small, Medium. Disable for simple product.</p></div>
              <button type="button" role="switch" aria-checked={hasVariants} className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${hasVariants ? "bg-primary" : "bg-slate-200"}`} onClick={() => setHasVariants(!hasVariants)}>
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${hasVariants ? "translate-x-5" : "translate-x-0"}`} />
              </button>
            </div>

            {/* Inline variant when no variants */}
            {!hasVariants && (
              <div className="space-y-4 rounded-lg border p-4 bg-slate-50/50">
                <p className="text-sm font-semibold text-slate-700">Product Details</p>
                <div className="space-y-2"><Label>Food Type *</Label>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required value={String(inlineVariant.indicator ?? "Veg")} onChange={(e) => handleInlineField("indicator", e.target.value)}>
                    <option value="Veg">Veg</option><option value="NonVeg">Non-Veg</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Price *</Label><Input type="number" step="0.01" required placeholder="0.00" value={String(inlineVariant.price ?? "")} onChange={(e) => handleInlineField("price", Number(e.target.value))} /></div>
                  <div className="space-y-2"><Label>Offer Price</Label><Input type="number" step="0.01" placeholder="0.00" value={String(inlineVariant.discountedPrice ?? "")} onChange={(e) => handleInlineField("discountedPrice", Number(e.target.value))} />{Number(inlineVariant.discountedPrice) > 0 && Number(inlineVariant.discountedPrice) >= Number(inlineVariant.price) && <p className="text-xs text-destructive">Must be less than price</p>}</div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Stock</Label><Input type="number" placeholder="0" value={String(inlineVariant.stock ?? "")} onChange={(e) => handleInlineField("stock", Number(e.target.value))} /></div>
                  <div className="space-y-2"><Label>Max Allowed Qty</Label><Input type="number" placeholder="e.g. 5" value={String(inlineVariant.totalAllowedQuantity ?? "")} onChange={(e) => handleInlineField("totalAllowedQuantity", Number(e.target.value))} /><p className="text-xs text-muted-foreground">Max items per order</p></div>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div><p className="text-sm font-medium">Cash on Delivery</p><p className="text-xs text-muted-foreground">Allow COD for this product</p></div>
                  <button type="button" role="switch" aria-checked={inlineVariant.isCodAllowed !== false} className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${inlineVariant.isCodAllowed !== false ? "bg-primary" : "bg-slate-200"}`} onClick={() => handleInlineField("isCodAllowed", !(inlineVariant.isCodAllowed !== false))}>
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${inlineVariant.isCodAllowed !== false ? "translate-x-5" : "translate-x-0"}`} />
                  </button>
                </div>
                {/* Unit selection */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5"><Ruler className="h-3.5 w-3.5" /> Serving Unit</Label>
                  <div className="flex items-center gap-2">
                    <select className="flex h-9 flex-1 rounded-md border border-input bg-background px-3 py-1 text-sm" value={String(inlineVariant.unitId ?? "")} onChange={(e) => handleInlineField("unitId", e.target.value ? Number(e.target.value) : "")}>
                      <option value="">No unit</option>
                      {units.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.shortCode})</option>)}
                    </select>
                    <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0" title="Create new unit" onClick={() => { setNewUnitOpen(true); setNewUnitName(""); setNewUnitShortCode(""); }}>
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  {Number(inlineVariant.unitId) > 0 && (
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Quantity</Label>
                      <Input type="number" step="0.01" min="0" placeholder="1" className="h-9" value={String(inlineVariant.unitQuantity ?? "")} onChange={(e) => handleInlineField("unitQuantity", Number(e.target.value))} />
                    </div>
                  )}
                </div>
                <div className="space-y-2"><Label>Description</Label>
                  <textarea className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground" placeholder="Brief description" value={String(inlineVariant.description ?? "")} onChange={(e) => handleInlineField("description", e.target.value)} />
                </div>
                <div className="space-y-2"><Label>Image</Label>
                  <input type="file" accept="image/*" className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium cursor-pointer"
                    onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => { const s = rd.result as string; handleInlineField("imageBase64", s.includes(",") ? s.split(",")[1] : s); }; rd.readAsDataURL(f); }} />
                  {inlineVariant.imageBase64 ? (<div className="flex items-center gap-3 mt-2"><img src={`data:image/jpeg;base64,${inlineVariant.imageBase64}`} alt="" className="h-16 w-16 rounded-md object-cover border" /><Button type="button" variant="ghost" size="sm" className="text-destructive text-xs" onClick={() => handleInlineField("imageBase64", "")}>Remove</Button></div>) : null}
                </div>
                {/* Inline toppings */}
                <div className="space-y-3 pt-2 border-t">
                  <Label className="text-sm font-semibold">Toppings / Extras</Label>
                  {inlineToppings.length > 0 && <div className="space-y-1">{inlineToppings.map((t) => { const tp = inlineAllToppings.find((x) => x.id === t.toppingId); return (<div key={t.toppingId} className="flex items-center justify-between rounded-lg border px-3 py-2 bg-white"><div className="flex items-center gap-2"><span className="text-sm">{tp?.name ?? `#${t.toppingId}`}</span><Badge variant="outline" className="text-xs">{formatCurrency(t.price)}</Badge>{t.isDefault && <Badge className="bg-blue-100 text-blue-700 text-xs">Default</Badge>}</div><Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeInlineTopping(t.toppingId)}><X className="h-3.5 w-3.5" /></Button></div>); })}</div>}
                  {(() => { const used = new Set(inlineToppings.map((t) => t.toppingId)); const avail = inlineAllToppings.filter((t) => !used.has(t.id)); return avail.length > 0 ? (
                    <div className="flex items-end gap-2 flex-wrap">
                      <div className="flex-1 min-w-[120px]"><select className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm" value={inlineAddToppingId ?? ""} onChange={(e) => { const v = e.target.value ? Number(e.target.value) : null; setInlineAddToppingId(v); const tp = avail.find((x) => x.id === v); if (tp) setInlineAddToppingPrice(String(tp.price ?? 0)); }}><option value="">Select topping...</option>{avail.map((t) => <option key={t.id} value={t.id}>{t.name} ({formatCurrency(t.price)})</option>)}</select></div>
                      <div className="w-24"><Input className="h-9" type="number" step="0.01" placeholder="Price" value={inlineAddToppingPrice} onChange={(e) => setInlineAddToppingPrice(e.target.value)} /></div>
                      <div className="flex items-center gap-1.5 pb-0.5"><input type="checkbox" id="il-tp-d" checked={inlineAddToppingDefault} onChange={(e) => setInlineAddToppingDefault(e.target.checked)} className="rounded" /><Label htmlFor="il-tp-d" className="text-xs">Default</Label></div>
                      <Button type="button" size="sm" className="h-9" disabled={!inlineAddToppingId} onClick={addInlineTopping}>Add</Button>
                    </div>
                  ) : inlineAllToppings.length === 0 ? <p className="text-xs text-slate-400">No toppings created yet.</p> : null; })()}
                </div>

                {/* Inline add-ons */}
                <div className="space-y-3 pt-2 border-t">
                  <Label className="text-sm font-semibold">Add-ons</Label>
                  {inlineAddons.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {inlineAddons.map((a) => (
                        <div key={a.productId} className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs">
                          <span>{a.productName}</span>
                          <button type="button" className="text-destructive hover:text-destructive/80" onClick={() => removeInlineAddon(a.productId)}><X className="h-3 w-3" /></button>
                        </div>
                      ))}
                    </div>
                  )}
                  <select className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm" value={inlineAddonCatId ?? ""} onChange={(e) => handleInlineAddonCatSelect(e.target.value ? Number(e.target.value) : null)}>
                    <option value="">Select a category...</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  {inlineAddonCatLoading && <p className="text-xs text-muted-foreground">Loading...</p>}
                  {!inlineAddonCatLoading && inlineAddonCatId && inlineAddonCatProducts.length === 0 && <p className="text-xs text-muted-foreground">No products in this category.</p>}
                  {!inlineAddonCatLoading && inlineAddonCatProducts.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 border-b pb-1">
                        <Checkbox id="il-addon-all" checked={inlineAddonChecked.size === inlineAddonCatProducts.length && inlineAddonCatProducts.length > 0} onCheckedChange={() => { if (inlineAddonChecked.size === inlineAddonCatProducts.length) setInlineAddonChecked(new Set()); else setInlineAddonChecked(new Set(inlineAddonCatProducts.map((p) => p.productId))); }} />
                        <Label htmlFor="il-addon-all" className="text-xs font-medium cursor-pointer">Select All ({inlineAddonCatProducts.length})</Label>
                      </div>
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {inlineAddonCatProducts.map((cp) => (
                          <div key={cp.productId} className="flex items-center gap-2 py-0.5">
                            <Checkbox id={`il-addon-${cp.productId}`} checked={inlineAddonChecked.has(cp.productId)} onCheckedChange={() => { setInlineAddonChecked((prev) => { const n = new Set(prev); if (n.has(cp.productId)) n.delete(cp.productId); else n.add(cp.productId); return n; }); }} />
                            <Label htmlFor={`il-addon-${cp.productId}`} className="text-xs cursor-pointer">{cp.productName}</Label>
                          </div>
                        ))}
                      </div>
                      <Button type="button" size="sm" className="h-8 text-xs" disabled={inlineAddonChecked.size === 0} onClick={addInlineAddonsFromChecked}>
                        Add {inlineAddonChecked.size > 0 ? `${inlineAddonChecked.size} Add-on${inlineAddonChecked.size > 1 ? "s" : ""}` : "Selected"}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Seller multi-select */}
            <div className="space-y-3">
              <Label>Assign to Sellers *</Label>
              <div className="rounded-md border p-3 max-h-48 overflow-y-auto space-y-2">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <Checkbox id="sel-all" checked={selectAll} onCheckedChange={(c) => handleSelectAll(!!c)} />
                  <Label htmlFor="sel-all" className="text-sm font-semibold cursor-pointer">Select All ({sellers.length})</Label>
                </div>
                {sellers.map((s) => (<div key={s.id} className="flex items-center gap-2">
                  <Checkbox id={`s-${s.id}`} checked={selectedSellerIds.includes(s.id)} onCheckedChange={() => { toggleSeller(s.id); setSelectAll(false); }} />
                  <Label htmlFor={`s-${s.id}`} className="text-sm cursor-pointer">{s.businessName || s.name} <span className="text-xs text-muted-foreground">(#{s.id})</span></Label>
                </div>))}
                {sellers.length === 0 && <p className="text-sm text-muted-foreground">No sellers found</p>}
              </div>
              {selectedSellerIds.length > 0 && <p className="text-xs text-muted-foreground">{selectedSellerIds.length} seller{selectedSellerIds.length > 1 ? "s" : ""} selected</p>}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Group */}
      <ConfirmDialog open={deleteGroup !== null} onOpenChange={(o) => !o && setDeleteGroup(null)} title="Delete Product" description={`Delete "${deleteGroup?.name}" from all ${deleteGroup?.products.length ?? 0} seller(s)? This cannot be undone.`} confirmLabel="Delete All" variant="destructive" loading={deleting} onConfirm={handleDeleteGroup} />

      {/* Create New Unit Dialog */}
      <Dialog open={newUnitOpen} onOpenChange={setNewUnitOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Ruler className="h-5 w-5" /> Create New Unit</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Unit Name *</Label><Input required placeholder="e.g. Kilogram, Small, Piece" value={newUnitName} onChange={(e) => setNewUnitName(e.target.value)} /></div>
            <div className="space-y-2"><Label>Short Code *</Label><Input required placeholder="e.g. kg, S, pc" value={newUnitShortCode} onChange={(e) => setNewUnitShortCode(e.target.value)} /></div>
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
