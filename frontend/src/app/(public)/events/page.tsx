"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Calendar, MapPin, Tag, Clock, Search, ArrowRight, Info, Ticket } from "lucide-react";
import { motion } from "framer-motion";
import axios from "axios";
import { getApiBaseUrl } from "@/utils/api";

// Mock data as fallback
const mockEvents = [
  {
    event_id: "1",
    title: "Maharaja Agrasen Jayanti Mahotsav 2026",
    description: "Annual grand celebration of Maharaja Agrasen Jayanti with cultural programs, awards, and food.",
    venue: "Agrawal Bhavan Main Hall",
    category: "cultural",
    start_datetime: "2026-10-15T10:00:00Z",
    pass_price: 150,
    status: "upcoming",
  },
  {
    event_id: "2",
    title: "Shri Krishna Janmashtami Pooja",
    description: "Divine pooja, bhajans, and kids Jhanki competition followed by Maha Prasad.",
    venue: "Bhavan Temple Ground",
    category: "religious",
    start_datetime: "2026-08-28T18:00:00Z",
    pass_price: 0,
    status: "upcoming",
  },
  {
    event_id: "3",
    title: "Agrawal Youth Cricket League",
    description: "Inter-colony cricket tournament for Samaj youths. Registrations open.",
    venue: "Samaj Sports Ground",
    category: "sports",
    start_datetime: "2026-11-05T08:00:00Z",
    pass_price: 200,
    status: "upcoming",
  }
];

export default function EventsPage() {
  const [events, setEvents] = useState<any[]>(mockEvents);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(`${getApiBaseUrl()}/events`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (response.data && response.data.length > 0) {
          setEvents(response.data);
        }
      } catch (err) {
        console.log("Could not fetch events from server, using fallback data.");
      }
    };
    fetchEvents();
  }, []);

  const filteredEvents = events.filter((e) => {
    const matchesSearch = e.title.toLowerCase().includes(search.toLowerCase()) || 
                          e.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === "all" || e.category === category;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="py-20 px-4 sm:px-6 lg:px-8 bg-zinc-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-amber-500 to-rose-600 bg-clip-text text-transparent">
            Community Events
          </h1>
          <p className="max-w-xl mx-auto text-sm text-zinc-500">
            Participate in cultural celebrations, poojas, tournaments, and directory meetups. Get passes online.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between border-b border-zinc-200/50 pb-6">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search events..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-full border border-zinc-200 bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-shadow"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {["all", "cultural", "religious", "sports", "social", "educational"].map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-colors ${
                  category === cat
                    ? "bg-amber-500 text-white"
                    : "bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
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
              className="p-6 rounded-3xl border border-zinc-200/50 bg-white flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow group"
            >
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="inline-flex px-2.5 py-0.5 rounded-full text-2xs font-semibold uppercase bg-amber-500/10 text-amber-600 border border-amber-500/20">
                    {evt.category}
                  </span>
                  {evt.visibility === "members_only" && (
                    <span className="inline-flex px-2.5 py-0.5 rounded-full text-2xs font-semibold uppercase bg-rose-500/10 text-rose-600 border border-rose-500/20">
                      Members Only
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-zinc-900 group-hover:text-amber-500 transition-colors">
                    {evt.title}
                  </h3>
                  <p className="text-xs text-zinc-500 line-clamp-3 leading-relaxed">
                    {evt.description}
                  </p>
                </div>

                <div className="space-y-2 pt-2 border-t border-zinc-100 text-xs text-zinc-500">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-zinc-400" />
                    <span>{new Date(evt.start_datetime).toLocaleDateString("en-US", { dateStyle: "medium" })}</span>
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

              <div className="pt-6 border-t border-zinc-100 mt-6 flex items-center gap-3">
                <Link
                  href={`/events/${evt.event_id}`}
                  className="flex-1 py-2.5 px-3 border border-zinc-300 hover:border-amber-500 hover:bg-amber-50 text-zinc-700 hover:text-amber-700 text-xs font-semibold rounded-xl transition-all text-center flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Info className="w-4 h-4 text-amber-500" /> View Details
                </Link>
                <Link
                  href={`/events/${evt.event_id}`}
                  className="flex-1 py-2.5 px-3 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold rounded-xl transition-all text-center flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Ticket className="w-4 h-4 text-amber-400" /> Book a Ticket
                </Link>
              </div>
            </motion.div>
          ))}
        </div>

        {filteredEvents.length === 0 && (
          <div className="text-center py-20 text-zinc-500">
            No events found matching your search.
          </div>
        )}
      </div>
    </div>
  );
}
