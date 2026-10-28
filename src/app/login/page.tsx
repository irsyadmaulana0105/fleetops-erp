import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Brand } from "@/components/layout/brand";
import { getCurrentUser } from "@/lib/session";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Masuk" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  // Sudah punya sesi yang sah → tidak perlu login lagi.
  if (await getCurrentUser()) redirect("/dashboard");

  const { next } = await searchParams;
  const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "FleetOps ERP";
  const companyName = process.env.NEXT_PUBLIC_COMPANY_NAME ?? "PT Forklift Solusindo Utama";

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-shell px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <Brand appName={appName} companyName={companyName} />
        </div>
        <div className="overflow-hidden rounded-2xl bg-white shadow-xl">
          <div className="hazard-stripe" aria-hidden="true" />
          <div className="p-6">
            <h1 className="text-xl font-semibold text-slate-900">Masuk</h1>
            <p className="mb-5 mt-1 text-sm text-slate-600">Gunakan akun yang diberikan oleh pemilik atau admin.</p>
            <LoginForm next={next} />
          </div>
        </div>
      </div>
    </main>
  );
}
