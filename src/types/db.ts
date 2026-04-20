export interface User {
  id: string;
  email: string;
  username: string | null;
  password: string;
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  middleInitial?: string | null;
  suffix?: string | null;
  bio?: string | null;
  about?: string | null;
  profileIcon?: string | null;
  profileIconUrl?: string | null;
  notificationSettings: string;
  privacySettings: string;
  role: string;
  suspendedAt: Date | null;
  suspensionReason: string | null;
  isMuted: boolean;
  muteExpiresAt: Date | null;
  isRestricted: boolean;
  isVerified: boolean;
  verifiedAt: Date | null;
  twoFactorSecret: string | null;
  twoFactorEnabled: boolean;
  forcePasswordReset: boolean;
  lastUsernameChange: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Favorite {
  id: string;
  userId: string;
  channelId: string;
  createdAt: Date;
}

export interface WatchHistory {
  id: string;
  userId: string;
  channelId: string;
  channelName: string;
  channelLogo: string | null;
  category: string | null;
  country: string | null;
  watchedAt: Date;
}

export interface UserSettings {
  id: string;
  userId: string;
  accentColor: string;
  playerLayout: string;
  defaultVolume: number;
  autoplay: boolean;
  performanceMode: boolean;
  language: string;
  darkMode: boolean;
  showEpg: boolean;
  updatedAt: Date;
}

export interface CustomShortcut {
  id: string;
  userId: string;
  action: string;
  key: string;
}

export interface Comment {
  id: string;
  userId: string;
  channelId: string;
  text: string;
  parentId: string | null;
  isPinned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Ticket {
  id: string;
  userId: string;
  handledById: string | null;
  subject: string;
  message: string;
  type: string;
  status: string;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TicketResponse {
  id: string;
  ticketId: string;
  userId: string;
  message: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Incident {
  id: string;
  title: string;
  description: string;
  type: string;
  status: string;
  severity: string;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt: Date | null;
}

export interface IncidentUpdate {
  id: string;
  incidentId: string;
  message: string;
  status: string;
  createdAt: Date;
}

export interface Post {
  id: string;
  userId: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PostComment {
  id: string;
  postId: string;
  userId: string;
  content: string;
  parentId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PostLike {
  id: string;
  postId: string;
  userId: string;
  createdAt: Date;
}

export interface UptimeRecord {
  id: string;
  status: string;
  latency: number | null;
  createdAt: Date;
}

export interface Attachment {
  id: string;
  url: string;
  filename: string;
  type: string;
  createdAt: Date;
  expiresAt: Date | null;
  ticketId: string | null;
  postId: string | null;
  commentId: string | null;
  postCommentId: string | null;
  ticketResponseId: string | null;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  link: string | null;
  read: boolean;
  createdAt: Date;
}
