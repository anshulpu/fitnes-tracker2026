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
    // Handle OAuth redirect callback (Google login returns here with a token in the URL hash)
    const { data: { session } } = await this.supabase.client.auth.getSession();

    if (session?.user) {
      // User is logged in — ensure profile exists then navigate to dashboard
      await this.ensureProfile(session.user);
      const role = this.authService.getUserRole();
      if (role === 'admin') {
        this.router.navigate(['/admin/dashboard']);
      } else {
        this.router.navigate(['/member/dashboard']);
      }
    }
  }

  private async ensureProfile(user: any) {
    const { data: existing } = await this.supabase.client
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .single();

    if (!existing) {
      // Create profile if trigger didn't fire (e.g. Google OAuth new user)
      await this.supabase.client.from('profiles').upsert({
        id: user.id,
        email: user.email,
        name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0],
        role: user.user_metadata?.role || 'member',
        daily_step_goal: 10000,
        daily_calorie_goal: 2000,
        is_blocked: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
  }
}
