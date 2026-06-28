import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import type { SessionPayload } from "@/lib/session-token";

/**
 * Kết quả kiểm tra phiên cho API route, dạng union phân biệt (discriminated union):
 * - Thành công: `{ session: <payload>, response: null }`
 * - Thất bại:   `{ session: null, response: <NextResponse 401> }`
 *
 * Nhờ union này, hai cách dùng sau đều được TypeScript thu hẹp (narrow) đúng kiểu:
 *
 *   // 1) Chỉ cần chặn truy cập:
 *   const { response } = await requireTeacherSessionJson();
 *   if (response) return response;
 *
 *   // 2) Cần dùng thông tin phiên sau khi chặn:
 *   const auth = await requireUserSessionJson();
 *   if (!auth.session) return auth.response; // auth.response chắc chắn là NextResponse
 *   // ... auth.session ở đây chắc chắn là SessionPayload
 */
export type ApiSessionResult =
  | { session: SessionPayload; response: null }
  | { session: null; response: NextResponse };

function unauthorized(): ApiSessionResult {
  return {
    session: null,
    response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
  };
}

/** Yêu cầu bất kỳ người dùng nào đã đăng nhập (student/teacher/admin). */
export async function requireUserSessionJson(): Promise<ApiSessionResult> {
  const session = await getSession();
  if (!session) return unauthorized();
  return { session, response: null };
}

/** Yêu cầu vai trò teacher hoặc admin. */
export async function requireTeacherSessionJson(): Promise<ApiSessionResult> {
  const session = await getSession();
  if (!session || (session.role !== "teacher" && session.role !== "admin")) {
    return unauthorized();
  }
  return { session, response: null };
}

/** Yêu cầu vai trò admin. */
export async function requireAdminSessionJson(): Promise<ApiSessionResult> {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return unauthorized();
  }
  return { session, response: null };
}
