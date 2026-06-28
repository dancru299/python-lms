/**
 * Rate limiter sliding-window LƯU TRONG BỘ NHỚ (in-memory).
 *
 * Mục tiêu: chặn brute-force mật khẩu (login) và lạm dụng gửi OTP (forgot-password)
 * mà KHÔNG thêm phụ thuộc/migration nào.
 *
 * ⚠️ Hạn chế trên môi trường serverless (Vercel): mỗi lambda instance giữ bộ nhớ
 * riêng và cold-start sẽ reset. Vì vậy đây là lớp phòng vệ "best-effort" — đủ tốt
 * cho dev và lưu lượng vừa, nhưng KHÔNG đảm bảo tuyệt đối khi chạy nhiều instance.
 * Khi cần chắc chắn, thay phần lưu trữ bên dưới bằng Redis/Upstash hoặc một bảng DB
 * dùng chung; giữ nguyên chữ ký các hàm là đủ.
 */

export interface RateLimitResult {
  /** true nếu hiện chưa vượt ngưỡng. */
  allowed: boolean;
  /** Số lần còn lại trong cửa sổ hiện tại (>= 0). */
  remaining: number;
  /** Số giây cần đợi trước khi thử lại (0 khi vẫn còn lượt). */
  retryAfterSec: number;
}

// key -> danh sách mốc thời gian (ms) của các lần đã ghi trong cửa sổ.
const store = new Map<string, number[]>();

// Tránh rò rỉ bộ nhớ: khi số key vượt ngưỡng, quét và bỏ các key đã hết hạn.
const MAX_KEYS = 10_000;
let lastSweep = 0;

function sweep(now: number, windowMs: number): void {
  if (store.size < MAX_KEYS || now - lastSweep < windowMs) return;
  lastSweep = now;
  const cutoff = now - windowMs;
  for (const [key, hits] of store) {
    const live = hits.filter((t) => t > cutoff);
    if (live.length === 0) store.delete(key);
    else store.set(key, live);
  }
}

/**
 * Xem trạng thái hiện tại MÀ KHÔNG ghi thêm lượt. Dùng để chặn sớm trước khi xử lý.
 */
export function peekRateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const cutoff = now - windowMs;
  const hits = (store.get(key) ?? []).filter((t) => t > cutoff);

  if (hits.length >= limit) {
    const retryAfterSec = Math.max(
      1,
      Math.ceil((hits[0] + windowMs - now) / 1000)
    );
    return { allowed: false, remaining: 0, retryAfterSec };
  }
  return { allowed: true, remaining: limit - hits.length, retryAfterSec: 0 };
}

/**
 * Ghi nhận một lần (vd: một lần đăng nhập thất bại) vào cửa sổ.
 */
export function recordRateLimitHit(key: string, windowMs: number): void {
  const now = Date.now();
  const cutoff = now - windowMs;
  const hits = (store.get(key) ?? []).filter((t) => t > cutoff);
  hits.push(now);
  store.set(key, hits);
  sweep(now, windowMs);
}

/**
 * Xóa toàn bộ lượt đã ghi cho key (vd: đăng nhập thành công thì reset bộ đếm).
 */
export function clearRateLimit(key: string): void {
  store.delete(key);
}

/** Chỉ dùng cho test: xóa sạch state. */
export function __resetRateLimitStore(): void {
  store.clear();
  lastSweep = 0;
}

/**
 * Lấy IP client từ header proxy (Vercel đặt x-forwarded-for). Trả "unknown" nếu
 * không xác định được — vẫn dùng được làm khóa (gộp chung các request không rõ IP).
 */
export function getClientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}
