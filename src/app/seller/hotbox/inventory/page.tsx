"use client";

import { InventoryPage } from "@/components/inventory/inventory-page";
import { PlatformType } from "@/lib/constants";

export default function SellerHotBoxInventoryPage() {
  return <InventoryPage platformType={PlatformType.HotBox} platformLabel="HotBox" />;
}
