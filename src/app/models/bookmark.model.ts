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
}

export interface BookmarkData {
  version: number;
  lastModified: string;
  categories: BookmarkCategory[];
}

export interface BookmarkModalState {
  catId: string;
  sectionId: string;
  bookmark: BookmarkItem | null;
}

export interface CategoryModalState {
  category: BookmarkCategory | null;
}
