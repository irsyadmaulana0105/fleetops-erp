# FleetOps ERP

Enterprise resource planning system for B2B forklift service and spare-parts operations: imported spare-parts procurement, warehouse stock control, digital work orders executed on mobile devices by field teams, quotations, and invoicing with Terms of Payment of up to 180 days.

## Technology Stack

| Component | Technology |
| :-- | :-- |
| Framework | Next.js 15 (App Router, TypeScript, React 19) |
| Database | PostgreSQL 16 with Prisma ORM 7 (`pg` driver adapter) |
| Interface | Tailwind CSS v4, lucide-react icons |
| PWA | `app/manifest.ts`, `public/sw.js` |
| Deployment | Docker (`docker-compose.yml`), Coolify or VPS |

## Delivery Status

| Phase | Scope | Status |
| :-- | :-- | :-- |
| 0 | Foundation: schema, seed, dashboard layout, PWA | Delivered |
| 1 | Authentication, role-based access, master data, low-stock alerts | Delivered |
| 2 | Import purchase orders; mobile work orders for field teams | Delivered, pending verification |
| 3 | Quotation and invoice (TOP up to 180 days), signed approval, PDF | Planned |
| 4 | Financial monitoring, payment webhook, notifications | Planned |
| 5 | Security hardening, backup, production deployment | Planned |

## Documentation

| Document | Content |
| :-- | :-- |
| [`docs/README.md`](docs/README.md) | Documentation index, Standard Engineering Practices, Error Handling & Troubleshooting Protocols |
| [`docs/architecture.md`](docs/architecture.md) | Architecture and security guidelines |
| [`docs/data-model.md`](docs/data-model.md) | Data model specification |
| [`docs/ai-development-roadmap.md`](docs/ai-development-roadmap.md) | AI-Assisted Development Framework, roadmap, AI Context Injection Protocols |

## Local Development

Prerequisites: Node.js 20.9 or later and PostgreSQL 16.

```bash
npm install
cp .env.example .env          # set DATABASE_URL and AUTH_SECRET (openssl rand -base64 48)
npm run db:generate           # generate Prisma Client into src/generated
npm run db:deploy             # apply migrations
npm run db:seed               # development sample data only
npm run dev                   # http://localhost:3000
```

Sample accounts (default password `Fleetops#2026`, or set `SEED_DEFAULT_PASSWORD`): `owner@fleetops.test`, `admin@fleetops.test`, `mekanik1@fleetops.test`, `mekanik2@fleetops.test`.

Quality gates: `npm run typecheck` and `npm run build`.

### Authentication and Access Control

Email and password login (bcrypt). The session is a JWT in an `httpOnly` cookie valid for 12 hours. Role and active status are re-read from the database on every request, so a deactivated account loses access immediately.

| Role | Access |
| :-- | :-- |
| Owner | All modules, including user management |
| Admin | Dashboard, customers, suppliers, spare parts, purchase orders, work orders (create, assign, review expenses) |
| Mechanic | Dashboard and own work orders only (start, photos, customer signature, expenses, completion) |

Every server action performs its own role check (`authorize` in `src/lib/action-helpers.ts`). Hiding a menu item is not an access control.

## Deployment (Docker / Coolify)

`docker-compose.yml` defines `app` (Next.js) and `db` (PostgreSQL 16). The network `proxy_net` is external; create it when running outside Coolify:

```bash
docker network create proxy_net
docker compose up -d --build
```

Required environment for `app`: `DATABASE_URL` and `AUTH_SECRET`.

```yaml
      - AUTH_SECRET=${AUTH_SECRET}
```

### Uploaded File Storage

Work photos, receipts, and customer signatures are stored on disk, outside `public/` and outside the database, and are served only through the authenticated route `/files/...`. Owner and admin may read all files; a mechanic may read only files of their own work orders. The location is set by `STORAGE_DIR` (default `./storage`; `/app/storage` in the container). Mount a persistent volume so files survive container recreation:

```yaml
    volumes:
      - fleetops_storage:/app/storage
```

```yaml
volumes:
  postgres_data:
  fleetops_storage:
```

The storage volume must be included in backups together with the database (Phase 5).

At start, `docker-entrypoint.sh` runs `prisma migrate deploy` (retried until the database is ready) and then `next start`. The health check is `GET /api/health`. Seed data is not run automatically and refuses to run when `NODE_ENV=production` unless `ALLOW_SEED=true`.

## Repository Structure

```text
prisma/
  schema.prisma          # data model (see docs/data-model.md)
  migrations/            # SQL migrations (including CHECK qty > 0 on PO items)
  seed.ts                # sample data
prisma.config.ts         # datasource URL and seed command (Prisma 7)
src/
  app/
    login/               # login and logout
    (dashboard)/         # authenticated pages with sidebar
      dashboard/ customers/ suppliers/ spareparts/ users/
      purchase-orders/   # list, create, edit draft, detail with status workflow
      work-orders/       # list, create, detail; [id]/ holds the mobile field-execution view
      [section]/         # placeholder pages for modules not yet delivered
    api/health/          # health check
    files/[...path]/     # authenticated delivery of uploaded files
    offline/             # PWA offline page
  components/            # layout shell, UI primitives, PWA registration
  lib/
    services/            # transactional business logic
    validation/          # zod schemas and transition tables
    storage.ts datetime.ts numbering.ts format.ts session.ts action-helpers.ts
  middleware.ts          # authentication gate
docs/                    # technical documentation
```

## Known Limitations (Current Release)

- Stock deduction on work-order completion reads the linked quotation and becomes fully effective with the quotation module (Phase 3).
- Login rate limiting, session revocation on password change, and automated offsite backup are scheduled for Phase 5.
- The customer signature is stored as an image without a signer name.
- Only the assigned mechanic can perform field actions on a work order.
- The container image build should be validated on the target host before production use.
