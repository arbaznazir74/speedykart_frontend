"use client";

import { useState, lazy, Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiPost } from "@/lib/api-client";
import { API_ENDPOINTS } from "@/lib/constants";
import {
  Zap, Loader2, ArrowLeft, ArrowRight, Store, MapPin, CheckCircle2,
} from "lucide-react";
import Link from "next/link";

const MapPicker = lazy(() =>
  import("@/components/shared/map-picker").then((m) => ({ default: m.MapPicker }))
);

interface SignupForm {
  storeName: string;
  name: string;
  username: string;
  email: string;
  mobile: string;
  password: string;
  confirmPassword: string;
  storeDescription: string;
  city: string;
  state: string;
  latitude: number | null;
  longitude: number | null;
}

const initialForm: SignupForm = {
  storeName: "", name: "", username: "", email: "", mobile: "",
  password: "", confirmPassword: "", storeDescription: "",
  city: "", state: "",
  latitude: null, longitude: null,
};

export default function SellerSignupPage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<SignupForm>(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function update<K extends keyof SignupForm>(key: K, val: SignupForm[K]) {
    setForm((f) => ({ ...f, [key]: val }));
    setError(null);
  }

  function validateStep1(): string | null {
    if (!form.storeName.trim()) return "Store name is required";
    if (!form.name.trim()) return "Owner name is required";
    if (!form.username.trim() || form.username.length < 5) return "Username must be at least 5 characters";
    if (!form.email.trim() || !form.email.includes("@")) return "Valid email is required";
    if (!form.mobile.trim()) return "Mobile number is required";
    if (!form.password || form.password.length < 6) return "Password must be at least 6 characters";
    if (form.password !== form.confirmPassword) return "Passwords do not match";
    return null;
  }

  function validateStep2(): string | null {
    if (form.latitude == null || form.longitude == null) return "Please select your store location on the map";
    return null;
  }

  function goNext() {
    const err = validateStep1();
    if (err) { setError(err); return; }
    setStep(2);
  }

  async function handleSubmit() {
    const err = validateStep2();
    if (err) { setError(err); return; }

    setLoading(true);
    setError(null);
    try {
      const resp = await apiPost<Record<string, unknown>, { boolResponse: boolean; responseMessage: string }>(
        `${API_ENDPOINTS.SELLER}/register`,
        {
          storeName: form.storeName,
          name: form.name,
          username: form.username,
          email: form.email,
          mobile: form.mobile,
          password: form.password,
          storeDescription: form.storeDescription || null,
          city: form.city || null,
          state: form.state || null,
          latitude: form.latitude,
          longitude: form.longitude,
        }
      );
      if (resp.isError) {
        setError(resp.errorData?.displayMessage ?? "Signup failed");
      } else {
        setSuccess(true);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 px-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-10 pb-8 space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Application Submitted!</h2>
            <p className="text-slate-500">
              Your seller account has been created and is pending admin approval.
              You will receive an email at <strong>{form.email}</strong> once your account is approved.
            </p>
            <Link href="/login">
              <Button className="mt-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Login
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* Left brand panel */}
      <div className="hidden lg:flex lg:w-[420px] flex-col justify-between bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 p-10 text-white relative overflow-hidden">
        <div className="absolute -top-24 -left-24 h-64 w-64 rounded-full bg-white/5" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-white/5" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <img src="/logo.jpg" alt="SpeedyKart" className="h-10 w-10 rounded-xl border-2 border-white shadow-lg object-cover" />
            <span className="text-xl font-bold tracking-tight">SpeedyKart</span>
          </div>
          <p className="text-indigo-200 text-sm">Seller Registration</p>
        </div>
        <div className="relative z-10 space-y-6">
          <h2 className="text-3xl font-bold leading-tight">Start selling<br />on SpeedyKart<br />today.</h2>
          <p className="text-indigo-200 leading-relaxed max-w-sm">
            Register your store, get approved by admin, and start managing products, orders, and deliveries.
          </p>
          <div className="flex gap-3">
            <div className={`h-2 flex-1 rounded-full ${step >= 1 ? "bg-white" : "bg-white/20"}`} />
            <div className={`h-2 flex-1 rounded-full ${step >= 2 ? "bg-white" : "bg-white/20"}`} />
          </div>
          <p className="text-sm text-indigo-200">Step {step} of 2 — {step === 1 ? "Account Details" : "Store Location"}</p>
        </div>
        <p className="relative z-10 text-xs text-indigo-300">&copy; {new Date().getFullYear()} SpeedyKart</p>
      </div>

      {/* Right form panel */}
      <div className="flex flex-1 flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 px-6 py-8 overflow-y-auto">
        <div className="w-full max-w-lg">
          {/* Mobile logo */}
          <div className="mb-6 flex items-center gap-2 lg:hidden">
            <img src="/logo.jpg" alt="SpeedyKart" className="h-9 w-9 rounded-xl border-2 border-white shadow-lg object-cover" />
            <span className="text-lg font-bold">SpeedyKart</span>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900">
              {step === 1 ? "Create Seller Account" : "Set Store Location"}
            </h2>
            <p className="mt-1 text-slate-500 text-sm">
              {step === 1 ? "Fill in your store and account details" : "Pin your store location on the map"}
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600 mb-4">
              <div className="h-2 w-2 rounded-full bg-red-500 shrink-0" />
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Store Name *</Label>
                  <Input value={form.storeName} onChange={(e) => update("storeName", e.target.value)} placeholder="My Store" />
                </div>
                <div className="space-y-1.5">
                  <Label>Owner Name *</Label>
                  <Input value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="John Doe" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Username *</Label>
                <Input value={form.username} onChange={(e) => update("username", e.target.value)} placeholder="mystore123 (min 5 characters)" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Email *</Label>
                  <Input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="store@example.com" />
                </div>
                <div className="space-y-1.5">
                  <Label>Mobile *</Label>
                  <Input value={form.mobile} onChange={(e) => update("mobile", e.target.value)} placeholder="+91XXXXXXXXXX" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Password *</Label>
                  <Input type="password" value={form.password} onChange={(e) => update("password", e.target.value)} placeholder="Min 6 characters" />
                </div>
                <div className="space-y-1.5">
                  <Label>Confirm Password *</Label>
                  <Input type="password" value={form.confirmPassword} onChange={(e) => update("confirmPassword", e.target.value)} placeholder="Re-enter password" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Store Description</Label>
                <textarea className="flex min-h-[70px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.storeDescription} onChange={(e) => update("storeDescription", e.target.value)} placeholder="Brief description of your store (optional)" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>City</Label>
                  <Input value={form.city} onChange={(e) => update("city", e.target.value)} placeholder="City" />
                </div>
                <div className="space-y-1.5">
                  <Label>State</Label>
                  <Input value={form.state} onChange={(e) => update("state", e.target.value)} placeholder="State" />
                </div>
              </div>

              <Button className="w-full h-11" onClick={goNext}>
                Next — Set Location <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-indigo-500" />
                    Store Location
                  </CardTitle>
                  <CardDescription>Click on the map to set your store&apos;s exact location</CardDescription>
                </CardHeader>
                <CardContent>
                  <Suspense fallback={<div className="h-[350px] bg-slate-100 rounded-lg animate-pulse flex items-center justify-center text-slate-400">Loading map...</div>}>
                    <MapPicker
                      lat={form.latitude ?? 34.0837}
                      lng={form.longitude ?? 74.7973}
                      onLocationSelect={(lat, lng) => {
                        update("latitude", lat);
                        update("longitude", lng);
                      }}
                    />
                  </Suspense>
                </CardContent>
              </Card>

              {form.latitude && form.longitude && (
                <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg">
                  <CheckCircle2 className="h-4 w-4" />
                  Location set: {form.latitude.toFixed(4)}, {form.longitude.toFixed(4)}
                </div>
              )}

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 h-11" onClick={() => setStep(1)}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button className="flex-1 h-11" onClick={handleSubmit} disabled={loading}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Store className="mr-2 h-4 w-4" />}
                  {loading ? "Submitting..." : "Submit Application"}
                </Button>
              </div>
            </div>
          )}

          <p className="mt-6 text-center text-sm text-slate-500">
            Already have an account?{" "}
            <Link href="/login" className="text-indigo-600 font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
