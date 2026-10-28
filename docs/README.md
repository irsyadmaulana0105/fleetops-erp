# FleetOps ERP — Technical Documentation

| Attribute | Value |
| :-- | :-- |
| System | FleetOps ERP (forklift service and spare-parts management, B2B) |
| Document set | Technical documentation index |
| Audience | Software architects, engineers, technical reviewers, operations stakeholders |
| Stack | Next.js 15 (App Router, TypeScript), React 19, Prisma 7, PostgreSQL 16, Tailwind CSS v4 |
| Language | English (technical); user-facing application text is Indonesian |

## 1. Purpose and Scope

This document set specifies the architecture, data model, engineering standards, and delivery methodology of FleetOps ERP. It is the normative reference for design decisions and the context source for the AI-assisted development process described in `ai-development-roadmap.md`.

The system digitises the end-to-end service cycle of a forklift service and spare-parts business: imported spare-parts procurement, warehouse stock control, field work orders executed on mobile devices, quotations, and invoicing with extended payment terms (Terms of Payment up to 180 days).

## 2. Document Index

| Document | Content | Primary audience |
| :-- | :-- | :-- |
| [`architecture.md`](./architecture.md) | Infrastructure topology, application layering, business workflow, security model, field-operations viewports, deployment | Architects, DevOps, security reviewers |
| [`data-model.md`](./data-model.md) | Entity-relationship model, entity specifications, enumerations, state machines, document numbering, business invariants | Backend engineers, data analysts |
| [`ai-development-roadmap.md`](./ai-development-roadmap.md) | AI-Assisted Development Framework, phased roadmap (Phase 0–5), AI Context Injection Protocols | Engineering leads, contributors |
| [`../README.md`](../README.md) | Repository overview, local setup, deployment quick reference | All contributors |

## 3. Document Control

- The documents describe the system **as implemented** for Phases 0–2 and **as planned** for Phases 3–5. Planned content is explicitly labelled *Planned*.
- Any change to the Prisma schema, a state machine, or an authorisation rule must be reflected in the corresponding document within the same change set.
- Revision history is maintained in Section 6.

## 4. Standard Engineering Practices

The following practices apply to every change, whether authored by an engineer or produced by a code generation system.

1. **Single responsibility per delivery unit.** One module (data layer, validation, service, actions, pages) is delivered and verified as a whole before the next begins.
2. **Phase gating.** A phase is not started until the previous phase has been verified and committed by the maintainer.
3. **Specification before generation.** The relevant sections of `data-model.md` and `architecture.md` are supplied as context for every generation task. Generated output must not deviate from the specified schema.
4. **Server-side authorisation.** Every server action and route handler performs its own role check. Hiding a navigation item is not an access control.
5. **Validate at the boundary.** All external input is parsed with a zod schema before use. Error messages returned to users are specific and actionable.
6. **Monetary precision.** Monetary values use `Decimal(15,2)` in the database and `Prisma.Decimal` in code. Floating-point arithmetic on money is prohibited.
7. **Transactional integrity.** Operations that change stock, status, or financial state run in a single database transaction. State transitions use conditional updates (`updateMany` with a status predicate) to remain safe under concurrency.
8. **Time handling.** Servers run in UTC. Business dates are interpreted and displayed in WIB (Asia/Jakarta) using the helpers in `src/lib/datetime.ts`.
9. **Responsive by default.** Interfaces are built mobile-first and verified at a 390 px viewport and a tablet viewport, with no horizontal overflow.
10. **Verification before acceptance.** `npm run typecheck`, `npm run build`, and the phase acceptance checklist must pass before a phase is committed.
11. **Conventional commits.** Commit messages follow `type(scope): summary`, for example `feat(fase-2): ...`.

## 5. Error Handling and Troubleshooting Protocols

### 5.1 Application Error Handling Standard

| Layer | Requirement |
| :-- | :-- |
| Input validation | zod schema; field-level messages returned to the form; no stack traces to the client |
| Server actions | Return a typed result (`ok` / field errors / form error). Unique-constraint violations (`P2002`) and foreign-key violations (`P2003`) are mapped to user-readable messages |
| Transactions | Business-rule failures (for example insufficient stock) throw a domain error that rolls back the whole transaction |
| Authorisation | Failures return a not-found response for resources the caller must not know exist |
| Logging | Server-side errors are logged with context; secrets and personal data are never logged |

### 5.2 Troubleshooting Procedure for Generated Code

When a defect is detected in generated or hand-written code, follow this procedure in order:

1. **Capture** the complete error output (terminal, browser console, or server log) without truncation.
2. **Classify** the failure: environment (missing variable, service not running, Prisma Client not generated), compile-time (type error), runtime (exception), or behavioural (incorrect result).
3. **Isolate** the minimal set of files involved, including the schema excerpt from `data-model.md` that governs them.
4. **Reproduce** the failure with the smallest possible input.
5. **Remediate** under a constraint of no schema change unless the defect is demonstrably in the schema. When the generator is used for remediation, supply the error output, the affected files, and the constraint using the *Defect Remediation* protocol in `ai-development-roadmap.md`.
6. **Verify** with `npm run typecheck`, `npm run build`, and the failing scenario. Add a regression check when the defect was behavioural.

### 5.3 Common Environment Failures

| Symptom | Probable cause | Resolution |
| :-- | :-- | :-- |
| Type errors referencing `@/generated/prisma` | Prisma Client not generated | `npm run db:generate` |
| `Cannot resolve environment variable: DATABASE_URL` | `.env` missing or incomplete | Copy `.env.example` to `.env` and set `DATABASE_URL` |
| `ECONNREFUSED` on first database query | PostgreSQL not running or wrong host/port | Start the database; verify `DATABASE_URL` |
| Login fails with a server configuration message | `AUTH_SECRET` missing or shorter than the required length | Generate a value with `openssl rand -base64 48`; restart the server |
| Upload rejected as too large | Request body above the server action limit | Confirm `experimental.serverActions.bodySizeLimit` in `next.config.mjs`; images are compressed client-side before upload |
| Uploaded files disappear after redeploy | `/app/storage` is not backed by a persistent volume | Mount the `fleetops_storage` volume |

## 6. Revision History

| Version | Date | Description |
| :-- | :-- | :-- |
| 1.0 | 2026-10 | Initial specification (Laravel/Vue/MySQL planning baseline) |
| 2.0 | 2026-10 | Re-baselined to the implemented stack (Next.js, Prisma, PostgreSQL); Phases 0–2 documented as implemented, Phases 3–5 as planned; terminology and structure standardised |
