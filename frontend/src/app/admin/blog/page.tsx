"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  PenSquare, Trash2, Eye, EyeOff, Plus, BookOpen,
  Heart, MessageCircle, Clock, Tag, Search, AlertTriangle
} from "lucide-react";
import { getApiBaseUrl } from "@/utils/api";

interface Blog {
  blog_id: string;
  title: string;
  slug: string;
  status: "draft" | "published";
  tags: string[];
  like_count: number;
  comment_count: number;
  views: number;
  created_at: string;
  author: { first_name: string; surname: string } | null;
}

function timeAgo(dateStr: string) {
  if (!dateStr.endsWith('Z')) dateStr += 'Z';
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function AdminBlogManager() {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "published" | "draft">("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const fetchBlogs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/blog/admin/all?per_page=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setBlogs(data.items);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBlogs(); }, []);

  const handleToggleStatus = async (blog: Blog) => {
    setActionLoading(true);
    try {
      const newStatus = blog.status === "published" ? "draft" : "published";
      await fetch(`${getApiBaseUrl()}/blog/${blog.blog_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus }),
      });
      await fetchBlogs();
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setActionLoading(true);
    try {
      await fetch(`${getApiBaseUrl()}/blog/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setDeleteId(null);
      await fetchBlogs();
    } finally {
      setActionLoading(false);
    }
  };

  const filtered = blogs.filter(b => {
    const matchSearch = b.title.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || b.status === filter;
    return matchSearch && matchFilter;
  });

  const publishedCount = blogs.filter(b => b.status === "published").length;
  const draftCount = blogs.filter(b => b.status === "draft").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-amber-500" />
            Blog Management
          </h1>
          <p className="text-sm text-zinc-500 mt-1">Create and manage blog posts for the samaj website.</p>
        </div>
        <Link
          href="/admin/blog/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm shadow-md shadow-amber-200 hover:shadow-amber-300 transition-all"
        >
          <Plus className="w-4 h-4" />
          New Blog Post
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Posts", value: blogs.length, color: "text-zinc-700", bg: "bg-zinc-50" },
          { label: "Published", value: publishedCount, color: "text-emerald-700", bg: "bg-emerald-50" },
          { label: "Drafts", value: draftCount, color: "text-amber-700", bg: "bg-amber-50" },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-2xl p-4 border border-zinc-100`}>
            <p className="text-xs text-zinc-500 font-medium">{s.label}</p>
            <p className={`text-3xl font-bold ${s.color} mt-1`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search posts..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-300"
          />
        </div>
        <div className="flex rounded-xl border border-zinc-200 overflow-hidden bg-white">
          {(["all", "published", "draft"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors ${filter === f ? "bg-amber-500 text-white" : "text-zinc-500 hover:bg-zinc-50"}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-zinc-100 divide-y divide-zinc-50">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="p-4 flex gap-4 animate-pulse">
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-zinc-100 rounded w-1/2" />
                <div className="h-3 bg-zinc-100 rounded w-1/4" />
              </div>
              <div className="h-8 w-20 bg-zinc-100 rounded-xl" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-zinc-100 py-20 text-center">
          <BookOpen className="w-10 h-10 text-zinc-200 mx-auto mb-3" />
          <p className="text-zinc-400 font-medium">No blog posts found</p>
          <Link href="/admin/blog/new" className="mt-4 inline-flex items-center gap-1.5 text-amber-500 hover:underline text-sm font-medium">
            <Plus className="w-4 h-4" /> Create your first post
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-zinc-100 divide-y divide-zinc-50 overflow-hidden">
          {filtered.map((blog, i) => (
            <motion.div
              key={blog.blog_id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-center gap-4 p-4 hover:bg-zinc-50 transition-colors group"
            >
              {/* Status dot */}
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${blog.status === "published" ? "bg-emerald-500" : "bg-amber-400"}`} />

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-zinc-800 text-sm truncate group-hover:text-amber-600 transition-colors">
                    {blog.title}
                  </h3>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${blog.status === "published" ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-amber-50 text-amber-600 border border-amber-100"}`}>
                    {blog.status}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-zinc-400 flex-wrap">
                  <span className="font-medium text-zinc-600">
                    ✍️ {blog.author ? `${blog.author.first_name} ${blog.author.surname}` : ((blog as any).guest_name ? `Guest: ${(blog as any).guest_name}` : "Admin")}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{timeAgo(blog.created_at)}</span>
                  <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{blog.views}</span>
                  <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{blog.like_count}</span>
                  <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" />{blog.comment_count}</span>
                  {blog.tags?.slice(0, 2).map(t => (
                    <span key={t} className="flex items-center gap-0.5"><Tag className="w-3 h-3" />{t}</span>
                  ))}
                </div>
              </div>

              {/* Actions - Always Visible for Admins */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <Link
                  href={`/blog/${blog.slug}`}
                  target="_blank"
                  className="p-2 rounded-xl text-zinc-500 hover:text-amber-600 hover:bg-amber-50 border border-zinc-200 transition-colors"
                  title="View Post"
                >
                  <Eye className="w-4 h-4" />
                </Link>
                <button
                  onClick={() => handleToggleStatus(blog)}
                  disabled={actionLoading}
                  className={`p-2 rounded-xl border border-zinc-200 transition-colors ${blog.status === "published" ? "text-amber-600 hover:text-orange-600 hover:bg-orange-50" : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"}`}
                  title={blog.status === "published" ? "Unpublish to Draft" : "Publish to Live"}
                >
                  {blog.status === "published" ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <Link
                  href={`/admin/blog/${blog.blog_id}/edit`}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 font-bold text-xs transition-colors"
                  title="Edit Blog Post"
                >
                  <PenSquare className="w-3.5 h-3.5" /> Edit
                </Link>
                <button
                  onClick={() => setDeleteId(blog.blog_id)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 font-bold text-xs transition-colors cursor-pointer"
                  title="Delete Blog Post"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
              </div>
              <div>
                <h3 className="font-bold text-zinc-900">Delete Blog Post?</h3>
                <p className="text-sm text-zinc-500">This action cannot be undone.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 py-2.5 rounded-xl border border-zinc-200 text-zinc-600 text-sm font-medium hover:bg-zinc-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                disabled={actionLoading}
                className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold transition-colors disabled:opacity-60"
              >
                {actionLoading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
