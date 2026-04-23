-- Initial schema for IPTVCloud.app

CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT PRIMARY KEY,
  "email" TEXT UNIQUE NOT NULL,
  "username" TEXT UNIQUE,
  "password" TEXT NOT NULL,
  "name" TEXT,
  "firstName" TEXT,
  "lastName" TEXT,
  "middleInitial" TEXT,
  "suffix" TEXT,
  "bio" TEXT,
  "about" TEXT,
  "profileIcon" TEXT,
  "profileIconUrl" TEXT,
  "notificationSettings" TEXT NOT NULL DEFAULT '{}',
  "privacySettings" TEXT NOT NULL DEFAULT '{}',
  "role" TEXT NOT NULL DEFAULT 'USER',
  "suspendedAt" TIMESTAMP,
  "suspensionReason" TEXT,
  "isMuted" BOOLEAN NOT NULL DEFAULT FALSE,
  "muteExpiresAt" TIMESTAMP,
  "isRestricted" BOOLEAN NOT NULL DEFAULT FALSE,
  "isVerified" BOOLEAN NOT NULL DEFAULT FALSE,
  "verifiedAt" TIMESTAMP,
  "twoFactorSecret" TEXT,
  "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT FALSE,
  "forcePasswordReset" BOOLEAN NOT NULL DEFAULT FALSE,
  "lastUsernameChange" TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Follower" (
  "id" TEXT PRIMARY KEY,
  "followerId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "followingId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("followerId", "followingId")
);
CREATE INDEX IF NOT EXISTS "follower_followerid_idx" ON "Follower"("followerId");
CREATE INDEX IF NOT EXISTS "follower_followingid_idx" ON "Follower"("followingId");

CREATE TABLE IF NOT EXISTS "Message" (
  "id" TEXT PRIMARY KEY,
  "senderId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "receiverId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "content" TEXT NOT NULL,
  "read" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "message_senderid_idx" ON "Message"("senderId");
CREATE INDEX IF NOT EXISTS "message_receiverid_idx" ON "Message"("receiverId");

CREATE TABLE IF NOT EXISTS "GroupChat" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT,
  "icon" TEXT,
  "themeColor" TEXT DEFAULT '#06b6d4',
  "creatorId" TEXT REFERENCES "User"("id"),
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "GroupChatMember" (
  "id" TEXT PRIMARY KEY,
  "groupChatId" TEXT NOT NULL REFERENCES "GroupChat"("id") ON DELETE CASCADE,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "isAdmin" BOOLEAN NOT NULL DEFAULT FALSE,
  "isMuted" BOOLEAN NOT NULL DEFAULT FALSE,
  "joinedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "groupchatmember_groupchatid_idx" ON "GroupChatMember"("groupChatId");
CREATE INDEX IF NOT EXISTS "groupchatmember_userid_idx" ON "GroupChatMember"("userId");

CREATE TABLE IF NOT EXISTS "GroupChatMessage" (
  "id" TEXT PRIMARY KEY,
  "groupChatId" TEXT NOT NULL REFERENCES "GroupChat"("id") ON DELETE CASCADE,
  "userId" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "isPinned" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "groupchatmessage_groupchatid_idx" ON "GroupChatMessage"("groupChatId");

CREATE TABLE IF NOT EXISTS "GroupInviteLink" (
  "id" TEXT PRIMARY KEY,
  "groupChatId" TEXT NOT NULL REFERENCES "GroupChat"("id") ON DELETE CASCADE,
  "code" TEXT UNIQUE NOT NULL,
  "expiresAt" TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "groupinvitelink_code_idx" ON "GroupInviteLink"("code");

CREATE TABLE IF NOT EXISTS "Favorite" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "channelId" TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("userId", "channelId")
);
CREATE INDEX IF NOT EXISTS "favorite_user_channel_idx" ON "Favorite"("userId", "channelId");

CREATE TABLE IF NOT EXISTS "WatchHistory" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "channelId" TEXT NOT NULL,
  "channelName" TEXT NOT NULL,
  "channelLogo" TEXT,
  "category" TEXT,
  "country" TEXT,
  "watchedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "watchhistory_user_watchedat_idx" ON "WatchHistory"("userId", "watchedAt");

CREATE TABLE IF NOT EXISTS "UserSettings" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT UNIQUE NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "accentColor" TEXT NOT NULL DEFAULT 'cyan',
  "playerLayout" TEXT NOT NULL DEFAULT 'theater',
  "defaultVolume" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  "autoplay" BOOLEAN NOT NULL DEFAULT FALSE,
  "performanceMode" BOOLEAN NOT NULL DEFAULT FALSE,
  "language" TEXT NOT NULL DEFAULT 'en',
  "darkMode" BOOLEAN NOT NULL DEFAULT TRUE,
  "showEpg" BOOLEAN NOT NULL DEFAULT TRUE,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "CustomShortcut" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "action" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  UNIQUE("userId", "action")
);

CREATE TABLE IF NOT EXISTS "Comment" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "channelId" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "parentId" TEXT REFERENCES "Comment"("id") ON DELETE CASCADE,
  "isPinned" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "comment_channel_createdat_idx" ON "Comment"("channelId", "createdAt");

CREATE TABLE IF NOT EXISTS "Ticket" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "handledById" TEXT REFERENCES "User"("id"),
  "subject" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'SUPPORT',
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "isArchived" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "ticket_userid_idx" ON "Ticket"("userId");

CREATE TABLE IF NOT EXISTS "TicketResponse" (
  "id" TEXT PRIMARY KEY,
  "ticketId" TEXT NOT NULL REFERENCES "Ticket"("id") ON DELETE CASCADE,
  "userId" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "ticket_response_ticketid_idx" ON "TicketResponse"("ticketId");

CREATE TABLE IF NOT EXISTS "Incident" (
  "id" TEXT PRIMARY KEY,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'SYSTEM',
  "status" TEXT NOT NULL DEFAULT 'INVESTIGATING',
  "severity" TEXT NOT NULL DEFAULT 'LOW',
  "tags" TEXT[] NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "IncidentUpdate" (
  "id" TEXT PRIMARY KEY,
  "incidentId" TEXT NOT NULL REFERENCES "Incident"("id") ON DELETE CASCADE,
  "message" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "incidentupdate_incidentid_idx" ON "IncidentUpdate"("incidentId");

CREATE TABLE IF NOT EXISTS "Post" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "post_userid_idx" ON "Post"("userId");

CREATE TABLE IF NOT EXISTS "PostComment" (
  "id" TEXT PRIMARY KEY,
  "postId" TEXT NOT NULL REFERENCES "Post"("id") ON DELETE CASCADE,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "content" TEXT NOT NULL,
  "parentId" TEXT REFERENCES "PostComment"("id") ON DELETE CASCADE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "postcomment_postid_idx" ON "PostComment"("postId");

CREATE TABLE IF NOT EXISTS "PostLike" (
  "id" TEXT PRIMARY KEY,
  "postId" TEXT NOT NULL REFERENCES "Post"("id") ON DELETE CASCADE,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("postId", "userId")
);
CREATE INDEX IF NOT EXISTS "postlike_postid_idx" ON "PostLike"("postId");

CREATE TABLE IF NOT EXISTS "UptimeRecord" (
  "id" TEXT PRIMARY KEY,
  "status" TEXT NOT NULL,
  "latency" INTEGER,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Attachment" (
  "id" TEXT PRIMARY KEY,
  "url" TEXT NOT NULL,
  "filename" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'FILE',
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP,
  "ticketId" TEXT REFERENCES "Ticket"("id") ON DELETE CASCADE,
  "postId" TEXT REFERENCES "Post"("id") ON DELETE CASCADE,
  "commentId" TEXT REFERENCES "Comment"("id") ON DELETE CASCADE,
  "postCommentId" TEXT REFERENCES "PostComment"("id") ON DELETE CASCADE,
  "ticketResponseId" TEXT REFERENCES "TicketResponse"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "attachment_ticketid_idx" ON "Attachment"("ticketId");
CREATE INDEX IF NOT EXISTS "attachment_postid_idx" ON "Attachment"("postId");
CREATE INDEX IF NOT EXISTS "attachment_commentid_idx" ON "Attachment"("commentId");

CREATE TABLE IF NOT EXISTS "Notification" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "link" TEXT,
  "read" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "notification_userid_idx" ON "Notification"("userId");

CREATE TABLE IF NOT EXISTS "CustomChannel" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "streamUrl" TEXT NOT NULL,
  "logo" TEXT,
  "category" TEXT,
  "country" TEXT,
  "language" TEXT,
  "region" TEXT,
  "description" TEXT,
  "isSubmitted" BOOLEAN NOT NULL DEFAULT FALSE,
  "isApproved" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "customchannel_userid_idx" ON "CustomChannel"("userId");

CREATE TABLE IF NOT EXISTS "GlobalSetting" (
  "key" TEXT PRIMARY KEY,
  "value" TEXT NOT NULL,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Initialize default security level
INSERT INTO "GlobalSetting" ("key", "value") 
VALUES ('SECURITY_LEVEL', 'MEDIUM')
ON CONFLICT ("key") DO NOTHING;

-- Initialize default challenge types (all enabled)
INSERT INTO "GlobalSetting" ("key", "value") 
VALUES ('CHALLENGE_TYPES', 'IMAGE,TEXT,MATH,CLICK')
ON CONFLICT ("key") DO NOTHING;
