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
import { apiGet, apiPost } from "@/lib/api-client";
import { API_ENDPOINTS } from "@/lib/constants";
import { getImageSrc } from "@/lib/format";
import { useAuth } from "@/context/auth-context";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, Plus, Search, Clock } from "lucide-react";

interface SellerCategory {
  id: number;
  name: string;
  slug: string;
  imageBase64: string | null;
  status: string;
  platform: string;
  productsCount: number;
  suggestedBySellerId: number | null;
}

export default function SellerSpeedyMartCategoriesPage() {
  const { user } = useAuth();
  const sellerId = user?.id ?? 0;

  const [categories, setCategories] = useState<SellerCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestName, setSuggestName] = useState("");
  const [suggestImage, setSuggestImage] = useState("");
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [suggesting, setSuggesting] = useState(false);

  const loadCategories = useCallback(async (p = 1) => {
    setLoading(true);
    const skip = (p - 1) * pageSize;
    try {
      const [listR, countR] = await Promise.all([
        apiGet<SellerCategory[]>(`${API_ENDPOINTS.CATEGORY}/parent/seller?platform=2&sellerId=${sellerId}`, { skip, top: pageSize }),
        apiGet<{ intResponse: number }>(`${API_ENDPOINTS.CATEGORY}/parent/seller/count?platform=2&sellerId=${sellerId}`),
      ]);
      setCategories(listR.successData ?? []);
      setTotal(countR.successData?.intResponse ?? 0);
      setPage(p);
    } catch { /* empty */ } finally { setLoading(false); }
  }, [sellerId]);

  useEffect(() => { loadCategories(1); }, [loadCategories]);

  async function handleSuggest(e: React.FormEvent) {
    e.preventDefault();
    setSuggestError(null);
    setSuggesting(true);
    try {
      if (!suggestImage) { setSuggestError("Category image is required"); setSuggesting(false); return; }
      const resp = await apiPost(`${API_ENDPOINTS.CATEGORY}/suggest`, {
        name: suggestName.trim(),
        imageBase64: suggestImage,
        suggestedBySellerId: sellerId,
        platform: 2,
      });
      if (resp.isError) throw new Error(resp.errorData?.displayMessage ?? "Failed to suggest");
      setSuggestOpen(false);
      setSuggestName("");
      setSuggestImage("");
      await loadCategories(page);
    } catch (err: unknown) {
      setSuggestError(err instanceof Error ? err.message : "Failed to suggest category");
    } finally { setSuggesting(false); }
  }

  const filtered = search
    ? categories.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
    : categories;

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      <PageHeader title="SpeedyMart Categories" description="Browse grocery categories. You can suggest a new category for admin approval.">
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search..." className="pl-9 w-52" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button size="sm" onClick={() => { setSuggestName(""); setSuggestImage(""); setSuggestError(null); setSuggestOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" /> Suggest Category
          </Button>
        </div>
      </PageHeader>

      <Card className="border-0 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-base font-semibold text-slate-700">No categories found</p>
              <p className="text-sm text-slate-400 mt-1">Suggest a new category or adjust your search</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">ID</TableHead>
                    <TableHead className="w-16">Image</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-20">Products</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="text-xs text-muted-foreground">{c.id}</TableCell>
                      <TableCell>
                        <Avatar className="h-9 w-9">
                          {c.imageBase64 ? <AvatarImage src={getImageSrc(c.imageBase64)} /> : null}
                          <AvatarFallback className="text-xs">{c.name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell className="font-medium">
                        {c.name}
                        {c.suggestedBySellerId && c.status === "Pending" && (
                          <Badge variant="outline" className="ml-2 text-xs text-amber-600 border-amber-300">
                            <Clock className="h-3 w-3 mr-1" /> Pending Approval
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell><StatusBadge status={c.status} labelOverride={{ Pending: "In Progress" }} /></TableCell>
                      <TableCell>{c.productsCount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => loadCategories(page - 1)}>Prev</Button>
          <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => loadCategories(page + 1)}>Next</Button>
        </div>
      )}

      <Dialog open={suggestOpen} onOpenChange={setSuggestOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Suggest a Category</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSuggest} className="space-y-4">
            {suggestError && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">{suggestError}</div>
            )}
            <div className="space-y-2">
              <Label>Category Name *</Label>
              <Input required placeholder="e.g. Dairy Products" value={suggestName} onChange={(e) => setSuggestName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input readOnly disabled value={suggestName.trim().toLowerCase().replace(/\s+/g, "-").replace(/--+/g, "-")} placeholder="auto-generated" className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label>Category Image *</Label>
              <input type="file" accept="image/*" className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium cursor-pointer"
                onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => { const s = rd.result as string; setSuggestImage(s.includes(",") ? s.split(",")[1] : s); }; rd.readAsDataURL(f); }} />
              {suggestImage && (
                <div className="flex items-center gap-3 mt-1">
                  <img src={`data:image/jpeg;base64,${suggestImage}`} alt="Preview" className="h-14 w-14 rounded-lg object-cover border" />
                  <Button type="button" variant="ghost" size="sm" className="text-destructive text-xs h-7" onClick={() => setSuggestImage("")}>Remove</Button>
                </div>
              )}
              <p className="text-xs text-muted-foreground">This will be sent to the admin for approval. Once approved, it will appear in the category list.</p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSuggestOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={suggesting}>
                {suggesting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Suggest
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
