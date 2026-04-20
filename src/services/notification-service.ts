import db from '@/lib/db';
import { Notification } from '@/types/db';

export type NotificationType = 'MESSAGE' | 'POST' | 'TICKET' | 'STATUS' | 'FOLLOW';

export async function createNotification({
  userId,
  title,
  message,
  type,
  link,
}: {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  link?: string;
}): Promise<Notification | null> {
  try {
    const result = await db.query(
      'INSERT INTO "Notification" ("userId", "title", "message", "type", "link") VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [userId, title, message, type, link],
    );
    return result.rows[0];
  } catch (error) {
    console.error('Failed to create notification:', error);
    return null;
  }
}

export async function getNotifications(userId: string, limit = 20): Promise<Notification[]> {
  const result = await db.query(
    'SELECT * FROM "Notification" WHERE "userId" = $1 ORDER BY "createdAt" DESC LIMIT $2',
    [userId, limit],
  );
  return result.rows;
}

export async function markAsRead(notificationId: string): Promise<Notification> {
  const result = await db.query(
    'UPDATE "Notification" SET "read" = $1 WHERE "id" = $2 RETURNING *',
    [true, notificationId],
  );
  return result.rows[0];
}

export async function markAllAsRead(userId: string) {
  return await db.query(
    'UPDATE "Notification" SET "read" = $1 WHERE "userId" = $2 AND "read" = $3',
    [true, userId, false],
  );
}
