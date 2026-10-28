export type Stat = {
  label: string;
  /** Nilai sudah diformat (mis. "Rp 1.250.000"). Gunakan null jika belum tersedia. */
  value: string | null;
  note?: string;
};

type StatStripProps = {
  stats: Stat[];
};

/**
 * Deretan angka kunci dalam satu panel (bukan kartu terpisah) agar mudah
 * dibandingkan sekilas. 2 kolom di HP, 4 kolom di layar lebar.
 * Garis pemisah dibuat dari `gap-px` di atas latar abu, jadi otomatis benar
 * untuk jumlah kolom berapa pun.
 */
export function StatStrip({ stats }: StatStripProps) {
  // Jumlah kolom di layar lebar mengikuti jumlah item (jumlah genap agar tidak ada sel abu-abu kosong).
  const desktopColumns = stats.length >= 4 ? "lg:grid-cols-4" : "lg:grid-cols-2";
  return (
    <dl className={`grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 ${desktopColumns}`}>
      {stats.map((stat) => (
        <div key={stat.label} className="bg-white p-4 sm:p-5">
          <dt className="text-sm text-slate-600">{stat.label}</dt>
          <dd className="mt-2 text-2xl font-semibold text-slate-900">
            {stat.value ?? <span className="text-slate-400">—</span>}
          </dd>
          {stat.note && <p className="mt-1 text-xs text-slate-500">{stat.note}</p>}
        </div>
      ))}
    </dl>
  );
}
