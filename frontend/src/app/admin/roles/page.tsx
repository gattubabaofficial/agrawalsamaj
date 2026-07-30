"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Shield, ShieldCheck, Plus, Trash2, Edit3, UserCheck, Search,
  Building, Calendar, BookOpen, Users, Heart, Key, Check
} from "lucide-react";
import { getApiBaseUrl } from "@/utils/api";

interface CustomRole {
  role_id: string;
  name: string;
  description: string | null;
  permissions: string[];
  user_count: number;
  created_at: string | null;
}

interface MemberUser {
  user_id: string;
  first_name: string;
  surname: string;
  mobile: string | null;
  email: string | null;
  role: string;
  custom_role_id?: string | null;
}

const PERMISSION_MAP: { id: string; name: string; desc: string; icon: any }[] = [
  { id: "manage_bhavan", name: "Manage Bhavan Bookings", desc: "Approve/reject hall bookings & generate receipts", icon: Building },
  { id: "manage_events", name: "Manage Events", desc: "Create events, view registrations & tickets", icon: Calendar },
  { id: "scan_passes", name: "Gate Pass Scanning", desc: "Scan event passes & verify attendee entry", icon: Check },
  { id: "manage_blogs", name: "Manage Blogs & News", desc: "Publish, edit, and moderate community posts", icon: BookOpen },
  { id: "manage_members", name: "Manage Members Directory", desc: "Approve membership requests & manage profiles", icon: Users },
  { id: "manage_donations", name: "Manage Donations", desc: "Track contributions, 80G tax receipts & schemes", icon: Heart },
  { id: "manage_roles", name: "Manage Roles & Admin", desc: "Create custom roles and assign user permissions", icon: Key },
];

export default function AdminCustomRolesPage() {
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState<CustomRole | null>(null);

  // Form State
  const [roleName, setRoleName] = useState("");
  const [roleDesc, setRoleDesc] = useState("");
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Assign Modal State
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [members, setMembers] = useState<MemberUser[]>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [selectedMember, setSelectedMember] = useState<MemberUser | null>(null);
  const [assignRoleId, setAssignRoleId] = useState<string>("");
  const [assigning, setAssigning] = useState(false);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/roles/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setRoles(data.items);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/admin/members?per_page=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMembers(data.items || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchRoles();
    fetchMembers();
  }, []);

  const openCreateModal = () => {
    setEditingRole(null);
    setRoleName("");
    setRoleDesc("");
    setSelectedPerms([]);
    setShowRoleModal(true);
  };

  const openEditModal = (role: CustomRole) => {
    setEditingRole(role);
    setRoleName(role.name);
    setRoleDesc(role.description || "");
    setSelectedPerms(role.permissions || []);
    setShowRoleModal(true);
  };

  const togglePermission = (permId: string) => {
    if (selectedPerms.includes(permId)) {
      setSelectedPerms(selectedPerms.filter((p) => p !== permId));
    } else {
      setSelectedPerms([...selectedPerms, permId]);
    }
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleName.trim()) return;
    setIsSubmitting(true);
    try {
      const url = editingRole
        ? `${getApiBaseUrl()}/roles/${editingRole.role_id}`
        : `${getApiBaseUrl()}/roles/`;
      const method = editingRole ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: roleName.trim(),
          description: roleDesc.trim() || null,
          permissions: selectedPerms,
        }),
      });

      if (res.ok) {
        setShowRoleModal(false);
        fetchRoles();
      } else {
        const err = await res.json();
        alert(err.detail || "Failed to save custom role.");
      }
    } catch {
      alert("Failed to save custom role.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRole = async (roleId: string, roleName: string) => {
    if (!confirm(`Are you sure you want to delete role '${roleName}'?`)) return;
    try {
      const res = await fetch(`${getApiBaseUrl()}/roles/${roleId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        fetchRoles();
      } else {
        alert("Failed to delete role.");
      }
    } catch {
      alert("Failed to delete role.");
    }
  };

  const handleAssignRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;
    setAssigning(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/roles/assign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          user_id: selectedMember.user_id,
          custom_role_id: assignRoleId || null,
        }),
      });
      if (res.ok) {
        setShowAssignModal(false);
        setSelectedMember(null);
        fetchRoles();
        fetchMembers();
      } else {
        alert("Failed to assign role.");
      }
    } catch {
      alert("Failed to assign role.");
    } finally {
      setAssigning(false);
    }
  };

  const filteredMembers = members.filter((m) => {
    const q = memberSearch.toLowerCase();
    const fullName = `${m.first_name} ${m.surname}`.toLowerCase();
    return fullName.includes(q) || (m.mobile && m.mobile.includes(q));
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 flex items-center gap-2">
            <Shield className="w-6 h-6 text-amber-500" />
            Custom Roles &amp; Permissions
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Create custom administrator roles and assign granular capability permissions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAssignModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 font-semibold text-sm transition-all"
          >
            <UserCheck className="w-4 h-4 text-amber-500" />
            Assign Role to User
          </button>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm shadow-md shadow-amber-200 hover:shadow-amber-300 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Create Custom Role
          </button>
        </div>
      </div>

      {/* Roles Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-48 bg-white rounded-2xl border border-zinc-100 animate-pulse p-5 space-y-4">
              <div className="h-5 bg-zinc-100 rounded w-1/2" />
              <div className="h-4 bg-zinc-100 rounded w-3/4" />
              <div className="h-10 bg-zinc-100 rounded w-full" />
            </div>
          ))}
        </div>
      ) : roles.length === 0 ? (
        <div className="bg-white rounded-2xl border border-zinc-200 p-12 text-center max-w-lg mx-auto">
          <ShieldCheck className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-zinc-800">No Custom Roles Created</h3>
          <p className="text-xs text-zinc-500 mt-1 mb-6">
            Define custom administrative roles such as Event Manager, Bhavan Manager, or Media Editor.
          </p>
          <button
            onClick={openCreateModal}
            className="px-5 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 transition-all"
          >
            + Create First Custom Role
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {roles.map((r) => (
            <motion.div
              key={r.role_id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-zinc-200 p-6 space-y-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-zinc-900 text-lg">{r.name}</h3>
                    <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold">
                      {r.user_count} {r.user_count === 1 ? "User Assigned" : "Users Assigned"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(r)}
                      className="p-1.5 text-zinc-400 hover:text-amber-600 rounded-lg hover:bg-amber-50 transition-colors"
                      title="Edit Role"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteRole(r.role_id, r.name)}
                      className="p-1.5 text-zinc-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                      title="Delete Role"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {r.description && (
                  <p className="text-xs text-zinc-500 leading-relaxed">{r.description}</p>
                )}

                {/* Permissions List */}
                <div className="pt-3 border-t border-zinc-100 space-y-1.5">
                  <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                    Permissions ({r.permissions?.length || 0})
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {r.permissions && r.permissions.length > 0 ? (
                      r.permissions.map((pId) => {
                        const permInfo = PERMISSION_MAP.find((p) => p.id === pId);
                        return (
                          <span
                            key={pId}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-100 text-zinc-700 text-[11px] font-medium"
                          >
                            {permInfo?.name || pId}
                          </span>
                        );
                      })
                    ) : (
                      <span className="text-xs text-zinc-400 italic">No specific permissions assigned</span>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create / Edit Role Modal */}
      {showRoleModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
              <div>
                <h3 className="font-bold text-zinc-900 text-xl">
                  {editingRole ? "Edit Custom Role" : "Create Custom Role"}
                </h3>
                <p className="text-xs text-zinc-500">Configure role name and capability permissions</p>
              </div>
              <button
                type="button"
                onClick={() => setShowRoleModal(false)}
                className="p-1 text-zinc-400 hover:text-zinc-600 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveRole} className="space-y-5">
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider block">
                  Role Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bhavan Manager, Event Coordinator, Editor"
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider block">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Briefly describe the responsibilities of this role..."
                  value={roleDesc}
                  onChange={(e) => setRoleDesc(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Permissions Checkbox List */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider block">
                  Select Capabilities &amp; Permissions
                </label>
                <div className="space-y-2 max-h-60 overflow-y-auto p-1">
                  {PERMISSION_MAP.map((perm) => {
                    const Icon = perm.icon;
                    const isChecked = selectedPerms.includes(perm.id);
                    return (
                      <label
                        key={perm.id}
                        onClick={() => togglePermission(perm.id)}
                        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                          isChecked
                            ? "bg-amber-50/60 border-amber-300 text-amber-900"
                            : "bg-white border-zinc-200 text-zinc-600 hover:border-zinc-300"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="mt-1 h-4 w-4 rounded border-zinc-300 text-amber-500 focus:ring-amber-400"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 font-bold text-sm text-zinc-900">
                            <Icon className="w-4 h-4 text-amber-500 shrink-0" />
                            {perm.name}
                          </div>
                          <p className="text-xs text-zinc-500 mt-0.5">{perm.desc}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowRoleModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-zinc-200 text-sm font-semibold text-zinc-600 hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !roleName.trim()}
                  className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-xl shadow-md disabled:opacity-50 transition-all cursor-pointer"
                >
                  {isSubmitting ? "Saving..." : editingRole ? "Update Role" : "Create Role"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Role to User Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
              <div>
                <h3 className="font-bold text-zinc-900 text-xl">Assign Custom Role to User</h3>
                <p className="text-xs text-zinc-500">Select a member and assign a custom role</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                className="p-1 text-zinc-400 hover:text-zinc-600 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAssignRoleSubmit} className="space-y-4">
              {/* Member Search */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider block">
                  1. Search &amp; Select Member *
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Search name or mobile..."
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="mt-2 max-h-40 overflow-y-auto border border-zinc-200 rounded-xl divide-y divide-zinc-100 bg-zinc-50">
                  {filteredMembers.slice(0, 10).map((m) => (
                    <div
                      key={m.user_id}
                      onClick={() => setSelectedMember(m)}
                      className={`p-2.5 flex items-center justify-between cursor-pointer transition-colors ${
                        selectedMember?.user_id === m.user_id ? "bg-amber-100/70 text-amber-900 font-bold" : "hover:bg-white"
                      }`}
                    >
                      <div>
                        <p className="text-xs font-semibold">{m.first_name} {m.surname}</p>
                        <p className="text-[11px] text-zinc-500">{m.mobile || m.email || "No contact"}</p>
                      </div>
                      {selectedMember?.user_id === m.user_id && <Check className="w-4 h-4 text-amber-600" />}
                    </div>
                  ))}
                </div>
              </div>

              {/* Role Selection */}
              <div className="space-y-1 pt-2">
                <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider block">
                  2. Choose Custom Role *
                </label>
                <select
                  value={assignRoleId}
                  onChange={(e) => setAssignRoleId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:border-amber-500 cursor-pointer bg-white"
                >
                  <option value="">-- No Custom Role (Default) --</option>
                  {roles.map((r) => (
                    <option key={r.role_id} value={r.role_id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-zinc-200 text-sm font-semibold text-zinc-600 hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assigning || !selectedMember}
                  className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-xl shadow-md disabled:opacity-50 transition-all cursor-pointer"
                >
                  {assigning ? "Assigning..." : "Assign Role"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
