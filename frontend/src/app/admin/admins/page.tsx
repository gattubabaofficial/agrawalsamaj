"use client";

import { useEffect, useState } from "react";
import { getApiBaseUrl, safeFetch, formatErrorMessage } from "@/utils/api";
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

  const authHeader = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem("token")}`, "Content-Type": "application/json" } });

  const loadAdmins = async () => {
    setLoading(true);
    try {
      const res = await safeFetch(`${getApiBaseUrl()}/admin/admins`, authHeader());
      const data = await res.json();
      if (res.ok) {
        setAdmins(Array.isArray(data) ? data : []);
        setError("");
      } else {
        setError(formatErrorMessage(data?.detail, "Failed to load admins. Super admin access required."));
      }
    } catch (e: any) {
      setError(formatErrorMessage(e, "Failed to load admins. Super admin access required."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAdmins(); }, []);

  const createAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await safeFetch(`${getApiBaseUrl()}/admin/admins`, {
        method: "POST",
        ...authHeader(),
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (res.ok) {
        setToast(`Admin ${form.first_name} created`);
        setForm({ first_name: "", surname: "", email: "", mobile: "", password: "", admin_notes: "" });
        setShowForm(false);
        loadAdmins();
      } else {
        setError(formatErrorMessage(data?.detail, "Failed to create admin"));
      }
    } catch (e: any) {
      setError(formatErrorMessage(e, "Failed to create admin"));
    } finally {
      setSubmitting(false);
    }
  };

  const resetPassword = async (id: string) => {
    if (!newPassword || newPassword.length < 6) { setError("Password must be at least 6 characters"); return; }
    try {
      const res = await safeFetch(`${getApiBaseUrl()}/admin/admins/${id}/reset-password`, {
        method: "POST",
        ...authHeader(),
        body: JSON.stringify({ new_password: newPassword })
      });
      const data = await res.json();
      if (res.ok) {
        setToast("Password updated");
        setResetId(null);
        setNewPassword("");
      } else {
        setError(formatErrorMessage(data?.detail, "Failed to reset password"));
      }
    } catch (e: any) {
      setError(formatErrorMessage(e, "Failed to reset password"));
    }
  };

  const toggleActive = async (a: Admin) => {
    try {
      const res = await safeFetch(`${getApiBaseUrl()}/admin/admins/${a.user_id}`, {
        method: "PUT",
        ...authHeader(),
        body: JSON.stringify({ is_active: !a.is_active })
      });
      const data = await res.json();
      if (res.ok) {
        loadAdmins();
      } else {
        setError(formatErrorMessage(data?.detail, "Failed to update"));
      }
    } catch (e: any) {
      setError(formatErrorMessage(e, "Failed to update"));
    }
  };

  const inr = (n: number) => `₹${(n || 0).toLocaleString("en-IN")}`;

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 text-sm">
          <CheckCircle2 className="w-4 h-4 shrink-0" /> <span className="flex-1">{toast}</span>
          <button onClick={() => setToast("")} className="min-h-[36px] min-w-[36px] flex items-center justify-center -mr-1"><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 flex items-center gap-2">
            <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600 shrink-0" /> Admin Management
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 mt-0.5">Create admin accounts and track their approval performance.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="min-h-[44px] flex items-center justify-center gap-2 bg-zinc-900 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-zinc-800 shrink-0 w-full sm:w-auto">
          <UserPlus className="w-4 h-4" /> New Admin
        </button>
      </div>

      {showForm && (
        <form onSubmit={createAdmin} className="bg-white border border-zinc-200 rounded-2xl p-4 sm:p-6 mb-6 grid grid-cols-1 md:grid-cols-2 gap-4 shadow-sm">
          <div>
            <label className="block text-xs font-semibold text-zinc-600 mb-1">First Name *</label>
            <input required placeholder="First name" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} className="w-full min-h-[44px] border border-zinc-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-600 mb-1">Surname *</label>
            <input required placeholder="Surname" value={form.surname} onChange={(e) => setForm({ ...form, surname: e.target.value })} className="w-full min-h-[44px] border border-zinc-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-600 mb-1">Email *</label>
            <input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full min-h-[44px] border border-zinc-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-600 mb-1">Mobile</label>
            <input placeholder="Mobile (optional)" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} className="w-full min-h-[44px] border border-zinc-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-600 mb-1">Password *</label>
            <input required type="text" placeholder="Password (min 6 chars)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full min-h-[44px] border border-zinc-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-600 mb-1">Notes</label>
            <input placeholder="Notes (optional)" value={form.admin_notes} onChange={(e) => setForm({ ...form, admin_notes: e.target.value })} className="w-full min-h-[44px] border border-zinc-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500" />
          </div>
          {error && <div className="md:col-span-2 bg-red-50 text-red-600 p-3 rounded-xl text-sm border border-red-100">{error}</div>}
          <div className="md:col-span-2 flex flex-col-reverse sm:flex-row justify-end gap-2.5 pt-2">
            <button type="button" onClick={() => { setShowForm(false); setError(""); }} className="min-h-[44px] px-4 py-2.5 rounded-xl text-sm font-medium border border-zinc-200 hover:bg-zinc-50 w-full sm:w-auto">Cancel</button>
            <button type="submit" disabled={submitting} className="min-h-[44px] px-5 py-2.5 rounded-xl text-sm font-medium bg-amber-600 hover:bg-amber-700 text-white flex items-center justify-center gap-2 w-full sm:w-auto">
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />} Create Admin
            </button>
          </div>
        </form>
      )}

      {error && !showForm && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm mb-4 border border-red-100">{error}</div>}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-zinc-400" /></div>
      ) : (
        <div className="space-y-4">
          {admins.map((a) => (
            <div key={a.user_id} className="bg-white border border-zinc-200 rounded-2xl p-4 sm:p-5 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-zinc-900 text-base">{a.first_name} {a.surname}</span>
                    <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${a.role === "super_admin" ? "bg-purple-100 text-purple-700" : "bg-amber-100 text-amber-700"}`}>{a.role}</span>
                    {!a.is_active && <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-red-100 text-red-600">inactive</span>}
                  </div>
                  <p className="text-xs text-zinc-500 mt-1 break-all">{a.email} {a.mobile ? `• ${a.mobile}` : ""}</p>
                  {a.admin_notes && <p className="text-xs text-zinc-400 mt-1 italic">{a.admin_notes}</p>}
                </div>
                {a.role !== "super_admin" && (
                  <div className="flex flex-wrap items-center gap-2 pt-2 sm:pt-0">
                    <button onClick={() => setResetId(resetId === a.user_id ? null : a.user_id)} className="min-h-[40px] text-xs font-medium flex items-center gap-1.5 border border-zinc-200 rounded-xl px-3 py-2 hover:bg-zinc-50">
                      <KeyRound className="w-3.5 h-3.5" /> Reset Password
                    </button>
                    <button onClick={() => toggleActive(a)} className={`min-h-[40px] text-xs font-medium border rounded-xl px-3 py-2 ${a.is_active ? "border-red-200 text-red-600 hover:bg-red-50" : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"}`}>
                      {a.is_active ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                )}
              </div>

              {resetId === a.user_id && (
                <div className="mt-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-zinc-50 p-3 rounded-xl border border-zinc-200">
                  <input type="text" placeholder="New password (min 6 chars)" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full min-h-[44px] border border-zinc-200 rounded-xl px-3 py-2 text-sm bg-white" />
                  <button onClick={() => resetPassword(a.user_id)} className="min-h-[44px] text-xs font-medium bg-zinc-900 text-white rounded-xl px-4 py-2 hover:bg-zinc-800 shrink-0">Save Password</button>
                </div>
              )}

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 mt-4">
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
