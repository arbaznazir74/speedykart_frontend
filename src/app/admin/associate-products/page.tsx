"use client";

import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiGet, apiPost } from "@/lib/api-client";
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
import { Loader2, Search, Store, Link2, Package, CheckCircle, ArrowRight } from "lucide-react";
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

interface Seller {
  id: number;
  storeName: string;
  name: string;
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

export default function AssociateProductsPage() {
  const [selectedSeller, setSelectedSeller] = useState<PickerSeller | null>(null);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [variantsLoading, setVariantsLoading] = useState(false);
  const [searchQ, setSearchQ] = useState("");

  const [assignVariant, setAssignVariant] = useState<ProductVariant | null>(null);
  const [allSellers, setAllSellers] = useState<Seller[]>([]);
  const [assignedSellers, setAssignedSellers] = useState<AssignedSeller[]>([]);
  const [targetSellers, setTargetSellers] = useState<Set<number>>(new Set());
  const [assigning, setAssigning] = useState(false);
  const [sellerSearch, setSellerSearch] = useState("");

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

  async function openAssignDialog(variant: ProductVariant) {
    setAssignVariant(variant);
    setTargetSellers(new Set());
    setSellerSearch("");
    try {
      const [sellersResp, assignedResp] = await Promise.all([
        apiGet<Seller[]>(API_ENDPOINTS.SELLER, { top: 200 }),
        apiGet<AssignedSeller[]>(`${API_ENDPOINTS.PRODUCT_VARIANT}/associate-sellers?productVariantId=${variant.id}`),
      ]);
      setAllSellers(sellersResp.successData ?? []);
      setAssignedSellers(assignedResp.successData ?? []);
    } catch {
      setAllSellers([]);
      setAssignedSellers([]);
    }
  }

  function toggleTarget(id: number) {
    setTargetSellers((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const assignedIds = new Set(assignedSellers.map((s) => s.id));
  const filteredTargetSellers = allSellers.filter((s) =>
    sellerSearch === "" || (s.storeName || s.name).toLowerCase().includes(sellerSearch.toLowerCase())
  );

  function selectAllTargets() {
    const unassigned = filteredTargetSellers.filter((s) => !assignedIds.has(s.id));
    if (targetSellers.size === unassigned.length) setTargetSellers(new Set());
    else setTargetSellers(new Set(unassigned.map((s) => s.id)));
  }

  async function handleAssign() {
    if (!assignVariant || targetSellers.size === 0) return;
    setAssigning(true);
    try {
      await apiPost<
        { productVariantId: number; sellerIds: number[] },
        { boolResponse: boolean; responseMessage: string }
      >(
        `${API_ENDPOINTS.PRODUCT_VARIANT}/associate/bulk`,
        { productVariantId: assignVariant.id, sellerIds: Array.from(targetSellers) }
      );
      toast.success(`Assigned to ${targetSellers.size} store(s)`);
      const assignedResp = await apiGet<AssignedSeller[]>(
        `${API_ENDPOINTS.PRODUCT_VARIANT}/associate-sellers?productVariantId=${assignVariant.id}`
      );
      setAssignedSellers(assignedResp.successData ?? []);
      setTargetSellers(new Set());
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to assign");
    } finally {
      setAssigning(false);
    }
  }

  const displayed = searchQ
    ? variants.filter((v) => v.name.toLowerCase().includes(searchQ.toLowerCase()))
    : variants;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Associate Products"
        description="Pick a seller, browse their products, then assign variants to other stores"
      />

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        <SellerPicker selected={selectedSeller} onSelect={loadSellerVariants} title="Source Seller" />

        <div className="space-y-4">
          {!selectedSeller ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="py-24 text-center">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                  <Link2 className="h-8 w-8 text-slate-300" />
                </div>
                <p className="text-lg font-semibold text-slate-600">Select a source seller</p>
                <p className="text-sm text-slate-400 mt-1 max-w-xs mx-auto">
                  Pick a seller from the list to see their products, then assign them to other stores
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
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right pr-4">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {displayed.map((v) => {
                            const isActive = v.status === "Active" || v.status === "2";
                            const hasDiscount = v.discountedPrice > 0 && v.discountedPrice < v.price;
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
                                  {hasDiscount ? (
                                    <span className="line-through text-slate-400 text-xs">{formatCurrency(v.price)}</span>
                                  ) : (
                                    <span className="font-medium">{formatCurrency(v.price)}</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right tabular-nums">
                                  {hasDiscount ? (
                                    <span className="font-semibold text-emerald-700">{formatCurrency(v.discountedPrice)}</span>
                                  ) : (
                                    <span className="text-slate-400">—</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Badge className={`text-[11px] border ${isActive ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
                                    {v.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right pr-4">
                                  <Button size="sm" className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 shadow-sm" onClick={() => openAssignDialog(v)}>
                                    <ArrowRight className="h-3.5 w-3.5 mr-1" /> Assign
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

      {/* Assign Dialog */}
      <Dialog open={!!assignVariant} onOpenChange={(o) => !o && setAssignVariant(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">
              Assign to Stores
            </DialogTitle>
          </DialogHeader>

          {/* Product being assigned */}
          {assignVariant && (
            <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50">
              {assignVariant.imageBase64 ? (
                <img src={`data:image/png;base64,${assignVariant.imageBase64}`} alt="" className="h-12 w-12 rounded-lg object-cover border" />
              ) : (
                <div className="h-12 w-12 rounded-lg bg-white border flex items-center justify-center">
                  <Package className="h-5 w-5 text-slate-300" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-slate-800 truncate">{assignVariant.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-slate-500">ID: {assignVariant.id}</span>
                  <PlatformBadge type={assignVariant.platformType} />
                  <span className="text-xs font-medium text-slate-700">{formatCurrency(assignVariant.price)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Already assigned */}
          {assignedSellers.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground font-medium">
                Already assigned to {assignedSellers.length} store(s)
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {assignedSellers.map((s) => (
                  <Badge key={s.id} className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-normal">
                    <CheckCircle className="h-3 w-3 mr-1" /> {s.title}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Search + list */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground font-medium">Select target stores</Label>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={selectAllTargets}>
                {targetSellers.size > 0 ? "Deselect All" : "Select All"}
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search stores..." className="pl-8 h-8 text-xs" value={sellerSearch} onChange={(e) => setSellerSearch(e.target.value)} />
            </div>
            <div className="border rounded-xl max-h-[280px] overflow-y-auto divide-y divide-slate-100">
              {filteredTargetSellers.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">No stores found</p>
              ) : filteredTargetSellers.map((s) => {
                const already = assignedIds.has(s.id);
                const isSelected = targetSellers.has(s.id);
                const displayName = s.storeName || s.name;
                const initials = displayName.slice(0, 2).toUpperCase();
                return (
                  <div
                    key={s.id}
                    onClick={() => !already && toggleTarget(s.id)}
                    className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                      already ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:bg-slate-50"
                    } ${isSelected ? "bg-indigo-50/60" : ""}`}
                  >
                    <Checkbox checked={already || isSelected} disabled={already} />
                    <div className={`h-7 w-7 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0 ${
                      isSelected ? "bg-indigo-500 text-white" : already ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-500"
                    }`}>
                      {already ? "✓" : initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{displayName}</p>
                      <p className="text-[11px] text-muted-foreground">ID: {s.id}</p>
                    </div>
                    {already && <Badge className="text-[10px] bg-emerald-50 text-emerald-600 border border-emerald-200">Assigned</Badge>}
                  </div>
                );
              })}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAssignVariant(null)}>Cancel</Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={handleAssign} disabled={assigning || targetSellers.size === 0}>
              {assigning && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Assign to {targetSellers.size} Store{targetSellers.size !== 1 ? "s" : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
