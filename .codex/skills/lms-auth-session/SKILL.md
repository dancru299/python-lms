---
name: lms-auth-session
description: Build and harden authentication/session flows for Python LMS. Use when changing login/register/logout/session, forgot/reset password OTP, role-based redirects, or password hashing/session cookie logic.
---

# Lms Auth Session

Execute auth tasks in this order.

1. Update hashing and verification logic in `src/lib/auth.ts` first.
2. Keep API auth routes aligned with the same hash strategy.
3. Keep session cookie payload and expiry logic aligned with `src/lib/session.ts`.
4. Verify role-based redirects for student vs teacher/admin.
5. Retest forgot/reset password OTP flow end-to-end.

Use [references/auth-contract.md](references/auth-contract.md) before coding.

## Required Consistency

- Never hardcode password salt in route files.
- Always reuse `hashPassword` and `verifyPassword` from shared lib.
- Keep session payload key names stable across all reads.
- Keep cookie name `session` unless a migration task explicitly changes it.
