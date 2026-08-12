"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Heart, Plus, ArrowLeft, Lock } from "lucide-react";
import { getApiBaseUrl, safeFetch } from "@/utils/api";

interface Amenity {
  id: string;
  name: string;
  price: number;
  pricing_type: string;
  available_quantity: number | null;
  allow_over_request: boolean;
  allow_standalone_booking?: boolean;
}

export default function AdminAmenitiesPage() {
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [name, setName] = useState("");
  const [price, setPrice] = useState(100);
  const [pricingType, setPricingType] = useState("per_unit");
  const [stock, setStock] = useState<number | "">("");
  const [allowStandaloneBooking, setAllowStandaloneBooking] = useState(true);

  useEffect(() => {
    fetchAmenities();
  }, []);

  const fetchAmenities = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await safeFetch(`${getApiBaseUrl()}/admin/bhavan/amenities`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setAmenities(await res.json());
      }
    } catch (err) {
      console.error("Fetch amenities error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAmenity = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await safeFetch(`${getApiBaseUrl()}/admin/bhavan/amenities`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          price,
          pricing_type: pricingType,
          available_quantity: stock === "" ? null : stock,
          allow_standalone_booking: allowStandaloneBooking,
        }),
      });
      if (res.ok) {
        setShowModal(false);
        setName("");
        setAllowStandaloneBooking(true);
        fetchAmenities();
      }
    } catch (err) {
      console.error("Create amenity error:", err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/admin/bhavan"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 hover:underline mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Bhavan Overview
          </Link>
          <h1 className="text-2xl font-bold text-zinc-900">Amenities & Additional Facilities</h1>
          <p className="text-xs text-zinc-500">Configure chairs, coolers, mattresses, pricing formulas, stock levels, and standalone booking rules</p>
        </div>
        <button
          onClick={() => { setName(""); setAllowStandaloneBooking(true); setShowModal(true); }}
          className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-amber-400"
        >
          <Plus className="w-4 h-4" /> Add Amenity
        </button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-xs text-zinc-400 bg-white rounded-xl border border-zinc-200">Loading amenities...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {amenities.map((a) => (
            <div key={a.id} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded border border-emerald-100">
                    {a.pricing_type.replace("_", " ")}
                  </span>
                  {a.allow_standalone_booking === false && (
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 px-2 py-0.5 rounded border border-rose-200 flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Unit Only
                    </span>
                  )}
                </div>
                <span className="text-xs text-zinc-400 font-mono">
                  Stock: {a.available_quantity === null ? "Unlimited" : a.available_quantity}
                </span>
              </div>
              <h3 className="font-bold text-zinc-900 text-lg">{a.name}</h3>
              <p className="text-xl font-extrabold text-amber-600">₹{a.price}</p>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-bold text-zinc-900">Add Amenity</h3>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Desert Cooler or Hall Sound System" className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Price</label>
                <input type="number" value={price} onChange={(e) => setPrice(parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Pricing Type</label>
                <select value={pricingType} onChange={(e) => setPricingType(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm">
                  <option value="per_unit">Per Unit</option>
                  <option value="per_day">Per Day</option>
                  <option value="per_night">Per Night</option>
                  <option value="per_booking">Per Booking</option>
                  <option value="one_time">One Time</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Available Stock (blank = unlimited)</label>
              <input type="number" value={stock} onChange={(e) => setStock(e.target.value === "" ? "" : parseInt(e.target.value))} placeholder="Unlimited" className="w-full px-3 py-2 border rounded-lg text-sm" />
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
                  <span className="text-xs font-bold text-zinc-900 block">Allow Standalone Booking</span>
                  <span className="text-[11px] text-zinc-500 leading-tight block mt-0.5">
                    Uncheck for amenities that CANNOT be booked separately on the public form and can only be bundled with a unit package.
                  </span>
                </div>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg text-xs font-semibold">Cancel</button>
              <button onClick={handleCreateAmenity} className="px-4 py-2 bg-amber-500 text-white font-bold rounded-lg text-xs hover:bg-amber-400">Save Amenity</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
