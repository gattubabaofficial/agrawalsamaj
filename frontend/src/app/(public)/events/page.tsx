"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Calendar, MapPin, Clock, Search, Info, Ticket } from "lucide-react";
import { motion } from "framer-motion";
import axios from "axios";
import { getApiBaseUrl } from "@/utils/api";
import { formatDateDDMonthYYYY } from "@/utils/date";

// Mock data as fallback
const mockEvents = [
  {
    event_id: "06eb74adc8744fca9fd6b812ecf84596",
    title: "Maharaja Agrasen Jayanti Mahotsav 2026",
    description: "Annual grand celebration of Maharaja Agrasen Jayanti with cultural programs, awards, and food.",
    banner_url: "",
    venue: "Agrasen Bhawan Main Hall",
    category: "cultural",
    start_datetime: "2026-10-15T10:00:00Z",
    pass_price: 150,
    status: "upcoming",
    visibility: "open_to_all",
    timeline: []
  },
  {
    event_id: "0fbbe5b2addf48cdbc5bb8e8f2b49c8e",
    title: "Shri Krishna Janmashtami Pooja",
    description: "Divine pooja, bhajans, and kids Jhanki competition followed by Maha Prasad.",
    banner_url: "",
    venue: "Bhavan Temple Ground",
    category: "religious",
    start_datetime: "2026-08-28T18:00:00Z",
    pass_price: 0,
    status: "upcoming",
    visibility: "open_to_all",
    timeline: []
  },
  {
    event_id: "85ab391e784f421eb7687db150b0dce6",
    title: "Free Eye Check-up & Medical Camp",
    description: "Free eye checkup, blood pressure, sugar testing & consultation for all samaj members.",
    banner_url: "",
    venue: "Samaj Medical Center",
    category: "social",
    start_datetime: "2026-11-05T08:00:00Z",
    pass_price: 0,
    status: "upcoming",
    visibility: "open_to_all",
    timeline: []
  }
];

export default function EventsPage() {
  const [events, setEvents] = useState<any[]>(mockEvents);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const res = await axios.get(`${getApiBaseUrl()}/events`);
      if (res.data && res.data.length > 0) {
        setEvents(res.data);
      }
    } catch (error) {
      console.error("Failed to fetch events from API, falling back to mock events.", error);
    }
  };

  const filteredEvents = events.filter((evt) => {
    const matchesSearch =
      evt.title.toLowerCase().includes(search.toLowerCase()) ||
      (evt.description || "").toLowerCase().includes(search.toLowerCase()) ||
      (evt.venue || "").toLowerCase().includes(search.toLowerCase());

    const matchesCategory = category === "all" || evt.category === category;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="relative py-20 px-4 sm:px-6 lg:px-8 min-h-screen overflow-hidden">
      <div className="absolute inset-0 animated-gradient-mesh opacity-20 -z-10" />
      <div className="max-w-6xl mx-auto space-y-12">
        
        {/* Header */}
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <h1 className="text-3xl sm:text-5xl font-extrabold text-zinc-900 tracking-tight leading-tight">
            Samaj <span className="text-amber-500">Events</span> &amp; Gatherings
          </h1>
          <p className="text-sm sm:text-base text-zinc-500 leading-relaxed">
            Join and participate in cultural, religious, sports, and educational functions organized by Agrawal Samaj Mansrovar Jaipur. Book passes online instantly.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white/70 backdrop-blur-md p-4 rounded-3xl border border-zinc-200/60 shadow-sm">
          <div className="relative max-w-md w-full">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search events by title, venue or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-zinc-200 rounded-xl text-xs bg-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex flex-wrap gap-1.5 self-stretch md:self-auto overflow-x-auto pb-1 md:pb-0">
            {["all", "cultural", "religious", "sports", "social", "educational"].map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-4 py-2 rounded-xl text-2xs font-bold uppercase transition-all whitespace-nowrap cursor-pointer ${
                  category === cat
                    ? "bg-amber-500 text-white shadow-md shadow-amber-500/20"
                    : "bg-white border border-zinc-200 text-zinc-600 hover:border-amber-300 hover:text-amber-600"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Event List */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {filteredEvents.map((evt, idx) => (
            <motion.div
              key={evt.event_id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.05 }}
              className="rounded-3xl border border-zinc-200/50 bg-white flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow group overflow-hidden"
            >
              <div>
                {/* Event Image Banner */}
                <div className="h-44 bg-zinc-100 relative overflow-hidden">
                  {evt.banner_url ? (
                    <img
                      src={evt.banner_url.startsWith('http') || evt.banner_url.startsWith('https') ? evt.banner_url : `${getApiBaseUrl().replace('/api/v1', '')}${evt.banner_url}`}
                      alt={evt.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-400/20 to-rose-400/20 flex items-center justify-center">
                      <span className="text-4xl">🎉</span>
                    </div>
                  )}
                  <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-2xs font-semibold uppercase bg-white/95 text-amber-700 shadow-sm border border-amber-100">
                      {evt.category}
                    </span>
                    {evt.visibility === "members_only" && (
                      <span className="px-2.5 py-0.5 rounded-full text-2xs font-semibold uppercase bg-rose-500 text-white shadow-sm border border-rose-600">
                        Members Only
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-zinc-900 group-hover:text-amber-500 transition-colors line-clamp-1">
                      {evt.title}
                    </h3>
                    <p className="text-xs text-zinc-500 line-clamp-3 leading-relaxed whitespace-pre-wrap">
                      {evt.description?.split(/(\*[^*]+\*)/g).map((part: string, i: number) => {
                        if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
                          return <strong key={i} className="font-bold text-zinc-900">{part.slice(1, -1)}</strong>;
                        }
                        return <span key={i}>{part}</span>;
                      })}
                    </p>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-zinc-100 text-xs text-zinc-500">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-zinc-400" />
                      <span>{formatDateDDMonthYYYY(evt.start_datetime)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-zinc-400" />
                      <span>{new Date(evt.start_datetime).toLocaleTimeString("en-US", { timeStyle: "short" })}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-zinc-400" />
                      <span className="truncate">{evt.venue}</span>
                    </div>
                  </div>

                  {evt.timeline && evt.timeline.length > 0 && (
                    <div className="pt-3 border-t border-zinc-100 space-y-1.5">
                      <p className="text-xs font-semibold text-zinc-700">Schedule:</p>
                      {evt.timeline.slice(0, 3).map((item: any, i: number) => (
                        <div key={i} className="flex gap-2 text-xs text-zinc-600">
                          <span className="font-semibold text-amber-600 w-12 flex-shrink-0">{item.time}</span>
                          <span className="truncate">{item.title}</span>
                        </div>
                      ))}
                      {evt.timeline.length > 3 && (
                        <p className="text-xs text-zinc-400 italic">+{evt.timeline.length - 3} more activities</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 pt-0 border-t border-zinc-100 mt-6 flex items-center gap-3 bg-zinc-50/50">
                <Link
                  href={`/events/${evt.event_id}`}
                  className="flex-1 py-2.5 px-3 border border-zinc-300 hover:border-amber-500 hover:bg-amber-50 text-zinc-700 hover:text-amber-700 text-2xs font-bold rounded-xl transition-all text-center flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Info className="w-4 h-4 text-amber-500" /> View Details
                </Link>
                <Link
                  href={`/events/${evt.event_id}?book=true`}
                  className="flex-1 py-2.5 px-3 bg-zinc-900 hover:bg-zinc-800 text-white text-2xs font-bold rounded-xl transition-all text-center flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Ticket className="w-4 h-4 text-amber-400" /> Book passes
                </Link>
              </div>
            </motion.div>
          ))}
          {filteredEvents.length === 0 && (
            <div className="col-span-full py-16 text-center text-zinc-500 bg-white border border-zinc-200 border-dashed rounded-3xl">
              No matching events found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
