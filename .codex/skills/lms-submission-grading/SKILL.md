---
name: lms-submission-grading
description: Implement and maintain the student submission and teacher grading lifecycle in Python LMS. Use when working on submission creation, grading endpoints, grading forms, status transitions, notifications, and score/feedback handling.
---

# Lms Submission Grading

Follow this lifecycle.

1. Student submits via `POST /api/submissions` with `exerciseId`, `content`, `maxScore`.
2. Ensure single active submission per student per exercise unless explicit resubmission policy is requested.
3. Teacher/admin grades via `POST /api/submissions/:id/grade` with `score`, `maxScore`, `feedback`.
4. Update status and audit fields: `status`, `gradedAt`, `gradedBy`.
5. Emit notifications for both directions: new submission to teachers, graded result to student.

Use [references/status-model.md](references/status-model.md) before editing.

## Validation Checklist

- Enforce role checks (student submit, teacher/admin grade).
- Validate score boundaries against `maxScore`.
- Keep lesson and grading pages consistent with API fields.
- Preserve Vietnamese feedback/error wording.
