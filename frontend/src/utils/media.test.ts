import { describe, expect, it, vi } from "vitest";
import { mediaUrl } from "./media";

// getApiBaseUrl() reads window.location, so pin it to a known value.
vi.mock("./api", () => ({
  getApiBaseUrl: () => "http://localhost:8000/api/v1",
}));

describe("mediaUrl", () => {
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

  it("resolves a relative path against the API origin, not /api/v1", () => {
    // The bug being fixed: media is served from the server root, so the
    // /api/v1 suffix must be stripped or the URL 404s.
    expect(mediaUrl("/uploads/profiles/x.jpg")).toBe(
      "http://localhost:8000/uploads/profiles/x.jpg",
    );
  });

  it("resolves /static paths the same way", () => {
    expect(mediaUrl("/static/profile_photos/y.jpg")).toBe(
      "http://localhost:8000/static/profile_photos/y.jpg",
    );
  });

  it("tolerates a missing leading slash", () => {
    expect(mediaUrl("uploads/profiles/z.jpg")).toBe(
      "http://localhost:8000/uploads/profiles/z.jpg",
    );
  });

  it("does not double up slashes", () => {
    expect(mediaUrl("/uploads/a.jpg")).not.toContain("//uploads");
  });

  it("passes through data URIs", () => {
    const uri = "data:image/png;base64,iVBORw0KGgo=";
    expect(mediaUrl(uri)).toBe(uri);
  });
});
