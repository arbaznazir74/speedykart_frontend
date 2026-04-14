"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { apiGet, apiPut, apiPost } from "@/lib/api-client";
import { API_ENDPOINTS } from "@/lib/constants";
import { Loader2, Save } from "lucide-react";

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

interface SellerSettingsData {
  id: number;
  sellerId: number;
  sellerSettingsJson: SellerSettingsJson | null;
}

const defaultJson: SellerSettingsJson = {
  isOrderPossible: true,
  isFreeDelivery: false,
  isSurge: false,
  isCodAvailable: true,
  minRadiusInKms: 1,
  maxRadiusInKms: 10,
  surgeCount: 0,
  surgeCharge: 0,
  minDeliveryCharge: 0,
  deliveryChargeAterMinRadius: 0,
  commissionPerKm: 0,
};

export default function SellerSettingsPage() {
  const [settings, setSettings] = useState<SellerSettingsData | null>(null);
  const [json, setJson] = useState<SellerSettingsJson>(defaultJson);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isNew, setIsNew] = useState(false);

  useEffect(() => { loadSettings(); }, []);

  async function loadSettings() {
    setLoading(true);
    try {
      const resp = await apiGet<SellerSettingsData>(`${API_ENDPOINTS.SELLER_SETTINGS}/mine`);
      if (resp.successData) {
        setSettings(resp.successData);
        setJson(resp.successData.sellerSettingsJson ?? defaultJson);
        setIsNew(false);
      } else {
        setIsNew(true);
      }
    } catch {
      setIsNew(true);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload = { sellerSettingsJson: json };
      if (isNew) {
        await apiPost<typeof payload, unknown>(`${API_ENDPOINTS.SELLER_SETTINGS}/mine`, payload);
      } else {
        await apiPut<typeof payload, unknown>(`${API_ENDPOINTS.SELLER_SETTINGS}/mine`, payload);
      }
      await loadSettings();
    } catch {
      // error handled
    } finally {
      setSaving(false);
    }
  }

  function updateJson<K extends keyof SellerSettingsJson>(key: K, value: SellerSettingsJson[K]) {
    setJson((prev) => ({ ...prev, [key]: value }));
  }

  if (loading) {
    return <div className="space-y-6"><h1 className="text-2xl font-bold">Delivery Settings</h1><Skeleton className="h-96 w-full" /></div>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Delivery Settings</h1>
          <p className="text-sm text-muted-foreground">Configure your store delivery settings</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Order & Delivery</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Orders Possible</Label>
            <Switch checked={json.isOrderPossible} onCheckedChange={(v) => updateJson("isOrderPossible", v)} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Free Delivery</Label>
            <Switch checked={json.isFreeDelivery} onCheckedChange={(v) => updateJson("isFreeDelivery", v)} />
          </div>
          <div className="flex items-center justify-between">
            <Label>COD Available</Label>
            <Switch checked={json.isCodAvailable} onCheckedChange={(v) => updateJson("isCodAvailable", v)} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Surge Pricing</Label>
            <Switch checked={json.isSurge} onCheckedChange={(v) => updateJson("isSurge", v)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Radius & Charges</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Min Radius (km)</Label>
              <Input type="number" value={json.minRadiusInKms} onChange={(e) => updateJson("minRadiusInKms", Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Max Radius (km)</Label>
              <Input type="number" value={json.maxRadiusInKms} onChange={(e) => updateJson("maxRadiusInKms", Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Min Delivery Charge</Label>
              <Input type="number" value={json.minDeliveryCharge} onChange={(e) => updateJson("minDeliveryCharge", Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Charge After Min Radius</Label>
              <Input type="number" value={json.deliveryChargeAterMinRadius} onChange={(e) => updateJson("deliveryChargeAterMinRadius", Number(e.target.value))} />
            </div>
      {json.isFreeDelivery && (
        <Card>
          <CardHeader><CardTitle className="text-amber-600">Commission-Based Delivery Boy Pay</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-amber-500">Delivery is free for the customer. Set how much to pay commission-based delivery boys per kilometer. Salaried delivery boys are not affected.</p>
            <div className="space-y-2">
              <Label>Commission Per KM (₹)</Label>
              <Input type="number" min={0} step={0.5} value={json.commissionPerKm} onChange={(e) => updateJson("commissionPerKm", Number(e.target.value))} />
            </div>
          </CardContent>
        </Card>
      )}

            {json.isSurge && (
              <>
                <div className="space-y-2">
                  <Label>Surge Count</Label>
                  <Input type="number" value={json.surgeCount} onChange={(e) => updateJson("surgeCount", Number(e.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label>Surge Charge</Label>
                  <Input type="number" value={json.surgeCharge} onChange={(e) => updateJson("surgeCharge", Number(e.target.value))} />
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
