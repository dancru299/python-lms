import crypto from "crypto";

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  role: string;
  exp: number;
}

/**
 * Returns the HMAC secret used to sign session cookies.
 * In production a strong SESSION_SECRET is required; in development we fall back
 * to a fixed insecure value so local work doesn't need any setup.
 */
function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length >= 16) {
    return secret;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "SESSION_SECRET is missing or too short (need >= 16 chars) in production"
    );
  }
  return "dev-insecure-session-secret-change-me-please";
}

/**
 * Creates a tamper-proof session token: `base64url(payload).base64url(HMAC)`.
 * The HMAC binds the payload to SESSION_SECRET so the role/userId cannot be forged.
 */
export function signSession(payload: SessionPayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto
    .createHmac("sha256", getSecret())
    .update(body)
    .digest("base64url");
  return `${body}.${sig}`;
}

/**
 * Verifies a session token's signature and expiry. Returns the payload when the
 * signature is valid and the session has not expired, otherwise null.
 */
export function verifySession(
  token: string | undefined | null
): SessionPayload | null {
  if (!token) return null;

  const dot = token.indexOf(".");
  if (dot <= 0) return null;

  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  const expected = crypto
    .createHmac("sha256", getSecret())
    .update(body)
    .digest("base64url");

  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expected);
  if (
    sigBuf.length !== expectedBuf.length ||
    !crypto.timingSafeEqual(sigBuf, expectedBuf)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString()
    ) as SessionPayload;
    if (typeof payload?.exp !== "number" || payload.exp < Date.now()) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
