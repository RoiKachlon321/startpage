import { Component, inject, input } from '@angular/core';
import { BookmarkCategory } from '../../models/bookmark.model';
import { BookmarkService } from '../../services/bookmark';
import { FaviconService } from '../../services/favicon';

@Component({
  selector: 'app-card',
  imports: [],
  templateUrl: './card.html',
  styleUrl: './card.scss',
})
export class Card {
  readonly category = input.required<BookmarkCategory>();

  protected readonly bookmarkService = inject(BookmarkService);
  protected readonly faviconService = inject(FaviconService);

  onBookmarkClick(event: Event, url: string): void {
    if (this.bookmarkService.editMode()) {
      event.preventDefault();
    } else {
      window.location.href = url;
    }
  }

  editBookmark(event: Event, bookmarkId: string, sectionId: string): void {
    event.stopPropagation();
    event.preventDefault();
    const cat = this.category();
    const section = cat.sections.find(s => s.id === sectionId);
    const bookmark = section?.bookmarks.find(b => b.id === bookmarkId) || null;
    this.bookmarkService.bookmarkModal.set({ catId: cat.id, sectionId, bookmark });
  }

  deleteBookmark(event: Event, bookmarkId: string): void {
    event.stopPropagation();
    event.preventDefault();
    if (confirm('Delete this bookmark?')) {
      this.bookmarkService.deleteBookmark(this.category().id, bookmarkId);
    }
  }

  addBookmark(sectionId: string): void {
    this.bookmarkService.bookmarkModal.set({
      catId: this.category().id,
      sectionId,
      bookmark: null,
    });
  }

  editCategory(): void {
    this.bookmarkService.categoryModal.set({ category: this.category() });
  }

  deleteCategory(): void {
    if (confirm(`Delete "${this.category().name}" and all its bookmarks?`)) {
      this.bookmarkService.deleteCategory(this.category().id);
    }
  }

  addSection(): void {
    const name = prompt('Section name:');
    if (name?.trim()) {
      this.bookmarkService.addSection(this.category().id, name.trim());
    }
  }

  renameSection(event: Event, sectionId: string, currentName: string | null): void {
    event.stopPropagation();
    const name = prompt('Section name:', currentName || '');
    if (name?.trim()) {
      this.bookmarkService.renameSection(this.category().id, sectionId, name.trim());
    }
  }

  deleteSection(event: Event, sectionId: string): void {
    event.stopPropagation();
    if (confirm('Delete this section and its bookmarks?')) {
      this.bookmarkService.deleteSection(this.category().id, sectionId);
    }
  }

  onImgError(event: Event): void {
    (event.target as HTMLElement).style.display = 'none';
  }
}
