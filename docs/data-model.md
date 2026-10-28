# Data Model Specification

| Attribute | Value |
| :-- | :-- |
| Database | PostgreSQL 16 |
| ORM | Prisma 7 (driver adapter `pg`) |
| Source of truth | `prisma/schema.prisma` and `prisma/migrations/` |
| Status | Entities for Phases 0–2 are in active use; quotation, invoice, and payment entities are defined in the schema and activated in Phases 3–4 |
| Related | [`architecture.md`](./architecture.md) |

## 1. Entity-Relationship Overview

```text
 users 1 ──── N work_orders (assigned mechanic)
 users 1 ──── N mechanic_expenses

 customers 1 ──── N quotations 1 ──── 1 work_orders 1 ──── 1 invoices 1 ──── N payments
 customers 1 ──── N work_orders
 customers 1 ──── N invoices

 quotations 1 ──── N quotation_items N ──── 1 spareparts
 work_orders 1 ──── N work_order_photos
 work_orders 1 ──── N mechanic_expenses

 suppliers 1 ──── N purchase_orders 1 ──── N purchase_order_items N ──── 1 spareparts
```

The one-to-one chain *quotation → work order → invoice* is enforced by `UNIQUE` constraints on `work_orders.quotation_id`, `invoices.quotation_id`, and `invoices.work_order_id`.

## 2. Modelling Conventions

| Topic | Convention |
| :-- | :-- |
| Naming | Prisma models are PascalCase with camelCase fields; tables and columns are snake_case via `@@map` / `@map`, so direct SQL and BI tools use the snake_case names documented here |
| Identifiers | `Int` auto-increment primary keys (avoids `BigInt` serialisation issues between Server and Client Components) |
| Money | `Decimal(15,2)`; handled as `Prisma.Decimal` in code |
| Enumerations | Native PostgreSQL enums; values are lower-case |
| Timestamps | `created_at`, and `updated_at` where the record is mutable; stored in UTC |
| Date-only columns | `DATE` (`eta_date`, `valid_until`, `issue_date`, `due_date`) |
| Referential actions | `Restrict` for master and financial references; `Cascade` for owned child rows (items, photos, expenses); `SetNull` where history must survive |
| Check constraints | Added in migration SQL where Prisma lacks declarative support (for example `purchase_order_items.qty > 0`) |

## 3. Enumerations

| Enum | Values |
| :-- | :-- |
| `role` | `owner`, `admin`, `mechanic` |
| `sparepart_category` | `filters`, `hydraulics`, `engine`, `electrical`, `tires`, `other` |
| `purchase_order_status` | `draft`, `ordered`, `customs_cleared`, `received`, `cancelled` |
| `quotation_status` | `draft`, `sent`, `approved`, `revised`, `rejected` |
| `quotation_item_type` | `sparepart`, `labor` |
| `work_order_status` | `scheduled`, `in_progress`, `completed`, `cancelled` |
| `photo_type` | `before`, `process`, `after` |
| `expense_status` | `pending`, `approved`, `rejected` |
| `invoice_status` | `unpaid`, `partially_paid`, `paid`, `overdue` |

## 4. Entity Specifications

### 4.1 Master Data

**`users`** — system users; one role per user.

| Column | Type | Constraints / notes |
| :-- | :-- | :-- |
| id | integer | PK |
| name | varchar(100) | required |
| email | varchar(100) | unique |
| password | varchar(255) | bcrypt hash |
| role | `role` | default `mechanic` |
| phone | varchar(20) | optional |
| is_active | boolean | default true; checked on every request |
| created_at, updated_at | timestamp | |

**`customers`** — client organisations.

| Column | Type | Constraints / notes |
| :-- | :-- | :-- |
| id | integer | PK |
| company_name | varchar(150) | indexed |
| pic_name, pic_phone | varchar | person in charge |
| email | varchar(100) | optional |
| address | text | required |
| top_days | integer | Terms of Payment in days, default 180 |
| created_at, updated_at | timestamp | |

**`suppliers`** — spare-parts suppliers (import and local).

| Column | Type | Constraints / notes |
| :-- | :-- | :-- |
| id | integer | PK |
| company_name | varchar(150) | required |
| country | varchar(50) | default `Indonesia` |
| contact_person, phone, email | varchar | optional |
| created_at | timestamp | |

**`spareparts`** — warehouse inventory.

| Column | Type | Constraints / notes |
| :-- | :-- | :-- |
| id | integer | PK |
| sku | varchar(50) | unique |
| name | varchar(150) | required |
| category | `sparepart_category` | indexed |
| stock | integer | default 0; changed only by receiving a purchase order or completing a work order |
| min_stock | integer | default 2; `stock <= min_stock` raises the low-stock indicator |
| buy_price | decimal(15,2) | cost of goods (restricted to privileged roles in the UI) |
| sell_price | decimal(15,2) | customer price |
| unit | varchar(20) | default `pcs` |
| created_at, updated_at | timestamp | |

### 4.2 Procurement

**`purchase_orders`** — supplier orders. Number format `PO-SUP/YYYY/MM/NNN`.

| Column | Type | Constraints / notes |
| :-- | :-- | :-- |
| id | integer | PK |
| po_number | varchar(50) | unique |
| supplier_id | integer | FK → suppliers, `Restrict` |
| status | `purchase_order_status` | default `draft` |
| tracking_number | varchar(100) | air waybill / shipment reference |
| eta_date | date | estimated arrival |
| total_amount | decimal(15,2) | sum of item subtotals |
| created_at, updated_at | timestamp | |

**`purchase_order_items`**

| Column | Type | Constraints / notes |
| :-- | :-- | :-- |
| id | integer | PK |
| purchase_order_id | integer | FK → purchase_orders, `Cascade` |
| sparepart_id | integer | FK → spareparts, `Restrict` |
| qty | integer | `CHECK (qty > 0)` |
| unit_price | decimal(15,2) | |
| subtotal | decimal(15,2) | `qty × unit_price` |

### 4.3 Quotations and Work Orders

**`quotations`** — price offers. Number format `PNW/YYYY/MM/NNN`. *Activated in Phase 3.*

| Column | Type | Constraints / notes |
| :-- | :-- | :-- |
| id | integer | PK |
| quotation_number | varchar(50) | unique |
| customer_id | integer | FK → customers, `Restrict` |
| valid_until | date | |
| status | `quotation_status` | default `draft` |
| subtotal, discount, tax_ppn, grand_total | decimal(15,2) | VAT rate and applicability are defined per business tax status in Phase 3 |
| approval_token | varchar(64) | unique; stored as a hash for signed customer approval |
| approved_at | timestamp | |
| notes | text | |
| created_at, updated_at | timestamp | |

**`quotation_items`**

| Column | Type | Constraints / notes |
| :-- | :-- | :-- |
| id | integer | PK |
| quotation_id | integer | FK → quotations, `Cascade` |
| item_type | `quotation_item_type` | `sparepart` or `labor` |
| sparepart_id | integer | FK → spareparts, `SetNull`; null for labour lines |
| description | varchar(255) | |
| qty | integer | default 1 |
| unit_price, subtotal | decimal(15,2) | |

**`work_orders`** — digital job orders for mechanics. Number format `WO/YYYY/MM/NNN`.

| Column | Type | Constraints / notes |
| :-- | :-- | :-- |
| id | integer | PK |
| wo_number | varchar(50) | unique |
| quotation_id | integer | unique, nullable, FK → quotations, `SetNull` |
| customer_id | integer | FK → customers, `Restrict` |
| mechanic_id | integer | FK → users, `Restrict` |
| unit_model | varchar(100) | forklift model |
| serial_number | varchar(100) | optional |
| hour_meter | integer | operating hours recorded when the job starts |
| symptom_notes | text | |
| labor_fee | decimal(15,2) | not visible to the mechanic role |
| status | `work_order_status` | default `scheduled` |
| customer_signature | text | holds the **storage path** of the signature PNG (`work-orders/<id>/signature.png`) |
| scheduled_at | timestamp | entered in WIB, stored in UTC |
| completed_at | timestamp | |
| created_at, updated_at | timestamp | |

Indexes: `customer_id`, `mechanic_id`, `(status, scheduled_at)`.

**`work_order_photos`**

| Column | Type | Constraints / notes |
| :-- | :-- | :-- |
| id | integer | PK |
| work_order_id | integer | FK → work_orders, `Cascade` |
| photo_type | `photo_type` | `before`, `process`, `after` |
| file_path | varchar(255) | relative storage path |
| uploaded_at | timestamp | |

**`mechanic_expenses`** (Prisma model `Expense`) — field expense claims.

| Column | Type | Constraints / notes |
| :-- | :-- | :-- |
| id | integer | PK |
| work_order_id | integer | FK → work_orders, `Cascade` |
| mechanic_id | integer | FK → users, `Restrict` |
| description | varchar(255) | for example fuel, toll, parking |
| amount | decimal(15,2) | |
| receipt_photo_path | varchar(255) | optional |
| status | `expense_status` | default `pending`; reviewed by owner or admin |
| created_at | timestamp | |

### 4.4 Billing and Payments *(Phases 3–4)*

**`invoices`** — Number format `INV/YYYY/MM/NNN`.

| Column | Type | Constraints / notes |
| :-- | :-- | :-- |
| id | integer | PK |
| invoice_number | varchar(50) | unique |
| quotation_id, work_order_id | integer | each unique; FK `Restrict` |
| customer_id | integer | FK → customers, `Restrict` |
| issue_date, due_date | date | `due_date = issue_date + customers.top_days` |
| status | `invoice_status` | default `unpaid` |
| subtotal, tax_ppn, discount, total_amount | decimal(15,2) | |
| paid_amount | decimal(15,2) | default 0 |
| virtual_account_number | varchar(50) | optional |
| created_at, updated_at | timestamp | |

Indexes: `status`, `due_date`, `customer_id`.

**`payments`**

| Column | Type | Constraints / notes |
| :-- | :-- | :-- |
| id | integer | PK |
| invoice_id | integer | FK → invoices, `Restrict` |
| payment_method | varchar(50) | |
| transaction_ref | varchar(100) | unique; idempotency key against duplicate webhook delivery |
| amount | decimal(15,2) | |
| paid_at | timestamp | |
| notes | text | |
| created_at | timestamp | |

## 5. State Machines

### 5.1 Purchase Order *(implemented)*

```text
 draft ──► ordered ──► customs_cleared ──► received
              └───────────────────────────────►┘   (direct receipt permitted)
 draft | ordered | customs_cleared ──► cancelled
```

- Only `draft` orders may be edited or deleted.
- Shipment data (tracking number, ETA) can be updated while the order is open.
- Transition to `received` increments `spareparts.stock` by each item's quantity **in the same transaction** as the status change, guarded by a conditional update so a receipt cannot be applied twice.

### 5.2 Work Order *(implemented)*

```text
 scheduled ──► in_progress ──► completed
     │              │
     └──────────────┴────────► cancelled
```

- `scheduled → in_progress`: performed by the assigned mechanic; records the hour meter.
- `in_progress → completed`: requires at least one `before` photo, one `after` photo, and a stored signature. Completion deducts stock for the linked quotation's `sparepart` items. If any item has insufficient stock, the entire transaction rolls back and the work order remains `in_progress`.
- Cancellation is available to owner and admin, including for in-progress orders.

### 5.3 Quotation *(Planned — Phase 3)*

```text
 draft ──► sent ──► approved
             ├────► revised ──► sent
             └────► rejected
```

### 5.4 Invoice *(Planned — Phases 3–4)*

```text
 unpaid ──► partially_paid ──► paid
   │               │
   └───────────────┴──► overdue ──► partially_paid | paid
```

## 6. Document Numbering

| Document | Format | Scope of sequence |
| :-- | :-- | :-- |
| Purchase order | `PO-SUP/YYYY/MM/NNN` | per month |
| Work order | `WO/YYYY/MM/NNN` | per month |
| Quotation | `PNW/YYYY/MM/NNN` | per month *(Planned)* |
| Invoice | `INV/YYYY/MM/NNN` | per month *(Planned)* |

The year and month are taken in WIB. The next sequence number is derived from existing documents of the month; the `UNIQUE` constraint on the number column resolves concurrent creation, and creation is retried on `P2002`.

## 7. Business Rules and Invariants

| # | Rule | Status |
| :-- | :-- | :-- |
| BR-1 | Stock increases only when a purchase order moves to `received` | Implemented |
| BR-2 | Stock decreases only when a work order is completed, based on the linked quotation's spare-part items; insufficient stock aborts completion | Implemented (fully effective after Phase 3) |
| BR-3 | A mechanic can view and act only on work orders assigned to them | Implemented |
| BR-4 | Labour fees are not exposed to the mechanic role | Implemented |
| BR-5 | Uploaded files are reachable only through the authenticated file route | Implemented |
| BR-6 | `invoices.due_date = issue_date + customers.top_days` | Planned (Phase 3) |
| BR-7 | An invoice becomes `paid` when `paid_amount >= total_amount`; `partially_paid` when `0 < paid_amount < total_amount` | Planned (Phase 4) |
| BR-8 | An unpaid or partially paid invoice past `due_date` becomes `overdue` through a daily evaluation | Planned (Phase 4) |
| BR-9 | A payment with an existing `transaction_ref` is rejected (idempotent webhook handling) | Planned (Phase 4) |

Business logic is implemented in the service layer (`src/lib/services/`), not as database triggers, so that it is testable and visible in application code.

## 8. Design Decisions

| Decision | Rationale |
| :-- | :-- |
| Integer identifiers instead of `BigInt` | Avoids serialisation failures when passing identifiers from Server to Client Components |
| Native enums | Type safety in both database and generated client |
| Signature stored as a file, path in the database | Keeps rows small and allows the same access control as other uploads |
| Services instead of triggers | Transaction boundaries and rollback behaviour are explicit and testable |
| `Decimal` for money | Eliminates floating-point rounding error |

## 9. Maintenance Procedure

1. Modify `prisma/schema.prisma`.
2. Create a migration (`prisma migrate dev`); add manual SQL for constraints Prisma cannot express.
3. Regenerate the client (`npm run db:generate`).
4. Update this document in the same change set.
5. Verify with `npm run typecheck` and `npm run build`.
