import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BookmarkService } from '../../services/bookmark';
import { FaviconService } from '../../services/favicon';

@Component({
  selector: 'app-bookmark-modal',
  imports: [FormsModule],
  templateUrl: './bookmark-modal.html',
  styleUrl: './bookmark-modal.scss',
})
export class BookmarkModal {
  protected readonly bookmarkService = inject(BookmarkService);
  protected readonly faviconService = inject(FaviconService);

  readonly name = signal('');
  readonly url = signal('');
  readonly customIcon = signal('');

  readonly isEditing = computed(() => !!this.bookmarkService.bookmarkModal()?.bookmark);
  readonly title = computed(() => this.isEditing() ? 'Edit Bookmark' : 'Add Bookmark');

  readonly previewIcon = computed(() => {
    const custom = this.customIcon();
    if (custom) return custom;
    const u = this.url();
    if (!u) return '';
    return this.faviconService.getUrl(u, null);
  });

  readonly visible = computed(() => !!this.bookmarkService.bookmarkModal());

  constructor() {
    effect(() => {
      const state = this.bookmarkService.bookmarkModal();
      if (!state) return;
      if (state.bookmark) {
        this.name.set(state.bookmark.name);
        this.url.set(state.bookmark.url);
        this.customIcon.set(state.bookmark.customIcon || '');
      } else {
        this.name.set('');
        this.url.set('');
        this.customIcon.set('');
      }
    });
  }

  save(): void {
    const state = this.bookmarkService.bookmarkModal();
    if (!state) return;

    const n = this.name().trim();
    let u = this.url().trim();
    if (!n || !u) return;
    if (!u.includes('://')) u = 'https://' + u;

    const icon = this.customIcon().trim() || null;

    if (state.bookmark) {
      this.bookmarkService.updateBookmark(state.catId, state.bookmark.id, {
        name: n,
        url: u,
        customIcon: icon,
      });
    } else {
      this.bookmarkService.addBookmark(state.catId, state.sectionId, {
        name: n,
        url: u,
        customIcon: icon,
      });
    }
    this.close();
  }

  close(): void {
    this.bookmarkService.bookmarkModal.set(null);
  }

  onOverlayClick(event: Event): void {
    if (event.target === event.currentTarget) this.close();
  }

  onImgError(event: Event): void {
    (event.target as HTMLElement).style.display = 'none';
  }
}
