import { Component, computed, inject } from '@angular/core';
import { BookmarkService } from '../../services/bookmark';

@Component({
  selector: 'app-move-modal',
  imports: [],
  templateUrl: './move-modal.html',
  styleUrl: './move-modal.scss',
})
export class MoveModal {
  protected readonly bookmarkService = inject(BookmarkService);

  readonly visible = computed(() => !!this.bookmarkService.moveModalState());

  readonly categories = computed(() => {
    const state = this.bookmarkService.moveModalState();
    if (!state) return [];
    return (this.bookmarkService.data()?.categories || [])
      .filter(c => c.id !== state.fromCatId);
  });

  readonly isBookmarkMove = computed(() => !!this.bookmarkService.moveModalState()?.bookmarkId);

  moveTo(toCatId: string, toSectionId?: string): void {
    const state = this.bookmarkService.moveModalState();
    if (!state) return;
    if (state.sectionId) {
      this.bookmarkService.moveSection(state.fromCatId, state.sectionId, toCatId);
    } else if (state.bookmarkId) {
      this.bookmarkService.moveBookmark(state.fromCatId, state.bookmarkId, toCatId, toSectionId);
    }
    this.close();
  }

  close(): void {
    this.bookmarkService.moveModalState.set(null);
  }

  onOverlayClick(event: Event): void {
    if (event.target === event.currentTarget) this.close();
  }
}
