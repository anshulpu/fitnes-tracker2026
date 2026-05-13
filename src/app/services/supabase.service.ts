import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  readonly client: SupabaseClient = createClient(
    environment.supabaseUrl,
    environment.supabaseAnonKey,
    {
      auth: {
        // Disable navigator.locks — fixes "LockManager lock immediately failed"
        // error in Ionic/Capacitor and older browser environments
        lock: undefined,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'fittrack-auth-token',
        storage: {
          getItem: (key: string) => {
            try { return Promise.resolve(localStorage.getItem(key)); }
            catch { return Promise.resolve(null); }
          },
          setItem: (key: string, value: string) => {
            try { localStorage.setItem(key, value); }
            catch { /* ignore */ }
            return Promise.resolve();
          },
          removeItem: (key: string) => {
            try { localStorage.removeItem(key); }
            catch { /* ignore */ }
            return Promise.resolve();
          }
        }
      }
    }
  );
}
