import crypto from "crypto";

// Legacy SHA-256 scheme kept only so existing accounts can still log in.
// New/updated passwords are stored with scrypt (see hashPassword).
const LEGACY_SALT = process.env.PASSWORD_SALT || "python-lms-2024-secret";
const SCRYPT_KEYLEN = 64;

function legacyHash(password: string): string {
  return crypto
    .createHash("sha256")
    .update(password + LEGACY_SALT)
    .digest("hex");
}

function scrypt(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, SCRYPT_KEYLEN, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey);
    });
  });
}

/**
 * Hashes a password with scrypt (memory-hard KDF, Node built-in).
 * Format: `scrypt$<salt-hex>$<hash-hex>`.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = await scrypt(password, salt);
  return `scrypt$${salt}$${derived.toString("hex")}`;
}

/** True when a stored hash uses the old, weak SHA-256 scheme. */
export function isLegacyHash(stored: string): boolean {
  return !stored.startsWith("scrypt$");
}

/**
 * Verifies a password against a stored hash. Supports both the new scrypt
 * format and the legacy SHA-256 format (so old accounts keep working until
 * their hash is upgraded on next login). Comparisons are timing-safe.
 */
export async function verifyPassword(
  password: string,
  stored: string
): Promise<boolean> {
  if (stored.startsWith("scrypt$")) {
    const [, salt, hashHex] = stored.split("$");
    if (!salt || !hashHex) return false;
    const derived = await scrypt(password, salt);
    const expected = Buffer.from(hashHex, "hex");
    return (
      expected.length === derived.length &&
      crypto.timingSafeEqual(expected, derived)
    );
  }

  // Legacy SHA-256 fallback (timing-safe)
  const candidate = Buffer.from(legacyHash(password));
  const expected = Buffer.from(stored);
  return (
    candidate.length === expected.length &&
    crypto.timingSafeEqual(candidate, expected)
  );
}
