import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { BookmarkService } from '../../services/bookmark';
import { FaviconService } from '../../services/favicon';

interface SearchItem {
  name: string;
  url: string;
  category: string;
  icon: string;
}

@Component({
  selector: 'app-search-overlay',
  imports: [],
  templateUrl: './search-overlay.html',
  styleUrl: './search-overlay.scss',
})
export class SearchOverlay {
  private readonly bookmarkService = inject(BookmarkService);
  protected readonly faviconService = inject(FaviconService);

  readonly active = signal(false);
  readonly query = signal('');
  readonly selectedIndex = signal(0);
  readonly filteredItems = signal<SearchItem[]>([]);

  private allItems: SearchItem[] = [];
  private readonly inputRef = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  open(): void {
    this.allItems = this.bookmarkService.getAllBookmarks();
    this.active.set(true);
    this.query.set('');
    this.selectedIndex.set(0);
    this.filteredItems.set(this.allItems);
    setTimeout(() => this.inputRef()?.nativeElement.focus(), 0);
  }

  close(): void {
    this.active.set(false);
  }

  onInput(value: string): void {
    this.query.set(value);
    this.selectedIndex.set(0);
    const q = value.toLowerCase();
    if (!q) {
      this.filteredItems.set(this.allItems);
      return;
    }
    this.filteredItems.set(
      this.allItems.filter(i => i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q))
    );
  }

  onKeydown(event: KeyboardEvent): void {
    const items = this.filteredItems();
    const q = this.query().trim();
    const extraRows = q.length > 0 ? 2 : 0;
    const maxIdx = items.length + extraRows - 1;

    if (event.key === 'ArrowDown' || (event.key === 'Tab' && !event.shiftKey)) {
      event.preventDefault();
      this.selectedIndex.update(i => Math.min(i + 1, maxIdx));
    } else if (event.key === 'ArrowUp' || (event.key === 'Tab' && event.shiftKey)) {
      event.preventDefault();
      this.selectedIndex.update(i => Math.max(i - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      this.submit();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
    }
  }

  submit(): void {
    const items = this.filteredItems();
    const q = this.query().trim();
    const idx = this.selectedIndex();

    if (q.toLowerCase().startsWith('ai ')) {
      const aiQuery = q.slice(3).trim();
      if (aiQuery) {
        window.location.href = `https://chatgpt.com/?q=${encodeURIComponent(aiQuery)}`;
        return;
      }
    }

    if (idx === items.length && q) {
      window.location.href = `https://www.google.com/search?q=${encodeURIComponent(q)}`;
    } else if (idx === items.length + 1 && q) {
      window.location.href = `https://chatgpt.com/?q=${encodeURIComponent(q)}`;
    } else if (items[idx]) {
      window.location.href = items[idx].url;
    } else if (q) {
      window.location.href = `https://www.google.com/search?q=${encodeURIComponent(q)}`;
    }
  }

  clickResult(url: string): void {
    window.location.href = url;
  }

  onOverlayClick(event: Event): void {
    if (event.target === event.currentTarget) this.close();
  }

  onImgError(event: Event): void {
    (event.target as HTMLElement).style.display = 'none';
  }
}
