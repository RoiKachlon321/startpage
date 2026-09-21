import { Injectable, computed, inject, signal } from '@angular/core';
import {
  BookmarkCategory,
  BookmarkData,
  BookmarkItem,
  BookmarkModalState,
  BookmarkProfile,
  BookmarkSection,
  CardColor,
  RESERVED_JUMP_KEYS,
  CategoryModalState,
  FlatBookmarkData,
} from '../models/bookmark.model';
import { BookmarkParser } from './bookmark-parser';

@Injectable({ providedIn: 'root' })
export class BookmarkService {
  private readonly STORAGE_KEY = 'startpage-data';
  private readonly parser = inject(BookmarkParser);

  readonly data = signal<BookmarkData | null>(null);
  readonly editMode = signal(false);
  readonly searchQuery = signal('');
  /** Profile whose band is currently nearest the viewport top (drives `s` search scope). */
  readonly activeProfileId = signal<string | null>(null);
  readonly matchingIds = computed<Set<string>>(() => {
    const q = this.searchQuery();
    const d = this.data();
    if (!q || !d) return new Set();
    const ids: string[] = [];
    for (const profile of d.profiles) {
      for (const cat of profile.categories) {
        const catMatch = cat.name.toLowerCase().includes(q);
        for (const sec of cat.sections) {
          for (const bk of sec.bookmarks) {
            if (catMatch || bk.name.toLowerCase().includes(q)) {
              ids.push(bk.id);
              if (ids.length > 3) return new Set();
            }
          }
        }
      }
    }
    return new Set(ids);
  });
  readonly bookmarkModal = signal<BookmarkModalState | null>(null);
  readonly categoryModal = signal<CategoryModalState | null>(null);
  readonly moveModalState = signal<{ fromCatId: string; bookmarkId?: string; sectionId?: string; toProfile?: boolean } | null>(null);

  init(): void {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    const local: unknown = stored ? JSON.parse(stored) : null;

    if (local) {
      // Migrate whatever the cache holds (old flat shape or already nested).
      const migrated = this.ensureProfiles(local as BookmarkData | FlatBookmarkData);
      this.data.set(migrated);
      // If the cache was flat, rewrite it (and disk) once in the new shape.
      if (this.isFlat(local)) this.persist();
      return;
    }

    this.data.set({ lastModified: '', profiles: [] });

    fetch('./bookmarks.json?t=' + Date.now())
      .then(res => res.json())
      .then((file: BookmarkData | FlatBookmarkData) => {
        const migrated = this.ensureProfiles(file);
        this.data.set(migrated);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(migrated));
        // If disk file was flat, rewrite it nested so it stays migrated.
        if (this.isFlat(file)) this.syncToFile(migrated);
      })
      .catch(() => {});
  }

  // ─── Migration (non-destructive) ───

  private isFlat(d: unknown): d is FlatBookmarkData {
    return !!d && typeof d === 'object' && 'categories' in (d as object) && !('profiles' in (d as object));
  }

  /** Return a nested BookmarkData. If already nested, pass through. If flat, group into profiles. */
  private ensureProfiles(d: BookmarkData | FlatBookmarkData): BookmarkData {
    if (!this.isFlat(d)) {
      const nested = d as BookmarkData;
      return { lastModified: nested.lastModified || '', profiles: nested.profiles || [] };
    }
    return this.migrateFlat(d);
  }

  /**
   * Group a flat category list into profiles by name prefix.
   * "Raption - X" → Raption profile; standalone project names get their own profile;
   * everything else lands in a "Personal" profile. Zero data loss: every category is placed.
   */
  private migrateFlat(flat: FlatBookmarkData): BookmarkData {
    const cats = flat.categories || [];
    const profileMap = new Map<string, BookmarkCategory[]>();
    const order: string[] = [];

    // Categories that stand alone as their own profile (case-insensitive match on full name).
    const standalone = new Set(['point-view', 'lustchat', 'pingo']);

    const place = (profileName: string, cat: BookmarkCategory) => {
      if (!profileMap.has(profileName)) {
        profileMap.set(profileName, []);
        order.push(profileName);
      }
      profileMap.get(profileName)!.push(cat);
    };

    for (const cat of cats) {
      const name = cat.name.trim();
      const dashIdx = name.indexOf(' - ');
      if (dashIdx > 0) {
        // "Raption - Dev" → profile "Raption", keep category name as the suffix.
        const profileName = name.slice(0, dashIdx).trim();
        const suffix = name.slice(dashIdx + 3).trim();
        place(profileName, { ...cat, name: suffix || cat.name });
      } else if (standalone.has(name.toLowerCase())) {
        place(name, cat);
      } else {
        place('Personal', cat);
      }
    }

    const profiles: BookmarkProfile[] = order.map(profileName => ({
      id: this.uid(),
      name: profileName,
      categories: profileMap.get(profileName)!,
    }));

    return { lastModified: new Date().toISOString(), profiles };
  }

  toggleEditMode(): void {
    this.editMode.update(v => !v);
  }

  // ─── Profile CRUD ───

  addProfile(name: string): void {
    this.mutate(d => {
      d.profiles.push({
        id: this.uid(),
        name,
        categories: [{ id: this.uid(), name: 'General', color: 'blue', sections: [{ id: this.uid(), name: null, bookmarks: [] }] }],
      });
    });
  }

  /**
   * Assign an uppercase jump letter to a profile. Empty clears it.
   * Rejects reserved keys and letters already used by another profile.
   * Returns null on success, or an error string to show the user.
   */
  setProfileJumpKey(profileId: string, rawKey: string): string | null {
    const key = rawKey.trim().toUpperCase();
    if (key) {
      if (!/^[A-Z]$/.test(key)) return 'Use a single letter A–Z.';
      if (RESERVED_JUMP_KEYS.has(key)) return `"${key}" is reserved.`;
      const clash = this.data()?.profiles.find(p => p.id !== profileId && p.jumpKey === key);
      if (clash) return `"${key}" already used by "${clash.name}".`;
    }
    this.mutate(d => {
      const p = d.profiles.find(p => p.id === profileId);
      if (p) p.jumpKey = key || undefined;
    });
    return null;
  }

  renameProfile(profileId: string, name: string): void {
    this.mutate(d => {
      const p = d.profiles.find(p => p.id === profileId);
      if (p) p.name = name;
    });
  }

  deleteProfile(profileId: string): void {
    this.mutate(d => {
      d.profiles = d.profiles.filter(p => p.id !== profileId);
    });
  }

  moveProfileUp(profileId: string): void {
    this.mutate(d => {
      const idx = d.profiles.findIndex(p => p.id === profileId);
      if (idx <= 0) return;
      [d.profiles[idx - 1], d.profiles[idx]] = [d.profiles[idx], d.profiles[idx - 1]];
    });
  }

  moveProfileDown(profileId: string): void {
    this.mutate(d => {
      const idx = d.profiles.findIndex(p => p.id === profileId);
      if (idx === -1 || idx >= d.profiles.length - 1) return;
      [d.profiles[idx], d.profiles[idx + 1]] = [d.profiles[idx + 1], d.profiles[idx]];
    });
  }

  // ─── Bookmark CRUD ───

  addBookmark(catId: string, sectionId: string, item: Omit<BookmarkItem, 'id'>): void {
    this.mutate(d => {
      const section = this.findSection(d, catId, sectionId);
      if (!section) return;
      section.bookmarks.push({ ...item, id: this.uid() });
    });
  }

  updateBookmark(catId: string, bookmarkId: string, updates: Partial<BookmarkItem>): void {
    this.mutate(d => {
      const cat = this.findCategory(d, catId);
      if (!cat) return;
      for (const sec of cat.sections) {
        const bk = sec.bookmarks.find(b => b.id === bookmarkId);
        if (bk) {
          Object.assign(bk, updates);
          return;
        }
      }
    });
  }

  deleteBookmark(catId: string, bookmarkId: string): void {
    this.mutate(d => {
      const cat = this.findCategory(d, catId);
      if (!cat) return;
      for (const sec of cat.sections) {
        const idx = sec.bookmarks.findIndex(b => b.id === bookmarkId);
        if (idx !== -1) {
          sec.bookmarks.splice(idx, 1);
          return;
        }
      }
    });
  }

  moveBookmark(fromCatId: string, bookmarkId: string, toCatId: string, toSectionId?: string): void {
    this.mutate(d => {
      let bookmark: BookmarkItem | null = null;
      const fromCat = this.findCategory(d, fromCatId);
      if (!fromCat) return;
      for (const sec of fromCat.sections) {
        const idx = sec.bookmarks.findIndex(b => b.id === bookmarkId);
        if (idx !== -1) {
          bookmark = sec.bookmarks.splice(idx, 1)[0];
          break;
        }
      }
      if (!bookmark) return;
      const toCat = this.findCategory(d, toCatId);
      if (!toCat) return;
      const target = toSectionId
        ? toCat.sections.find(s => s.id === toSectionId) || toCat.sections[0]
        : toCat.sections[0];
      if (target) {
        target.bookmarks.push(bookmark);
      }
    });
  }

  moveSection(fromCatId: string, sectionId: string, toCatId: string): void {
    this.mutate(d => {
      const fromCat = this.findCategory(d, fromCatId);
      if (!fromCat) return;
      const idx = fromCat.sections.findIndex(s => s.id === sectionId);
      if (idx === -1) return;
      const section = fromCat.sections.splice(idx, 1)[0];
      if (fromCat.sections.length === 0) {
        fromCat.sections.push({ id: this.uid(), name: null, bookmarks: [] });
      }
      const toCat = this.findCategory(d, toCatId);
      if (!toCat) return;
      const sectionName = section.name || 'Bookmarks';
      section.name = `${fromCat.name} - ${sectionName}`;
      toCat.sections.push(section);
    });
  }

  moveCategoryUp(catId: string): void {
    this.mutate(d => {
      const profile = this.findProfileOfCategory(d, catId);
      if (!profile) return;
      const idx = profile.categories.findIndex(c => c.id === catId);
      if (idx <= 0) return;
      [profile.categories[idx - 1], profile.categories[idx]] = [profile.categories[idx], profile.categories[idx - 1]];
    });
  }

  moveCategoryDown(catId: string): void {
    this.mutate(d => {
      const profile = this.findProfileOfCategory(d, catId);
      if (!profile) return;
      const idx = profile.categories.findIndex(c => c.id === catId);
      if (idx === -1 || idx >= profile.categories.length - 1) return;
      [profile.categories[idx], profile.categories[idx + 1]] = [profile.categories[idx + 1], profile.categories[idx]];
    });
  }

  /** Move a whole category into another profile. */
  moveCategoryToProfile(catId: string, toProfileId: string): void {
    this.mutate(d => {
      const fromProfile = this.findProfileOfCategory(d, catId);
      const toProfile = d.profiles.find(p => p.id === toProfileId);
      if (!fromProfile || !toProfile || fromProfile.id === toProfileId) return;
      const idx = fromProfile.categories.findIndex(c => c.id === catId);
      if (idx === -1) return;
      const [cat] = fromProfile.categories.splice(idx, 1);
      toProfile.categories.push(cat);
    });
  }

  // ─── Category CRUD ───

  addCategory(name: string, color: CardColor, profileId?: string): void {
    this.mutate(d => {
      const target = profileId
        ? d.profiles.find(p => p.id === profileId)
        : d.profiles.find(p => p.id === this.activeProfileId()) || d.profiles[0];
      if (!target) return;
      target.categories.push({
        id: this.uid(),
        name,
        color,
        sections: [{ id: this.uid(), name: null, bookmarks: [] }],
      });
    });
  }

  updateCategory(catId: string, updates: { name?: string; color?: CardColor; columns?: number }): void {
    this.mutate(d => {
      const cat = this.findCategory(d, catId);
      if (!cat) return;
      if (updates.name !== undefined) cat.name = updates.name;
      if (updates.color !== undefined) cat.color = updates.color;
      if (updates.columns !== undefined) cat.columns = updates.columns > 1 ? updates.columns : undefined;
    });
  }

  deleteCategory(catId: string): void {
    this.mutate(d => {
      const profile = this.findProfileOfCategory(d, catId);
      if (!profile) return;
      profile.categories = profile.categories.filter(c => c.id !== catId);
    });
  }

  // ─── Section CRUD ───

  addSection(catId: string, name: string): void {
    this.mutate(d => {
      const cat = this.findCategory(d, catId);
      if (!cat) return;
      cat.sections.push({ id: this.uid(), name, bookmarks: [] });
    });
  }

  renameSection(catId: string, sectionId: string, name: string): void {
    this.mutate(d => {
      const section = this.findSection(d, catId, sectionId);
      if (section) section.name = name;
    });
  }

  deleteSection(catId: string, sectionId: string): void {
    this.mutate(d => {
      const cat = this.findCategory(d, catId);
      if (!cat) return;
      cat.sections = cat.sections.filter(s => s.id !== sectionId);
      if (cat.sections.length === 0) {
        cat.sections.push({ id: this.uid(), name: null, bookmarks: [] });
      }
    });
  }

  // ─── Export / Import ───

  exportJson(): void {
    const d = this.data();
    if (!d) return;
    this.downloadFile(JSON.stringify(d, null, 2), 'bookmarks.json', 'application/json');
  }

  exportHtml(): void {
    const d = this.data();
    if (!d) return;
    let html = '<!DOCTYPE NETSCAPE-Bookmark-file-1>\n';
    html += '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">\n';
    html += '<TITLE>Bookmarks</TITLE>\n<H1>Bookmarks</H1>\n<DL><p>\n';
    for (const profile of d.profiles) {
      html += `    <DT><H3>${profile.name}</H3>\n    <DL><p>\n`;
      for (const cat of profile.categories) {
        html += `        <DT><H3>${cat.name}</H3>\n        <DL><p>\n`;
        for (const sec of cat.sections) {
          if (sec.name) {
            html += `            <DT><H3>${sec.name}</H3>\n            <DL><p>\n`;
            for (const bk of sec.bookmarks) {
              html += `                <DT><A HREF="${bk.url}">${bk.name}</A>\n`;
            }
            html += '            </DL><p>\n';
          } else {
            for (const bk of sec.bookmarks) {
              html += `            <DT><A HREF="${bk.url}">${bk.name}</A>\n`;
            }
          }
        }
        html += '        </DL><p>\n';
      }
      html += '    </DL><p>\n';
    }
    html += '</DL><p>\n';
    this.downloadFile(html, 'bookmarks.html', 'text/html');
  }

  private downloadFile(content: string, filename: string, type: string): void {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  importData(content: string): void {
    try {
      let parsed: BookmarkData;
      if (this.parser.isHtml(content)) {
        // Parser returns flat shape; migrate into profiles.
        parsed = this.migrateFlat(this.parser.parseHtml(content));
      } else {
        const raw = JSON.parse(content);
        if (this.isFlat(raw)) {
          parsed = this.migrateFlat(raw);
        } else if (raw.profiles && Array.isArray(raw.profiles)) {
          parsed = raw;
        } else {
          throw new Error('Invalid format');
        }
      }
      this.data.set(parsed);
      this.persist();
    } catch (e) {
      console.error('Import failed:', e);
    }
  }

  // ─── Search helpers ───

  /**
   * Flatten bookmarks for search. If `profileId` is given, only that profile's
   * bookmarks are returned; otherwise all profiles. Each item carries its profile.
   */
  getAllBookmarks(profileId?: string): { name: string; url: string; category: string; icon: string; profile: string; profileId: string }[] {
    const d = this.data();
    if (!d) return [];
    const results: { name: string; url: string; category: string; icon: string; profile: string; profileId: string }[] = [];
    for (const profile of d.profiles) {
      if (profileId && profile.id !== profileId) continue;
      for (const cat of profile.categories) {
        for (const sec of cat.sections) {
          for (const bk of sec.bookmarks) {
            results.push({
              name: bk.name,
              url: bk.url,
              category: cat.name,
              icon: bk.customIcon || '',
              profile: profile.name,
              profileId: profile.id,
            });
          }
        }
      }
    }
    return results;
  }

  // ─── Private ───

  private mutate(fn: (data: BookmarkData) => void): void {
    const d = this.data();
    if (!d) return;
    const clone = structuredClone(d);
    fn(clone);
    clone.lastModified = new Date().toISOString();
    this.data.set(clone);
    this.persist();
  }

  private persist(): void {
    const d = this.data();
    if (!d) return;
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(d));
    this.syncToFile(d);
  }

  private async syncToFile(data: BookmarkData): Promise<void> {
    const res = await fetch('/api/bookmarks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).catch((e: unknown) => {
      console.error('[Bookmark] disk sync FAILED (network):', e);
      return null;
    });
    if (!res || !res.ok) {
      const status = res?.status ?? 'network error';
      console.error('[Bookmark] disk sync FAILED. status:', status);
      alert('⚠️ Bookmarks NOT saved to disk! Status: ' + status + '\n(localStorage still saved — refresh keeps your edit, but next ng build may overwrite.)');
    }
  }

  /** Flat list of every category across all profiles (for move pickers etc.). */
  allCategories(): BookmarkCategory[] {
    const d = this.data();
    if (!d) return [];
    return d.profiles.flatMap(p => p.categories);
  }

  profileIdOfCategory(catId: string): string | null {
    const d = this.data();
    if (!d) return null;
    return this.findProfileOfCategory(d, catId)?.id ?? null;
  }

  private findProfileOfCategory(d: BookmarkData, catId: string): BookmarkProfile | null {
    for (const p of d.profiles) {
      if (p.categories.some(c => c.id === catId)) return p;
    }
    return null;
  }

  private findCategory(d: BookmarkData, catId: string): BookmarkCategory | null {
    for (const p of d.profiles) {
      const cat = p.categories.find(c => c.id === catId);
      if (cat) return cat;
    }
    return null;
  }

  private findSection(d: BookmarkData, catId: string, sectionId: string): BookmarkSection | null {
    const cat = this.findCategory(d, catId);
    if (!cat) return null;
    return cat.sections.find(s => s.id === sectionId) || null;
  }

  uid(): string {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }
}
