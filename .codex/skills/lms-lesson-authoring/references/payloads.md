# Payloads

## Create Lesson

Endpoint: `POST /api/admin/lessons`

Expected request keys:

- `chapterId`
- `title`
- `duration`
- `difficulty`
- `objectives.knowledge`
- `objectives.skills`
- `objectives.attitude`
- `sections[]` with `title`, `content`
- `exercises[]` with `type`, `title`, `question`, `answer`, `difficulty`, `points`

## Update Lesson

Endpoint: `PUT /api/admin/lessons/:id`

- Replace section/exercise collections fully.
- Preserve `answerVisible` when provided.

## Student Lesson Read

Endpoint: `GET /api/lessons/:id`

- Include chapter, ordered sections, ordered exercises.
- Attach `mySubmission` from latest user submission.

## Related Screens

- `src/app/admin/lessons/new/page.tsx`
- `src/app/admin/lessons/[id]/edit/page.tsx`
- `src/app/lessons/[id]/page.tsx`
