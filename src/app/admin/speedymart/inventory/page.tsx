"use client";

import { AdminInventoryPage } from "@/components/inventory/admin-inventory-page";
import { PlatformType } from "@/lib/constants";

export default function AdminSpeedyMartInventoryPage() {
  return <AdminInventoryPage platformType={PlatformType.SpeedyMart} platformLabel="SpeedyMart" />;
}
