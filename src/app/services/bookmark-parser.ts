import { Injectable } from '@angular/core';
import { BookmarkCategory, BookmarkData, BookmarkItem, BookmarkSection, CardColor } from '../models/bookmark.model';

const COLORS: CardColor[] = ['blue', 'green', 'cyan', 'purple', 'orange', 'pink', 'teal', 'red'];

@Injectable({ providedIn: 'root' })
export class BookmarkParser {
  private colorIndex = 0;

  isHtml(content: string): boolean {
    return content.trimStart().startsWith('<!DOCTYPE NETSCAPE-Bookmark-file-1') ||
           content.trimStart().startsWith('<!DOCTYPE netscape-bookmark-file-1') ||
           (content.includes('<DL>') && content.includes('<DT>'));
  }

  parseHtml(html: string): BookmarkData {
    this.colorIndex = 0;
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const rootDl = doc.querySelector('DL');
    if (!rootDl) {
      return { lastModified: new Date().toISOString(), categories: [] };
    }

    const categories: BookmarkCategory[] = [];
    this.parseDl(rootDl, categories);

    return { lastModified: new Date().toISOString(), categories };
  }

  private parseDl(dl: Element, categories: BookmarkCategory[]): void {
    const children = Array.from(dl.children);

    for (let i = 0; i < children.length; i++) {
      const dt = children[i];
      if (dt.tagName !== 'DT') continue;

      const folder = dt.querySelector(':scope > H3');
      const link = dt.querySelector(':scope > A');

      if (folder) {
        const nestedDl = dt.querySelector(':scope > DL') || children[i + 1];
        if (nestedDl?.tagName === 'DL') {
          const category = this.parseFolder(folder.textContent?.trim() || 'Untitled', nestedDl);
          categories.push(category);
        }
      } else if (link) {
        let unsorted = categories.find(c => c.name === 'Unsorted');
        if (!unsorted) {
          unsorted = this.createCategory('Unsorted');
          categories.push(unsorted);
        }
        unsorted.sections[0].bookmarks.push(this.parseLink(link));
      }
    }
  }

  private parseFolder(name: string, dl: Element): BookmarkCategory {
    const category = this.createCategory(name);
    const defaultSection = category.sections[0];
    const children = Array.from(dl.children);

    for (let i = 0; i < children.length; i++) {
      const dt = children[i];
      if (dt.tagName !== 'DT') continue;

      const subfolder = dt.querySelector(':scope > H3');
      const link = dt.querySelector(':scope > A');

      if (subfolder) {
        const nestedDl = dt.querySelector(':scope > DL') || children[i + 1];
        if (nestedDl?.tagName === 'DL') {
          const section = this.parseSubfolder(subfolder.textContent?.trim() || 'Untitled', nestedDl);
          category.sections.push(section);
        }
      } else if (link) {
        defaultSection.bookmarks.push(this.parseLink(link));
      }
    }

    return category;
  }

  private parseSubfolder(name: string, dl: Element): BookmarkSection {
    const section: BookmarkSection = {
      id: this.uid(),
      name,
      bookmarks: [],
    };

    for (const dt of Array.from(dl.querySelectorAll(':scope > DT'))) {
      const link = dt.querySelector(':scope > A');
      if (link) {
        section.bookmarks.push(this.parseLink(link));
      }
    }

    return section;
  }

  private parseLink(a: Element): BookmarkItem {
    return {
      id: this.uid(),
      name: a.textContent?.trim() || 'Untitled',
      url: a.getAttribute('HREF') || a.getAttribute('href') || '',
      customIcon: null,
    };
  }

  private createCategory(name: string): BookmarkCategory {
    const color = COLORS[this.colorIndex % COLORS.length];
    this.colorIndex++;
    return {
      id: this.uid(),
      name,
      color,
      sections: [{ id: this.uid(), name: null, bookmarks: [] }],
    };
  }

  private uid(): string {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }
}
