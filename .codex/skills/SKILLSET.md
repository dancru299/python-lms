# Python LMS Skill Pack

## Skills

- `lms-stack-guardrails`: D�ng khi l�m m?i/refactor t�nh nang fullstack, d? gi? d�ng convention ki?n tr�c.
- `lms-lesson-authoring`: D�ng khi s?a lu?ng chuong/b�i/section/exercise v� m�n authoring.
- `lms-submission-grading`: D�ng khi s?a lu?ng n?p b�i, chiểmdi?m, tr?ng th�i, th�ng b�o.
- `lms-auth-session`: D�ng khi s?a dang nh?p/dang k�/session/OTP reset m?t kh?u.
- `lms-prisma-ops`: D�ng khi d?i schema, migration, seed, thao t�c d? li?u.

## Suggested Usage Order

1. Start with `lms-stack-guardrails`.
2. Add one domain skill (`lms-lesson-authoring` or `lms-submission-grading` or `lms-auth-session`).
3. Add `lms-prisma-ops` when schema/data changes are involved.

## Notes

- Skill files are stored under `.codex/skills/*` inside this repository.
- `lms-stack-guardrails` includes a script that currently detects existing session-shape mismatches in:
  - `src/app/api/lessons/[id]/route.ts`
  - `src/app/api/notifications/route.ts`
