import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mediaUrl } from "./media";

describe("mediaUrl", () => {
  const originalEnv = process.env.NEXT_PUBLIC_MEDIA_URL;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_MEDIA_URL = "http://localhost:8000";
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_MEDIA_URL = originalEnv;
  });

  it("returns null for absent paths", () => {
    expect(mediaUrl(null)).toBeNull();
    expect(mediaUrl(undefined)).toBeNull();
    expect(mediaUrl("")).toBeNull();
  });

  it("returns null for whitespace-only paths", () => {
    expect(mediaUrl("   ")).toBeNull();
  });

  it("passes absolute URLs through untouched", () => {
    expect(mediaUrl("https://cdn.example.com/a.jpg")).toBe(
      "https://cdn.example.com/a.jpg",
    );
    expect(mediaUrl("http://example.com/b.jpg")).toBe("http://example.com/b.jpg");
  });

  it("resolves a relative path against NEXT_PUBLIC_MEDIA_URL", () => {
    expect(mediaUrl("/uploads/profiles/x.jpg")).toBe(
      "http://localhost:8000/uploads/profiles/x.jpg",
    );
  });

  it("resolves /static paths against NEXT_PUBLIC_MEDIA_URL", () => {
    expect(mediaUrl("/static/profile_photos/y.jpg")).toBe(
      "http://localhost:8000/static/profile_photos/y.jpg",
    );
  });

  it("tolerates a missing leading slash", () => {
    expect(mediaUrl("uploads/profiles/z.jpg")).toBe(
      "http://localhost:8000/uploads/profiles/z.jpg",
    );
  });

  it("does not double up slashes if NEXT_PUBLIC_MEDIA_URL has a trailing slash", () => {
    process.env.NEXT_PUBLIC_MEDIA_URL = "http://localhost:8000/";
    expect(mediaUrl("/uploads/a.jpg")).toBe("http://localhost:8000/uploads/a.jpg");
  });

  it("falls back to relative path if NEXT_PUBLIC_MEDIA_URL is unset", () => {
    delete process.env.NEXT_PUBLIC_MEDIA_URL;
    expect(mediaUrl("/uploads/a.jpg")).toBe("/uploads/a.jpg");
  });

  it("passes through data URIs", () => {
    const uri = "data:image/png;base64,iVBORw0KGgo=";
    expect(mediaUrl(uri)).toBe(uri);
  });
});
