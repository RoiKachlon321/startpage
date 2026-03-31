import { Component, computed, inject } from '@angular/core';
import { BookmarkService } from '../../services/bookmark';
import { Card } from '../card/card';

@Component({
  selector: 'app-grid',
  imports: [Card],
  templateUrl: './grid.html',
  styleUrl: './grid.scss',
})
export class Grid {
  protected readonly bookmarkService = inject(BookmarkService);

  readonly categories = computed(() => {
    const d = this.bookmarkService.data();
    return d?.categories || [];
  });
}
