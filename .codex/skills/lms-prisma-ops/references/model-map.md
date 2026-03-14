# Model Map

## Core Learning Domain

- `Chapter` -> `Lesson` -> `Section`
- `Lesson` -> `Exercise`
- `Exercise` -> `Submission`

## User Domain

- `User` role: `student`, `teacher`, `admin`
- `UserProgress` unique by (`userId`, `lessonId`)
- `Notification` per `userId`

## Classroom Domain

- `Classroom` has one teacher (`teacherId`)
- `ClassroomStudent` join table for many-to-many student enrollment

## Security Domain

- `PasswordReset` stores OTP and expiry for reset flow

## Files

- `prisma/schema.prisma`
- `prisma/seed.ts`
- `prisma/seed.js`
