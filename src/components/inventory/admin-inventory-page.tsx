"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import { apiGet } from "@/lib/api-client";
import { API_ENDPOINTS } from "@/lib/constants";
import { InventoryPage } from "./inventory-page";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Search, Store, ArrowLeft, Warehouse } from "lucide-react";

interface Seller {
  id: number;
  name: string;
  storeName: string;
  username: string;
  mobile: string | null;
  status: string;
}

interface AdminInventoryPageProps {
  platformType: number;
  platformLabel: string;
}

export function AdminInventoryPage({ platformType, platformLabel }: AdminInventoryPageProps) {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedSeller, setSelectedSeller] = useState<Seller | null>(null);

  const loadSellers = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await apiGet<Seller[]>(`${API_ENDPOINTS.SELLER}?skip=0&top=200`);
      setSellers(resp.successData ?? []);
    } catch { /* empty */ } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    loadSellers();
  }, [loadSellers]);

  const filtered = search
    ? sellers.filter((s) =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.storeName.toLowerCase().includes(search.toLowerCase()) ||
        s.username.toLowerCase().includes(search.toLowerCase())
      )
    : sellers;

  if (selectedSeller) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setSelectedSeller(null)} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" /> Back to sellers
        </Button>
        <div className="rounded-lg bg-muted/50 border px-4 py-3 flex items-center gap-3">
          <Store className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="font-semibold text-sm">{selectedSeller.storeName}</p>
            <p className="text-xs text-muted-foreground">{selectedSeller.name} &middot; @{selectedSeller.username}</p>
          </div>
        </div>
        <InventoryPage
          platformType={platformType}
          platformLabel={platformLabel}
          readOnly={true}
          sellerId={selectedSeller.id}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${platformLabel} Inventory`}
        description={`Select a seller to view their ${platformLabel} stock levels`}
      >
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search sellers..." className="pl-9 w-56" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </PageHeader>

      <Card className="border-0 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Warehouse className="h-12 w-12 text-slate-300 mb-3" />
              <p className="text-base font-semibold text-slate-700">No sellers found</p>
              <p className="text-sm text-slate-400 mt-1">{search ? "Try a different search" : "No sellers registered"}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Store Name</TableHead>
                    <TableHead>Seller</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Mobile</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-32"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((s) => (
                    <TableRow key={s.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedSeller(s)}>
                      <TableCell className="text-xs text-muted-foreground">{s.id}</TableCell>
                      <TableCell className="font-semibold">{s.storeName}</TableCell>
                      <TableCell>{s.name}</TableCell>
                      <TableCell className="text-muted-foreground">@{s.username}</TableCell>
                      <TableCell className="text-sm">{s.mobile ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant={s.status === "Active" || s.status === "Approved" ? "default" : "secondary"} className="text-xs">
                          {s.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" className="h-7 text-xs">
                          View Stock
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
