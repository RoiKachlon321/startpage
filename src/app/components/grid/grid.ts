import { AfterViewInit, Component, ElementRef, OnDestroy, effect, inject, input } from '@angular/core';
import { BookmarkCategory } from '../../models/bookmark.model';
import { Card } from '../card/card';

// grid - masonry layout that lets a card span N columns yet still packs tight (no row gaps).
@Component({
  selector: 'app-grid',
  imports: [Card],
  templateUrl: './grid.html',
  styleUrl: './grid.scss',
})
export class Grid implements AfterViewInit, OnDestroy {
  readonly categories = input.required<BookmarkCategory[]>();

  private readonly host = inject(ElementRef<HTMLElement>);
  private ro?: ResizeObserver;
  private raf = 0;

  constructor() {
    // Re-layout whenever the category list changes.
    effect(() => {
      this.categories();
      this.schedule();
    });
  }

  ngAfterViewInit(): void {
    this.ro = new ResizeObserver(() => this.schedule());
    this.ro.observe(this.grid());
    this.schedule();
  }

  ngOnDestroy(): void {
    this.ro?.disconnect();
    cancelAnimationFrame(this.raf);
  }

  private grid(): HTMLElement {
    return this.host.nativeElement.querySelector('.grid') as HTMLElement;
  }

  private schedule(): void {
    cancelAnimationFrame(this.raf);
    // Two frames: let Angular paint the cards, then measure real heights.
    this.raf = requestAnimationFrame(() => {
      this.raf = requestAnimationFrame(() => this.layout());
    });
  }

  /** Place each card into the columns whose combined bottom is lowest across its span. */
  private layout(): void {
    const grid = this.grid();
    if (!grid) return;
    const cards = Array.from(grid.querySelectorAll<HTMLElement>('app-card'));
    if (!cards.length) return;

    const cols = this.colCount(grid.clientWidth);
    const gap = 8;
    const colWidth = (grid.clientWidth - gap * (cols - 1)) / cols;
    const bottoms = new Array(cols).fill(0); // running bottom Y of each column

    for (const card of cards) {
      const span = Math.min(this.cardSpan(card), cols);
      // Find the start column (0..cols-span) where the tallest bottom in the span is smallest.
      let bestStart = 0;
      let bestY = Infinity;
      for (let start = 0; start <= cols - span; start++) {
        let y = 0;
        for (let c = start; c < start + span; c++) y = Math.max(y, bottoms[c]);
        if (y < bestY) { bestY = y; bestStart = start; }
      }
      const x = bestStart * (colWidth + gap);
      card.style.position = 'absolute';
      card.style.top = `${bestY}px`;
      card.style.left = `${x}px`;
      card.style.width = `${colWidth * span + gap * (span - 1)}px`;
      // Push all spanned columns down to this card's new bottom.
      const newBottom = bestY + card.offsetHeight + gap;
      for (let c = bestStart; c < bestStart + span; c++) bottoms[c] = newBottom;
    }

    grid.style.position = 'relative';
    grid.style.height = `${Math.max(...bottoms)}px`;
  }

  private cardSpan(card: HTMLElement): number {
    const n = parseInt(card.style.getPropertyValue('--cols') || '1', 10);
    return Number.isFinite(n) && n > 0 ? n : 1;
  }

  private colCount(width: number): number {
    if (width <= 480) return 1;
    if (width <= 768) return 2;
    if (width <= 1200) return 3;
    return 5;
  }
}
