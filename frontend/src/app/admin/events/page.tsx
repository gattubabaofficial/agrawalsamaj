"use client";

import { useState, useEffect } from "react";
import { CalendarPlus, MapPin, Users, Trash2, Clock, Plus, X, AlertTriangle, ShieldAlert, List, ArrowLeft, Ticket, CheckCircle, Send, Search, Filter, Ban, RefreshCw, Upload, Image as ImageIcon } from "lucide-react";
import axios from "axios";
import { getApiBaseUrl } from "@/utils/api";
import { mediaUrl } from "@/utils/media";
import { formatDateDDMonthYYYY } from "@/utils/date";
import { EditButton } from "@/components/ui/EditButton";

interface TimelineItem {
  time: string;
  title: string;
}

interface EventData {
  event_id?: string;
  title: string;
  description: string;
  banner_url: string;
  venue: string;
  category: string;
  start_datetime: string;
  end_datetime: string;
  pass_price: number;
  total_passes: number | "";
  visibility: string;
  pricing_type: string;
  timeline: TimelineItem[];
}

const formatDateTime12Hour = (dateTimeStr: string) => {
  if (!dateTimeStr) return "";
  const dateFormatted = formatDateDDMonthYYYY(dateTimeStr);
  const d = new Date(dateTimeStr);
  if (isNaN(d.getTime())) return dateFormatted;
  const timeFormatted = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  return `${dateFormatted} (${timeFormatted})`;
};

export default function AdminEventsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [activeView, setActiveView] = useState<"events" | "form" | "registrations" | "event_bookings">("events");
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [eventBookings, setEventBookings] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Filters & Search for Registrations/Passes (Tasks #10, #26)
  const [regSearchQuery, setRegSearchQuery] = useState("");
  const [selectedEventFilter, setSelectedEventFilter] = useState("all");
  const [passStatusFilter, setPassStatusFilter] = useState<"all" | "active" | "cancelled">("all");

  // Pass Cancellation Modal State (Tasks #25, #26)
  const [cancelModalPass, setCancelModalPass] = useState<any | null>(null);
  const [cancelReason, setCancelReason] = useState("Cancelled by Admin");
  const [refundAmount, setRefundAmount] = useState<number>(0);
  const [refundStatus, setRefundStatus] = useState<string>("not_applicable");
  const [cancellingPass, setCancellingPass] = useState(false);

  const [formData, setFormData] = useState<EventData>({
    title: "",
    description: "",
    banner_url: "",
    venue: "",
    category: "other",
    start_datetime: "",
    end_datetime: "",
    pass_price: 0,
    total_passes: "",
    visibility: "open_to_all",
    pricing_type: "free",
    timeline: []
  });

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${getApiBaseUrl()}/events`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (Array.isArray(res.data)) {
        const sorted = [...res.data].sort((a, b) => {
          const timeA = new Date(a.start_datetime || a.created_at || 0).getTime();
          const timeB = new Date(b.start_datetime || b.created_at || 0).getTime();
          return timeB - timeA;
        });
        setEvents(sorted);
      } else {
        setEvents(res.data);
      }
    } catch (error) {
      console.error("Failed to fetch events", error);
    }
  };

  const handleOpenCreate = () => {
    setFormData({
      title: "", description: "", banner_url: "", venue: "", category: "other",
      start_datetime: "", end_datetime: "", pass_price: 0, total_passes: "",
      visibility: "open_to_all", pricing_type: "free", timeline: []
    });
    setEditingId(null);
    setActiveView("form");
  };

  const handleOpenRegistrations = () => {
    fetchRegistrations();
    setActiveView("registrations");
  };

  const handleAuthError = (error: any) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("userRole");
      alert("Session expired. Please log in again.");
      window.location.href = "/admin-login";
    }
  };

  const fetchRegistrations = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${getApiBaseUrl()}/events/registrations/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRegistrations(res.data);
    } catch (error: any) {
      console.error("Failed to fetch registrations", error);
      handleAuthError(error);
    }
  };

  const handleOpenEventBookings = async (eventId: string) => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${getApiBaseUrl()}/events/admin/events/${eventId}/bookings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEventBookings(res.data);
      setSelectedEventId(eventId);
      setActiveView("event_bookings");
    } catch (error: any) {
      console.error("Failed to fetch event bookings", error);
      handleAuthError(error);
    }
  };

  const handleOpenEdit = (evt: any) => {
    setEditingId(evt.event_id);
    setFormData({
      title: evt.title,
      description: evt.description || "",
      banner_url: evt.banner_url || "",
      venue: evt.venue || "",
      category: evt.category || "other",
      start_datetime: evt.start_datetime ? evt.start_datetime.slice(0, 16) : "",
      end_datetime: evt.end_datetime ? evt.end_datetime.slice(0, 16) : "",
      pass_price: evt.pass_price || 0,
      total_passes: evt.total_passes || "",
      visibility: evt.visibility || "open_to_all",
      pricing_type: evt.pricing_type || "free",
      timeline: evt.timeline || []
    });
    setActiveView("form");
  };

  const handleDelete = async (eventId: string) => {
    if (!confirm("Are you sure you want to delete this event?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${getApiBaseUrl()}/events/${eventId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchEvents();
    } catch (error: any) {
      alert(error.response?.data?.detail || "Failed to delete event");
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const formDataObj = new FormData();
      formDataObj.append("file", file);
      const token = localStorage.getItem("token");
      const res = await axios.post(`${getApiBaseUrl()}/events/upload`, formDataObj, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`
        }
      });
      setFormData((prev) => ({ ...prev, banner_url: res.data.url }));
    } catch (error: any) {
      alert("Image upload failed.");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const payload = {
        ...formData,
        pass_price: Number(formData.pass_price),
        total_passes: formData.total_passes === "" ? null : Number(formData.total_passes),
      };

      if (editingId) {
        await axios.put(`${getApiBaseUrl()}/events/${editingId}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post(`${getApiBaseUrl()}/events`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      fetchEvents();
      setActiveView("events");
    } catch (error: any) {
      alert(error.response?.data?.detail || "Failed to save event.");
    }
  };

  // Submit Pass Cancellation (Task #25)
  const handleExecuteCancelPass = async () => {
    if (!cancelModalPass) return;
    setCancellingPass(true);
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${getApiBaseUrl()}/passes/admin/${cancelModalPass.pass_id}/cancel`,
        {
          reason: cancelReason,
          refund_amount: refundAmount,
          refund_status: refundStatus,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("Pass cancelled successfully!");
      setCancelModalPass(null);
      fetchRegistrations();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to cancel pass");
    } finally {
      setCancellingPass(false);
    }
  };

  const handleMarkPaid = async (registrationId: string) => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${getApiBaseUrl()}/events/registrations/${registrationId}/approve-payment`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (selectedEventId) handleOpenEventBookings(selectedEventId);
      if (activeView === "registrations") fetchRegistrations();
    } catch (error: any) {
      alert(error.response?.data?.detail || "Failed to mark as paid");
    }
  };

  const handleResendQR = async (registrationId: string) => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${getApiBaseUrl()}/events/registrations/${registrationId}/resend-qr`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("QR code pass resent successfully!");
    } catch (error: any) {
      alert(error.response?.data?.detail || "Failed to resend QR code");
    }
  };

  // Multi-field search & event-wise sort/filter for registrations table (Tasks #10, #26)
  const filteredRegistrations = registrations.filter((p) => {
    // Event dropdown filter
    if (selectedEventFilter !== "all" && p.event_title !== selectedEventFilter) {
      return false;
    }
    // Pass status tab filter
    if (passStatusFilter === "active" && p.pass_status === "cancelled") return false;
    if (passStatusFilter === "cancelled" && p.pass_status !== "cancelled") return false;

    // Multi-term query search
    if (!regSearchQuery.trim()) return true;
    const terms = regSearchQuery.toLowerCase().trim().split(/\s+/);
    const searchableText = [
      p.attendee_name || "",
      p.booker_name || "",
      p.event_title || "",
      p.phone || "",
      p.samaj_id || "",
      p.pass_status || "",
      p.payment_status || "",
      p.payment_mode || "",
    ].join(" ").toLowerCase();

    return terms.every((t) => searchableText.includes(t));
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Event & Registration Management</h1>
          <p className="text-xs text-zinc-500 mt-1">Manage events, track attendee passes, verify tickets & process cancellations.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenRegistrations}
            className="px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-bold rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
          >
            <List className="w-4 h-4 text-zinc-600" /> All Passes ({registrations.length})
          </button>
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Create Event
          </button>
        </div>
      </div>

      {activeView === "events" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((evt) => (
            <div key={evt.event_id} className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
              <div>
                <div className="relative h-44 bg-zinc-100">
                  {evt.banner_url ? (
                    <img src={mediaUrl(evt.banner_url) || evt.banner_url} alt={evt.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-400 font-medium">No Banner Image</div>
                  )}
                  <span className="absolute top-3 right-3 px-3 py-1 bg-black/60 backdrop-blur-md text-white text-[11px] font-bold rounded-full uppercase tracking-wider">
                    {evt.pricing_type}
                  </span>
                </div>
                <div className="p-5 space-y-3">
                  <h3 className="font-bold text-lg text-zinc-900 line-clamp-1">{evt.title}</h3>
                  <p className="text-xs text-zinc-500 line-clamp-2">{evt.description}</p>
                  
                  <div className="space-y-1.5 pt-2 border-t border-zinc-100 text-xs text-zinc-600">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span>{formatDateTime12Hour(evt.start_datetime)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span className="truncate">{evt.venue || "Venue TBD"}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="p-5 pt-0 border-t border-zinc-100 mt-4 flex items-center justify-between gap-2 bg-zinc-50/50">
                <button onClick={() => handleOpenEventBookings(evt.event_id)} title="View bookings for this event" className="px-3 py-2 border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer">
                  <Users className="w-3.5 h-3.5 text-amber-600" /> View Bookings
                </button>
                <div className="flex items-center gap-1.5">
                  <EditButton onClick={() => handleOpenEdit(evt)} size="sm" title="Edit this event" />
                  <button onClick={() => handleDelete(evt.event_id)} className="p-2 text-zinc-500 hover:text-red-600 rounded-lg hover:bg-zinc-100 cursor-pointer" title="Delete event">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE / EDIT EVENT FORM VIEW */}
      {activeView === "form" && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm space-y-6 max-w-3xl mx-auto">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
            <h2 className="text-xl font-bold text-zinc-900">{editingId ? "Edit Event" : "Create New Event"}</h2>
            <button onClick={() => setActiveView("events")} className="px-3 py-1.5 border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-xs font-semibold rounded-xl flex items-center gap-1 cursor-pointer">
              <ArrowLeft className="w-3.5 h-3.5" /> Cancel
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-zinc-700">Event Title *</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-zinc-300 rounded-xl text-sm focus:ring-1 focus:ring-amber-500 focus:outline-none"
                placeholder="e.g. Maharaja Agrasen Jayanti Mahotsav"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-zinc-700">Description</label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-zinc-300 rounded-xl text-sm focus:ring-1 focus:ring-amber-500 focus:outline-none"
                placeholder="Detailed event information..."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="font-bold text-zinc-700">Start Date & Time *</label>
                <input
                  type="datetime-local"
                  required
                  value={formData.start_datetime}
                  onChange={(e) => setFormData({ ...formData, start_datetime: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-zinc-300 rounded-xl text-sm focus:ring-1 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-zinc-700">End Date & Time *</label>
                <input
                  type="datetime-local"
                  required
                  value={formData.end_datetime}
                  onChange={(e) => setFormData({ ...formData, end_datetime: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-zinc-300 rounded-xl text-sm focus:ring-1 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="font-bold text-zinc-700">Venue Location *</label>
                <input
                  type="text"
                  required
                  value={formData.venue}
                  onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-zinc-300 rounded-xl text-sm focus:ring-1 focus:ring-amber-500 focus:outline-none"
                  placeholder="Agrasen Bhavan, Shipra Path, Mansrovar"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-zinc-700">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-zinc-300 rounded-xl text-sm focus:ring-1 focus:ring-amber-500 focus:outline-none bg-white font-medium"
                >
                  <option value="cultural">Cultural</option>
                  <option value="religious">Religious</option>
                  <option value="sports">Sports</option>
                  <option value="social">Social</option>
                  <option value="educational">Educational</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="font-bold text-zinc-700">Pricing Type</label>
                <select
                  value={formData.pricing_type}
                  onChange={(e) => setFormData({ ...formData, pricing_type: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-zinc-300 rounded-xl text-sm focus:ring-1 focus:ring-amber-500 focus:outline-none bg-white font-medium"
                >
                  <option value="free">Free Event</option>
                  <option value="paid">Paid Event</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-zinc-700">Pass Price (₹)</label>
                <input
                  type="number"
                  value={formData.pass_price}
                  disabled={formData.pricing_type === "free"}
                  onChange={(e) => setFormData({ ...formData, pass_price: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 border border-zinc-300 rounded-xl text-sm focus:ring-1 focus:ring-amber-500 focus:outline-none disabled:bg-zinc-100"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-zinc-700">Total Available Passes</label>
                <input
                  type="number"
                  placeholder="Unlimited"
                  value={formData.total_passes}
                  onChange={(e) => setFormData({ ...formData, total_passes: e.target.value === "" ? "" : Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 border border-zinc-300 rounded-xl text-sm focus:ring-1 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1.5 p-3 bg-amber-50/50 rounded-2xl border border-amber-200/80">
              <label className="font-bold text-zinc-700 block">Banner Image File</label>
              <div className="flex items-center gap-3">
                {formData.banner_url ? (
                  <div className="relative w-24 h-16 rounded-xl overflow-hidden border border-amber-300 shadow-sm shrink-0">
                    <img src={mediaUrl(formData.banner_url) || formData.banner_url} alt="Banner Preview" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-24 h-16 rounded-xl bg-amber-100/60 border border-dashed border-amber-300 flex items-center justify-center text-amber-600 shrink-0">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                )}
                <label className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl cursor-pointer transition-colors shadow-sm inline-flex items-center gap-1.5">
                  {uploadingImage ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  {formData.banner_url ? "Change Image" : "Upload Banner"}
                  <input type="file" accept="image/*" className="hidden" disabled={uploadingImage} onChange={handleImageUpload} />
                </label>
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-3 border-t border-zinc-100">
              <button type="button" onClick={() => setActiveView("events")} className="px-5 py-2.5 border border-zinc-300 text-zinc-700 font-bold rounded-xl hover:bg-zinc-50">
                Cancel
              </button>
              <button type="submit" className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold rounded-xl shadow-md hover:from-amber-600 hover:to-orange-700 transition-all">
                {editingId ? "Update Event" : "Create Event"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* REGISTRATIONS / PASSES VIEW (Tasks #9, #10, #25, #26) */}
      {activeView === "registrations" && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-100 pb-4">
            <div>
              <h2 className="text-xl font-bold text-zinc-900">Event Pass Registrations</h2>
              <p className="text-xs text-zinc-500 mt-1">Detailed per-person passes with multi-word search, event filters, and cancellation tracking.</p>
            </div>
            <button onClick={() => setActiveView("events")} className="px-4 py-2 border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer">
              <ArrowLeft className="w-4 h-4" /> Back to Events
            </button>
          </div>

          {/* Controls: Search Bar + Event Filter + Status Tabs (Tasks #10, #26) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Search Bar */}
            <div className="relative sm:col-span-1">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by attendee, booker, phone, event..."
                value={regSearchQuery}
                onChange={(e) => setRegSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 border border-zinc-200 rounded-xl text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none bg-zinc-50/50"
              />
            </div>

            {/* Event Dropdown Filter (Task #10, #26) */}
            <div className="relative sm:col-span-1">
              <select
                value={selectedEventFilter}
                onChange={(e) => setSelectedEventFilter(e.target.value)}
                className="w-full px-3 py-2.5 border border-zinc-200 rounded-xl text-xs font-semibold bg-zinc-50/50 text-zinc-800 focus:ring-1 focus:ring-amber-500 focus:outline-none"
              >
                <option value="all">All Events ({events.length})</option>
                {events.map((e) => (
                  <option key={e.event_id} value={e.title}>{e.title}</option>
                ))}
              </select>
            </div>

            {/* Pass Status Tabs (Task #26) */}
            <div className="flex items-center gap-1 p-1 bg-zinc-100 rounded-xl text-xs font-bold sm:col-span-1">
              <button
                onClick={() => setPassStatusFilter("all")}
                className={`flex-1 py-1.5 rounded-lg text-center transition-all ${passStatusFilter === "all" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-900"}`}
              >
                All
              </button>
              <button
                onClick={() => setPassStatusFilter("active")}
                className={`flex-1 py-1.5 rounded-lg text-center transition-all ${passStatusFilter === "active" ? "bg-white text-emerald-700 shadow-sm" : "text-zinc-500 hover:text-zinc-900"}`}
              >
                Active
              </button>
              <button
                onClick={() => setPassStatusFilter("cancelled")}
                className={`flex-1 py-1.5 rounded-lg text-center transition-all ${passStatusFilter === "cancelled" ? "bg-white text-rose-700 shadow-sm" : "text-zinc-500 hover:text-zinc-900"}`}
              >
                Cancelled
              </button>
            </div>
          </div>

          {/* Table (Task #9 - Per Person Pass Rows) */}
          <div className="overflow-x-auto border border-zinc-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 text-zinc-600 font-bold uppercase tracking-wider border-b border-zinc-200">
                <tr>
                  <th className="px-4 py-3">Attendee Name</th>
                  <th className="px-4 py-3">Event Title</th>
                  <th className="px-4 py-3">Booker / Phone</th>
                  <th className="px-4 py-3">Booking Date</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3">Pass Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredRegistrations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-zinc-400">
                      No matching event passes found.
                    </td>
                  </tr>
                ) : (
                  filteredRegistrations.map((p, idx) => (
                    <tr key={p.pass_id || idx} className="hover:bg-zinc-50 transition-colors">
                      <td className="px-4 py-3 font-bold text-zinc-900">
                        {p.attendee_name}
                        {p.samaj_id && <span className="block text-[10px] font-mono text-amber-600">ID: {p.samaj_id}</span>}
                      </td>
                      <td className="px-4 py-3 font-semibold text-zinc-800">{p.event_title}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-zinc-700">{p.booker_name}</div>
                        <div className="font-mono text-zinc-400 text-[11px]">{p.phone}</div>
                      </td>
                      <td className="px-4 py-3 text-zinc-500">{formatDateTime12Hour(p.created_at)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                          p.payment_status === 'verified' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          p.payment_status === 'not_applicable' ? 'bg-zinc-100 text-zinc-700 border border-zinc-200' :
                          'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {p.payment_status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {p.pass_status === "cancelled" ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 font-bold uppercase text-[10px]">
                              <Ban className="w-3 h-3" /> Cancelled
                            </span>
                            {p.cancel_reason && <p className="text-[10px] text-rose-600 italic truncate max-w-xs">{p.cancel_reason}</p>}
                          </div>
                        ) : p.pass_status === "used" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 font-bold uppercase text-[10px]">
                            <CheckCircle className="w-3 h-3" /> Used
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold uppercase text-[10px]">
                            Valid Pass
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {p.pass_status !== "cancelled" ? (
                          <button
                            onClick={() => {
                              setCancelModalPass(p);
                              setCancelReason("Cancelled by Admin");
                              setRefundAmount(p.amount || 0);
                              setRefundStatus(p.payment_status === "verified" ? "pending" : "not_applicable");
                            }}
                            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[11px] font-bold transition-colors cursor-pointer inline-flex items-center gap-1"
                          >
                            <Ban className="w-3 h-3" /> Cancel Pass
                          </button>
                        ) : (
                          <span className="text-[11px] font-medium text-zinc-400">Voided</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* EVENT BOOKINGS SPECIFIC VIEW */}
      {activeView === "event_bookings" && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-4 mb-6">
            <div>
              <h2 className="text-xl font-bold text-zinc-900">Event Pass Bookings</h2>
              <p className="text-xs text-zinc-500 mt-1">Booked passes for selected event.</p>
            </div>
            <button onClick={() => setActiveView("events")} className="px-4 py-2 border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-sm font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Events
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50/50 text-zinc-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 font-semibold">User / Guest</th>
                  <th className="px-6 py-4 font-semibold">Passes</th>
                  <th className="px-6 py-4 font-semibold">Payment Details</th>
                  <th className="px-6 py-4 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {eventBookings.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-zinc-500">
                      No bookings yet.
                    </td>
                  </tr>
                ) : (
                  eventBookings.map((bk) => (
                    <tr key={bk.registration_id} className="hover:bg-zinc-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-zinc-900">{bk.name}</div>
                        <div className="text-xs text-zinc-500">{bk.phone}</div>
                        <div className="text-xs text-zinc-500">{bk.email}</div>
                        <div className="text-xs text-zinc-400 mt-1">{formatDateTime12Hour(bk.created_at)}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 text-xs font-bold border border-amber-100">
                          <Ticket className="w-3.5 h-3.5" /> {bk.pass_count}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col items-start gap-1">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold uppercase ${
                            bk.payment_status === 'verified' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            bk.payment_status === 'not_applicable' ? 'bg-zinc-100 text-zinc-700 border border-zinc-200' :
                            'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {bk.payment_status.replace('_', ' ')}
                          </span>
                          {bk.payment_mode && (
                            <span className="text-xs font-semibold text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded uppercase">
                              {bk.payment_mode.replace('_', ' ')}
                            </span>
                          )}
                          <div className="text-xs text-zinc-500 font-medium mt-0.5">₹{bk.amount}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {bk.payment_status === 'pending' && bk.payment_mode === 'pay_at_venue' && (
                          <button
                            onClick={() => handleMarkPaid(bk.registration_id)}
                            className="px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                          >
                            Mark as Paid
                          </button>
                        )}
                        {(bk.payment_status === 'verified' || bk.payment_status === 'not_applicable') && (
                          <div className="flex flex-col gap-1.5 items-start">
                            <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" /> {bk.payment_status === 'verified' ? 'Paid & Verified' : 'Free Entry'}
                            </span>
                            <button
                              onClick={() => handleResendQR(bk.registration_id)}
                              className="px-2.5 py-1 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-zinc-600 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shadow-sm cursor-pointer"
                            >
                              <Send className="w-3 h-3" /> Resend QR
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CANCEL PASS MODAL (Task #25) */}
      {cancelModalPass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full border border-zinc-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2 text-rose-600">
                <Ban className="w-5 h-5" />
                <h3 className="font-bold text-lg text-zinc-900">Cancel Event Pass</h3>
              </div>
              <button onClick={() => setCancelModalPass(null)} className="p-1 text-zinc-400 hover:text-zinc-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs space-y-1 text-rose-900">
              <p className="font-bold">{cancelModalPass.attendee_name}</p>
              <p>Event: {cancelModalPass.event_title}</p>
              <p>Phone: {cancelModalPass.phone}</p>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-zinc-700">Cancellation Reason</label>
                <input
                  type="text"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-xl focus:ring-1 focus:ring-rose-500 focus:outline-none"
                  placeholder="Reason for pass cancellation"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-zinc-700">Refund Amount (₹)</label>
                <input
                  type="number"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-xl focus:ring-1 focus:ring-rose-500 focus:outline-none font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-zinc-700">Refund Status</label>
                <select
                  value={refundStatus}
                  onChange={(e) => setRefundStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-xl focus:ring-1 focus:ring-rose-500 focus:outline-none font-semibold"
                >
                  <option value="not_applicable">Not Applicable</option>
                  <option value="pending">Pending Refund</option>
                  <option value="paid">Refund Paid</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setCancelModalPass(null)}
                className="flex-1 py-2.5 border border-zinc-200 text-zinc-700 font-bold rounded-xl text-xs hover:bg-zinc-50"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteCancelPass}
                disabled={cancellingPass}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
              >
                {cancellingPass ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
