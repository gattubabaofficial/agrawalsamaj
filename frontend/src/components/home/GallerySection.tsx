"use client";

import { useState } from "react";
import { Image as ImageIcon, Video, Grid, Film, Camera } from "lucide-react";
import { motion } from "framer-motion";

const mockMedia = [
  { id: "1", title: "Agrasen Jayanti Cultural Dance", type: "photo", url: "/gallery/dance.jpg", date: "June 2025" },
  { id: "2", title: "Maharaja Agrasen Puja Aarti", type: "photo", url: "/gallery/puja.jpg", date: "June 2025" },
  { id: "3", title: "Youth Sports Cricket Tournament Winners", type: "photo", url: "/gallery/cricket.jpg", date: "May 2025" },
  { id: "4", title: "Samaj Sammelan Opening Speech Highlights", type: "video", url: "/gallery/highlights.mp4", date: "April 2025" },
  { id: "5", title: "Blood Donation Camp Volunteers Group", type: "photo", url: "/gallery/blood_donation.jpg", date: "March 2025" },
  { id: "6", title: "AC Bhavan Main Hall Architecture Showcase", type: "photo", url: "/gallery/hall.jpg", date: "January 2025" }
];

export default function GallerySection() {
  const [filter, setFilter] = useState("all");

  const filteredMedia = mockMedia.filter((m) => filter === "all" || m.type === filter);

  return (
    <section className="py-24 bg-zinc-50/50 border-t border-zinc-200/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Header */}
        <div className="text-center space-y-4">
          <h2 className="text-3xl sm:text-4xl font-bold text-zinc-900">
            Media Gallery & Highlights
          </h2>
          <p className="max-w-2xl mx-auto text-zinc-600">
            A visual capture of our community events, celebrations, sports meets, and social welfare programs.
          </p>
        </div>

        {/* Filters */}
        <div className="flex gap-2 items-center justify-center border-b border-zinc-200/50 pb-6">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 transition-colors ${
              filter === "all"
                ? "bg-amber-500 text-white"
                : "bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
            }`}
          >
            <Grid className="w-3.5 h-3.5" /> All Media
          </button>
          <button
            onClick={() => setFilter("photo")}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 transition-colors ${
              filter === "photo"
                ? "bg-amber-500 text-white"
                : "bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
            }`}
          >
            <Camera className="w-3.5 h-3.5" /> Photos
          </button>
          <button
            onClick={() => setFilter("video")}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 transition-colors ${
              filter === "video"
                ? "bg-amber-500 text-white"
                : "bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
            }`}
          >
            <Film className="w-3.5 h-3.5" /> Videos
          </button>
        </div>

        {/* Media Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {filteredMedia.map((media, idx) => (
            <motion.div
              key={media.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: idx * 0.05 }}
              className="group overflow-hidden rounded-3xl border border-zinc-200/50 bg-white shadow-sm flex flex-col hover:shadow-md hover:border-amber-500/20 transition-all duration-300"
            >
              {/* Media placeholder */}
              <div className="relative aspect-video w-full bg-zinc-100 flex flex-col items-center justify-center border-b border-zinc-100 overflow-hidden">
                {media.type === "video" ? (
                  <Video className="w-12 h-12 text-zinc-400 group-hover:scale-110 transition-transform duration-300" />
                ) : (
                  <ImageIcon className="w-12 h-12 text-zinc-400 group-hover:scale-110 transition-transform duration-300" />
                )}
                <span className="absolute bottom-3 right-3 text-[10px] font-semibold uppercase px-2.5 py-0.5 rounded-full bg-zinc-900/60 text-white backdrop-blur-sm">
                  {media.type}
                </span>
              </div>

              {/* Title & Info */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-2">
                <h3 className="font-bold text-sm text-zinc-900 leading-snug line-clamp-2 group-hover:text-amber-500 transition-colors">
                  {media.title}
                </h3>
                <span className="text-[10px] text-zinc-400 block font-medium">{media.date}</span>
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}
