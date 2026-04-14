"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { apiGet, apiPut, apiPost } from "@/lib/api-client";
import { API_ENDPOINTS } from "@/lib/constants";
import { Loader2, Save, Settings2, Zap, Truck, IndianRupee, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

interface Settings {
  id: number;
  isOrderPossible: boolean;
  isFreeDelivery: boolean;
  isSurge: boolean;
  deliveryInMinutes: number;
  surgeCount: number;
  surgeCharge: number;
  referralPercentage: number;
  platormCharge: number;
  cutlaryCharge: number;
  lowCartFeeCharge: number;
  lowCartAmountValue: number;
  isCodAvailable: boolean;
  commissionPerKm: number;
}

const defaultSettings: Settings = {
  id: 0,
  isOrderPossible: true,
  isFreeDelivery: false,
  isSurge: false,
  deliveryInMinutes: 30,
  surgeCount: 0,
  surgeCharge: 0,
  referralPercentage: 0,
  platormCharge: 0,
  cutlaryCharge: 0,
  lowCartFeeCharge: 0,
  lowCartAmountValue: 0,
  isCodAvailable: true,
  commissionPerKm: 0,
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isNew, setIsNew] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    try {
      const resp = await apiGet<Settings>(API_ENDPOINTS.SETTINGS);
      if (resp.successData && resp.successData.id > 0) {
        setSettings(resp.successData);
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
      if (isNew) {
        await apiPost<Settings, Settings>(API_ENDPOINTS.SETTINGS, settings);
      } else {
        await apiPut<Settings, Settings>(API_ENDPOINTS.SETTINGS, settings);
      }
      toast.success("Settings saved successfully");
      await loadSettings();
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  function updateBool(key: keyof Settings, value: boolean) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  function updateNum(key: keyof Settings, value: string) {
    setSettings((prev) => ({ ...prev, [key]: Number(value) || 0 }));
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Platform Settings</h1>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Platform Settings</h1>
          <p className="text-sm text-muted-foreground">Global settings applied across the platform</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Changes
        </Button>
      </div>

      {/* Toggles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Settings2 className="h-5 w-5 text-indigo-500" /> General Toggles</CardTitle>
          <CardDescription>Enable or disable platform-wide features</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label className="font-medium">Orders Enabled</Label>
              <p className="text-xs text-muted-foreground">Allow users to place orders</p>
            </div>
            <Switch checked={settings.isOrderPossible} onCheckedChange={(v) => updateBool("isOrderPossible", v)} />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label className="font-medium">Free Delivery</Label>
              <p className="text-xs text-muted-foreground">Waive delivery charges globally</p>
            </div>
            <Switch checked={settings.isFreeDelivery} onCheckedChange={(v) => updateBool("isFreeDelivery", v)} />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label className="font-medium">COD Available</Label>
              <p className="text-xs text-muted-foreground">Allow Cash on Delivery</p>
            </div>
            <Switch checked={settings.isCodAvailable} onCheckedChange={(v) => updateBool("isCodAvailable", v)} />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label className="font-medium">Surge Pricing</Label>
              <p className="text-xs text-muted-foreground">Enable surge charges during peak hours</p>
            </div>
            <Switch checked={settings.isSurge} onCheckedChange={(v) => updateBool("isSurge", v)} />
          </div>
        </CardContent>
      </Card>

      {/* Commission per KM for delivery boys */}
      {settings.isFreeDelivery && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-700"><Truck className="h-5 w-5 text-amber-500" /> Commission-Based Delivery Boy Pay</CardTitle>
            <CardDescription className="text-amber-600">Delivery is free for customers. Set how much to pay commission-based delivery boys per kilometer. Salaried delivery boys are not affected.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-amber-700">Commission Per KM (₹)</Label>
                <Input type="number" min={0} step={0.5} value={settings.commissionPerKm} onChange={(e) => updateNum("commissionPerKm", e.target.value)} className="border-amber-300 focus:border-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delivery */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Truck className="h-5 w-5 text-blue-500" /> Delivery</CardTitle>
          <CardDescription>Delivery time and related configuration</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Estimated Delivery Time (minutes)</Label>
              <Input type="number" min={0} value={settings.deliveryInMinutes} onChange={(e) => updateNum("deliveryInMinutes", e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charges */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><IndianRupee className="h-5 w-5 text-emerald-500" /> Charges</CardTitle>
          <CardDescription>Platform fees applied to orders</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Platform Charge (₹)</Label>
              <Input type="number" min={0} step={0.01} value={settings.platormCharge} onChange={(e) => updateNum("platormCharge", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Cutlery Charge (₹)</Label>
              <Input type="number" min={0} step={0.01} value={settings.cutlaryCharge} onChange={(e) => updateNum("cutlaryCharge", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Low Cart Fee (₹)</Label>
              <Input type="number" min={0} step={0.01} value={settings.lowCartFeeCharge} onChange={(e) => updateNum("lowCartFeeCharge", e.target.value)} />
              <p className="text-xs text-muted-foreground">Applied when cart is below threshold</p>
            </div>
            <div className="space-y-2">
              <Label>Low Cart Threshold (₹)</Label>
              <Input type="number" min={0} step={0.01} value={settings.lowCartAmountValue} onChange={(e) => updateNum("lowCartAmountValue", e.target.value)} />
              <p className="text-xs text-muted-foreground">Cart amount below which fee is charged</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Surge */}
      {settings.isSurge && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Zap className="h-5 w-5 text-amber-500" /> Surge Settings</CardTitle>
            <CardDescription>Configure surge pricing parameters</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Surge Count</Label>
                <Input type="number" min={0} value={settings.surgeCount} onChange={(e) => updateNum("surgeCount", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Surge Charge (₹)</Label>
                <Input type="number" min={0} step={0.01} value={settings.surgeCharge} onChange={(e) => updateNum("surgeCharge", e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Referral */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-violet-500" /> Referral</CardTitle>
          <CardDescription>Referral reward configuration</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Referral Percentage (%)</Label>
              <Input type="number" min={0} max={100} value={settings.referralPercentage} onChange={(e) => updateNum("referralPercentage", e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
