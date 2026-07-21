"use client";

import { useEffect, useState } from "react";
import { Ticket, Plus, X, Trash2, Power, Percent, IndianRupee } from "lucide-react";
import axios from "axios";
import { getApiBaseUrl } from "@/utils/api";

interface Voucher {
  voucher_id: string;
  code: string;
  description: string | null;
  discount_type: "percentage" | "flat";
  discount_value: number;
  max_discount_amount: number | null;
  min_order_amount: number | null;
  scope: "all" | "booking" | "event";
  usage_limit: number | null;
  used_count: number;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
  created_at: string;
}

const emptyForm = {
  code: "",
  description: "",
  discount_type: "percentage" as "percentage" | "flat",
  discount_value: "",
  max_discount_amount: "",
  min_order_amount: "",
  scope: "all" as "all" | "booking" | "event",
  usage_limit: "",
  valid_from: "",
  valid_until: "",
};

export default function AdminVouchersPage() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const authHeaders = () => {
    const token = localStorage.getItem("token");
    return { Authorization: `Bearer ${token}` };
  };

  useEffect(() => {
    fetchVouchers();
  }, []);

  const fetchVouchers = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${getApiBaseUrl()}/vouchers`, { headers: authHeaders() });
      setVouchers(res.data);
    } catch (err) {
      console.error("Failed to fetch vouchers", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const payload: any = {
        code: form.code.trim().toUpperCase(),
        description: form.description.trim() || undefined,
        discount_type: form.discount_type,
        discount_value: parseFloat(form.discount_value),
        scope: form.scope,
        max_discount_amount: form.max_discount_amount ? parseFloat(form.max_discount_amount) : undefined,
        min_order_amount: form.min_order_amount ? parseFloat(form.min_order_amount) : undefined,
        usage_limit: form.usage_limit ? parseInt(form.usage_limit, 10) : undefined,
        valid_from: form.valid_from ? new Date(form.valid_from).toISOString() : undefined,
        valid_until: form.valid_until ? new Date(form.valid_until).toISOString() : undefined,
      };
      await axios.post(`${getApiBaseUrl()}/vouchers`, payload, { headers: authHeaders() });
      setShowForm(false);
      setForm(emptyForm);
      fetchVouchers();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to create voucher.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (v: Voucher) => {
    try {
      await axios.put(
        `${getApiBaseUrl()}/vouchers/${v.voucher_id}`,
        { is_active: !v.is_active },
        { headers: authHeaders() }
      );
      setVouchers(prev => prev.map(x => x.voucher_id === v.voucher_id ? { ...x, is_active: !x.is_active } : x));
    } catch (err) {
      console.error("Failed to toggle voucher", err);
    }
  };

  const handleDelete = async (v: Voucher) => {
    if (!confirm(`Delete voucher "${v.code}"? This cannot be undone.`)) return;
    try {
      await axios.delete(`${getApiBaseUrl()}/vouchers/${v.voucher_id}`, { headers: authHeaders() });
      setVouchers(prev => prev.filter(x => x.voucher_id !== v.voucher_id));
    } catch (err) {
      console.error("Failed to delete voucher", err);
    }
  };

  const formatDiscount = (v: Voucher) =>
    v.discount_type === "percentage"
      ? `${v.discount_value}% off${v.max_discount_amount ? ` (up to ₹${v.max_discount_amount})` : ""}`
      : `₹${v.discount_value} off`;

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Vouchers</h1>
          <p className="text-sm text-zinc-500 mt-1">Create discount codes for Bhavan bookings and event registrations.</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setError(""); }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" /> New Voucher
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-zinc-500 flex flex-col items-center justify-center gap-2">
            <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-medium">Loading vouchers...</p>
          </div>
        ) : vouchers.length === 0 ? (
          <div className="p-12 text-center text-zinc-500">
            <Ticket className="w-8 h-8 mx-auto text-zinc-300 mb-3" />
            No vouchers created yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 text-xs uppercase tracking-wider text-zinc-500 bg-zinc-50/50">
                  <th className="px-6 py-4 font-medium">Code</th>
                  <th className="px-6 py-4 font-medium">Discount</th>
                  <th className="px-6 py-4 font-medium">Scope</th>
                  <th className="px-6 py-4 font-medium">Usage</th>
                  <th className="px-6 py-4 font-medium">Valid Until</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-sm">
                {vouchers.map((v) => (
                  <tr key={v.voucher_id} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-mono font-bold text-zinc-900">{v.code}</p>
                      {v.description && <p className="text-xs text-zinc-500 mt-0.5">{v.description}</p>}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 text-zinc-700 font-semibold">
                        {v.discount_type === "percentage" ? <Percent className="w-3.5 h-3.5 text-amber-500" /> : <IndianRupee className="w-3.5 h-3.5 text-amber-500" />}
                        {formatDiscount(v)}
                      </span>
                      {v.min_order_amount ? <p className="text-xs text-zinc-400 mt-0.5">Min order ₹{v.min_order_amount}</p> : null}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 bg-zinc-100 text-zinc-600 text-xs font-semibold rounded-full uppercase">{v.scope}</span>
                    </td>
                    <td className="px-6 py-4 text-zinc-600">
                      {v.used_count}{v.usage_limit ? ` / ${v.usage_limit}` : " / ∞"}
                    </td>
                    <td className="px-6 py-4 text-zinc-600">
                      {v.valid_until ? new Date(v.valid_until).toLocaleDateString() : "No expiry"}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${v.is_active ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-zinc-100 text-zinc-500 border border-zinc-200"}`}>
                        {v.is_active ? "Active" : "Disabled"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleToggleActive(v)}
                          title={v.is_active ? "Disable" : "Enable"}
                          className={`p-2 rounded-lg transition-colors ${v.is_active ? "text-zinc-500 hover:bg-zinc-100" : "text-emerald-600 hover:bg-emerald-50"}`}
                        >
                          <Power className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(v)}
                          title="Delete"
                          className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-zinc-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden border border-zinc-200 max-h-[90vh] overflow-y-auto">
            <div className="bg-zinc-50 border-b border-zinc-200 px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-zinc-900 flex items-center gap-2"><Ticket className="w-5 h-5 text-amber-500" /> New Voucher</h3>
              <button onClick={() => setShowForm(false)} className="text-zinc-400 hover:text-zinc-700"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4 text-sm">
              {error && (
                <div className="p-3 bg-rose-50 text-rose-600 text-sm rounded-xl border border-rose-100">{error}</div>
              )}

              <div className="space-y-1.5">
                <label className="font-semibold text-zinc-700">Voucher Code *</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. DIWALI25"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-zinc-700">Description</label>
                <input
                  type="text"
                  placeholder="Internal note — not shown to users"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-semibold text-zinc-700">Discount Type *</label>
                  <select
                    value={form.discount_type}
                    onChange={(e) => setForm({ ...form, discount_type: e.target.value as "percentage" | "flat" })}
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="flat">Flat Amount (₹)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold text-zinc-700">
                    {form.discount_type === "percentage" ? "Discount %" : "Discount ₹"} *
                  </label>
                  <input
                    required
                    type="number"
                    min="0"
                    max={form.discount_type === "percentage" ? 100 : undefined}
                    step="0.01"
                    value={form.discount_value}
                    onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              {form.discount_type === "percentage" && (
                <div className="space-y-1.5">
                  <label className="font-semibold text-zinc-700">Max Discount Cap (₹, optional)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="e.g. 500"
                    value={form.max_discount_amount}
                    onChange={(e) => setForm({ ...form, max_discount_amount: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-semibold text-zinc-700">Applies To</label>
                  <select
                    value={form.scope}
                    onChange={(e) => setForm({ ...form, scope: e.target.value as "all" | "booking" | "event" })}
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="all">Bookings & Events</option>
                    <option value="booking">Bhavan Bookings Only</option>
                    <option value="event">Events Only</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold text-zinc-700">Usage Limit (optional)</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Unlimited"
                    value={form.usage_limit}
                    onChange={(e) => setForm({ ...form, usage_limit: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-zinc-700">Minimum Order Amount (₹, optional)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g. 1000"
                  value={form.min_order_amount}
                  onChange={(e) => setForm({ ...form, min_order_amount: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-semibold text-zinc-700">Valid From (optional)</label>
                  <input
                    type="date"
                    value={form.valid_from}
                    onChange={(e) => setForm({ ...form, valid_from: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold text-zinc-700">Valid Until (optional)</label>
                  <input
                    type="date"
                    value={form.valid_until}
                    onChange={(e) => setForm({ ...form, valid_until: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 rounded-xl border border-zinc-200 text-zinc-700 text-sm font-semibold hover:bg-zinc-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-bold transition-colors"
                >
                  {submitting ? "Creating..." : "Create Voucher"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
