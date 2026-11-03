import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { ToastProvider } from "@/components/ui/toast";
import { requireUser } from "@/lib/session";
import { unreadNotificationCount } from "@/lib/services/notification";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  // Pemeriksaan sesi yang sebenarnya (peran & status aktif dari database). Middleware hanya gerbang pertama.
  const user = await requireUser();
  const unreadCount = await unreadNotificationCount(user.id);

  return (
    <ToastProvider>
      <AppShell user={user} unreadCount={unreadCount}>{children}</AppShell>
    </ToastProvider>
  );
}
