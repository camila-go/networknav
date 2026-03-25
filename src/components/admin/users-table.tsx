"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  MoreVertical,
  Key,
  Trash2,
  Shield,
  UserCheck,
  Copy,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types";

interface AdminUser {
  id: string;
  email: string;
  name: string;
  position: string;
  title: string;
  company: string;
  role: UserRole;
  photoUrl?: string;
  questionnaireCompleted: boolean;
  isActive: boolean;
  createdAt: string;
}

const ROLE_COLORS: Record<UserRole, string> = {
  user: "bg-white/10 text-white/60",
  moderator: "bg-cyan-500/10 text-cyan-400",
  admin: "bg-amber-500/10 text-amber-400",
};

export function UsersTable() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [actionUser, setActionUser] = useState<AdminUser | null>(null);
  const [showMenu, setShowMenu] = useState<string | null>(null);

  // Dialog states
  const [roleDialog, setRoleDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [resetDialog, setResetDialog] = useState(false);
  const [newRole, setNewRole] = useState<UserRole>("user");
  const [tempPassword, setTempPassword] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const pageSize = 20;

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (search) params.set("search", search);
      if (roleFilter) params.set("role", roleFilter);

      const res = await fetch(`/api/admin/users?${params}`);
      const json = await res.json();
      if (json.success) {
        setUsers(json.data.items);
        setTotal(json.data.total);
      }
    } catch (e) {
      console.error("Failed to fetch users:", e);
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Debounce search
  const [searchInput, setSearchInput] = useState("");
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  async function handleRoleChange() {
    if (!actionUser) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: actionUser.id, role: newRole }),
      });
      const json = await res.json();
      if (json.success) {
        setUsers((prev) =>
          prev.map((u) => (u.id === actionUser.id ? { ...u, role: newRole } : u))
        );
        setRoleDialog(false);
      }
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDelete() {
    if (!actionUser) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${actionUser.id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        setUsers((prev) => prev.filter((u) => u.id !== actionUser.id));
        setTotal((t) => t - 1);
        setDeleteDialog(false);
      }
    } finally {
      setActionLoading(false);
    }
  }

  async function handleResetPassword() {
    if (!actionUser) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${actionUser.id}`, {
        method: "POST",
      });
      const json = await res.json();
      if (json.success) {
        setTempPassword(json.data.temporaryPassword);
      }
    } finally {
      setActionLoading(false);
    }
  }

  function openAction(user: AdminUser, action: "role" | "delete" | "reset") {
    setActionUser(user);
    setShowMenu(null);
    if (action === "role") {
      setNewRole(user.role);
      setRoleDialog(true);
    } else if (action === "delete") {
      setDeleteDialog(true);
    } else {
      setTempPassword("");
      setResetDialog(true);
    }
  }

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">User Management</h1>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
          <Input
            placeholder="Search by name or email..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/30"
          />
        </div>
        <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-40 bg-white/5 border-white/10 text-white">
            <SelectValue placeholder="All roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            <SelectItem value="user">User</SelectItem>
            <SelectItem value="moderator">Moderator</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="bg-white/5 border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left">
                <th className="px-4 py-3 text-white/50 font-medium">User</th>
                <th className="px-4 py-3 text-white/50 font-medium">Email</th>
                <th className="px-4 py-3 text-white/50 font-medium">Role</th>
                <th className="px-4 py-3 text-white/50 font-medium">Joined</th>
                <th className="px-4 py-3 text-white/50 font-medium w-12"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-white/40">
                    Loading...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-white/40">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-medium">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-white font-medium">{user.name}</p>
                          <p className="text-white/40 text-xs">{user.title || user.position}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-white/60">{user.email}</td>
                    <td className="px-4 py-3">
                      <Badge className={cn("text-xs capitalize", ROLE_COLORS[user.role])}>
                        {user.role}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-white/40 text-xs">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 relative">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-white/40 hover:text-white"
                        onClick={() => setShowMenu(showMenu === user.id ? null : user.id)}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                      {showMenu === user.id && (
                        <div className="absolute right-4 top-full z-10 w-48 bg-zinc-900 border border-white/10 rounded-lg shadow-xl py-1">
                          <button
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-white/70 hover:bg-white/5"
                            onClick={() => openAction(user, "role")}
                          >
                            <Shield className="h-4 w-4" />
                            Change Role
                          </button>
                          <button
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-white/70 hover:bg-white/5"
                            onClick={() => openAction(user, "reset")}
                          >
                            <Key className="h-4 w-4" />
                            Reset Password
                          </button>
                          <a
                            href={`/user/${user.id}`}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-white/70 hover:bg-white/5"
                            onClick={() => setShowMenu(null)}
                          >
                            <ExternalLink className="h-4 w-4" />
                            View Profile
                          </a>
                          <button
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-400 hover:bg-white/5"
                            onClick={() => openAction(user, "delete")}
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete Account
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/10">
            <p className="text-xs text-white/40">
              {total} user{total !== 1 ? "s" : ""} total
            </p>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="text-white/60"
              >
                Previous
              </Button>
              <span className="text-sm text-white/40 flex items-center px-2">
                {page} / {totalPages}
              </span>
              <Button
                variant="ghost"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="text-white/60"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Role Change Dialog */}
      <Dialog open={roleDialog} onOpenChange={setRoleDialog}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Change Role</DialogTitle>
            <DialogDescription className="text-white/50">
              Change the role for {actionUser?.name}
            </DialogDescription>
          </DialogHeader>
          <Select value={newRole} onValueChange={(v) => setNewRole(v as UserRole)}>
            <SelectTrigger className="bg-white/5 border-white/10 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="user">
                <span className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4" /> User
                </span>
              </SelectItem>
              <SelectItem value="moderator">
                <span className="flex items-center gap-2">
                  <Shield className="h-4 w-4" /> Moderator
                </span>
              </SelectItem>
              <SelectItem value="admin">
                <span className="flex items-center gap-2">
                  <Shield className="h-4 w-4" /> Admin
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRoleDialog(false)} className="text-white/60">
              Cancel
            </Button>
            <Button
              onClick={handleRoleChange}
              disabled={actionLoading || newRole === actionUser?.role}
              className="bg-cyan-600 hover:bg-cyan-700"
            >
              {actionLoading ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Delete Account</DialogTitle>
            <DialogDescription className="text-white/50">
              Are you sure you want to permanently delete {actionUser?.name}&apos;s account?
              This will remove all their data including posts, messages, and connections.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteDialog(false)} className="text-white/60">
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              disabled={actionLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {actionLoading ? "Deleting..." : "Delete Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetDialog} onOpenChange={(open) => { setResetDialog(open); if (!open) setTempPassword(""); }}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription className="text-white/50">
              {tempPassword
                ? "The password has been reset. Share this temporary password with the user."
                : `Generate a new temporary password for ${actionUser?.name}.`}
            </DialogDescription>
          </DialogHeader>
          {tempPassword ? (
            <div className="flex items-center gap-2 p-3 bg-white/5 rounded-lg border border-white/10">
              <code className="text-cyan-400 flex-1 text-lg font-mono">{tempPassword}</code>
              <Button
                variant="ghost"
                size="sm"
                className="text-white/60 hover:text-white"
                onClick={() => navigator.clipboard.writeText(tempPassword)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          ) : null}
          <DialogFooter>
            {tempPassword ? (
              <Button onClick={() => { setResetDialog(false); setTempPassword(""); }} className="bg-cyan-600 hover:bg-cyan-700">
                Done
              </Button>
            ) : (
              <>
                <Button variant="ghost" onClick={() => setResetDialog(false)} className="text-white/60">
                  Cancel
                </Button>
                <Button
                  onClick={handleResetPassword}
                  disabled={actionLoading}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  {actionLoading ? "Resetting..." : "Reset Password"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
