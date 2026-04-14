"use client";

import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiGet, apiPut } from "@/lib/api-client";
import { API_ENDPOINTS } from "@/lib/constants";
import { formatCurrency } from "@/lib/format";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/shared/page-header";
import { SellerPicker, PickerSeller } from "@/components/shared/seller-picker";
import { Loader2, IndianRupee, Globe, Store, Package, Search, Pencil, ArrowRight } from "lucide-react";
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
  imageBase64: string | null;
  indicator: string | null;
}

interface AssignedSeller {
  id: number;
  title: string;
}

function IndicatorDot({ indicator }: { indicator: string | null }) {
  if (!indicator) return null;
  const c = indicator === "Veg" ? "bg-green-500" : indicator === "NonVeg" ? "bg-red-500" : "bg-yellow-500";
  return <span className={`inline-block h-2 w-2 rounded-sm ${c} shrink-0`} title={indicator} />;
}

function PlatformBadge({ type }: { type: string }) {
  return (
    <Badge variant="outline" className={`text-[11px] font-medium ${
      type === "HotBox" ? "border-orange-200 text-orange-600 bg-orange-50" : "border-blue-200 text-blue-600 bg-blue-50"
    }`}>
      {type}
    </Badge>
  );
}

export default function PriceManagementPage() {
  const [selectedSeller, setSelectedSeller] = useState<PickerSeller | null>(null);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [variantsLoading, setVariantsLoading] = useState(false);
  const [searchQ, setSearchQ] = useState("");

  const [priceVariant, setPriceVariant] = useState<ProductVariant | null>(null);
  const [priceMode, setPriceMode] = useState<"global" | "store">("global");
  const [assignedSellers, setAssignedSellers] = useState<AssignedSeller[]>([]);
  const [targetSellerId, setTargetSellerId] = useState<number | null>(null);
  const [newPrice, setNewPrice] = useState("");
  const [newDiscountedPrice, setNewDiscountedPrice] = useState("");
  const [updating, setUpdating] = useState(false);

  const loadSellerVariants = useCallback(async (seller: PickerSeller) => {
    setSelectedSeller(seller);
    setVariantsLoading(true);
    setSearchQ("");
    try {
      const resp = await apiGet<ProductVariant[]>(
        `${API_ENDPOINTS.PRODUCT_VARIANT}/seller/${seller.id}?skip=0&top=200`
      );
      setVariants(resp.successData ?? []);
    } catch {
      setVariants([]);
    } finally {
      setVariantsLoading(false);
    }
  }, []);

  async function openPriceDialog(variant: ProductVariant) {
    setPriceVariant(variant);
    setPriceMode("global");
    setTargetSellerId(null);
    setNewPrice(String(variant.price));
    setNewDiscountedPrice(String(variant.discountedPrice));
    try {
      const resp = await apiGet<AssignedSeller[]>(
        `${API_ENDPOINTS.PRODUCT_VARIANT}/associate-sellers?productVariantId=${variant.id}`
      );
      setAssignedSellers(resp.successData ?? []);
    } catch {
      setAssignedSellers([]);
    }
  }

  async function handleUpdatePrice() {
    if (!priceVariant) return;
    setUpdating(true);
    try {
      const effectivePrice = newPrice ? parseFloat(newPrice) : priceVariant.price;
      const effectiveDiscount = newDiscountedPrice ? parseFloat(newDiscountedPrice) : 0;
      if (effectiveDiscount > 0 && effectiveDiscount >= effectivePrice) { toast.error("Offer Price must be less than Price"); setUpdating(false); return; }
      const body: { productVariantId: number; price?: number; discountedPrice?: number; sellerId?: number } = {
        productVariantId: priceVariant.id,
      };
      if (newPrice) body.price = parseFloat(newPrice);
      if (newDiscountedPrice) body.discountedPrice = parseFloat(newDiscountedPrice);
      if (priceMode === "store" && targetSellerId) body.sellerId = targetSellerId;

      await apiPut<typeof body, { boolResponse: boolean; responseMessage: string }>(
        `${API_ENDPOINTS.PRODUCT_VARIANT}/price/bulk`,
        body
      );
      toast.success(priceMode === "global" ? "Price updated for all stores" : "Price updated for selected store");
      if (selectedSeller) await loadSellerVariants(selectedSeller);
      setPriceVariant(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update price");
    } finally {
      setUpdating(false);
    }
  }

  const displayed = searchQ
    ? variants.filter((v) => v.name.toLowerCase().includes(searchQ.toLowerCase()))
    : variants;

  const priceChanged = priceVariant && (
    parseFloat(newPrice) !== priceVariant.price ||
    parseFloat(newDiscountedPrice) !== priceVariant.discountedPrice
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Price Management"
        description="View and update product prices globally or per-store"
      />

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        <SellerPicker selected={selectedSeller} onSelect={loadSellerVariants} title="Select Seller" />

        <div className="space-y-4">
          {!selectedSeller ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="py-24 text-center">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                  <IndianRupee className="h-8 w-8 text-slate-300" />
                </div>
                <p className="text-lg font-semibold text-slate-600">Select a seller</p>
                <p className="text-sm text-slate-400 mt-1 max-w-xs mx-auto">
                  Pick a seller to see their product prices, then update globally or per-store
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Toolbar */}
              <Card className="border-0 shadow-sm">
                <CardContent className="py-3 flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <h2 className="font-semibold text-sm">{selectedSeller.storeName || selectedSeller.name}</h2>
                    <Badge variant="outline" className="text-xs font-normal">{variants.length} variants</Badge>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search products..."
                      className="pl-8 h-8 w-48 text-xs"
                      value={searchQ}
                      onChange={(e) => setSearchQ(e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Table */}
              <Card className="border-0 shadow-sm overflow-hidden">
                <CardContent className="p-0">
                  {variantsLoading ? (
                    <div className="p-6 space-y-3">
                      {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
                    </div>
                  ) : displayed.length === 0 ? (
                    <div className="py-20 text-center">
                      <Package className="h-10 w-10 mx-auto text-slate-200 mb-3" />
                      <p className="text-sm font-medium text-slate-500">
                        {variants.length === 0 ? "No product variants for this seller" : "No results match your search"}
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50/80">
                            <TableHead className="w-16 pl-4">Product</TableHead>
                            <TableHead></TableHead>
                            <TableHead>Platform</TableHead>
                            <TableHead className="text-right">Price</TableHead>
                            <TableHead className="text-right">Disc. Price</TableHead>
                            <TableHead className="text-center">Discount</TableHead>
                            <TableHead className="text-right">Stock</TableHead>
                            <TableHead className="text-right pr-4">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {displayed.map((v) => {
                            const hasDiscount = v.discountedPrice > 0 && v.discountedPrice < v.price;
                            const discountPct = hasDiscount ? Math.round(((v.price - v.discountedPrice) / v.price) * 100) : 0;
                            return (
                              <TableRow key={v.id} className="hover:bg-slate-50/50">
                                <TableCell className="pl-4">
                                  {v.imageBase64 ? (
                                    <img src={`data:image/png;base64,${v.imageBase64}`} alt="" className="h-10 w-10 rounded-lg object-cover border border-slate-200" />
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
                                <TableCell><PlatformBadge type={v.platformType} /></TableCell>
                                <TableCell className="text-right tabular-nums">
                                  <span className={`font-semibold ${hasDiscount ? "line-through text-slate-400 text-xs font-normal" : "text-slate-800"}`}>
                                    {formatCurrency(v.price)}
                                  </span>
                                </TableCell>
                                <TableCell className="text-right tabular-nums">
                                  {hasDiscount ? (
                                    <span className="font-semibold text-emerald-700">{formatCurrency(v.discountedPrice)}</span>
                                  ) : (
                                    <span className="text-slate-400">—</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-center">
                                  {hasDiscount ? (
                                    <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px]">
                                      -{discountPct}%
                                    </Badge>
                                  ) : (
                                    <span className="text-slate-400">—</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right tabular-nums">
                                  <span className={v.stock <= 0 ? "text-red-500 font-medium" : ""}>{v.stock}</span>
                                </TableCell>
                                <TableCell className="text-right pr-4">
                                  <Button size="sm" className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 shadow-sm" onClick={() => openPriceDialog(v)}>
                                    <Pencil className="h-3 w-3 mr-1" /> Edit Price
                                  </Button>
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
            </>
          )}
        </div>
      </div>

      {/* Price Update Dialog */}
      <Dialog open={!!priceVariant} onOpenChange={(o) => !o && setPriceVariant(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">Update Price</DialogTitle>
          </DialogHeader>

          {/* Product preview */}
          {priceVariant && (
            <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50">
              {priceVariant.imageBase64 ? (
                <img src={`data:image/png;base64,${priceVariant.imageBase64}`} alt="" className="h-12 w-12 rounded-lg object-cover border" />
              ) : (
                <div className="h-12 w-12 rounded-lg bg-white border flex items-center justify-center">
                  <Package className="h-5 w-5 text-slate-300" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-slate-800 truncate">{priceVariant.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-slate-500">ID: {priceVariant.id}</span>
                  <PlatformBadge type={priceVariant.platformType} />
                </div>
              </div>
            </div>
          )}

          <div className="space-y-5">
            {/* Scope */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Update Scope</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => { setPriceMode("global"); setTargetSellerId(null); }}
                  className={`flex items-center gap-2.5 rounded-xl border p-3 text-sm transition-all ${
                    priceMode === "global" ? "border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm shadow-indigo-100" : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <Globe className="h-4 w-4 shrink-0" />
                  <div className="text-left">
                    <p className="font-medium text-sm">All Stores</p>
                    <p className="text-[11px] text-muted-foreground">Update everywhere</p>
                  </div>
                </button>
                <button
                  onClick={() => setPriceMode("store")}
                  className={`flex items-center gap-2.5 rounded-xl border p-3 text-sm transition-all ${
                    priceMode === "store" ? "border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm shadow-indigo-100" : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <Store className="h-4 w-4 shrink-0" />
                  <div className="text-left">
                    <p className="font-medium text-sm">Specific Store</p>
                    <p className="text-[11px] text-muted-foreground">One seller only</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Store selector */}
            {priceMode === "store" && (
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">Select Store</Label>
                <select
                  className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={targetSellerId ?? ""}
                  onChange={(e) => setTargetSellerId(e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">Choose a store...</option>
                  {assignedSellers.map((s) => (
                    <option key={s.id} value={s.id}>{s.title} (ID: {s.id})</option>
                  ))}
                </select>
                {assignedSellers.length === 0 && (
                  <p className="text-xs text-amber-600">This variant hasn&apos;t been assigned to other stores yet.</p>
                )}
              </div>
            )}

            {/* Price inputs with current comparison */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">New Price</Label>
                <Input type="number" step="0.01" placeholder="0.00" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} />
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span>Current:</span>
                  <span className="font-medium">{priceVariant ? formatCurrency(priceVariant.price) : "—"}</span>
                  {priceVariant && parseFloat(newPrice) !== priceVariant.price && (
                    <>
                      <ArrowRight className="h-3 w-3" />
                      <span className="font-semibold text-indigo-600">{formatCurrency(parseFloat(newPrice) || 0)}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">New Discounted Price</Label>
                <Input type="number" step="0.01" placeholder="0.00" value={newDiscountedPrice} onChange={(e) => setNewDiscountedPrice(e.target.value)} />
                {parseFloat(newDiscountedPrice) > 0 && parseFloat(newDiscountedPrice) >= (newPrice ? parseFloat(newPrice) : (priceVariant?.price ?? 0)) && <p className="text-xs text-destructive">Must be less than price</p>}
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span>Current:</span>
                  <span className="font-medium">{priceVariant ? formatCurrency(priceVariant.discountedPrice) : "—"}</span>
                  {priceVariant && parseFloat(newDiscountedPrice) !== priceVariant.discountedPrice && (
                    <>
                      <ArrowRight className="h-3 w-3" />
                      <span className="font-semibold text-emerald-600">{formatCurrency(parseFloat(newDiscountedPrice) || 0)}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPriceVariant(null)}>Cancel</Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700"
              onClick={handleUpdatePrice}
              disabled={updating || !priceChanged || (priceMode === "store" && !targetSellerId)}
            >
              {updating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {priceMode === "global" ? "Update All Stores" : "Update This Store"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
