/**
 * Data demo FleetOps ERP — klien dan pemasok di Sidoarjo (per kecamatan) dan Jawa Timur,
 * ditambah contoh PO dan work order untuk menguji alur Fase 2.
 *
 * Semua nama perusahaan, orang, dan nomor telepon adalah fiktif.
 * Syarat: `npm run db:seed` sudah dijalankan (butuh akun mekanik dan sparepart).
 * Aman dijalankan berulang: klien dicocokkan lewat nama perusahaan, PO hanya dibuat
 * saat pemasok demo pertama kali dibuat, work order dicocokkan lewat nomor seri.
 *
 * Jalankan: npm run db:seed:demo   (atau: npx tsx prisma/seed-demo.ts)
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type PurchaseOrderStatus } from "../src/generated/prisma/client";

const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

/** Waktu WIB (jam/menit pada hari ini + offset hari) → Date UTC. */
function wibAt(dayOffset: number, hour: number, minute = 0): Date {
  const wibNow = new Date(Date.now() + WIB_OFFSET_MS);
  const base = Date.UTC(wibNow.getUTCFullYear(), wibNow.getUTCMonth(), wibNow.getUTCDate() + dayOffset, hour, minute);
  return new Date(base - WIB_OFFSET_MS);
}

function dateOnly(dayOffset: number): Date {
  const wibNow = new Date(Date.now() + WIB_OFFSET_MS);
  return new Date(Date.UTC(wibNow.getUTCFullYear(), wibNow.getUTCMonth(), wibNow.getUTCDate() + dayOffset));
}

function monthPrefix(code: string): string {
  const wib = new Date(Date.now() + WIB_OFFSET_MS);
  const y = wib.getUTCFullYear();
  const m = String(wib.getUTCMonth() + 1).padStart(2, "0");
  return `${code}/${y}/${m}/`;
}

function nextNumber(prefix: string, existing: string[]): string {
  let max = 0;
  for (const n of existing) {
    const seq = Number.parseInt(n.slice(prefix.length), 10);
    if (Number.isFinite(seq) && seq > max) max = seq;
  }
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

const CUSTOMERS = [
  { companyName: "PT Waru Tirta Pangan", picName: "Slamet Riyadi", picPhone: "081355500001", email: "gudang@warutirta.example", address: "Jl. Raya Waru No. 88, Kec. Waru, Kab. Sidoarjo, Jawa Timur", topDays: 180 },
  { companyName: "CV Gedangan Logistik Mandiri", picName: "Rina Kusumawati", picPhone: "081355500002", email: "ops@gedanganlogistik.example", address: "Pergudangan Berbek Industri Blok D-7, Kec. Gedangan, Kab. Sidoarjo, Jawa Timur", topDays: 120 },
  { companyName: "PT Buduran Kemasan Prima", picName: "Hadi Santoso", picPhone: "081355500003", email: "maintenance@buduranprima.example", address: "Jl. Raya Siwalanpanji No. 21, Kec. Buduran, Kab. Sidoarjo, Jawa Timur", topDays: 180 },
  { companyName: "PT Krian Baja Perkasa", picName: "Yulianto Eko", picPhone: "081355500004", email: "purchasing@krianbaja.example", address: "Jl. Raya Krian KM 30, Kec. Krian, Kab. Sidoarjo, Jawa Timur", topDays: 180 },
  { companyName: "PT Sedati Cold Storage", picName: "Mariana Putri", picPhone: "081355500005", email: "teknik@sedaticold.example", address: "Jl. Juanda Raya No. 5, Kec. Sedati, Kab. Sidoarjo, Jawa Timur", topDays: 90 },
  { companyName: "PT Tanggulangin Kulit Nusantara", picName: "Bagus Firmansyah", picPhone: "081355500006", email: "produksi@tanggulanginkulit.example", address: "Jl. Raya Kedensari No. 14, Kec. Tanggulangin, Kab. Sidoarjo, Jawa Timur", topDays: 180 },
  { companyName: "PT Taman Kertas Sejahtera", picName: "Dewi Anggraini", picPhone: "081355500007", email: "gudang@tamankertas.example", address: "Jl. Raya Tropodo No. 60, Kec. Taman, Kab. Sidoarjo, Jawa Timur", topDays: 150 },
  { companyName: "PT Porong Keramik Abadi", picName: "Teguh Wibowo", picPhone: "081355500008", email: "maintenance@porongkeramik.example", address: "Jl. Raya Porong KM 28, Kec. Porong, Kab. Sidoarjo, Jawa Timur", topDays: 180 },
  { companyName: "PT Tarik Agro Lestari", picName: "Nur Hidayati", picPhone: "081355500009", email: "logistik@tarikagro.example", address: "Jl. Raya Tarik No. 102, Kec. Tarik, Kab. Sidoarjo, Jawa Timur", topDays: 60 },
  { companyName: "CV Wonoayu Mebel Jaya", picName: "Sugeng Widodo", picPhone: "081355500010", email: "admin@wonoayumebel.example", address: "Jl. Raya Pilang No. 37, Kec. Wonoayu, Kab. Sidoarjo, Jawa Timur", topDays: 90 },
  { companyName: "PT Rungkut Logam Presisi", picName: "Ferdinand Halim", picPhone: "081355500011", email: "purchasing@rungkutlogam.example", address: "Kawasan Industri SIER Blok M-3, Rungkut, Surabaya, Jawa Timur", topDays: 180 },
  { companyName: "PT Gresik Pelabuhan Raya", picName: "Imam Syafii", picPhone: "081355500012", email: "alatberat@gresikpelabuhan.example", address: "Jl. Pelabuhan Gresik No. 9, Kec. Kebomas, Kab. Gresik, Jawa Timur", topDays: 180 },
  { companyName: "PT Ngoro Plastindo Makmur", picName: "Cahyo Nugroho", picPhone: "081355500013", email: "teknik@ngoroplastindo.example", address: "Kawasan Industri Ngoro (NIP) Blok F-2, Kab. Mojokerto, Jawa Timur", topDays: 120 },
  { companyName: "PT Pandaan Pangan Sejahtera", picName: "Retno Handayani", picPhone: "081355500014", email: "gudang@pandaanpangan.example", address: "Jl. Raya Pandaan KM 45, Kec. Pandaan, Kab. Pasuruan, Jawa Timur", topDays: 180 },
];

const SUPPLIERS = [
  { companyName: "PT Surya Forklift Parts", country: "Indonesia", contactPerson: "Andi Kurniawan", phone: "031555500001", email: "sales@suryaforkliftparts.example" },
  { companyName: "CV Waru Hidrolik Sentra", country: "Indonesia", contactPerson: "Budi Hartono", phone: "031555500002", email: "order@waruhidrolik.example" },
  { companyName: "Toyoda Industrial Parts Co., Ltd.", country: "Jepang", contactPerson: "Kenji Mori", phone: "+81355500003", email: "export@toyodaparts.example" },
  { companyName: "Shenzhen Lift Components Ltd.", country: "Tiongkok", contactPerson: "Liu Wei", phone: "+86755500004", email: "sales@szliftcomp.example" },
];

const WORK_ORDERS = [
  { customer: "PT Waru Tirta Pangan", mechanic: "mekanik1@fleetops.test", unitModel: "Toyota 8FD25", serialNumber: "DEMO-8FD25-0147", dayOffset: 0, hour: 9, minute: 0, laborFee: 750_000, symptomNotes: "Mast bergetar saat mengangkat beban di atas 1,5 ton dan terdengar bunyi berdecit dari rantai angkat." },
  { customer: "CV Gedangan Logistik Mandiri", mechanic: "mekanik2@fleetops.test", unitModel: "Komatsu FD30", serialNumber: "DEMO-FD30-0382", dayOffset: 0, hour: 13, minute: 30, laborFee: 600_000, symptomNotes: "Mesin sulit hidup pada pagi hari dan lampu indikator oli menyala." },
  { customer: "PT Krian Baja Perkasa", mechanic: "mekanik1@fleetops.test", unitModel: "Nissan K25", serialNumber: "DEMO-K25-0911", dayOffset: 1, hour: 8, minute: 30, laborFee: 900_000, symptomNotes: "Rembesan oli hidrolik pada silinder angkat; mohon penggantian seal kit." },
  { customer: "PT Sedati Cold Storage", mechanic: "mekanik2@fleetops.test", unitModel: "Toyota 7FBR15 (elektrik)", serialNumber: "DEMO-7FBR15-0226", dayOffset: 1, hour: 10, minute: 0, laborFee: 800_000, symptomNotes: "Unit mati total di ruang pendingin; indikator baterai menunjukkan penuh." },
  { customer: "PT Rungkut Logam Presisi", mechanic: "mekanik1@fleetops.test", unitModel: "Mitsubishi FG25", serialNumber: "DEMO-FG25-0568", dayOffset: 2, hour: 9, minute: 0, laborFee: 650_000, symptomNotes: "Servis berkala 1.000 jam: penggantian filter oli, filter udara, dan pemeriksaan rem." },
  { customer: "PT Gresik Pelabuhan Raya", mechanic: "mekanik2@fleetops.test", unitModel: "Hyster H3.0FT", serialNumber: "DEMO-H30-0733", dayOffset: 3, hour: 8, minute: 0, laborFee: 1_100_000, symptomNotes: "Ban solid roda penggerak aus tidak merata dan unit tertarik ke kiri saat berjalan." },
];

async function main() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_SEED !== "true") {
    throw new Error("Seed demo dihentikan: NODE_ENV=production. Set ALLOW_SEED=true hanya jika Anda yakin.");
  }
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL belum diatur.");
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

  try {
    // Klien
    let customersAdded = 0;
    for (const c of CUSTOMERS) {
      if (!(await prisma.customer.findFirst({ where: { companyName: c.companyName } }))) {
        await prisma.customer.create({ data: c });
        customersAdded++;
      }
    }

    // Pemasok (+ contoh PO hanya saat pemasok pertama kali dibuat)
    const sparepart = async (sku: string) => {
      const part = await prisma.sparepart.findUnique({ where: { sku } });
      if (!part) throw new Error(`Sparepart ${sku} tidak ditemukan. Jalankan "npm run db:seed" terlebih dahulu.`);
      return part;
    };
    const supplierIds = new Map<string, number>();
    const freshSuppliers = new Set<string>();
    for (const s of SUPPLIERS) {
      let row = await prisma.supplier.findFirst({ where: { companyName: s.companyName } });
      if (!row) {
        row = await prisma.supplier.create({ data: s });
        freshSuppliers.add(s.companyName);
      }
      supplierIds.set(s.companyName, row.id);
    }

    const poPlans: Array<{
      supplier: string;
      status: PurchaseOrderStatus;
      trackingNumber?: string;
      etaDays?: number;
      lines: Array<[sku: string, qty: number, unitPrice: number]>;
    }> = [
      { supplier: "PT Surya Forklift Parts", status: "draft", lines: [["FLT-OIL-001", 20, 85_000], ["FLT-AIR-002", 10, 210_000]] },
      { supplier: "CV Waru Hidrolik Sentra", status: "ordered", etaDays: 4, lines: [["HYD-SEA-003", 6, 650_000], ["HYD-HOS-004", 30, 95_000]] },
      { supplier: "Toyoda Industrial Parts Co., Ltd.", status: "customs_cleared", trackingNumber: "JP-AWB-728401935", etaDays: 2, lines: [["TIR-SLD-009", 8, 1_450_000], ["OTH-FRK-010", 4, 380_000]] },
      { supplier: "Shenzhen Lift Components Ltd.", status: "ordered", trackingNumber: "SZ-AWB-440918277", etaDays: 12, lines: [["ELC-SWT-007", 10, 175_000], ["ELC-HRN-008", 12, 135_000]] },
    ];
    let posAdded = 0;
    for (const plan of poPlans) {
      if (!freshSuppliers.has(plan.supplier)) continue;
      const supplierId = supplierIds.get(plan.supplier)!;
      const items = [];
      for (const [sku, qty, unitPrice] of plan.lines) {
        const part = await sparepart(sku);
        items.push({ sparepartId: part.id, qty, unitPrice, subtotal: qty * unitPrice });
      }
      const prefix = monthPrefix("PO-SUP");
      const existing = await prisma.purchaseOrder.findMany({ where: { poNumber: { startsWith: prefix } }, select: { poNumber: true } });
      await prisma.purchaseOrder.create({
        data: {
          poNumber: nextNumber(prefix, existing.map((e) => e.poNumber)),
          supplierId,
          status: plan.status,
          trackingNumber: plan.trackingNumber ?? null,
          etaDate: plan.etaDays != null ? dateOnly(plan.etaDays) : null,
          totalAmount: items.reduce((sum, i) => sum + i.subtotal, 0),
          items: { create: items },
        },
      });
      posAdded++;
    }

    // Work order terjadwal untuk uji alur mekanik
    let wosAdded = 0;
    for (const w of WORK_ORDERS) {
      if (await prisma.workOrder.findFirst({ where: { serialNumber: w.serialNumber } })) continue;
      const customer = await prisma.customer.findFirst({ where: { companyName: w.customer } });
      const mechanic = await prisma.user.findUnique({ where: { email: w.mechanic } });
      if (!customer || !mechanic) throw new Error(`Klien atau mekanik untuk ${w.serialNumber} tidak ditemukan.`);
      const prefix = monthPrefix("WO");
      const existing = await prisma.workOrder.findMany({ where: { woNumber: { startsWith: prefix } }, select: { woNumber: true } });
      await prisma.workOrder.create({
        data: {
          woNumber: nextNumber(prefix, existing.map((e) => e.woNumber)),
          customerId: customer.id,
          mechanicId: mechanic.id,
          unitModel: w.unitModel,
          serialNumber: w.serialNumber,
          symptomNotes: w.symptomNotes,
          laborFee: w.laborFee,
          scheduledAt: wibAt(w.dayOffset, w.hour, w.minute),
        },
      });
      wosAdded++;
    }

    console.log(`Seed demo selesai — klien baru: ${customersAdded}, pemasok baru: ${freshSuppliers.size}, PO baru: ${posAdded}, work order baru: ${wosAdded}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
