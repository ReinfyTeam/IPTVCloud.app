import { NextResponse } from 'next/server';
import { authorizeRequest } from '@/services/auth-service';
import db from '@/lib/db';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const auth = await authorizeRequest(req);
    if (auth instanceof NextResponse) return auth;

    const { rows: groups } = await db.query(
      `
      SELECT gc.*, 
        (SELECT COUNT(*) FROM "GroupChatMessage" WHERE "groupChatId" = gc.id)::int as "messageCount"
      FROM "GroupChat" gc
      WHERE EXISTS (
        SELECT 1 FROM "GroupChatMember" gcm 
        WHERE gcm."groupChatId" = gc.id AND gcm."userId" = $1
      )
      ORDER BY gc."createdAt" DESC
    `,
      [auth.user!.id],
    );

    const groupsWithMembers = await Promise.all(
      groups.map(async (group: any) => {
        const { rows: members } = await db.query(
          `
        SELECT gcm.*, 
          json_build_object(
            'id', u.id,
            'username', u.username,
            'profileIconUrl', u."profileIconUrl"
          ) as "user"
        FROM "GroupChatMember" gcm
        JOIN "User" u ON gcm."userId" = u.id
        WHERE gcm."groupChatId" = $1
      `,
          [group.id],
        );

        return {
          ...group,
          members,
          _count: {
            messages: group.messageCount,
          },
        };
      }),
    );

    return NextResponse.json(groupsWithMembers);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await authorizeRequest(req);
    if (auth instanceof NextResponse) return auth;

    const { name, members } = await req.json(); // members is array of user IDs

    if (!name) {
      return NextResponse.json({ error: 'Group name required' }, { status: 400 });
    }

    const groupId = crypto.randomUUID();
    const { rows: groupRows } = await db.query(
      `
      INSERT INTO "GroupChat" (id, name, "createdAt")
      VALUES ($1, $2, NOW())
      RETURNING *
    `,
      [groupId, name],
    );

    const group = groupRows[0];

    // Add creator as admin
    await db.query(
      `
      INSERT INTO "GroupChatMember" (id, "groupChatId", "userId", "isAdmin", "joinedAt")
      VALUES ($1, $2, $3, $4, NOW())
    `,
      [crypto.randomUUID(), groupId, auth.user!.id, true],
    );

    // Add other members
    if (members && Array.isArray(members)) {
      for (const memberId of members) {
        if (memberId === auth.user!.id) continue;
        await db.query(
          `
          INSERT INTO "GroupChatMember" (id, "groupChatId", "userId", "isAdmin", "joinedAt")
          VALUES ($1, $2, $3, $4, NOW())
        `,
          [crypto.randomUUID(), groupId, memberId, false],
        );
      }
    }

    return NextResponse.json(group);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
