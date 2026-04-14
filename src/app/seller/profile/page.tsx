"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { apiGet, apiPut } from "@/lib/api-client";
import { API_ENDPOINTS } from "@/lib/constants";
import { useAuth } from "@/context/auth-context";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

interface SellerProfile {
  id: number;
  name: string;
  username: string;
  storeName: string;
  email: string | null;
  mobile: string | null;
  storeDescription: string | null;
  street: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  placeName: string | null;
  taxNumber: string | null;
  fssaiLicNo: string | null;
  accountNumber: string | null;
  bankIfscCode: string | null;
  accountName: string | null;
  bankName: string | null;
}

export default function SellerProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadProfile(); }, []);

  async function loadProfile() {
    setLoading(true);
    try {
      const resp = await apiGet<SellerProfile>(`${API_ENDPOINTS.SELLER}/mine`);
      setProfile(resp.successData ?? null);
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!profile) return;
    setSaving(true);
    try {
      const resp = await apiPut<SellerProfile, SellerProfile>(`${API_ENDPOINTS.SELLER}/mine`, profile);
      if (resp.isError) {
        toast.error(resp.errorData?.displayMessage ?? "Failed to save profile. Please try again.");
      } else {
        toast.success("Profile saved successfully!");
        await loadProfile();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong while saving.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  function update(key: keyof SellerProfile, value: string) {
    if (profile) setProfile({ ...profile, [key]: value });
  }

  if (loading) {
    return <div className="space-y-6"><h1 className="text-2xl font-bold">Profile</h1><Skeleton className="h-96 w-full" /></div>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="text-lg bg-primary/10 text-primary">
              {profile?.storeName?.slice(0, 2).toUpperCase() ?? user?.username?.slice(0, 2).toUpperCase() ?? "??"}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold">{profile?.storeName ?? "My Store"}</h1>
            <p className="text-sm text-muted-foreground">{profile?.name}</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Store Information</CardTitle>
          <CardDescription>Basic store details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Store Name</Label>
              <Input value={profile?.storeName ?? ""} onChange={(e) => update("storeName", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Owner Name</Label>
              <Input value={profile?.name ?? ""} onChange={(e) => update("name", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Mobile</Label>
              <Input value={profile?.mobile ?? ""} onChange={(e) => update("mobile", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={profile?.email ?? ""} onChange={(e) => update("email", e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Store Description</Label>
            <textarea className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={profile?.storeDescription ?? ""} onChange={(e) => update("storeDescription", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>City</Label>
              <Input value={profile?.city ?? ""} onChange={(e) => update("city", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>State</Label>
              <Input value={profile?.state ?? ""} onChange={(e) => update("state", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tax Number (GST)</Label>
              <Input value={profile?.taxNumber ?? ""} onChange={(e) => update("taxNumber", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>FSSAI License</Label>
              <Input value={profile?.fssaiLicNo ?? ""} onChange={(e) => update("fssaiLicNo", e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bank Details</CardTitle>
          <CardDescription>Your payment account details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Account Name</Label>
              <Input value={profile?.accountName ?? ""} onChange={(e) => update("accountName", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Account Number</Label>
              <Input value={profile?.accountNumber ?? ""} onChange={(e) => update("accountNumber", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Bank Name</Label>
              <Input value={profile?.bankName ?? ""} onChange={(e) => update("bankName", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>IFSC Code</Label>
              <Input value={profile?.bankIfscCode ?? ""} onChange={(e) => update("bankIfscCode", e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
