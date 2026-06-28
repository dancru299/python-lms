import { describe, it, expect } from "vitest";
import crypto from "crypto";
import { hashPassword, verifyPassword, isLegacyHash } from "./auth";

// Cùng công thức legacy như trong auth.ts (sha256(password + salt)) để dựng hash cũ.
const LEGACY_SALT = process.env.PASSWORD_SALT || "python-lms-2024-secret";
function makeLegacyHash(password: string): string {
  return crypto
    .createHash("sha256")
    .update(password + LEGACY_SALT)
    .digest("hex");
}

describe("hashPassword", () => {
  it("tạo hash định dạng scrypt$<salt>$<hash>", async () => {
    const hash = await hashPassword("correct horse battery staple");
    const parts = hash.split("$");
    expect(parts[0]).toBe("scrypt");
    expect(parts[1]).toMatch(/^[0-9a-f]{32}$/); // salt 16 byte hex
    expect(parts[2]).toMatch(/^[0-9a-f]{128}$/); // key 64 byte hex
  });

  it("sinh salt ngẫu nhiên: hai lần băm cùng mật khẩu cho hash khác nhau", async () => {
    const a = await hashPassword("same-password");
    const b = await hashPassword("same-password");
    expect(a).not.toBe(b);
  });
});

describe("verifyPassword (scrypt)", () => {
  it("chấp nhận đúng mật khẩu", async () => {
    const hash = await hashPassword("s3cr3t!");
    expect(await verifyPassword("s3cr3t!", hash)).toBe(true);
  });

  it("từ chối sai mật khẩu", async () => {
    const hash = await hashPassword("s3cr3t!");
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });

  it("từ chối hash scrypt méo mó (thiếu phần)", async () => {
    expect(await verifyPassword("x", "scrypt$onlysalt")).toBe(false);
  });
});

describe("verifyPassword (legacy SHA-256 fallback)", () => {
  it("vẫn cho đăng nhập với hash cũ đúng mật khẩu", async () => {
    const legacy = makeLegacyHash("old-password");
    expect(await verifyPassword("old-password", legacy)).toBe(true);
  });

  it("từ chối hash cũ khi sai mật khẩu", async () => {
    const legacy = makeLegacyHash("old-password");
    expect(await verifyPassword("nope", legacy)).toBe(false);
  });
});

describe("isLegacyHash", () => {
  it("true cho hash không phải scrypt", () => {
    expect(isLegacyHash(makeLegacyHash("x"))).toBe(true);
  });

  it("false cho hash scrypt", async () => {
    expect(isLegacyHash(await hashPassword("x"))).toBe(false);
  });
});
