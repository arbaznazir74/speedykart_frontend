"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { apiGet, apiPost, apiDelete } from "@/lib/api-client";
import { API_ENDPOINTS } from "@/lib/constants";
import { useAuth } from "@/context/auth-context";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, Plus, Search, Trash2 } from "lucide-react";

interface Unit {
  id: number;
  name: string;
  shortCode: string;
  parentId: number | null;
  conversion: number | null;
  sellerId: number | null;
}

export default function SellerSpeedyMartUnitsPage() {
  const { user } = useAuth();
  const sellerId = user?.id ?? 0;

  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createShortCode, setCreateShortCode] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [deleteUnit, setDeleteUnit] = useState<Unit | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadUnits = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await apiGet<Unit[]>(`${API_ENDPOINTS.UNIT}/mine?skip=0&top=200`);
      setUnits(resp.successData ?? []);
    } catch { /* empty */ } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    loadUnits();
  }, [loadUnits]);

  const unitMap = useMemo(() => {
    const map: Record<number, string> = {};
    for (const u of units) map[u.id] = u.name;
    return map;
  }, [units]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    setCreating(true);
    try {
      const resp = await apiPost(`${API_ENDPOINTS.UNIT}/mine`, {
        name: createName.trim(),
        shortCode: createShortCode.trim(),
      });
      if (resp.isError) throw new Error(resp.errorData?.displayMessage ?? "Failed to create");
      setCreateOpen(false);
      setCreateName("");
      setCreateShortCode("");
      await loadUnits();
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : "Failed to create unit");
    } finally { setCreating(false); }
  }

  async function handleDelete() {
    if (!deleteUnit) return;
    setDeleting(true);
    try {
      await apiDelete(`${API_ENDPOINTS.UNIT}/mine/${deleteUnit.id}`);
      setDeleteUnit(null);
      await loadUnits();
    } catch { /* empty */ } finally { setDeleting(false); }
  }

  const filtered = search
    ? units.filter((u) => u.name.toLowerCase().includes(search.toLowerCase()))
    : units;

  return (
    <div className="space-y-6">
      <PageHeader title="SpeedyMart Units" description="Manage your units. Admin-created units are available to all sellers.">
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search..." className="pl-9 w-52" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button size="sm" onClick={() => { setCreateName(""); setCreateShortCode(""); setCreateError(null); setCreateOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" /> Add Unit
          </Button>
        </div>
      </PageHeader>

      <Card className="border-0 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-base font-semibold text-slate-700">No units found</p>
              <p className="text-sm text-slate-400 mt-1">Add a new unit or adjust your search</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">ID</TableHead>
                    <TableHead>Unit Name</TableHead>
                    <TableHead>Short Code</TableHead>
                    <TableHead>Parent Unit</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((u) => {
                    const isMine = u.sellerId === sellerId;
                    return (
                      <TableRow key={u.id}>
                        <TableCell className="text-xs text-muted-foreground">{u.id}</TableCell>
                        <TableCell className="font-medium">{u.name}</TableCell>
                        <TableCell>{u.shortCode}</TableCell>
                        <TableCell>{u.parentId ? (unitMap[u.parentId] ?? String(u.parentId)) : "—"}</TableCell>
                        <TableCell>
                          {isMine ? (
                            <Badge variant="outline" className="text-xs text-blue-600 border-blue-300">My Unit</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">Global</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {isMine && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/70 hover:text-destructive" onClick={() => setDeleteUnit(u)}>
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
            <DialogTitle>Add Unit</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            {createError && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">{createError}</div>
            )}
            <div className="space-y-2">
              <Label>Unit Name *</Label>
              <Input required placeholder="e.g. Kilogram, Piece" value={createName} onChange={(e) => setCreateName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Short Code *</Label>
              <Input required placeholder="e.g. kg, pc" value={createShortCode} onChange={(e) => setCreateShortCode(e.target.value)} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={creating || !createName.trim() || !createShortCode.trim()}>
                {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={deleteUnit !== null} onOpenChange={(o) => !o && setDeleteUnit(null)} title="Delete Unit" description={`Delete "${deleteUnit?.name}"? This cannot be undone.`} confirmLabel="Delete" variant="destructive" loading={deleting} onConfirm={handleDelete} />
    </div>
  );
}
