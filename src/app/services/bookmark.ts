import { Injectable, signal } from '@angular/core';
import {
  BookmarkCategory,
  BookmarkData,
  BookmarkItem,
  BookmarkModalState,
  BookmarkSection,
  CardColor,
  CategoryModalState,
} from '../models/bookmark.model';

@Injectable({ providedIn: 'root' })
export class BookmarkService {
  private readonly STORAGE_KEY = 'startpage-data';

  readonly data = signal<BookmarkData | null>(null);
  readonly editMode = signal(false);
  readonly bookmarkModal = signal<BookmarkModalState | null>(null);
  readonly categoryModal = signal<CategoryModalState | null>(null);

  async init(): Promise<void> {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      this.data.set(JSON.parse(stored));
      return;
    }
    try {
      const res = await fetch('./bookmarks.json');
      const seed: BookmarkData = await res.json();
      this.data.set(seed);
      this.persist();
    } catch {
      this.data.set({ version: 1, lastModified: new Date().toISOString(), categories: [] });
    }
  }

  toggleEditMode(): void {
    this.editMode.update(v => !v);
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
      for (const cat of d.categories) {
        if (cat.id !== catId) continue;
        for (const sec of cat.sections) {
          const bk = sec.bookmarks.find(b => b.id === bookmarkId);
          if (bk) {
            Object.assign(bk, updates);
            return;
          }
        }
      }
    });
  }

  deleteBookmark(catId: string, bookmarkId: string): void {
    this.mutate(d => {
      const cat = d.categories.find(c => c.id === catId);
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

  // ─── Category CRUD ───

  addCategory(name: string, color: CardColor): void {
    this.mutate(d => {
      d.categories.push({
        id: this.uid(),
        name,
        color,
        sections: [{ id: this.uid(), name: null, bookmarks: [] }],
      });
    });
  }

  updateCategory(catId: string, updates: { name?: string; color?: CardColor }): void {
    this.mutate(d => {
      const cat = d.categories.find(c => c.id === catId);
      if (!cat) return;
      if (updates.name !== undefined) cat.name = updates.name;
      if (updates.color !== undefined) cat.color = updates.color;
    });
  }

  deleteCategory(catId: string): void {
    this.mutate(d => {
      d.categories = d.categories.filter(c => c.id !== catId);
    });
  }

  // ─── Section CRUD ───

  addSection(catId: string, name: string): void {
    this.mutate(d => {
      const cat = d.categories.find(c => c.id === catId);
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
      const cat = d.categories.find(c => c.id === catId);
      if (!cat) return;
      cat.sections = cat.sections.filter(s => s.id !== sectionId);
      if (cat.sections.length === 0) {
        cat.sections.push({ id: this.uid(), name: null, bookmarks: [] });
      }
    });
  }

  // ─── Export / Import ───

  exportData(): void {
    const d = this.data();
    if (!d) return;
    const blob = new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bookmarks.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  importData(json: string): void {
    try {
      const parsed: BookmarkData = JSON.parse(json);
      if (!parsed.categories || !Array.isArray(parsed.categories)) {
        throw new Error('Invalid format');
      }
      this.data.set(parsed);
      this.persist();
    } catch (e) {
      console.error('Import failed:', e);
    }
  }

  // ─── Search helpers ───

  getAllBookmarks(): { name: string; url: string; category: string; icon: string }[] {
    const d = this.data();
    if (!d) return [];
    const results: { name: string; url: string; category: string; icon: string }[] = [];
    for (const cat of d.categories) {
      for (const sec of cat.sections) {
        for (const bk of sec.bookmarks) {
          results.push({ name: bk.name, url: bk.url, category: cat.name, icon: bk.customIcon || '' });
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
    try {
      await fetch('/api/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    } catch {
      // Server not available (e.g. ng serve dev mode) — localStorage is still saved
    }
  }

  private findSection(d: BookmarkData, catId: string, sectionId: string): BookmarkSection | null {
    const cat = d.categories.find(c => c.id === catId);
    if (!cat) return null;
    return cat.sections.find(s => s.id === sectionId) || null;
  }

  uid(): string {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }
}
