"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Search, Tag, Heart, MessageCircle, Eye, Clock, ArrowRight, BookOpen } from "lucide-react";
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

  const fetchBlogs = async (pg = 1, q = search, tag = activeTag) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(pg), per_page: String(PER_PAGE) });
      if (q) params.set("search", q);
      if (tag) params.set("tag", tag);
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
    fetchBlogs(1, search, activeTag);
  };

  const handleTag = (tag: string) => {
    const next = activeTag === tag ? "" : tag;
    setActiveTag(next);
    setPage(1);
    fetchBlogs(1, search, next);
  };

  const totalPages = Math.ceil(total / PER_PAGE);

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-amber-50/30">
      {/* Hero */}
      <div className="relative bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-20 w-64 h-64 bg-amber-400 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-20 w-96 h-96 bg-rose-400 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-5xl mx-auto px-4 py-20 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm font-medium mb-6">
              <BookOpen className="w-4 h-4" />
              Samaj Blog
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
              Stories, News &amp; Insights
            </h1>
            <p className="text-zinc-400 text-lg max-w-xl mx-auto mb-8">
              Discover stories, announcements, and wisdom shared by our Agrawal Samaj community.
            </p>

            {/* Search */}
            <form onSubmit={handleSearch} className="relative max-w-xl mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search blogs..."
                className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white/10 backdrop-blur border border-white/20 text-white placeholder-zinc-400 focus:outline-none focus:border-amber-400/60 focus:bg-white/15 transition-all"
              />
              <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium transition-colors">
                Search
              </button>
            </form>
          </motion.div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Tag Filter */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-10">
            <button
              onClick={() => handleTag("")}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${activeTag === "" ? "bg-amber-500 border-amber-500 text-white" : "bg-white border-zinc-200 text-zinc-600 hover:border-amber-300 hover:text-amber-600"}`}
            >
              All Posts
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => handleTag(tag)}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${activeTag === tag ? "bg-amber-500 border-amber-500 text-white" : "bg-white border-zinc-200 text-zinc-600 hover:border-amber-300 hover:text-amber-600"}`}
              >
                <Tag className="w-3 h-3" />
                {tag}
              </button>
            ))}
          </div>
        )}

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
                className="group bg-white rounded-2xl overflow-hidden border border-zinc-100 hover:border-amber-200 hover:shadow-lg hover:shadow-amber-100/50 transition-all duration-300 flex flex-col"
              >
                {/* Cover */}
                <Link href={`/blog/${blog.slug}`} className="block overflow-hidden">
                  {blog.cover_image_url ? (
                    <img
                      src={blog.cover_image_url.startsWith('http') ? blog.cover_image_url : `${getApiBaseUrl().replace('/api/v1', '')}${blog.cover_image_url.startsWith("/") ? blog.cover_image_url : `/${blog.cover_image_url}`}`}
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
                  {/* Tags */}
                  {blog.tags && blog.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {blog.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-600 text-xs font-medium border border-amber-100">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

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
          <div className="flex justify-center gap-2 mt-12">
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
      </div>
    </div>
  );
}
