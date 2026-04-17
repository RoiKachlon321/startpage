import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class FaviconService {
  getUrl(bookmarkUrl: string, customIcon: string | null): string {
    if (customIcon) return customIcon;
    try {
      const normalized = bookmarkUrl.includes('://') ? bookmarkUrl : `https://${bookmarkUrl}`;
      const domain = new URL(normalized).hostname;
      return `/api/favicon?domain=${domain}`;
    } catch {
      return '';
    }
  }

  getFirstLetter(name: string): string {
    return (name[0] || '?').toUpperCase();
  }
}
