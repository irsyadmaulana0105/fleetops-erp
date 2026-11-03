/**
 * Identitas perusahaan untuk kop surat PDF. Diatur lewat environment (lihat .env.example)
 * agar tidak perlu mengubah kode saat nama, alamat, atau rekening berganti.
 */
export type CompanyProfile = {
  name: string;
  address: string;
  phone: string;
  email: string;
  /** Teks bebas rekening pembayaran, mis. "BCA 1234567890 a.n. PT Contoh". */
  bank: string;
};

export function getCompany(): CompanyProfile {
  return {
    name: process.env.COMPANY_NAME || process.env.NEXT_PUBLIC_COMPANY_NAME || "FleetOps ERP",
    address: process.env.COMPANY_ADDRESS || "",
    phone: process.env.COMPANY_PHONE || "",
    email: process.env.COMPANY_EMAIL || "",
    bank: process.env.COMPANY_BANK || "",
  };
}
