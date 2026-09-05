"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Search, Filter, Plus, CheckCircle, XCircle, Clock, FileText, Phone, X, ArrowLeft } from "lucide-react";
import { getApiBaseUrl, safeFetch } from "@/utils/api";

interface Enquiry {
  id: string;
  reference: string;
  check_in: string;
  check_out: string;
  nights: number;
  full_name: string;
  mobile: string;
  email?: string;
  city?: string;
  status: string;
  source: string;
  estimated_total: number;
  created_at: string;
}

interface AccommodationType {
  id: string;
  name: string;
  base_price_per_night: number;
}

export default function AdminEnquiriesPage() {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Selected enquiry for detail view
  const [selectedEnquiry, setSelectedEnquiry] = useState<any | null>(null);
  const [noteText, setNoteText] = useState<string>("");

  // Manual enquiry modal state
  const [showManualModal, setShowManualModal] = useState<boolean>(false);
  const [manualName, setManualName] = useState("");
  const [manualMobile, setManualMobile] = useState("");
  const [manualCheckIn, setManualCheckIn] = useState("");
  const [manualCheckOut, setManualCheckOut] = useState("");
  const [manualSource, setManualSource] = useState("phone");
  const [manualTypeId, setManualTypeId] = useState("");
  const [manualQty, setManualQty] = useState(1);
  const [accTypes, setAccTypes] = useState<AccommodationType[]>([]);

  useEffect(() => {
    fetchEnquiries();
    fetchAccTypes();
  }, [statusFilter]);

  const fetchAccTypes = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${getApiBaseUrl()}/admin/bhavan/accommodation-types`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAccTypes(data);
        if (data.length > 0) setManualTypeId(data[0].id);
      }
    } catch (err) {
      console.error("Fetch types error:", err);
    }
  };

  const [error, setError] = useState<string | null>(null);

  const fetchEnquiries = async () => {
    setLoading(true);
    setError(null);
    const token = localStorage.getItem("token");
    try {
      let url = `${getApiBaseUrl()}/admin/bhavan/enquiries?`;
      if (statusFilter) url += `status_filter=${statusFilter}&`;
      if (search) url += `search=${encodeURIComponent(search)}&`;

      const res = await safeFetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setEnquiries(data);
      } else {
        setError("Failed to load enquiries from server.");
      }
    } catch (err) {
      console.error("Fetch enquiries error:", err);
      setError("Network or browser extension error connecting to server.");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    const token = localStorage.getItem("token");
    try {
      const res = await safeFetch(`${getApiBaseUrl()}/admin/bhavan/enquiries/${id}/status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchEnquiries();
        if (selectedEnquiry && selectedEnquiry.id === id) {
          const updated = await res.json();
          setSelectedEnquiry(updated);
        }
      }
    } catch (err) {
      console.error("Status change error:", err);
    }
  };

  const handleAddNote = async (id: string) => {
    if (!noteText.trim()) return;
    const token = localStorage.getItem("token");
    try {
      const res = await safeFetch(`${getApiBaseUrl()}/admin/bhavan/enquiries/${id}/notes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ note: noteText }),
      });
      if (res.ok) {
        setNoteText("");
        const detailRes = await fetch(`${getApiBaseUrl()}/admin/bhavan/enquiries/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (detailRes.ok) {
          setSelectedEnquiry(await detailRes.json());
        }
      }
    } catch (err) {
      console.error("Note add error:", err);
    }
  };

  const handleCreateManualEnquiry = async () => {
    if (!manualName || !manualMobile || !manualCheckIn || !manualCheckOut || !manualTypeId) {
      alert("Please fill in all required fields.");
      return;
    }
    const token = localStorage.getItem("token");
    try {
      const res = await safeFetch(`${getApiBaseUrl()}/admin/bhavan/enquiries/manual`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          full_name: manualName,
          mobile: manualMobile,
          check_in: manualCheckIn,
          check_out: manualCheckOut,
          source: manualSource,
          accommodations: [{ type_id: manualTypeId, quantity: manualQty }],
        }),
      });

      if (res.ok) {
        setShowManualModal(false);
        setManualName("");
        setManualMobile("");
        fetchEnquiries();
      }
    } catch (err) {
      console.error("Manual enquiry error:", err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Enquiry Management</h1>
          <p className="text-xs text-zinc-500">Search, filter, review, and approve Bhavan booking requests</p>
        </div>
        <button
          onClick={() => setShowManualModal(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-amber-400"
        >
          <Plus className="w-4 h-4" /> Create Manual Entry
        </button>
      </div>

      {/* Filters & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-3 text-zinc-400" />
          <input
            type="text"
            placeholder="Search reference, name, or mobile..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchEnquiries()}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-zinc-200 focus:outline-none focus:border-amber-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full sm:w-48 text-sm rounded-lg border border-zinc-200 py-2 px-3 focus:outline-none focus:border-amber-500"
        >
          <option value="">All Statuses</option>
          <option value="pending">PENDING</option>
          <option value="under_review">UNDER REVIEW</option>
          <option value="approved">APPROVED</option>
          <option value="rejected">REJECTED</option>
          <option value="cancelled">CANCELLED</option>
        </select>
      </div>

      {/* Main Grid: List + Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Enquiry List */}
        <div className="lg:col-span-2 space-y-3">
          {loading ? (
            <div className="p-8 text-center text-xs text-zinc-400 bg-white rounded-xl border border-zinc-200">Loading enquiries...</div>
          ) : enquiries.length === 0 ? (
            <div className="p-8 text-center text-xs text-zinc-400 bg-white rounded-xl border border-zinc-200">No enquiries match your filter.</div>
          ) : (
            enquiries.map((enq) => (
              <div
                key={enq.id}
                onClick={() => setSelectedEnquiry(enq)}
                className={`p-4 rounded-xl border bg-white cursor-pointer transition-all hover:shadow-md ${
                  selectedEnquiry?.id === enq.id ? "border-amber-500 ring-2 ring-amber-500/20" : "border-zinc-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-bold text-amber-600">{enq.reference}</span>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                      enq.status === "approved" ? "bg-emerald-50 text-emerald-600" :
                      enq.status === "rejected" ? "bg-rose-50 text-rose-600" :
                      enq.status === "pending" ? "bg-amber-50 text-amber-600" : "bg-zinc-100 text-zinc-600"
                    }`}>
                      {enq.status}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-zinc-900">₹{enq.estimated_total}</span>
                </div>

                <div className="mt-2 flex items-center justify-between text-xs text-zinc-600">
                  <span className="font-medium text-zinc-900">{enq.full_name} ({enq.mobile})</span>
                  <span>{enq.check_in} → {enq.check_out} ({enq.nights} nights)</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Selected Enquiry Detail Panel */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-5 h-fit shadow-sm">
          {selectedEnquiry ? (
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                <div>
                  <p className="font-mono text-base font-extrabold text-amber-600">{selectedEnquiry.reference}</p>
                  <p className="text-[10px] text-zinc-400">Source: {selectedEnquiry.source}</p>
                </div>
                <span className="text-xs font-bold text-emerald-600 uppercase bg-emerald-50 px-2 py-1 rounded">
                  {selectedEnquiry.status}
                </span>
              </div>

              <div>
                <p className="text-zinc-400 font-semibold uppercase text-[10px]">Customer Details</p>
                <p className="font-bold text-zinc-900 text-sm mt-0.5">{selectedEnquiry.full_name}</p>
                <p className="text-zinc-600">{selectedEnquiry.mobile} {selectedEnquiry.email ? `· ${selectedEnquiry.email}` : ""}</p>
                {selectedEnquiry.city && <p className="text-zinc-500">{selectedEnquiry.city}, {selectedEnquiry.state}</p>}
              </div>

              <div className="border-t border-zinc-100 pt-3">
                <p className="text-zinc-400 font-semibold uppercase text-[10px]">Stay Period & Amount</p>
                <p className="font-medium text-zinc-900 mt-0.5">{selectedEnquiry.check_in} to {selectedEnquiry.check_out} ({selectedEnquiry.nights} nights)</p>
                <p className="text-base font-extrabold text-amber-600 mt-1">Estimated Total: ₹{selectedEnquiry.estimated_total}</p>
              </div>

              {/* Status Action Buttons */}
              <div className="border-t border-zinc-100 pt-3 space-y-2">
                <p className="text-zinc-400 font-semibold uppercase text-[10px]">Change Status</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleStatusChange(selectedEnquiry.id, "approved")}
                    className="py-2 bg-emerald-500 text-white font-bold rounded-lg hover:bg-emerald-400 text-xs"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleStatusChange(selectedEnquiry.id, "rejected")}
                    className="py-2 bg-rose-500 text-white font-bold rounded-lg hover:bg-rose-400 text-xs"
                  >
                    Reject
                  </button>
                </div>
              </div>

              {/* Internal Notes Section */}
              <div className="border-t border-zinc-100 pt-3 space-y-2">
                <p className="text-zinc-400 font-semibold uppercase text-[10px]">Internal Admin Notes</p>
                {selectedEnquiry.notes && selectedEnquiry.notes.map((n: any) => (
                  <div key={n.id} className="p-2 rounded bg-zinc-50 text-zinc-700 text-[11px]">
                    <p>{n.note}</p>
                    <p className="text-[9px] text-zinc-400 mt-1">{new Date(n.created_at).toLocaleString()}</p>
                  </div>
                ))}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add internal note..."
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    className="flex-1 px-3 py-1.5 border border-zinc-200 rounded text-xs focus:outline-none"
                  />
                  <button
                    onClick={() => handleAddNote(selectedEnquiry.id)}
                    className="px-3 py-1.5 bg-zinc-900 text-white font-bold rounded text-xs"
                  >
                    Add
                  </button>
                </div>
              </div>

            </div>
          ) : (
            <div className="py-12 text-center text-xs text-zinc-400">Select an enquiry from the list to view full details and manage status.</div>
          )}
        </div>

      </div>

      {/* Bottom Navigation & Actions Bar */}
      <div className="pt-4 border-t border-zinc-200 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm">
        <Link
          href="/admin/bhavan"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-300 bg-white hover:bg-zinc-50 text-xs font-bold text-zinc-700 shadow-sm transition-all"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Bhavan Overview
        </Link>

        <button
          onClick={() => setShowManualModal(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-amber-400 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add Manual Booking
        </button>
      </div>

      {/* Modal: Manual Entry (Walk-in / Phone / Admin) */}
      {showManualModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="text-lg font-bold text-zinc-900">Create Manual Booking Entry</h3>
              <button onClick={() => setShowManualModal(false)} className="text-zinc-400 hover:text-zinc-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Booking Source</label>
              <select value={manualSource} onChange={(e) => setManualSource(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm">
                <option value="phone">Phone Contact</option>
                <option value="walk_in">Walk-in Customer</option>
                <option value="admin">Admin Entry</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Customer Full Name *</label>
              <input type="text" value={manualName} onChange={(e) => setManualName(e.target.value)} placeholder="Full Name" className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Mobile Number *</label>
              <input type="tel" value={manualMobile} onChange={(e) => setManualMobile(e.target.value)} placeholder="10-digit mobile" className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Check-in Date *</label>
                <input type="date" value={manualCheckIn} onChange={(e) => setManualCheckIn(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Check-out Date *</label>
                <input type="date" value={manualCheckOut} onChange={(e) => setManualCheckOut(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Accommodation</label>
                <select value={manualTypeId} onChange={(e) => setManualTypeId(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm">
                  {accTypes.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Qty</label>
                <input type="number" min="1" value={manualQty} onChange={(e) => setManualQty(parseInt(e.target.value) || 1)} className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowManualModal(false)} className="px-4 py-2 border rounded-lg text-xs">Cancel</button>
              <button onClick={handleCreateManualEnquiry} className="px-4 py-2 bg-amber-500 text-white font-bold rounded-lg text-xs">Create & Approve Entry</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
