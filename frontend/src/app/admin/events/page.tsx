"use client";

import { CalendarPlus, MapPin, Users, Edit, Trash2 } from "lucide-react";

export default function AdminEventsPage() {
  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Event Management</h1>
          <p className="text-sm text-zinc-500 mt-1">Create and manage upcoming events.</p>
        </div>
        <button className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors flex items-center gap-2">
          <CalendarPlus className="w-4 h-4" /> Create Event
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Event Card */}
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden flex flex-col">
          <div className="h-40 bg-zinc-100 relative">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-rose-400 opacity-80 mix-blend-multiply"></div>
            <div className="absolute inset-0 p-4 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="px-2.5 py-1 bg-white/20 backdrop-blur-sm text-white text-xs font-bold rounded-full">Active</span>
                <span className="px-2.5 py-1 bg-white/90 text-zinc-900 text-xs font-bold rounded-full">₹1,000 / Pass</span>
              </div>
              <h3 className="text-xl font-bold text-white leading-tight">Diwali Milan Samaroh</h3>
            </div>
          </div>
          
          <div className="p-5 flex-1 flex flex-col">
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-2 text-sm text-zinc-600">
                <CalendarPlus className="w-4 h-4 text-zinc-400" />
                <span>Oct 24, 2024 • 6:00 PM</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-zinc-600">
                <MapPin className="w-4 h-4 text-zinc-400" />
                <span>Agrawal Bhavan, Main Hall</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-zinc-600">
                <Users className="w-4 h-4 text-zinc-400" />
                <span>150 / 300 Passes Sold</span>
              </div>
            </div>

            <div className="mt-auto border-t border-zinc-100 pt-4 flex items-center justify-between">
              <button className="text-sm font-semibold text-amber-600 hover:text-amber-700 transition-colors">
                View Registrations
              </button>
              <div className="flex gap-2">
                <button className="p-1.5 text-zinc-400 hover:text-zinc-600 rounded bg-zinc-50 transition-colors"><Edit className="w-4 h-4" /></button>
                <button className="p-1.5 text-zinc-400 hover:text-red-600 rounded bg-zinc-50 transition-colors"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
