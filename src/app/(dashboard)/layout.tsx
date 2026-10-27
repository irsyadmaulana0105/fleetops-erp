import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { getCurrentUser } from "@/lib/session";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  return <AppShell user={user}>{children}</AppShell>;
}
