import { NextRequest, NextResponse } from "next/server";

const BACKEND_ORIGIN = (process.env.BACKEND_ORIGIN || "http://localhost:8000").replace(/\/$/, "");

// Allow large file uploads (images/PDFs up to 20MB + overhead)
export const runtime = "nodejs";
export const maxDuration = 60;

type RouteContext = { params: Promise<{ path?: string[] }> };

export async function GET(req: NextRequest, ctx: RouteContext) {
  return proxyToBackend(req, await ctx.params, "GET");
}
export async function POST(req: NextRequest, ctx: RouteContext) {
  return proxyToBackend(req, await ctx.params, "POST");
}
export async function PUT(req: NextRequest, ctx: RouteContext) {
  return proxyToBackend(req, await ctx.params, "PUT");
}
export async function PATCH(req: NextRequest, ctx: RouteContext) {
  return proxyToBackend(req, await ctx.params, "PATCH");
}
export async function DELETE(req: NextRequest, ctx: RouteContext) {
  return proxyToBackend(req, await ctx.params, "DELETE");
}

async function proxyToBackend(
  req: NextRequest,
  params: { path?: string[] },
  method: string
) {
  const pathSegments = params.path ?? [];
  const path = pathSegments.join("/");
  const search = req.nextUrl.search ?? "";
  const backendUrl = `${BACKEND_ORIGIN}/api/v1/${path}${search}`;

  // Forward headers, stripping Next.js / hop-by-hop headers
  const forwardHeaders: Record<string, string> = {};
  req.headers.forEach((val, key) => {
    if (!["host", "connection", "transfer-encoding"].includes(key.toLowerCase())) {
      forwardHeaders[key] = val;
    }
  });

  // Read body as raw bytes to preserve binary data (multipart file uploads)
  let body: Buffer | undefined;
  if (method !== "GET" && method !== "HEAD") {
    try {
      const arrayBuf = await req.arrayBuffer();
      if (arrayBuf.byteLength > 0) {
        body = Buffer.from(arrayBuf);
      }
    } catch {}
  }

  try {
    const backendRes = await fetch(backendUrl, {
      method,
      headers: forwardHeaders,
      body: body ? new Uint8Array(body) : undefined,
    });

    const resBody = await backendRes.arrayBuffer();

    const resHeaders = new Headers();
    backendRes.headers.forEach((val, key) => {
      if (!["transfer-encoding", "connection"].includes(key.toLowerCase())) {
        resHeaders.set(key, val);
      }
    });
    resHeaders.set("Access-Control-Allow-Origin", "*");

    return new NextResponse(Buffer.from(resBody), {
      status: backendRes.status,
      headers: resHeaders,
    });
  } catch (err: any) {
    console.error(`[API Proxy] Failed to reach backend at ${backendUrl}:`, err?.message);
    return NextResponse.json(
      { detail: "Backend unreachable. Is the server running?", error: String(err?.message) },
      { status: 502 }
    );
  }
}

