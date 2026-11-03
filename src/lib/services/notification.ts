import { prisma } from "@/lib/prisma";

/**
 * Notifikasi in-app (Fase 4). Saat ini hanya pemilik yang menerima notifikasi otomatis
 * (mis. pembayaran masuk); mekanik/admin tidak.
 */

export async function notifyOwners(input: { title: string; body: string; href?: string }) {
  const owners = await prisma.user.findMany({ where: { role: "owner", isActive: true }, select: { id: true } });
  if (owners.length === 0) return;
  await prisma.notification.createMany({
    data: owners.map((owner) => ({ userId: owner.id, title: input.title, body: input.body, href: input.href ?? null })),
  });
}

export async function unreadNotificationCount(userId: number): Promise<number> {
  return prisma.notification.count({ where: { userId, readAt: null } });
}

export async function markAllNotificationsRead(userId: number): Promise<void> {
  await prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
}
