import { Injectable, signal } from '@angular/core';
import { StorageService } from './storage.service';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  isDarkMode = signal<boolean>(false);

  constructor(private storage: StorageService) {
    this.initTheme();
  }

  private async initTheme() {
    const darkMode = await this.storage.get<boolean>('dark_mode');
    if (darkMode !== null) {
      this.isDarkMode.set(darkMode);
      this.applyTheme(darkMode);
    } else {
      // Check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.isDarkMode.set(prefersDark);
      this.applyTheme(prefersDark);
    }
  }

  async toggleDarkMode() {
    const newValue = !this.isDarkMode();
    this.isDarkMode.set(newValue);
    this.applyTheme(newValue);
    await this.storage.set('dark_mode', newValue);
  }

  private applyTheme(isDark: boolean) {
    document.body.classList.toggle('dark', isDark);
  }
}
