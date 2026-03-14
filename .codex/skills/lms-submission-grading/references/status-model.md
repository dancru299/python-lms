# Status Model

## Submission Status

- `pending`: student submitted, waiting for grading.
- `graded`: teacher/admin graded with optional feedback.

## Relevant Tables

- `Submission`
- `Notification`
- `Exercise`
- `User`

## Notification Events

- `new_submission` to teachers/admins after successful student submission.
- `submission_graded` to student after grading.

## Relevant Files

- `src/app/api/submissions/route.ts`
- `src/app/api/submissions/[id]/grade/route.ts`
- `src/app/admin/grading/page.tsx`
- `src/app/admin/grading/[id]/GradingForm.tsx`
- `src/app/lessons/[id]/page.tsx`
