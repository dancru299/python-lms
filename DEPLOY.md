# Deploy Python LMS voi Supabase Postgres

Du an nay dung Prisma ORM va da duoc chuyen sang Supabase Postgres. Khuyen nghi deploy app tren Vercel/Node hosting, database tren Supabase.

## 1. Tao Supabase project

1. Tao project moi trong Supabase.
2. Vao **Project Settings -> Database -> Connection string**.
3. Lay 2 connection strings:
   - **Transaction pooler**, port `6543`, dung cho runtime/serverless.
   - **Session pooler**, port `5432`, dung cho Prisma migration/admin tooling.

Neu chi dung Prisma, co the tat Supabase Data API trong API Settings de giam be mat van hanh.

## 2. Environment variables

Dat cac bien sau trong `.env` local va trong dashboard deploy:

```env
DATABASE_URL="postgresql://postgres.PROJECT_REF:YOUR-PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres.PROJECT_REF:YOUR-PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres"
SUPABASE_URL="https://PROJECT_REF.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"
SUPABASE_STORAGE_BUCKET="lesson-media"
SESSION_SECRET="your-super-secret-random-key-32-chars"
```

Ghi chu:

- `DATABASE_URL` la runtime URL. Neu dung Vercel/serverless, hay dung transaction pooler port `6543`.
- `?pgbouncer=true` giup Prisma tuong thich voi transaction pooling.
- `DIRECT_URL` la session/direct URL de `prisma migrate deploy` chay schema changes.
- `SUPABASE_SERVICE_ROLE_KEY` chi dat o server/deploy environment, khong dua ra client.

## 3. Tao schema tren Supabase

Lan dau setup database moi:

```bash
npm install
npx prisma generate
npm run db:deploy
npm run db:seed
```

Sau nay khi deploy schema moi:

```bash
npm run db:deploy
```

Khong dung `prisma migrate dev` tren production. Len production chi dung `prisma migrate deploy`.

## 4. Deploy app

Build command:

```bash
npm run build
```

Start command neu chay Node server rieng:

```bash
npm run start
```

Tren Vercel, dat env vars trong **Project Settings -> Environment Variables**. Chay `npm run db:deploy` tu local/CI truoc khi deploy ban build moi co schema thay doi.

## 5. Du lieu cu tu MySQL

Schema da chuyen tu MySQL sang Postgres, nen du lieu cu khong tu dong sang Supabase. Co 2 cach:

- Neu chap nhan database moi: chay `npm run db:seed`.
- Neu can giu du lieu cu: export tu MySQL thanh CSV/SQL, chuyen kieu du lieu sang Postgres, roi import vao Supabase theo dung thu tu bang va foreign key.

## 6. Troubleshooting

### Prisma bao loi prepared statements / PgBouncer

Kiem tra `DATABASE_URL` co port `6543` va query `?pgbouncer=true`.

### Migration khong chay

Kiem tra `DIRECT_URL` dang dung port `5432` va user co quyen tao/sua schema.

### App ket noi DB timeout

Kiem tra Supabase project con active, password dung, region/PROJECT_REF dung, va env vars da duoc set trong moi truong deploy.

### Khong thay bang trong Supabase

Chay:

```bash
npm run db:deploy
```

Sau do refresh Supabase Table Editor.
