import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class FaviconService {
  getUrl(bookmarkUrl: string, customIcon: string | null): string {
    if (customIcon) {
      const isImage = /\.(png|jpe?g|svg|webp|ico|gif)(\?|$)/i.test(customIcon);
      if (isImage) return customIcon;
      try {
        const normalized = customIcon.includes('://') ? customIcon : `https://${customIcon}`;
        const domain = new URL(normalized).hostname;
        return `/api/favicon?domain=${domain}`;
      } catch {
        return customIcon;
      }
    }
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
