"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/shared/page-header";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api-client";
import { API_ENDPOINTS } from "@/lib/constants";
import { formatDateTime, getImageSrc } from "@/lib/format";
import {
  Plus, Pencil, Trash2, RefreshCw, Loader2, Upload, X,
  Image as ImageIcon, Film,
} from "lucide-react";

/* ─── constants ─── */
const EP = API_ENDPOINTS.BANNER;
const PAGE_SIZE = 10;

const BANNER_TYPES = [
  { label: "Hero Banner", value: "HeroBanner" },
  { label: "Theme Splash", value: "ThemeSplash" },
  { label: "Festival Banner", value: "FestivalBanner" },
  { label: "Theme Banner", value: "ThemeBanner" },
  { label: "Product Banner", value: "ProductBanner" },
  { label: "Seasonal Banner", value: "SeasonalBanner" },
];

// Backend enum: JPG=0,JPEG=1,PNG=2,WEBP=3,GIF=4,MP4=5,SVG=6
const EXT_MAP: Record<string, number> = {
  jpg: 0, jpeg: 1, png: 2, mp4: 5,
};
const ACCEPT = "image/jpeg,image/png,video/mp4";
const IMAGE_MAX_MB = 4;
const VIDEO_MAX_MB = 6;

/* ─── types ─── */
interface Banner {
  id: number;
  title: string;
  subTitle: string;
  bannerType: string;
  platformType: string | number;
  extension: string | number | null;
  contentBase64: string | null;
  networkContent: string | null;
  sliderUrl: string;
  isDefault: boolean;
  priority: number;
  createdAt?: string;
}

interface FormData {
  title: string;
  subTitle: string;
  bannerType: string;
  sliderUrl: string;
  priority: string;
  isDefault: string;
  contentBase64: string;
  extension: number | null;
}

const emptyForm: FormData = {
  title: "",
  subTitle: "",
  bannerType: "HeroBanner",
  sliderUrl: "",
  priority: "0",
  isDefault: "false",
  contentBase64: "",
  extension: null,
};

/* ─── helpers ─── */
function isVideo(ext: string | number | null | undefined): boolean {
  if (ext === null || ext === undefined) return false;
  const s = String(ext).toLowerCase();
  return s === "mp4" || s === "5";
}

function mediaPreviewUrl(banner: Banner): string | null {
  if (banner.networkContent) return banner.networkContent;
  if (banner.contentBase64) return getImageSrc(banner.contentBase64);
  return null;
}

/* ─── component ─── */
export interface BannerPageContentProps {
  title: string;
  description: string;
  platformType?: number; // undefined = shared (no filter)
}

export function BannerPageContent({ title, description, platformType }: BannerPageContentProps) {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Banner | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [deleting, setDeleting] = useState<number | null>(null);

  // preview state for newly picked file
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewIsVideo, setPreviewIsVideo] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  /* ── list ── */
  const platformQs = platformType !== undefined ? `platformType=${platformType}` : "";

  const fetchBanners = useCallback(async () => {
    setLoading(true);
    try {
      const sep = platformQs ? "?" + platformQs + "&" : "?";
      const [listRes, countRes] = await Promise.all([
        apiGet<Banner[]>(`${EP}${sep}skip=${page * PAGE_SIZE}&top=${PAGE_SIZE}`),
        apiGet<{ intResponse: number }>(`${EP}/count${platformQs ? "?" + platformQs : ""}`),
      ]);
      setBanners(listRes.successData ?? []);
      setTotal(countRes.successData?.intResponse ?? 0);
    } catch { /* ignore */ }
    setLoading(false);
  }, [page, platformQs]);

  useEffect(() => { fetchBanners(); }, [fetchBanners]);

  /* ── open dialog ── */
  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setPreviewUrl(null);
    setPreviewIsVideo(false);
    setFormError("");
    setDialogOpen(true);
  };

  const openEdit = (b: Banner) => {
    setEditing(b);
    setForm({
      title: b.title ?? "",
      subTitle: b.subTitle ?? "",
      bannerType: b.bannerType ?? "HeroBanner",
      sliderUrl: b.sliderUrl ?? "",
      priority: String(b.priority ?? 0),
      isDefault: String(b.isDefault ?? false),
      contentBase64: "",
      extension: null,
    });
    const url = mediaPreviewUrl(b);
    setPreviewUrl(url);
    setPreviewIsVideo(isVideo(b.extension));
    setFormError("");
    setDialogOpen(true);
  };

  /* ── file pick ── */
  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!(ext in EXT_MAP)) {
      setFormError("Only JPG, JPEG, PNG images and MP4 videos are allowed.");
      return;
    }

    const isVid = ext === "mp4";
    const maxBytes = (isVid ? VIDEO_MAX_MB : IMAGE_MAX_MB) * 1024 * 1024;
    if (file.size > maxBytes) {
      setFormError(`File too large. Max ${isVid ? VIDEO_MAX_MB : IMAGE_MAX_MB} MB for ${isVid ? "videos" : "images"}.`);
      return;
    }

    setFormError("");
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      setForm((f) => ({ ...f, contentBase64: base64, extension: EXT_MAP[ext] }));
      setPreviewUrl(result);
      setPreviewIsVideo(isVid);
    };
    reader.readAsDataURL(file);
  };

  const clearFile = () => {
    setForm((f) => ({ ...f, contentBase64: "", extension: null }));
    setPreviewUrl(editing ? mediaPreviewUrl(editing) : null);
    setPreviewIsVideo(editing ? isVideo(editing.extension) : false);
    if (fileRef.current) fileRef.current.value = "";
  };

  /* ── save ── */
  const handleSave = async () => {
    if (!form.title.trim()) { setFormError("Title is required."); return; }
    if (!editing && !form.contentBase64) { setFormError("Please upload an image or video."); return; }

    setSaving(true);
    setFormError("");
    try {
      const payload: Record<string, unknown> = {
        title: form.title,
        subTitle: form.subTitle,
        bannerType: form.bannerType,
        sliderUrl: form.sliderUrl,
        priority: parseInt(form.priority) || 0,
        isDefault: form.isDefault === "true",
      };

      if (platformType !== undefined) {
        payload.platformType = platformType;
      }

      if (form.contentBase64) {
        payload.contentBase64 = form.contentBase64;
        payload.extension = form.extension;
      }

      if (editing) {
        payload.id = editing.id;
        if (!form.contentBase64 && editing.extension !== null) {
          payload.extension = typeof editing.extension === "number" ? editing.extension : EXT_MAP[String(editing.extension).toLowerCase()] ?? 0;
        }
        const res = await apiPut(`${EP}/${editing.id}`, payload);
        if (res.isError) throw new Error(res.errorData?.displayMessage ?? "Update failed");
      } else {
        const res = await apiPost(EP, payload);
        if (res.isError) throw new Error(res.errorData?.displayMessage ?? "Create failed");
      }

      setDialogOpen(false);
      fetchBanners();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Something went wrong");
    }
    setSaving(false);
  };

  /* ── delete ── */
  const handleDelete = async (id: number) => {
    setDeleting(id);
    try {
      await apiDelete(`${EP}/${id}`);
      fetchBanners();
    } catch { /* ignore */ }
    setDeleting(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader title={title} description={description}>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchBanners} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" /> Add Banner
          </Button>
        </div>
      </PageHeader>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">ID</TableHead>
                <TableHead className="w-24">Preview</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Subtitle</TableHead>
                <TableHead className="w-28">Type</TableHead>
                <TableHead className="w-20">Format</TableHead>
                <TableHead className="w-16">Priority</TableHead>
                <TableHead className="w-20">Default</TableHead>
                <TableHead className="w-28 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 9 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : banners.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12 text-slate-500">
                    No banners found
                  </TableCell>
                </TableRow>
              ) : (
                banners.map((b) => {
                  const url = mediaPreviewUrl(b);
                  const vid = isVideo(b.extension);
                  return (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium">{b.id}</TableCell>
                      <TableCell>
                        {url ? (
                          vid ? (
                            <div className="relative h-10 w-20 rounded overflow-hidden bg-slate-900 flex items-center justify-center">
                              <Film className="h-5 w-5 text-white/70" />
                            </div>
                          ) : (
                            <img src={url} className="h-10 w-20 object-cover rounded" alt="" />
                          )
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell className="font-semibold text-slate-900 max-w-[160px] truncate">{b.title}</TableCell>
                      <TableCell className="text-sm text-slate-600 max-w-[140px] truncate">{b.subTitle || "—"}</TableCell>
                      <TableCell><Badge variant="outline">{b.bannerType}</Badge></TableCell>
                      <TableCell>
                        {vid ? (
                          <Badge className="bg-purple-100 text-purple-800"><Film className="h-3 w-3 mr-1" /> Video</Badge>
                        ) : url ? (
                          <Badge className="bg-blue-100 text-blue-800"><ImageIcon className="h-3 w-3 mr-1" /> Image</Badge>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-center">{b.priority}</TableCell>
                      <TableCell>
                        {b.isDefault ? (
                          <Badge className="bg-green-100 text-green-800">Yes</Badge>
                        ) : (
                          <span className="text-xs text-slate-400">No</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(b)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(b.id)} disabled={deleting === b.id}>
                            {deleting === b.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <PaginationControls page={page + 1} pageSize={PAGE_SIZE} total={total} onPageChange={(p) => setPage(p - 1)} />

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Banner" : "Add Banner"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {/* Title */}
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Banner title" />
            </div>

            {/* Subtitle */}
            <div className="space-y-1.5">
              <Label>Subtitle</Label>
              <Input value={form.subTitle} onChange={(e) => setForm((f) => ({ ...f, subTitle: e.target.value }))} placeholder="Banner subtitle" />
            </div>

            {/* Banner Type */}
            <div className="space-y-1.5">
              <Label>Banner Type</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={form.bannerType}
                onChange={(e) => setForm((f) => ({ ...f, bannerType: e.target.value }))}
              >
                {BANNER_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            {/* Slider URL */}
            <div className="space-y-1.5">
              <Label>Slider URL</Label>
              <Input value={form.sliderUrl} onChange={(e) => setForm((f) => ({ ...f, sliderUrl: e.target.value }))} placeholder="https://..." />
            </div>

            {/* Media Upload */}
            <div className="space-y-2">
              <Label>Banner Media {!editing && "*"}</Label>
              <p className="text-xs text-slate-500">
                Images: JPG, PNG — max {IMAGE_MAX_MB} MB &nbsp;|&nbsp; Video: MP4 — max {VIDEO_MAX_MB} MB
              </p>
              <div className="flex items-center gap-2">
                <label className="flex-1 cursor-pointer">
                  <div className="flex items-center justify-center gap-2 rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600 hover:bg-slate-100 transition-colors">
                    <Upload className="h-4 w-4" />
                    {form.contentBase64 ? "Change file" : "Choose file"}
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept={ACCEPT}
                    className="hidden"
                    onChange={handleFilePick}
                  />
                </label>
                {form.contentBase64 && (
                  <Button type="button" variant="ghost" size="sm" onClick={clearFile} className="text-destructive">
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Preview */}
              {previewUrl && (
                <div className="mt-2 rounded-lg border overflow-hidden bg-slate-50">
                  {previewIsVideo ? (
                    <video src={previewUrl} controls className="w-full max-h-48 object-contain" />
                  ) : (
                    <img src={previewUrl} alt="Preview" className="w-full max-h-48 object-contain" />
                  )}
                </div>
              )}
            </div>

            {/* Priority + Is Default row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Input type="number" value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Is Default</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={form.isDefault}
                  onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.value }))}
                >
                  <option value="false">No</option>
                  <option value="true">Yes</option>
                </select>
              </div>
            </div>

            {/* Error */}
            {formError && (
              <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                {formError}
              </div>
            )}
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
