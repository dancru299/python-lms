# Python LMS Skill Pack

## Skills

- `lms-stack-guardrails`: Dùng khi làm m?i/refactor tính nang fullstack, d? gi? dúng convention ki?n trúc.
- `lms-lesson-authoring`: Dùng khi s?a lu?ng chuong/bài/section/exercise và màn authoring.
- `lms-submission-grading`: Dùng khi s?a lu?ng n?p bài, ch?m di?m, tr?ng thái, thông báo.
- `lms-auth-session`: Dùng khi s?a dang nh?p/dang ký/session/OTP reset m?t kh?u.
- `lms-prisma-ops`: Dùng khi d?i schema, migration, seed, thao tác d? li?u.

## Suggested Usage Order

1. Start with `lms-stack-guardrails`.
2. Add one domain skill (`lms-lesson-authoring` or `lms-submission-grading` or `lms-auth-session`).
3. Add `lms-prisma-ops` when schema/data changes are involved.

## Notes

- Skill files are stored under `.codex/skills/*` inside this repository.
- `lms-stack-guardrails` includes a script that currently detects existing session-shape mismatches in:
  - `src/app/api/lessons/[id]/route.ts`
  - `src/app/api/notifications/route.ts`
