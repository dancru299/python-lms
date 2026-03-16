---
name: lms-stack-guardrails
description: Enforce architecture and coding guardrails for this Next.js 15 + Prisma LMS. Use when adding or refactoring API routes/pages, wiring new features, or reviewing code quality to keep session shape, role checks, DB patterns, and UI conventions consistent.
---

# Lms Stack Guardrails

Follow this sequence.

1. Confirm feature touches the current stack only: Next.js App Router (`src/app`), Prisma client (`src/lib/prisma.ts`), cookie session (`src/lib/session.ts`), Tailwind utility classes (`src/app/globals.css`).
2. Reuse existing route style: `NextRequest/NextResponse`, local helper for session validation, Vietnamese user-facing messages.
3. Preserve role model exactly: `student`, `teacher`, `admin`.
4. Preserve session payload keys exactly: `userId`, `email`, `name`, `role`, `exp`.
5. Keep server data fetching in async server components where possible; use client components only for stateful interactions.
6. Keep Prisma writes explicit and predictable; when deleting parent entities, consider dependent entities in correct order if no cascade exists.
7. Preserve Vietnamese text in UTF-8 when editing UI labels, API errors, and seeded content; do not downgrade accented copy to ASCII just to avoid encoding issues.

Use [references/conventions.md](references/conventions.md) before coding.

## Quick Checks

Run these checks after edits:

```powershell
npm run lint
npm run build
```

If you touched Vietnamese copy or uploaded/generated document content, also do a quick browser spot-check on the affected screens. Prefer verifying rendered text in the app over relying only on terminal regex scans, because PowerShell output can misread valid Vietnamese characters.

If auth/session code changed, also run:

```powershell
powershell -ExecutionPolicy Bypass -File .codex/skills/lms-stack-guardrails/scripts/check-session-shape.ps1
```
