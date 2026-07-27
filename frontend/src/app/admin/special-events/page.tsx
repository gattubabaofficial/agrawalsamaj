"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { getApiBaseUrl } from "@/utils/api";
import {
  Loader2, Plus, Trash2, CalendarRange, IndianRupee, Ban, CheckCircle2,
  XCircle, Pencil, X, Sparkles,
} from "lucide-react";

interface Room {
  room_id: string;
  name: string;
  price_per_day: number;
  type: string;
}

interface DateRange {
  range_id?: string;
  start_date: string;
  end_date: string;
}

interface RoomConfig {
  config_id?: string;
  room_id: string;
  room_name?: string | null;
  special_price_per_day: number | null;
  is_available: boolean;
  min_days: number | null;
  max_days: number | null;
}

interface SpecialEvent {
  event_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  priority: number;
  block_unlisted_rooms: boolean;
  date_ranges: DateRange[];
  room_configs: RoomConfig[];
}

interface RoomFormState {
  enabled: boolean;
  special_price_per_day: string;
  is_available: boolean;
  min_days: string;
  max_days: string;
}

const emptyForm = () => ({
  name: "",
  description: "",
  is_active: true,
  priority: "100",
  block_unlisted_rooms: false,
  date_ranges: [{ start_date: "", end_date: "" }] as DateRange[],
});

export default function SpecialEventsPage() {
  const [events, setEvents] = useState<SpecialEvent[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null); // null = not editing; "" = creating new
  const [form, setForm] = useState(emptyForm());
  const [roomForms, setRoomForms] = useState<Record<string, RoomFormState>>({});

  const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });

  const loadAll = async () => {
    setLoading(true);
    try {
      const [ev, rm] = await Promise.all([
        axios.get(`${getApiBaseUrl()}/special-events/`),
        axios.get(`${getApiBaseUrl()}/bookings/rooms`),
      ]);
      setEvents(ev.data);
      setRooms(rm.data);
    } catch {
      setError("Failed to load special events");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const inr = (n: number) => `₹${(n || 0).toLocaleString("en-IN")}`;

  const blankRoomForm = (): RoomFormState => ({
    enabled: false,
    special_price_per_day: "",
    is_available: true,
    min_days: "",
    max_days: "",
  });

  const openCreate = () => {
    setForm(emptyForm());
    const initial: Record<string, RoomFormState> = {};
    rooms.forEach((r) => (initial[r.room_id] = blankRoomForm()));
    setRoomForms(initial);
    setEditingId("");
  };

  const openEdit = (event: SpecialEvent) => {
    setForm({
      name: event.name,
      description: event.description || "",
      is_active: event.is_active,
      priority: String(event.priority),
      block_unlisted_rooms: event.block_unlisted_rooms,
      date_ranges: event.date_ranges.map((r) => ({ start_date: r.start_date, end_date: r.end_date })),
    });
    const initial: Record<string, RoomFormState> = {};
    rooms.forEach((r) => (initial[r.room_id] = blankRoomForm()));
    event.room_configs.forEach((c) => {
      initial[c.room_id] = {
        enabled: true,
        special_price_per_day: c.special_price_per_day != null ? String(c.special_price_per_day) : "",
        is_available: c.is_available,
        min_days: c.min_days != null ? String(c.min_days) : "",
        max_days: c.max_days != null ? String(c.max_days) : "",
      };
    });
    setRoomForms(initial);
    setEditingId(event.event_id);
  };

  const closeEditor = () => {
    setEditingId(null);
    setError("");
  };

  const addDateRange = () => {
    setForm({ ...form, date_ranges: [...form.date_ranges, { start_date: "", end_date: "" }] });
  };

  const removeDateRange = (idx: number) => {
    setForm({ ...form, date_ranges: form.date_ranges.filter((_, i) => i !== idx) });
  };

  const updateDateRange = (idx: number, field: "start_date" | "end_date", value: string) => {
    const next = [...form.date_ranges];
    next[idx] = { ...next[idx], [field]: value };
    setForm({ ...form, date_ranges: next });
  };

  const updateRoomForm = (roomId: string, patch: Partial<RoomFormState>) => {
    setRoomForms({ ...roomForms, [roomId]: { ...roomForms[roomId], ...patch } });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.name.trim()) {
      setError("Event name is required.");
      return;
    }
    if (form.date_ranges.some((r) => !r.start_date || !r.end_date)) {
      setError("Every date range needs both a start and end date.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      is_active: form.is_active,
      priority: parseInt(form.priority) || 100,
      block_unlisted_rooms: form.block_unlisted_rooms,
      date_ranges: form.date_ranges.map((r) => ({ start_date: r.start_date, end_date: r.end_date })),
      room_configs: Object.entries(roomForms)
        .filter(([, c]) => c.enabled)
        .map(([room_id, c]) => ({
          room_id,
          special_price_per_day: c.special_price_per_day ? parseFloat(c.special_price_per_day) : null,
          is_available: c.is_available,
          min_days: c.min_days ? parseInt(c.min_days) : null,
          max_days: c.max_days ? parseInt(c.max_days) : null,
        })),
    };

    setSaving(true);
    try {
      if (editingId) {
        await axios.put(`${getApiBaseUrl()}/special-events/${editingId}`, payload, auth());
      } else {
        await axios.post(`${getApiBaseUrl()}/special-events/`, payload, auth());
      }
      closeEditor();
      loadAll();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to save special event.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (eventId: string) => {
    if (!confirm("Delete this special event? This cannot be undone.")) return;
    try {
      await axios.delete(`${getApiBaseUrl()}/special-events/${eventId}`, auth());
      loadAll();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to delete.");
    }
  };

  const toggleActive = async (event: SpecialEvent) => {
    try {
      const action = event.is_active ? "deactivate" : "activate";
      await axios.post(`${getApiBaseUrl()}/special-events/${event.event_id}/${action}`, {}, auth());
      loadAll();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to update status.");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold text-zinc-900 flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-amber-600" /> Special Event Pricing & Restrictions
        </h1>
        {editingId === null && (
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl px-4 py-2 text-sm font-semibold transition-all shadow-sm hover:shadow-md active:scale-95"
          >
            <Plus className="w-4 h-4" /> New Event
          </button>
        )}
      </div>
      <p className="text-sm text-zinc-500 mb-5">
        Create named windows (e.g. "New Year Special") with their own dates, per-room prices, and booking restrictions.
      </p>

      {error && editingId === null && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">
          {error}
          <button className="ml-2 underline" onClick={() => setError("")}>dismiss</button>
        </div>
      )}

      {editingId !== null ? (
        <form onSubmit={handleSave} className="bg-white border border-zinc-200 rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-zinc-800 text-lg">{editingId ? "Edit Special Event" : "New Special Event"}</h2>
            <button type="button" onClick={closeEditor} className="text-zinc-400 hover:text-zinc-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-zinc-600">Event Name</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. New Year Special"
                className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-600">Priority (higher wins on overlap)</label>
              <input
                type="number"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm mt-1"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-600">Description (optional)</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm mt-1"
            />
          </div>

          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm text-zinc-700">
              <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
              Active
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-700">
              <input
                type="checkbox"
                checked={form.block_unlisted_rooms}
                onChange={(e) => setForm({ ...form, block_unlisted_rooms: e.target.checked })}
              />
              Only selected room types allowed (block every other room during this event)
            </label>
          </div>

          {/* Date ranges */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-zinc-800 text-sm flex items-center gap-1.5">
                <CalendarRange className="w-4 h-4" /> Date Ranges
              </h3>
              <button
                type="button"
                onClick={addDateRange}
                className="text-xs font-semibold text-amber-700 hover:text-amber-800 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Another Date Range
              </button>
            </div>
            <div className="space-y-2">
              {form.date_ranges.map((r, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-xs text-zinc-400 w-16 flex-shrink-0">Range {idx + 1}</span>
                  <input
                    required
                    type="date"
                    value={r.start_date}
                    onChange={(e) => updateDateRange(idx, "start_date", e.target.value)}
                    className="border border-zinc-200 rounded-lg px-3 py-2 text-sm flex-1"
                  />
                  <span className="text-zinc-400 text-sm">to</span>
                  <input
                    required
                    type="date"
                    value={r.end_date}
                    onChange={(e) => updateDateRange(idx, "end_date", e.target.value)}
                    className="border border-zinc-200 rounded-lg px-3 py-2 text-sm flex-1"
                  />
                  {form.date_ranges.length > 1 && (
                    <button type="button" onClick={() => removeDateRange(idx)} className="text-red-500 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Per-room grid */}
          <div>
            <h3 className="font-semibold text-zinc-800 text-sm flex items-center gap-1.5 mb-2">
              <IndianRupee className="w-4 h-4" /> Special Prices & Restrictions Per Room
            </h3>
            <p className="text-xs text-zinc-400 mb-3">
              Check a room to configure it for this event. Leave price blank to keep its normal price and only apply restrictions.
              Unchecked rooms are unaffected by this event{form.block_unlisted_rooms ? " — except they'll be blocked, since \"only selected rooms\" is checked above." : "."}
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="text-left text-xs text-zinc-500 border-b border-zinc-200">
                    <th className="py-2 pr-2">Room</th>
                    <th className="py-2 px-2">Configure</th>
                    <th className="py-2 px-2">Special Price/Day</th>
                    <th className="py-2 px-2">Availability</th>
                    <th className="py-2 px-2">Min Days</th>
                    <th className="py-2 px-2">Max Days</th>
                  </tr>
                </thead>
                <tbody>
                  {rooms.map((room) => {
                    const rf = roomForms[room.room_id] || blankRoomForm();
                    return (
                      <tr key={room.room_id} className="border-b border-zinc-100">
                        <td className="py-2 pr-2">
                          <div className="font-medium text-zinc-800">{room.name}</div>
                          <div className="text-xs text-zinc-400">Normal: {inr(room.price_per_day)}/day</div>
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="checkbox"
                            checked={rf.enabled}
                            onChange={(e) => updateRoomForm(room.room_id, { enabled: e.target.checked })}
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="number"
                            step="0.01"
                            disabled={!rf.enabled}
                            placeholder={`${room.price_per_day}`}
                            value={rf.special_price_per_day}
                            onChange={(e) => updateRoomForm(room.room_id, { special_price_per_day: e.target.value })}
                            className="w-28 border border-zinc-200 rounded-lg px-2 py-1.5 text-sm disabled:bg-zinc-50 disabled:text-zinc-300"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <select
                            disabled={!rf.enabled}
                            value={rf.is_available ? "available" : "unavailable"}
                            onChange={(e) => updateRoomForm(room.room_id, { is_available: e.target.value === "available" })}
                            className="border border-zinc-200 rounded-lg px-2 py-1.5 text-sm disabled:bg-zinc-50 disabled:text-zinc-300"
                          >
                            <option value="available">Available</option>
                            <option value="unavailable">Not Available</option>
                          </select>
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="number"
                            min="1"
                            disabled={!rf.enabled}
                            value={rf.min_days}
                            onChange={(e) => updateRoomForm(room.room_id, { min_days: e.target.value })}
                            className="w-20 border border-zinc-200 rounded-lg px-2 py-1.5 text-sm disabled:bg-zinc-50 disabled:text-zinc-300"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="number"
                            min="1"
                            disabled={!rf.enabled}
                            value={rf.max_days}
                            onChange={(e) => updateRoomForm(room.room_id, { max_days: e.target.value })}
                            className="w-20 border border-zinc-200 rounded-lg px-2 py-1.5 text-sm disabled:bg-zinc-50 disabled:text-zinc-300"
                          />
                        </td>
                      </tr>
                    );
                  })}
                  {rooms.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-4 text-center text-xs text-zinc-400">No rooms found. Add rooms first.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-zinc-100">
            <button type="button" onClick={closeEditor} className="px-4 py-2 text-sm font-semibold text-zinc-600 hover:text-zinc-800">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl px-5 py-2 text-sm font-semibold transition-all shadow-sm hover:shadow-md active:scale-95 disabled:active:scale-100"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {editingId ? "Save Changes" : "Create Event"}
            </button>
          </div>
        </form>
      ) : (
        <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-left text-xs text-zinc-500 bg-zinc-50 border-b border-zinc-200">
                  <th className="py-3 px-4">Event Name</th>
                  <th className="py-3 px-4">Date Ranges</th>
                  <th className="py-3 px-4">Special Prices</th>
                  <th className="py-3 px-4">Restrictions</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {events.map((ev) => (
                  <tr key={ev.event_id} className="border-b border-zinc-100 align-top hover:bg-amber-50/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-zinc-900">{ev.name}</div>
                      {ev.description && <div className="text-xs text-zinc-400 max-w-[200px]">{ev.description}</div>}
                      {ev.block_unlisted_rooms && (
                        <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">
                          only selected rooms
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <ul className="space-y-0.5 text-xs text-zinc-600">
                        {ev.date_ranges.map((r) => (
                          <li key={r.range_id}>{r.start_date} → {r.end_date}</li>
                        ))}
                      </ul>
                    </td>
                    <td className="py-3 px-4">
                      <ul className="space-y-0.5 text-xs text-zinc-600">
                        {ev.room_configs.filter((c) => c.special_price_per_day != null).map((c) => (
                          <li key={c.config_id}>{c.room_name}: <span className="font-semibold">{inr(c.special_price_per_day || 0)}</span></li>
                        ))}
                        {ev.room_configs.every((c) => c.special_price_per_day == null) && (
                          <li className="text-zinc-300">—</li>
                        )}
                      </ul>
                    </td>
                    <td className="py-3 px-4">
                      <ul className="space-y-1 text-xs">
                        {ev.room_configs.filter((c) => !c.is_available).map((c) => (
                          <li key={c.config_id} className="flex items-center gap-1 text-red-600">
                            <Ban className="w-3 h-3" /> {c.room_name}: Not Available
                          </li>
                        ))}
                        {ev.room_configs.filter((c) => c.min_days || c.max_days).map((c) => (
                          <li key={`${c.config_id}-stay`} className="text-zinc-500">
                            {c.room_name}: {c.min_days ? `min ${c.min_days}d` : ""}{c.min_days && c.max_days ? " / " : ""}{c.max_days ? `max ${c.max_days}d` : ""}
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => toggleActive(ev)}
                        className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full transition-all hover:scale-105 active:scale-95 ${
                          ev.is_active ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
                        }`}
                      >
                        {ev.is_active ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                        {ev.is_active ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEdit(ev)} className="text-zinc-500 hover:text-amber-600" title="Edit">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(ev.event_id)} className="text-zinc-500 hover:text-red-600" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {events.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-sm text-zinc-400">No special events yet. Click "New Event" to create one.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
