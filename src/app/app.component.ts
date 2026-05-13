import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { SupabaseService } from './services/supabase.service';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent implements OnInit {
  constructor(
    private supabase: SupabaseService,
    private authService: AuthService,
    private router: Router
  ) {}

  async ngOnInit() {
    // Listen for OAuth callback (SIGNED_IN event fires when Google redirects back)
    this.supabase.client.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        // Ensure profile row exists (Google OAuth new users may not have one yet)
        await this.ensureProfile(session.user);

        // Only navigate if currently on an auth page (avoid redirecting mid-session)
        const currentUrl = this.router.url;
        const isOnAuthPage = currentUrl === '/' ||
          currentUrl === '' ||
          currentUrl.startsWith('/#') ||
          currentUrl.includes('/auth/');

        if (isOnAuthPage) {
          // Wait for profile to be loaded into the signal
          await this.authService.waitForInit();
          const role = this.authService.getUserRole();
          if (role === 'admin') {
            this.router.navigate(['/admin/dashboard']);
          } else {
            this.router.navigate(['/member/dashboard']);
          }
        }
      }
    });
  }

  private async ensureProfile(user: any) {
    try {
      const { data: existing } = await this.supabase.client
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      if (!existing) {
        await this.supabase.client.from('profiles').upsert({
          id: user.id,
          email: user.email,
          name: user.user_metadata?.full_name ||
                user.user_metadata?.name ||
                user.email?.split('@')[0] || 'User',
          role: user.user_metadata?.role || 'member',
          daily_step_goal: 10000,
          daily_calorie_goal: 2000,
          is_blocked: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
    } catch (e) {
      console.error('ensureProfile error:', e);
    }
  }
}
