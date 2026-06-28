import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  peekRateLimit,
  recordRateLimitHit,
  clearRateLimit,
  getClientIp,
  __resetRateLimitStore,
} from "./rate-limit";

const WINDOW = 60_000;

beforeEach(() => {
  __resetRateLimitStore();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("peek/record/clear", () => {
  it("peek không tiêu thụ lượt", () => {
    const key = "k";
    for (let i = 0; i < 100; i++) peekRateLimit(key, 3, WINDOW);
    expect(peekRateLimit(key, 3, WINDOW).allowed).toBe(true);
  });

  it("chặn sau khi đạt ngưỡng và đếm remaining đúng", () => {
    const key = "k";
    expect(peekRateLimit(key, 3, WINDOW).remaining).toBe(3);
    recordRateLimitHit(key, WINDOW);
    recordRateLimitHit(key, WINDOW);
    expect(peekRateLimit(key, 3, WINDOW).remaining).toBe(1);
    recordRateLimitHit(key, WINDOW);
    const blocked = peekRateLimit(key, 3, WINDOW);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });

  it("clearRateLimit reset bộ đếm", () => {
    const key = "k";
    recordRateLimitHit(key, WINDOW);
    recordRateLimitHit(key, WINDOW);
    recordRateLimitHit(key, WINDOW);
    expect(peekRateLimit(key, 3, WINDOW).allowed).toBe(false);
    clearRateLimit(key);
    expect(peekRateLimit(key, 3, WINDOW).allowed).toBe(true);
  });

  it("lượt cũ ngoài cửa sổ bị bỏ qua (sliding window)", () => {
    const key = "k";
    recordRateLimitHit(key, WINDOW);
    recordRateLimitHit(key, WINDOW);
    recordRateLimitHit(key, WINDOW);
    expect(peekRateLimit(key, 3, WINDOW).allowed).toBe(false);
    // Vượt qua cửa sổ -> các lượt cũ hết hiệu lực.
    vi.advanceTimersByTime(WINDOW + 1);
    expect(peekRateLimit(key, 3, WINDOW).allowed).toBe(true);
  });

  it("các key độc lập với nhau", () => {
    recordRateLimitHit("a", WINDOW);
    recordRateLimitHit("a", WINDOW);
    recordRateLimitHit("a", WINDOW);
    expect(peekRateLimit("a", 3, WINDOW).allowed).toBe(false);
    expect(peekRateLimit("b", 3, WINDOW).allowed).toBe(true);
  });
});

describe("getClientIp", () => {
  it("lấy IP đầu tiên trong x-forwarded-for", () => {
    const req = new Request("https://x", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    });
    expect(getClientIp(req)).toBe("1.2.3.4");
  });

  it("fallback x-real-ip", () => {
    const req = new Request("https://x", { headers: { "x-real-ip": "9.9.9.9" } });
    expect(getClientIp(req)).toBe("9.9.9.9");
  });

  it("trả 'unknown' khi không có header", () => {
    expect(getClientIp(new Request("https://x"))).toBe("unknown");
  });
});
