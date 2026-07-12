"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { getApiBaseUrl } from "@/utils/api";
import { Loader2, Plus, Trash2, IndianRupee, CalendarRange, Settings } from "lucide-react";

interface Room { room_id: string; name: string; price_per_day: number; type: string; }
interface PricingRule { rule_id: string; label: string | null; start_date: string; end_date: string; price_per_day: number; priority: number; is_active: boolean; }
interface BookingRule { rule_id: string; room_id: string | null; label: string | null; start_date: string; end_date: string; min_days: number; is_active: boolean; }

export default function PricingRulesPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [pricing, setPricing] = useState<PricingRule[]>([]);
  const [minStay, setMinStay] = useState<BookingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [pForm, setPForm] = useState({ label: "", start_date: "", end_date: "", price_per_day: "", priority: "0" });
  const [mForm, setMForm] = useState({ label: "", start_date: "", end_date: "", min_days: "1", allRooms: false });

  const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });

  const loadRooms = async () => {
    try {
      const res = await axios.get(`${getApiBaseUrl()}/bookings/rooms`);
      setRooms(res.data);
      if (res.data.length && !selected) setSelected(res.data[0].room_id);
    } catch { setError("Failed to load rooms"); }
    finally { setLoading(false); }
  };

  const loadRules = async (roomId: string) => {
    if (!roomId) return;
    try {
      const [p, m] = await Promise.all([
        axios.get(`${getApiBaseUrl()}/bookings/rooms/${roomId}/pricing-rules`),
        axios.get(`${getApiBaseUrl()}/bookings/booking-rules?room_id=${roomId}`),
      ]);
      setPricing(p.data);
      setMinStay(m.data);
    } catch { setError("Failed to load rules"); }
  };

  useEffect(() => { loadRooms(); }, []);
  useEffect(() => { if (selected) loadRules(selected); }, [selected]);

  const addPricing = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post(`${getApiBaseUrl()}/bookings/rooms/${selected}/pricing-rules`, {
        label: pForm.label || null,
        start_date: pForm.start_date,
        end_date: pForm.end_date,
        price_per_day: parseFloat(pForm.price_per_day),
        priority: parseInt(pForm.priority) || 0,
      }, auth());
      setPForm({ label: "", start_date: "", end_date: "", price_per_day: "", priority: "0" });
      loadRules(selected);
    } catch (e: any) { setError(e.response?.data?.detail || "Failed to add pricing rule"); }
  };

  const delPricing = async (id: string) => {
    try { await axios.delete(`${getApiBaseUrl()}/bookings/pricing-rules/${id}`, auth()); loadRules(selected); }
    catch (e: any) { setError(e.response?.data?.detail || "Failed to delete"); }
  };

  const addMinStay = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post(`${getApiBaseUrl()}/bookings/booking-rules`, {
        room_id: mForm.allRooms ? null : selected,
        label: mForm.label || null,
        start_date: mForm.start_date,
        end_date: mForm.end_date,
        min_days: parseInt(mForm.min_days) || 1,
      }, auth());
      setMForm({ label: "", start_date: "", end_date: "", min_days: "1", allRooms: false });
      loadRules(selected);
    } catch (e: any) { setError(e.response?.data?.detail || "Failed to add min-stay rule"); }
  };

  const delMinStay = async (id: string) => {
    try { await axios.delete(`${getApiBaseUrl()}/bookings/booking-rules/${id}`, auth()); loadRules(selected); }
    catch (e: any) { setError(e.response?.data?.detail || "Failed to delete"); }
  };

  const inr = (n: number) => `₹${(n || 0).toLocaleString("en-IN")}`;
  const room = rooms.find(r => r.room_id === selected);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-zinc-400" /></div>;

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-zinc-900 flex items-center gap-2 mb-1">
        <Settings className="w-6 h-6 text-amber-600" /> Room Pricing & Booking Rules
      </h1>
      <p className="text-sm text-zinc-500 mb-5">Set date-range prices and minimum-stay requirements for each room.</p>

      {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">{error}<button className="ml-2 underline" onClick={() => setError("")}>dismiss</button></div>}

      <div className="mb-6">
        <label className="text-sm font-medium text-zinc-700 mr-2">Room:</label>
        <select value={selected} onChange={(e) => setSelected(e.target.value)} className="border border-zinc-200 rounded-xl px-3 py-2 text-sm">
          {rooms.map(r => <option key={r.room_id} value={r.room_id}>{r.name} ({inr(r.price_per_day)}/day default)</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pricing rules */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-5">
          <h2 className="font-semibold text-zinc-800 flex items-center gap-2 mb-3"><IndianRupee className="w-4 h-4" /> Date-range Pricing</h2>
          <p className="text-xs text-zinc-400 mb-3">Default price for {room?.name}: <b>{room ? inr(room.price_per_day) : "-"}/day</b>. Rules below override it for the given dates (higher priority wins).</p>

          <form onSubmit={addPricing} className="space-y-2 mb-4">
            <input placeholder="Label e.g. Diwali season" value={pForm.label} onChange={(e) => setPForm({ ...pForm, label: e.target.value })} className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm" />
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-[11px] text-zinc-500">From</label><input required type="date" value={pForm.start_date} onChange={(e) => setPForm({ ...pForm, start_date: e.target.value })} className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="text-[11px] text-zinc-500">To</label><input required type="date" value={pForm.end_date} onChange={(e) => setPForm({ ...pForm, end_date: e.target.value })} className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm" /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input required type="number" step="0.01" placeholder="Price/day (₹)" value={pForm.price_per_day} onChange={(e) => setPForm({ ...pForm, price_per_day: e.target.value })} className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm" />
              <input type="number" placeholder="Priority" value={pForm.priority} onChange={(e) => setPForm({ ...pForm, priority: e.target.value })} className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <button className="w-full flex items-center justify-center gap-1 bg-amber-600 text-white rounded-lg py-2 text-sm"><Plus className="w-4 h-4" /> Add Pricing Rule</button>
          </form>

          <div className="space-y-2">
            {pricing.map(r => (
              <div key={r.rule_id} className="flex items-center justify-between border border-zinc-100 rounded-lg px-3 py-2 text-sm">
                <div>
                  <div className="font-medium">{inr(r.price_per_day)}/day {r.label && <span className="text-zinc-400 font-normal">· {r.label}</span>}</div>
                  <div className="text-xs text-zinc-500">{r.start_date} → {r.end_date} · priority {r.priority}</div>
                </div>
                <button onClick={() => delPricing(r.rule_id)} className="text-red-500 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
            {pricing.length === 0 && <p className="text-xs text-zinc-400 text-center py-3">No custom pricing — default applies.</p>}
          </div>
        </div>

        {/* Min-stay rules */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-5">
          <h2 className="font-semibold text-zinc-800 flex items-center gap-2 mb-3"><CalendarRange className="w-4 h-4" /> Minimum-stay Requirements</h2>
          <p className="text-xs text-zinc-400 mb-3">Force a minimum number of booked days for stays overlapping a date window.</p>

          <form onSubmit={addMinStay} className="space-y-2 mb-4">
            <input placeholder="Label e.g. Wedding season" value={mForm.label} onChange={(e) => setMForm({ ...mForm, label: e.target.value })} className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm" />
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-[11px] text-zinc-500">From</label><input required type="date" value={mForm.start_date} onChange={(e) => setMForm({ ...mForm, start_date: e.target.value })} className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="text-[11px] text-zinc-500">To</label><input required type="date" value={mForm.end_date} onChange={(e) => setMForm({ ...mForm, end_date: e.target.value })} className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm" /></div>
            </div>
            <input required type="number" min="1" placeholder="Minimum days" value={mForm.min_days} onChange={(e) => setMForm({ ...mForm, min_days: e.target.value })} className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm" />
            <label className="flex items-center gap-2 text-xs text-zinc-600"><input type="checkbox" checked={mForm.allRooms} onChange={(e) => setMForm({ ...mForm, allRooms: e.target.checked })} /> Apply to all rooms</label>
            <button className="w-full flex items-center justify-center gap-1 bg-zinc-900 text-white rounded-lg py-2 text-sm"><Plus className="w-4 h-4" /> Add Min-stay Rule</button>
          </form>

          <div className="space-y-2">
            {minStay.map(r => (
              <div key={r.rule_id} className="flex items-center justify-between border border-zinc-100 rounded-lg px-3 py-2 text-sm">
                <div>
                  <div className="font-medium">Min {r.min_days} day(s) {r.label && <span className="text-zinc-400 font-normal">· {r.label}</span>} {r.room_id === null && <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">all rooms</span>}</div>
                  <div className="text-xs text-zinc-500">{r.start_date} → {r.end_date}</div>
                </div>
                <button onClick={() => delMinStay(r.rule_id)} className="text-red-500 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
            {minStay.length === 0 && <p className="text-xs text-zinc-400 text-center py-3">No minimum-stay rules.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
