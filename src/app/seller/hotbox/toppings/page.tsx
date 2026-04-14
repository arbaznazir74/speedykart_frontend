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
import { apiGet, apiPost, apiDelete } from "@/lib/api-client";
import { API_ENDPOINTS } from "@/lib/constants";
import { formatCurrency } from "@/lib/format";
import { useAuth } from "@/context/auth-context";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, Plus, Search, Trash2 } from "lucide-react";

interface Topping {
  id: number;
  name: string;
  price: number;
  status: string;
  suggestedBySellerId: number | null;
}

export default function SellerHotBoxToppingsPage() {
  const { user } = useAuth();
  const sellerId = user?.id ?? 0;

  const [toppings, setToppings] = useState<Topping[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createPrice, setCreatePrice] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [deleteTopping, setDeleteTopping] = useState<Topping | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadToppings = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await apiGet<Topping[]>(`${API_ENDPOINTS.TOPPING}/mine`);
      setToppings(resp.successData ?? []);
    } catch { /* empty */ } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    loadToppings();
  }, [loadToppings]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    setCreating(true);
    try {
      const resp = await apiPost(`${API_ENDPOINTS.TOPPING}/mine`, {
        name: createName.trim(),
        price: parseFloat(createPrice) || 0,
      });
      if (resp.isError) throw new Error(resp.errorData?.displayMessage ?? "Failed to create");
      setCreateOpen(false);
      setCreateName("");
      setCreatePrice("");
      await loadToppings();
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : "Failed to create topping");
    } finally { setCreating(false); }
  }

  async function handleDelete() {
    if (!deleteTopping) return;
    setDeleting(true);
    try {
      await apiDelete(`${API_ENDPOINTS.TOPPING}/mine/${deleteTopping.id}`);
      setDeleteTopping(null);
      await loadToppings();
    } catch { /* empty */ } finally { setDeleting(false); }
  }

  const filtered = search
    ? toppings.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()))
    : toppings;

  return (
    <div className="space-y-6">
      <PageHeader title="HotBox Toppings" description="Manage your toppings. Admin-created toppings are available to all sellers.">
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search..." className="pl-9 w-52" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button size="sm" onClick={() => { setCreateName(""); setCreatePrice(""); setCreateError(null); setCreateOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" /> Add Topping
          </Button>
        </div>
      </PageHeader>

      <Card className="border-0 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-base font-semibold text-slate-700">No toppings found</p>
              <p className="text-sm text-slate-400 mt-1">Add a new topping or adjust your search</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">ID</TableHead>
                    <TableHead>Topping Name</TableHead>
                    <TableHead>Default Price</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((t) => {
                    const isMine = t.suggestedBySellerId === sellerId;
                    return (
                      <TableRow key={t.id}>
                        <TableCell className="text-xs text-muted-foreground">{t.id}</TableCell>
                        <TableCell className="font-medium">{t.name}</TableCell>
                        <TableCell className="font-semibold">{formatCurrency(t.price ?? 0)}</TableCell>
                        <TableCell>
                          {isMine ? (
                            <Badge variant="outline" className="text-xs text-blue-600 border-blue-300">My Topping</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">Global</Badge>
                          )}
                        </TableCell>
                        <TableCell><StatusBadge status={t.status} /></TableCell>
                        <TableCell>
                          {isMine && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/70 hover:text-destructive" onClick={() => setDeleteTopping(t)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
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

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Topping</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            {createError && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">{createError}</div>
            )}
            <div className="space-y-2">
              <Label>Topping Name *</Label>
              <Input required placeholder="e.g. Extra Cheese" value={createName} onChange={(e) => setCreateName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Default Price</Label>
              <Input type="number" step="0.01" placeholder="0.00" value={createPrice} onChange={(e) => setCreatePrice(e.target.value)} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={creating}>
                {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={deleteTopping !== null} onOpenChange={(o) => !o && setDeleteTopping(null)} title="Delete Topping" description={`Delete "${deleteTopping?.name}"? This cannot be undone.`} confirmLabel="Delete" variant="destructive" loading={deleting} onConfirm={handleDelete} />
    </div>
  );
}
