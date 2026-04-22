import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent, IonIcon, IonSpinner } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { eye, eyeOff, logoGoogle, mail, lockClosed, shieldCheckmark, person, pulse } from 'ionicons/icons';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-auth-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonIcon, IonSpinner]
})
export class AuthLoginPage implements OnInit {
  role = signal<'admin' | 'member'>('member');
  email = signal('');
  password = signal('');
  rememberMe = signal(false);
  showPassword = signal(false);
  isLoading = signal(false);
  errorMessage = signal('');
  infoMessage = signal('');

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {
    addIcons({pulse,shieldCheckmark,person,mail,lockClosed,logoGoogle,eye,eyeOff});
  }

  ngOnInit(): void {
    const roleParam = this.route.snapshot.queryParamMap.get('role');
    if (roleParam === 'admin' || roleParam === 'member') {
      this.role.set(roleParam);
    }

    const remembered = localStorage.getItem('fittrack_remembered_auth');
    if (remembered) {
      try {
        const parsed = JSON.parse(remembered);
        if (parsed?.email) {
          this.email.set(String(parsed.email));
          this.rememberMe.set(true);
        }
        if (parsed?.role === 'admin' || parsed?.role === 'member') {
          this.role.set(parsed.role);
        }
      } catch {
        // ignore invalid remember data
      }
    }
  }

  selectRole(role: 'admin' | 'member') {
    this.role.set(role);
    this.errorMessage.set('');
    this.infoMessage.set('');
    this.password.set('');
  }

  togglePasswordVisibility() {
    this.showPassword.set(!this.showPassword());
  }

  async login() {
    if (!this.email().trim() || !this.password()) {
      this.errorMessage.set('Please enter email and password.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');
    this.infoMessage.set('');

    const result = await this.authService.loginWithRole(this.email().trim(), this.password(), this.role());
    this.isLoading.set(false);

    if (!result.success) {
      this.errorMessage.set(result.message || 'Login failed.');
      return;
    }

    if (this.rememberMe()) {
      localStorage.setItem(
        'fittrack_remembered_auth',
        JSON.stringify({ email: this.email().trim(), role: this.role() })
      );
    } else {
      localStorage.removeItem('fittrack_remembered_auth');
    }

    // Defensive: get role from AuthService if not set
    let role = this.role();
    if (!role) {
      role = this.authService.getUserRole() as 'admin' | 'member';
    }

    if (role === 'admin') {
      if (this.router && this.router.navigate) this.router.navigate(['/admin/dashboard']);
      return;
    }
    if (role === 'member') {
      if (this.router && this.router.navigate) this.router.navigate(['/member/dashboard']);
      return;
    }
    // Fallback: go to role selection if role is unknown
    if (this.router && this.router.navigate) this.router.navigate(['/auth/role-selection']);
  }

  async forgotPassword() {
    if (!this.email().trim()) {
      this.errorMessage.set('Enter your email first to reset password.');
      return;
    }

    this.isLoading.set(true);
    const sent = await this.authService.sendPasswordReset(this.email().trim());
    this.isLoading.set(false);

    if (sent) {
      this.infoMessage.set('Reset instructions have been sent to your email.');
      this.errorMessage.set('');
    } else {
      this.errorMessage.set('Unable to send reset email right now.');
    }
  }

  async loginWithGoogle() {
    this.isLoading.set(true);
    this.errorMessage.set('');

    const result = await this.authService.loginWithGoogle();
    this.isLoading.set(false);

    if (!result.success) {
      this.errorMessage.set(result.message || 'Google login is currently unavailable.');
      return;
    }

    const resolvedRole = this.authService.getUserRole() as 'admin' | 'member';
    if (resolvedRole === 'admin') {
      if (this.router && this.router.navigate) this.router.navigate(['/admin/dashboard']);
      return;
    }
    if (this.router && this.router.navigate) this.router.navigate(['/member/dashboard']);
  }

  goToSignup() {
    if (this.router && this.router.navigate) this.router.navigate(['/auth/signup'], { queryParams: { role: this.role() } });
  }

  backToRoleSelection() {
    if (this.router && this.router.navigate) this.router.navigate(['/auth/role-selection']);
  }
}
