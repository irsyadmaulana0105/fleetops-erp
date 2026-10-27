import {
  Building2,
  FileText,
  LayoutDashboard,
  Package,
  PackagePlus,
  Receipt,
  Truck,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export type RoleName = "owner" | "admin" | "mechanic";

export type NavItem = {
  /** Segmen URL, juga dipakai sebagai kunci halaman placeholder. */
  href: string;
  label: string;
  icon: LucideIcon;
  /** Peran yang boleh melihat menu ini. */
  roles: RoleName[];
  /** Fase roadmap tempat halaman ini dibangun (untuk halaman placeholder). */
  phase: number;
  /** Tampil di bottom navigation HP (maksimal 4 item). */
  primary?: boolean;
  /** Penjelasan singkat untuk halaman yang belum dibangun. */
  summary: string;
};

export type NavGroup = { title: string; items: NavItem[] };

const ALL: RoleName[] = ["owner", "admin", "mechanic"];
const OFFICE: RoleName[] = ["owner", "admin"];

export const NAV_GROUPS: NavGroup[] = [
  {
    title: "Operasional",
    items: [
      {
        href: "/dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        roles: ALL,
        phase: 0,
        primary: true,
        summary: "Ringkasan operasional harian.",
      },
      {
        href: "/work-orders",
        label: "Work Order",
        icon: Wrench,
        roles: ALL,
        phase: 2,
        primary: true,
        summary: "Daftar tugas servis, foto sebelum–sesudah, tanda tangan klien, dan uang jalan mekanik.",
      },
      {
        href: "/quotations",
        label: "Penawaran",
        icon: FileText,
        roles: OFFICE,
        phase: 3,
        primary: true,
        summary: "Buat penawaran, kirim tautan persetujuan ke klien, dan cetak PDF ber-kop surat.",
      },
      {
        href: "/invoices",
        label: "Invoice",
        icon: Receipt,
        roles: OFFICE,
        phase: 3,
        primary: true,
        summary: "Faktur penagihan dengan jatuh tempo mengikuti TOP klien (bawaan 180 hari).",
      },
    ],
  },
  {
    title: "Gudang & Pengadaan",
    items: [
      {
        href: "/spareparts",
        label: "Sparepart",
        icon: Package,
        roles: OFFICE,
        phase: 1,
        summary: "Stok gudang, harga modal dan harga jual, serta peringatan stok menipis.",
      },
      {
        href: "/purchase-orders",
        label: "PO Impor",
        icon: PackagePlus,
        roles: OFFICE,
        phase: 2,
        summary: "Pesanan ke supplier, nomor resi, dan estimasi tiba di gudang.",
      },
      {
        href: "/suppliers",
        label: "Supplier",
        icon: Truck,
        roles: OFFICE,
        phase: 1,
        summary: "Data supplier impor dan lokal.",
      },
    ],
  },
  {
    title: "Data Master",
    items: [
      {
        href: "/customers",
        label: "Customer",
        icon: Building2,
        roles: OFFICE,
        phase: 1,
        summary: "Data pabrik klien beserta TOP (hari) per klien.",
      },
      {
        href: "/users",
        label: "Pengguna",
        icon: Users,
        roles: ["owner"],
        phase: 1,
        summary: "Akun pemilik, admin, dan mekanik beserta hak aksesnya.",
      },
    ],
  },
];

export const ALL_NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

export function navForRole(role: RoleName): NavGroup[] {
  return NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((i) => i.roles.includes(role)),
  })).filter((g) => g.items.length > 0);
}

export function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
