"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Search, Tag, Heart, MessageCircle, Eye, Clock, ArrowRight, BookOpen, Upload, X, FileText } from "lucide-react";
import { getApiBaseUrl } from "@/utils/api";

interface Blog {
  blog_id: string;
  title: string;
  slug: string;
  content_preview: string;
  cover_image_url: string | null;
  tags: string[];
  author: { first_name: string; surname: string; profile_photo: string | null } | null;
  like_count: number;
  comment_count: number;
  views: number;
  created_at: string;
}

function timeAgo(dateStr: string) {
  if (!dateStr.endsWith('Z')) dateStr += 'Z';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function BlogPage() {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const PER_PAGE = 9;

  const allTags = Array.from(new Set(blogs.flatMap((b) => b.tags || [])));

  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newCover, setNewCover] = useState("");
  const [newTags, setNewTags] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [newPdf, setNewPdf] = useState("");
  const [pdfUploading, setPdfUploading] = useState(false);
  // Guest author fields & OTP verification
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [blogStep, setBlogStep] = useState<"details" | "otp">("details");
  const [blogOtp, setBlogOtp] = useState("");
  const [blogSendingOtp, setBlogSendingOtp] = useState(false);
  const [blogOtpError, setBlogOtpError] = useState("");

  const handleSendBlogOtp = async () => {
    if (!newTitle.trim() || !newContent.trim()) {
      alert("Blog Title and Content are required.");
      return;
    }
    if (!guestPhone.trim()) {
      alert("Mobile number is required for OTP verification when writing a blog.");
      return;
    }
    setBlogSendingOtp(true);
    setBlogOtpError("");
    try {
      const res = await fetch(`${getApiBaseUrl()}/auth/phone/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: guestPhone.trim() })
      });
      if (res.ok) {
        setBlogStep("otp");
      } else {
        const err = await res.json().catch(() => null);
        alert(err?.detail || "Failed to send OTP to your phone number.");
      }
    } catch {
      alert("Failed to send OTP to your phone number.");
    } finally {
      setBlogSendingOtp(false);
    }
  };

  const handleCreateBlogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;
    if (!blogOtp.trim() || blogOtp.trim().length !== 6) {
      setBlogOtpError("Please enter the 6-digit verification OTP code.");
      return;
    }
    setIsSubmitting(true);
    setBlogOtpError("");
    try {
      const tagsList = newTags.split(",").map(t => t.trim()).filter(Boolean);
      const body: Record<string, unknown> = {
        title: newTitle.trim(),
        content: newContent.trim(),
        cover_image_url: newCover.trim() || null,
        pdf_url: newPdf.trim() || null,
        tags: tagsList,
        status: "published",
        guest_name: guestName.trim() || "Community Member",
        guest_email: guestEmail.trim() || null,
        guest_phone: guestPhone.trim(),
        otp: blogOtp.trim(),
      };
      const res = await fetch(`${getApiBaseUrl()}/blog/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        setShowCreateModal(false);
        setNewTitle(""); setNewContent(""); setNewCover(""); setNewPdf(""); setNewTags("");
        setGuestName(""); setGuestEmail(""); setGuestPhone(""); setBlogOtp(""); setBlogStep("details");
        fetchBlogs(1);
      } else {
        const errData = await res.json().catch(() => null);
        setBlogOtpError(errData?.detail || "Failed to publish blog post.");
      }
    } catch (err) {
      setBlogOtpError("Failed to publish blog post.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${getApiBaseUrl()}/blog/upload`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setNewCover(data.url);
      } else {
        alert("Failed to upload image.");
      }
    } catch {
      alert("Failed to upload image.");
    } finally {
      setCoverUploading(false);
    }
  };

  const handlePdfFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      alert("Please select a valid PDF file.");
      return;
    }
    setPdfUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${getApiBaseUrl()}/blog/upload`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setNewPdf(data.url);
      } else {
        alert("Failed to upload PDF.");
      }
    } catch {
      alert("Failed to upload PDF.");
    } finally {
      setPdfUploading(false);
    }
  };

  const fetchBlogs = async (pg = 1, q = search, tag = activeTag, yr = selectedYear, mn = selectedMonth) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(pg), per_page: String(PER_PAGE) });
      if (q) params.set("search", q);
      if (tag) params.set("tag", tag);
      if (yr) params.set("year", yr);
      if (mn) params.set("month", mn);
      const res = await fetch(`${getApiBaseUrl()}/blog/?${params}`);
      if (res.ok) {
        const data = await res.json();
        setBlogs(data.items);
        setTotal(data.total);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBlogs(1); }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchBlogs(1, search, activeTag, selectedYear, selectedMonth);
  };

  const handleTag = (tag: string) => {
    const next = activeTag === tag ? "" : tag;
    setActiveTag(next);
    setPage(1);
    fetchBlogs(1, search, next, selectedYear, selectedMonth);
  };

  const handleYearChange = (yr: string) => {
    setSelectedYear(yr);
    setPage(1);
    fetchBlogs(1, search, activeTag, yr, selectedMonth);
  };

  const handleMonthChange = (mn: string) => {
    setSelectedMonth(mn);
    setPage(1);
    fetchBlogs(1, search, activeTag, selectedYear, mn);
  };

  const totalPages = Math.ceil(total / PER_PAGE);

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-amber-50/30">
      {/* Hero */}
      <div className="relative bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 overflow-hidden">
        <motion.div
          className="absolute top-10 left-20 w-72 h-72 bg-amber-400/30 rounded-full blur-3xl"
          animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-0 right-20 w-96 h-96 bg-rose-400/30 rounded-full blur-3xl"
          animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 2.5 }}
        />
        <div className="relative max-w-5xl mx-auto px-4 py-20 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm font-medium mb-6">
              <BookOpen className="w-4 h-4" />
              Samaj Blog
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold mb-4 leading-tight">
              <span className="text-gradient-vivid">Stories, News &amp; Insights</span>
            </h1>
            <p className="text-zinc-400 text-lg max-w-xl mx-auto mb-8">
              Discover stories, announcements, and wisdom shared by our Agrawal Samaj Mansrovar Jaipur community.
            </p>

            {/* Search & Filter Controls */}
            <form onSubmit={handleSearch} className="space-y-4 max-w-xl mx-auto">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search blogs by keyword..."
                  className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white/10 backdrop-blur border border-white/20 text-white placeholder-zinc-400 focus:outline-none focus:border-amber-400/60 focus:bg-white/15 transition-all"
                />
                <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white text-sm font-semibold shadow-md shadow-amber-500/30 transition-all active:scale-95">
                  Search
                </button>
              </div>

              {/* Year & Month Date-wise Filters */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <select
                  value={selectedYear}
                  onChange={(e) => handleYearChange(e.target.value)}
                  className="px-4 py-2.5 rounded-xl bg-zinc-800/90 text-white border border-zinc-700 text-sm font-semibold focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="">🗓️ All Years</option>
                  <option value="2026">2026</option>
                  <option value="2025">2025</option>
                  <option value="2024">2024</option>
                  <option value="2023">2023</option>
                </select>

                <select
                  value={selectedMonth}
                  onChange={(e) => handleMonthChange(e.target.value)}
                  className="px-4 py-2.5 rounded-xl bg-zinc-800/90 text-white border border-zinc-700 text-sm font-semibold focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="">📅 All Months</option>
                  <option value="1">January</option>
                  <option value="2">February</option>
                  <option value="3">March</option>
                  <option value="4">April</option>
                  <option value="5">May</option>
                  <option value="6">June</option>
                  <option value="7">July</option>
                  <option value="8">August</option>
                  <option value="9">September</option>
                  <option value="10">October</option>
                  <option value="11">November</option>
                  <option value="12">December</option>
                </select>

                <button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold shadow-lg shadow-amber-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  ✍️ Write a Blog
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12">

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden border border-zinc-100 animate-pulse">
                <div className="h-48 bg-zinc-100" />
                <div className="p-5 space-y-3">
                  <div className="h-4 bg-zinc-100 rounded w-3/4" />
                  <div className="h-3 bg-zinc-100 rounded w-full" />
                  <div className="h-3 bg-zinc-100 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : blogs.length === 0 ? (
          <div className="text-center py-24">
            <BookOpen className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
            <p className="text-zinc-400 text-lg">No blogs found.</p>
            {search && (
              <button onClick={() => { setSearch(""); fetchBlogs(1, "", activeTag); }} className="mt-4 text-amber-500 hover:underline text-sm">Clear search</button>
            )}
          </div>
        ) : (
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.07 } } }}
          >
            {blogs.map((blog) => (
              <motion.article
                key={blog.blog_id}
                variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
                whileHover={{ y: -8, scale: 1.02 }}
                className="group glass-panel rounded-[1.75rem] overflow-hidden hover:shadow-2xl hover:shadow-amber-500/25 transition-shadow duration-300 flex flex-col"
              >
                {/* Cover */}
                <Link href={`/blog/${blog.slug}`} className="block overflow-hidden">
                  {blog.cover_image_url ? (
                    <img
                      src={blog.cover_image_url.startsWith('http') || blog.cover_image_url.startsWith('https') ? blog.cover_image_url : blog.cover_image_url.startsWith('/uploads/') ? `${getApiBaseUrl().replace('/api/v1', '')}${blog.cover_image_url}` : blog.cover_image_url}
                      alt={blog.title}
                      className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-48 bg-gradient-to-br from-amber-50 to-rose-50 flex items-center justify-center">
                      <BookOpen className="w-10 h-10 text-amber-200" />
                    </div>
                  )}
                </Link>

                <div className="p-5 flex flex-col flex-1">

                  {/* Title */}
                  <Link href={`/blog/${blog.slug}`}>
                    <h2 className="text-base font-bold text-zinc-900 group-hover:text-amber-600 transition-colors line-clamp-2 mb-2 leading-snug">
                      {blog.title}
                    </h2>
                  </Link>

                  {/* Preview */}
                  <p className="text-zinc-500 text-sm line-clamp-3 mb-4 leading-relaxed flex-1">
                    {blog.content_preview}
                  </p>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-zinc-50">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-rose-400 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {blog.author?.first_name?.[0] || "A"}
                      </div>
                      <div>
                        <p className="text-xs font-medium text-zinc-700 leading-none">
                          {blog.author ? `${blog.author.first_name} ${blog.author.surname}` : "Admin"}
                        </p>
                        <p className="text-xs text-zinc-400 mt-0.5">{timeAgo(blog.created_at)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-zinc-400">
                      <span className="flex items-center gap-1 text-xs"><Heart className="w-3.5 h-3.5" />{blog.like_count}</span>
                      <span className="flex items-center gap-1 text-xs"><MessageCircle className="w-3.5 h-3.5" />{blog.comment_count}</span>
                      <span className="flex items-center gap-1 text-xs"><Eye className="w-3.5 h-3.5" />{blog.views}</span>
                    </div>
                  </div>
                </div>
              </motion.article>
            ))}
          </motion.div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-wrap justify-center gap-2 mt-12">
            <button
              onClick={() => { setPage(p => p - 1); fetchBlogs(page - 1); }}
              disabled={page === 1}
              className="px-4 py-2 rounded-xl border border-zinc-200 text-sm font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i}
                onClick={() => { setPage(i + 1); fetchBlogs(i + 1); }}
                className={`w-9 h-9 rounded-xl text-sm font-medium transition-colors ${page === i + 1 ? "bg-amber-500 text-white" : "border border-zinc-200 text-zinc-600 hover:bg-zinc-50"}`}
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() => { setPage(p => p + 1); fetchBlogs(page + 1); }}
              disabled={page === totalPages}
              className="px-4 py-2 rounded-xl border border-zinc-200 text-sm font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        )}

        {/* Create Blog Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
                <div>
                  <h3 className="font-bold text-zinc-900 text-xl">✍️ Write a Blog Post</h3>
                  <p className="text-xs text-zinc-500">Publish your story directly — no approval needed!</p>
                </div>
                <button type="button" onClick={() => setShowCreateModal(false)} className="p-1 text-zinc-400 hover:text-zinc-600 rounded-lg">
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateBlogSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider block">Blog Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter engaging blog title..."
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Guest Author Info */}
                <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 space-y-3">
                  <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">👤 Your Details (as author)</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-zinc-600 block mb-1">Full Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="Your name"
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-zinc-600 block mb-1">Email *</label>
                      <input
                        type="email"
                        required
                        placeholder="you@email.com"
                        value={guestEmail}
                        onChange={(e) => setGuestEmail(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-zinc-600 block mb-1">Phone *</label>
                      <input
                        type="tel"
                        required
                        placeholder="9876543210"
                        value={guestPhone}
                        onChange={(e) => setGuestPhone(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider block">Upload Cover Image / Poster</label>
                  {newCover ? (
                    <div className="relative w-full h-44 rounded-2xl overflow-hidden border border-zinc-200 group">
                      <img src={newCover.startsWith("http") ? newCover : `${getApiBaseUrl().replace("/api/v1", "")}${newCover}`} alt="Cover preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setNewCover("")}
                        className="absolute top-2 right-2 p-1.5 bg-zinc-900/80 text-white rounded-full hover:bg-rose-600 transition-colors shadow-md cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-zinc-300 rounded-2xl cursor-pointer hover:border-amber-500 hover:bg-amber-50/50 transition-all">
                      <div className="flex flex-col items-center justify-center pt-4 pb-5 text-zinc-500">
                        {coverUploading ? (
                          <div className="flex items-center gap-2 font-semibold text-amber-600 text-xs">
                            <span className="animate-spin">⏳</span> Uploading Image to Storage...
                          </div>
                        ) : (
                          <>
                            <Upload className="w-6 h-6 mb-2 text-amber-500" />
                            <p className="text-xs font-semibold text-zinc-700">Click to pick photo or poster directly from your device</p>
                            <p className="text-[11px] text-zinc-400 mt-0.5">PNG, JPG, JPEG or WEBP (Max 20MB)</p>
                          </>
                        )}
                      </div>
                      <input type="file" accept="image/*" onChange={handleImageFileUpload} disabled={coverUploading} className="hidden" />
                    </label>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider block">Attach PDF Document (Optional)</label>
                  {newPdf ? (
                    <div className="flex items-center gap-3 p-3 bg-amber-50/50 rounded-xl border border-amber-200/80">
                      <FileText className="w-8 h-8 text-amber-600 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-zinc-800 truncate">{newPdf.split('/').pop()}</p>
                        <span className="text-[10px] text-zinc-400">Attached successfully</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setNewPdf("")}
                        className="text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 px-2 py-1 rounded-lg"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-zinc-300 rounded-2xl cursor-pointer hover:border-amber-500 hover:bg-amber-50/50 transition-all">
                      <div className="flex flex-col items-center justify-center text-zinc-500">
                        {pdfUploading ? (
                          <div className="flex items-center gap-2 font-semibold text-amber-600 text-xs">
                            <span className="animate-spin">⏳</span> Uploading PDF...
                          </div>
                        ) : (
                          <>
                            <FileText className="w-5 h-5 mb-1 text-amber-500" />
                            <p className="text-xs font-semibold text-zinc-700 font-medium">Click to select PDF document</p>
                          </>
                        )}
                      </div>
                      <input type="file" accept="application/pdf" onChange={handlePdfFileUpload} disabled={pdfUploading} className="hidden" />
                    </label>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider block">Tags (comma separated)</label>
                  <input
                    type="text"
                    placeholder="e.g. Samaj News, Event, Health, Jaipur"
                    value={newTags}
                    onChange={(e) => setNewTags(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider block">Blog Content (Markdown / Text) *</label>
                  <textarea
                    required
                    rows={8}
                    placeholder="Write your story, announcement, or article here..."
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>

                {blogStep === "details" ? (
                  <div className="space-y-4">
                    <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100">
                      <button
                        type="button"
                        onClick={() => setShowCreateModal(false)}
                        className="px-5 py-2.5 rounded-xl border border-zinc-200 text-sm font-semibold text-zinc-600 hover:bg-zinc-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSendBlogOtp}
                        disabled={blogSendingOtp || !newTitle.trim() || !newContent.trim() || !guestPhone.trim()}
                        className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white text-sm font-bold rounded-xl shadow-md disabled:opacity-50 transition-all flex items-center gap-2 cursor-pointer"
                      >
                        {blogSendingOtp ? "Sending OTP..." : "Request OTP to Publish 📲"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 pt-4 border-t border-zinc-100">
                    <div className="p-3.5 bg-amber-50 text-amber-900 rounded-2xl text-xs font-medium border border-amber-200">
                      📲 Verification OTP code sent to <strong>{guestPhone}</strong>. Enter the 6-digit code to publish your blog article.
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider block">6-Digit Verification OTP *</label>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        placeholder="e.g. 123456"
                        value={blogOtp}
                        onChange={(e) => setBlogOtp(e.target.value)}
                        className="w-full px-4 py-3 border border-amber-300 rounded-xl text-center text-lg font-mono font-bold tracking-widest focus:ring-2 focus:ring-amber-500 focus:outline-none bg-amber-50/30"
                      />
                    </div>

                    {blogOtpError && (
                      <p className="text-xs text-rose-600 font-semibold">{blogOtpError}</p>
                    )}

                    <div className="flex justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setBlogStep("details")}
                        className="px-4 py-2.5 rounded-xl border border-zinc-200 text-sm font-semibold text-zinc-600 hover:bg-zinc-50"
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting || !blogOtp.trim()}
                        className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white text-sm font-bold rounded-xl shadow-md disabled:opacity-50 transition-all cursor-pointer"
                      >
                        {isSubmitting ? "Publishing..." : "Verify OTP & Publish 🚀"}
                      </button>
                    </div>
                  </div>
                )}
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
