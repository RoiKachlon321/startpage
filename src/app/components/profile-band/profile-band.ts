import { Component, inject, input } from '@angular/core';
import { BookmarkProfile } from '../../models/bookmark.model';
import { BookmarkService } from '../../services/bookmark';
import { Grid } from '../grid/grid';

@Component({
  selector: 'app-profile-band',
  imports: [Grid],
  templateUrl: './profile-band.html',
  styleUrl: './profile-band.scss',
})
export class ProfileBand {
  readonly profile = input.required<BookmarkProfile>();

  protected readonly bookmarkService = inject(BookmarkService);

  rename(): void {
    const p = this.profile();
    const name = prompt('Profile name:', p.name);
    if (name?.trim()) this.bookmarkService.renameProfile(p.id, name.trim());
  }

  moveUp(): void {
    this.bookmarkService.moveProfileUp(this.profile().id);
  }

  moveDown(): void {
    this.bookmarkService.moveProfileDown(this.profile().id);
  }

  remove(): void {
    const p = this.profile();
    if (confirm(`Delete profile "${p.name}" and all its categories?`)) {
      this.bookmarkService.deleteProfile(p.id);
    }
  }

  addCategory(): void {
    const name = prompt('Category name:');
    if (name?.trim()) this.bookmarkService.addCategory(name.trim(), 'blue', this.profile().id);
  }

  setJumpKey(): void {
    const p = this.profile();
    const key = prompt(`Jump key for "${p.name}" (single letter, blank to clear):`, p.jumpKey ?? '');
    if (key === null) return;
    const err = this.bookmarkService.setProfileJumpKey(p.id, key);
    if (err) alert(err);
  }
}
