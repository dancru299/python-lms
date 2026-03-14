# Auth Contract

## Main Auth Endpoints

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/session`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`

## Session Shape

- `userId`
- `email`
- `name`
- `role`
- `exp`

## Role Rules

- Registration allows only `student` or `teacher`.
- Admin role assigned manually/administratively.
- Teacher area includes `teacher` and `admin`.

## Sensitive Files

- `src/lib/auth.ts`
- `src/lib/session.ts`
- `src/app/api/auth/*`
