"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/shared/page-header";
import { apiGet, apiPost, apiPut } from "@/lib/api-client";
import { API_ENDPOINTS } from "@/lib/constants";
import { formatCurrency } from "@/lib/format";
import { RefreshCw, Settings2, CheckCircle2, XCircle, Pencil, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

interface Seller { id: number; name: string; storeName: string; }

interface SellerSettingsJson {
  isOrderPossible: boolean;
  isFreeDelivery: boolean;
  isSurge: boolean;
  isCodAvailable: boolean;
  minRadiusInKms: number;
  maxRadiusInKms: number;
  surgeCount: number;
  surgeCharge: number;
  minDeliveryCharge: number;
  deliveryChargeAterMinRadius: number;
  commissionPerKm: number;
}

interface SellerSetting {
  id: number;
  sellerId: number;
  sellerSettingsJson: SellerSettingsJson | null;
}

interface SellerRow {
  seller: Seller;
  settings: SellerSetting | null;
}

const defaultSettings: SellerSettingsJson = {
  isOrderPossible: false,
  isFreeDelivery: false,
  isSurge: false,
  isCodAvailable: false,
  minRadiusInKms: 0,
  maxRadiusInKms: 0,
  surgeCount: 0,
  surgeCharge: 0,
  minDeliveryCharge: 0,
  deliveryChargeAterMinRadius: 0,
  commissionPerKm: 0,
};

export default function SellerSettingsPage() {
  const [rows, setRows] = useState<SellerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  // Edit state
  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState<SellerRow | null>(null);
  const [editForm, setEditForm] = useState<SellerSettingsJson>(defaultSettings);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const sellersRes = await apiGet<Seller[]>(`${API_ENDPOINTS.SELLER}?skip=0&top=200`);
      const sellers = sellersRes.successData ?? [];
      const settingsPromises = sellers.map(async (s) => {
        try {
          const res = await apiGet<SellerSetting>(`${API_ENDPOINTS.SELLER_SETTINGS}/${s.id}`);
          return { seller: s, settings: res.successData ?? null };
        } catch {
          return { seller: s, settings: null };
        }
      });
      const results = await Promise.all(settingsPromises);
      setRows(results);
    } catch { setRows([]); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openEdit = (r: SellerRow) => {
    setEditRow(r);
    setEditForm(r.settings?.sellerSettingsJson ? { ...r.settings.sellerSettingsJson } : { ...defaultSettings });
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!editRow) return;
    setActing(true);
    try {
      const payload = { sellerId: editRow.seller.id, sellerSettingsJson: editForm };
      const hasExisting = editRow.settings != null && editRow.settings.id > 0;
      if (hasExisting) {
        const resp = await apiPut<typeof payload, SellerSetting>(`${API_ENDPOINTS.SELLER_SETTINGS}/sellerId?sellerId=${editRow.seller.id}`, payload);
        if (resp.isError) toast.error(resp.errorData?.displayMessage ?? "Update failed");
        else { toast.success("Settings updated!"); setEditOpen(false); fetchData(); }
      } else {
        const resp = await apiPost<typeof payload, SellerSetting>(API_ENDPOINTS.SELLER_SETTINGS, payload);
        if (resp.isError) toast.error(resp.errorData?.displayMessage ?? "Create failed");
        else { toast.success("Settings created!"); setEditOpen(false); fetchData(); }
      }
    } catch { toast.error("Error saving settings"); }
    setActing(false);
  };

  const toggleField = (field: keyof SellerSettingsJson) => {
    setEditForm((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const setNumField = (field: keyof SellerSettingsJson, val: string) => {
    setEditForm((prev) => ({ ...prev, [field]: Number(val) || 0 }));
  };

  const BoolBadge = ({ val }: { val?: boolean }) =>
    val ? <Badge className="bg-emerald-100 text-emerald-700 text-xs"><CheckCircle2 className="h-3 w-3 mr-1" />Yes</Badge>
         : <Badge variant="secondary" className="text-xs"><XCircle className="h-3 w-3 mr-1" />No</Badge>;

  const ToggleBtn = ({ label, val, onToggle }: { label: string; val: boolean; onToggle: () => void }) => (
    <button type="button" onClick={onToggle} className={`flex items-center justify-between w-full rounded-lg border p-3 transition-colors ${val ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}>
      <span className="text-sm font-medium">{label}</span>
      {val ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <XCircle className="h-5 w-5 text-slate-300" />}
    </button>
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Seller Settings" description="View & edit delivery/order settings for each seller">
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">ID</TableHead>
                <TableHead>Store</TableHead>
                <TableHead>Orders</TableHead>
                <TableHead>Free Delivery</TableHead>
                <TableHead>COD</TableHead>
                <TableHead>Min Radius</TableHead>
                <TableHead>Max Radius</TableHead>
                <TableHead>Min Delivery Charge</TableHead>
                <TableHead>Commission/km</TableHead>
                <TableHead>Surge</TableHead>
                <TableHead className="w-16">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 11 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-8 text-slate-500">
                    <Settings2 className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    No sellers found
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => {
                  const s = r.settings?.sellerSettingsJson;
                  return (
                    <TableRow key={r.seller.id}>
                      <TableCell className="font-mono text-xs">{r.seller.id}</TableCell>
                      <TableCell className="font-medium">{r.seller.storeName || r.seller.name}</TableCell>
                      <TableCell><BoolBadge val={s?.isOrderPossible} /></TableCell>
                      <TableCell><BoolBadge val={s?.isFreeDelivery} /></TableCell>
                      <TableCell><BoolBadge val={s?.isCodAvailable} /></TableCell>
                      <TableCell>{s?.minRadiusInKms != null ? `${s.minRadiusInKms} km` : "—"}</TableCell>
                      <TableCell>{s?.maxRadiusInKms != null ? `${s.maxRadiusInKms} km` : "—"}</TableCell>
                      <TableCell>{s?.minDeliveryCharge != null ? formatCurrency(s.minDeliveryCharge) : "—"}</TableCell>
                      <TableCell>{s?.isFreeDelivery && s?.commissionPerKm ? formatCurrency(s.commissionPerKm) + "/km" : "—"}</TableCell>
                      <TableCell><BoolBadge val={s?.isSurge} /></TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Edit Settings" onClick={() => openEdit(r)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Settings Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-indigo-500" />
              {editRow?.seller.storeName ?? "Seller"} — Settings
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Toggles</p>
            <div className="grid grid-cols-2 gap-3">
              <ToggleBtn label="Orders Enabled" val={editForm.isOrderPossible} onToggle={() => toggleField("isOrderPossible")} />
              <ToggleBtn label="Free Delivery" val={editForm.isFreeDelivery} onToggle={() => toggleField("isFreeDelivery")} />
              <ToggleBtn label="COD Available" val={editForm.isCodAvailable} onToggle={() => toggleField("isCodAvailable")} />
              <ToggleBtn label="Surge Pricing" val={editForm.isSurge} onToggle={() => toggleField("isSurge")} />
            </div>

            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide pt-2">Delivery Radius</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-500">Min Radius (km)</Label>
                <Input type="number" min={0} value={editForm.minRadiusInKms} onChange={(e) => setNumField("minRadiusInKms", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs text-slate-500">Max Radius (km)</Label>
                <Input type="number" min={0} value={editForm.maxRadiusInKms} onChange={(e) => setNumField("maxRadiusInKms", e.target.value)} />
              </div>
            </div>

            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide pt-2">Delivery Charges</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-500">Min Delivery Charge</Label>
                <Input type="number" min={0} step={0.01} value={editForm.minDeliveryCharge} onChange={(e) => setNumField("minDeliveryCharge", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs text-slate-500">Charge After Min Radius</Label>
                <Input type="number" min={0} step={0.01} value={editForm.deliveryChargeAterMinRadius} onChange={(e) => setNumField("deliveryChargeAterMinRadius", e.target.value)} />
              </div>
            </div>

            {editForm.isFreeDelivery && (
              <>
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-3">
                  <p className="text-xs text-amber-600 font-semibold uppercase tracking-wide">Commission-Based Delivery Boy Pay</p>
                  <p className="text-xs text-amber-500">Delivery is free for the customer. Set how much to pay commission-based delivery boys per kilometer. Salaried delivery boys are not affected.</p>
                  <div>
                    <Label className="text-xs text-amber-700">Commission Per KM (₹)</Label>
                    <Input type="number" min={0} step={0.5} value={editForm.commissionPerKm} onChange={(e) => setNumField("commissionPerKm", e.target.value)} className="border-amber-300 focus:border-amber-500" />
                  </div>
                </div>
              </>
            )}

            {editForm.isSurge && (
              <>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide pt-2">Surge Settings</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-slate-500">Surge Count</Label>
                    <Input type="number" min={0} value={editForm.surgeCount} onChange={(e) => setNumField("surgeCount", e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">Surge Charge</Label>
                    <Input type="number" min={0} step={0.01} value={editForm.surgeCharge} onChange={(e) => setNumField("surgeCharge", e.target.value)} />
                  </div>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button onClick={handleSave} disabled={acting} className="w-full">
              {acting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save Settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
