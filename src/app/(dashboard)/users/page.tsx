import type { Metadata } from "next";
import { Users } from "lucide-react";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { DataList, type Column } from "@/components/ui/data-list";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterBar } from "@/components/ui/filter-bar";
import { FormDialog } from "@/components/ui/form";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { ROLE_LABEL } from "@/lib/nav";
import { PAGE_SIZE, pageCountFor, parsePage } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { createUser, updateUser } from "./actions";
import { UserFields } from "./user-fields";

export const metadata: Metadata = { title: "Pengguna" };

const ROLE_TONE: Record<string, BadgeTone> = { owner: "warning", admin: "neutral", mechanic: "neutral" };

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const me = await requireRole("owner");

  const params = await searchParams;
  const q = (params.q ?? "").trim();

  const where = q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" as const } },
          { email: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {};

  const total = await prisma.user.count({ where });
  const pageCount = pageCountFor(total);
  const page = Math.min(parsePage(params.page), pageCount);
  // Kolom kata sandi sengaja tidak diambil.
  const users = await prisma.user.findMany({
    where,
    select: { id: true, name: true, email: true, role: true, phone: true, isActive: true },
    orderBy: [{ role: "asc" }, { name: "asc" }],
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });
  type UserRow = (typeof users)[number];

  const columns: Column<UserRow>[] = [
    {
      key: "name",
      header: "Nama",
      hideOnCard: true,
      cell: (u) => (
        <span className="font-medium text-slate-900">
          {u.name}
          {u.id === me.id && <span className="ml-2 text-xs font-normal text-slate-500">(Anda)</span>}
        </span>
      ),
    },
    { key: "email", header: "Email", cell: (u) => u.email },
    { key: "role", header: "Peran", cell: (u) => <Badge tone={ROLE_TONE[u.role]}>{ROLE_LABEL[u.role]}</Badge> },
    { key: "phone", header: "Telepon", cell: (u) => u.phone ?? <span className="text-slate-400">—</span> },
    {
      key: "status",
      header: "Status",
      cell: (u) => (u.isActive ? <Badge tone="success">Aktif</Badge> : <Badge tone="danger">Nonaktif</Badge>),
    },
  ];

  return (
    <>
      <PageHeader
        title="Pengguna"
        description="Akun pemilik, admin, dan mekanik beserta hak aksesnya."
        actions={
          <FormDialog
            triggerLabel="Tambah pengguna"
            triggerIcon="plus"
            triggerVariant="primary"
            title="Tambah pengguna"
            submitLabel="Buat akun"
            action={createUser}
          >
            <UserFields mode="create" />
          </FormDialog>
        }
      />

      <FilterBar basePath="/users" query={q} searchPlaceholder="Cari nama atau email" hasActiveFilters={q !== ""} />

      <DataList
        rows={users}
        columns={columns}
        rowKey={(u) => u.id}
        caption="Daftar pengguna"
        cardTitle={(u) => (
          <>
            {u.name}
            {u.id === me.id && <span className="ml-2 text-xs font-normal text-slate-500">(Anda)</span>}
          </>
        )}
        empty={
          <EmptyState
            icon={Users}
            title={q ? "Pengguna tidak ditemukan" : "Belum ada pengguna"}
            description={q ? `Tidak ada hasil untuk “${q}”.` : "Tambahkan akun pertama."}
          />
        }
        actions={(u) => (
          <FormDialog
            triggerLabel={`Ubah ${u.name}`}
            triggerIcon="pencil"
            triggerVariant="ghost"
            iconOnly
            title="Ubah pengguna"
            submitLabel="Simpan perubahan"
            action={updateUser.bind(null, u.id)}
          >
            <UserFields
              mode="edit"
              isSelf={u.id === me.id}
              defaults={{ name: u.name, email: u.email, role: u.role, phone: u.phone, isActive: u.isActive }}
            />
          </FormDialog>
        )}
      />

      <Pagination page={page} pageCount={pageCount} total={total} pageSize={PAGE_SIZE} basePath="/users" params={{ q }} />
    </>
  );
}
