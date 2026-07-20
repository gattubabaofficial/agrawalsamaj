"use client";

import { useState } from "react";
import { Image as ImageIcon, Video, Folder, ArrowLeft, ChevronLeft, ChevronRight, X, Download, Eye } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const albums = [
  {
    id: "yog_divas",
    title: "Yog Divas",
    coverUrl: "/gallery/yog_divas/yoga_1.jpg",
    itemsCount: 7,
    items: [
      { id: "y1", url: "/gallery/yog_divas/yoga_1.jpg", filename: "yoga_1.jpg", type: "photo" },
      { id: "y2", url: "/gallery/yog_divas/yoga_2.jpg", filename: "yoga_2.jpg", type: "photo" },
      { id: "y3", url: "/gallery/yog_divas/yoga_3.jpg", filename: "yoga_3.jpg", type: "photo" },
      { id: "y4", url: "/gallery/yog_divas/yoga_4.jpg", filename: "yoga_4.jpg", type: "photo" },
      { id: "y5", url: "/gallery/yog_divas/yoga_5.jpg", filename: "yoga_5.jpg", type: "photo" },
      { id: "y6", url: "/gallery/yog_divas/yoga_6.jpg", filename: "yoga_6.jpg", type: "photo" },
      { id: "y7", url: "/gallery/yog_divas/yoga_7.jpg", filename: "yoga_7.jpg", type: "photo" }
    ]
  },
  {
    id: "community_highlights",
    title: "Community Highlights",
    coverUrl: "/gallery/dance.jpg",
    itemsCount: 6,
    items: [
      { id: "c1", url: "/gallery/dance.jpg", filename: "dance.jpg", type: "photo" },
      { id: "c2", url: "/gallery/puja.jpg", filename: "puja.jpg", type: "photo" },
      { id: "c3", url: "/gallery/cricket.jpg", filename: "cricket.jpg", type: "photo" },
      { id: "c4", url: "/gallery/highlights.mp4", filename: "highlights.mp4", type: "video" },
      { id: "c5", url: "/gallery/blood_donation.jpg", filename: "blood_donation.jpg", type: "photo" },
      { id: "c6", url: "/gallery/hall.jpg", filename: "hall.jpg", type: "photo" }
    ]
  }
];

// Robust download function
const triggerDownload = async (url: string, filename: string) => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  } catch (error) {
    // Fallback: Open in new tab/window for download
    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

function AlbumCard({ album, onClick }: { album: typeof albums[0]; onClick: () => void }) {
  const [hasError, setHasError] = useState(false);

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      className="relative group cursor-pointer max-w-sm mx-auto w-full"
    >
      {/* Layered Card Stack Background */}
      <div className="absolute inset-0 bg-white border border-zinc-200/50 rounded-3xl translate-x-2.5 translate-y-2.5 group-hover:translate-x-3.5 group-hover:translate-y-3.5 transition-all duration-300 shadow-sm" />
      <div className="absolute inset-0 bg-white border border-zinc-200/50 rounded-3xl translate-x-1.5 translate-y-1.5 group-hover:translate-x-2 group-hover:translate-y-2 transition-all duration-300 shadow-sm" />

      {/* Main Folder Card */}
      <div className="relative bg-white border border-zinc-200/60 rounded-3xl shadow-md overflow-hidden flex flex-col hover:border-amber-500/30 transition-all duration-300">
        <div className="relative aspect-video w-full bg-zinc-50 flex flex-col items-center justify-center overflow-hidden border-b border-zinc-100">
          {album.coverUrl && !hasError ? (
            <img
              src={album.coverUrl}
              alt={album.title}
              onError={() => setHasError(true)}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <Folder className="w-12 h-12 text-amber-500/80 group-hover:scale-110 transition-transform duration-300" />
          )}
          <span className="absolute bottom-3 right-3 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-amber-500 text-white shadow-sm z-10 flex items-center gap-1.5">
            <Folder className="w-3.5 h-3.5" /> Folder
          </span>
        </div>

        <div className="p-5 space-y-1.5">
          <h3 className="font-extrabold text-base text-zinc-900 group-hover:text-amber-600 transition-colors">
            {album.title}
          </h3>
          <p className="text-xs text-zinc-500 font-medium flex items-center gap-1">
            {album.itemsCount} {album.itemsCount === 1 ? "Image" : "Images"}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function GalleryItem({
  media,
  idx,
  onView,
  onDownload
}: {
  media: typeof albums[0]["items"][0];
  idx: number;
  onView: () => void;
  onDownload: (e: React.MouseEvent) => void;
}) {
  const [hasError, setHasError] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: idx * 0.04 }}
      className="group overflow-hidden rounded-3xl border border-zinc-200/50 bg-white shadow-sm aspect-video w-full relative hover:shadow-md hover:border-amber-500/20 transition-all duration-300"
    >
      {/* Media Content */}
      <div className="w-full h-full bg-zinc-50 flex flex-col items-center justify-center overflow-hidden">
        {media.type === "photo" && media.url && !hasError ? (
          <img
            src={media.url}
            alt="Gallery Item"
            onError={() => setHasError(true)}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : media.type === "video" ? (
          <Video className="w-12 h-12 text-zinc-400" />
        ) : (
          <ImageIcon className="w-12 h-12 text-zinc-400" />
        )}
      </div>

      {/* Hover Overlay with Action Buttons */}
      <div className="absolute inset-0 bg-zinc-950/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-4 z-20">
        <button
          onClick={onView}
          className="p-3 rounded-full bg-white text-zinc-900 hover:bg-amber-500 hover:text-white shadow transition-all duration-200 cursor-pointer"
          title="View Large"
        >
          <Eye className="w-5 h-5" />
        </button>
        <button
          onClick={onDownload}
          className="p-3 rounded-full bg-white text-zinc-900 hover:bg-amber-500 hover:text-white shadow transition-all duration-200 cursor-pointer"
          title="Download"
        >
          <Download className="w-5 h-5" />
        </button>
      </div>

      {/* Type Badge */}
      <span className="absolute bottom-3 right-3 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-zinc-950/60 text-white backdrop-blur-sm z-10">
        {media.type}
      </span>
    </motion.div>
  );
}

export default function GallerySection() {
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null);
  const [activePhotoIdx, setActivePhotoIdx] = useState<number | null>(null);

  const currentAlbum = albums.find((a) => a.id === selectedAlbumId);
  const currentItems = currentAlbum ? currentAlbum.items : [];

  return (
    <section className="py-24 bg-zinc-50/50 border-t border-zinc-200/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Header */}
        <div className="text-center space-y-4">
          <h2 className="text-3xl sm:text-4xl font-bold text-zinc-900">
            Media Gallery & Highlights
          </h2>
          <p className="max-w-2xl mx-auto text-zinc-600">
            Explore our community events, celebrations, sports meets, and social welfare programs.
          </p>
        </div>

        {/* View Layout Switcher */}
        <div>
          {selectedAlbumId === null ? (
            /* Album Folder List Grid */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 max-w-4xl mx-auto pt-6">
              {albums.map((album) => (
                <AlbumCard
                  key={album.id}
                  album={album}
                  onClick={() => setSelectedAlbumId(album.id)}
                />
              ))}
            </div>
          ) : (
            /* Inside Selected Album Folder */
            <div className="space-y-6">
              {/* Back Button */}
              <div className="flex justify-start">
                <button
                  onClick={() => setSelectedAlbumId(null)}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-600 hover:text-amber-600 transition-all cursor-pointer bg-white px-5 py-2.5 rounded-2xl border border-zinc-200/80 shadow-sm hover:shadow-md"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Gallery
                </button>
              </div>

              {/* Grid of Items in Album - Clean Images Only, No Headings */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 pt-2">
                {currentItems.map((media, idx) => (
                  <GalleryItem
                    key={media.id}
                    media={media}
                    idx={idx}
                    onView={() => setActivePhotoIdx(idx)}
                    onDownload={(e) => {
                      e.stopPropagation();
                      triggerDownload(media.url, media.filename);
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {activePhotoIdx !== null && currentAlbum && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-zinc-950/95 backdrop-blur-md flex flex-col items-center justify-center select-none"
          >
            {/* Close button */}
            <button
              onClick={() => setActivePhotoIdx(null)}
              className="absolute top-6 right-6 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors cursor-pointer z-55"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Left Navigation Arrow */}
            {activePhotoIdx > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActivePhotoIdx(activePhotoIdx - 1);
                }}
                className="absolute left-6 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors cursor-pointer z-55"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            {/* Right Navigation Arrow */}
            {activePhotoIdx < currentAlbum.items.length - 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActivePhotoIdx(activePhotoIdx + 1);
                }}
                className="absolute right-6 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors cursor-pointer z-55"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}

            {/* Centered Media */}
            <div className="max-w-4xl max-h-[75vh] px-4 flex items-center justify-center">
              {currentAlbum.items[activePhotoIdx].type === "photo" && currentAlbum.items[activePhotoIdx].url ? (
                <motion.img
                  key={activePhotoIdx}
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.25 }}
                  src={currentAlbum.items[activePhotoIdx].url}
                  alt="Gallery Lightbox"
                  className="max-w-full max-h-[75vh] object-contain rounded-2xl shadow-2xl"
                />
              ) : (
                <div className="w-96 h-64 bg-zinc-800 rounded-2xl flex items-center justify-center">
                  <Video className="w-16 h-16 text-zinc-600" />
                </div>
              )}
            </div>

            {/* Controls Bar at bottom */}
            <div className="text-center mt-6 space-y-3 px-4 max-w-2xl flex flex-col items-center">
              <span className="text-zinc-400 text-sm">
                Image {activePhotoIdx + 1} of {currentAlbum.items.length}
              </span>
              <button
                onClick={() => triggerDownload(currentAlbum.items[activePhotoIdx].url, currentAlbum.items[activePhotoIdx].filename)}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm shadow-md transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" /> Download Photo
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
