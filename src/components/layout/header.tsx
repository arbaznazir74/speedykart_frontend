"use client";

import { useState, useRef, useEffect } from "react";
import { Menu, LogOut, User, Bell, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { ROLE_LABELS } from "@/lib/constants";

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user, role, logout, isAdmin: isAdminUser } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const initials = user?.username
    ? user.username.slice(0, 2).toUpperCase()
    : "??";

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl px-4 md:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden h-9 w-9"
        onClick={onMenuClick}
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div className="flex-1" />

      {/* Notifications */}
      <button className="relative h-9 w-9 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors">
        <Bell className="h-[18px] w-[18px] text-slate-500" />
        <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-indigo-500 ring-2 ring-white" />
      </button>

      <div className="h-6 w-px bg-slate-200" />

      {/* Profile dropdown */}
      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2.5 pl-1 pr-2 py-1 rounded-lg hover:bg-slate-50 transition-colors outline-none cursor-pointer"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-xs font-bold shadow-sm">
            {initials}
          </div>
          <div className="hidden flex-col items-start md:flex">
            <span className="text-sm font-semibold text-slate-800 leading-tight">{user?.username ?? "User"}</span>
            {role != null && (
              <span className="text-[11px] text-slate-500 leading-tight">
                {ROLE_LABELS[role] ?? "Unknown"}
              </span>
            )}
          </div>
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-1 w-56 rounded-lg bg-white shadow-lg ring-1 ring-slate-200 py-1 z-50 animate-in fade-in-0 zoom-in-95 duration-100">
            <div className="px-3 py-2 border-b border-slate-100">
              <p className="text-sm font-semibold text-slate-800">{user?.username ?? "User"}</p>
              <p className="text-xs text-slate-500">{user?.email ?? ""}</p>
            </div>

            <button
              onClick={() => { setOpen(false); router.push(isAdminUser ? "/admin/profile" : "/seller/profile"); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <User className="h-4 w-4 text-slate-400" />
              Profile
            </button>

            {isAdminUser && (
              <button
                onClick={() => { setOpen(false); router.push("/admin/settings"); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <Settings className="h-4 w-4 text-slate-400" />
                Settings
              </button>
            )}

            <div className="border-t border-slate-100 mt-1" />

            <button
              onClick={() => { setOpen(false); logout(); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
