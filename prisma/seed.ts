/**
 * Seed data dummy FleetOps ERP — Fase 0.
 *
 *   1 Owner, 1 Admin, 2 Mekanik, 3 Customer, 10 Sparepart
 *
 * Aman dijalankan berulang: pengguna & sparepart memakai upsert (email / SKU),
 * customer dicocokkan lewat nama perusahaan. Data yang sudah ada tidak digandakan
 * dan kolom stok sparepart yang sudah berubah tidak ditimpa.
 *
 * Jalankan: npm run db:seed
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Role, SparepartCategory } from "../src/generated/prisma/client";

const DEV_DEFAULT_PASSWORD = "Fleetops#2026";

async function main() {
  // Akun dummy dengan kata sandi bawaan tidak boleh sampai ke production.
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_SEED !== "true") {
    throw new Error(
      "Seed dihentikan: NODE_ENV=production. Set ALLOW_SEED=true hanya jika Anda yakin " +
        "dan sudah mengisi SEED_DEFAULT_PASSWORD dengan kata sandi yang kuat.",
    );
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL belum diatur.");

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

  try {
    const plainPassword = process.env.SEED_DEFAULT_PASSWORD || DEV_DEFAULT_PASSWORD;
    const passwordHash = await bcrypt.hash(plainPassword, 12);

    // ── Pengguna: 1 owner, 1 admin, 2 mekanik ─────────────────────────────
    const users: Array<{ name: string; email: string; role: Role; phone: string }> = [
      { name: "Bambang Hartono", email: "owner@fleetops.test", role: Role.owner, phone: "081200000001" },
      { name: "Siti Rahmawati", email: "admin@fleetops.test", role: Role.admin, phone: "081200000002" },
      { name: "Agus Prasetyo", email: "mekanik1@fleetops.test", role: Role.mechanic, phone: "081200000003" },
      { name: "Dimas Saputra", email: "mekanik2@fleetops.test", role: Role.mechanic, phone: "081200000004" },
    ];

    for (const u of users) {
      await prisma.user.upsert({
        where: { email: u.email },
        update: { name: u.name, role: u.role, phone: u.phone },
        create: { ...u, passwordHash },
      });
    }

    // ── Customer: 3 pabrik (TOP bawaan 180 hari; satu klien lebih pendek) ──
    const customers = [
      {
        companyName: "PT Samudra Plastik Indonesia",
        picName: "Hendra Wijaya",
        picPhone: "081311110001",
        email: "purchasing@samudraplastik.example",
        address: "Kawasan Industri SIER Blok K-12, Rungkut, Surabaya, Jawa Timur",
        topDays: 180,
      },
      {
        companyName: "PT Mega Pangan Nusantara",
        picName: "Lestari Dewi",
        picPhone: "081311110002",
        email: "gudang@megapangan.example",
        address: "Jl. Raya Gempol KM 7, Pasuruan, Jawa Timur",
        topDays: 180,
      },
      {
        companyName: "PT Baja Karya Utama",
        picName: "Ferry Gunawan",
        picPhone: "081311110003",
        email: "maintenance@bajakarya.example",
        address: "Kawasan Industri Ngoro (NIP) Blok C-5, Mojokerto, Jawa Timur",
        topDays: 90,
      },
    ];

    for (const c of customers) {
      const existing = await prisma.customer.findFirst({ where: { companyName: c.companyName } });
      if (!existing) await prisma.customer.create({ data: c });
    }

    // ── Sparepart: 10 item, tersebar di semua kategori ─────────────────────
    // Dua item (SKU ...-003 dan ...-009) sengaja berstok <= min_stock
    // agar peringatan stok menipis bisa langsung diuji.
    const spareparts: Array<{
      sku: string;
      name: string;
      category: SparepartCategory;
      stock: number;
      minStock: number;
      buyPrice: number;
      sellPrice: number;
      unit: string;
    }> = [
      { sku: "FLT-OIL-001", name: "Filter Oli Mesin Toyota 8FD", category: "filters", stock: 24, minStock: 6, buyPrice: 85_000, sellPrice: 125_000, unit: "pcs" },
      { sku: "FLT-AIR-002", name: "Filter Udara Komatsu FD30", category: "filters", stock: 12, minStock: 4, buyPrice: 210_000, sellPrice: 295_000, unit: "pcs" },
      { sku: "HYD-SEA-003", name: "Seal Kit Silinder Angkat (Lift Cylinder)", category: "hydraulics", stock: 2, minStock: 3, buyPrice: 650_000, sellPrice: 925_000, unit: "set" },
      { sku: "HYD-HOS-004", name: "Selang Hidrolik 1/2 inch (per meter)", category: "hydraulics", stock: 40, minStock: 10, buyPrice: 95_000, sellPrice: 150_000, unit: "m" },
      { sku: "ENG-BLT-005", name: "V-Belt Alternator Nissan K25", category: "engine", stock: 15, minStock: 4, buyPrice: 120_000, sellPrice: 185_000, unit: "pcs" },
      { sku: "ENG-SPK-006", name: "Busi NGK Mesin LPG", category: "engine", stock: 30, minStock: 8, buyPrice: 45_000, sellPrice: 75_000, unit: "pcs" },
      { sku: "ELC-SWT-007", name: "Saklar Kunci Kontak (Ignition Switch)", category: "electrical", stock: 8, minStock: 2, buyPrice: 175_000, sellPrice: 265_000, unit: "pcs" },
      { sku: "ELC-HRN-008", name: "Klakson Elektrik 48V", category: "electrical", stock: 10, minStock: 3, buyPrice: 135_000, sellPrice: 210_000, unit: "pcs" },
      { sku: "TIR-SLD-009", name: "Ban Solid 6.50-10 (Roda Penggerak)", category: "tires", stock: 3, minStock: 4, buyPrice: 1_450_000, sellPrice: 1_950_000, unit: "pcs" },
      { sku: "OTH-FRK-010", name: "Fork Pin & Bushing Set", category: "other", stock: 6, minStock: 2, buyPrice: 380_000, sellPrice: 560_000, unit: "set" },
    ];

    for (const p of spareparts) {
      await prisma.sparepart.upsert({
        where: { sku: p.sku },
        // Jangan menimpa stock: seed ulang tidak boleh mengembalikan stok yang sudah berubah.
        update: {
          name: p.name,
          category: p.category,
          minStock: p.minStock,
          buyPrice: p.buyPrice,
          sellPrice: p.sellPrice,
          unit: p.unit,
        },
        create: p,
      });
    }

    const [u, c, s] = await Promise.all([prisma.user.count(), prisma.customer.count(), prisma.sparepart.count()]);
    console.log(`Seed selesai — users: ${u}, customers: ${c}, spareparts: ${s}`);
    if (!process.env.SEED_DEFAULT_PASSWORD) {
      console.log(`Kata sandi akun dummy (development saja): ${DEV_DEFAULT_PASSWORD}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
