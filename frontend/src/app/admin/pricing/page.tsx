"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { getApiBaseUrl } from "@/utils/api";
import { Loader2, Plus, Trash2, IndianRupee, CalendarRange, Settings, X } from "lucide-react";

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

  // Saava Cards State
  const [saavaCards, setSaavaCards] = useState<any[]>([]);
  const [saavaForm, setSaavaForm] = useState({
    title: "",
    date_ranges: [{ start_date: "", end_date: "" }],
    rate_category: "saava",
    disable_social_discount: true,
    disable_individual_rooms: true,
    disable_member_discount: false,
    is_blocked: false,
    min_stay_days: "",
    custom_rule_notice: "",
  });

  const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });

  useEffect(() => {
    const stored = localStorage.getItem("bhavan_custom_rates");
    if (stored) {
      try { setEditableRateLists(JSON.parse(stored)); } catch (e) { console.error(e); }
    }
    fetchCategoryRates();
    fetchSaavaCards();
  }, []);

  const fetchCategoryRates = async () => {
    try {
      const res = await axios.get(`${getApiBaseUrl()}/bookings/category-rates`);
      if (res.data) {
        setEditableRateLists(res.data);
        localStorage.setItem("bhavan_custom_rates", JSON.stringify(res.data));
      }
    } catch (e) {
      console.error("Failed to fetch category rates", e);
    }
  };

  const fetchSaavaCards = async () => {
    try {
      const res = await axios.get(`${getApiBaseUrl()}/bookings/saava-dates`);
      if (Array.isArray(res.data)) {
        if (res.data.length > 0 && typeof res.data[0] === "string") {
          setSaavaCards(res.data.map((d: string) => ({
            date_id: d,
            title: "Wedding Saava Day",
            start_date: d,
            end_date: d,
            date_ranges: [{ start_date: d, end_date: d }],
            rate_category: "saava",
            disable_social_discount: true,
            disable_individual_rooms: true,
            disable_member_discount: false,
            is_blocked: false,
            dates: [d]
          })));
        } else {
          setSaavaCards(res.data);
        }
      }
    } catch (e) {
      console.error("Failed to load Saava cards", e);
    }
  };

  const addDateRangeRow = () => {
    setSaavaForm({
      ...saavaForm,
      date_ranges: [...saavaForm.date_ranges, { start_date: "", end_date: "" }]
    });
  };

  const removeDateRangeRow = (index: number) => {
    if (saavaForm.date_ranges.length <= 1) return;
    const updated = saavaForm.date_ranges.filter((_, i) => i !== index);
    setSaavaForm({ ...saavaForm, date_ranges: updated });
  };

  const handleDateRangeChange = (index: number, field: "start_date" | "end_date", value: string) => {
    const updated = [...saavaForm.date_ranges];
    updated[index][field] = value;
    if (field === "start_date" && !updated[index].end_date) {
      updated[index].end_date = value;
    }
    setSaavaForm({ ...saavaForm, date_ranges: updated });
  };

  const handleAddSaavaCard = async (e: React.FormEvent) => {
    e.preventDefault();
    const validRanges = saavaForm.date_ranges.filter(r => r.start_date);
    if (validRanges.length === 0) {
      setError("Please add at least one valid Date Range row.");
      return;
    }
    try {
      const payload = {
        title: saavaForm.title || "Wedding Saava Window",
        date_ranges: validRanges.map(r => ({ start_date: r.start_date, end_date: r.end_date || r.start_date })),
        start_date: validRanges[0].start_date,
        end_date: validRanges[validRanges.length - 1].end_date || validRanges[0].start_date,
        rate_category: saavaForm.rate_category,
        disable_social_discount: saavaForm.disable_social_discount,
        disable_individual_rooms: saavaForm.disable_individual_rooms,
        disable_member_discount: saavaForm.disable_member_discount,
        is_blocked: saavaForm.is_blocked,
        min_stay_days: saavaForm.min_stay_days ? parseInt(saavaForm.min_stay_days) : null,
        custom_rule_notice: saavaForm.custom_rule_notice || null,
      };
      await axios.post(`${getApiBaseUrl()}/bookings/saava-dates`, payload, auth());
      setSaavaForm({
        title: "",
        date_ranges: [{ start_date: "", end_date: "" }],
        rate_category: "saava",
        disable_social_discount: true,
        disable_individual_rooms: true,
        disable_member_discount: false,
        is_blocked: false,
        min_stay_days: "",
        custom_rule_notice: "",
      });
      fetchSaavaCards();
    } catch (e: any) {
      setError(e.response?.data?.detail || "Failed to add Saava Card");
    }
  };

  const removeSaavaCard = async (idOrDate: string) => {
    try {
      await axios.delete(`${getApiBaseUrl()}/bookings/saava-dates/${idOrDate}`, auth());
      fetchSaavaCards();
    } catch (e: any) {
      setError(e.response?.data?.detail || "Failed to remove Saava Card");
    }
  };

  const handleRateCellChange = (category: string, index: number, field: string, value: string) => {
    const updated = { ...editableRateLists };
    updated[category][index][field] = value;
    setEditableRateLists({ ...updated });
  };

  const saveCategoryRates = async () => {
    localStorage.setItem("bhavan_custom_rates", JSON.stringify(editableRateLists));
    try {
      await axios.post(`${getApiBaseUrl()}/bookings/category-rates`, editableRateLists, auth());
    } catch (e) {
      console.error("Failed saving category rates to backend", e);
    }
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
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 flex items-center gap-2 mb-1">
          <Settings className="w-6 h-6 text-amber-600" /> Room Pricing & Booking Rules
        </h1>
        <p className="text-sm text-zinc-500">Set date-range prices and minimum-stay requirements for each room.</p>
      </div>

      {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">{error}<button className="ml-2 underline font-bold" onClick={() => setError("")}>dismiss</button></div>}

      <div className="mb-6">
        <label className="text-sm font-medium text-zinc-700 mr-2">Room:</label>
        <select value={selected} onChange={(e) => setSelected(e.target.value)} className="border border-zinc-200 rounded-xl px-3 py-2 text-sm bg-white">
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
            <button className="w-full flex items-center justify-center gap-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg py-2 text-sm font-semibold transition-colors cursor-pointer"><Plus className="w-4 h-4" /> Add Pricing Rule</button>
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
            <button className="w-full flex items-center justify-center gap-1 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg py-2 text-sm font-semibold transition-colors cursor-pointer"><Plus className="w-4 h-4" /> Add Min-stay Rule</button>
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
      <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 pb-4">
          <div>
            <h2 className="font-bold text-zinc-900 text-lg flex items-center gap-2">
              <Settings className="w-5 h-5 text-amber-600" /> Master Rate List Table (दर तालिका)
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">Customize master rate lists for Wedding Saava Days, Other Social Functions, and Free/Charitable Usage.</p>
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
              Save Rate List Table
            </button>
          </div>
        </div>

        {saveSuccess && (
          <div className="p-3 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200">
            ✓ Bhavan rate list table updated successfully! Rates synced across public pages and backend.
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

      {/* Saava & Special Event Cards Manager */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm space-y-6">
        <div>
          <h2 className="font-bold text-zinc-900 text-lg flex items-center gap-2">
            <CalendarRange className="w-5 h-5 text-amber-600" /> Wedding Saava & Special Days Cards Manager (सावा कार्ड्स)
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Create individual date-range cards for Saava & special event windows. Each card links to a Rate List from the table and enforces customizable booking rules.
          </p>
        </div>

        {/* Add Saava Card Form */}
        <form onSubmit={handleAddSaavaCard} className="p-5 bg-amber-50/50 rounded-2xl border border-amber-200/80 space-y-4">
          <h3 className="font-bold text-xs uppercase tracking-wider text-amber-950 flex items-center gap-1.5">
            <Plus className="w-4 h-4 text-amber-600" /> Create New Saava / Special Date Card
          </h3>

          {/* Card Title & Rates Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-zinc-700">Card Title / Occasion *</label>
              <input
                required
                type="text"
                placeholder="e.g. Dev Uthan Ekadashi Saava"
                value={saavaForm.title}
                onChange={(e) => setSaavaForm({ ...saavaForm, title: e.target.value })}
                className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-xs bg-white focus:outline-none focus:border-amber-500 font-semibold"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-zinc-700">Rates To Apply (Pulls Rates From Table) *</label>
              <select
                value={saavaForm.rate_category}
                onChange={(e) => setSaavaForm({ ...saavaForm, rate_category: e.target.value })}
                className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-xs bg-white focus:outline-none focus:border-amber-500 font-semibold"
              >
                <option value="saava">💍 Wedding Saava Days Rate (Table)</option>
                <option value="other_days">🗓️ Other Days Rate (Table)</option>
                <option value="social">👥 Social Functions Rate (Table)</option>
                <option value="free">🎁 Free / Welfare Usage Rate (Table)</option>
              </select>
            </div>
          </div>

          {/* Date Inputs Section with "+ Add Date" Option */}
          <div className="bg-amber-100/40 p-3.5 rounded-xl border border-amber-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-extrabold text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                🗓️ Dates Selection (Multiple Date Inputs for Single Card):
              </label>
              <button
                type="button"
                onClick={addDateRangeRow}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Add Date
              </button>
            </div>

            <div className="space-y-2">
              {saavaForm.date_ranges.map((row, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-white p-2.5 rounded-xl border border-amber-200/90 shadow-2xs">
                  <span className="text-[11px] font-bold text-amber-900 sm:w-16">Date #{idx + 1}:</span>
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">From Date *</span>
                      <input
                        required
                        type="date"
                        value={row.start_date}
                        onChange={(e) => handleDateRangeChange(idx, "start_date", e.target.value)}
                        className="w-full border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:border-amber-500 bg-white"
                      />
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">To Date *</span>
                      <input
                        required
                        type="date"
                        value={row.end_date}
                        onChange={(e) => handleDateRangeChange(idx, "end_date", e.target.value)}
                        className="w-full border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:border-amber-500 bg-white"
                      />
                    </div>
                  </div>
                  {saavaForm.date_ranges.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeDateRangeRow(idx)}
                      className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer self-end sm:self-center"
                      title="Remove Date Input"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-zinc-700">Min Stay Days Requirement (Optional)</label>
            <input
              type="number"
              min="1"
              placeholder="e.g. 2 (forces min 2 days stay)"
              value={saavaForm.min_stay_days}
              onChange={(e) => setSaavaForm({ ...saavaForm, min_stay_days: e.target.value })}
              className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-xs bg-white focus:outline-none focus:border-amber-500 font-semibold max-w-xs"
            />
          </div>

          {/* Customizable Rules Toggles */}
          <div className="space-y-2 pt-2 border-t border-amber-200/60">
            <span className="text-[11px] font-bold text-amber-900 block uppercase tracking-wider">Customizable Card Rules & Restrictions:</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <label className="flex items-center gap-2 p-2 bg-white rounded-xl border border-amber-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={saavaForm.disable_social_discount}
                  onChange={(e) => setSaavaForm({ ...saavaForm, disable_social_discount: e.target.checked })}
                  className="w-4 h-4 text-amber-600 rounded"
                />
                <span className="font-semibold text-zinc-800">🚫 Disable Social Function Rates</span>
              </label>
              <label className="flex items-center gap-2 p-2 bg-white rounded-xl border border-amber-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={saavaForm.disable_individual_rooms}
                  onChange={(e) => setSaavaForm({ ...saavaForm, disable_individual_rooms: e.target.checked })}
                  className="w-4 h-4 text-amber-600 rounded"
                />
                <span className="font-semibold text-zinc-800">🚫 Block Individual Room Bookings</span>
              </label>
              <label className="flex items-center gap-2 p-2 bg-white rounded-xl border border-amber-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={saavaForm.disable_member_discount}
                  onChange={(e) => setSaavaForm({ ...saavaForm, disable_member_discount: e.target.checked })}
                  className="w-4 h-4 text-amber-600 rounded"
                />
                <span className="font-semibold text-zinc-800">🚫 Disable Agrawal Member Discount</span>
              </label>
              <label className="flex items-center gap-2 p-2 bg-white rounded-xl border border-rose-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={saavaForm.is_blocked}
                  onChange={(e) => setSaavaForm({ ...saavaForm, is_blocked: e.target.checked })}
                  className="w-4 h-4 text-rose-600 rounded"
                />
                <span className="font-semibold text-rose-800">🔒 Block All Bhavan Bookings (Maintenance)</span>
              </label>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-zinc-700">Custom Notice Message for Users (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Only full family wedding bookings allowed during Dev Uthan Ekadashi."
              value={saavaForm.custom_rule_notice}
              onChange={(e) => setSaavaForm({ ...saavaForm, custom_rule_notice: e.target.value })}
              className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-xs bg-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <button
            type="submit"
            className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Save Saava Date Card
          </button>
        </form>

        {/* Display Active Saava Cards */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">Active Saava & Special Date Cards ({saavaCards.length})</h3>

          {saavaCards.length === 0 ? (
            <p className="text-xs text-zinc-400 py-3 text-center border border-dashed border-zinc-200 rounded-2xl">
              No Saava date cards added yet. Use the form above to add your first Saava card.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {saavaCards.map((card) => (
                <div key={card.date_id} className="p-4 bg-gradient-to-br from-amber-50/60 to-orange-50/40 rounded-2xl border border-amber-200/90 shadow-sm space-y-3 relative">
                  <div className="flex items-start justify-between gap-2 border-b border-amber-200/60 pb-2.5">
                    <div>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-500 text-white text-[10px] font-extrabold rounded-md uppercase tracking-wider mb-1">
                        💍 {card.rate_category === 'saava' ? 'Wedding Saava' : card.rate_category === 'social' ? 'Social Event' : 'Special Event'}
                      </span>
                      <h4 className="font-bold text-zinc-900 text-sm">{card.title}</h4>
                      
                      {/* Date Ranges Rows List */}
                      <div className="space-y-1 mt-1.5">
                        {card.date_ranges && Array.isArray(card.date_ranges) && card.date_ranges.length > 0 ? (
                          card.date_ranges.map((r: any, idx: number) => (
                            <p key={idx} className="text-xs text-amber-900 font-bold font-mono flex items-center gap-1">
                              <span>🗓️ Row {idx + 1}:</span> {r.start_date} → {r.end_date || r.start_date}
                            </p>
                          ))
                        ) : (
                          <p className="text-xs text-amber-900 font-bold font-mono">
                            🗓️ {card.start_date} → {card.end_date}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeSaavaCard(card.date_id)}
                      className="p-1.5 text-amber-500 hover:text-rose-600 bg-white rounded-xl border border-amber-200 hover:border-rose-300 transition-colors cursor-pointer"
                      title="Delete Saava Card"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Active Rules */}
                  <div className="flex flex-wrap gap-1.5 text-[10px]">
                    {card.is_blocked && <span className="px-2 py-0.5 bg-rose-100 text-rose-800 font-bold rounded-lg border border-rose-200">🔒 Fully Blocked</span>}
                    {card.disable_social_discount && <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-bold rounded-lg border border-amber-200">🚫 No Social Rates</span>}
                    {card.disable_individual_rooms && <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-bold rounded-lg border border-amber-200">🚫 No Guest Rooms</span>}
                    {card.disable_member_discount && <span className="px-2 py-0.5 bg-purple-100 text-purple-800 font-bold rounded-lg border border-purple-200">🚫 No Member Discount</span>}
                    {card.min_stay_days && <span className="px-2 py-0.5 bg-blue-100 text-blue-800 font-bold rounded-lg border border-blue-200">⏱️ Min {card.min_stay_days} Days Stay</span>}
                  </div>

                  {card.custom_rule_notice && (
                    <p className="text-[11px] text-zinc-600 italic bg-white/80 p-2 rounded-xl border border-amber-100">
                      &quot;{card.custom_rule_notice}&quot;
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
