# AI-Assisted Development Roadmap and Methodology

| Attribute | Value |
| :-- | :-- |
| Scope | Development framework, phased delivery plan, AI Context Injection Protocols |
| Status | Phases 0–2 delivered; Phases 3–5 planned |
| Related | [`README.md`](./README.md) (Standard Engineering Practices, Troubleshooting Protocols), [`architecture.md`](./architecture.md), [`data-model.md`](./data-model.md) |

## 1. AI-Assisted Development Framework

### 1.1 Objective

Deliver a production-grade ERP through a controlled process in which an automated code generation system produces implementation artefacts under the direction of a human Software Architect. The architect owns requirements, design decisions, and acceptance; the generation system owns drafting of code within a defined specification.

### 1.2 Roles

| Role | Responsibility |
| :-- | :-- |
| Software Architect (human) | Defines scope and constraints, supplies authoritative context, reviews output, verifies, accepts, and commits |
| Code Generation System | Produces code, migrations, and tests strictly within the supplied specification; reports assumptions and deviations explicitly |
| Verification pipeline | Type checking, production build, automated end-to-end checks, and manual acceptance checklist |

### 1.3 Delivery Cycle

```text
 1. Specify     — Architect selects the phase and extracts the governing specification
 2. Inject      — Context is supplied using an AI Context Injection Protocol (Section 5)
 3. Generate    — Code Generation System produces the module
 4. Verify      — typecheck, build, end-to-end scenarios, responsive checks
 5. Accept      — Architect validates against the acceptance criteria
 6. Commit      — Architect commits; the next phase may begin
```

### 1.4 Governing Rules

1. One phase at a time. No phase begins before the previous one is accepted.
2. The data model in `data-model.md` is binding. Changes require an explicit schema change request, not an implicit deviation.
3. Generated output is delivered as complete files, not fragments, so that it can be applied deterministically.
4. Every phase ends with a documented list of known limitations.
5. The Standard Engineering Practices in [`README.md`](./README.md#4-standard-engineering-practices) apply to all generated code.

## 2. Roadmap Summary

| Phase | Scope | Status |
| :-- | :-- | :-- |
| 0 | Project foundation: schema, seed, layout, PWA | Delivered |
| 1 | Authentication, RBAC, master data, low-stock alerts | Delivered |
| 2 | Import purchase orders, mobile work orders for field teams | Delivered — pending maintainer verification |
| 3 | Quotation and invoice (TOP up to 180 days), signed approval, PDF | Planned |
| 4 | Financial monitoring, payment webhook, notifications | Planned |
| 5 | Security hardening, backup, production deployment | Planned |

## 3. Phase Specifications

### Phase 0 — Foundation *(Delivered)*

**Objective.** Establish the project skeleton, database schema, and application shell.

**Deliverables.**
- Next.js 15 (App Router, TypeScript) with Tailwind CSS v4.
- Prisma 7 schema and initial migration for all entities; seed data (1 owner, 1 admin, 2 mechanics, 3 customers, 10 spare parts).
- Application shell: sidebar, header, mobile navigation; slate and amber theme.
- PWA manifest, service worker, offline page; health endpoint.
- Docker and Compose configuration; migration-on-start entrypoint.

**Acceptance.** The application builds, the migration applies on an empty database, the seed runs, and the shell renders on desktop and phone viewports.

### Phase 1 — Authentication and Master Data *(Delivered)*

**Objective.** Secure access and manage reference data.

**Deliverables.**
- Email and password authentication; JWT session cookie; middleware gate; per-action authorisation.
- CRUD with search, filters, and pagination for customers, suppliers, spare parts, and users (users: owner only).
- Low-stock indicator and dashboard summary.

**Acceptance.** Each role reaches only its permitted modules; deactivated users lose access immediately; validation errors are specific; lists are usable at 390 px.

### Phase 2 — Import Purchase Orders and Field Work Orders *(Delivered)*

**Objective.** Digitise procurement and field execution.

**Deliverables.**
- Purchase orders with line items, totals, per-month numbering, shipment tracking, and the status workflow; stock increases on receipt.
- Work orders: creation and assignment, WIB scheduling, mechanic view of own assignments.
- Field execution on a mobile viewport: start with hour meter; before, process, and after photos with client-side compression; customer signature pad; expense claims with receipt photos; completion checklist; stock deduction on completion with full rollback on shortage.
- Authenticated file route with ownership checks; local persistent storage.
- Dashboard panel for today's work orders.

**Acceptance.** Automated end-to-end suite (84 checks) passed on a production build, covering validation, numbering, status flow, stock effects, mobile flow at 390 px, access isolation, and absence of console errors. Pending: maintainer verification.

**Known limitations.** See `architecture.md`, Section 5.6.

### Phase 3 — Quotation and Invoice *(Planned)*

**Objective.** Issue formal quotations, obtain customer approval without an account, and invoice with extended payment terms.

**Deliverables.**
- Quotation builder: spare-part and labour lines, discount, tax handling according to the company's tax status, grand total.
- Signed, expiring approval link (HMAC token, 14-day validity); public page for *Approve* and *Request revision*.
- Automatic work-order and invoice creation from an approved quotation; `due_date = issue_date + customer TOP`.
- PDF generation for quotation and invoice on company letterhead.
- Stock deduction on work-order completion becomes fully effective.

**Acceptance criteria.** Totals are exact to the cent; approval links cannot be forged, reused after a decision, or used after expiry; PDFs render correctly with the company identity; document numbering is gap-tolerant and collision-free.

### Phase 4 — Financial Monitoring and Payments *(Planned)*

**Objective.** Provide the owner with receivables visibility and automate payment recognition.

**Deliverables.**
- Owner dashboard: revenue, receivables, overdue total, critical stock, aging schedule (0–30, 31–90, 91–180, over 180 days).
- Payment recording and payment-provider webhook with signature verification and idempotency on `transaction_ref`.
- Automatic invoice status transitions; daily overdue evaluation.
- Owner notifications for received payments; customer reminders before due dates (channel to be confirmed).

**Acceptance criteria.** Duplicate webhook deliveries do not double-count; partial payments produce `partially_paid`; the overdue evaluation is idempotent; aging buckets reconcile with the invoice list.

### Phase 5 — Hardening, Backup, and Deployment *(Planned)*

**Objective.** Prepare the system for production operation.

**Deliverables.**
- Rate limiting on login and webhook endpoints; security headers and Content Security Policy; session revocation on password change.
- Automated, encrypted database backup including the uploads volume, shipped to a separate remote location; documented restore procedure.
- Deployment runbook for the target host (reverse proxy, environment, volumes, update procedure); container image validated on the host.
- Monitoring and alerting for availability.

**Acceptance criteria.** A restore from backup is demonstrated on a clean host; brute-force attempts are throttled; the deployment can be repeated from the runbook.

## 4. Release Procedure per Phase

1. Apply the generated change set to a clean working tree.
2. Run `npm run typecheck` and `npm run build`.
3. Execute the phase acceptance scenarios, including a 390 px phone viewport and a tablet viewport.
4. Record known limitations in the phase notes and `README.md`.
5. Commit with the convention `feat(fase-N): <summary>`.

## 5. AI Context Injection Protocols

A protocol defines the **minimum context** that must accompany a generation task and the **form** in which instructions are issued. Instructions are written as binding specifications from the Software Architect to the Code Generation System. Placeholders are in `<angle brackets>`.

### 5.1 Protocol Structure

Every injection contains, in this order:

| Section | Content |
| :-- | :-- |
| `ROLE` | The function the generation system performs |
| `CONTEXT` | Stack, repository conventions, and authoritative documents (`data-model.md` excerpt, relevant architecture sections) |
| `OBJECTIVE` | The single module to be produced |
| `CONSTRAINTS` | Non-negotiable rules (schema fidelity, authorisation, precision, responsiveness) |
| `DELIVERABLES` | Exact files and form of delivery |
| `ACCEPTANCE` | Criteria against which output will be verified |
| `REPORTING` | Required statement of assumptions, deviations, and limitations |

### 5.2 Protocol A — Data Layer and Validation

```text
ROLE
You are the Code Generation System for FleetOps ERP. The following specification is
issued by the Software Architect and is binding.

CONTEXT
- Stack: Next.js 15 (App Router, TypeScript), Prisma 7 with PostgreSQL, zod v4.
- Authoritative schema: prisma/schema.prisma and the following excerpt of docs/data-model.md:
  <PASTE ENTITY SPECIFICATIONS FOR THE TARGET MODULE>

OBJECTIVE
Produce the data layer and validation for the module "<MODULE>".

CONSTRAINTS
1. Do not alter the schema or any enumeration. If a change appears necessary, stop and
   report it as a schema change request.
2. Monetary values use Prisma.Decimal; floating-point arithmetic on money is prohibited.
3. State transitions are declared as a transition table and applied with a conditional
   updateMany that includes the expected current status.
4. Multi-step changes execute inside prisma.$transaction; business-rule violations throw
   a domain error that rolls back the transaction.
5. Document numbers follow <FORMAT> and are created with retry on unique-constraint conflict.

DELIVERABLES
Complete files: validation schemas under src/lib/validation/, services under
src/lib/services/. Complete file contents only; no fragments.

ACCEPTANCE
- npm run typecheck passes with no errors.
- All input is parsed by a zod schema with specific, field-level messages.

REPORTING
State assumptions, deviations from this specification, and known limitations.
```

### 5.3 Protocol B — Server Actions and Authorisation

```text
ROLE
You are the Code Generation System for FleetOps ERP, producing server-side mutation
logic under the direction of the Software Architect.

CONTEXT
- Existing conventions: authorize(...) and parseForm(...) in src/lib/action-helpers.ts;
  typed ActionState in src/lib/action-state.ts.
- Role matrix for this module: <ROLE MATRIX>
- Services and schemas available: <LIST>

OBJECTIVE
Produce src/app/(dashboard)/<module>/actions.ts for "<MODULE>".

CONSTRAINTS
1. Every action invokes authorize(...) as its first statement. Navigation visibility is
   not an access control.
2. A caller without access to a resource receives a not-found result.
3. Input is validated before any database access; Prisma error codes P2002 and P2003 are
   mapped to user-readable messages.
4. Successful mutations call revalidatePath for every affected route.
5. No sensitive value is logged or returned to the client.

DELIVERABLES
The complete actions.ts file and any new helper it requires.

ACCEPTANCE
- Each action rejects every role not listed in the matrix.
- Concurrent execution of a state transition cannot apply it twice.

REPORTING
List each action with the roles permitted and the error cases handled.
```

### 5.4 Protocol C — Responsive Interface for Field and Operational Teams

```text
ROLE
You are the Code Generation System for FleetOps ERP, producing user-interface code under
the direction of the Software Architect.

CONTEXT
- Stack: React 19 Server and Client Components, Tailwind CSS v4.
- Design tokens: slate (#0f172a) for structure, amber (#f59e0b) for accents.
- Existing components: src/components/ui/ (form, modal, data-list, toast, badge, panel).
- Data contract: <PROPS / QUERY SHAPE>

OBJECTIVE
Produce the page(s) "<PAGE>" for the module "<MODULE>".

CONSTRAINTS
1. Mobile-first. The interface must be verified at a 390 px viewport and a tablet viewport
   with no horizontal overflow. Lists render as cards on narrow viewports and as tables
   on wide viewports.
2. Interactive elements provide touch targets suitable for field use.
3. Currency is rendered with the shared Rupiah formatter; dates and times in WIB through
   src/lib/datetime.ts.
4. Reuse existing UI components. Introduce a client component only where interactivity
   requires it.
5. Application text is Indonesian; error messages are specific and actionable.

DELIVERABLES
Complete page and component files.

ACCEPTANCE
- Keyboard and screen-reader labels are present on form controls.
- No console errors during the primary scenario.

REPORTING
State assumptions and any component that could not be reused.
```

### 5.5 Protocol D — Defect Remediation

```text
ROLE
You are the Code Generation System for FleetOps ERP, performing defect remediation under
the direction of the Software Architect.

CONTEXT
- Failure classification: <ENVIRONMENT | COMPILE-TIME | RUNTIME | BEHAVIOURAL>
- Complete error output, unabridged:
  <PASTE ERROR OUTPUT>
- Affected files:
  <PASTE FILES>

OBJECTIVE
Identify the root cause and correct it.

CONSTRAINTS
1. Do not modify the database schema or docs/data-model.md.
2. Apply the smallest change that resolves the root cause; do not refactor unrelated code.
3. Do not suppress the error (for example by widening types or catching and ignoring).

DELIVERABLES
Complete corrected files and a one-paragraph root-cause statement.

ACCEPTANCE
- npm run typecheck and npm run build pass.
- The originally failing scenario now succeeds.

REPORTING
State the root cause, the change made, and any regression risk.
```

### 5.6 Phase-Specific Injection Parameters

| Phase | Governing excerpts to inject | Protocols to apply |
| :-- | :-- | :-- |
| 3 | `data-model.md` §4.3, §4.4 (quotations, items, invoices), §5.3; `architecture.md` §5.4 | A, B, C; additionally a PDF generation specification |
| 4 | `data-model.md` §4.4 (invoices, payments), §5.4, §7 (BR-6 to BR-9); `architecture.md` §5.5 | A, B, C |
| 5 | `architecture.md` §2, §5.5, §5.6, §7 | B; deployment and backup specifications authored by the architect |
