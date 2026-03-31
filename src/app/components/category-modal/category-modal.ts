import { Component, computed, inject, signal, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BookmarkService } from '../../services/bookmark';
import { CARD_COLORS, CardColor, COLOR_HEX } from '../../models/bookmark.model';

@Component({
  selector: 'app-category-modal',
  imports: [FormsModule],
  templateUrl: './category-modal.html',
  styleUrl: './category-modal.scss',
})
export class CategoryModal {
  protected readonly bookmarkService = inject(BookmarkService);
  protected readonly colors = CARD_COLORS;
  protected readonly colorHex = COLOR_HEX;

  readonly name = signal('');
  readonly selectedColor = signal<CardColor>('blue');

  readonly isEditing = computed(() => !!this.bookmarkService.categoryModal()?.category);
  readonly title = computed(() => this.isEditing() ? 'Edit Category' : 'Add Category');
  readonly visible = computed(() => !!this.bookmarkService.categoryModal());

  constructor() {
    effect(() => {
      const state = this.bookmarkService.categoryModal();
      if (!state) return;
      if (state.category) {
        this.name.set(state.category.name);
        this.selectedColor.set(state.category.color);
      } else {
        this.name.set('');
        this.selectedColor.set('blue');
      }
    });
  }

  selectColor(color: CardColor): void {
    this.selectedColor.set(color);
  }

  save(): void {
    const state = this.bookmarkService.categoryModal();
    if (!state) return;

    const n = this.name().trim();
    if (!n) return;

    if (state.category) {
      this.bookmarkService.updateCategory(state.category.id, {
        name: n,
        color: this.selectedColor(),
      });
    } else {
      this.bookmarkService.addCategory(n, this.selectedColor());
    }
    this.close();
  }

  close(): void {
    this.bookmarkService.categoryModal.set(null);
  }

  onOverlayClick(event: Event): void {
    if (event.target === event.currentTarget) this.close();
  }
}
