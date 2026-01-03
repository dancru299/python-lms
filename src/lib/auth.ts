import crypto from "crypto";

const SALT = process.env.PASSWORD_SALT || "python-lms-2024-secret";

export function hashPassword(password: string): string {
  return crypto
    .createHash("sha256")
    .update(password + SALT)
    .digest("hex");
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}
