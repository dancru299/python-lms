import { describe, it, expect, beforeAll } from "vitest";
import { signSession, verifySession, type SessionPayload } from "./session-token";

// Đặt secret cố định để test xác định, không phụ thuộc fallback dev.
beforeAll(() => {
  process.env.SESSION_SECRET = "test-secret-at-least-16-chars-long";
});

function makePayload(overrides: Partial<SessionPayload> = {}): SessionPayload {
  return {
    userId: "u1",
    email: "a@b.com",
    name: "Học sinh",
    role: "student",
    exp: Date.now() + 60_000,
    ...overrides,
  };
}

describe("signSession / verifySession", () => {
  it("round-trip: token hợp lệ trả lại đúng payload", () => {
    const payload = makePayload();
    const token = signSession(payload);
    expect(verifySession(token)).toEqual(payload);
  });

  it("trả null khi token rỗng/undefined", () => {
    expect(verifySession(null)).toBeNull();
    expect(verifySession(undefined)).toBeNull();
    expect(verifySession("")).toBeNull();
  });

  it("trả null khi không có dấu chấm phân tách", () => {
    expect(verifySession("khongcocodaucham")).toBeNull();
  });

  it("từ chối token bị sửa phần payload (chữ ký không khớp)", () => {
    const token = signSession(makePayload());
    const [body, sig] = token.split(".");
    // Đổi payload sang role admin nhưng giữ nguyên chữ ký cũ.
    const forgedBody = Buffer.from(
      JSON.stringify(makePayload({ role: "admin" }))
    ).toString("base64url");
    expect(verifySession(`${forgedBody}.${sig}`)).toBeNull();
    // Giữ nguyên để chắc chắn token gốc vẫn hợp lệ.
    expect(verifySession(`${body}.${sig}`)).not.toBeNull();
  });

  it("từ chối token đã hết hạn", () => {
    const token = signSession(makePayload({ exp: Date.now() - 1000 }));
    expect(verifySession(token)).toBeNull();
  });

  it("từ chối token ký bằng secret khác", () => {
    const token = signSession(makePayload());
    process.env.SESSION_SECRET = "another-secret-16-characters!!";
    expect(verifySession(token)).toBeNull();
    // Khôi phục cho các test sau.
    process.env.SESSION_SECRET = "test-secret-at-least-16-chars-long";
  });
});
