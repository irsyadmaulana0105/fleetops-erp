# Architecture and Security Guidelines

| Attribute | Value |
| :-- | :-- |
| Scope | Infrastructure, application architecture, business workflow, security, deployment |
| Status | Phases 0–2 implemented; Phases 3–5 planned (labelled *Planned*) |
| Related | [`data-model.md`](./data-model.md), [`ai-development-roadmap.md`](./ai-development-roadmap.md) |

## 1. Architectural Principles

1. **Single deployable unit.** One Next.js application serves the user interface, server actions, and route handlers. No separate API service is introduced until a requirement demands it.
2. **Server-authoritative.** Business rules, validation, and authorisation execute on the server. The client is a presentation layer.
3. **Transactional core.** Stock, status, and financial changes are atomic.
4. **Low operational cost.** The system is operable on a single VPS with Docker, without managed cloud services.
5. **Progressive hardening.** Security controls that depend on production topology (rate limiting, edge firewall, offsite backup) are delivered in Phase 5.

## 2. Infrastructure Topology

```text
  [ Browser / Installed PWA — desktop, tablet, field-team mobile device ]
                          │  HTTPS
                          ▼
              ┌───────────────────────┐
              │ Reverse proxy         │   Coolify / Traefik, TLS termination
              │ (network: proxy_net)  │   Planned: edge WAF and rate limiting
              └───────────┬───────────┘
                          ▼
   ┌─────────────────────────────────────────────────┐
   │ Docker host (single VPS)                        │
   │                                                 │
   │  ┌──────────────────────┐   ┌────────────────┐  │
   │  │ app (Next.js 15)     │──►│ db             │  │
   │  │ container: fleetops_ │   │ PostgreSQL 16  │  │
   │  │ app, port 3000       │   │ network:       │  │
   │  │                      │   │ fleetops_      │  │
   │  │ /app/storage ◄───────┼─┐ │ internal only  │  │
   │  └──────────────────────┘ │ └────────────────┘  │
   │            volume: fleetops_storage             │
   │            volume: postgres_data                │
   └─────────────────────────────────────────────────┘
```

| Component | Specification |
| :-- | :-- |
| Application container | Multi-stage `Dockerfile`; non-root runtime user `nextjs`; `docker-entrypoint.sh` runs `prisma migrate deploy` (retried until the database is ready), then `next start` |
| Database | PostgreSQL 16 on the internal network `fleetops_internal`; not published to the public network |
| Persistent volumes | `postgres_data` (database), `fleetops_storage` mounted at `/app/storage` (uploaded files) |
| Health check | `GET /api/health` |
| Environment | `DATABASE_URL`, `AUTH_SECRET`, `STORAGE_DIR` (default `./storage`; `/app/storage` in the container) |
| Seed data | Not executed automatically in containers; refuses to run when `NODE_ENV=production` unless `ALLOW_SEED=true` |

## 3. Application Architecture

### 3.1 Request Flow

```text
 Request ─► middleware (Edge: verify JWT cookie, redirect unauthenticated)
        ─► Server Component page (requireUser / requireRole, data read via Prisma)
        ─► Server Action (authorize ─► zod parse ─► service call ─► revalidate)
              └─► Service (prisma.$transaction: conditional updates, stock changes)
```

### 3.2 Layer Responsibilities

| Layer | Location | Responsibility |
| :-- | :-- | :-- |
| Gate | `src/middleware.ts` | Cheap authentication check using a JWT verifiable at the Edge. Not an authorisation boundary |
| Pages | `src/app/(dashboard)/**/page.tsx` | Server-rendered views; resolve the current user and enforce role access |
| Actions | `**/actions.ts` | Entry point for mutations. Each action calls `authorize(...)`, parses input, delegates to a service or Prisma, maps errors |
| Services | `src/lib/services/` | Multi-step transactional business logic (receive a purchase order; complete a work order and deduct stock) |
| Validation | `src/lib/validation/` | zod schemas, enum labels, state-transition tables |
| Infrastructure | `src/lib/` | Prisma singleton, session, storage, numbering, date and currency formatting |
| UI | `src/components/` | Layout shell, forms and dialogs, data lists (table on desktop, cards on small viewports), toasts |

### 3.3 Engineering Conventions

- **State transitions.** Allowed transitions are declared in a table (for example `PO_TRANSITIONS`) and applied with a conditional `updateMany` whose `where` clause includes the expected current status. Zero affected rows indicates a concurrent change and the operation is rejected.
- **Document numbering.** Numbers follow `PREFIX/YYYY/MM/NNN`, derived per month. The unique constraint on the number column is the arbiter; creation retries on `P2002`.
- **Money.** `Decimal(15,2)` columns; arithmetic with `Prisma.Decimal`.
- **Time.** Persisted as UTC; parsed from and displayed in WIB through `src/lib/datetime.ts` and `src/lib/format.ts`.
- **Mutations feedback.** Server actions return a typed result; the form layer presents field errors inline and success or failure through a toast.

## 4. Business Workflow

```text
 [1] Customer request (service or spare parts)
        │
        ▼
 [2] Quotation drafted                                       — Planned (Phase 3)
        │  signed approval link sent to customer
        ▼
 [3] Customer approval (no login required)                   — Planned (Phase 3)
        │
        ├── imported / indent items ──► [4a] Purchase order to supplier       — Implemented
        │                                    draft → ordered → customs_cleared → received
        │                                    stock increases on receipt
        └── items in stock ───────────► [4b] Work order dispatched            — Implemented
                                             │
                                             ▼
 [5] Field execution on a mobile device                      — Implemented
     start (hour meter) → before / process / after photos
     → customer signature → expenses → completion
     completion deducts stock for the quotation's spare-part items
        │
        ▼
 [6] Invoice issued, due date = issue date + customer TOP     — Planned (Phase 3)
        │
        ▼
 [7] Monitoring, payment webhook, reminders, overdue status   — Planned (Phase 4)
        │
        ▼
 [8] Settlement: invoice status paid                          — Planned (Phase 4)
```

Note: stock deduction on work-order completion reads the linked quotation. It is verified at service level and becomes fully operational when the quotation module is delivered in Phase 3.

## 5. Security Model

### 5.1 Authentication and Session

- Credentials: email and password; passwords are stored as bcrypt hashes.
- Session: signed JWT (`jose`) in an `httpOnly` cookie, valid for 12 hours.
- The user's role and active status are re-read from the database on every request. A deactivated account loses access immediately, regardless of token validity.
- `AUTH_SECRET` is mandatory; the application refuses to authenticate without it.

### 5.2 Role-Based Access Control

| Role | Permitted scope |
| :-- | :-- |
| Owner | All modules, including user management. Planned: financial reports, receivables approval, audit log |
| Admin | Dashboard, customers, suppliers, spare parts, purchase orders, work orders (create, assign, review expenses). Planned: quotations and invoices |
| Mechanic | Dashboard and **own** work orders only: start, photos, customer signature, expenses, completion. Labour fees are not shown. No access to purchase orders or work-order creation |

Authorisation is enforced in every server action (`authorize` in `src/lib/action-helpers.ts`) and in every page and route handler. Resources a caller must not access return a not-found response.

### 5.3 Uploaded File Protection

| Control | Implementation |
| :-- | :-- |
| Storage | Local disk (`STORAGE_DIR`), outside `public/`; never in the database |
| Access | Only through `GET /files/[...path]`, which requires a valid session. Owner and admin may read all files; a mechanic may read only files belonging to their own work orders |
| Path safety | Requests must match a strict whitelist expression; traversal attempts return not-found |
| Content safety | Image type is determined by magic-byte inspection (JPEG, PNG, WebP), not by the declared MIME type; maximum 6 MB; random 32-character hexadecimal file names |
| Caching | `Cache-Control: private, max-age=300` |

Planned (Phase 5): migration to private object storage with short-lived presigned URLs if the deployment requires it.

### 5.4 Customer Approval Links — Planned (Phase 3)

Quotation approval by the customer, without an account, uses a tamper-evident link: an HMAC-signed token bound to the quotation identifier and an expiry (14 days), verified server-side. The stored token is compared as a hash. Approval and revision requests are single-use state transitions.

### 5.5 Hardening — Planned (Phase 5)

- Login and webhook rate limiting; input sanitisation review.
- Security headers and Content Security Policy.
- Edge firewall (for example Cloudflare WAF) in front of the reverse proxy; host firewall allowing only required ports.
- Encrypted, scheduled database backup to a separate remote location, including the `fleetops_storage` volume.
- Revocation of existing sessions on password change.

### 5.6 Known Limitations (Current Release)

| Item | Status |
| :-- | :-- |
| Login rate limiting | Not implemented (Phase 5) |
| Session revocation on password change | Not implemented (Phase 5) |
| Offsite backup | Not implemented (Phase 5); the storage directory must be included in manual backups |
| Customer signer name | Not captured; the signature is stored as an image only |
| Field actions by non-assignee | Only the assigned mechanic can perform field actions; owner and admin cannot act on a mechanic's behalf |
| Container image | Build verified by procedure only; to be validated on the target host before production use |

## 6. Mobile Responsive Viewports for Field and Operational Teams

Field teams operate on mobile devices under variable connectivity. The work-order interface is therefore specified as a first-class mobile viewport.

| Requirement | Specification |
| :-- | :-- |
| Reference viewports | 390 px (phone) and tablet width; no horizontal overflow at either |
| Layout | Data lists render as tables on wide viewports and as cards on narrow viewports; primary actions have touch targets of at least 44 px |
| Photo capture | `<input type="file" accept="image/*" capture="environment">`, with selection from the gallery also supported |
| Image processing | Client-side compression before upload: maximum edge 1600 px, JPEG quality 0.8, to remain within the request size limit (8 MB) and reduce mobile data use |
| Signature capture | Canvas pad using pointer events with `touch-action: none`; exported as a 600 px PNG and stored as a file |
| Completion control | A work order cannot be completed until a before photo, an after photo, and a customer signature exist |
| Installability | Progressive Web App: `app/manifest.ts`, service worker `public/sw.js`, offline fallback page |
| Time input | Date-time fields are entered in WIB |

## 7. Operational Considerations

| Concern | Current | Planned |
| :-- | :-- | :-- |
| Health monitoring | `/api/health` | Uptime monitoring and alerting (Phase 5) |
| Migrations | `prisma migrate deploy` at container start | Pre-deployment backup step (Phase 5) |
| Backups | Manual | Automated, encrypted, offsite (Phase 5) |
| Scheduled jobs | None | Daily overdue-invoice evaluation and reminders (Phase 4) |
| Observability | Container logs | Structured logging and error reporting (Phase 5) |
