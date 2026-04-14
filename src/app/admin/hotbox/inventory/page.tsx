"use client";

import { AdminInventoryPage } from "@/components/inventory/admin-inventory-page";
import { PlatformType } from "@/lib/constants";

export default function AdminHotBoxInventoryPage() {
  return <AdminInventoryPage platformType={PlatformType.HotBox} platformLabel="HotBox" />;
}
