const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

/** 1250000 → "Rp 1.250.000" */
export function formatRupiah(value: number | string | { toString(): string }): string {
  return rupiah.format(Number(value.toString())).replace(/ /g, " ");
}

const dateFmt = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" });

export function formatDate(value: Date | string): string {
  return dateFmt.format(typeof value === "string" ? new Date(value) : value);
}

const dateOnlyFmt = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/** Untuk kolom tanggal murni (@db.Date, disimpan sebagai 00:00 UTC). */
export function formatDateOnly(value: Date): string {
  return dateOnlyFmt.format(value);
}

const dateTimeFmt = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "Asia/Jakarta",
});

/** "28 Okt 2026, 09.30 WIB" */
export function formatDateTime(value: Date): string {
  return `${dateTimeFmt.format(value)} WIB`;
}
