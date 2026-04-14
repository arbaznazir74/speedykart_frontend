"use client";

import { InventoryPage } from "@/components/inventory/inventory-page";
import { PlatformType } from "@/lib/constants";

export default function SellerSpeedyMartInventoryPage() {
  return <InventoryPage platformType={PlatformType.SpeedyMart} platformLabel="SpeedyMart" />;
}
