"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, ShieldCheck, Plus, Trash2, Edit3, UserCheck, Search,
  Building, Calendar, BookOpen, Users, Heart, Key, Check, Eye,
  UserX, Filter, ChevronRight, X, AlertCircle, Sparkles, User as UserIcon
} from "lucide-react";
import { getApiBaseUrl } from "@/utils/api";
import { mediaUrl } from "@/utils/media";

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
  samaj_id?: string | null;
  role: string;
  custom_role_id?: string | null;
}

interface AssignedUser {
  user_id: string;
  first_name: string;
  surname: string;
  email: string | null;
  mobile: string | null;
  samaj_id: string | null;
  profile_photo: string | null;
  role: string;
  custom_role_id: string | null;
  custom_role?: {
    role_id: string;
    name: string;
    description: string | null;
    permissions: string[];
  } | null;
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
  const [activeTab, setActiveTab] = useState<"roles" | "assigned">("roles");
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [assignments, setAssignments] = useState<AssignedUser[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [loadingAssignments, setLoadingAssignments] = useState(true);

  // Role Create/Edit Modal State
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState<CustomRole | null>(null);
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

  // View Role Members Modal (when clicking on a role card)
  const [inspectRole, setInspectRole] = useState<CustomRole | null>(null);
  const [inspectSearch, setInspectSearch] = useState("");

  // Search & Filters for Assigned Users Tab
  const [assignedSearch, setAssignedSearch] = useState("");
  const [assignedRoleFilter, setAssignedRoleFilter] = useState("ALL");

  const fetchRoles = async () => {
    setLoadingRoles(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const res = await fetch(`${getApiBaseUrl()}/roles/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setRoles(data.items || []);
      }
    } finally {
      setLoadingRoles(false);
    }
  };

  const fetchAssignments = async () => {
    setLoadingAssignments(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const res = await fetch(`${getApiBaseUrl()}/roles/assignments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAssignments(data.items || []);
      }
    } catch (err) {
      console.error("Error fetching assignments:", err);
    } finally {
      setLoadingAssignments(false);
    }
  };

  const fetchMembers = async () => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const res = await fetch(`${getApiBaseUrl()}/membership/members`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMembers(Array.isArray(data) ? data : (data.items || []));
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchRoles();
    fetchAssignments();
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

  const openAssignModalForRole = (roleId: string) => {
    setSelectedMember(null);
    setAssignRoleId(roleId);
    setMemberSearch("");
    setShowAssignModal(true);
  };

  const openAssignModalForUser = (user: AssignedUser | MemberUser) => {
    const memberObj = members.find((m) => m.user_id === user.user_id) || {
      user_id: user.user_id,
      first_name: user.first_name,
      surname: user.surname,
      mobile: user.mobile,
      email: user.email,
      samaj_id: (user as any).samaj_id || null,
      role: user.role,
      custom_role_id: user.custom_role_id,
    };
    setSelectedMember(memberObj);
    setAssignRoleId(user.custom_role_id || "");
    setMemberSearch(`${user.first_name} ${user.surname}`);
    setShowAssignModal(true);
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
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
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
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const res = await fetch(`${getApiBaseUrl()}/roles/${roleId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        fetchRoles();
        fetchAssignments();
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
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
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
        fetchAssignments();
        fetchMembers();
      } else {
        const err = await res.json().catch(() => ({ detail: "Failed to assign role." }));
        alert(err.detail || "Failed to assign role.");
      }
    } catch (err: any) {
      alert(err?.message || "Failed to assign role.");
    } finally {
      setAssigning(false);
    }
  };

  const handleUnassignRole = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to remove the custom role from ${userName}?`)) return;
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const res = await fetch(`${getApiBaseUrl()}/roles/assign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          user_id: userId,
          custom_role_id: null,
        }),
      });
      if (res.ok) {
        fetchRoles();
        fetchAssignments();
        fetchMembers();
      } else {
        alert("Failed to remove role.");
      }
    } catch {
      alert("Failed to remove role.");
    }
  };

  const filteredMembersForModal = useMemo(() => {
    const q = memberSearch.toLowerCase().trim();
    if (!q) return members.slice(0, 15);
    return members
      .filter((m) => {
        const fullName = `${m.first_name} ${m.surname}`.toLowerCase();
        const contact = `${m.mobile || ""} ${m.email || ""} ${m.samaj_id || ""}`.toLowerCase();
        return fullName.includes(q) || contact.includes(q);
      })
      .slice(0, 20);
  }, [members, memberSearch]);

  const filteredAssignments = useMemo(() => {
    return assignments.filter((u) => {
      // Role filter
      if (assignedRoleFilter !== "ALL") {
        if (assignedRoleFilter === "SYSTEM_ADMIN" && !["ADMIN", "SUPER_ADMIN"].includes(u.role.toUpperCase())) {
          return false;
        }
        if (assignedRoleFilter === "VOLUNTEER" && u.role.toUpperCase() !== "VOLUNTEER") {
          return false;
        }
        if (
          assignedRoleFilter !== "SYSTEM_ADMIN" &&
          assignedRoleFilter !== "VOLUNTEER" &&
          u.custom_role_id !== assignedRoleFilter
        ) {
          return false;
        }
      }

      // Search query
      const q = assignedSearch.toLowerCase().trim();
      if (!q) return true;
      const text = `${u.first_name} ${u.surname} ${u.mobile || ""} ${u.email || ""} ${u.samaj_id || ""} ${u.custom_role?.name || ""} ${u.role}`.toLowerCase();
      return text.includes(q);
    });
  }, [assignments, assignedSearch, assignedRoleFilter]);

  const inspectRoleUsers = useMemo(() => {
    if (!inspectRole) return [];
    return assignments.filter((u) => {
      if (u.custom_role_id !== inspectRole.role_id) return false;
      const q = inspectSearch.toLowerCase().trim();
      if (!q) return true;
      const text = `${u.first_name} ${u.surname} ${u.mobile || ""} ${u.email || ""} ${u.samaj_id || ""}`.toLowerCase();
      return text.includes(q);
    });
  }, [assignments, inspectRole, inspectSearch]);

  return (
    <div className="space-y-6 max-w-7xl pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 flex items-center gap-2">
            <Shield className="w-6 h-6 sm:w-7 sm:h-7 text-amber-500 shrink-0" />
            <span>Roles &amp; Permissions Management</span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1">
            Define custom administrative roles, configure capability permissions, and view assigned personnel.
          </p>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
          <button
            onClick={() => {
              setSelectedMember(null);
              setAssignRoleId("");
              setMemberSearch("");
              setShowAssignModal(true);
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl border border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-800 font-semibold text-xs sm:text-sm shadow-sm transition-all cursor-pointer flex-1 sm:flex-none"
          >
            <UserCheck className="w-4 h-4 text-amber-500 shrink-0" />
            <span>Assign Role to User</span>
          </button>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs sm:text-sm shadow-md shadow-amber-200 hover:shadow-amber-300 transition-all cursor-pointer flex-1 sm:flex-none"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>Create Custom Role</span>
          </button>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-zinc-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("roles")}
          className={`flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === "roles"
              ? "bg-amber-500 text-white shadow-sm shadow-amber-200"
              : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          Custom Roles
          <span
            className={`ml-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
              activeTab === "roles" ? "bg-amber-600 text-white" : "bg-zinc-200 text-zinc-700"
            }`}
          >
            {roles.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("assigned")}
          className={`flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === "assigned"
              ? "bg-amber-500 text-white shadow-sm shadow-amber-200"
              : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
          }`}
        >
          <Users className="w-4 h-4" />
          Assigned Users &amp; Permissions
          <span
            className={`ml-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
              activeTab === "assigned" ? "bg-amber-600 text-white" : "bg-zinc-200 text-zinc-700"
            }`}
          >
            {assignments.length}
          </span>
        </button>
      </div>

      {/* TAB 1: Custom Roles Cards */}
      {activeTab === "roles" && (
        <div className="space-y-6">
          {loadingRoles ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-56 bg-white rounded-2xl border border-zinc-100 animate-pulse p-6 space-y-4 shadow-sm">
                  <div className="h-5 bg-zinc-100 rounded w-1/2" />
                  <div className="h-4 bg-zinc-100 rounded w-3/4" />
                  <div className="h-14 bg-zinc-100 rounded w-full" />
                </div>
              ))}
            </div>
          ) : roles.length === 0 ? (
            <div className="bg-white rounded-2xl border border-zinc-200 p-12 text-center max-w-lg mx-auto shadow-sm">
              <ShieldCheck className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-zinc-800">No Custom Roles Created</h3>
              <p className="text-xs text-zinc-500 mt-1 mb-6">
                Define custom administrative roles such as Bhavan Manager, Event Coordinator, or Media Editor.
              </p>
              <button
                onClick={openCreateModal}
                className="px-5 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 transition-all cursor-pointer"
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
                  className="bg-white rounded-2xl border border-zinc-200 p-6 space-y-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-zinc-900 text-lg">{r.name}</h3>
                        <button
                          onClick={() => {
                            setInspectRole(r);
                            setInspectSearch("");
                          }}
                          className="mt-1 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold hover:bg-amber-100 transition-colors cursor-pointer"
                          title="Click to see assigned members"
                        >
                          <Users className="w-3.5 h-3.5 text-amber-600" />
                          <span>
                            {r.user_count} {r.user_count === 1 ? "Person Assigned" : "Persons Assigned"}
                          </span>
                          <Eye className="w-3 h-3 text-amber-500 ml-0.5" />
                        </button>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditModal(r)}
                          className="p-2 text-zinc-400 hover:text-amber-600 rounded-lg hover:bg-amber-50 transition-colors cursor-pointer"
                          title="Edit Role"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteRole(r.role_id, r.name)}
                          className="p-2 text-zinc-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Delete Role"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {r.description ? (
                      <p className="text-xs text-zinc-500 leading-relaxed">{r.description}</p>
                    ) : (
                      <p className="text-xs text-zinc-400 italic">No description provided</p>
                    )}

                    {/* Permissions List */}
                    <div className="pt-3 border-t border-zinc-100 space-y-1.5">
                      <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                        Granted Capabilities ({r.permissions?.length || 0})
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {r.permissions && r.permissions.length > 0 ? (
                          r.permissions.map((pId) => {
                            const permInfo = PERMISSION_MAP.find((p) => p.id === pId);
                            const Icon = permInfo?.icon || Check;
                            return (
                              <span
                                key={pId}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-100 text-zinc-700 text-[11px] font-medium"
                              >
                                <Icon className="w-3 h-3 text-amber-600" />
                                {permInfo?.name || pId}
                              </span>
                            );
                          })
                        ) : (
                          <span className="text-xs text-zinc-400 italic">No specific permissions configured</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom Actions */}
                  <div className="pt-4 border-t border-zinc-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => {
                        setInspectRole(r);
                        setInspectSearch("");
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 hover:text-amber-800 transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View Assigned People
                    </button>
                    <button
                      onClick={() => openAssignModalForRole(r.role_id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-bold transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-amber-600" />
                      Assign User
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Assigned Users Directory Table */}
      {activeTab === "assigned" && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="bg-white p-3 sm:p-4 rounded-2xl border border-zinc-200 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by name, mobile, email, or Samaj ID..."
                value={assignedSearch}
                onChange={(e) => setAssignedSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 min-h-[44px] text-sm border border-zinc-200 rounded-xl focus:outline-none focus:border-amber-500 bg-white"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-zinc-400 shrink-0" />
              <select
                value={assignedRoleFilter}
                onChange={(e) => setAssignedRoleFilter(e.target.value)}
                className="px-3 py-2.5 min-h-[44px] text-xs font-semibold border border-zinc-200 rounded-xl bg-white focus:outline-none focus:border-amber-500 cursor-pointer w-full sm:w-auto"
              >
                <option value="ALL">All Assigned People ({assignments.length})</option>
                <option value="SYSTEM_ADMIN">System Administrators</option>
                <option value="VOLUNTEER">Volunteers</option>
                <optgroup label="Custom Roles">
                  {roles.map((r) => (
                    <option key={r.role_id} value={r.role_id}>
                      Role: {r.name}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>
          </div>

          {/* Assigned Table */}
          {loadingAssignments ? (
            <div className="bg-white p-12 rounded-2xl border border-zinc-200 text-center text-zinc-500 shadow-sm flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-semibold">Loading assigned personnel...</p>
            </div>
          ) : filteredAssignments.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-zinc-200 text-center text-zinc-500 shadow-sm">
              <UserX className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-zinc-800">No Assigned Personnel Found</h3>
              <p className="text-xs text-zinc-500 mt-1 mb-5">
                {assignedSearch || assignedRoleFilter !== "ALL"
                  ? "Try adjusting your search query or role filter."
                  : "No community members are currently assigned to custom administrative roles."}
              </p>
              <button
                onClick={() => {
                  setSelectedMember(null);
                  setAssignRoleId("");
                  setMemberSearch("");
                  setShowAssignModal(true);
                }}
                className="px-4 py-2.5 min-h-[44px] rounded-xl bg-amber-500 text-white text-xs font-bold hover:bg-amber-600 transition-all cursor-pointer"
              >
                + Assign Role to a Member
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm min-w-[750px]">
                  <thead className="bg-zinc-50 border-b border-zinc-200 text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 sm:px-5 py-3.5">Person</th>
                      <th className="px-4 sm:px-5 py-3.5">Contact Details</th>
                      <th className="px-4 sm:px-5 py-3.5">System Role</th>
                      <th className="px-4 sm:px-5 py-3.5">Assigned Custom Role</th>
                      <th className="px-4 sm:px-5 py-3.5">Active Capabilities</th>
                      <th className="px-4 sm:px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {filteredAssignments.map((u) => {
                      const initials = `${u.first_name.charAt(0)}${u.surname.charAt(0)}`.toUpperCase();
                      const customRole = u.custom_role;

                      return (
                        <tr key={u.user_id} className="hover:bg-zinc-50/60 transition-colors">
                          {/* User Name & Photo */}
                          <td className="px-4 sm:px-5 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              {u.profile_photo ? (
                                <img
                                  src={mediaUrl(u.profile_photo) || u.profile_photo}
                                  alt=""
                                  className="w-10 h-10 rounded-full object-cover border border-amber-200 shrink-0"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-800 font-bold text-xs flex items-center justify-center border border-amber-200 shrink-0">
                                  {initials}
                                </div>
                              )}
                              <div>
                                <p className="font-bold text-zinc-900 text-sm">
                                  {u.first_name} {u.surname}
                                </p>
                                {u.samaj_id && (
                                  <span className="inline-block text-[11px] font-mono font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                    {u.samaj_id}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Contact Details */}
                          <td className="px-4 sm:px-5 py-4 whitespace-nowrap">
                            <p className="text-xs font-semibold text-zinc-800">{u.mobile || "No Mobile"}</p>
                            <p className="text-[11px] text-zinc-500">{u.email || "No Email"}</p>
                          </td>

                          {/* System Role */}
                          <td className="px-4 sm:px-5 py-4 whitespace-nowrap">
                            <span
                              className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${
                                ["ADMIN", "SUPER_ADMIN"].includes(u.role.toUpperCase())
                                   ? "bg-purple-50 text-purple-800 border border-purple-200"
                                  : u.role.toUpperCase() === "VOLUNTEER"
                                  ? "bg-sky-50 text-sky-800 border border-sky-200"
                                  : "bg-zinc-100 text-zinc-700 border border-zinc-200"
                              }`}
                            >
                              {u.role.replace("_", " ")}
                            </span>
                          </td>

                          {/* Assigned Custom Role */}
                          <td className="px-4 sm:px-5 py-4 whitespace-nowrap">
                            {customRole ? (
                              <div>
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                  <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                                  {customRole.name}
                                </span>
                                {customRole.description && (
                                  <p className="text-[11px] text-zinc-400 mt-1 max-w-xs truncate">
                                    {customRole.description}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-zinc-400 italic">None (Standard)</span>
                            )}
                          </td>

                          {/* Permissions */}
                          <td className="px-4 sm:px-5 py-4">
                            {customRole && customRole.permissions?.length > 0 ? (
                              <div className="flex flex-wrap gap-1 max-w-sm">
                                {customRole.permissions.map((pId) => {
                                  const permInfo = PERMISSION_MAP.find((p) => p.id === pId);
                                  return (
                                    <span
                                      key={pId}
                                      className="inline-block px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 text-[10px] font-medium"
                                    >
                                      {permInfo?.name || pId}
                                    </span>
                                  );
                                })}
                              </div>
                            ) : (
                              <span className="text-xs text-zinc-400 italic">--</span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="px-4 sm:px-5 py-4 whitespace-nowrap text-right">
                            <div className="inline-flex items-center gap-1.5 sm:gap-2">
                              <button
                                onClick={() => openAssignModalForUser(u)}
                                className="px-3 py-1.5 min-h-[38px] rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold transition-colors cursor-pointer"
                                title="Change or assign new role"
                              >
                                Change Role
                              </button>
                              {u.custom_role_id && (
                                <button
                                  onClick={() => handleUnassignRole(u.user_id, `${u.first_name} ${u.surname}`)}
                                  className="px-2.5 py-1.5 min-h-[38px] rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-colors cursor-pointer"
                                  title="Revoke custom role"
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL: Inspect Assigned Users for a Specific Role */}
      {inspectRole && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-4 sm:p-8 space-y-5 shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
              <div>
                <h3 className="font-bold text-zinc-900 text-lg sm:text-xl flex items-center gap-2">
                  <ShieldCheck className="w-6 h-6 text-amber-500 shrink-0" />
                  <span>{inspectRole.name} - Assigned People</span>
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Community members holding this role ({inspectRoleUsers.length} total)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectRole(null)}
                className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-zinc-400 hover:text-zinc-600 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search within this role by name or mobile..."
                value={inspectSearch}
                onChange={(e) => setInspectSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 min-h-[44px] text-sm border border-zinc-200 rounded-xl focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Users List */}
            <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 border border-zinc-200 rounded-2xl bg-zinc-50/50">
              {inspectRoleUsers.length === 0 ? (
                <div className="p-8 text-center text-zinc-500">
                  <p className="text-sm font-semibold">No users currently assigned to this role.</p>
                  <button
                    onClick={() => {
                      const rId = inspectRole.role_id;
                      setInspectRole(null);
                      openAssignModalForRole(rId);
                    }}
                    className="mt-3 inline-flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-xl bg-amber-500 text-white text-xs font-bold hover:bg-amber-600 transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Assign Member Now
                  </button>
                </div>
              ) : (
                inspectRoleUsers.map((u) => {
                  const initials = `${u.first_name.charAt(0)}${u.surname.charAt(0)}`.toUpperCase();
                  return (
                    <div
                      key={u.user_id}
                      className="p-3.5 flex items-center justify-between gap-3 bg-white hover:bg-zinc-50 transition-colors flex-wrap sm:flex-nowrap"
                    >
                      <div className="flex items-center gap-3">
                        {u.profile_photo ? (
                          <img
                            src={mediaUrl(u.profile_photo) || u.profile_photo}
                            alt=""
                            className="w-9 h-9 rounded-full object-cover border border-amber-200 shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-amber-50 text-amber-800 font-bold text-xs flex items-center justify-center border border-amber-200 shrink-0">
                            {initials}
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-zinc-900 text-sm">
                            {u.first_name} {u.surname}
                            {u.samaj_id && (
                              <span className="ml-2 text-[10px] font-mono text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                {u.samaj_id}
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-zinc-500">{u.mobile || u.email || "No contact info"}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setInspectRole(null);
                            openAssignModalForUser(u);
                          }}
                          className="px-3 py-1.5 min-h-[38px] text-xs font-semibold rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 transition-colors cursor-pointer"
                        >
                          Change
                        </button>
                        <button
                          onClick={() => handleUnassignRole(u.user_id, `${u.first_name} ${u.surname}`)}
                          className="px-3 py-1.5 min-h-[38px] text-xs font-semibold rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 transition-colors cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => setInspectRole(null)}
                className="px-5 py-2.5 min-h-[44px] rounded-xl border border-zinc-200 text-xs font-bold text-zinc-600 hover:bg-zinc-50 cursor-pointer flex-1 sm:flex-none"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const rId = inspectRole.role_id;
                  setInspectRole(null);
                  openAssignModalForRole(rId);
                }}
                className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 min-h-[44px] rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow transition-colors cursor-pointer flex-1 sm:flex-none"
              >
                <Plus className="w-4 h-4" /> Assign Another Person
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Create / Edit Role Definition */}
      {showRoleModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-4 sm:p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto my-6">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
              <div>
                <h3 className="font-bold text-zinc-900 text-lg sm:text-xl">
                  {editingRole ? "Edit Custom Role" : "Create Custom Role"}
                </h3>
                <p className="text-xs text-zinc-500">Configure role name and capability permissions</p>
              </div>
              <button
                type="button"
                onClick={() => setShowRoleModal(false)}
                className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-zinc-400 hover:text-zinc-600 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
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
                  className="w-full px-4 py-2.5 min-h-[44px] rounded-xl border border-zinc-200 text-sm focus:outline-none focus:border-amber-500"
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
                  className="w-full px-4 py-2.5 min-h-[44px] rounded-xl border border-zinc-200 text-sm focus:outline-none focus:border-amber-500"
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
                        className={`flex items-start gap-3 p-3 min-h-[44px] rounded-xl border cursor-pointer transition-all ${
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

              <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowRoleModal(false)}
                  className="px-5 py-2.5 min-h-[44px] rounded-xl border border-zinc-200 text-sm font-semibold text-zinc-600 hover:bg-zinc-50 cursor-pointer flex-1 sm:flex-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !roleName.trim()}
                  className="px-6 py-2.5 min-h-[44px] bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-xl shadow-md disabled:opacity-50 transition-all cursor-pointer flex-1 sm:flex-none"
                >
                  {isSubmitting ? "Saving..." : editingRole ? "Update Role" : "Create Role"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Assign Role to User */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-4 sm:p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto my-6">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
              <div>
                <h3 className="font-bold text-zinc-900 text-lg sm:text-xl">Assign Custom Role to Member</h3>
                <p className="text-xs text-zinc-500">Select a person and designate their custom role</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-zinc-400 hover:text-zinc-600 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAssignRoleSubmit} className="space-y-4">
              {/* Member Search */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider block">
                  1. Search &amp; Select Member *
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search name, mobile, email or Samaj ID..."
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 min-h-[44px] rounded-xl border border-zinc-200 text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="mt-2 max-h-44 overflow-y-auto border border-zinc-200 rounded-xl divide-y divide-zinc-100 bg-zinc-50">
                  {filteredMembersForModal.length === 0 ? (
                    <p className="p-4 text-xs text-center text-zinc-400 italic">No matching members found.</p>
                  ) : (
                    filteredMembersForModal.map((m) => (
                      <div
                        key={m.user_id}
                        onClick={() => {
                          setSelectedMember(m);
                          if (!assignRoleId) {
                            setAssignRoleId(m.custom_role_id || "");
                          }
                        }}
                        className={`p-2.5 min-h-[44px] flex items-center justify-between cursor-pointer transition-colors ${
                          selectedMember?.user_id === m.user_id ? "bg-amber-100/70 text-amber-900 font-bold" : "hover:bg-white"
                        }`}
                      >
                        <div>
                          <p className="text-xs font-semibold">
                            {m.first_name} {m.surname}
                            {m.samaj_id && (
                              <span className="ml-1.5 inline-block px-1 py-0.2 rounded bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-mono">
                                {m.samaj_id}
                              </span>
                            )}
                            {m.custom_role_id && (
                              <span className="ml-1.5 inline-block px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-bold">
                                {roles.find((r) => r.role_id === m.custom_role_id)?.name || "Has Role"}
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] text-zinc-500">{m.mobile || m.email || "No contact"}</p>
                        </div>
                        {selectedMember?.user_id === m.user_id && <Check className="w-4 h-4 text-amber-600 shrink-0" />}
                      </div>
                    ))
                  )}
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
                  className="w-full px-4 py-2.5 min-h-[44px] rounded-xl border border-zinc-200 text-sm focus:outline-none focus:border-amber-500 cursor-pointer bg-white"
                >
                  <option value="">-- No Custom Role (Unassigned) --</option>
                  {roles.map((r) => (
                    <option key={r.role_id} value={r.role_id}>
                      {r.name} ({r.permissions?.length || 0} permissions)
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-5 py-2.5 min-h-[44px] rounded-xl border border-zinc-200 text-sm font-semibold text-zinc-600 hover:bg-zinc-50 cursor-pointer flex-1 sm:flex-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assigning || !selectedMember}
                  className="px-6 py-2.5 min-h-[44px] bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-xl shadow-md disabled:opacity-50 transition-all cursor-pointer flex-1 sm:flex-none"
                >
                  {assigning ? "Saving..." : "Save Assignment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
