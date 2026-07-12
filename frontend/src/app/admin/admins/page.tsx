"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { getApiBaseUrl } from "@/utils/api";
import { Shield, UserPlus, KeyRound, Loader2, IndianRupee, CheckCircle2, X } from "lucide-react";

interface AdminStats {
  bookings_approved: number;
  booking_cash_amount: number;
  events_approved: number;
  event_cash_amount: number;
  total_approvals: number;
  total_cash_generated: number;
  total_amount_generated: number;
}

interface Admin {
  user_id: string;
  first_name: string;
  surname: string;
  email: string | null;
  mobile: string | null;
  role: string;
  is_active: boolean;
  admin_notes: string | null;
  stats: AdminStats;
}

export default function AdminManagementPage() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ first_name: "", surname: "", email: "", mobile: "", password: "", admin_notes: "" });
  const [resetId, setResetId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [toast, setToast] = useState("");

  const authHeader = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });

  const loadAdmins = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${getApiBaseUrl()}/admin/admins`, authHeader());
      setAdmins(res.data);
      setError("");
    } catch (e: any) {
      setError(e.response?.data?.detail || "Failed to load admins. Super admin access required.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAdmins(); }, []);

  const createAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await axios.post(`${getApiBaseUrl()}/admin/admins`, form, authHeader());
      setToast(`Admin ${form.first_name} created`);
      setForm({ first_name: "", surname: "", email: "", mobile: "", password: "", admin_notes: "" });
      setShowForm(false);
      loadAdmins();
    } catch (e: any) {
      setError(e.response?.data?.detail || "Failed to create admin");
    } finally {
      setSubmitting(false);
    }
  };

  const resetPassword = async (id: string) => {
    if (!newPassword || newPassword.length < 6) { setError("Password must be at least 6 characters"); return; }
    try {
      await axios.post(`${getApiBaseUrl()}/admin/admins/${id}/reset-password`, { new_password: newPassword }, authHeader());
      setToast("Password updated");
      setResetId(null);
      setNewPassword("");
    } catch (e: any) {
      setError(e.response?.data?.detail || "Failed to reset password");
    }
  };

  const toggleActive = async (a: Admin) => {
    try {
      await axios.put(`${getApiBaseUrl()}/admin/admins/${a.user_id}`, { is_active: !a.is_active }, authHeader());
      loadAdmins();
    } catch (e: any) {
      setError(e.response?.data?.detail || "Failed to update");
    }
  };

  const inr = (n: number) => `₹${(n || 0).toLocaleString("en-IN")}`;

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> {toast}
          <button onClick={() => setToast("")}><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 flex items-center gap-2">
            <Shield className="w-6 h-6 text-amber-600" /> Admin Management
          </h1>
          <p className="text-sm text-zinc-500">Create admin accounts and track their approval performance.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 bg-zinc-900 text-white px-4 py-2 rounded-xl text-sm hover:bg-zinc-800">
          <UserPlus className="w-4 h-4" /> New Admin
        </button>
      </div>

      {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">{error}</div>}

      {showForm && (
        <form onSubmit={createAdmin} className="bg-white border border-zinc-200 rounded-2xl p-5 mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <input required placeholder="First name" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} className="border border-zinc-200 rounded-xl px-3 py-2 text-sm" />
          <input required placeholder="Surname" value={form.surname} onChange={(e) => setForm({ ...form, surname: e.target.value })} className="border border-zinc-200 rounded-xl px-3 py-2 text-sm" />
          <input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="border border-zinc-200 rounded-xl px-3 py-2 text-sm" />
          <input placeholder="Mobile (optional)" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} className="border border-zinc-200 rounded-xl px-3 py-2 text-sm" />
          <input required type="text" placeholder="Password (min 6 chars)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="border border-zinc-200 rounded-xl px-3 py-2 text-sm" />
          <input placeholder="Notes (optional)" value={form.admin_notes} onChange={(e) => setForm({ ...form, admin_notes: e.target.value })} className="border border-zinc-200 rounded-xl px-3 py-2 text-sm" />
          <div className="md:col-span-2 flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl text-sm border border-zinc-200">Cancel</button>
            <button type="submit" disabled={submitting} className="px-4 py-2 rounded-xl text-sm bg-amber-600 text-white flex items-center gap-2">
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />} Create Admin
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-zinc-400" /></div>
      ) : (
        <div className="space-y-4">
          {admins.map((a) => (
            <div key={a.user_id} className="bg-white border border-zinc-200 rounded-2xl p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-zinc-900">{a.first_name} {a.surname}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${a.role === "super_admin" ? "bg-purple-100 text-purple-700" : "bg-amber-100 text-amber-700"}`}>{a.role}</span>
                    {!a.is_active && <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-600">inactive</span>}
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5">{a.email} {a.mobile ? `• ${a.mobile}` : ""}</p>
                  {a.admin_notes && <p className="text-xs text-zinc-400 mt-1 italic">{a.admin_notes}</p>}
                </div>
                {a.role !== "super_admin" && (
                  <div className="flex items-center gap-2">
                    <button onClick={() => setResetId(resetId === a.user_id ? null : a.user_id)} className="text-xs flex items-center gap-1 border border-zinc-200 rounded-lg px-3 py-1.5 hover:bg-zinc-50">
                      <KeyRound className="w-3.5 h-3.5" /> Reset Password
                    </button>
                    <button onClick={() => toggleActive(a)} className="text-xs border border-zinc-200 rounded-lg px-3 py-1.5 hover:bg-zinc-50">
                      {a.is_active ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                )}
              </div>

              {resetId === a.user_id && (
                <div className="mt-3 flex items-center gap-2">
                  <input type="text" placeholder="New password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="border border-zinc-200 rounded-lg px-3 py-1.5 text-sm" />
                  <button onClick={() => resetPassword(a.user_id)} className="text-xs bg-zinc-900 text-white rounded-lg px-3 py-1.5">Save</button>
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                <Stat label="Total Approvals" value={a.stats.total_approvals} />
                <Stat label="Cash Generated" value={inr(a.stats.total_cash_generated)} highlight />
                <Stat label="Bookings Approved" value={a.stats.bookings_approved} />
                <Stat label="Events Approved" value={a.stats.events_approved} />
              </div>
            </div>
          ))}
          {admins.length === 0 && <p className="text-sm text-zinc-500 text-center py-10">No admins yet.</p>}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className={`rounded-xl p-3 border ${highlight ? "bg-amber-50 border-amber-200" : "bg-zinc-50 border-zinc-100"}`}>
      <p className="text-[11px] text-zinc-500">{label}</p>
      <p className={`text-lg font-bold ${highlight ? "text-amber-700" : "text-zinc-900"}`}>{value}</p>
    </div>
  );
}
