"use client";

import { useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/context/auth-context";
import { apiGet } from "@/lib/api-client";
import { toast } from "sonner";
import { ShoppingBag } from "lucide-react";

const POLL_INTERVAL = 15_000; // 15 seconds

function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();

    // Two-tone chime
    const playTone = (freq: number, startTime: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.4, startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    const now = ctx.currentTime;
    playTone(880, now, 0.3);        // A5
    playTone(1175, now + 0.15, 0.3); // D6
    playTone(1320, now + 0.3, 0.4);  // E6

    setTimeout(() => ctx.close(), 2000);
  } catch {
    // Audio not available
  }
}

interface Order {
  id: number;
  orderNumber: string;
  amount: number;
  orderStatus: string;
  customerName?: string;
}

export function OrderNotificationPoller() {
  const { token, isSeller } = useAuth();
  const knownOrderIds = useRef<Set<number>>(new Set());
  const isFirstPoll = useRef(true);

  const poll = useCallback(async () => {
    if (!token || !isSeller) return;

    try {
      const resp = await apiGet<Order[]>("api/v1/Seller/mine/seller-orders", {
        skip: 0,
        top: 20,
      });

      const orders = resp.successData ?? [];

      if (isFirstPoll.current) {
        // Seed known IDs on first load — don't alert for existing orders
        orders.forEach((o) => knownOrderIds.current.add(o.id));
        isFirstPoll.current = false;
        return;
      }

      const newOrders = orders.filter(
        (o) =>
          !knownOrderIds.current.has(o.id) &&
          (o.orderStatus === "Created" || o.orderStatus === "Processing")
      );

      if (newOrders.length > 0) {
        playNotificationSound();

        newOrders.forEach((o) => {
          knownOrderIds.current.add(o.id);
          toast(
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100">
                <ShoppingBag className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="font-semibold text-sm text-slate-900">
                  🔔 New Order!
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  #{o.orderNumber} • ₹{o.amount?.toFixed(2)}
                  {o.customerName ? ` • ${o.customerName}` : ""}
                </p>
                <p className="text-xs text-indigo-600 mt-1 font-medium">
                  Go to Incoming Orders to accept
                </p>
              </div>
            </div>,
            { duration: 10000, id: `new-order-${o.id}` }
          );
        });
      }

      // Also track all IDs so we don't re-alert
      orders.forEach((o) => knownOrderIds.current.add(o.id));
    } catch {
      // Silently fail polling
    }
  }, [token, isSeller]);

  useEffect(() => {
    if (!token || !isSeller) return;

    // Initial poll
    poll();

    const interval = setInterval(poll, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [poll, token, isSeller]);

  return null; // Invisible component
}
