# MALP — Content Management Backend

An admin-facing content management application for managing places, geographic areas, promotional banners, and media. The project combines a Next.js dashboard with versioned API routes and a relational data model.

> **Project status:** Engineering project / work in progress. The repository documents implemented source code, not a security audit or production-service guarantee.

## Engineering highlights

| Area | Implementation |
| --- | --- |
| Application | Next.js 16 App Router, React 19, server-side API routes |
| Persistence | PostgreSQL, Prisma schema and migrations |
| Access | CMS sessions, role-aware user records, JWT/refresh-session models |
| Data modeling | Country → province → city → outlet, opening hours and facilities |
| Assets | Image metadata and object-storage integration |
| Controls | Zod request validation, rate limiting and audit records |

## Main modules

- **CMS dashboard:** outlet, area, banner, facility, and category-highlight management screens.
- **Versioned API:** route handlers under [`src/app/api/v1`](src/app/api/v1) for areas, outlets, banners, uploads, and authentication.
- **Data foundations:** geographic hierarchy, draft/active outlet lifecycle, room/menu images, sessions, refresh sessions, and audit logs in [`prisma/schema.prisma`](prisma/schema.prisma).
- **Operational boundaries:** request validation, error responses, authentication helpers, rate limits, and storage adapters under [`src/lib`](src/lib).

## Architecture

```text
CMS browser → Next.js pages / API routes → validation & access checks
                                      ├─ Prisma → PostgreSQL
                                      └─ storage adapter → media storage
```

## Run locally

Requirements: Node.js compatible with Next.js 16, pnpm, and a disposable PostgreSQL database. Additional storage or rate-limit services are needed to exercise the corresponding integrations.

```bash
pnpm install --frozen-lockfile
# Create a private .env with DATABASE_URL and DIRECT_URL.
# Configure SESSION_SECRET, JWT_ACCESS_SECRET and JWT_REFRESH_SECRET.
pnpm prisma generate
pnpm prisma migrate dev
pnpm dev
```

Open `http://localhost:3000`. Use `pnpm build`, `pnpm lint`, and `pnpm test` for the available build, static analysis, and Vitest checks. Do not point local migrations or seed scripts at a shared database.

## Configuration and data safety

- Database: `DATABASE_URL`, `DIRECT_URL`.
- Authentication: `SESSION_SECRET`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`; production mode requires explicit non-default secrets.
- Other integrations have additional settings; inspect [`src/lib/config.ts`](src/lib/config.ts) and the storage adapter before enabling them.
- The repository contains development seed fixtures and example identities. **Never reuse sample passwords or seed a publicly reachable database without replacing them.** Keep actual values in private environment configuration.

## Evidence and limitations

- [Data-model and migration notes](docs/milestone1.md)
- [Prisma schema](prisma/schema.prisma) and [migrations](prisma/migrations)
- [Validation tests](tests/validation.test.ts)
- [Application source](src/app)

This README does not claim a completed independent penetration test, full integration-test coverage, or a production cutover. Before public deployment, validate identity setup, initial accounts, object-storage policy, and database permissions.
