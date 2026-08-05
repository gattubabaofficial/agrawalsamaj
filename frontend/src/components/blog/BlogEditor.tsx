"use client";

import { useState, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Save, Send, ArrowLeft, ImagePlus, X, Tag, Plus,
  Eye, Edit3, Loader2, CheckCircle, FileText
} from "lucide-react";
import { getApiBaseUrl } from "@/utils/api";

// Dynamic import to avoid SSR issues with @uiw/react-md-editor
const MDEditor = dynamic(
  () => import("@uiw/react-md-editor").then(mod => mod.default),
  { ssr: false }
);

interface BlogEditorProps {
  initialData?: {
    blog_id?: string;
    title?: string;
    content?: string;
    cover_image_url?: string | null;
    pdf_url?: string | null;
    tags?: string[];
    status?: "draft" | "published";
  };
  mode: "new" | "edit";
}

export default function BlogEditor({ initialData, mode }: BlogEditorProps) {
  const router = useRouter();
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const userName = typeof window !== "undefined" ? localStorage.getItem("userName") || "admin" : "admin";

  const [title, setTitle] = useState(initialData?.title || "");
  const [content, setContent] = useState(initialData?.content || "");
  const [coverUrl, setCoverUrl] = useState(initialData?.cover_image_url || "");
  const [pdfUrl, setPdfUrl] = useState(initialData?.pdf_url || "");
  const [tags, setTags] = useState<string[]>(initialData?.tags || []);
  const [tagInput, setTagInput] = useState("");
  const [status, setStatus] = useState<"draft" | "published">(initialData?.status || "draft");

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [pdfUploading, setPdfUploading] = useState(false);
  const [contentImageUploading, setContentImageUploading] = useState(false);
  const [error, setError] = useState("");

  const coverInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const contentImageInputRef = useRef<HTMLInputElement>(null);

  // Upload file to backend
  const uploadFile = useCallback(async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${getApiBaseUrl()}/blog/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    if (!res.ok) throw new Error("Upload failed");
    const data = await res.json();
    return data.url.startsWith('/') ? data.url : '/' + data.url;
  }, [token]);

  // Cover image upload
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverUploading(true);
    try {
      const url = await uploadFile(file);
      setCoverUrl(url);
    } catch {
      setError("Cover image upload failed.");
    } finally {
      setCoverUploading(false);
    }
  };

  // PDF document upload
  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setError("Please select a valid PDF file.");
      return;
    }
    setPdfUploading(true);
    try {
      const url = await uploadFile(file);
      setPdfUrl(url);
    } catch {
      setError("PDF upload failed.");
    } finally {
      setPdfUploading(false);
    }
  };

  // Content image upload
  const handleContentImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setContentImageUploading(true);
    try {
      const url = await uploadFile(file);
      setContent(prev => prev + `\n\n![Image](${url})\n`);
    } catch {
      setError("Image upload failed.");
    } finally {
      setContentImageUploading(false);
      if (contentImageInputRef.current) {
        contentImageInputRef.current.value = "";
      }
    }
  };

  // Tag management
  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t) && tags.length < 8) {
      setTags([...tags, t]);
      setTagInput("");
    }
  };
  const removeTag = (tag: string) => setTags(tags.filter(t => t !== tag));

  // Save / Publish
  const handleSave = async (publish = false) => {
    if (!title.trim()) { setError("Please add a title."); return; }
    if (!content.trim()) { setError("Please add some content."); return; }
    setError("");
    setSaving(true);

    const finalStatus = publish ? "published" : status;
    const payload = {
      title: title.trim(),
      content,
      cover_image_url: coverUrl || null,
      pdf_url: pdfUrl || null,
      tags,
      status: finalStatus,
    };

    try {
      let res: Response;
      if (mode === "new") {
        res = await fetch(`${getApiBaseUrl()}/blog/`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`${getApiBaseUrl()}/blog/${initialData?.blog_id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        });
      }

      if (res.ok) {
        setStatus(finalStatus);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
        if (publish) {
          const data = await res.json();
          router.push(`/blog/${data.slug}`);
        }
      } else {
        const err = await res.json();
        setError(err.detail || "Save failed.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50" data-color-mode="light">
      {/* Topbar */}
      <div className="sticky top-0 z-40 bg-white border-b border-zinc-200 flex items-center gap-4 px-6 h-16 shadow-sm">
        <button
          onClick={() => router.push("/admin/blog")}
          className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-700 transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="flex-1">
          <h1 className="font-semibold text-zinc-800 text-sm">
            {mode === "new" ? "New Blog Post" : "Edit Blog Post"}
          </h1>
        </div>

        {/* Status badge */}
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${status === "published" ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-amber-50 text-amber-600 border border-amber-100"}`}>
          {status === "published" ? "Published" : "Draft"}
        </span>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {saved && (
            <motion.span
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-1 text-emerald-600 text-sm font-medium"
            >
              <CheckCircle className="w-4 h-4" /> Saved!
            </motion.span>
          )}
          <button
            onClick={() => handleSave(false)}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-zinc-200 text-zinc-700 text-sm font-medium hover:bg-zinc-50 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Draft
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold shadow-md shadow-amber-200 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Publish
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm flex items-center justify-between">
            {error}
            <button onClick={() => setError("")}><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* Cover Image */}
        <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
          {coverUrl ? (
            <div className="relative">
              <img src={coverUrl} alt="Cover" className="w-full max-h-72 object-cover" />
              <button
                onClick={() => setCoverUrl("")}
                className="absolute top-3 right-3 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => coverInputRef.current?.click()}
              className="w-full h-44 flex flex-col items-center justify-center gap-2 text-zinc-400 hover:text-amber-500 hover:bg-amber-50/50 transition-colors border-2 border-dashed border-zinc-200 rounded-2xl"
            >
              {coverUploading ? (
                <><Loader2 className="w-8 h-8 animate-spin text-amber-500" /><span className="text-sm">Uploading...</span></>
              ) : (
                <><ImagePlus className="w-8 h-8" /><span className="text-sm font-medium">Click to add cover image</span><span className="text-xs">JPG, PNG, WebP — Max 20 MB</span></>
              )}
            </button>
          )}
          <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
        </div>

        {/* PDF Upload */}
        <div className="bg-white rounded-2xl border border-zinc-200 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-zinc-800">Attach PDF Document (Optional)</h3>
              <p className="text-xs text-zinc-400">Add an official PDF attachment or document related to this blog post.</p>
            </div>
            {pdfUrl && (
              <button
                type="button"
                onClick={() => setPdfUrl("")}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                Remove PDF
              </button>
            )}
          </div>

          {pdfUrl ? (
            <div className="flex items-center gap-3 p-3 bg-amber-50/50 rounded-xl border border-amber-200/80">
              <FileText className="w-8 h-8 text-amber-600 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-zinc-800 truncate">{pdfUrl.split('/').pop()}</p>
                <a
                  href={`${getApiBaseUrl().replace('/api/v1', '')}${pdfUrl}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-amber-600 hover:underline font-bold"
                >
                  View Attachment
                </a>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => pdfInputRef.current?.click()}
              disabled={pdfUploading}
              className="w-full py-4 flex flex-col items-center justify-center gap-1.5 text-zinc-400 hover:text-amber-500 hover:bg-amber-50/50 transition-colors border-2 border-dashed border-zinc-200 rounded-xl cursor-pointer"
            >
              {pdfUploading ? (
                <><Loader2 className="w-6 h-6 animate-spin text-amber-500" /><span className="text-xs">Uploading PDF...</span></>
              ) : (
                <><FileText className="w-6 h-6" /><span className="text-xs font-semibold">Click to upload PDF document</span></>
              )}
            </button>
          )}
          <input ref={pdfInputRef} type="file" accept="application/pdf" className="hidden" onChange={handlePdfUpload} />
        </div>

        {/* Title */}
        <div className="bg-white rounded-2xl border border-zinc-200 px-6 py-4">
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Write your blog title here..."
            className="w-full text-2xl md:text-3xl font-bold text-zinc-900 placeholder-zinc-300 focus:outline-none bg-transparent"
          />
        </div>

        {/* Tags */}
        <div className="bg-white rounded-2xl border border-zinc-200 px-5 py-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Tag className="w-4 h-4 text-zinc-400 flex-shrink-0" />
            {tags.map(tag => (
              <span key={tag} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-100 text-amber-600 text-xs font-medium">
                {tag}
                <button onClick={() => removeTag(tag)} className="hover:text-rose-500 transition-colors"><X className="w-3 h-3" /></button>
              </span>
            ))}
            {tags.length < 8 && (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(); } }}
                  placeholder="Add tag..."
                  className="text-sm text-zinc-600 placeholder-zinc-300 focus:outline-none bg-transparent w-24"
                />
                <button onClick={addTag} className="p-1 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 transition-colors">
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
          <p className="text-xs text-zinc-400 mt-2 ml-6">Press Enter or comma to add a tag. Max 8 tags.</p>
        </div>

        {/* Markdown Editor */}
        <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm">
          <div className="px-5 py-3 border-b border-zinc-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-zinc-400" />
              <span className="text-sm font-medium text-zinc-600">Content</span>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => contentImageInputRef.current?.click()}
                disabled={contentImageUploading}
                className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                {contentImageUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />}
                Insert Image
              </button>
              <input ref={contentImageInputRef} type="file" accept="image/*" className="hidden" onChange={handleContentImageUpload} />
              <span className="text-xs text-zinc-400">Markdown supported</span>
            </div>
          </div>

          {/* @uiw/react-md-editor — full GitHub / SO style toolbar */}
          <MDEditor
            value={content}
            onChange={v => setContent(v || "")}
            height={600}
            preview="live"
            visibleDragbar={false}
            style={{ borderRadius: 0, border: "none" }}
            textareaProps={{ placeholder: "Start writing your blog post here...\n\nUse **bold**, *italic*, `code`, ## headings, > quotes, ```code blocks```, tables, and more!" }}
            previewOptions={{
              components: {
                img: (props: any) => {
                  if (!props.src) return null;
                  return <img {...props} />;
                }
              }
            }}
          />
        </div>

        {/* Bottom actions */}
        <div className="flex items-center justify-end gap-3 pb-8">
          <button
            onClick={() => handleSave(false)}
            disabled={saving}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl border border-zinc-200 text-zinc-700 font-medium hover:bg-zinc-50 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> Save Draft
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={saving}
            className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold shadow-md shadow-amber-200 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Publish Post
          </button>
        </div>
      </div>
    </div>
  );
}
