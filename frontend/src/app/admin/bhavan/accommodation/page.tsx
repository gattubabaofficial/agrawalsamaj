"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import {
  Building, Plus, ArrowLeft, Trash2, RefreshCw, AlertCircle,
  Eye, Edit3, X, Search, Users, DollarSign, Layers, Loader2,
  CheckCircle2, Wrench, XCircle
} from "lucide-react";
import { getApiBaseUrl, safeFetch } from "@/utils/api";

interface UnitItem {
  id: string;
  label: string;
  status: string;
  notes?: string | null;
}

interface AccommodationType {
  id: string;
  name: string;
  kind?: string;
  description?: string | null;
  capacity_per_unit: number;
  base_price_per_night: number;
  units: UnitItem[];
}

export default function AdminAccommodationPage() {
  const [types, setTypes] = useState<AccommodationType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // View Details Modal state
  const [viewingType, setViewingType] = useState<AccommodationType | null>(null);

  // Edit / Create Modal state
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [editingType, setEditingType] = useState<AccommodationType | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [capacity, setCapacity] = useState<number | string>(2);
  const [rate, setRate] = useState<number | string>(1500);
  const [unitQuantity, setUnitQuantity] = useState<number | string>(1);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Delete Confirmation Modal state
  const [deletingType, setDeletingType] = useState<AccommodationType | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchTypes();
  }, []);

  const fetchTypes = async () => {
    setLoading(true);
    setError(null);
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    try {
      const res = await safeFetch(`${getApiBaseUrl()}/admin/bhavan/accommodation-types`, {
        headers,
      });
      if (res.ok) {
        const data = await res.json();
        setTypes(data);
      } else {
        setError("Failed to load inventory from server.");
      }
    } catch (err: any) {
      console.error("Fetch types error:", err);
      setError("Network or connection error connecting to server.");
    } finally {
      setLoading(false);
    }
  };

  // Alphabetical sort & filter by search query
  const sortedAndFilteredTypes = useMemo(() => {
    return [...types]
      .filter((t) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          t.name.toLowerCase().includes(q) ||
          (t.description && t.description.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  }, [types, searchQuery]);

  const handleOpenAddModal = () => {
    setEditingType(null);
    setName("");
    setDescription("");
    setCapacity(2);
    setRate(1500);
    setUnitQuantity(1);
    setSaveError(null);
    setIsSaving(false);
    setShowTypeModal(true);
  };

  const handleOpenEditModal = (t: AccommodationType) => {
    setViewingType(null);
    setEditingType(t);
    setName(t.name);
    setDescription(t.description || "");
    setCapacity(t.capacity_per_unit);
    setRate(t.base_price_per_night);
    setUnitQuantity(t.units?.length || 1);
    setSaveError(null);
    setIsSaving(false);
    setShowTypeModal(true);
  };

  const handleSaveType = async () => {
    if (!name.trim()) {
      setSaveError("Accommodation Name is required.");
      return;
    }

    const parsedRate = typeof rate === "string" ? parseFloat(rate) : rate;
    if (isNaN(parsedRate) || parsedRate < 0) {
      setSaveError("Please enter a valid rate (₹).");
      return;
    }

    const parsedUnits = typeof unitQuantity === "string" ? parseInt(unitQuantity) : unitQuantity;
    if (isNaN(parsedUnits) || parsedUnits < 1) {
      setSaveError("Please enter at least 1 unit.");
      return;
    }

    const parsedCapacity = typeof capacity === "string" ? parseInt(capacity) : capacity;
    if (isNaN(parsedCapacity) || parsedCapacity < 1) {
      setSaveError("Please enter a valid guest capacity (at least 1).");
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const payload = {
      name: name.trim(),
      kind: editingType?.kind || "room",
      description: description.trim() || null,
      capacity_per_unit: parsedCapacity,
      base_price_per_night: parsedRate,
      allow_standalone_booking: true,
      composition_json: null,
      total_units: parsedUnits,
    };

    try {
      const url = editingType
        ? `${getApiBaseUrl()}/admin/bhavan/accommodation-types/${editingType.id}`
        : `${getApiBaseUrl()}/admin/bhavan/accommodation-types`;
      const method = editingType ? "PUT" : "POST";

      const res = await safeFetch(url, {
        method,
        headers,
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setShowTypeModal(false);
        setEditingType(null);
        setName("");
        setDescription("");
        setSaveError(null);
        await fetchTypes();
      } else {
        const errData = await res.json().catch(() => ({}));
        setSaveError(errData.detail || "Failed to save accommodation record.");
      }
    } catch (err: any) {
      console.error("Save type error:", err);
      setSaveError("Network error occurred while saving. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteType = async () => {
    if (!deletingType) return;
    const targetId = deletingType.id;
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    setIsDeleting(true);
    try {
      const res = await safeFetch(`${getApiBaseUrl()}/admin/bhavan/accommodation-types/${targetId}`, {
        method: "DELETE",
        headers,
      });
      if (res.ok) {
        setTypes(prev => prev.filter(t => t.id !== targetId));
        setDeletingType(null);
        fetchTypes();
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.detail || "Failed to deactivate accommodation.");
      }
    } catch (err) {
      console.error("Delete type error:", err);
      alert("Network error occurred while deactivating.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6" suppressHydrationWarning>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Accommodation Inventory</h1>
          <p className="text-xs text-zinc-500">Manage rooms, rates, quantity, and guest capacities in alphabetical order</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-amber-400 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Accommodation
          </button>
        </div>
      </div>

      {/* Search Filter & Count */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-zinc-200 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search accommodation by name..."
            className="w-full pl-9 pr-3 py-2 border border-zinc-200 rounded-xl text-xs focus:outline-none focus:border-amber-500 bg-zinc-50/50"
          />
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500 self-end sm:self-auto">
          <span>Total Records: <strong className="text-zinc-900">{sortedAndFilteredTypes.length}</strong></span>
          <span>•</span>
          <span>Total Units: <strong className="text-zinc-900">{sortedAndFilteredTypes.reduce((acc, t) => acc + (t.units?.length || 0), 0)}</strong></span>
        </div>
      </div>

      {/* Loading / Error States */}
      {loading ? (
        <div className="p-12 text-center text-xs text-zinc-400 bg-white rounded-2xl border border-zinc-200 shadow-sm">
          Loading accommodation inventory...
        </div>
      ) : error ? (
        <div className="p-8 text-center bg-white rounded-2xl border border-rose-200 space-y-3 shadow-sm">
          <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
          <p className="text-xs font-bold text-zinc-800">{error}</p>
          <p className="text-[11px] text-zinc-400">If you are using a browser extension (e.g. AdBlock/VPN), ensure it permits local backend calls.</p>
          <button
            onClick={fetchTypes}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 text-white text-xs font-bold rounded-lg hover:bg-amber-400"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry Fetching
          </button>
        </div>
      ) : sortedAndFilteredTypes.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-zinc-200 shadow-sm space-y-3">
          <Building className="w-10 h-10 text-zinc-300 mx-auto" />
          <p className="text-sm font-bold text-zinc-700">No accommodation found</p>
          <p className="text-xs text-zinc-400">
            {searchQuery ? "Try searching with a different keyword" : "Click 'Add Accommodation' above to create your first entry"}
          </p>
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50/80 border-b border-zinc-200 text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4 w-12 text-center">#</th>
                  <th className="py-3.5 px-4">Accommodation Name & Description</th>
                  <th className="py-3.5 px-4">Rate (₹ / Night)</th>
                  <th className="py-3.5 px-4">Total Units / Quantity</th>
                  <th className="py-3.5 px-4">Guest Capacity</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-xs">
                {sortedAndFilteredTypes.map((t, index) => (
                  <tr
                    key={t.id}
                    className="hover:bg-amber-50/30 transition-colors group"
                  >
                    {/* Index */}
                    <td className="py-4 px-4 text-center font-mono text-zinc-400 font-medium">
                      {index + 1}
                    </td>

                    {/* Name & Description */}
                    <td className="py-4 px-4">
                      <div className="space-y-0.5">
                        <span className="font-bold text-zinc-900 text-sm group-hover:text-amber-700 transition-colors">
                          {t.name}
                        </span>
                        {t.description ? (
                          <p className="text-xs text-zinc-500 line-clamp-1 max-w-md">
                            {t.description}
                          </p>
                        ) : (
                          <p className="text-xs text-zinc-300 italic">No description provided</p>
                        )}
                      </div>
                    </td>

                    {/* Rate */}
                    <td className="py-4 px-4">
                      <span className="font-extrabold text-amber-600 text-sm">
                        ₹{t.base_price_per_night}
                      </span>
                      <span className="text-[10px] text-zinc-400 block">per night</span>
                    </td>

                    {/* Total Units / Quantity */}
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        <Layers className="w-3.5 h-3.5" />
                        {t.units?.length || 0} Units
                      </span>
                    </td>

                    {/* Capacity */}
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center gap-1 text-zinc-700 font-medium">
                        <Users className="w-3.5 h-3.5 text-zinc-400" />
                        {t.capacity_per_unit} Guests / Unit
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => setViewingType(t)}
                          title="View Details"
                          className="p-1.5 text-zinc-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(t)}
                          title="Edit Accommodation"
                          className="p-1.5 text-zinc-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingType(t)}
                          title="Delete Accommodation"
                          className="p-1.5 text-zinc-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
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
        </div>
      )}

      {/* Bottom Navigation & Actions Bar */}
      <div className="pt-4 border-t border-zinc-200 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm">
        <Link
          href="/admin/bhavan"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-300 bg-white hover:bg-zinc-50 text-xs font-bold text-zinc-700 shadow-sm transition-all"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Bhavan Overview
        </Link>

        <button
          onClick={handleOpenAddModal}
          className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-amber-400 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add Accommodation
        </button>
      </div>

      {/* MODAL: View Details */}
      {viewingType && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg border border-blue-200">
                  {viewingType.units?.length || 0} Units Registered
                </span>
              </div>
              <button
                onClick={() => setViewingType(null)}
                className="text-zinc-400 hover:text-zinc-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-zinc-900">{viewingType.name}</h2>
              {viewingType.description ? (
                <div className="mt-2.5 p-3.5 bg-zinc-50 rounded-xl border border-zinc-100">
                  <span className="text-[10px] font-bold text-zinc-400 block uppercase tracking-wider mb-1">Description</span>
                  <p className="text-xs text-zinc-700 leading-relaxed whitespace-pre-wrap">{viewingType.description}</p>
                </div>
              ) : (
                <p className="text-xs text-zinc-400 mt-1 italic">No description provided</p>
              )}

              <div className="grid grid-cols-3 gap-3 mt-4">
                <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-100">
                  <span className="text-[10px] font-bold text-zinc-500 block uppercase">Rate / Night</span>
                  <span className="text-base font-extrabold text-amber-600">₹{viewingType.base_price_per_night}</span>
                </div>
                <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100">
                  <span className="text-[10px] font-bold text-zinc-500 block uppercase">Total Units</span>
                  <span className="text-base font-extrabold text-blue-700">{viewingType.units?.length || 0} Units</span>
                </div>
                <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                  <span className="text-[10px] font-bold text-zinc-500 block uppercase">Capacity</span>
                  <span className="text-base font-extrabold text-zinc-800">{viewingType.capacity_per_unit} Guests</span>
                </div>
              </div>
            </div>

            {/* Units list */}
            <div>
              <h4 className="text-xs font-bold text-zinc-700 uppercase tracking-wider mb-2">
                Registered Room Units ({viewingType.units?.length || 0}):
              </h4>
              {viewingType.units && viewingType.units.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                  {viewingType.units.map((u) => (
                    <div
                      key={u.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 border border-zinc-200 text-xs"
                    >
                      <span className="font-mono font-bold text-zinc-800">{u.label}</span>
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                        {u.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-400 italic">No room units registered.</p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
              <button
                onClick={() => setViewingType(null)}
                className="px-4 py-2 border border-zinc-200 rounded-lg text-xs font-semibold hover:bg-zinc-50 cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => handleOpenEditModal(viewingType)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 text-white font-bold rounded-lg text-xs hover:bg-amber-400 transition-colors shadow-sm cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" /> Edit Accommodation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Add / Edit Type */}
      {showTypeModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="text-lg font-bold text-zinc-900">
                {editingType ? "Edit Accommodation" : "Add Accommodation"}
              </h3>
              <button
                onClick={() => { setShowTypeModal(false); setEditingType(null); }}
                className="text-zinc-400 hover:text-zinc-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {saveError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{saveError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Accommodation Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. AC Deluxe Room, Hall, Suite"
                className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Description</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter description, facilities, features, bed type, etc."
                className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm resize-none focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col justify-end">
                <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1.5 truncate">
                  Rate (₹ / Night) *
                </label>
                <input
                  type="number"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  placeholder="e.g. 1500"
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm font-bold text-amber-600 focus:outline-none focus:border-amber-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
              <div className="flex flex-col justify-end">
                <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1.5 truncate">
                  Total Units *
                </label>
                <input
                  type="number"
                  value={unitQuantity}
                  onChange={(e) => setUnitQuantity(e.target.value)}
                  placeholder="e.g. 10"
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm font-bold text-zinc-800 focus:outline-none focus:border-amber-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1.5">
                Guest Capacity (Persons / Unit) *
              </label>
              <input
                type="number"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                placeholder="e.g. 2"
                className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-amber-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => { setShowTypeModal(false); setEditingType(null); }}
                className="px-4 py-2 border border-zinc-200 rounded-lg text-xs font-semibold hover:bg-zinc-50 cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={handleSaveType}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 text-white font-bold rounded-lg text-xs hover:bg-amber-400 transition-colors shadow-sm cursor-pointer disabled:opacity-60"
              >
                {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Delete Confirmation */}
      {deletingType && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-4 text-center shadow-xl">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-zinc-900">Deactivate Accommodation?</h3>
              <p className="text-xs text-zinc-500 mt-1">
                Are you sure you want to deactivate <strong className="text-zinc-800">"{deletingType.name}"</strong>?
              </p>
            </div>
            <div className="flex justify-center gap-3 pt-2">
              <button
                disabled={isDeleting}
                onClick={() => setDeletingType(null)}
                className="px-4 py-2 border border-zinc-200 rounded-lg text-xs font-semibold hover:bg-zinc-50 cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                disabled={isDeleting}
                onClick={handleDeleteType}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 text-white font-bold rounded-lg text-xs hover:bg-rose-500 transition-colors shadow-sm cursor-pointer disabled:opacity-60"
              >
                {isDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {isDeleting ? "Deactivating..." : "Deactivate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
