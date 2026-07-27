"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import {
  Heart, MessageCircle, Eye, Clock, Share2, ArrowLeft,
  Tag, Send, Trash2, ChevronDown, CheckCheck, Copy
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
  cover_image_url: string | null;
  tags: string[];
  author: Author | null;
  like_count: number;
  user_liked: boolean;
  comment_count: number;
  views: number;
  created_at: string;
  updated_at: string;
}

function timeAgo(dateStr: string) {
  if (!dateStr.endsWith('Z')) dateStr += 'Z';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return days < 30 ? `${days}d ago` : new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
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
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);
  const [commentLoading, setCommentLoading] = useState(false);

  const [copied, setCopied] = useState(false);
  const [showAllComments, setShowAllComments] = useState(false);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const userId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;

  useEffect(() => {
    if (!slug) return;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`${getApiBaseUrl()}/blog/${slug}`);
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
  }, [slug]);

  useEffect(() => {
    if (!blog) return;
    fetch(`${getApiBaseUrl()}/blog/${blog.blog_id}/comments`).then(r => r.json()).then(setComments);
  }, [blog]);

  const handleLike = async () => {
    if (!token) { router.push("/login"); return; }
    setLikeLoading(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/blog/${blog!.blog_id}/like`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
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
    if (!token) { router.push("/login"); return; }
    if (!comment.trim()) return;
    setCommentLoading(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/blog/${blog!.blog_id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: comment.trim(), parent_id: replyTo?.id || null }),
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
        <Link href="/blog" className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-amber-600 transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to Blog
        </Link>
      </div>

      {/* Cover Image */}
      {blog.cover_image_url && (
        <div className="max-w-5xl mx-auto px-4 mb-8">
          <img
            src={blog.cover_image_url.startsWith('http') ? blog.cover_image_url : `${getApiBaseUrl().replace('/api/v1', '')}${blog.cover_image_url.startsWith("/") ? blog.cover_image_url : `/${blog.cover_image_url}`}`}
            alt={blog.title}
            className="w-full max-h-[480px] object-cover rounded-3xl shadow-md"
          />
        </div>
      )}

      <article className="max-w-3xl mx-auto px-4 pb-16">
        {/* Tags */}
        {blog.tags?.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-5">
            {blog.tags.map(tag => (
              <Link key={tag} href={`/blog?tag=${tag}`} className="flex items-center gap-1 px-3 py-1 rounded-full bg-amber-50 border border-amber-100 text-amber-600 text-xs font-medium hover:bg-amber-100 transition-colors">
                <Tag className="w-3 h-3" /> {tag}
              </Link>
            ))}
          </div>
        )}

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
          <div className="flex items-center gap-2">
            <button
              onClick={handleLike}
              disabled={likeLoading}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition-all ${liked ? "bg-rose-50 border-rose-200 text-rose-500" : "bg-zinc-50 border-zinc-200 text-zinc-500 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-500"}`}
            >
              <Heart className={`w-4 h-4 ${liked ? "fill-rose-500" : ""}`} />
              {likeCount}
            </button>
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-500 hover:bg-amber-50 hover:border-amber-200 hover:text-amber-600 text-sm font-medium transition-all"
            >
              {copied ? <><CheckCheck className="w-4 h-4" /> Copied!</> : <><Share2 className="w-4 h-4" /> Share</>}
            </button>
          </div>
        </div>

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
          <ReactMarkdown>{blog.content}</ReactMarkdown>
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

          {/* Comment Form */}
          {token ? (
            <form onSubmit={handleComment} className="mb-8">
              {replyTo && (
                <div className="flex items-center gap-2 mb-2 text-xs text-zinc-500 bg-zinc-50 px-3 py-2 rounded-lg">
                  Replying to <span className="font-semibold text-zinc-700">{replyTo.name}</span>
                  <button type="button" onClick={() => setReplyTo(null)} className="ml-auto text-zinc-400 hover:text-zinc-600">✕</button>
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
          ) : (
            <div className="mb-8 text-center py-6 rounded-2xl bg-zinc-50 border border-zinc-100">
              <p className="text-zinc-500 text-sm mb-3">Login to post a comment</p>
              <Link href="/login" className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors">
                Login
              </Link>
            </div>
          )}

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
