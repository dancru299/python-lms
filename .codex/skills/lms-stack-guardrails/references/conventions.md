# Conventions

## Tech Baseline

- Next.js 15.1.3 (App Router)
- React 19
- Prisma 5 (MySQL in `schema.prisma`)
- Tailwind CSS + custom utility classes
- Custom cookie session (base64 JSON)

## Non-Negotiable App Contracts

- Session payload uses `userId`, not `id`.
- Session expiry compares `exp` to `Date.now()`.
- Teacher permissions include both `teacher` and `admin`.
- Admin-only flows must check `role === "admin"`.
- Password hashing should go through `src/lib/auth.ts`.

## Style and UX Contracts

- Keep Vietnamese labels/messages for UI and API errors.
- Keep existing utility class vocabulary (`btn`, `card`, `input`, `badge`).
- Keep lesson content HTML-compatible (`dangerouslySetInnerHTML` consumers already exist).

## High-Risk Files

- `src/lib/session.ts`
- `src/lib/auth.ts`
- `src/app/api/auth/*`
- `src/app/api/submissions/*`
- `src/app/api/notifications/route.ts`
