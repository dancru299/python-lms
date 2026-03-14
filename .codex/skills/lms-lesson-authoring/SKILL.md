---
name: lms-lesson-authoring
description: Build or modify lesson/chapter authoring features for teachers/admins in Python LMS. Use when editing lesson CRUD APIs, section/exercise builders, content templates, sort order logic, or lesson rendering tabs.
---

# Lms Lesson Authoring

Implement lesson features with this workflow.

1. Read request scope and map it to lesson domain objects: `Chapter`, `Lesson`, `Section`, `Exercise`.
2. Update APIs first (`/api/admin/lessons`, `/api/admin/chapters`) to keep contract stable.
3. Update authoring UI (`/admin/lessons/new`, `/admin/lessons/[id]/edit`) and preserve payload shape.
4. Verify student rendering (`/lessons/[id]`) for tabs, HTML content rendering, and exercise display.
5. Validate sort order behavior after add/remove/reorder.

Use [references/payloads.md](references/payloads.md) for request/response contracts.

## Guardrails

- Keep exercise type limited to `practice` and `homework`.
- Preserve default point logic: practice lower, homework higher.
- Keep answer visibility behavior explicit (`answerVisible`).
- Do not break HTML template insertion flow for section content.
