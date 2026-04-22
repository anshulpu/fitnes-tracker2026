import { Injectable, signal } from '@angular/core';
import { StorageService } from './storage.service';

export interface AccountabilitySettings {
  enabled: boolean;
  friendName: string;
  friendContact?: string;
  penaltyMessage?: string;
}

export interface SkipEvent {
  date: string; // YYYY-MM-DD
  reason: string;
  notifiedFriend: string;
  penaltyApplied: string;
}

@Injectable({ providedIn: 'root' })
export class AccountabilityService {
  settings = signal<AccountabilitySettings>({
    enabled: false,
    friendName: 'Accountability Buddy',
    friendContact: undefined,
    penaltyMessage: 'If I skip my workout, you get notified – hold me to it!'
  });

  skipHistory = signal<SkipEvent[]>([]);

  private readonly SETTINGS_KEY = 'accountability_settings';
  private readonly HISTORY_KEY = 'accountability_skips';

  constructor(private storage: StorageService) {
    this.load();
  }

  private async load() {
    const storedSettings = await this.storage.get<AccountabilitySettings>(this.SETTINGS_KEY);
    const storedHistory = await this.storage.get<SkipEvent[]>(this.HISTORY_KEY);

    if (storedSettings) {
      this.settings.set({
        enabled: storedSettings.enabled ?? false,
        friendName: storedSettings.friendName || 'Accountability Buddy',
        friendContact: storedSettings.friendContact,
        penaltyMessage:
          storedSettings.penaltyMessage ||
          'If I skip my workout, you get notified – hold me to it!'
      });
    }

    if (storedHistory) {
      this.skipHistory.set(storedHistory);
    }
  }

  async updateSettings(partial: Partial<AccountabilitySettings>) {
    const merged = { ...this.settings(), ...partial };
    this.settings.set(merged);
    await this.storage.set(this.SETTINGS_KEY, merged);
  }

  async recordSkip(reason: string): Promise<SkipEvent | null> {
    const currentSettings = this.settings();
    if (!currentSettings.enabled) {
      return null;
    }

    const today = new Date().toISOString().split('T')[0];
    const event: SkipEvent = {
      date: today,
      reason,
      notifiedFriend: currentSettings.friendName || 'Accountability Buddy',
      penaltyApplied:
        currentSettings.penaltyMessage ||
        'Friend was notified that you skipped your workout today.'
    };

    const history = this.skipHistory();
    const updatedHistory = [event, ...history];
    this.skipHistory.set(updatedHistory);
    await this.storage.set(this.HISTORY_KEY, updatedHistory);

    // Placeholder for real notification hook (push/email/backend API)
    // In a real app, call your backend here.
    console.log('Accountability penalty event:', event);

    return event;
  }

  getLastSkip(): SkipEvent | null {
    const history = this.skipHistory();
    return history.length > 0 ? history[0] : null;
  }
}
