"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { DashboardLayout } from "@/components/layout/dashboard-layout";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isLoading, isAdmin, token } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && (!token || !isAdmin)) {
      router.push(`/login?session=expired&returnUrl=${encodeURIComponent(pathname)}`);
    }
  }, [isLoading, isAdmin, token, router, pathname]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f8fafc]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-indigo-200 border-t-indigo-600" />
          <p className="text-sm text-slate-400 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) return null;

  return <DashboardLayout>{children}</DashboardLayout>;
}
