"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { apiGet } from "@/lib/api-client";
import { API_ENDPOINTS } from "@/lib/constants";
import { Store, Search, ChevronRight } from "lucide-react";

export interface PickerSeller {
  id: number;
  storeName: string;
  name: string;
  status?: string;
  image?: string | null;
}

interface SellerPickerProps {
  selected: PickerSeller | null;
  onSelect: (seller: PickerSeller) => void;
  title?: string;
}

export function SellerPicker({ selected, onSelect, title = "Select Seller" }: SellerPickerProps) {
  const [sellers, setSellers] = useState<PickerSeller[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setLoading(true);
    apiGet<PickerSeller[]>(API_ENDPOINTS.SELLER, { top: 200 })
      .then((r) => setSellers(r.successData ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = search
    ? sellers.filter((s) =>
        (s.storeName || s.name).toLowerCase().includes(search.toLowerCase()) ||
        String(s.id).includes(search)
      )
    : sellers;

  return (
    <Card className="border-0 shadow-sm h-fit">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Store className="h-4 w-4 text-indigo-500" /> {title}
        </CardTitle>
        <div className="relative mt-2">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search sellers..."
            className="pl-8 h-8 text-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="p-4 space-y-2">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
          </div>
        ) : filtered.length === 0 ? (
          <p className="p-4 text-sm text-slate-400 text-center">No sellers found</p>
        ) : (
          <div className="max-h-[calc(100vh-280px)] overflow-y-auto">
            {filtered.map((s) => {
              const isActive = selected?.id === s.id;
              const displayName = s.storeName || s.name;
              const initials = displayName.slice(0, 2).toUpperCase();
              return (
                <button
                  key={s.id}
                  onClick={() => onSelect(s)}
                  className={`w-full text-left px-4 py-3 border-b border-slate-100/80 transition-all flex items-center gap-3 ${
                    isActive
                      ? "bg-indigo-50 border-l-[3px] border-l-indigo-500"
                      : "hover:bg-slate-50/80 border-l-[3px] border-l-transparent"
                  }`}
                >
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                    isActive ? "bg-indigo-500 text-white" : "bg-slate-100 text-slate-500"
                  }`}>
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${isActive ? "text-indigo-700" : "text-slate-800"}`}>
                      {displayName}
                    </p>
                    <p className="text-[11px] text-muted-foreground">ID: {s.id}</p>
                  </div>
                  <ChevronRight className={`h-4 w-4 shrink-0 ${isActive ? "text-indigo-400" : "text-slate-300"}`} />
                </button>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
