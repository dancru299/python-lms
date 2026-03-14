---
name: lms-prisma-ops
description: Handle Prisma schema, migrations, seeding, and data fixes for Python LMS. Use when changing models/relations, writing seed scripts, validating relational integrity, or preparing deployment data operations.
---

# Lms Prisma Ops

Use this workflow for DB changes.

1. Update `prisma/schema.prisma` with relation-safe changes.
2. Regenerate client and apply DB change (`db push` for quick iteration, migration for tracked changes).
3. Update seed logic if new required fields or relationships are introduced.
4. Validate dependent deletes/updates in API routes.
5. Run a smoke query path through affected pages/routes.

Use [references/model-map.md](references/model-map.md) as schema map.

## Commands

```powershell
npm run db:push
npm run db:migrate
npm run db:seed
```

## Guardrails

- Prefer explicit indexes/uniques for query-critical fields.
- Recheck cascade behavior before deleting parent records.
- Keep production datasource as MySQL contract.
