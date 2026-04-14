"use client";
import { BannerPageContent } from "@/components/shared/banner-page-content";
import { PlatformType } from "@/lib/constants";

export default function HotBoxBannersPage() {
  return (
    <BannerPageContent
      title="HotBox Banners"
      description="Manage HotBox promotional banners"
      platformType={PlatformType.HotBox}
    />
  );
}
