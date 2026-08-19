"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import {
  Heart, MessageCircle, Eye, Clock, Share2, ArrowLeft,
  Tag, Send, Trash2, ChevronDown, CheckCheck, Copy, Shield, PenSquare, FileText,
  X, ZoomIn, ExternalLink
} from "lucide-react";
import { getApiBaseUrl } from "@/utils/api";

// Dynamically import markdown renderer to avoid SSR issues
const ReactMarkdown = dynamic(() => import("react-markdown"), { ssr: false });

interface Author {
  user_id: string;
  first_name: string;
  surname: string;
  profile_photo: string | null;
}

interface Comment {
  comment_id: string;
  user_id: string;
  author: Author | null;
  content: string;
  parent_id: string | null;
  created_at: string;
  replies: Comment[];
}

interface Blog {
  blog_id: string;
  title: string;
  slug: string;
  content: string;
  status?: string;
  cover_image_url: string | null;
  pdf_url: string | null;
  tags: string[];
  author: Author | null;
  like_count: number;
  user_liked: boolean;
  comment_count: number;
  views: number;
  created_at: string;
  updated_at: string;
}

function timeAgo(dateStr?: string) {
  if (!dateStr) return "Recently";
  let d = new Date(dateStr);
  if (isNaN(d.getTime()) && !dateStr.endsWith('Z')) {
    d = new Date(dateStr + 'Z');
  }
  if (isNaN(d.getTime())) return "Recently";
  const diff = Date.now() - d.getTime();
  if (diff < 0) return "Just now";
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return days < 30 ? `${days}d ago` : d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

function formatImageUrl(url?: string | null) {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const baseUrl = getApiBaseUrl().replace("/api/v1", "");
  if (url.startsWith("/")) return `${baseUrl}${url}`;
  return `${baseUrl}/${url}`;
}

function Avatar({ author, size = "md" }: { author: Author | null; size?: "sm" | "md" | "lg" }) {
  const sz = size === "lg" ? "w-12 h-12 text-base" : size === "sm" ? "w-7 h-7 text-xs" : "w-9 h-9 text-sm";
  return (
    <div className={`${sz} rounded-full bg-gradient-to-br from-amber-400 to-rose-400 flex items-center justify-center text-white font-bold flex-shrink-0`}>
      {author?.first_name?.[0] || "A"}
    </div>
  );
}

export default function BlogReaderPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;

  const [blog, setBlog] = useState<Blog | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [likeLoading, setLikeLoading] = useState(false);

  const [comment, setComment] = useState("");
  const [guestName, setGuestName] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);
  const [commentLoading, setCommentLoading] = useState(false);

  const [copied, setCopied] = useState(false);
  const [showAllComments, setShowAllComments] = useState(false);
  const [guestId, setGuestId] = useState<string>("");
  const [isAdmin, setIsAdmin] = useState(false);

  const [activeImageModal, setActiveImageModal] = useState<{ url: string; alt?: string } | null>(null);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const userId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActiveImageModal(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      let gid = localStorage.getItem("guest_id");
      if (!gid) {
        gid = "guest_" + Math.random().toString(36).substring(2) + Date.now().toString(36);
        localStorage.setItem("guest_id", gid);
      }
      setGuestId(gid);

      const role = (localStorage.getItem("userRole") || "").toUpperCase();
      if (["ADMIN", "SUPER_ADMIN"].includes(role)) {
        setIsAdmin(true);
      }
    }
  }, []);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      setLoading(true);
      try {
        const headers: Record<string, string> = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;
        const gidParam = guestId ? `?guest_id=${guestId}` : "";
        const res = await fetch(`${getApiBaseUrl()}/blog/${slug}${gidParam}`, { headers });
        if (res.ok) {
          const data = await res.json();
          setBlog(data);
          setLiked(data.user_liked);
          setLikeCount(data.like_count);
        } else {
          router.push("/blog");
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [slug, guestId]);

  useEffect(() => {
    if (!blog) return;
    fetch(`${getApiBaseUrl()}/blog/${blog.blog_id}/comments`).then(r => r.json()).then(setComments);
  }, [blog]);

  const handleLike = async () => {
    setLikeLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const gidParam = guestId ? `?guest_id=${guestId}` : "";
      const res = await fetch(`${getApiBaseUrl()}/blog/${blog!.blog_id}/like${gidParam}`, {
        method: "POST",
        headers,
      });
      if (res.ok) {
        const data = await res.json();
        setLiked(data.liked);
        setLikeCount(data.like_count);
      }
    } finally {
      setLikeLoading(false);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: blog?.title, url });
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setCommentLoading(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const body: any = { content: comment.trim(), parent_id: replyTo?.id || null };
      if (!token && guestName.trim()) {
        body.guest_name = guestName.trim();
      }
      const res = await fetch(`${getApiBaseUrl()}/blog/${blog!.blog_id}/comments`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setComment("");
        setReplyTo(null);
        // Refresh comments
        const r = await fetch(`${getApiBaseUrl()}/blog/${blog!.blog_id}/comments`);
        setComments(await r.json());
      }
    } finally {
      setCommentLoading(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!token) return;
    await fetch(`${getApiBaseUrl()}/blog/comments/${commentId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    const r = await fetch(`${getApiBaseUrl()}/blog/${blog!.blog_id}/comments`);
    setComments(await r.json());
  };

  const handleAdminDelete = async () => {
    if (!token || !blog) return;
    if (!window.confirm("Are you sure you want to delete this blog post? This action cannot be undone.")) return;
    try {
      const res = await fetch(`${getApiBaseUrl()}/blog/${blog.blog_id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        router.push("/admin/blog");
      } else {
        alert("Failed to delete blog post.");
      }
    } catch {
      alert("Error connecting to server.");
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 animate-pulse space-y-6">
        <div className="h-8 bg-zinc-100 rounded w-3/4" />
        <div className="h-64 bg-zinc-100 rounded-2xl" />
        <div className="space-y-3">
          {[...Array(8)].map((_, i) => <div key={i} className="h-4 bg-zinc-100 rounded" />)}
        </div>
      </div>
    );
  }

  if (!blog) return null;

  const displayedComments = showAllComments ? comments : comments.slice(0, 3);

  return (
    <div className="min-h-screen bg-white">
      {/* Back */}
      <div className="max-w-3xl mx-auto px-4 pt-8">
        <Link href="/blog" className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-amber-600 transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Blog
        </Link>
      </div>

      {/* Admin Quick Control Banner */}
      {isAdmin && blog && (
        <div className="max-w-3xl mx-auto px-4 mb-6">
          <div className="p-3.5 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-amber-500/10 border border-amber-300 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-950">
              <Shield className="w-4 h-4 text-amber-600" />
              <span>Admin Post Management:</span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider ${blog.status === "published" ? "bg-emerald-100 text-emerald-800 border border-emerald-200" : "bg-amber-100 text-amber-800 border border-amber-200"}`}>
                {blog.status || "published"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/admin/blog/${blog.blog_id}/edit`}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                <PenSquare className="w-3.5 h-3.5" /> Edit Blog
              </Link>
              <button
                type="button"
                onClick={handleAdminDelete}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete Blog
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cover Image */}
      {blog.cover_image_url && (
        <div className="max-w-5xl mx-auto px-4 mb-8">
          <div
            onClick={() => setActiveImageModal({ url: formatImageUrl(blog.cover_image_url), alt: blog.title })}
            className="group relative w-full rounded-3xl shadow-lg bg-zinc-900/5 border border-zinc-200/80 overflow-hidden flex items-center justify-center cursor-pointer transition-all duration-300 hover:shadow-2xl hover:border-amber-400/50"
          >
            <img
              src={formatImageUrl(blog.cover_image_url)}
              alt={blog.title}
              className="w-full h-auto max-h-[75vh] object-contain rounded-3xl group-hover:scale-[1.01] transition-transform duration-500"
            />
            {/* Click to open indicator */}
            <div className="absolute bottom-4 right-4 bg-zinc-900/80 backdrop-blur-md text-white text-xs font-semibold px-3.5 py-2 rounded-xl opacity-90 group-hover:opacity-100 group-hover:bg-amber-500 transition-all flex items-center gap-1.5 shadow-lg">
              <ZoomIn className="w-4 h-4" /> Click to view full image
            </div>
          </div>
        </div>
      )}

      <article className="max-w-3xl mx-auto px-4 pb-16">
        {/* Title */}
        <h1 className="text-3xl md:text-4xl font-bold text-zinc-900 leading-tight mb-6">{blog.title}</h1>

        {/* Author + Meta */}
        <div className="flex items-center gap-4 mb-8 pb-6 border-b border-zinc-100">
          <Avatar author={blog.author} size="lg" />
          <div className="flex-1">
            <p className="font-semibold text-zinc-800">
              {blog.author ? `${blog.author.first_name} ${blog.author.surname}` : "Admin"}
            </p>
            <div className="flex items-center gap-3 text-zinc-400 text-xs mt-1">
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{timeAgo(blog.created_at)}</span>
              <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{blog.views} views</span>
            </div>
          </div>
          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleLike}
              disabled={likeLoading}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition-all ${liked ? "bg-rose-50 border-rose-200 text-rose-500" : "bg-zinc-50 border-zinc-200 text-zinc-500 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-500"}`}
            >
              <Heart className={`w-4 h-4 ${liked ? "fill-rose-500" : ""}`} />
              {likeCount}
            </button>
            <a
              href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`*${blog?.title}*\nRead more on Agrawal Samaj Mansrovar Jaipur Portal: ${typeof window !== "undefined" ? window.location.href : ""}`)}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-sm font-semibold transition-all"
            >
              💬 WhatsApp Share
            </a>
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-500 hover:bg-amber-50 hover:border-amber-200 hover:text-amber-600 text-sm font-medium transition-all"
            >
              {copied ? <><CheckCheck className="w-4 h-4" /> Copied!</> : <><Share2 className="w-4 h-4" /> Copy Link</>}
            </button>
          </div>
        </div>

        {/* PDF Attachment Banner */}
        {blog.pdf_url && (
          <div className="mb-8 p-4 bg-amber-50/60 border border-amber-200/80 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-100 rounded-xl">
                <FileText className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-zinc-900">PDF Document Attached</h4>
                <p className="text-xs text-zinc-500">Official document related to this blog post.</p>
              </div>
            </div>
            <a
              href={`${getApiBaseUrl().replace('/api/v1', '')}${blog.pdf_url}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition-all shadow-sm whitespace-nowrap"
            >
              View / Download PDF
            </a>
          </div>
        )}

        {/* Markdown Content */}
        <div className="prose prose-zinc prose-lg max-w-none
          prose-headings:font-bold prose-headings:text-zinc-900
          prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl
          prose-p:text-zinc-700 prose-p:leading-relaxed
          prose-a:text-amber-600 prose-a:no-underline hover:prose-a:underline
          prose-strong:text-zinc-900
          prose-code:bg-zinc-100 prose-code:text-rose-600 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono
          prose-pre:bg-zinc-900 prose-pre:text-zinc-100 prose-pre:rounded-2xl prose-pre:shadow-lg
          prose-blockquote:border-amber-400 prose-blockquote:bg-amber-50/50 prose-blockquote:rounded-r-xl prose-blockquote:py-2
          prose-img:rounded-2xl prose-img:shadow-md
          prose-table:border-collapse prose-th:bg-zinc-100 prose-th:px-4 prose-th:py-2
          prose-td:px-4 prose-td:py-2 prose-td:border prose-td:border-zinc-200
          prose-li:text-zinc-700 prose-li:my-1
          mb-12">
          <ReactMarkdown
            components={{
              img: ({ node, ...props }) => {
                const fullSrc = formatImageUrl(typeof props.src === "string" ? props.src : null);
                return (
                  <span
                    onClick={() => setActiveImageModal({ url: fullSrc, alt: props.alt })}
                    className="block my-6 cursor-pointer group relative overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50 shadow-sm hover:shadow-xl transition-all"
                  >
                    <img
                      {...props}
                      src={fullSrc}
                      alt={props.alt || "Blog image"}
                      className="w-full h-auto max-h-[75vh] object-contain rounded-2xl group-hover:scale-[1.01] transition-transform duration-300"
                    />
                    <span className="absolute bottom-3 right-3 bg-zinc-900/80 backdrop-blur-md text-white text-xs font-semibold px-3 py-1.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none flex items-center gap-1.5 shadow-lg">
                      <ZoomIn className="w-3.5 h-3.5" /> Click to enlarge
                    </span>
                  </span>
                );
              }
            }}
          >
            {blog.content}
          </ReactMarkdown>
        </div>

        {/* Like + Share bottom */}
        <div className="flex items-center justify-between py-6 border-t border-b border-zinc-100 mb-10">
          <button
            onClick={handleLike}
            disabled={likeLoading}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border text-sm font-semibold transition-all ${liked ? "bg-rose-500 border-rose-500 text-white shadow-md shadow-rose-200" : "border-zinc-200 text-zinc-600 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-500"}`}
          >
            <Heart className={`w-4 h-4 ${liked ? "fill-white" : ""}`} />
            {liked ? "Liked!" : "Like this post"} · {likeCount}
          </button>
          <button onClick={handleShare} className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-zinc-200 text-zinc-600 hover:bg-amber-50 hover:border-amber-200 hover:text-amber-600 text-sm font-semibold transition-all">
            <Share2 className="w-4 h-4" />
            Share
          </button>
        </div>

        {/* Comments Section */}
        <section>
          <h2 className="text-xl font-bold text-zinc-900 mb-6 flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-amber-500" />
            Comments ({comments.length})
          </h2>

          {/* Comment Form - Accessible to Everyone */}
          <form onSubmit={handleComment} className="mb-8">
            {replyTo && (
              <div className="flex items-center gap-2 mb-2 text-xs text-zinc-500 bg-zinc-50 px-3 py-2 rounded-lg">
                Replying to <span className="font-semibold text-zinc-700">{replyTo.name}</span>
                <button type="button" onClick={() => setReplyTo(null)} className="ml-auto text-zinc-400 hover:text-zinc-600">✕</button>
              </div>
            )}
            {!token && (
              <div className="mb-3">
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Your Name (Optional, defaults to Guest)"
                  className="w-full sm:w-72 px-4 py-2 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-800 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-300 text-sm"
                />
              </div>
            )}
            <div className="relative">
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Write a thoughtful comment..."
                rows={3}
                className="w-full px-4 py-3 rounded-2xl border border-zinc-200 bg-zinc-50 text-zinc-800 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-300 focus:bg-white resize-none transition-all text-sm"
              />
              <button
                type="submit"
                disabled={commentLoading || !comment.trim()}
                className="absolute bottom-3 right-3 p-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>


          {/* Comments List */}
          <div className="space-y-4">
            {displayedComments.map((c) => (
              <CommentItem
                key={c.comment_id}
                comment={c}
                userId={userId}
                onReply={(id, name) => setReplyTo({ id, name })}
                onDelete={handleDeleteComment}
              />
            ))}
          </div>

          {comments.length > 3 && !showAllComments && (
            <button
              onClick={() => setShowAllComments(true)}
              className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-zinc-200 text-zinc-500 hover:bg-zinc-50 text-sm font-medium transition-colors"
            >
              <ChevronDown className="w-4 h-4" />
              Show {comments.length - 3} more comments
            </button>
          )}
        </section>
      </article>

      {/* Fullscreen Lightbox Modal */}
      {activeImageModal && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col items-center justify-between p-4 sm:p-6 animate-in fade-in duration-200"
          onClick={() => setActiveImageModal(null)}
        >
          {/* Header */}
          <div
            className="w-full max-w-6xl flex items-center justify-between text-white py-2 px-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 min-w-0 pr-4">
              <span className="text-sm font-semibold truncate text-zinc-300">
                {activeImageModal.alt || blog.title}
              </span>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <a
                href={activeImageModal.url}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-amber-500 hover:text-white text-white text-xs font-bold transition-all flex items-center gap-1.5 border border-white/10 shadow-sm"
                title="Open full image in new tab"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Open Original
              </a>
              <button
                type="button"
                onClick={() => setActiveImageModal(null)}
                className="p-2.5 rounded-xl bg-white/10 hover:bg-rose-600 text-white transition-all cursor-pointer border border-white/10 shadow-sm"
                title="Close viewer (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Image container */}
          <div
            className="relative max-w-6xl w-full max-h-[82vh] flex-1 flex items-center justify-center p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={activeImageModal.url}
              alt={activeImageModal.alt || "Full size image"}
              className="max-w-full max-h-[80vh] w-auto h-auto object-contain rounded-2xl shadow-2xl border border-white/10"
            />
          </div>

          {/* Footer note */}
          <p className="text-zinc-400 text-xs py-2 text-center">
            Click outside or press <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded border border-zinc-700 text-zinc-300 font-mono">Esc</kbd> to close
          </p>
        </div>
      )}
    </div>
  );
}

function CommentItem({
  comment,
  userId,
  onReply,
  onDelete,
  isReply = false,
}: {
  comment: Comment;
  userId: string | null;
  onReply: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  isReply?: boolean;
}) {
  const isOwn = userId === comment.user_id;
  const authorName = comment.author ? `${comment.author.first_name} ${comment.author.surname}` : "User";

  return (
    <div className={`${isReply ? "ml-4 sm:ml-8 mt-3" : ""}`}>
      <div className="flex gap-3">
        <div className={`${isReply ? "w-7 h-7 text-xs" : "w-9 h-9 text-sm"} rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center text-white font-bold flex-shrink-0`}>
          {comment.author?.first_name?.[0] || "U"}
        </div>
        <div className="flex-1">
          <div className="bg-zinc-50 rounded-2xl px-4 py-3 border border-zinc-100">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-zinc-700">{authorName}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-400">{timeAgo(comment.created_at)}</span>
                {isOwn && (
                  <button
                    onClick={() => onDelete(comment.comment_id)}
                    className="text-zinc-300 hover:text-rose-500 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
            <p className="text-sm text-zinc-700 leading-relaxed">{comment.content}</p>
          </div>
          {!isReply && (
            <button
              onClick={() => onReply(comment.comment_id, authorName)}
              className="mt-1 ml-2 text-xs text-zinc-400 hover:text-amber-500 transition-colors"
            >
              Reply
            </button>
          )}
          {/* Replies */}
          {comment.replies?.map(reply => (
            <CommentItem
              key={reply.comment_id}
              comment={reply}
              userId={userId}
              onReply={onReply}
              onDelete={onDelete}
              isReply
            />
          ))}
        </div>
      </div>
    </div>
  );
}
