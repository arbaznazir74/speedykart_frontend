"use client";

import { useState, useEffect, useCallback, Fragment, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import { apiGet, apiPut } from "@/lib/api-client";
import { toast } from "sonner";
import { API_ENDPOINTS } from "@/lib/constants";
import { formatCurrency } from "@/lib/format";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ChevronDown, ChevronRight, Search, Package, Warehouse, Loader2, Plus, AlertTriangle,
} from "lucide-react";

const STATUS_LABELS: Record<number, string> = {
  0: "Draft", 1: "Pending", 2: "Active", 3: "Inactive", 4: "Rejected", 5: "Blocked", 6: "Out of Stock",
};

interface Product {
  id: number;
  name: string;
  categoryId: number;
  categoryName: string | null;
}

interface Variant {
  id: number;
  productId: number;
  name: string;
  price: number;
  discountedPrice: number;
  stock: number;
  isUnlimitedStock: boolean;
  status: string;
  imageBase64: string | null;
  platformType: number;
}

interface InventoryPageProps {
  platformType: number;
  platformLabel: string;
  readOnly?: boolean;
  sellerId?: number;
}

function InventoryPageContent({ platformType, platformLabel, readOnly = false, sellerId }: InventoryPageProps) {
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(searchParams.get("lowStock") === "true");

  const [expandedProductId, setExpandedProductId] = useState<number | null>(null);
  const [variants, setVariants] = useState<Record<number, Variant[]>>({});
  const [variantsLoading, setVariantsLoading] = useState<Record<number, boolean>>({});

  const [stockInputs, setStockInputs] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState<Record<number, boolean>>({});
  const [productMinStock, setProductMinStock] = useState<Record<number, { min: number; unlimited: boolean }>>({});

  const isAdmin = !!sellerId;

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const endpoint = isAdmin
        ? `${API_ENDPOINTS.PRODUCT}/seller/${sellerId}?skip=0&top=500&platformType=${platformType}`
        : `${API_ENDPOINTS.PRODUCT}/mine?platformType=${platformType}&skip=0&top=500`;
      const resp = await apiGet<Product[]>(endpoint);
      const prods = resp.successData ?? [];
      setProducts(prods);

      const varEndpoint = isAdmin
        ? `${API_ENDPOINTS.PRODUCT_VARIANT}/seller/${sellerId}?skip=0&top=2000`
        : `${API_ENDPOINTS.PRODUCT_VARIANT}/mine?skip=0&top=2000`;
      try {
        const vResp = await apiGet<Variant[]>(varEndpoint);
        const allVars = vResp.successData ?? [];
        const stockMap: Record<number, { min: number; unlimited: boolean }> = {};
        for (const v of allVars) {
          const prev = stockMap[v.productId];
          if (!prev) {
            stockMap[v.productId] = { min: v.isUnlimitedStock ? Infinity : (v.stock ?? 0), unlimited: v.isUnlimitedStock };
          } else {
            const s = v.isUnlimitedStock ? Infinity : (v.stock ?? 0);
            stockMap[v.productId] = { min: Math.min(prev.min, s), unlimited: prev.unlimited && v.isUnlimitedStock };
          }
        }
        setProductMinStock(stockMap);
      } catch { /* empty */ }
    } catch { /* empty */ } finally { setLoading(false); }
  }, [platformType, sellerId, isAdmin]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  async function loadVariants(productId: number) {
    setVariantsLoading((p) => ({ ...p, [productId]: true }));
    try {
      const endpoint = isAdmin
        ? `${API_ENDPOINTS.PRODUCT_VARIANT}/product/${productId}`
        : `${API_ENDPOINTS.PRODUCT_VARIANT}/mine/products/${productId}?skip=0&top=100`;
      const resp = await apiGet<Variant[]>(endpoint);
      setVariants((p) => ({ ...p, [productId]: resp.successData ?? [] }));
    } catch {
      setVariants((p) => ({ ...p, [productId]: [] }));
    } finally {
      setVariantsLoading((p) => ({ ...p, [productId]: false }));
    }
  }

  function toggleProduct(productId: number) {
    if (expandedProductId === productId) {
      setExpandedProductId(null);
    } else {
      setExpandedProductId(productId);
      loadVariants(productId);
    }
  }

  async function handleAddStock(variantId: number, productId: number) {
    const addAmount = Number(stockInputs[variantId] || 0);
    if (addAmount <= 0) return;

    setSaving((p) => ({ ...p, [variantId]: true }));
    try {
      const currentVariant = variants[productId]?.find(v => v.id === variantId);
      if (!currentVariant) return;

      const newStock = (currentVariant.stock || 0) + addAmount;
      const resp = await apiPut(`${API_ENDPOINTS.PRODUCT_VARIANT}/update-stock?variantId=${variantId}&stock=${newStock}`);
      if (resp.isError) {
        toast.error(resp.errorData?.displayMessage ?? "Failed to update stock");
        return;
      }
      toast.success(`Stock updated to ${newStock}`);
      setVariants((p) => ({
        ...p,
        [productId]: (p[productId] || []).map(v =>
          v.id === variantId ? { ...v, stock: newStock, isUnlimitedStock: false } : v
        ),
      }));
      setStockInputs((p) => ({ ...p, [variantId]: "" }));
      setProductMinStock((prev) => {
        const updatedVariants = (variants[productId] || []).map(v =>
          v.id === variantId ? { ...v, stock: newStock, isUnlimitedStock: false } : v
        );
        const min = updatedVariants.reduce((m, v) => Math.min(m, v.isUnlimitedStock ? Infinity : (v.stock ?? 0)), Infinity);
        const unlimited = updatedVariants.every(v => v.isUnlimitedStock);
        return { ...prev, [productId]: { min, unlimited } };
      });
    } catch (err) {
      toast.error("Failed to update stock");
      console.error("Stock update error:", err);
    } finally {
      setSaving((p) => ({ ...p, [variantId]: false }));
    }
  }

  const filtered = (search
    ? products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    : products
  ).filter((p) => {
    if (!lowStockOnly) return true;
    const pStock = productMinStock[p.id];
    return pStock && !pStock.unlimited && pStock.min < 10;
  }).sort((a, b) => {
    const aStock = productMinStock[a.id];
    const bStock = productMinStock[b.id];
    const aMin = aStock ? (aStock.unlimited ? Infinity : aStock.min) : Infinity;
    const bMin = bStock ? (bStock.unlimited ? Infinity : bStock.min) : Infinity;
    return aMin - bMin;
  });

  function getStockBadge(stock: number, isUnlimited: boolean) {
    if (isUnlimited) return <Badge className="bg-blue-100 text-blue-700 text-xs">Unlimited</Badge>;
    if (stock <= 0) return <Badge variant="destructive" className="text-xs">Out of Stock</Badge>;
    if (stock < 10) return <Badge className="bg-red-100 text-red-700 text-xs">Low: {stock}</Badge>;
    return <Badge className="bg-emerald-100 text-emerald-700 text-xs">{stock}</Badge>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${platformLabel} Inventory`}
        description={readOnly ? `View stock levels for this seller's ${platformLabel} products` : `Manage stock levels for your ${platformLabel} products`}
      >
        <div className="flex items-center gap-2">
          <Button
            variant={lowStockOnly ? "default" : "outline"}
            size="sm"
            className={`h-9 text-xs ${lowStockOnly ? "bg-red-500 hover:bg-red-600" : ""}`}
            onClick={() => setLowStockOnly(!lowStockOnly)}
          >
            <AlertTriangle className="h-3.5 w-3.5 mr-1" /> Low Stock
          </Button>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search products..." className="pl-9 w-56" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
      </PageHeader>

      <Card className="border-0 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">{[...Array(8)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Warehouse className="h-12 w-12 text-slate-300 mb-3" />
              <p className="text-base font-semibold text-slate-700">No products found</p>
              <p className="text-sm text-slate-400 mt-1">{search ? "Try a different search term" : "No products available"}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="w-32">Variants</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((product) => {
                    const isExpanded = expandedProductId === product.id;
                    const productVariants = variants[product.id];
                    const isLoadingVariants = variantsLoading[product.id];
                    const pStock = productMinStock[product.id];
                    const isLowStock = pStock && !pStock.unlimited && pStock.min < 10;

                    return (
                      <Fragment key={product.id}>
                        <TableRow
                          className={`cursor-pointer hover:bg-muted/50 ${isLowStock ? 'bg-red-50 hover:bg-red-100' : ''}`}
                          onClick={() => toggleProduct(product.id)}
                        >
                          <TableCell className="pl-4">
                            {isExpanded
                              ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{product.id}</TableCell>
                          <TableCell className="font-medium">{product.name}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{product.categoryName ?? "—"}</TableCell>
                          <TableCell>
                            {productVariants ? (
                              <Badge variant="secondary" className="text-xs">{productVariants.length} variant{productVariants.length !== 1 ? "s" : ""}</Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">Click to load</span>
                            )}
                          </TableCell>
                        </TableRow>

                        {isExpanded && (
                          <TableRow key={`${product.id}-variants`}>
                            <TableCell colSpan={5} className="p-0 bg-muted/30">
                              {isLoadingVariants ? (
                                <div className="p-4 space-y-2">
                                  {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-10 w-full rounded" />)}
                                </div>
                              ) : !productVariants || productVariants.length === 0 ? (
                                <div className="p-6 text-center text-sm text-muted-foreground">
                                  <Package className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                                  No variants found for this product
                                </div>
                              ) : (
                                <div className="p-3">
                                  <Table>
                                    <TableHeader>
                                      <TableRow className="hover:bg-transparent">
                                        <TableHead className="text-xs">Variant</TableHead>
                                        <TableHead className="text-xs">Price</TableHead>
                                        <TableHead className="text-xs">Offer Price</TableHead>
                                        <TableHead className="text-xs">Current Stock</TableHead>
                                        <TableHead className="text-xs">Status</TableHead>
                                        {!readOnly && <TableHead className="text-xs w-52">Add Stock</TableHead>}
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {productVariants.map((v) => (
                                        <TableRow key={v.id} className="hover:bg-background/50">
                                          <TableCell className="font-medium text-sm">{v.name}</TableCell>
                                          <TableCell className="text-sm">{formatCurrency(v.price)}</TableCell>
                                          <TableCell className="text-sm">{v.discountedPrice ? formatCurrency(v.discountedPrice) : "—"}</TableCell>
                                          <TableCell>{getStockBadge(v.stock, v.isUnlimitedStock)}</TableCell>
                                          <TableCell>
                                            <Badge variant={Number(v.status) === 2 ? "default" : "secondary"} className="text-xs">
                                              {STATUS_LABELS[Number(v.status)] ?? v.status}
                                            </Badge>
                                          </TableCell>
                                          {!readOnly && (
                                            <TableCell>
                                              <div className="flex items-center gap-1.5">
                                                <Input
                                                  type="number"
                                                  min="1"
                                                  placeholder="Qty"
                                                  className="h-8 w-20 text-sm"
                                                  value={stockInputs[v.id] ?? ""}
                                                  onChange={(e) => setStockInputs((p) => ({ ...p, [v.id]: e.target.value }))}
                                                  onClick={(e) => e.stopPropagation()}
                                                />
                                                <Button
                                                  size="sm"
                                                  className="h-8 px-3"
                                                  disabled={saving[v.id] || !stockInputs[v.id] || Number(stockInputs[v.id]) <= 0}
                                                  onClick={(e) => { e.stopPropagation(); handleAddStock(v.id, product.id); }}
                                                >
                                                  {saving[v.id] ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Plus className="h-3 w-3 mr-1" /> Add</>}
                                                </Button>
                                              </div>
                                            </TableCell>
                                          )}
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function InventoryPage(props: InventoryPageProps) {
  return (
    <Suspense>
      <InventoryPageContent {...props} />
    </Suspense>
  );
}
