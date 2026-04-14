"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { StatusBadge } from "@/components/shared/status-badge";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api-client";
import { API_BASE_URL, API_ENDPOINTS } from "@/lib/constants";
import { formatCurrency, getImageSrc } from "@/lib/format";
import {
  RefreshCw, Plus, Eye, Trash2, Truck, UserPlus, BarChart3, Loader2, Wifi, WifiOff, CheckCircle2, Upload, Pencil, Save, X, Download,
} from "lucide-react";
import { toast } from "sonner";

const PAGE_SIZE = 20;

interface DeliveryBoy {
  id: number;
  name: string;
  username: string;
  email: string;
  mobile: string;
  address: string | null;
  status: string;
  loginStatus: string;
  paymentType: number;
  isAvailable: number;
  balance: number;
  sellerId: number | null;
  drivingLicense: string | null;
  drivingLicensePhoto: string | null;
  nationalIdentityCard: string | null;
  aadhaarNumber: string | null;
  aadhaarPhoto: string | null;
  passportPhoto: string | null;
  dateOfBirth: string | null;
  bankAccountNumber: string | null;
  bankName: string | null;
  accountName: string | null;
  ifscCode: string | null;
  remark: string | null;
  createdAt: string | null;
}

interface Seller { id: number; name: string; storeName: string; }

interface Stats {
  deliveryBoyId: number;
  deliveryBoyName: string;
  totalDeliveries: number;
  deliveredCount: number;
  assignedCount: number;
  pickedUpCount: number;
  totalDeliveredAmount: number;
  isOnline: boolean;
  paymentType: string;
}

const PAYMENT_TYPE_LABELS: Record<number, string> = { 0: "Unknown", 1: "Salaried", 2: "Commission" };

export default function DeliveryBoysPage() {
  const [items, setItems] = useState<DeliveryBoy[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  // Dialogs
  const [selected, setSelected] = useState<DeliveryBoy | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsOpen, setStatsOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailBoy, setDetailBoy] = useState<DeliveryBoy | null>(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [detailLoading, setDetailLoading] = useState(false);

  // Add form
  const emptyForm = {
    name: "", username: "", email: "", password: "", mobile: "", address: "",
    drivingLicense: "", aadhaarNumber: "",
    drivingLicensePhoto: "", aadhaarPhoto: "", passportPhoto: "",
    bankName: "", accountName: "", bankAccountNumber: "", ifscCode: "", remark: "",
  };
  const [form, setForm] = useState(emptyForm);

  // Assign seller
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [assignSellerId, setAssignSellerId] = useState("");

  const fetchSellers = useCallback(async () => {
    try {
      const res = await apiGet<Seller[]>(`${API_ENDPOINTS.SELLER}?skip=0&top=200`);
      setSellers(res.successData ?? []);
    } catch { setSellers([]); }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [listRes, countRes] = await Promise.all([
        apiGet<DeliveryBoy[]>(`${API_ENDPOINTS.DELIVERY_BOY}?skip=${page * PAGE_SIZE}&top=${PAGE_SIZE}`),
        apiGet<{ intResponse: number }>(`${API_ENDPOINTS.DELIVERY_BOY}/count`),
      ]);
      setItems(listRes.successData ?? []);
      setTotal(countRes.successData?.intResponse ?? 0);
    } catch { /* ignore */ }
    setLoading(false);
  }, [page]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { fetchSellers(); }, [fetchSellers]);

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1]); // strip data:...;base64, prefix
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleFileChange = async (field: "drivingLicensePhoto" | "aadhaarPhoto" | "passportPhoto", e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024) { toast.error("File must be under 1 MB"); return; }
    const b64 = await fileToBase64(file);
    setForm((prev) => ({ ...prev, [field]: b64 }));
  };

  const isFormValid = form.name && form.username && form.email && form.password && form.mobile
    && form.drivingLicense && form.aadhaarNumber && form.aadhaarNumber.length === 12
    && form.drivingLicensePhoto && form.aadhaarPhoto && form.passportPhoto;

  const handleCreate = async () => {
    if (!isFormValid) return;
    setActing(true);
    try {
      const resp = await apiPost<typeof form, unknown>(`${API_ENDPOINTS.DELIVERY_BOY}/register`, form);
      if (resp.isError) { toast.error(resp.errorData?.displayMessage ?? "Failed"); }
      else { toast.success("Delivery boy created!"); setAddOpen(false); setForm(emptyForm); fetchData(); }
    } catch { toast.error("Error creating delivery boy"); }
    setActing(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this delivery boy?")) return;
    try {
      await apiDelete(`${API_ENDPOINTS.DELIVERY_BOY}/${id}`);
      toast.success("Deleted"); fetchData();
    } catch { toast.error("Error deleting"); }
  };

  const openAssign = (boy: DeliveryBoy) => {
    setSelected(boy);
    setAssignSellerId(boy.sellerId?.toString() ?? "");
    setAssignOpen(true);
  };

  const handleAssign = async () => {
    if (!selected) return;
    setActing(true);
    try {
      if (assignSellerId && assignSellerId !== "none") {
        const resp = await apiPut<never, { boolResponse: boolean }>(`${API_ENDPOINTS.DELIVERY_BOY}/${selected.id}/assign-seller?sellerId=${assignSellerId}`);
        if (resp.isError) toast.error(resp.errorData?.displayMessage ?? "Failed");
        else toast.success("Assigned to seller!");
      } else {
        const resp = await apiPut<never, { boolResponse: boolean }>(`${API_ENDPOINTS.DELIVERY_BOY}/${selected.id}/unassign-seller`);
        if (resp.isError) toast.error(resp.errorData?.displayMessage ?? "Failed");
        else toast.success("Unassigned from seller");
      }
      setAssignOpen(false); fetchData();
    } catch { toast.error("Error"); }
    setActing(false);
  };

  const handlePaymentType = async (boy: DeliveryBoy, type: number) => {
    try {
      const resp = await apiPut<never, { boolResponse: boolean }>(`${API_ENDPOINTS.DELIVERY_BOY}/${boy.id}/payment-type?paymentType=${type}`);
      if (resp.isError) toast.error(resp.errorData?.displayMessage ?? "Failed");
      else { toast.success(`Payment type changed to ${PAYMENT_TYPE_LABELS[type]}`); fetchData(); }
    } catch { toast.error("Error"); }
  };

  const openStats = async (boy: DeliveryBoy) => {
    setSelected(boy);
    setStatsOpen(true);
    setStats(null);
    try {
      const res = await apiGet<Stats>(`${API_ENDPOINTS.DELIVERY_BOY}/${boy.id}/stats`);
      setStats(res.successData ?? null);
    } catch { setStats(null); }
  };

  const openDetail = async (boy: DeliveryBoy) => {
    setDetailOpen(true);
    setEditing(false);
    setDetailLoading(true);
    try {
      const res = await apiGet<DeliveryBoy>(`${API_ENDPOINTS.DELIVERY_BOY}/${boy.id}`);
      const d = res.successData ?? boy;
      setDetailBoy(d);
      setEditForm({
        username: d.username || "",
        name: d.name || "",
        email: d.email || "",
        mobile: d.mobile || "",
        address: d.address || "",
        drivingLicense: d.drivingLicense || "",
        aadhaarNumber: d.aadhaarNumber || "",
        bankAccountNumber: d.bankAccountNumber || "",
        bankName: d.bankName || "",
        accountName: d.accountName || "",
        ifscCode: d.ifscCode || "",
        remark: d.remark || "",
      });
    } catch {
      setDetailBoy(boy);
    }
    setDetailLoading(false);
  };

  const handleUpdate = async () => {
    if (!detailBoy) return;
    setActing(true);
    try {
      const resp = await apiPut<Record<string, string>, DeliveryBoy>(`${API_ENDPOINTS.DELIVERY_BOY}/${detailBoy.id}`, editForm);
      if (resp.isError) toast.error(resp.errorData?.displayMessage ?? "Update failed");
      else {
        toast.success("Delivery boy updated!");
        setDetailBoy(resp.successData ?? detailBoy);
        setEditing(false);
        fetchData();
      }
    } catch { toast.error("Error updating"); }
    setActing(false);
  };

  const getSellerName = (boy: DeliveryBoy) => {
    if (!boy.sellerId) return "—";
    const s = sellers.find((s) => s.id === boy.sellerId);
    return s ? s.storeName || s.name : `#${boy.sellerId}`;
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Delivery Boys" description="Create, assign to sellers, and manage riders">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Add Delivery Boy
          </Button>
        </div>
      </PageHeader>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Mobile</TableHead>
                <TableHead>Seller</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Online</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 9 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-slate-500">
                    <Truck className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    No delivery boys found
                  </TableCell>
                </TableRow>
              ) : (
                items.map((boy) => (
                  <TableRow key={boy.id}>
                    <TableCell className="font-mono text-xs">{boy.id}</TableCell>
                    <TableCell>
                      <button className="font-medium text-indigo-600 hover:underline cursor-pointer" onClick={() => openDetail(boy)}>
                        {boy.name}
                      </button>
                    </TableCell>
                    <TableCell className="text-slate-500">{boy.username}</TableCell>
                    <TableCell>{boy.mobile || "—"}</TableCell>
                    <TableCell>
                      <span className="text-xs text-slate-600">{getSellerName(boy)}</span>
                    </TableCell>
                    <TableCell>
                      <Select value={boy.paymentType.toString()} onValueChange={(v) => handlePaymentType(boy, Number(v))}>
                        <SelectTrigger className="h-7 w-[110px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Salaried</SelectItem>
                          <SelectItem value="2">Commission</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {boy.isAvailable === 1
                        ? <Badge className="bg-emerald-100 text-emerald-700 text-xs"><Wifi className="h-3 w-3 mr-1" />Online</Badge>
                        : <Badge variant="secondary" className="bg-slate-100 text-slate-500 text-xs"><WifiOff className="h-3 w-3 mr-1" />Offline</Badge>}
                    </TableCell>
                    <TableCell><StatusBadge status={boy.status} /></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="View Details" onClick={() => openDetail(boy)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="View Stats" onClick={() => openStats(boy)}>
                          <BarChart3 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Assign to Seller" onClick={() => openAssign(boy)}>
                          <UserPlus className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" title="Delete" onClick={() => handleDelete(boy.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <PaginationControls page={page + 1} pageSize={PAGE_SIZE} total={total} onPageChange={(p) => setPage(p - 1)} />

      {/* Add Dialog */}
      <Dialog open={addOpen} onOpenChange={(o) => { if (!o) setForm(emptyForm); setAddOpen(o); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add Delivery Boy</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Personal Info</p>
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Full Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <Input placeholder="Username * (min 5)" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
              <Input placeholder="Email *" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <Input placeholder="Password *" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              <Input placeholder="Mobile *" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
              <Input placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>

            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide pt-2">Documents</p>
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Driving License No. *" value={form.drivingLicense} onChange={(e) => setForm({ ...form, drivingLicense: e.target.value })} />
              <Input
                placeholder="Aadhaar No. * (12 digits)"
                inputMode="numeric"
                maxLength={12}
                value={form.aadhaarNumber}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "").slice(0, 12);
                  setForm({ ...form, aadhaarNumber: v });
                }}
              />
            </div>

            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide pt-2">Photo Uploads <span className="text-red-400 font-normal">(max 1 MB each)</span></p>
            <div className="grid grid-cols-3 gap-3">
              {([
                { key: "drivingLicensePhoto" as const, label: "DL Photo *" },
                { key: "aadhaarPhoto" as const, label: "Aadhaar Photo *" },
                { key: "passportPhoto" as const, label: "Passport Photo *" },
              ]).map(({ key, label }) => (
                <label
                  key={key}
                  className={`relative flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed p-4 cursor-pointer transition-colors ${
                    form[key]
                      ? "border-emerald-300 bg-emerald-50"
                      : "border-slate-200 bg-slate-50 hover:border-indigo-300 hover:bg-indigo-50"
                  }`}
                >
                  {form[key] ? (
                    <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                  ) : (
                    <Upload className="h-6 w-6 text-slate-400" />
                  )}
                  <span className="text-[11px] font-medium text-slate-600 text-center leading-tight">{label}</span>
                  {form[key] && <span className="text-[10px] text-emerald-600">Ready</span>}
                  <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleFileChange(key, e)} />
                </label>
              ))}
            </div>

            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide pt-2">Bank Details <span className="text-slate-300 font-normal">(optional)</span></p>
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Bank Name" value={form.bankName ?? ""} onChange={(e) => setForm({ ...form, bankName: e.target.value })} />
              <Input placeholder="Account Name" value={form.accountName ?? ""} onChange={(e) => setForm({ ...form, accountName: e.target.value })} />
              <Input placeholder="Account Number" value={form.bankAccountNumber ?? ""} onChange={(e) => setForm({ ...form, bankAccountNumber: e.target.value })} />
              <Input placeholder="IFSC Code" value={form.ifscCode ?? ""} onChange={(e) => setForm({ ...form, ifscCode: e.target.value })} />
            </div>

            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide pt-2">Other <span className="text-slate-300 font-normal">(optional)</span></p>
            <Input placeholder="Remark" value={form.remark ?? ""} onChange={(e) => setForm({ ...form, remark: e.target.value })} />
          </div>
          <DialogFooter>
            <Button onClick={handleCreate} disabled={acting || !isFormValid} className="w-full">
              {acting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              Create Delivery Boy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign to Seller Dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Assign to Seller</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-4">
              <p className="text-sm text-slate-500">Assign <strong>{selected.name}</strong> to a seller:</p>
              <Select value={assignSellerId || "none"} onValueChange={(v) => setAssignSellerId(v ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a seller..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— No Seller (Unassign) —</SelectItem>
                  {sellers.map((s) => (
                    <SelectItem key={s.id} value={s.id.toString()}>
                      {s.storeName} ({s.name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <DialogFooter>
            <Button onClick={handleAssign} disabled={acting} className="w-full">
              {acting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {assignSellerId && assignSellerId !== "none" ? "Assign" : "Unassign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail / Edit Dialog */}
      <Dialog open={detailOpen} onOpenChange={(o) => { if (!o) setEditing(false); setDetailOpen(o); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-indigo-500" /> {detailBoy?.name ?? "Delivery Boy"}
            </DialogTitle>
          </DialogHeader>
          {!editing && detailBoy && (
            <div className="flex justify-end -mt-2">
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
              </Button>
            </div>
          )}
          {detailLoading ? (
            <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
          ) : detailBoy ? (
            <div className="space-y-5">
              {/* Personal info */}
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-2">Personal Info</p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  {editing ? (
                    <>
                      <div><Label className="text-xs text-slate-500">Username</Label><Input value={editForm.username ?? ""} disabled className="bg-slate-50 text-slate-400 cursor-not-allowed" /></div>
                      <div><Label className="text-xs text-slate-500">Name</Label><Input value={editForm.name ?? ""} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></div>
                      <div><Label className="text-xs text-slate-500">Email</Label><Input value={editForm.email ?? ""} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} /></div>
                      <div><Label className="text-xs text-slate-500">Mobile</Label><Input value={editForm.mobile ?? ""} onChange={(e) => setEditForm({ ...editForm, mobile: e.target.value })} /></div>
                      <div><Label className="text-xs text-slate-500">Address</Label><Input value={editForm.address ?? ""} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} /></div>
                    </>
                  ) : (
                    <>
                      <div><span className="text-slate-400 text-xs">Username</span><p className="font-medium">{detailBoy.username}</p></div>
                      <div><span className="text-slate-400 text-xs">Email</span><p className="font-medium">{detailBoy.email}</p></div>
                      <div><span className="text-slate-400 text-xs">Mobile</span><p className="font-medium">{detailBoy.mobile || "—"}</p></div>
                      <div><span className="text-slate-400 text-xs">Address</span><p className="font-medium">{detailBoy.address || "—"}</p></div>
                      <div><span className="text-slate-400 text-xs">Status</span><div><StatusBadge status={detailBoy.status} /></div></div>
                      <div><span className="text-slate-400 text-xs">Online</span><div>{detailBoy.isAvailable === 1 ? <Badge className="bg-emerald-100 text-emerald-700 text-xs">Online</Badge> : <Badge variant="secondary" className="text-xs">Offline</Badge>}</div></div>
                      <div><span className="text-slate-400 text-xs">Payment Type</span><p className="font-medium">{PAYMENT_TYPE_LABELS[detailBoy.paymentType] ?? "Unknown"}</p></div>
                      <div><span className="text-slate-400 text-xs">Seller</span><p className="font-medium">{getSellerName(detailBoy)}</p></div>
                      {detailBoy.createdAt && <div><span className="text-slate-400 text-xs">Joined</span><p className="font-medium text-xs">{new Date(detailBoy.createdAt).toLocaleDateString()}</p></div>}
                    </>
                  )}
                </div>
              </div>

              {/* Documents */}
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-2">Documents</p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  {editing ? (
                    <>
                      <div><Label className="text-xs text-slate-500">Driving License No.</Label><Input value={editForm.drivingLicense ?? ""} onChange={(e) => setEditForm({ ...editForm, drivingLicense: e.target.value })} /></div>
                      <div><Label className="text-xs text-slate-500">Aadhaar No.</Label><Input inputMode="numeric" maxLength={12} value={editForm.aadhaarNumber ?? ""} onChange={(e) => setEditForm({ ...editForm, aadhaarNumber: e.target.value.replace(/\D/g, "").slice(0, 12) })} /></div>
                    </>
                  ) : (
                    <>
                      <div><span className="text-slate-400 text-xs">Driving License No.</span><p className="font-medium">{detailBoy.drivingLicense || "—"}</p></div>
                      <div><span className="text-slate-400 text-xs">Aadhaar No.</span><p className="font-medium">{detailBoy.aadhaarNumber || "—"}</p></div>
                    </>
                  )}
                </div>
              </div>

              {/* ID Card Photos - wide landscape cards */}
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-2">ID Documents</p>
                <div className="grid grid-cols-2 gap-4">
                  {([
                    { label: "Driving License", val: detailBoy.drivingLicensePhoto, fname: "driving-license" },
                    { label: "Aadhaar Card", val: detailBoy.aadhaarPhoto, fname: "aadhaar-card" },
                  ] as const).map(({ label, val, fname }) => {
                    const imgUrl = val ? getImageSrc(val) : null;
                    return (
                      <div key={label} className="rounded-xl border bg-slate-50 p-3">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs text-slate-500 font-medium">{label}</p>
                          {imgUrl && (
                            <a href={imgUrl} download={`${detailBoy.name}-${fname}.jpg`} target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:text-indigo-700">
                              <Download className="h-4 w-4" />
                            </a>
                          )}
                        </div>
                        {imgUrl ? (
                          <img src={imgUrl} alt={label} className="w-full h-48 object-contain rounded-lg bg-white" />
                        ) : (
                          <div className="h-48 bg-white rounded-lg flex items-center justify-center text-xs text-slate-400">Not uploaded</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Passport Photo */}
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-2">Passport Photo</p>
                {(() => {
                  const val = detailBoy.passportPhoto;
                  const imgUrl = val ? getImageSrc(val) : null;
                  return (
                    <div className="w-40 rounded-xl border bg-slate-50 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-slate-500 font-medium">Photo</p>
                        {imgUrl && (
                          <a href={imgUrl} download={`${detailBoy.name}-passport-photo.jpg`} target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:text-indigo-700">
                            <Download className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                      {imgUrl ? (
                        <img src={imgUrl} alt="Passport Photo" className="w-full h-44 object-cover rounded-lg" />
                      ) : (
                        <div className="h-44 bg-white rounded-lg flex items-center justify-center text-xs text-slate-400">Not uploaded</div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Bank info */}
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-2">Bank Details</p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  {editing ? (
                    <>
                      <div><Label className="text-xs text-slate-500">Bank Name</Label><Input value={editForm.bankName ?? ""} onChange={(e) => setEditForm({ ...editForm, bankName: e.target.value })} /></div>
                      <div><Label className="text-xs text-slate-500">Account Name</Label><Input value={editForm.accountName ?? ""} onChange={(e) => setEditForm({ ...editForm, accountName: e.target.value })} /></div>
                      <div><Label className="text-xs text-slate-500">Account Number</Label><Input value={editForm.bankAccountNumber ?? ""} onChange={(e) => setEditForm({ ...editForm, bankAccountNumber: e.target.value })} /></div>
                      <div><Label className="text-xs text-slate-500">IFSC Code</Label><Input value={editForm.ifscCode ?? ""} onChange={(e) => setEditForm({ ...editForm, ifscCode: e.target.value })} /></div>
                    </>
                  ) : (
                    <>
                      <div><span className="text-slate-400 text-xs">Bank Name</span><p className="font-medium">{detailBoy.bankName || "—"}</p></div>
                      <div><span className="text-slate-400 text-xs">Account Name</span><p className="font-medium">{detailBoy.accountName || "—"}</p></div>
                      <div><span className="text-slate-400 text-xs">Account No.</span><p className="font-medium">{detailBoy.bankAccountNumber || "—"}</p></div>
                      <div><span className="text-slate-400 text-xs">IFSC</span><p className="font-medium">{detailBoy.ifscCode || "—"}</p></div>
                    </>
                  )}
                </div>
              </div>

              {/* Remark */}
              {editing && (
                <div>
                  <Label className="text-xs text-slate-500">Remark</Label>
                  <Input value={editForm.remark ?? ""} onChange={(e) => setEditForm({ ...editForm, remark: e.target.value })} />
                </div>
              )}
              {!editing && detailBoy.remark && (
                <div><span className="text-slate-400 text-xs">Remark</span><p className="text-sm">{detailBoy.remark}</p></div>
              )}

              {editing && (
                <div className="flex gap-2 pt-2">
                  <Button onClick={handleUpdate} disabled={acting} className="flex-1">
                    {acting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    Save Changes
                  </Button>
                  <Button variant="outline" onClick={() => setEditing(false)} className="flex-1">
                    <X className="h-4 w-4 mr-2" /> Cancel
                  </Button>
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Stats Dialog */}
      <Dialog open={statsOpen} onOpenChange={setStatsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-indigo-500" />
              {selected?.name} — Stats
            </DialogTitle>
          </DialogHeader>
          {stats ? (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="rounded-lg border p-3 text-center">
                <p className="text-2xl font-bold text-indigo-600">{stats.deliveredCount}</p>
                <p className="text-xs text-slate-500">Delivered</p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <p className="text-2xl font-bold text-amber-600">{stats.assignedCount}</p>
                <p className="text-xs text-slate-500">Assigned</p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <p className="text-2xl font-bold text-blue-600">{stats.pickedUpCount}</p>
                <p className="text-xs text-slate-500">Picked Up</p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <p className="text-2xl font-bold text-slate-700">{stats.totalDeliveries}</p>
                <p className="text-xs text-slate-500">Total</p>
              </div>
              <div className="col-span-2 rounded-lg border p-3 text-center">
                <p className="text-2xl font-bold text-emerald-600">{formatCurrency(stats.totalDeliveredAmount)}</p>
                <p className="text-xs text-slate-500">Total Delivered Amount</p>
              </div>
              <div className="col-span-2 flex items-center justify-between px-1">
                <span className="text-slate-500">Payment Type:</span>
                <Badge variant="outline">{stats.paymentType}</Badge>
              </div>
              <div className="col-span-2 flex items-center justify-between px-1">
                <span className="text-slate-500">Status:</span>
                {stats.isOnline
                  ? <Badge className="bg-emerald-100 text-emerald-700">Online</Badge>
                  : <Badge variant="secondary">Offline</Badge>}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
