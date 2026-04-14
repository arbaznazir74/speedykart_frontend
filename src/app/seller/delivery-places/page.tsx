"use client";

import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { apiGet, apiPut } from "@/lib/api-client";
import { API_ENDPOINTS } from "@/lib/constants";
import { MapPin, Clock, CheckCircle2, XCircle, Navigation } from "lucide-react";
import { toast } from "sonner";

const MapPicker = lazy(() =>
  import("@/components/shared/map-picker").then((m) => ({ default: m.MapPicker }))
);

interface SellerProfile {
  latitude: number | null;
  longitude: number | null;
  pendingLatitude: number | null;
  pendingLongitude: number | null;
  locationStatus: number; // 0=None, 1=Pending, 2=Approved, 3=Rejected
  storeName: string;
}

const STATUS_MAP: Record<number, { label: string; color: string }> = {
  0: { label: "No Request", color: "bg-slate-100 text-slate-600" },
  1: { label: "Pending Approval", color: "bg-amber-100 text-amber-700" },
  2: { label: "Approved", color: "bg-emerald-100 text-emerald-700" },
  3: { label: "Rejected", color: "bg-red-100 text-red-700" },
};

export default function StoreLocationPage() {
  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [newLat, setNewLat] = useState<number | null>(null);
  const [newLng, setNewLng] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await apiGet<SellerProfile>(`${API_ENDPOINTS.SELLER}/mine`);
      if (resp.successData) setProfile(resp.successData);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  async function handleSubmitRequest() {
    if (newLat == null || newLng == null) {
      toast.warning("Please select a location on the map first.");
      return;
    }
    setSubmitting(true);
    try {
      const resp = await apiPut<never, { boolResponse: boolean; responseMessage: string }>(
        `${API_ENDPOINTS.SELLER}/mine/location?latitude=${newLat}&longitude=${newLng}`
      );
      if (resp.isError) {
        toast.error(resp.errorData?.displayMessage ?? "Failed to submit request");
      } else {
        toast.success(resp.successData?.responseMessage ?? "Location change request submitted!");
        setShowPicker(false);
        setNewLat(null);
        setNewLng(null);
        await loadProfile();
      }
    } catch { toast.error("Something went wrong"); }
    setSubmitting(false);
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Store Location" description="Your store's map location" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  const hasLocation = profile?.latitude != null && profile?.longitude != null;
  const hasPending = profile?.locationStatus === 1;
  const status = STATUS_MAP[profile?.locationStatus ?? 0];

  return (
    <div className="space-y-6">
      <PageHeader title="Store Location" description="Manage your store's map location" />

      {/* Current Location Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MapPin className="h-5 w-5 text-indigo-500" />
            Current Store Location
          </CardTitle>
          <CardDescription>
            This is the location visible to customers and used for delivery.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasLocation ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-4 py-2.5">
                  <Navigation className="h-4 w-4 text-slate-500" />
                  <span className="text-sm font-medium">
                    {Number(profile!.latitude).toFixed(6)}, {Number(profile!.longitude).toFixed(6)}
                  </span>
                </div>
                <Badge className={status.color}>{status.label}</Badge>
              </div>
              <Suspense fallback={<Skeleton className="h-[300px] w-full rounded-lg" />}>
                <div className="pointer-events-none opacity-90">
                  <MapPicker
                    lat={Number(profile!.latitude)}
                    lng={Number(profile!.longitude)}
                    onLocationSelect={() => {}}
                    height="300px"
                  />
                </div>
              </Suspense>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 space-y-2">
              <MapPin className="h-10 w-10" />
              <p>No store location set yet.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Request Info */}
      {hasPending && profile?.pendingLatitude != null && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800">Location Change Pending</p>
                <p className="text-sm text-amber-600 mt-1">
                  Your requested location ({Number(profile.pendingLatitude).toFixed(6)}, {Number(profile.pendingLongitude).toFixed(6)}) is awaiting admin approval.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Change Location */}
      {!showPicker ? (
        <Button
          onClick={() => setShowPicker(true)}
          disabled={hasPending}
          className="gap-2"
        >
          <MapPin className="h-4 w-4" />
          {hasPending ? "Pending Request — Please Wait" : hasLocation ? "Request Location Change" : "Set Store Location"}
        </Button>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Select New Location</CardTitle>
            <CardDescription>Click on the map or drag the marker to your new store location.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Suspense fallback={<Skeleton className="h-[400px] w-full rounded-lg" />}>
              <MapPicker
                lat={profile?.latitude ? Number(profile.latitude) : 34.0837}
                lng={profile?.longitude ? Number(profile.longitude) : 74.7973}
                onLocationSelect={(lat, lng) => { setNewLat(lat); setNewLng(lng); }}
                height="400px"
              />
            </Suspense>

            {newLat != null && newLng != null && (
              <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg">
                <CheckCircle2 className="h-4 w-4" />
                New location: {newLat.toFixed(6)}, {newLng.toFixed(6)}
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => { setShowPicker(false); setNewLat(null); setNewLng(null); }}>
                <XCircle className="mr-2 h-4 w-4" /> Cancel
              </Button>
              <Button onClick={handleSubmitRequest} disabled={submitting || newLat == null}>
                {submitting ? "Submitting..." : "Submit for Approval"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
