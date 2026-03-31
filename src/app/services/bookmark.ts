import { Injectable, inject, signal } from '@angular/core';
import {
  BookmarkCategory,
  BookmarkData,
  BookmarkItem,
  BookmarkModalState,
  BookmarkSection,
  CardColor,
  CategoryModalState,
} from '../models/bookmark.model';
import { BookmarkParser } from './bookmark-parser';

@Injectable({ providedIn: 'root' })
export class BookmarkService {
  private readonly STORAGE_KEY = 'startpage-data';
  private readonly parser = inject(BookmarkParser);

  readonly data = signal<BookmarkData | null>(null);
  readonly editMode = signal(false);
  readonly bookmarkModal = signal<BookmarkModalState | null>(null);
  readonly categoryModal = signal<CategoryModalState | null>(null);
  readonly moveModalState = signal<{ fromCatId: string; bookmarkId?: string; sectionId?: string } | null>(null);

  async init(): Promise<void> {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    const local: BookmarkData | null = stored ? JSON.parse(stored) : null;

    try {
      const res = await fetch('./bookmarks.json');
      const file: BookmarkData = await res.json();

      if (!local || (file.lastModified && file.lastModified > (local.lastModified || ''))) {
        this.data.set(file);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(file));
        return;
      }
    } catch {
      // File not available (e.g. ng serve) — fall through to localStorage
    }

    if (local) {
      this.data.set(local);
    } else {
      this.data.set({ lastModified: new Date().toISOString(), categories: [] });
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

  moveBookmark(fromCatId: string, bookmarkId: string, toCatId: string): void {
    this.mutate(d => {
      let bookmark: BookmarkItem | null = null;
      const fromCat = d.categories.find(c => c.id === fromCatId);
      if (!fromCat) return;
      for (const sec of fromCat.sections) {
        const idx = sec.bookmarks.findIndex(b => b.id === bookmarkId);
        if (idx !== -1) {
          bookmark = sec.bookmarks.splice(idx, 1)[0];
          break;
        }
      }
      if (!bookmark) return;
      const toCat = d.categories.find(c => c.id === toCatId);
      if (!toCat) return;
      const defaultSection = toCat.sections[0];
      if (defaultSection) {
        defaultSection.bookmarks.push(bookmark);
      }
    });
  }

  moveSection(fromCatId: string, sectionId: string, toCatId: string): void {
    this.mutate(d => {
      const fromCat = d.categories.find(c => c.id === fromCatId);
      if (!fromCat) return;
      const idx = fromCat.sections.findIndex(s => s.id === sectionId);
      if (idx === -1) return;
      const section = fromCat.sections.splice(idx, 1)[0];
      if (fromCat.sections.length === 0) {
        fromCat.sections.push({ id: this.uid(), name: null, bookmarks: [] });
      }
      const toCat = d.categories.find(c => c.id === toCatId);
      if (!toCat) return;
      const sectionName = section.name || 'Bookmarks';
      section.name = `${fromCat.name} - ${sectionName}`;
      toCat.sections.push(section);
    });
  }

  moveCategoryUp(catId: string): void {
    this.mutate(d => {
      const idx = d.categories.findIndex(c => c.id === catId);
      if (idx <= 0) return;
      [d.categories[idx - 1], d.categories[idx]] = [d.categories[idx], d.categories[idx - 1]];
    });
  }

  moveCategoryDown(catId: string): void {
    this.mutate(d => {
      const idx = d.categories.findIndex(c => c.id === catId);
      if (idx === -1 || idx >= d.categories.length - 1) return;
      [d.categories[idx], d.categories[idx + 1]] = [d.categories[idx + 1], d.categories[idx]];
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
    for (const cat of d.categories) {
      html += `    <DT><H3>${cat.name}</H3>\n    <DL><p>\n`;
      for (const sec of cat.sections) {
        if (sec.name) {
          html += `        <DT><H3>${sec.name}</H3>\n        <DL><p>\n`;
          for (const bk of sec.bookmarks) {
            html += `            <DT><A HREF="${bk.url}">${bk.name}</A>\n`;
          }
          html += '        </DL><p>\n';
        } else {
          for (const bk of sec.bookmarks) {
            html += `        <DT><A HREF="${bk.url}">${bk.name}</A>\n`;
          }
        }
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
        parsed = this.parser.parseHtml(content);
      } else {
        parsed = JSON.parse(content);
        if (!parsed.categories || !Array.isArray(parsed.categories)) {
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
