"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { RoleType } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Zap,
  Eye,
  EyeOff,
  Loader2,
  Shield,
  Store,
  ArrowRight,
  Package,
  TrendingUp,
  BarChart3,
} from "lucide-react";

function LoginContent() {
  const { login } = useAuth();
  const searchParams = useSearchParams();
  const sessionExpired = searchParams.get("session") === "expired";
  const [tab, setTab] = useState<"admin" | "seller">("admin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const roleType =
        tab === "admin" ? RoleType.SuperAdmin : RoleType.Seller;
      await login(username, password, roleType, remember);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Login failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left — Brand Panel */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[540px] flex-col justify-between bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 p-10 text-white relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-24 -left-24 h-64 w-64 rounded-full bg-white/5" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-white/5" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-72 w-72 rounded-full bg-white/5" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <img src="/logo.jpg" alt="SpeedyKart" className="h-10 w-10 rounded-xl border-2 border-white shadow-lg object-cover" />
            <span className="text-xl font-bold tracking-tight">SpeedyKart</span>
          </div>
          <p className="text-indigo-200 text-sm">Management Console</p>
        </div>

        <div className="relative z-10 space-y-8">
          <div>
            <h2 className="text-3xl font-bold leading-tight">
              Manage your<br />
              entire business<br />
              from one place.
            </h2>
            <p className="mt-4 text-indigo-200 leading-relaxed max-w-sm">
              Control products, orders, deliveries, and analytics across HotBox and SpeedyMart — all in a single powerful dashboard.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: Package, label: "Products", val: "2.4K+" },
              { icon: TrendingUp, label: "Orders", val: "18K+" },
              { icon: BarChart3, label: "Revenue", val: "₹5.2L" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl bg-white/10 backdrop-blur-sm p-3">
                <s.icon className="h-5 w-5 text-indigo-200 mb-2" />
                <p className="text-lg font-bold">{s.val}</p>
                <p className="text-xs text-indigo-300">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-xs text-indigo-300">
          &copy; {new Date().getFullYear()} SpeedyKart. All rights reserved.
        </p>
      </div>

      {/* Right — Login Form */}
      <div className="flex flex-1 flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 px-6 py-12">
        <div className="w-full max-w-[420px]">
          {/* Mobile logo */}
          <div className="mb-8 flex flex-col items-center gap-2 lg:hidden">
            <img src="/logo.jpg" alt="SpeedyKart" className="h-12 w-12 rounded-2xl border-2 border-white shadow-lg shadow-indigo-200 object-cover" />
            <h1 className="text-xl font-bold text-slate-900">SpeedyKart</h1>
          </div>

          {/* Tab Switcher */}
          <div className="grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1.5 mb-8">
            <button
              type="button"
              onClick={() => { setTab("admin"); setError(null); }}
              className={cn(
                "flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200",
                tab === "admin"
                  ? "bg-white text-slate-900 shadow-sm shadow-slate-200/60"
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              <Shield className="h-4 w-4" />
              Admin
            </button>
            <button
              type="button"
              onClick={() => { setTab("seller"); setError(null); }}
              className={cn(
                "flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200",
                tab === "seller"
                  ? "bg-white text-slate-900 shadow-sm shadow-slate-200/60"
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              <Store className="h-4 w-4" />
              Seller
            </button>
          </div>

          {/* Heading */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900">
              {tab === "admin" ? "Welcome back" : "Seller Portal"}
            </h2>
            <p className="mt-1 text-slate-500 text-sm">
              {tab === "admin"
                ? "Sign in to the admin dashboard"
                : "Sign in to manage your store & products"}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            {sessionExpired && !error && (
              <div className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700">
                <div className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                Please login first to access that page.
              </div>
            )}
            {error && (
              <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
                <div className="h-2 w-2 rounded-full bg-red-500 shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-slate-700 font-medium text-sm">
                Username
              </Label>
              <Input
                id="username"
                placeholder="Username or email"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                className="h-12 rounded-xl border-slate-200 bg-white px-4 text-sm placeholder:text-slate-400 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-400"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-slate-700 font-medium text-sm">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="h-12 rounded-xl border-slate-200 bg-white px-4 pr-11 text-sm placeholder:text-slate-400 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-400"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4.5 w-4.5" />
                  ) : (
                    <Eye className="h-4.5 w-4.5" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <input
                type="checkbox"
                id="remember"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <Label htmlFor="remember" className="text-sm font-normal text-slate-600 cursor-pointer">
                Keep me signed in
              </Label>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-lg shadow-indigo-200/50 transition-all duration-200 hover:shadow-xl hover:shadow-indigo-200/60 active:scale-[0.98]"
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="mr-2 h-4 w-4" />
              )}
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          {tab === "seller" && (
            <p className="mt-6 text-center text-sm text-slate-500">
              New seller?{" "}
              <a href="/seller-signup" className="text-indigo-600 font-medium hover:underline">
                Sign up here
              </a>
            </p>
          )}

          <p className="mt-8 text-center text-xs text-slate-400 lg:hidden">
            &copy; {new Date().getFullYear()} SpeedyKart. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
