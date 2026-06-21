"use client";

import { useState, useEffect } from "react";
import { CalendarPlus, MapPin, Users, Edit, Trash2, Clock, Plus, X, AlertTriangle, ShieldAlert, List, ArrowLeft, Ticket } from "lucide-react";
import axios from "axios";
import { getApiBaseUrl } from "@/utils/api";

interface TimelineItem {
  time: string;
  title: string;
}

interface EventData {
  event_id?: string;
  title: string;
  description: string;
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

export default function AdminEventsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [activeView, setActiveView] = useState<"events" | "form" | "registrations" | "event_bookings">("events");
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [eventBookings, setEventBookings] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState<EventData>({
    title: "",
    description: "",
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
      const res = await axios.get(`${getApiBaseUrl()}/events`);
      setEvents(res.data);
    } catch (error) {
      console.error("Failed to fetch events", error);
    }
  };

  const handleOpenCreate = () => {
    setFormData({
      title: "", description: "", venue: "", category: "other",
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

  const fetchRegistrations = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${getApiBaseUrl()}/events/registrations/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRegistrations(res.data);
    } catch (error) {
      console.error("Failed to fetch registrations", error);
    }
  };

  const handleOpenEventBookings = async (eventId: string) => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${getApiBaseUrl()}/admin/events/${eventId}/bookings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEventBookings(res.data);
      setSelectedEventId(eventId);
      setActiveView("event_bookings");
    } catch (error) {
      console.error("Failed to fetch event bookings", error);
    }
  };

  const handleMarkPaid = async (bookingId: string) => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${getApiBaseUrl()}/admin/bookings/${bookingId}/mark-paid`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Refresh list
      if (selectedEventId) {
        handleOpenEventBookings(selectedEventId);
      }
    } catch (error) {
      console.error("Failed to mark paid", error);
    }
  };

    setFormData({
      title: evt.title,
      description: evt.description || "",
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
        await axios.post(`${getApiBaseUrl()}/events/`, payload, { headers });
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
            <button onClick={handleOpenRegistrations} className="px-4 py-2 bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-sm font-semibold rounded-xl shadow-sm transition-colors flex items-center gap-2">
              <List className="w-4 h-4" /> All Registrations
            </button>
            <button onClick={handleOpenCreate} className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors flex items-center gap-2">
              <CalendarPlus className="w-4 h-4" /> Create Event
            </button>
          </div>
        )}
      </div>

      {activeView === "form" && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 sm:p-8 shadow-sm">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-4 mb-6">
            <h2 className="text-xl font-bold text-zinc-900">{editingId ? "Edit Event" : "Create New Event"}</h2>
            <button onClick={() => setActiveView("events")} className="p-2 text-zinc-400 hover:text-zinc-600 rounded-full hover:bg-zinc-50">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-zinc-700">Event Title *</label>
                <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:border-amber-500 text-sm" placeholder="e.g. Diwali Milan Samaroh" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-zinc-700">Category</label>
                <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:border-amber-500 text-sm">
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
              <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows={3} className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:border-amber-500 text-sm" placeholder="Short description of the event" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-zinc-700">Venue</label>
              <input type="text" value={formData.venue} onChange={e => setFormData({...formData, venue: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:border-amber-500 text-sm" placeholder="e.g. Agrawal Bhavan, Main Hall" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-zinc-700">Start Date & Time *</label>
                <input required type="datetime-local" value={formData.start_datetime} onChange={e => setFormData({...formData, start_datetime: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:border-amber-500 text-sm" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-zinc-700">End Date & Time *</label>
                <input required type="datetime-local" value={formData.end_datetime} onChange={e => setFormData({...formData, end_datetime: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:border-amber-500 text-sm" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-zinc-700">Pricing Type</label>
                <select value={formData.pricing_type} onChange={e => {
                  const val = e.target.value;
                  setFormData({...formData, pricing_type: val, pass_price: val === 'free' ? 0 : formData.pass_price});
                }} className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:border-amber-500 text-sm">
                  <option value="free">Free Event</option>
                  <option value="paid">Paid Event</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-zinc-700">Pass Price (₹)</label>
                <input type="number" min="0" disabled={formData.pricing_type === "free"} value={formData.pass_price} onChange={e => setFormData({...formData, pass_price: Number(e.target.value)})} className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:border-amber-500 text-sm disabled:opacity-50" placeholder="0 for Free" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-zinc-700">Total Passes Available</label>
                <input type="number" min="1" value={formData.total_passes} onChange={e => setFormData({...formData, total_passes: e.target.value === "" ? "" : Number(e.target.value)})} className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:border-amber-500 text-sm" placeholder="Leave empty for unlimited" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-zinc-700">Event Visibility</label>
                <select value={formData.visibility} onChange={e => setFormData({...formData, visibility: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:border-amber-500 text-sm">
                  <option value="open_to_all">Open to All (Guests & Members)</option>
                  <option value="members_only">Members Only</option>
                </select>
              </div>
            </div>

            {/* Timeline Builder */}
            <div className="space-y-4 pt-4 border-t border-zinc-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-zinc-900">Event Timeline & Schedule</h3>
                  <p className="text-xs text-zinc-500 mt-1">Add schedule breakdown for the event.</p>
                </div>
                <button type="button" onClick={addTimelineItem} className="text-sm font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-1">
                  <Plus className="w-4 h-4" /> Add Row
                </button>
              </div>

              {formData.timeline.length === 0 ? (
                <div className="p-4 rounded-xl bg-zinc-50 border border-dashed border-zinc-300 text-center text-sm text-zinc-500">
                  No timeline items added. Click "Add Row" to build the schedule.
                </div>
              ) : (
                <div className="space-y-3">
                  {formData.timeline.map((item, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="w-1/3">
                        <input type="time" required value={item.time} onChange={(e) => updateTimelineItem(index, "time", e.target.value)} className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm" />
                      </div>
                      <div className="flex-1 flex items-center gap-2">
                        <input type="text" required placeholder="e.g. Guest Arrival & Snacks" value={item.title} onChange={(e) => updateTimelineItem(index, "title", e.target.value)} className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm" />
                        <button type="button" onClick={() => removeTimelineItem(index)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-6 border-t border-zinc-100 flex justify-end gap-3">
              <button type="button" onClick={() => setActiveView("events")} className="px-5 py-2.5 text-sm font-semibold text-zinc-600 hover:bg-zinc-100 rounded-xl transition-colors">
                Cancel
              </button>
              <button type="submit" className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors">
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
            <div key={evt.event_id} className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden flex flex-col">
              <div className="h-40 bg-zinc-100 relative">
                <div className={`absolute inset-0 bg-gradient-to-br opacity-80 mix-blend-multiply ${evt.status === 'upcoming' ? 'from-amber-400 to-rose-400' : 'from-zinc-400 to-zinc-600'}`}></div>
                <div className="absolute inset-0 p-4 flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <span className="px-2.5 py-1 bg-white/20 backdrop-blur-sm text-white text-xs font-bold rounded-full uppercase">{evt.status}</span>
                    <span className="px-2.5 py-1 bg-white/90 text-zinc-900 text-xs font-bold rounded-full">
                      {evt.pass_price > 0 ? `₹${evt.pass_price} / Pass` : "FREE"}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-white leading-tight">{evt.title}</h3>
                </div>
              </div>
              
              <div className="p-5 flex-1 flex flex-col">
                <div className="space-y-3 mb-6">
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
                    <span className="truncate">{new Date(evt.start_datetime).toLocaleString()}</span>
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

                <div className="mt-auto border-t border-zinc-100 pt-4 flex items-center justify-between">
                  <button onClick={() => handleOpenEventBookings(evt.event_id)} className="text-sm font-semibold text-amber-600 hover:text-amber-700 transition-colors">
                    View Bookings
                  </button>
                  <div className="flex gap-2">
                    <button onClick={() => handleOpenEdit(evt)} className="p-1.5 text-zinc-400 hover:text-zinc-600 rounded bg-zinc-50 transition-colors"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(evt.event_id)} className="p-1.5 text-zinc-400 hover:text-red-600 rounded bg-zinc-50 transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeView === "registrations" && (
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-zinc-200 flex items-center justify-between bg-zinc-50/50">
            <div>
              <h2 className="text-lg font-bold text-zinc-900">Registrations Log</h2>
              <p className="text-xs text-zinc-500">All member event bookings and payments</p>
            </div>
            <button onClick={() => setActiveView("events")} className="px-3 py-1.5 bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1.5">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Events
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50/50 text-zinc-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 font-semibold">User Details</th>
                  <th className="px-6 py-4 font-semibold">Event</th>
                  <th className="px-6 py-4 font-semibold">Passes</th>
                  <th className="px-6 py-4 font-semibold">Payment Status</th>
                  <th className="px-6 py-4 font-semibold">Date Registered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {registrations.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-zinc-500">
                      No registrations found.
                    </td>
                  </tr>
                ) : (
                  registrations.map((reg) => (
                    <tr key={reg.registration_id} className="hover:bg-zinc-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-zinc-900">{reg.user_name}</div>
                        <div className="text-xs text-zinc-500">{reg.user_mobile}</div>
                        <div className="text-xs text-zinc-500">{reg.user_email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-zinc-900">{reg.event_title}</div>
                        <div className="text-xs text-zinc-500">{new Date(reg.event_start).toLocaleDateString()}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 text-xs font-bold border border-amber-100">
                          <Ticket className="w-3.5 h-3.5" /> {reg.pass_count}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold uppercase ${
                          reg.payment_status === 'completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {reg.payment_status}
                        </span>
                        {reg.total_amount > 0 && <div className="text-xs text-zinc-500 mt-1">₹{reg.total_amount}</div>}
                      </td>
                      <td className="px-6 py-4 text-xs text-zinc-500">
                        {new Date(reg.created_at).toLocaleString()}
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
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-zinc-200 flex items-center justify-between bg-zinc-50/50">
            <div>
              <h2 className="text-lg font-bold text-zinc-900">Event Bookings</h2>
              <p className="text-xs text-zinc-500">Manage registrations and venue payments for this event</p>
            </div>
            <button onClick={() => setActiveView("events")} className="px-3 py-1.5 bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1.5">
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
                        <div className="text-xs text-zinc-400 mt-1">{new Date(bk.created_at).toLocaleString()}</div>
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
                            className="px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-xs font-bold transition-colors"
                          >
                            Mark as Paid
                          </button>
                        )}
                        {bk.payment_status === 'verified' && (
                          <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                            <ShieldAlert className="w-3 h-3" /> Paid & Verified
                          </span>
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
