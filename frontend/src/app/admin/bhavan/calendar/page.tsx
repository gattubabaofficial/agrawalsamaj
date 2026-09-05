"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CalendarRange, ChevronLeft, ChevronRight, Info, Layers, ArrowLeft } from "lucide-react";
import { getApiBaseUrl, safeFetch } from "@/utils/api";

interface CalendarDay {
  date: string;
  closed: boolean;
  public_message?: string;
  effective_layers: { id: string; label: string; applied_at: string }[];
  winning_rule_label: string;
}

export default function AdminCalendarPage() {
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const startStr = start.toISOString().split("T")[0];
    const endStr = end.toISOString().split("T")[0];

    setStartDate(startStr);
    setEndDate(endStr);
    fetchCalendar(startStr, endStr);
  }, []);

  const fetchCalendar = async (s: string, e: string) => {
    setLoading(true);
    const token = localStorage.getItem("token");
    try {
      const res = await safeFetch(
        `${getApiBaseUrl()}/admin/bhavan/calendar?start_date=${s}&end_date=${e}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const data = await res.json();
        setCalendarDays(data);
      }
    } catch (err) {
      console.error("Calendar fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Availability Calendar</h1>
          <p className="text-xs text-zinc-500">Effective rule resolution & layer stack inspector per date</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-1.5 border border-zinc-200 rounded-lg text-xs"
          />
          <span className="text-xs text-zinc-400">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-1.5 border border-zinc-200 rounded-lg text-xs"
          />
          <button
            onClick={() => fetchCalendar(startDate, endDate)}
            className="px-4 py-1.5 bg-amber-500 text-white font-bold rounded-lg text-xs hover:bg-amber-400"
          >
            Load
          </button>
        </div>
      </div>

      {/* Main Layout: Calendar Grid + Layer Inspector Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Date Grid */}
        <div className="lg:col-span-2 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          {loading ? (
            <div className="py-20 text-center text-xs text-zinc-400">Loading calendar dates...</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
              {calendarDays.map((day) => {
                const dayNum = new Date(day.date).getDate();
                const isSelected = selectedDay?.date === day.date;
                return (
                  <div
                    key={day.date}
                    onClick={() => setSelectedDay(day)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all hover:shadow-md flex flex-col justify-between h-24 ${
                      isSelected
                        ? "border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/20"
                        : day.closed
                        ? "border-rose-200 bg-rose-50/40"
                        : day.winning_rule_label !== "Normal Day"
                        ? "border-amber-200 bg-amber-50/40"
                        : "border-zinc-200 bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-zinc-900 text-sm">{dayNum}</span>
                      {day.closed && (
                        <span className="text-[9px] font-bold uppercase bg-rose-500 text-white px-1.5 py-0.5 rounded">CLOSED</span>
                      )}
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-zinc-700 truncate">{day.winning_rule_label}</p>
                      <p className="text-[9px] text-zinc-400 mt-0.5">{day.effective_layers.length} rule layer(s)</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Layer Inspector Panel */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-zinc-100 pb-3">
            <Layers className="w-5 h-5 text-amber-500" />
            <h3 className="font-bold text-zinc-900 text-base">Date Layer Inspector</h3>
          </div>

          {selectedDay ? (
            <div className="space-y-4 text-xs">
              <div>
                <p className="text-zinc-400 font-semibold uppercase text-[10px]">Selected Date</p>
                <p className="font-extrabold text-zinc-900 text-base mt-0.5">{selectedDay.date}</p>
              </div>

              <div>
                <p className="text-zinc-400 font-semibold uppercase text-[10px]">Effective Winning Rule</p>
                <p className="font-bold text-amber-600 text-sm mt-0.5">{selectedDay.winning_rule_label}</p>
              </div>

              {selectedDay.public_message && (
                <div className="p-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-800">
                  <p className="font-bold text-[10px] uppercase">Public Customer Message</p>
                  <p className="mt-1">{selectedDay.public_message}</p>
                </div>
              )}

              <div className="border-t border-zinc-100 pt-3">
                <p className="text-zinc-400 font-semibold uppercase text-[10px] mb-2">Applied Layer Priority Stack (Oldest to Newest)</p>
                {selectedDay.effective_layers.length === 0 ? (
                  <p className="text-zinc-500 italic">No custom rules applied. Reverting to base defaults.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedDay.effective_layers.map((layer, idx) => (
                      <div key={layer.id} className="p-3 rounded-lg border border-zinc-200 bg-zinc-50 flex items-center justify-between">
                        <div>
                          <p className="font-bold text-zinc-900">{idx + 1}. {layer.label}</p>
                          <p className="text-[10px] text-zinc-400 mt-0.5">Applied: {new Date(layer.applied_at).toLocaleString()}</p>
                        </div>
                        {idx === selectedDay.effective_layers.length - 1 && (
                          <span className="text-[9px] font-bold uppercase bg-amber-500 text-white px-2 py-0.5 rounded">WINNER</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="py-16 text-center text-xs text-zinc-400">Click any date in the calendar to inspect its full override layer stack.</div>
          )}
        </div>

      </div>

      {/* Bottom Navigation & Actions Bar */}
      <div className="pt-4 border-t border-zinc-200 flex items-center justify-between bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm">
        <Link
          href="/admin/bhavan"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-300 bg-white hover:bg-zinc-50 text-xs font-bold text-zinc-700 shadow-sm transition-all"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Bhavan Overview
        </Link>
      </div>
    </div>
  );
}
