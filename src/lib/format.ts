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
