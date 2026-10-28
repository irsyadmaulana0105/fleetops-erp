export const PAGE_SIZE = 10;

/** "3" → 3; nilai kosong, bukan angka, atau < 1 → 1. */
export function parsePage(value: string | undefined): number {
  const page = Number.parseInt(value ?? "", 10);
  return Number.isFinite(page) && page >= 1 ? page : 1;
}

export function pageCountFor(total: number): number {
  return Math.max(1, Math.ceil(total / PAGE_SIZE));
}
