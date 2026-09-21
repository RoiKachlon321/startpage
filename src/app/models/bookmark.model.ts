export type CardColor = 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'cyan' | 'pink' | 'teal';

export const CARD_COLORS: CardColor[] = ['blue', 'green', 'purple', 'orange', 'red', 'cyan', 'pink', 'teal'];

export const COLOR_HEX: Record<CardColor, string> = {
  blue: '#7aa2f7',
  green: '#9ece6a',
  purple: '#bb9af7',
  orange: '#e0af68',
  red: '#f7768e',
  cyan: '#7dcfff',
  pink: '#ff79c6',
  teal: '#73daca',
};

export interface BookmarkItem {
  id: string;
  name: string;
  url: string;
  customIcon: string | null;
}

export interface BookmarkSection {
  id: string;
  name: string | null;
  bookmarks: BookmarkItem[];
}

export interface BookmarkCategory {
  id: string;
  name: string;
  color: CardColor;
  sections: BookmarkSection[];
  /** How many columns to flow this card's bookmarks into. Default 1. */
  columns?: number;
}

export interface BookmarkProfile {
  id: string;
  name: string;
  categories: BookmarkCategory[];
  /** Uppercase letter that jumps to this profile. Excludes reserved keys (S, G). */
  jumpKey?: string;
}

/** Keys the global keydown handler already owns — a profile jumpKey can't reuse these. */
export const RESERVED_JUMP_KEYS = new Set(['S', 'G']);

export interface BookmarkData {
  lastModified: string;
  profiles: BookmarkProfile[];
}

// Legacy flat shape (pre-profiles). Only used to detect + migrate old files.
export interface FlatBookmarkData {
  lastModified: string;
  categories: BookmarkCategory[];
}

export interface BookmarkModalState {
  profileId: string;
  catId: string;
  sectionId: string;
  bookmark: BookmarkItem | null;
}

export interface CategoryModalState {
  category: BookmarkCategory | null;
}
