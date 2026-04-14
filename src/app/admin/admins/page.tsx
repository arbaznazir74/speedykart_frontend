"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/shared/status-badge";
import { apiGet, apiPost, apiDelete } from "@/lib/api-client";
import { API_ENDPOINTS } from "@/lib/constants";
import { UserCircle, Plus, KeyRound, Trash2, Shield, ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Admin {
  id: number;
  username: string | null;
  email: string;
  status: string;
  loginStatus: string;
  roleType: string;
  loginAt: string | null;
  lastActiveAt: string | null;
  createdAt: string | null;
}

export default function AdminsPage() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);
  const [saving, setSaving] = useState(false);

  // Create form
  const [newUsername, setNewUsername] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");

  // Reset password
  const [resetPassword, setResetPassword] = useState("");

  const fetchAdmins = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await apiGet<Admin[]>(`${API_ENDPOINTS.ADMIN}?skip=0&top=50`);
      setAdmins(resp.successData ?? []);
    } catch {
      toast.error("Failed to load admins");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  async function handleCreate() {
    if (!newUsername || !newEmail || !newPassword) {
      toast.error("All fields are required");
      return;
    }
    if (newUsername.length < 5) {
      toast.error("Username must be at least 5 characters");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setSaving(true);
    try {
      const resp = await apiPost<{ username: string; email: string; password: string; roleType: number }, { boolResponse: boolean; responseMessage: string }>(
        `${API_ENDPOINTS.ADMIN}/register`,
        { username: newUsername, email: newEmail, password: newPassword, roleType: 2 }
      );
      if (resp.isError) {
        toast.error(resp.errorData?.displayMessage ?? "Failed to create admin");
      } else {
        toast.success("Admin created successfully");
        setCreateOpen(false);
        setNewUsername("");
        setNewEmail("");
        setNewPassword("");
        fetchAdmins();
      }
    } catch {
      toast.error("Error creating admin");
    }
    setSaving(false);
  }

  async function handleResetPassword() {
    if (!selectedAdmin || !resetPassword) {
      toast.error("New password is required");
      return;
    }
    if (resetPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setSaving(true);
    try {
      const resp = await apiPost<{ password: string }, { boolResponse: boolean; responseMessage: string }>(
        `${API_ENDPOINTS.ADMIN}/force-reset-password/${selectedAdmin.id}`,
        { password: resetPassword }
      );
      if (resp.isError) {
        toast.error(resp.errorData?.displayMessage ?? "Failed to reset password");
      } else {
        toast.success("Password reset successfully");
        setResetOpen(false);
        setResetPassword("");
        setSelectedAdmin(null);
      }
    } catch {
      toast.error("Error resetting password");
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!selectedAdmin) return;
    setSaving(true);
    try {
      const resp = await apiDelete<{ boolResponse: boolean }>(`${API_ENDPOINTS.ADMIN}/${selectedAdmin.id}`);
      if (resp.isError) {
        toast.error(resp.errorData?.displayMessage ?? "Failed to delete admin");
      } else {
        toast.success("Admin deactivated");
        setDeleteOpen(false);
        setSelectedAdmin(null);
        fetchAdmins();
      }
    } catch {
      toast.error("Error deleting admin");
    }
    setSaving(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <UserCircle className="h-6 w-6 text-indigo-600" />
          <div>
            <h1 className="text-2xl font-bold">Admin Management</h1>
            <p className="text-sm text-slate-500">Create and manage system administrators</p>
          </div>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> New Admin
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Admins</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : admins.length === 0 ? (
            <p className="text-sm text-slate-400 italic text-center py-8">No admins found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-slate-500">
                    <th className="pb-2 font-medium">ID</th>
                    <th className="pb-2 font-medium">Username</th>
                    <th className="pb-2 font-medium">Email</th>
                    <th className="pb-2 font-medium">Role</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 font-medium">Created</th>
                    <th className="pb-2 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {admins.map((a) => {
                    const isSuperAdmin = a.roleType === "SuperAdmin";
                    return (
                      <tr key={a.id} className="border-b last:border-0 hover:bg-slate-50 transition-colors">
                        <td className="py-3 text-slate-400">{a.id}</td>
                        <td className="py-3 font-medium flex items-center gap-2">
                          {isSuperAdmin ? <ShieldCheck className="h-4 w-4 text-amber-500" /> : <Shield className="h-4 w-4 text-indigo-400" />}
                          {a.username ?? "—"}
                        </td>
                        <td className="py-3 text-slate-600">{a.email}</td>
                        <td className="py-3">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isSuperAdmin ? "bg-amber-100 text-amber-700" : "bg-indigo-100 text-indigo-700"}`}>
                            {a.roleType === "SuperAdmin" ? "Super Admin" : "System Admin"}
                          </span>
                        </td>
                        <td className="py-3"><StatusBadge status={a.status} /></td>
                        <td className="py-3 text-slate-400 text-xs">
                          {a.createdAt ? new Date(a.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                        </td>
                        <td className="py-3 text-right">
                          {!isSuperAdmin && (
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                                onClick={() => { setSelectedAdmin(a); setResetPassword(""); setResetOpen(true); }}
                              >
                                <KeyRound className="h-4 w-4 mr-1" /> Reset Password
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                onClick={() => { setSelectedAdmin(a); setDeleteOpen(true); }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                          {isSuperAdmin && (
                            <span className="text-xs text-slate-400 italic">Protected</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Admin Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Admin</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Username</Label>
              <Input placeholder="e.g. admin_john" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" placeholder="e.g. john@email.com" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Password</Label>
              <Input type="password" placeholder="Min 6 characters" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </div>
            <p className="text-xs text-slate-400">New admin will be created as <span className="font-medium text-indigo-600">System Admin</span> with full access.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Admin
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-slate-600">
              Reset password for <span className="font-semibold">{selectedAdmin?.username}</span> ({selectedAdmin?.email})
            </p>
            <div className="space-y-1.5">
              <Label>New Password</Label>
              <Input type="password" placeholder="Min 6 characters" value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetOpen(false)}>Cancel</Button>
            <Button onClick={handleResetPassword} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Reset Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Deactivate Admin</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600 py-2">
            Are you sure you want to deactivate <span className="font-semibold">{selectedAdmin?.username}</span>? They will no longer be able to login.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Deactivate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
