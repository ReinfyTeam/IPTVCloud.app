import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { authorizeRequest } from '@/services/auth-service';
import { createNotification } from '@/services/notification-service';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { sanitizeMarkdown } from '@/lib/sanitize';

const USER_FIELDS = `
  u.id, u.name, u.username, u.email, u.role, u."profileIcon", u."profileIconUrl"
`;

const commentSchema = z.object({
  channelId: z.string().min(1),
  text: z.string().min(1).max(500),
  parentId: z.string().optional(),
  attachments: z
    .array(
      z.object({
        url: z.string().url(),
        filename: z.string(),
        type: z.string().optional(),
        expiresAt: z.string().optional().nullable(),
      }),
    )
    .optional(),
});

const commentUpdateSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1).max(500).optional(),
  isPinned: z.boolean().optional(),
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const channelId = url.searchParams.get('channelId');

  if (!channelId) return NextResponse.json({ error: 'Missing channelId' }, { status: 400 });

  try {
    const { rows: comments } = await db.query(
      `SELECT c.*, 
        json_build_object(
          'id', u.id, 'name', u.name, 'username', u.username, 
          'email', u.email, 'role', u.role, 
          'profileIcon', u."profileIcon", 'profileIconUrl', u."profileIconUrl"
        ) as user,
        COALESCE(
          (SELECT json_agg(a.*) FROM "Attachment" a WHERE a."commentId" = c.id),
          '[]'::json
        ) as attachments
       FROM "Comment" c
       JOIN "User" u ON c."userId" = u.id
       WHERE c."channelId" = $1
       ORDER BY c."isPinned" DESC, c."createdAt" DESC
       LIMIT 50`,
      [channelId],
    );

    return NextResponse.json(comments);
  } catch (error) {
    console.error('Comments GET error', error);
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await authorizeRequest(req, { requireNotMuted: true });
  if (auth instanceof NextResponse) return auth;

  const { user } = auth;
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (user.isMuted && user.muteExpiresAt && user.muteExpiresAt > new Date()) {
    return NextResponse.json(
      { error: 'You are muted until ' + user.muteExpiresAt.toLocaleString() },
      { status: 403 },
    );
  }

  try {
    const body = await req.json();
    const validatedData = commentSchema.parse(body);

    const commentId = randomUUID();
    await db.query(
      'INSERT INTO "Comment" (id, "userId", "channelId", text, "parentId") VALUES ($1, $2, $3, $4, $5)',
      [
        commentId,
        user.id,
        validatedData.channelId,
        sanitizeMarkdown(validatedData.text),
        validatedData.parentId || null,
      ],
    );

    if (validatedData.attachments && Array.isArray(validatedData.attachments)) {
      for (const a of validatedData.attachments) {
        await db.query(
          'INSERT INTO "Attachment" (id, url, filename, type, "expiresAt", "commentId") VALUES ($1, $2, $3, $4, $5, $6)',
          [
            randomUUID(),
            a.url,
            a.filename,
            a.type || 'FILE',
            a.expiresAt ? new Date(a.expiresAt) : null,
            commentId,
          ],
        );
      }
    }

    const { rows: commentRows } = await db.query(
      `SELECT c.*, 
        json_build_object(
          'id', u.id, 'name', u.name, 'username', u.username, 
          'email', u.email, 'role', u.role, 
          'profileIcon', u."profileIcon", 'profileIconUrl', u."profileIconUrl"
        ) as user
       FROM "Comment" c
       JOIN "User" u ON c."userId" = u.id
       WHERE c.id = $1`,
      [commentId],
    );
    const comment = commentRows[0];

    // Notify parent comment user
    if (validatedData.parentId) {
      const { rows: parentRows } = await db.query('SELECT "userId" FROM "Comment" WHERE id = $1', [
        validatedData.parentId,
      ]);
      const parent = parentRows[0];
      if (parent && parent.userId !== user.id) {
        await createNotification({
          userId: parent.userId,
          title: `New reply in chat`,
          message: `${user.username || 'Someone'} replied to your comment: "${validatedData.text.substring(0, 50)}..."`,
          type: 'POST',
          link: `/channel/${validatedData.channelId}`,
        });
      }
    }

    return NextResponse.json(comment);
  } catch (error) {
    console.error('Comment POST error', error);
    return NextResponse.json({ error: 'Failed to post comment' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const auth = await authorizeRequest(req);
  if (auth instanceof NextResponse) return auth;

  const { user } = auth;
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await req.json();
    const { rows: commentRows } = await db.query('SELECT "userId" FROM "Comment" WHERE id = $1', [
      id,
    ]);
    const comment = commentRows[0];

    if (!comment) return NextResponse.json({ error: 'Comment not found' }, { status: 404 });

    // Allow staff/admin or owner to delete
    if (!auth.isStaff && comment.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await db.query('DELETE FROM "Comment" WHERE id = $1', [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const auth = await authorizeRequest(req);
  if (auth instanceof NextResponse) return auth;

  const { user } = auth;
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const validatedData = commentUpdateSchema.parse(body);
    const { id, text, isPinned } = validatedData;

    const { rows: existingRows } = await db.query('SELECT "userId" FROM "Comment" WHERE id = $1', [
      id,
    ]);
    const existing = existingRows[0];
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Handle Pinning (Staff only)
    if (isPinned !== undefined) {
      if (!auth.isStaff) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      const { rows } = await db.query(
        'UPDATE "Comment" SET "isPinned" = $1, "updatedAt" = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
        [isPinned, id],
      );
      return NextResponse.json(rows[0]);
    }

    // Handle Editing (Owner only)
    if (text !== undefined) {
      if (existing.userId !== user.id)
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      if (text.length > 500)
        return NextResponse.json({ error: 'Comment too long' }, { status: 400 });

      const { rows } = await db.query(
        `UPDATE "Comment" SET text = $1, "updatedAt" = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
        [sanitizeMarkdown(text), id],
      );

      const { rows: updatedRows } = await db.query(
        `SELECT c.*, 
          json_build_object(
            'id', u.id, 'name', u.name, 'username', u.username, 
            'email', u.email, 'role', u.role, 
            'profileIcon', u."profileIcon", 'profileIconUrl', u."profileIconUrl"
          ) as user
         FROM "Comment" c
         JOIN "User" u ON c."userId" = u.id
         WHERE c.id = $1`,
        [id],
      );
      return NextResponse.json(updatedRows[0]);
    }

    return NextResponse.json({ error: 'No changes provided' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update comment' }, { status: 500 });
  }
}
