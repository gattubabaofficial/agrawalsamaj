"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Building, Plus, Upload, Layers, ArrowLeft, Trash2, RefreshCw, AlertCircle,
  Eye, Edit3, CheckCircle2, Wrench, XCircle, X, ShieldAlert, Lock
} from "lucide-react";
import { getApiBaseUrl, safeFetch } from "@/utils/api";

interface ComponentItem {
  type_id: string;
  quantity: number;
}

interface UnitItem {
  id: string;
  label: string;
  status: "available" | "maintenance" | "inactive" | string;
  notes?: string | null;
}

interface AccommodationType {
  id: string;
  name: string;
  kind: string;
  capacity_per_unit: number;
  base_price_per_night: number;
  allow_standalone_booking?: boolean;
  composition_json?: { components?: ComponentItem[] } | null;
  units: UnitItem[];
}

export default function AdminAccommodationPage() {
  const [types, setTypes] = useState<AccommodationType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // View Modal state
  const [viewingType, setViewingType] = useState<AccommodationType | null>(null);

  // Edit / Create Modal state
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [editingType, setEditingType] = useState<AccommodationType | null>(null);
  const [name, setName] = useState("");
  const [kind, setKind] = useState("room");
  const [capacity, setCapacity] = useState(2);
  const [basePrice, setBasePrice] = useState(1500);
  const [allowStandaloneBooking, setAllowStandaloneBooking] = useState(true);

  // Composite package composition state
  const [isComposite, setIsComposite] = useState(false);
  const [components, setComponents] = useState<ComponentItem[]>([]);

  // Delete Confirmation Modal state
  const [deletingType, setDeletingType] = useState<AccommodationType | null>(null);

  // Bulk units modal
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [selectedTypeId, setSelectedTypeId] = useState("");
  const [bulkPrefix, setBulkPrefix] = useState("Room ");
  const [bulkStart, setBulkStart] = useState(101);
  const [bulkCount, setBulkCount] = useState(10);

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
        if (viewingType) {
          const updatedViewing = data.find((t: AccommodationType) => t.id === viewingType.id);
          if (updatedViewing) setViewingType(updatedViewing);
        }
      } else {
        setError("Failed to load inventory from server.");
      }
    } catch (err: any) {
      console.error("Fetch types error:", err);
      setError("Network or browser extension error connecting to server.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingType(null);
    setName("");
    setKind("room");
    setCapacity(2);
    setBasePrice(1500);
    setAllowStandaloneBooking(true);
    setIsComposite(false);
    setComponents([]);
    setShowTypeModal(true);
  };

  const handleOpenEditModal = (t: AccommodationType) => {
    setEditingType(t);
    setName(t.name);
    setKind(t.kind);
    setCapacity(t.capacity_per_unit);
    setBasePrice(t.base_price_per_night);
    setAllowStandaloneBooking(t.allow_standalone_booking !== false);
    const hasComponents = !!(t.composition_json?.components && t.composition_json.components.length > 0);
    setIsComposite(hasComponents);
    setComponents(hasComponents ? t.composition_json!.components! : []);
    setShowTypeModal(true);
  };

  const handleAddComponentRow = () => {
    const defaultTypeId = types.length > 0 ? types[0].id : "";
    setComponents([...components, { type_id: defaultTypeId, quantity: 1 }]);
  };

  const handleRemoveComponentRow = (idx: number) => {
    setComponents(components.filter((_, i) => i !== idx));
  };

  const handleUpdateComponent = (idx: number, field: "type_id" | "quantity", val: any) => {
    const updated = [...components];
    updated[idx] = { ...updated[idx], [field]: val };
    setComponents(updated);
  };

  const handleSaveType = async () => {
    if (!name.trim()) return;
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const compositionPayload = isComposite && components.length > 0
      ? { components: components.filter(c => c.type_id && c.quantity > 0) }
      : null;

    const payload = {
      name,
      kind,
      capacity_per_unit: capacity,
      base_price_per_night: basePrice,
      allow_standalone_booking: allowStandaloneBooking,
      composition_json: compositionPayload,
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
        setIsComposite(false);
        setComponents([]);
        fetchTypes();
      }
    } catch (err) {
      console.error("Save type error:", err);
    }
  };

  const handleDeleteType = async () => {
    if (!deletingType) return;
    const targetId = deletingType.id;
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    try {
      const res = await safeFetch(`${getApiBaseUrl()}/admin/bhavan/accommodation-types/${targetId}`, {
        method: "DELETE",
        headers,
      });
      if (res.ok) {
        setTypes(prev => prev.filter(t => t.id !== targetId));
        setDeletingType(null);
        if (viewingType?.id === targetId) setViewingType(null);
        fetchTypes();
      }
    } catch (err) {
      console.error("Delete type error:", err);
    }
  };

  const handleBulkCreateUnits = async () => {
    if (!selectedTypeId) return;
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    try {
      const res = await safeFetch(`${getApiBaseUrl()}/admin/bhavan/units/bulk-create`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          accommodation_type_id: selectedTypeId,
          prefix: bulkPrefix,
          start_number: bulkStart,
          count: bulkCount,
        }),
      });
      if (res.ok) {
        setShowBulkModal(false);
        fetchTypes();
      }
    } catch (err) {
      console.error("Bulk create units error:", err);
    }
  };

  const handleToggleUnitStatus = async (unit: UnitItem) => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const nextStatus = unit.status === "available"
      ? "maintenance"
      : unit.status === "maintenance"
      ? "inactive"
      : "available";

    try {
      const res = await safeFetch(`${getApiBaseUrl()}/admin/bhavan/units/${unit.id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        fetchTypes();
      }
    } catch (err) {
      console.error("Toggle unit status error:", err);
    }
  };

  const handleDeleteUnit = async (unitId: string) => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    try {
      const res = await safeFetch(`${getApiBaseUrl()}/admin/bhavan/units/${unitId}`, {
        method: "DELETE",
        headers,
      });
      if (res.ok) {
        fetchTypes();
      }
    } catch (err) {
      console.error("Delete unit error:", err);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "available":
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-pointer hover:bg-emerald-100"><CheckCircle2 className="w-3 h-3" /> Available</span>;
      case "maintenance":
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 cursor-pointer hover:bg-amber-100"><Wrench className="w-3 h-3" /> Maintenance</span>;
      case "inactive":
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 cursor-pointer hover:bg-rose-100"><XCircle className="w-3 h-3" /> Inactive</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-100 text-zinc-700">{status}</span>;
    }
  };

  return (
    <div className="space-y-6" suppressHydrationWarning>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/admin/bhavan"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 hover:underline mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Bhavan Overview
          </Link>
          <h1 className="text-2xl font-bold text-zinc-900">Accommodation Inventory</h1>
          <p className="text-xs text-zinc-500">Configure rooms, dormitories, composite packages, standalone booking rules, and physical units</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-amber-400"
          >
            <Plus className="w-4 h-4" /> Add Type / Package
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-xs text-zinc-400 bg-white rounded-xl border border-zinc-200">Loading inventory...</div>
      ) : error ? (
        <div className="p-8 text-center bg-white rounded-xl border border-rose-200 space-y-3">
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
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {types.map((t) => (
            <div key={t.id} className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-600 px-2 py-0.5 rounded border border-amber-100">{t.kind}</span>
                    {t.composition_json?.components && (
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-purple-600 px-2 py-0.5 rounded border border-purple-100">Composite Package</span>
                    )}
                    {t.allow_standalone_booking === false ? (
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 px-2 py-0.5 rounded border border-rose-200 flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Unit / Package Only
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200">
                        Standalone Bookable
                      </span>
                    )}
                  </div>

                  {/* Card Actions: View, Edit, Delete */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setViewingType(t)}
                      title="View Details"
                      className="p-1.5 text-zinc-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleOpenEditModal(t)}
                      title="Edit Accommodation Type"
                      className="p-1.5 text-zinc-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeletingType(t)}
                      title="Delete Accommodation Type"
                      className="p-1.5 text-zinc-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <h3 className="text-xl font-bold text-zinc-900">{t.name}</h3>
                <p className="text-xs text-zinc-500 mt-1">Capacity: {t.capacity_per_unit} guests per unit</p>
                <p className="text-lg font-bold text-amber-600 mt-2">₹{t.base_price_per_night} <span className="text-xs font-normal text-zinc-400">base price / night</span></p>

                {t.composition_json?.components && t.composition_json.components.length > 0 && (
                  <div className="mt-3 p-3 rounded-lg border border-purple-100 bg-purple-50/40 text-xs">
                    <p className="font-bold text-purple-900 text-[10px] uppercase mb-1">Composite Components Included:</p>
                    <div className="space-y-1">
                      {t.composition_json.components.map((c, idx) => {
                        const compType = types.find(x => x.id === c.type_id);
                        return (
                          <p key={idx} className="text-purple-700 font-medium">
                            • {c.quantity}x {compType?.name || "Sub-room"}
                          </p>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-zinc-100">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-bold text-zinc-700">Physical Units ({t.units?.length || 0}):</p>
                    <button
                      onClick={() => { setSelectedTypeId(t.id); setShowBulkModal(true); }}
                      className="text-[11px] text-blue-600 font-bold hover:underline inline-flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Add Units
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {t.units && t.units.length > 0 ? (
                      t.units.map((u) => (
                        <div
                          key={u.id}
                          className="flex items-center gap-1 px-2 py-1 rounded bg-zinc-50 border border-zinc-200 font-mono text-[11px]"
                        >
                          <span className="font-semibold text-zinc-800">{u.label}</span>
                          <button
                            onClick={() => handleToggleUnitStatus(u)}
                            title="Click to toggle status (Available -> Maintenance -> Inactive)"
                          >
                            {getStatusBadge(u.status)}
                          </button>
                        </div>
                      ))
                    ) : (
                      <span className="text-xs text-zinc-400 italic">No physical units registered.</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL: View Accommodation Type Details */}
      {viewingType && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-600 px-2 py-0.5 rounded border border-amber-100">{viewingType.kind}</span>
                {viewingType.composition_json?.components && (
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-purple-600 px-2 py-0.5 rounded border border-purple-100">Composite Package</span>
                )}
                {viewingType.allow_standalone_booking === false ? (
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 px-2 py-0.5 rounded border border-rose-200 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Unit / Package Only
                  </span>
                ) : (
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200">
                    Standalone Bookable
                  </span>
                )}
              </div>
              <button onClick={() => setViewingType(null)} className="p-1 text-zinc-400 hover:text-zinc-700 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-zinc-900">{viewingType.name}</h2>
              <div className="grid grid-cols-2 gap-4 mt-3 p-3 bg-zinc-50 rounded-xl border border-zinc-100 text-xs">
                <div>
                  <span className="text-zinc-400 block font-medium">Guest Capacity</span>
                  <span className="font-bold text-zinc-800 text-sm">{viewingType.capacity_per_unit} Persons / Unit</span>
                </div>
                <div>
                  <span className="text-zinc-400 block font-medium">Base Price per Night</span>
                  <span className="font-bold text-amber-600 text-sm">₹{viewingType.base_price_per_night}</span>
                </div>
              </div>
            </div>

            {viewingType.composition_json?.components && viewingType.composition_json.components.length > 0 && (
              <div className="p-4 rounded-xl border border-purple-100 bg-purple-50/50 space-y-2">
                <h4 className="text-xs font-bold text-purple-900 uppercase">Package Includes Sub-Rooms:</h4>
                <div className="space-y-1 text-xs">
                  {viewingType.composition_json.components.map((c, idx) => {
                    const compType = types.find(x => x.id === c.type_id);
                    return (
                      <div key={idx} className="flex justify-between items-center bg-white p-2 rounded border border-purple-100">
                        <span className="font-bold text-purple-900">{compType?.name || "Sub-room"}</span>
                        <span className="font-mono text-purple-600 font-bold">Qty: {c.quantity}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-zinc-800 uppercase">Registered Physical Unit Numbers ({viewingType.units?.length || 0}):</h4>
                <button
                  onClick={() => { setSelectedTypeId(viewingType.id); setShowBulkModal(true); }}
                  className="text-xs text-blue-600 font-bold hover:underline inline-flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Bulk Add Units
                </button>
              </div>

              {viewingType.units && viewingType.units.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                  {viewingType.units.map((u) => (
                    <div key={u.id} className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 border border-zinc-200 text-xs">
                      <span className="font-mono font-bold text-zinc-800">{u.label}</span>
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleToggleUnitStatus(u)} title="Click to change status">
                          {getStatusBadge(u.status)}
                        </button>
                        <button
                          onClick={() => handleDeleteUnit(u.id)}
                          title="Delete Unit"
                          className="text-zinc-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-400 italic p-4 bg-zinc-50 rounded-xl text-center">No physical unit numbers registered yet.</p>
              )}
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-zinc-100">
              <button
                onClick={() => { setViewingType(null); setDeletingType(viewingType); }}
                className="px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 font-bold rounded-lg border border-rose-200 flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete Accommodation
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => { const t = viewingType; setViewingType(null); handleOpenEditModal(t); }}
                  className="px-4 py-2 bg-amber-500 text-white font-bold rounded-lg text-xs hover:bg-amber-400 flex items-center gap-1"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Edit Accommodation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Add / Edit Type / Package */}
      {showTypeModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-zinc-900">
              {editingType ? "Edit Accommodation Type / Package" : "Add Accommodation Type / Composite Package"}
            </h3>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Name *</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Hall, Kitchen, AC Room or Package A" className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Kind</label>
              <select value={kind} onChange={(e) => setKind(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm">
                <option value="room">Room</option>
                <option value="dormitory">Dormitory</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Capacity</label>
                <input type="number" value={capacity} onChange={(e) => setCapacity(parseInt(e.target.value) || 1)} className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Base Price / Night</label>
                <input type="number" value={basePrice} onChange={(e) => setBasePrice(parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
            </div>

            {/* Standalone Booking Toggle */}
            <div className="pt-2 border-t border-zinc-100">
              <label className="flex items-start gap-2.5 cursor-pointer bg-zinc-50 p-3 rounded-xl border border-zinc-200">
                <input
                  type="checkbox"
                  checked={allowStandaloneBooking}
                  onChange={(e) => setAllowStandaloneBooking(e.target.checked)}
                  className="w-4 h-4 text-amber-600 rounded mt-0.5"
                />
                <div>
                  <span className="text-xs font-bold text-zinc-900 block">Allow Standalone Booking (Bookable separately on public form)</span>
                  <span className="text-[11px] text-zinc-500 leading-tight block mt-0.5">
                    Uncheck for items (like Hall or Kitchen) that should NOT be booked separately by users and can only be booked inside a package/unit.
                  </span>
                </div>
              </label>
            </div>

            {/* Composite Package Checkbox */}
            <div className="pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isComposite}
                  onChange={(e) => setIsComposite(e.target.checked)}
                  className="w-4 h-4 text-amber-600 rounded"
                />
                <span className="text-xs font-bold text-zinc-800">This is a Composite Package (Contains multiple sub-rooms)</span>
              </label>

              {isComposite && (
                <div className="mt-3 space-y-2 bg-purple-50/50 p-3 rounded-xl border border-purple-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-900">Included Room Components</span>
                    <button onClick={handleAddComponentRow} className="text-xs text-purple-600 font-bold hover:underline inline-flex items-center gap-1">
                      <Plus className="w-3 h-3" /> Add Component
                    </button>
                  </div>

                  {components.map((comp, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <select
                        value={comp.type_id}
                        onChange={(e) => handleUpdateComponent(idx, "type_id", e.target.value)}
                        className="flex-1 px-2 py-1 border rounded text-xs bg-white"
                      >
                        {types.map((t) => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="1"
                        value={comp.quantity}
                        onChange={(e) => handleUpdateComponent(idx, "quantity", parseInt(e.target.value) || 1)}
                        className="w-16 px-2 py-1 border rounded text-xs bg-white"
                      />
                      <button onClick={() => handleRemoveComponentRow(idx)} className="text-rose-500 hover:bg-rose-50 p-1 rounded">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => { setShowTypeModal(false); setEditingType(null); }} className="px-4 py-2 border rounded-lg text-xs font-semibold">Cancel</button>
              <button onClick={handleSaveType} className="px-4 py-2 bg-amber-500 text-white font-bold rounded-lg text-xs hover:bg-amber-400">Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Delete Confirmation */}
      {deletingType && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-zinc-900">Deactivate Accommodation?</h3>
              <p className="text-xs text-zinc-500 mt-1">Are you sure you want to deactivate <span className="font-bold text-zinc-800">"{deletingType.name}"</span>? It will no longer appear in new enquiries.</p>
            </div>
            <div className="flex justify-center gap-3 pt-2">
              <button onClick={() => setDeletingType(null)} className="px-4 py-2 border rounded-lg text-xs font-semibold">Cancel</button>
              <button onClick={handleDeleteType} className="px-4 py-2 bg-rose-600 text-white font-bold rounded-lg text-xs hover:bg-rose-500">Deactivate</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Bulk Add Units */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-bold text-zinc-900">Bulk Create Physical Units</h3>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Label Prefix</label>
              <input type="text" value={bulkPrefix} onChange={(e) => setBulkPrefix(e.target.value)} placeholder="e.g. Room " className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Start Number</label>
                <input type="number" value={bulkStart} onChange={(e) => setBulkStart(parseInt(e.target.value) || 1)} className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Count</label>
                <input type="number" value={bulkCount} onChange={(e) => setBulkCount(parseInt(e.target.value) || 1)} className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
            </div>
            <p className="text-xs text-zinc-500">Will generate units: {bulkPrefix}{bulkStart} to {bulkPrefix}{bulkStart + bulkCount - 1}</p>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowBulkModal(false)} className="px-4 py-2 border rounded-lg text-xs font-semibold">Cancel</button>
              <button onClick={handleBulkCreateUnits} className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg text-xs hover:bg-blue-500">Generate Units</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
