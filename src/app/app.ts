import { Component, HostListener, inject, OnInit, viewChild } from '@angular/core';
import { BookmarkService } from './services/bookmark';
import { Grid } from './components/grid/grid';
import { SearchOverlay } from './components/search-overlay/search-overlay';
import { BookmarkModal } from './components/bookmark-modal/bookmark-modal';
import { CategoryModal } from './components/category-modal/category-modal';
import { EditToolbar } from './components/edit-toolbar/edit-toolbar';

@Component({
  selector: 'app-root',
  imports: [Grid, SearchOverlay, BookmarkModal, CategoryModal, EditToolbar],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  private readonly bookmarkService = inject(BookmarkService);
  private readonly searchOverlay = viewChild(SearchOverlay);

  private hintMode = false;
  private typed = '';
  private hints: { el: HTMLElement; key: string; hint: HTMLElement }[] = [];

  async ngOnInit(): Promise<void> {
    await this.bookmarkService.init();
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (event.metaKey || event.ctrlKey || event.altKey) return;

    const search = this.searchOverlay();
    if (search?.active()) {
      if (event.key === 'Escape') { search.close(); event.preventDefault(); }
      return;
    }

    if (this.bookmarkService.bookmarkModal() || this.bookmarkService.categoryModal()) return;

    if (this.hintMode) {
      this.handleHintKey(event);
      return;
    }

    const editing = this.bookmarkService.editMode();

    switch (event.key) {
      case 'f':
        if (!editing) { event.preventDefault(); this.showHints(); }
        break;
      case 's':
        if (!editing) { event.preventDefault(); search?.open(); }
        break;
      case 'e':
        event.preventDefault();
        this.bookmarkService.toggleEditMode();
        break;
      case 'j':
        if (!editing) window.scrollBy(0, 100);
        break;
      case 'k':
        if (!editing) window.scrollBy(0, -100);
        break;
      case 'd':
        if (!editing) window.scrollBy(0, window.innerHeight / 2);
        break;
      case 'u':
        if (!editing) window.scrollBy(0, -window.innerHeight / 2);
        break;
      case 'g':
        if (!editing) window.scrollTo(0, 0);
        break;
      case 'G':
        if (!editing) window.scrollTo(0, document.body.scrollHeight);
        break;
      case 'Escape':
        if (editing) this.bookmarkService.toggleEditMode();
        break;
    }
  }

  // ─── Hint System ───

  private readonly CHARS = 'asdfghjklqwertyuiopzxcvbnm';

  private showHints(): void {
    const links = document.querySelectorAll<HTMLAnchorElement>('app-card a[href]');
    const keys = this.generateKeys(links);
    this.hints = [];

    links.forEach((link, i) => {
      if (!keys[i]) return;
      const span = document.createElement('span');
      span.className = 'hint-badge';
      span.textContent = keys[i];
      link.appendChild(span);
      link.classList.add('has-hint');
      this.hints.push({ el: link, key: keys[i], hint: span });
    });

    this.hintMode = true;
    this.typed = '';
    this.updateHintStatus();
  }

  private clearHints(): void {
    document.querySelectorAll('.hint-badge').forEach(h => h.remove());
    document.querySelectorAll('.has-hint').forEach(a => a.classList.remove('has-hint', 'hint-match'));
    this.hints = [];
    this.hintMode = false;
    this.typed = '';
    const status = document.getElementById('hint-status');
    if (status) status.style.display = 'none';
  }

  private handleHintKey(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.clearHints();
      return;
    }
    if (event.key.length === 1 && this.CHARS.includes(event.key.toLowerCase())) {
      event.preventDefault();
      this.typed += event.key.toLowerCase();
      this.updateHintStatus();
      this.filterHints();
    }
  }

  private filterHints(): void {
    let matchCount = 0;
    this.hints.forEach(h => {
      if (h.key.startsWith(this.typed)) {
        h.hint.style.display = '';
        h.el.classList.add('hint-match');
        matchCount++;
      } else {
        h.hint.style.display = 'none';
        h.el.classList.remove('hint-match');
      }
    });

    const exact = this.hints.find(h => h.key === this.typed);
    if (exact) {
      const href = (exact.el as HTMLAnchorElement).href;
      this.clearHints();
      window.location.href = href;
      return;
    }
    if (matchCount === 0) this.clearHints();
  }

  private updateHintStatus(): void {
    const status = document.getElementById('hint-status');
    if (status) {
      status.style.display = 'block';
      status.textContent = 'HINT: ' + (this.typed || '_');
    }
  }

  private generateKeys(links: NodeListOf<HTMLAnchorElement>): string[] {
    const entries = Array.from(links).map(l => {
      const raw = (l.textContent || '').trim().toLowerCase();
      const clean = raw.replace(/[^a-z]/g, '');
      const words = raw.split(/\s+/).map(w => w.replace(/[^a-z]/g, '')).filter(w => w);
      return { clean, words };
    });
    const keys: string[] = [];
    const used = new Set<string>();

    for (const { clean, words } of entries) {
      if (!clean) {
        const fb = this.findFallback(used);
        if (fb) { keys.push(fb); used.add(fb); }
        continue;
      }
      const first2 = clean.slice(0, 2);
      if (first2.length === 2 && !used.has(first2)) {
        keys.push(first2); used.add(first2); continue;
      }
      if (words.length > 1 && words[0][0] && words[1][0]) {
        const initials = words[0][0] + words[1][0];
        if (!used.has(initials)) { keys.push(initials); used.add(initials); continue; }
      }
      let found = false;
      for (const c of this.CHARS) {
        const candidate = clean[0] + c;
        if (!used.has(candidate)) { keys.push(candidate); used.add(candidate); found = true; break; }
      }
      if (!found) {
        const fb = this.findFallback(used);
        if (fb) { keys.push(fb); used.add(fb); }
      }
    }
    return keys;
  }

  private findFallback(used: Set<string>): string | null {
    for (const a of this.CHARS) {
      for (const b of this.CHARS) {
        const key = a + b;
        if (!used.has(key)) return key;
      }
    }
    return null;
  }
}
