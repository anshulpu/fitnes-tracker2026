import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import * as CryptoJS from 'crypto-js';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private prefix = 'fittrack_';
  // NOTE: For a real production app, move this key to a secure native keystore.
  private encryptionKey = 'fittrack_local_dev_key';

  async set(key: string, value: any, options?: { secure?: boolean }): Promise<void> {
    try {
      const jsonValue = JSON.stringify(value);
      if (options?.secure) {
        const encrypted = CryptoJS.AES.encrypt(jsonValue, this.encryptionKey).toString();
        await Preferences.set({ key: this.prefix + key, value: encrypted });
      } else {
        localStorage.setItem(this.prefix + key, jsonValue);
      }
    } catch (error) {
      console.error('Error saving to storage', error);
      throw error;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      // Try secure storage first
      const secureResult = await Preferences.get({ key: this.prefix + key });
      if (secureResult.value) {
        try {
          const decrypted = CryptoJS.AES.decrypt(secureResult.value, this.encryptionKey).toString(CryptoJS.enc.Utf8);
          return decrypted ? JSON.parse(decrypted) : null;
        } catch (e) {
          console.warn('Failed to decrypt secure storage, falling back to plain storage');
        }
      }

      const value = localStorage.getItem(this.prefix + key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Error getting from storage', error);
      return null;
    }
  }

  async remove(key: string): Promise<void> {
    try {
      await Preferences.remove({ key: this.prefix + key });
      localStorage.removeItem(this.prefix + key);
    } catch (error) {
      console.error('Error removing from storage', error);
    }
  }

  async clear(): Promise<void> {
    try {
      // Clear secure preferences with this prefix
      const allKeys = Object.keys(localStorage);
      await Preferences.clear();

      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.prefix)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('Error clearing storage', error);
    }
  }
}
