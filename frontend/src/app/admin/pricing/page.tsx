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

  // Bhavan Rate List Manager State (Saava / Other Days / Social / Free)
  const [activeCategoryTab, setActiveCategoryTab] = useState<"saava" | "other_days" | "social" | "free">("saava");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [editableRateLists, setEditableRateLists] = useState<Record<string, any[]>>({
    saava: [
      { unit: "First Unit (Ground Floor Hall + 5 Rooms)", day1: "₹15,000/-", day2: "₹25,000/-", day3: "₹33,000/-", cleaning: "₹1,000 / day" },
      { unit: "Second Unit (First Floor 11 Rooms + 3 Dormitories)", day1: "₹14,000/-", day2: "₹21,000/-", day3: "₹27,000/-", cleaning: "₹1,000 / day" },
      { unit: "Third Unit (Basement Hall)", day1: "₹4,000/-", day2: "₹8,000/-", day3: "₹12,000/-", cleaning: "₹1,000 / day" },
      { unit: "Individual AC Room (Patient Family Stay)", day1: "₹600 / day", day2: "-", day3: "-", cleaning: "Included" },
      { unit: "Individual Non-AC Room", day1: "₹400 / day", day2: "-", day3: "-", cleaning: "Included" },
    ],
    other_days: [
      { unit: "First Unit (Ground Floor Hall + 5 Rooms)", day1: "₹12,000/-", day2: "₹20,000/-", day3: "₹28,000/-", cleaning: "₹1,000 / day" },
      { unit: "Second Unit (First Floor 11 Rooms + 3 Dormitories)", day1: "₹11,000/-", day2: "₹18,000/-", day3: "₹24,000/-", cleaning: "₹1,000 / day" },
      { unit: "Third Unit (Basement Hall)", day1: "₹3,500/-", day2: "₹7,000/-", day3: "₹10,000/-", cleaning: "₹1,000 / day" },
      { unit: "Individual AC Room (Patient Family Stay)", day1: "₹550 / day", day2: "-", day3: "-", cleaning: "Included" },
      { unit: "Individual Non-AC Room", day1: "₹350 / day", day2: "-", day3: "-", cleaning: "Included" },
    ],
    social: [
      { unit: "First Unit (Ground Floor Hall + 5 Rooms)", day1: "₹8,000/-", day2: "₹14,000/-", day3: "₹20,000/-", cleaning: "₹800 / day" },
      { unit: "Second Unit (First Floor 11 Rooms + 3 Dormitories)", day1: "₹7,000/-", day2: "₹12,000/-", day3: "₹16,000/-", cleaning: "₹800 / day" },
      { unit: "Third Unit (Basement Hall)", day1: "₹2,500/-", day2: "₹4,500/-", day3: "₹6,500/-", cleaning: "₹500 / day" },
      { unit: "Individual AC Room (Patient Family Stay)", day1: "₹450 / day", day2: "-", day3: "-", cleaning: "Included" },
      { unit: "Individual Non-AC Room", day1: "₹300 / day", day2: "-", day3: "-", cleaning: "Included" },
    ],
    free: [
      { unit: "First Unit (Ground Floor Hall + 5 Rooms)", day1: "FREE (₹0)", day2: "FREE (₹0)", day3: "FREE (₹0)", cleaning: "Included" },
      { unit: "Second Unit (First Floor 11 Rooms + 3 Dormitories)", day1: "FREE (₹0)", day2: "FREE (₹0)", day3: "FREE (₹0)", cleaning: "Included" },
      { unit: "Third Unit (Basement Hall)", day1: "FREE (₹0)", day2: "FREE (₹0)", day3: "FREE (₹0)", cleaning: "Included" },
      { unit: "Individual AC Room (Patient Family Stay)", day1: "FREE (₹0)", day2: "-", day3: "-", cleaning: "Included" },
      { unit: "Individual Non-AC Room", day1: "FREE (₹0)", day2: "-", day3: "-", cleaning: "Included" },
    ],
  });

  const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });

  useEffect(() => {
    const stored = localStorage.getItem("bhavan_custom_rates");
    if (stored) {
      try { setEditableRateLists(JSON.parse(stored)); } catch (e) { console.error(e); }
    }
  }, []);

  const handleRateCellChange = (category: string, index: number, field: string, value: string) => {
    const updated = { ...editableRateLists };
    updated[category][index][field] = value;
    setEditableRateLists({ ...updated });
  };

  const saveCategoryRates = () => {
    localStorage.setItem("bhavan_custom_rates", JSON.stringify(editableRateLists));
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 4000);
  };

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

      {/* Bhavan Category Rate List Editor (Saava / Social / Free) */}
      <div className="mt-8 bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 pb-4">
          <div>
            <h2 className="font-bold text-zinc-900 text-lg flex items-center gap-2">
              <Settings className="w-5 h-5 text-amber-600" /> Bhavan Category Rate List Manager (दर तालिका)
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">Customize rate lists for Wedding Saava Days, Other Social Functions, and Free/Charitable Usage.</p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={activeCategoryTab}
              onChange={(e) => setActiveCategoryTab(e.target.value as any)}
              className="border border-zinc-200 rounded-xl px-3 py-2 text-xs font-bold bg-zinc-50 focus:outline-none focus:border-amber-500"
            >
              <option value="saava">💍 Wedding Saava Days (सावा)</option>
              <option value="other_days">🗓️ Other Days (अन्य सामान्य दिवस)</option>
              <option value="social">👥 Social Functions (सामाजिक कार्यक्रम)</option>
              <option value="free">🎁 Free / Welfare Use (निःशुल्क सेवा)</option>
            </select>

            <button
              type="button"
              onClick={saveCategoryRates}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
            >
              Save Rate List
            </button>
          </div>
        </div>

        {saveSuccess && (
          <div className="p-3 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200">
            ✓ Bhavan rate list updated successfully! Public Bhavan page (/bhavan) is now updated.
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse min-w-[640px]">
            <thead>
              <tr className="bg-zinc-100 text-zinc-700 uppercase font-semibold">
                <th className="p-3 rounded-l-lg">Unit Description</th>
                <th className="p-3">First Day Rate</th>
                <th className="p-3">Two Days Rate</th>
                <th className="p-3">Three Days Rate</th>
                <th className="p-3 rounded-r-lg">Cleaning Charge</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-zinc-800 font-medium">
              {(editableRateLists[activeCategoryTab] || []).map((item, idx) => (
                <tr key={idx} className="hover:bg-zinc-50">
                  <td className="p-2.5 font-bold text-zinc-900 min-w-[200px]">
                    <input
                      type="text"
                      value={item.unit}
                      onChange={(e) => handleRateCellChange(activeCategoryTab, idx, "unit", e.target.value)}
                      className="w-full border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:border-amber-500"
                    />
                  </td>
                  <td className="p-2.5">
                    <input
                      type="text"
                      value={item.day1}
                      onChange={(e) => handleRateCellChange(activeCategoryTab, idx, "day1", e.target.value)}
                      className="w-full border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-amber-600 focus:outline-none focus:border-amber-500"
                    />
                  </td>
                  <td className="p-2.5">
                    <input
                      type="text"
                      value={item.day2}
                      onChange={(e) => handleRateCellChange(activeCategoryTab, idx, "day2", e.target.value)}
                      className="w-full border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-amber-500"
                    />
                  </td>
                  <td className="p-2.5">
                    <input
                      type="text"
                      value={item.day3}
                      onChange={(e) => handleRateCellChange(activeCategoryTab, idx, "day3", e.target.value)}
                      className="w-full border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-amber-500"
                    />
                  </td>
                  <td className="p-2.5">
                    <input
                      type="text"
                      value={item.cleaning}
                      onChange={(e) => handleRateCellChange(activeCategoryTab, idx, "cleaning", e.target.value)}
                      className="w-full border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs text-zinc-500 focus:outline-none focus:border-amber-500"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
