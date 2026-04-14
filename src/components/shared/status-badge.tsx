"use client";

import { cn } from "@/lib/utils";

const STATUS_MAP: Record<string, { dot: string; bg: string; text: string }> = {
  Active:          { dot: "bg-emerald-500", bg: "bg-emerald-50", text: "text-emerald-700" },
  Inactive:        { dot: "bg-slate-400",   bg: "bg-slate-50",   text: "text-slate-600" },
  Enabled:         { dot: "bg-emerald-500", bg: "bg-emerald-50", text: "text-emerald-700" },
  Disabled:        { dot: "bg-red-500",     bg: "bg-red-50",     text: "text-red-700" },
  Created:         { dot: "bg-blue-500",    bg: "bg-blue-50",    text: "text-blue-700" },
  Processing:      { dot: "bg-amber-500",   bg: "bg-amber-50",   text: "text-amber-700" },
  Shipped:         { dot: "bg-violet-500",  bg: "bg-violet-50",  text: "text-violet-700" },
  Delivered:       { dot: "bg-emerald-500", bg: "bg-emerald-50", text: "text-emerald-700" },
  Cancelled:       { dot: "bg-red-500",     bg: "bg-red-50",     text: "text-red-700" },
  Returned:        { dot: "bg-orange-500",  bg: "bg-orange-50",  text: "text-orange-700" },
  Failed:          { dot: "bg-red-500",     bg: "bg-red-50",     text: "text-red-700" },
  Assigned:        { dot: "bg-indigo-500",  bg: "bg-indigo-50",  text: "text-indigo-700" },
  CancelledBySeller: { dot: "bg-red-500",  bg: "bg-red-50",     text: "text-red-700" },
  SellerAccepted:  { dot: "bg-emerald-500", bg: "bg-emerald-50", text: "text-emerald-700" },
  PickedUp:        { dot: "bg-cyan-500",    bg: "bg-cyan-50",    text: "text-cyan-700" },
  OutForDelivery:  { dot: "bg-violet-500",  bg: "bg-violet-50",  text: "text-violet-700" },
  RefundInitiated: { dot: "bg-orange-500",  bg: "bg-orange-50",  text: "text-orange-700" },
  Pending:         { dot: "bg-amber-500",   bg: "bg-amber-50",   text: "text-amber-700" },
  Paid:            { dot: "bg-emerald-500", bg: "bg-emerald-50", text: "text-emerald-700" },
  Veg:             { dot: "bg-green-500",   bg: "bg-green-50",   text: "text-green-700" },
  NonVeg:          { dot: "bg-red-500",     bg: "bg-red-50",     text: "text-red-700" },
  Egg:             { dot: "bg-amber-500",   bg: "bg-amber-50",   text: "text-amber-700" },
  None:            { dot: "bg-slate-400",   bg: "bg-slate-50",   text: "text-slate-600" },
  HotBox:          { dot: "bg-orange-500",  bg: "bg-orange-50",  text: "text-orange-700" },
  SpeedyMart:      { dot: "bg-blue-500",    bg: "bg-blue-50",    text: "text-blue-700" },
  Returnable:      { dot: "bg-emerald-500", bg: "bg-emerald-50", text: "text-emerald-700" },
  NonReturnable:   { dot: "bg-slate-400",   bg: "bg-slate-50",   text: "text-slate-600" },
};

const NUMERIC_STATUS_MAP: Record<number, string> = {
  0: "Active",
  1: "Inactive",
  2: "Pending",
};

const DEFAULT_STYLE = { dot: "bg-slate-400", bg: "bg-slate-50", text: "text-slate-600" };

interface StatusBadgeProps {
  status: string | number | null | undefined;
  className?: string;
  labelOverride?: Record<string, string>;
}

export function StatusBadge({ status, className, labelOverride }: StatusBadgeProps) {
  const raw = status?.toString() ?? "Unknown";
  const mapped = typeof status === "number" ? (NUMERIC_STATUS_MAP[status] ?? raw) : raw;
  const label = labelOverride?.[mapped] ?? mapped;
  const s = STATUS_MAP[mapped] ?? DEFAULT_STYLE;

  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold",
      s.bg, s.text, className
    )}>
      <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
      {label}
    </span>
  );
}
