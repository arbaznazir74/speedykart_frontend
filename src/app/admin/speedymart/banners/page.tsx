"use client";
import { BannerPageContent } from "@/components/shared/banner-page-content";
import { PlatformType } from "@/lib/constants";

export default function SpeedyMartBannersPage() {
  return (
    <BannerPageContent
      title="SpeedyMart Banners"
      description="Manage SpeedyMart promotional banners"
      platformType={PlatformType.SpeedyMart}
    />
  );
}
