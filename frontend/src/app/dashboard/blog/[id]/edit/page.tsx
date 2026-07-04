"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import BlogEditor from "@/components/blog/BlogEditor";
import { getApiBaseUrl } from "@/utils/api";
import { Loader2 } from "lucide-react";

export default function EditBlogPage() {
  const params = useParams();
  const router = useRouter();
  const blogId = params?.id as string;
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const [blogData, setBlogData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!blogId) return;
    (async () => {
      const res = await fetch(`${getApiBaseUrl()}/blog/id/${blogId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setBlogData(await res.json());
      } else {
        router.push("/dashboard/blog");
      }
      setLoading(false);
    })();
  }, [blogId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  if (!blogData) return null;

  return <BlogEditor mode="edit" initialData={blogData} />;
}
