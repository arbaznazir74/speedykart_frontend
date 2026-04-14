"use client";
import { useCrud } from "@/hooks/use-crud";
import { CrudPage, ColumnDef, FormField } from "@/components/shared/crud-page";
import { API_ENDPOINTS, PlatformType } from "@/lib/constants";
import { getImageSrc } from "@/lib/format";

interface Banner {
  id: number;
  title: string;
  subTitle: string;
  bannerType: string;
  platformType: string | number;
  contentBase64: string | null;
  extension: string | null;
  sliderUrl: string;
  isDefault: boolean;
  priority: number;
}

const columns: ColumnDef<Banner>[] = [
  { key: "id", header: "ID", className: "w-16" },
  { key: "contentBase64", header: "Preview", render: (i) => i.contentBase64 ? <img src={getImageSrc(i.contentBase64)} className="h-10 w-20 object-cover rounded" alt="" /> : <span className="text-slate-400">—</span> },
  { key: "title", header: "Title" },
  { key: "subTitle", header: "Subtitle" },
  { key: "bannerType", header: "Type" },
  { key: "priority", header: "Priority", className: "w-20" },
];
const formFields: FormField[] = [
  { key: "title", label: "Title", required: true, placeholder: "Banner title" },
  { key: "subTitle", label: "Subtitle", placeholder: "Banner subtitle" },
  { key: "bannerType", label: "Banner Type", type: "select", options: [
    { label: "Theme Splash", value: "ThemeSplash" },
    { label: "Hero Banner", value: "HeroBanner" },
    { label: "Festival", value: "FestivalBanner" },
  ]},
  { key: "sliderUrl", label: "Slider URL", placeholder: "https://..." },
  { key: "contentBase64", label: "Banner Image", type: "image" },
  { key: "priority", label: "Priority", type: "number", placeholder: "0" },
  { key: "isDefault", label: "Is Default", type: "select", options: [{ label: "Yes", value: "true" }, { label: "No", value: "false" }] },
];

export default function SpeedyMartBannersPage() {
  const crud = useCrud<Banner>({
    endpoint: `${API_ENDPOINTS.BANNER}?platformType=${PlatformType.SpeedyMart}`,
    writeEndpoint: API_ENDPOINTS.BANNER,
  });
  return (
    <CrudPage title="SpeedyMart Banners" description="Manage SpeedyMart promotional banners" columns={columns} formFields={formFields}
      items={crud.items} total={crud.total} page={crud.page} pageSize={crud.pageSize}
      loading={crud.loading} saving={crud.saving} onPageChange={crud.setPage}
      onCreate={async (d) => { await crud.create({ ...d, platformType: PlatformType.SpeedyMart } as Partial<Banner>); }}
      onUpdate={async (d) => { await crud.update({ ...d, platformType: PlatformType.SpeedyMart } as Partial<Banner>); }}
      onDelete={async (id) => { await crud.remove(id); }}
      getId={(i) => i.id}
      getFormDefaults={(i) => ({ title: i.title, subTitle: i.subTitle, bannerType: i.bannerType, sliderUrl: i.sliderUrl, contentBase64: i.contentBase64 ?? "", priority: i.priority, isDefault: String(i.isDefault) })}
    />
  );
}
