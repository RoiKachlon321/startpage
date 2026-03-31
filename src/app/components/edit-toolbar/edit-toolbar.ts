import { Component, ElementRef, inject, viewChild } from '@angular/core';
import { BookmarkService } from '../../services/bookmark';

@Component({
  selector: 'app-edit-toolbar',
  imports: [],
  templateUrl: './edit-toolbar.html',
  styleUrl: './edit-toolbar.scss',
})
export class EditToolbar {
  protected readonly bookmarkService = inject(BookmarkService);
  private readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  addCategory(): void {
    this.bookmarkService.categoryModal.set({ category: null });
  }

  exportJson(): void {
    this.bookmarkService.exportJson();
  }

  exportHtml(): void {
    this.bookmarkService.exportHtml();
  }

  triggerImport(): void {
    this.fileInput()?.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      this.bookmarkService.importData(reader.result as string);
    };
    reader.readAsText(file);
    input.value = '';
  }

  done(): void {
    this.bookmarkService.toggleEditMode();
  }
}
