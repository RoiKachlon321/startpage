import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class FaviconService {
  getUrl(bookmarkUrl: string, customIcon: string | null): string {
    if (customIcon) return customIcon;
    try {
      const normalized = bookmarkUrl.includes('://') ? bookmarkUrl : `https://${bookmarkUrl}`;
      const domain = new URL(normalized).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    } catch {
      return '';
    }
  }

  getFirstLetter(name: string): string {
    return (name[0] || '?').toUpperCase();
  }
}
