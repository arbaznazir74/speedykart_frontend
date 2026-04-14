"use client";
import { useState, useEffect, useCallback } from "react";
import { useCrud } from "@/hooks/use-crud";
import { CrudPage, ColumnDef, FormField } from "@/components/shared/crud-page";
import { StatusBadge } from "@/components/shared/status-badge";
import { API_ENDPOINTS } from "@/lib/constants";
import { getImageSrc } from "@/lib/format";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Users, X, UserPlus, Loader2, Check, Layers } from "lucide-react";

interface Category {
  id: number;
  name: string;
  slug: string;
  imageBase64: string | null;
  platform: number | string;
  timings: string;
  status: string;
  parentCategoryId: number | null;
  sortOrder: number;
  level: number;
  productsCount: number;
  suggestedBySellerId: number | null;
}
interface SellerItem { id: number; name: string; storeName: string | null; }
interface CategorySellerItem { id: number; categoryId: number; sellerId: number; sellerName: string | null; }

const columns: ColumnDef<Category>[] = [
  { key: "id", header: "ID", className: "w-16" },
  { key: "imageBase64", header: "Image", className: "w-16", render: (i) => (
    <Avatar className="h-9 w-9">{i.imageBase64 ? <AvatarImage src={getImageSrc(i.imageBase64)} /> : null}<AvatarFallback className="text-xs">{i.name?.charAt(0)}</AvatarFallback></Avatar>
  )},
  { key: "name", header: "Name" },
  { key: "slug", header: "Slug" },
  { key: "status", header: "Status", render: (i) => <StatusBadge status={i.status} /> },
  { key: "productsCount", header: "Products", className: "w-20" },
];
const formFields: FormField[] = [
  { key: "name", label: "Name", required: true, placeholder: "Category name" },
  { key: "slug", label: "Slug", placeholder: "category-slug", slugFrom: "name" },
  { key: "imageBase64", label: "Category Image", type: "image", required: true },
  { key: "status", label: "Status", type: "select", required: true, options: [{ label: "Active", value: "Active" }, { label: "Inactive", value: "Inactive" }] },
];

export default function SpeedyMartCategoriesPage() {
  const crud = useCrud<Category>({
    endpoint: `${API_ENDPOINTS.CATEGORY}/parent/admin`,
    writeEndpoint: API_ENDPOINTS.CATEGORY,
    countEndpoint: `${API_ENDPOINTS.CATEGORY}/parent/admin/count`,
    extraParams: { platform: 2 },
  });

  const [sellers, setSellers] = useState<SellerItem[]>([]);
  const [sellerDialogOpen, setSellerDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [assignedSellers, setAssignedSellers] = useState<CategorySellerItem[]>([]);
  const [loadingSellers, setLoadingSellers] = useState(false);
  const [addSellerOpen, setAddSellerOpen] = useState(false);
  const [addSellerIds, setAddSellerIds] = useState<number[]>([]);
  const [addingSellers, setAddingSellers] = useState(false);

  // Pending category suggestions
  const [pendingCategories, setPendingCategories] = useState<Category[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [approving, setApproving] = useState<number | null>(null);

  const loadPending = useCallback(async () => {
    setPendingLoading(true);
    try {
      const r = await apiGet<Category[]>(`${API_ENDPOINTS.CATEGORY}/pending`);
      const all = r.successData ?? [];
      setPendingCategories(all.filter((c) => String(c.platform) === "2" || String(c.platform) === "SpeedyMart"));
    } catch { /* empty */ } finally { setPendingLoading(false); }
  }, []);

  useEffect(() => {
    apiGet<SellerItem[]>(API_ENDPOINTS.SELLER, { skip: 0, top: 500 })
      .then((r) => setSellers(r.successData ?? [])).catch(() => {});
    loadPending();
  }, [loadPending]);

  const sellerMap = Object.fromEntries(sellers.map((s) => [s.id, s.storeName || s.name]));

  async function approveCategory(id: number) {
    setApproving(id);
    try {
      await apiPut(`${API_ENDPOINTS.CATEGORY}/approve/${id}`, {});
      await Promise.all([crud.load(crud.page), loadPending()]);
    } catch { /* empty */ } finally { setApproving(null); }
  }

  async function rejectCategory(id: number) {
    setApproving(id);
    try {
      await apiPut(`${API_ENDPOINTS.CATEGORY}/reject/${id}`, {});
      await loadPending();
    } catch { /* empty */ } finally { setApproving(null); }
  }

  const loadAssignedSellers = useCallback(async (categoryId: number) => {
    setLoadingSellers(true);
    try {
      const r = await apiGet<CategorySellerItem[]>(`${API_ENDPOINTS.CATEGORY_SELLER}/${categoryId}`);
      setAssignedSellers(r.successData ?? []);
    } catch { setAssignedSellers([]); }
    finally { setLoadingSellers(false); }
  }, []);

  function openSellerDialog(cat: Category) {
    setSelectedCategory(cat);
    setSellerDialogOpen(true);
    loadAssignedSellers(cat.id);
  }

  async function handleAddSellers() {
    if (!selectedCategory || addSellerIds.length === 0) return;
    setAddingSellers(true);
    try {
      await apiPost(API_ENDPOINTS.CATEGORY_SELLER, { categoryId: selectedCategory.id, sellerIds: addSellerIds });
      setAddSellerOpen(false);
      setAddSellerIds([]);
      await loadAssignedSellers(selectedCategory.id);
    } catch { /* empty */ }
    finally { setAddingSellers(false); }
  }

  async function handleRemoveSeller(sellerId: number) {
    if (!selectedCategory) return;
    try {
      await apiDelete(`${API_ENDPOINTS.CATEGORY_SELLER}/${selectedCategory.id}/${sellerId}`);
      setAssignedSellers((prev) => prev.filter((s) => s.sellerId !== sellerId));
    } catch { /* empty */ }
  }

  const unassignedSellers = sellers.filter((s) => !assignedSellers.some((a) => a.sellerId === s.id));

  return (
    <>
      {/* Pending Category Suggestions */}
      {pendingCategories.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50 shadow-sm mb-6">
          <CardContent className="py-4 space-y-3">
            <p className="text-sm font-semibold text-amber-800 flex items-center gap-2">
              <Layers className="h-4 w-4" /> Pending Category Suggestions ({pendingCategories.length})
            </p>
            <div className="space-y-2">
              {pendingLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                pendingCategories.map((pc) => (
                  <div key={pc.id} className="flex items-center justify-between rounded-lg border border-amber-200 bg-white px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        {pc.imageBase64 ? <AvatarImage src={getImageSrc(pc.imageBase64)} /> : null}
                        <AvatarFallback className="text-xs">{pc.name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{pc.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {pc.platform === 2 ? "SpeedyMart" : "HotBox"}
                      </Badge>
                      {pc.suggestedBySellerId && (
                        <Badge variant="outline" className="text-xs">
                          by {sellerMap[pc.suggestedBySellerId] ?? `Seller #${pc.suggestedBySellerId}`}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button size="sm" variant="outline" className="h-7 text-xs text-green-700 border-green-300 hover:bg-green-50"
                        disabled={approving === pc.id} onClick={() => approveCategory(pc.id)}>
                        {approving === pc.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 mr-1" />}
                        Approve
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs text-red-700 border-red-300 hover:bg-red-50"
                        disabled={approving === pc.id} onClick={() => rejectCategory(pc.id)}>
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

      <CrudPage title="SpeedyMart Categories" description="Manage grocery & mart categories" columns={columns} formFields={formFields}
        items={crud.items} total={crud.total} page={crud.page} pageSize={crud.pageSize}
        loading={crud.loading} saving={crud.saving} onPageChange={crud.setPage}
        onCreate={async (d) => { await crud.create({ ...d, platform: 2, level: 1 } as unknown as Partial<Category>); }}
        onUpdate={async (d) => { await crud.update(d as Partial<Category>); }}
        onDelete={async (id) => { await crud.remove(id); }}
        getId={(i) => i.id}
        getFormDefaults={(i) => ({ name: i.name, slug: i.slug, imageBase64: i.imageBase64 ?? "", status: i.status })}
        extraActions={(item) => (
          <Button variant="ghost" size="icon" className="h-8 w-8" title="Manage Sellers" onClick={() => openSellerDialog(item)}>
            <Users className="h-4 w-4" />
          </Button>
        )}
      />

      <Dialog open={sellerDialogOpen} onOpenChange={setSellerDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" /> Sellers — {selectedCategory?.name}
            </DialogTitle>
          </DialogHeader>

          {loadingSellers ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="space-y-4">
              {assignedSellers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No sellers assigned yet</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {assignedSellers.map((s) => (
                    <div key={s.sellerId} className="flex items-center gap-1.5 rounded-lg border bg-primary/5 border-primary/20 px-3 py-1.5">
                      <span className="text-sm font-medium">{s.sellerName ?? `#${s.sellerId}`}</span>
                      <button type="button" className="text-muted-foreground hover:text-destructive ml-1" onClick={() => handleRemoveSeller(s.sellerId)}>
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {!addSellerOpen ? (
                <Button variant="outline" size="sm" className="w-full" onClick={() => { setAddSellerIds([]); setAddSellerOpen(true); }} disabled={unassignedSellers.length === 0}>
                  <UserPlus className="h-4 w-4 mr-2" /> Add Sellers
                </Button>
              ) : (
                <div className="space-y-3 rounded-lg border p-3">
                  <p className="text-sm font-medium">Select sellers to assign:</p>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {unassignedSellers.map((s) => (
                      <label key={s.id} className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-slate-50 cursor-pointer">
                        <input type="checkbox" checked={addSellerIds.includes(s.id)} onChange={(e) => {
                          setAddSellerIds((prev) => e.target.checked ? [...prev, s.id] : prev.filter((x) => x !== s.id));
                        }} className="rounded" />
                        <span className="text-sm">{s.storeName || s.name || `Seller`} <span className="text-muted-foreground">#{s.id}</span></span>
                      </label>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setAddSellerOpen(false)}>Cancel</Button>
                    <Button size="sm" disabled={addSellerIds.length === 0 || addingSellers} onClick={handleAddSellers}>
                      {addingSellers && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Assign ({addSellerIds.length})
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSellerDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
