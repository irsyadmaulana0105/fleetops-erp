import type { Metadata } from "next";
import Link from "next/link";
import { Bell } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Panel } from "@/components/ui/panel";
import { formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { markAllNotificationsRead } from "@/lib/services/notification";

export const metadata: Metadata = { title: "Notifikasi" };

export default async function NotificationsPage() {
  const user = await requireUser();

  // Membuka halaman menandai semua notifikasi sebagai dibaca.
  await markAllNotificationsRead(user.id);

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <>
      <PageHeader title="Notifikasi" description="Pemberitahuan sistem, misalnya pembayaran invoice yang masuk." />
      <Panel title="Terbaru">
        {notifications.length === 0 ? (
          <EmptyState icon={Bell} title="Belum ada notifikasi" description="Notifikasi akan muncul di sini, misalnya saat klien membayar invoice." />
        ) : (
          <ul className="divide-y divide-slate-100">
            {notifications.map((item) => {
              const content = (
                <div className="px-4 py-3 sm:px-5">
                  <p className="text-sm font-medium text-slate-900">{item.title}</p>
                  <p className="mt-0.5 text-sm text-slate-600">{item.body}</p>
                  <p className="mt-1 text-xs text-slate-400">{formatDateTime(item.createdAt)}</p>
                </div>
              );
              return (
                <li key={item.id}>
                  {item.href ? (
                    <Link href={item.href} className="block hover:bg-slate-50">
                      {content}
                    </Link>
                  ) : (
                    content
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </>
  );
}
