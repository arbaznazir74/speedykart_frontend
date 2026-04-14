"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { apiGet, apiPut } from "@/lib/api-client";
import { API_ENDPOINTS } from "@/lib/constants";
import { Checkbox } from "@/components/ui/checkbox";
import { Clock, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface StoreHour {
  id?: number;
  sellerId?: number;
  dayOfWeek: number;
  openTime: string | null;
  closeTime: string | null;
  isClosed: boolean;
}

function is24Hour(h: StoreHour): boolean {
  return !h.isClosed && h.openTime === "00:00:00" && h.closeTime === "23:59:00";
}

function tsToInput(ts: string | null): string {
  if (!ts) return "";
  // "10:00:00" -> "10:00"
  return ts.substring(0, 5);
}

function inputToTs(val: string): string | null {
  if (!val) return null;
  // "10:00" -> "10:00:00"
  return val + ":00";
}

export default function StoreHoursPage() {
  const [hours, setHours] = useState<StoreHour[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchHours();
  }, []);

  async function fetchHours() {
    setLoading(true);
    try {
      const resp = await apiGet<StoreHour[]>(`${API_ENDPOINTS.STORE_HOURS}/mine`);
      const data = resp.successData ?? [];

      // Fill all 7 days
      const filled: StoreHour[] = DAY_NAMES.map((_, i) => {
        const existing = data.find((d) => d.dayOfWeek === i);
        return existing ?? { dayOfWeek: i, openTime: null, closeTime: null, isClosed: false };
      });
      setHours(filled);
    } catch {
      toast.error("Failed to load store hours");
    }
    setLoading(false);
  }

  function updateDay(dow: number, patch: Partial<StoreHour>) {
    setHours((prev) => prev.map((h) => (h.dayOfWeek === dow ? { ...h, ...patch } : h)));
  }

  async function handleSave() {
    // Validate open days have times
    for (const h of hours) {
      if (!h.isClosed && !is24Hour(h) && (!h.openTime || !h.closeTime)) {
        toast.error(`Please set open and close times for ${DAY_NAMES[h.dayOfWeek]}, or mark it as closed`);
        return;
      }
    }

    setSaving(true);
    try {
      const resp = await apiPut<StoreHour[], StoreHour[]>(`${API_ENDPOINTS.STORE_HOURS}/mine`, hours);
      if (resp.isError) {
        toast.error(resp.errorData?.displayMessage ?? "Failed to save");
      } else {
        toast.success("Store hours saved!");
        const data = resp.successData ?? [];
        const filled: StoreHour[] = DAY_NAMES.map((_, i) => {
          const existing = data.find((d) => d.dayOfWeek === i);
          return existing ?? { dayOfWeek: i, openTime: null, closeTime: null, isClosed: false };
        });
        setHours(filled);
      }
    } catch {
      toast.error("Error saving store hours");
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Clock className="h-6 w-6 text-indigo-600" />
          <h1 className="text-2xl font-bold">Store Hours</h1>
        </div>
        <Card>
          <CardContent className="p-6 space-y-4">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Clock className="h-6 w-6 text-indigo-600" />
          <div>
            <h1 className="text-2xl font-bold">Store Hours</h1>
            <p className="text-sm text-slate-500">Set your weekly operating hours. This repeats every week.</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Weekly Schedule</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {hours.map((h) => (
            <div
              key={h.dayOfWeek}
              className={`flex items-center gap-4 py-3 px-4 rounded-lg transition-colors ${
                h.isClosed ? "bg-slate-50 opacity-60" : "bg-white hover:bg-slate-50"
              }`}
            >
              {/* Day name */}
              <div className="w-28 font-semibold text-sm">{DAY_NAMES[h.dayOfWeek]}</div>

              {/* Open/Closed toggle */}
              <div className="flex items-center gap-2 w-24">
                <Switch
                  checked={!h.isClosed}
                  onCheckedChange={(open) => updateDay(h.dayOfWeek, { isClosed: !open })}
                />
                <span className={`text-xs font-medium ${h.isClosed ? "text-red-500" : "text-emerald-600"}`}>
                  {h.isClosed ? "Closed" : "Open"}
                </span>
              </div>

              {/* 24 Hours checkbox + Time pickers */}
              {!h.isClosed && (
                <div className="flex items-center gap-4 flex-1">
                  <div className="flex items-center gap-1.5">
                    <Checkbox
                      id={`24h-${h.dayOfWeek}`}
                      checked={is24Hour(h)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          updateDay(h.dayOfWeek, { openTime: "00:00:00", closeTime: "23:59:00" });
                        } else {
                          updateDay(h.dayOfWeek, { openTime: null, closeTime: null });
                        }
                      }}
                    />
                    <label htmlFor={`24h-${h.dayOfWeek}`} className="text-xs font-medium text-indigo-600 cursor-pointer select-none">24 Hours</label>
                  </div>

                  {!is24Hour(h) && (
                    <>
                      <div className="flex items-center gap-1.5">
                        <label className="text-xs text-slate-400">From</label>
                        <input
                          type="time"
                          className="border rounded-md px-2 py-1.5 text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                          value={tsToInput(h.openTime)}
                          onChange={(e) => updateDay(h.dayOfWeek, { openTime: inputToTs(e.target.value) })}
                        />
                      </div>
                      <span className="text-slate-300">—</span>
                      <div className="flex items-center gap-1.5">
                        <label className="text-xs text-slate-400">To</label>
                        <input
                          type="time"
                          className="border rounded-md px-2 py-1.5 text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                          value={tsToInput(h.closeTime)}
                          onChange={(e) => updateDay(h.dayOfWeek, { closeTime: inputToTs(e.target.value) })}
                        />
                      </div>
                    </>
                  )}
                </div>
              )}

              {h.isClosed && <div className="flex-1 text-sm text-slate-400 italic">Store is closed this day</div>}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
