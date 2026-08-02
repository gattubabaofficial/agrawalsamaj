"use client";

import { useState, useEffect } from "react";
import { CalendarPlus, MapPin, Users, Edit, Trash2, Clock, Plus, X, AlertTriangle, ShieldAlert, List, ArrowLeft, Ticket, CheckCircle, Send } from "lucide-react";
import axios from "axios";
import { getApiBaseUrl } from "@/utils/api";
import { formatDateDDMonthYYYY } from "@/utils/date";

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
      setEvents(res.data);
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

  const handleMarkPaid = async (bookingId: string) => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${getApiBaseUrl()}/events/admin/bookings/${bookingId}/mark-paid`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Refresh list
      if (selectedEventId) {
        handleOpenEventBookings(selectedEventId);
      }
      fetchRegistrations();
    } catch (error: any) {
      console.error("Failed to mark paid", error);
      handleAuthError(error);
    }
  };

  const handleResendQR = async (bookingId: string) => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${getApiBaseUrl()}/events/admin/bookings/${bookingId}/resend-qr`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert("QR ticket resend successfully triggered!");
      if (selectedEventId) {
        handleOpenEventBookings(selectedEventId);
      }
    } catch (error: any) {
      console.error("Failed to resend QR code", error);
      alert(error.response?.data?.detail || "Failed to resend QR code");
    }
  };

  const handleOpenEdit = (evt: any) => {
    setFormData({
      title: evt.title,
      description: evt.description || "",
      banner_url: evt.banner_url || "",
      venue: evt.venue || "",
      category: evt.category,
      start_datetime: new Date(evt.start_datetime).toISOString().slice(0, 16),
      end_datetime: new Date(evt.end_datetime).toISOString().slice(0, 16),
      pass_price: evt.pass_price,
      total_passes: evt.total_passes || "",
      visibility: evt.visibility || "open_to_all",
      pricing_type: evt.pricing_type || "free",
      timeline: evt.timeline || []
    });
    setEditingId(evt.event_id);
    setActiveView("form");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this event?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${getApiBaseUrl()}/events/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchEvents();
    } catch (error) {
      alert("Failed to delete event");
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const data = new FormData();
      data.append("file", file);
      const res = await fetch(`${getApiBaseUrl()}/blog/upload`, {
        method: "POST",
        body: data,
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      });
      const resData = await res.json();
      const imageUrl = resData.url || resData.file_url;
      if (imageUrl) {
        setFormData(prev => ({ ...prev, banner_url: imageUrl }));
      } else {
        alert("Image upload failed.");
      }
    } catch (err) {
      console.error(err);
      alert("Error uploading image.");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      
      const payload = {
        ...formData,
        start_datetime: new Date(formData.start_datetime).toISOString(),
        end_datetime: new Date(formData.end_datetime).toISOString(),
        total_passes: formData.total_passes === "" ? null : Number(formData.total_passes)
      };

      if (editingId) {
        await axios.put(`${getApiBaseUrl()}/events/${editingId}`, payload, { headers });
      } else {
        await axios.post(`${getApiBaseUrl()}/events`, payload, { headers });
      }

      setActiveView("events");
      fetchEvents();
    } catch (error: any) {
      alert(error.response?.data?.detail || "Failed to save event");
    }
  };

  const addTimelineItem = () => {
    setFormData(prev => ({ ...prev, timeline: [...prev.timeline, { time: "", title: "" }] }));
  };

  const updateTimelineItem = (index: number, field: "time" | "title", value: string) => {
    const newTimeline = [...formData.timeline];
    newTimeline[index][field] = value;
    setFormData({ ...formData, timeline: newTimeline });
  };

  const removeTimelineItem = (index: number) => {
    const newTimeline = formData.timeline.filter((_, i) => i !== index);
    setFormData({ ...formData, timeline: newTimeline });
  };

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Event Management</h1>
          <p className="text-sm text-zinc-500 mt-1">Create and manage upcoming events.</p>
        </div>
        {activeView === "events" && (
          <div className="flex items-center gap-3">
            <button onClick={handleOpenRegistrations} className="px-4 py-2 bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-sm font-semibold rounded-xl shadow-sm transition-colors flex items-center gap-2 cursor-pointer">
              <List className="w-4 h-4" /> All Registrations
            </button>
            <button onClick={handleOpenCreate} className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors flex items-center gap-2 cursor-pointer">
              <CalendarPlus className="w-4 h-4" /> Create Event
            </button>
          </div>
        )}
      </div>

      {activeView === "form" && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 sm:p-8 shadow-sm">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-4 mb-6">
            <h2 className="text-xl font-bold text-zinc-900">{editingId ? "Edit Event" : "Create New Event"}</h2>
            <button onClick={() => setActiveView("events")} className="p-2 text-zinc-400 hover:text-zinc-600 rounded-full hover:bg-zinc-50 cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-zinc-700">Event Title *</label>
                <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:border-amber-500 text-sm bg-white" placeholder="e.g. Maharaja Agrasen Jayanti" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-zinc-700">Category</label>
                <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:border-amber-500 text-sm bg-white cursor-pointer">
                  <option value="cultural">Cultural</option>
                  <option value="religious">Religious</option>
                  <option value="sports">Sports</option>
                  <option value="social">Social</option>
                  <option value="educational">Educational</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-zinc-700">Description</label>
              <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows={3} className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:border-amber-500 text-sm bg-white" placeholder="Short description of the event" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-zinc-700">Event Banner Image</label>
              <div className="flex items-center gap-4">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="event-image-upload"
                />
                <label
                  htmlFor="event-image-upload"
                  className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-semibold rounded-xl border border-zinc-200 cursor-pointer"
                >
                  {uploadingImage ? "Uploading..." : "Upload Image"}
                </label>
                {formData.banner_url && (
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, banner_url: "" }))}
                    className="text-red-500 hover:text-red-600 text-xs font-semibold cursor-pointer"
                  >
                    Remove Image
                  </button>
                )}
              </div>
              {formData.banner_url && (
                <div className="relative mt-2 max-w-xs rounded-xl overflow-hidden border border-zinc-200 aspect-[16/9]">
                  <img
                    src={formData.banner_url.startsWith('http') || formData.banner_url.startsWith('https') ? formData.banner_url : `${getApiBaseUrl().replace('/api/v1', '')}${formData.banner_url}`}
                    alt="Event banner preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-zinc-700">Venue</label>
              <input type="text" value={formData.venue} onChange={e => setFormData({...formData, venue: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:border-amber-500 text-sm bg-white" placeholder="e.g. Agrasen Bhawan, Main Hall" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-zinc-700">Start Date & Time *</label>
                <input required type="datetime-local" value={formData.start_datetime} onChange={e => setFormData({...formData, start_datetime: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:border-amber-500 text-sm bg-white" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-zinc-700">End Date & Time *</label>
                <input required type="datetime-local" value={formData.end_datetime} onChange={e => setFormData({...formData, end_datetime: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:border-amber-500 text-sm bg-white" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-zinc-100">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-zinc-700">Access Mode</label>
                <select value={formData.visibility} onChange={e => setFormData({...formData, visibility: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:border-amber-500 text-sm bg-white cursor-pointer">
                  <option value="open_to_all">Open to All</option>
                  <option value="members_only">Members Only</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-zinc-700">Pricing Mode</label>
                <select value={formData.pricing_type} onChange={e => setFormData({...formData, pricing_type: e.target.value, pass_price: e.target.value === 'free' ? 0 : formData.pass_price})} className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:border-amber-500 text-sm bg-white cursor-pointer">
                  <option value="free">Free Passes</option>
                  <option value="paid">Paid Event Passes</option>
                </select>
              </div>
              {formData.pricing_type === "paid" && (
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-zinc-700">Pass Price (₹) *</label>
                  <input required type="number" min="0" value={formData.pass_price} onChange={e => setFormData({...formData, pass_price: Number(e.target.value)})} className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:border-amber-500 text-sm bg-white" />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-zinc-700">Total Available Passes (Capacity)</label>
                <input type="number" placeholder="Unlimited if empty" value={formData.total_passes} onChange={e => setFormData({...formData, total_passes: e.target.value ? Number(e.target.value) : ""})} className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:border-amber-500 text-sm bg-white" />
              </div>
            </div>

            {/* Timeline Events */}
            <div className="space-y-4 pt-6 border-t border-zinc-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-zinc-900 text-base">Event Schedule / Timeline</h3>
                  <p className="text-xs text-zinc-500">Key timing items (e.g. 10:00 AM Pooja start, 01:00 PM lunch)</p>
                </div>
                <button type="button" onClick={addTimelineItem} className="px-3 py-1.5 border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer">
                  <Plus className="w-3.5 h-3.5" /> Add Timeline Item
                </button>
              </div>

              <div className="space-y-3">
                {formData.timeline.map((item, index) => (
                  <div key={index} className="flex gap-4 items-center bg-zinc-50 p-4 rounded-xl border border-zinc-100 relative">
                    <div className="w-1/4">
                      <input required type="text" placeholder="e.g. 10:00 AM" value={item.time} onChange={e => updateTimelineItem(index, "time", e.target.value)} className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs bg-white focus:outline-none focus:border-amber-500" />
                    </div>
                    <div className="flex-1">
                      <input required type="text" placeholder="e.g. Devotional Bhajans Start" value={item.title} onChange={e => updateTimelineItem(index, "title", e.target.value)} className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs bg-white focus:outline-none focus:border-amber-500" />
                    </div>
                    <button type="button" onClick={() => removeTimelineItem(index)} className="p-1 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {formData.timeline.length === 0 && (
                  <p className="text-xs text-zinc-400 italic text-center py-2">No timeline schedule items added.</p>
                )}
              </div>
            </div>

            <div className="pt-6 border-t border-zinc-100 flex justify-end gap-4">
              <button type="button" onClick={() => setActiveView("events")} className="px-5 py-2.5 border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-sm font-semibold rounded-xl transition-colors cursor-pointer">
                Cancel
              </button>
              <button type="submit" className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors cursor-pointer">
                {editingId ? "Update Event" : "Create Event"}
              </button>
            </div>
          </form>
        </div>
      )}

      {activeView === "events" && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {events.length === 0 && (
            <div className="col-span-full py-12 text-center text-zinc-500 bg-white border border-zinc-200 border-dashed rounded-2xl">
              No events created yet.
            </div>
          )}
          {events.map(evt => (
            <div key={evt.event_id} className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <div className="h-40 bg-zinc-100 relative overflow-hidden">
                  {evt.banner_url ? (
                    <img
                      src={evt.banner_url.startsWith('http') || evt.banner_url.startsWith('https') ? evt.banner_url : `${getApiBaseUrl().replace('/api/v1', '')}${evt.banner_url}`}
                      alt={evt.title}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <div className={`absolute inset-0 bg-gradient-to-br opacity-80 mix-blend-multiply ${evt.status === 'upcoming' ? 'from-amber-400 to-rose-400' : 'from-zinc-400 to-zinc-600'}`}></div>
                  )}
                  <div className="absolute inset-0 bg-black/45" />
                  <div className="absolute inset-0 p-4 flex flex-col justify-between z-10">
                    <div className="flex justify-between items-start">
                      <span className="px-2.5 py-1 bg-white/20 backdrop-blur-sm text-white text-xs font-bold rounded-full uppercase">{evt.status}</span>
                      <span className="px-2.5 py-1 bg-white/90 text-zinc-900 text-xs font-bold rounded-full">
                        {evt.pass_price > 0 ? `₹${evt.pass_price} / Pass` : "FREE"}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-white leading-tight">{evt.title}</h3>
                  </div>
                </div>
                
                <div className="p-5">
                  <div className="space-y-3">
                    {evt.visibility === "members_only" && (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-50 text-rose-700 text-xs font-bold rounded-md border border-rose-100">
                        <ShieldAlert className="w-3.5 h-3.5" /> Members Only
                      </div>
                    )}
                    {evt.visibility === "open_to_all" && (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-md border border-emerald-100">
                        <Users className="w-3.5 h-3.5" /> Open to All
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-zinc-600">
                      <CalendarPlus className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                      <span className="truncate">{formatDateTime12Hour(evt.start_datetime)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-zinc-600">
                      <MapPin className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                      <span className="truncate">{evt.venue}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-zinc-600">
                      <Users className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                      <span>{evt.passes_sold} / {evt.total_passes || "∞"} Passes Sold</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="p-5 pt-0 border-t border-zinc-100 mt-4 flex items-center justify-between gap-2 bg-zinc-50/50">
                <button onClick={() => handleOpenEventBookings(evt.event_id)} className="px-3 py-2 border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer">
                  <Users className="w-3.5 h-3.5" /> Passes
                </button>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => handleOpenEdit(evt)} className="p-2 text-zinc-500 hover:text-amber-600 rounded-lg hover:bg-zinc-100 cursor-pointer">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(evt.event_id)} className="p-2 text-zinc-500 hover:text-red-600 rounded-lg hover:bg-zinc-100 cursor-pointer">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeView === "registrations" && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-4 mb-6">
            <div>
              <h2 className="text-xl font-bold text-zinc-900">All Event Registrations</h2>
              <p className="text-xs text-zinc-500 mt-1">Pass bookings across all created events.</p>
            </div>
            <button onClick={() => setActiveView("events")} className="px-4 py-2 border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-sm font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer">
              <ArrowLeft className="w-4 h-4" /> Back to Events
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50/50 text-zinc-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 font-semibold">Event Title</th>
                  <th className="px-6 py-4 font-semibold">User Details</th>
                  <th className="px-6 py-4 font-semibold">Passes</th>
                  <th className="px-6 py-4 font-semibold">Payment Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {registrations.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-zinc-500">
                      No event registrations found.
                    </td>
                  </tr>
                ) : (
                  registrations.map((reg) => (
                    <tr key={reg.registration_id} className="hover:bg-zinc-50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-zinc-900">{reg.event_title}</td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-zinc-800">{reg.name}</div>
                        <div className="text-xs text-zinc-500">{reg.phone}</div>
                        <div className="text-xs text-zinc-400">{formatDateTime12Hour(reg.created_at)}</div>
                      </td>
                      <td className="px-6 py-4 font-bold text-zinc-900">{reg.pass_count}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold uppercase ${
                          reg.payment_status === 'verified' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          reg.payment_status === 'not_applicable' ? 'bg-zinc-100 text-zinc-700 border border-zinc-200' :
                          'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {reg.payment_status.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeView === "event_bookings" && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-4 mb-6">
            <div>
              <h2 className="text-xl font-bold text-zinc-900">Event Pass Bookings</h2>
              <p className="text-xs text-zinc-500 mt-1">Booked passes for the selected event.</p>
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
    </div>
  );
}
