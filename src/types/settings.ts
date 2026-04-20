export interface PrivacySettings {
  showPostHistory: boolean;
  showCommentHistory: boolean;
  showRecentlyWatched: boolean;
}

export const DEFAULT_PRIVACY_SETTINGS: PrivacySettings = {
  showPostHistory: true,
  showCommentHistory: true,
  showRecentlyWatched: true,
};

export interface UserSettings {
  id?: string;
  userId?: string;
  accentColor: string;
  playerLayout: 'theater' | 'compact' | 'fullscreen';
  defaultVolume: number;
  autoplay: boolean;
  performanceMode: boolean;
  language: string;
  darkMode: boolean;
  showEpg: boolean;
}

export const DEFAULT_SETTINGS: UserSettings = {
  accentColor: 'cyan',
  playerLayout: 'theater',
  defaultVolume: 1.0,
  autoplay: false,
  performanceMode: false,
  language: 'en',
  darkMode: true,
  showEpg: true,
};

export const ACCENT_COLORS = [
  { id: 'cyan', label: 'Cyan', hex: '#06b6d4' },
  { id: 'violet', label: 'Violet', hex: '#8b5cf6' },
  { id: 'emerald', label: 'Emerald', hex: '#10b981' },
  { id: 'rose', label: 'Rose', hex: '#f43f5e' },
  { id: 'amber', label: 'Amber', hex: '#f59e0b' },
  { id: 'blue', label: 'Blue', hex: '#3b82f6' },
];
