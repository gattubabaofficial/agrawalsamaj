"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import {
  Heart, Plus, ArrowLeft, Trash2, Edit3, Eye, X, Search,
  AlertCircle, RefreshCw, Layers, DollarSign, Loader2, CheckCircle2
} from "lucide-react";
import { getApiBaseUrl, safeFetch } from "@/utils/api";

interface Amenity {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  pricing_type: string;
  available_quantity: number | null;
  allow_over_request: boolean;
  is_active?: boolean;
  is_compulsory?: boolean;
}

export default function AdminAmenitiesPage() {
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // View Modal state
  const [viewingAmenity, setViewingAmenity] = useState<Amenity | null>(null);

  // Edit / Add Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingAmenity, setEditingAmenity] = useState<Amenity | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState<number | string>(100);
  const [pricingType, setPricingType] = useState("per_unit");
  const [stock, setStock] = useState<number | string>("");
  const [isCompulsory, setIsCompulsory] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Delete Modal state
  const [deletingAmenity, setDeletingAmenity] = useState<Amenity | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchAmenities();
  }, []);

  const fetchAmenities = async () => {
    setLoading(true);
    setError(null);
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    try {
      const res = await safeFetch(`${getApiBaseUrl()}/admin/bhavan/amenities`, {
        headers,
      });
      if (res.ok) {
        setAmenities(await res.json());
      } else {
        setError("Failed to load amenities from server.");
      }
    } catch (err: any) {
      console.error("Fetch amenities error:", err);
      setError("Network or connection error connecting to server.");
    } finally {
      setLoading(false);
    }
  };

  // Alphabetical sort & filter
  const sortedAndFilteredAmenities = useMemo(() => {
    return [...amenities]
      .filter((a) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          a.name.toLowerCase().includes(q) ||
          (a.description && a.description.toLowerCase().includes(q)) ||
          a.pricing_type.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  }, [amenities, searchQuery]);

  const handleOpenAddModal = () => {
    setEditingAmenity(null);
    setName("");
    setDescription("");
    setPrice(100);
    setPricingType("per_unit");
    setStock("");
    setIsCompulsory(false);
    setSaveError(null);
    setIsSaving(false);
    setShowModal(true);
  };

  const handleOpenEditModal = (a: Amenity) => {
    setViewingAmenity(null);
    setEditingAmenity(a);
    setName(a.name);
    setDescription(a.description || "");
    setPrice(a.price);
    setPricingType(a.pricing_type || "per_unit");
    setStock(a.available_quantity === null || a.available_quantity === undefined ? "" : a.available_quantity);
    setIsCompulsory(a.is_compulsory === true);
    setSaveError(null);
    setIsSaving(false);
    setShowModal(true);
  };

  const handleSaveAmenity = async () => {
    if (!name.trim()) {
      setSaveError("Amenity Name is required.");
      return;
    }

    const parsedPrice = typeof price === "string" ? parseFloat(price) : price;
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      setSaveError("Please enter a valid price/rate (₹).");
      return;
    }

    let parsedStock: number | null = null;
    if (stock !== "" && stock !== null && stock !== undefined) {
      const num = typeof stock === "string" ? parseInt(stock) : stock;
      if (isNaN(num) || num < 0) {
        setSaveError("Please enter a valid stock quantity or leave blank for unlimited.");
        return;
      }
      parsedStock = num;
    }

    setIsSaving(true);
    setSaveError(null);

    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      price: parsedPrice,
      pricing_type: pricingType,
      available_quantity: parsedStock,
      allow_over_request: false,
      is_active: true,
      allow_standalone_booking: true,
      is_compulsory: isCompulsory,
    };

    try {
      const url = editingAmenity
        ? `${getApiBaseUrl()}/admin/bhavan/amenities/${editingAmenity.id}`
        : `${getApiBaseUrl()}/admin/bhavan/amenities`;
      const method = editingAmenity ? "PUT" : "POST";

      const res = await safeFetch(url, {
        method,
        headers,
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setShowModal(false);
        setEditingAmenity(null);
        setName("");
        setDescription("");
        setSaveError(null);
        await fetchAmenities();
      } else {
        const errData = await res.json().catch(() => ({}));
        setSaveError(errData.detail || "Failed to save amenity.");
      }
    } catch (err: any) {
      console.error("Save amenity error:", err);
      setSaveError("Network error occurred while saving.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAmenity = async () => {
    if (!deletingAmenity) return;
    const targetId = deletingAmenity.id;
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    setIsDeleting(true);
    try {
      const res = await safeFetch(`${getApiBaseUrl()}/admin/bhavan/amenities/${targetId}`, {
        method: "DELETE",
        headers,
      });
      if (res.ok) {
        setAmenities((prev) => prev.filter((a) => a.id !== targetId));
        setDeletingAmenity(null);
        fetchAmenities();
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.detail || "Failed to delete amenity.");
      }
    } catch (err) {
      console.error("Delete amenity error:", err);
      alert("Network error occurred while deleting.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6" suppressHydrationWarning>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/admin/bhavan"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 hover:underline mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Bhavan Overview
          </Link>
          <h1 className="text-2xl font-bold text-zinc-900">Amenities & Additional Facilities</h1>
          <p className="text-xs text-zinc-500">Manage chairs, coolers, mattresses, sound systems, and compulsory charges in alphabetical order</p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-amber-400 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add Amenity
        </button>
      </div>

      {/* Search Filter & Count */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-zinc-200 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search amenity by name or type..."
            className="w-full pl-9 pr-3 py-2 border border-zinc-200 rounded-xl text-xs focus:outline-none focus:border-amber-500 bg-zinc-50/50"
          />
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500 self-end sm:self-auto">
          <span>Total Records: <strong className="text-zinc-900">{sortedAndFilteredAmenities.length}</strong></span>
          <span>•</span>
          <span>Compulsory: <strong className="text-amber-700">{sortedAndFilteredAmenities.filter(a => a.is_compulsory).length}</strong></span>
        </div>
      </div>

      {/* Loading / Error States */}
      {loading ? (
        <div className="p-12 text-center text-xs text-zinc-400 bg-white rounded-2xl border border-zinc-200 shadow-sm">
          Loading amenities...
        </div>
      ) : error ? (
        <div className="p-8 text-center bg-white rounded-2xl border border-rose-200 space-y-3 shadow-sm">
          <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
          <p className="text-xs font-bold text-zinc-800">{error}</p>
          <button
            onClick={fetchAmenities}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 text-white text-xs font-bold rounded-lg hover:bg-amber-400"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry Fetching
          </button>
        </div>
      ) : sortedAndFilteredAmenities.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-zinc-200 shadow-sm space-y-3">
          <Heart className="w-10 h-10 text-zinc-300 mx-auto" />
          <p className="text-sm font-bold text-zinc-700">No amenities found</p>
          <p className="text-xs text-zinc-400">
            {searchQuery ? "Try searching with a different keyword" : "Click 'Add Amenity' above to register your first amenity"}
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
                  <th className="py-3.5 px-4">Amenity Name & Description</th>
                  <th className="py-3.5 px-4">Requirement</th>
                  <th className="py-3.5 px-4">Rate (₹)</th>
                  <th className="py-3.5 px-4">Pricing Type</th>
                  <th className="py-3.5 px-4">Available Stock</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-xs">
                {sortedAndFilteredAmenities.map((a, index) => (
                  <tr
                    key={a.id}
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
                          {a.name}
                        </span>
                        {a.description ? (
                          <p className="text-xs text-zinc-500 line-clamp-1 max-w-md">
                            {a.description}
                          </p>
                        ) : (
                          <p className="text-xs text-zinc-300 italic">No description provided</p>
                        )}
                      </div>
                    </td>

                    {/* Requirement (Compulsory vs Optional) */}
                    <td className="py-4 px-4">
                      {a.is_compulsory ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 uppercase tracking-wider">
                          ★ Compulsory
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-100 text-zinc-500 border border-zinc-200">
                          Optional
                        </span>
                      )}
                    </td>

                    {/* Rate */}
                    <td className="py-4 px-4">
                      <span className="font-extrabold text-amber-600 text-sm">
                        ₹{a.price}
                      </span>
                    </td>

                    {/* Pricing Type */}
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wider">
                        {a.pricing_type.replace(/_/g, " ")}
                      </span>
                    </td>

                    {/* Stock */}
                    <td className="py-4 px-4">
                      <span className="font-mono text-zinc-700 font-semibold">
                        {a.available_quantity === null || a.available_quantity === undefined
                          ? "Unlimited"
                          : `${a.available_quantity} units`}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => setViewingAmenity(a)}
                          title="View Details"
                          className="p-1.5 text-zinc-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(a)}
                          title="Edit Amenity"
                          className="p-1.5 text-zinc-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingAmenity(a)}
                          title="Delete Amenity"
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

      {/* MODAL: View Details */}
      {viewingAmenity && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg border border-emerald-200">
                  {viewingAmenity.pricing_type.replace(/_/g, " ")}
                </span>
                {viewingAmenity.is_compulsory && (
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 px-2.5 py-1 rounded-lg border border-amber-300">
                    ★ Compulsory on Bill
                  </span>
                )}
              </div>
              <button
                onClick={() => setViewingAmenity(null)}
                className="text-zinc-400 hover:text-zinc-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-zinc-900">{viewingAmenity.name}</h2>
              {viewingAmenity.description ? (
                <div className="mt-2.5 p-3.5 bg-zinc-50 rounded-xl border border-zinc-100">
                  <span className="text-[10px] font-bold text-zinc-400 block uppercase tracking-wider mb-1">Description</span>
                  <p className="text-xs text-zinc-700 leading-relaxed whitespace-pre-wrap">{viewingAmenity.description}</p>
                </div>
              ) : (
                <p className="text-xs text-zinc-400 mt-1 italic">No description provided</p>
              )}

              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-100">
                  <span className="text-[10px] font-bold text-zinc-500 block uppercase">Rate / Price</span>
                  <span className="text-base font-extrabold text-amber-600">₹{viewingAmenity.price}</span>
                </div>
                <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                  <span className="text-[10px] font-bold text-zinc-500 block uppercase">Available Stock</span>
                  <span className="text-base font-extrabold text-zinc-800">
                    {viewingAmenity.available_quantity === null || viewingAmenity.available_quantity === undefined
                      ? "Unlimited"
                      : `${viewingAmenity.available_quantity} Units`}
                  </span>
                </div>
              </div>

              {viewingAmenity.is_compulsory && (
                <div className="mt-3 p-3 bg-amber-50/50 rounded-xl border border-amber-200 text-xs text-amber-800">
                  <strong>Compulsory:</strong> This amenity will be added automatically to every enquiry and calculated into the customer's final booking bill.
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
              <button
                onClick={() => setViewingAmenity(null)}
                className="px-4 py-2 border border-zinc-200 rounded-lg text-xs font-semibold hover:bg-zinc-50 cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => handleOpenEditModal(viewingAmenity)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 text-white font-bold rounded-lg text-xs hover:bg-amber-400 transition-colors shadow-sm cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" /> Edit Amenity
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Add / Edit Amenity */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="text-lg font-bold text-zinc-900">
                {editingAmenity ? "Edit Amenity" : "Add Amenity"}
              </h3>
              <button
                onClick={() => { setShowModal(false); setEditingAmenity(null); }}
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
              <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Amenity Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Cleaning Charge, Sound System, Cooler"
                className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Description</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter details, equipment specs, or usage instructions..."
                className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm resize-none focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col justify-end">
                <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1.5 truncate">
                  Rate / Price (₹) *
                </label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="e.g. 100"
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm font-bold text-amber-600 focus:outline-none focus:border-amber-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
              <div className="flex flex-col justify-end">
                <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1.5 truncate">
                  Pricing Type *
                </label>
                <select
                  value={pricingType}
                  onChange={(e) => setPricingType(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-amber-500 bg-white"
                >
                  <option value="per_unit">Per Unit</option>
                  <option value="per_day">Per Day</option>
                  <option value="per_night">Per Night</option>
                  <option value="per_booking">Per Booking</option>
                  <option value="one_time">One Time</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1.5">
                Available Stock / Quantity (leave blank for unlimited)
              </label>
              <input
                type="number"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                placeholder="Unlimited"
                className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-amber-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>

            {/* Compulsory Option Checkbox */}
            <div className="pt-1">
              <label className="flex items-start gap-3 p-3 rounded-xl border border-amber-200 bg-amber-50/40 hover:bg-amber-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={isCompulsory}
                  onChange={(e) => setIsCompulsory(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded text-amber-600 focus:ring-amber-500 border-zinc-300 cursor-pointer"
                />
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-zinc-900 block">Compulsory Amenity</span>
                  <span className="text-[11px] text-zinc-500 block leading-normal">
                    Automatically added to all booking enquiries and calculated into the customer's final bill.
                  </span>
                </div>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => { setShowModal(false); setEditingAmenity(null); }}
                className="px-4 py-2 border border-zinc-200 rounded-lg text-xs font-semibold hover:bg-zinc-50 cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={handleSaveAmenity}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 text-white font-bold rounded-lg text-xs hover:bg-amber-400 transition-colors shadow-sm cursor-pointer disabled:opacity-60"
              >
                {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {isSaving ? "Saving..." : "Save Amenity"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Delete Confirmation */}
      {deletingAmenity && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-4 text-center shadow-xl">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-zinc-900">Delete Amenity?</h3>
              <p className="text-xs text-zinc-500 mt-1">
                Are you sure you want to delete <strong className="text-zinc-800">"{deletingAmenity.name}"</strong>?
              </p>
            </div>
            <div className="flex justify-center gap-3 pt-2">
              <button
                disabled={isDeleting}
                onClick={() => setDeletingAmenity(null)}
                className="px-4 py-2 border border-zinc-200 rounded-lg text-xs font-semibold hover:bg-zinc-50 cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                disabled={isDeleting}
                onClick={handleDeleteAmenity}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 text-white font-bold rounded-lg text-xs hover:bg-rose-500 transition-colors shadow-sm cursor-pointer disabled:opacity-60"
              >
                {isDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
