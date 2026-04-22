import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonButton, IonInput, IonIcon, IonText, IonSpinner } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { mail, lockClosed, person, fitness, logoGoogle, keyOutline, nutrition, analytics } from 'ionicons/icons';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonButton, IonInput, IonIcon, IonText, IonSpinner]
})
export class LoginPage {
  email = signal('');
  password = signal('');
  name = signal('');
  role: 'admin' | 'member' = 'member';
  isSignupMode = signal(false);
  isLoading = signal(false);
  errorMessage = signal('');
  infoMessage = signal('');

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    addIcons({fitness,person,mail,lockClosed,logoGoogle,nutrition,analytics,keyOutline});
  }

  async login() {
    if (!this.email() || !this.password()) {
      this.errorMessage.set('Please fill in all fields');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');
    this.infoMessage.set('');

    const result = await this.authService.login(this.email(), this.password());

    if (result.success) {
      const verified = await this.authService.isEmailVerified();
      this.isLoading.set(false);

      if (!verified) {
        this.errorMessage.set('Please verify your email before signing in. A verification link was sent to your email.');
        await this.authService.logout();
        return;
      }
      const role = this.authService.getUserRole();
      if (role === 'admin') {
        this.router.navigate(['/admin-dashboard']);
      } else {
        this.router.navigate(['/tabs/dashboard']);
      }
      return;
    }

    this.isLoading.set(false);
    this.errorMessage.set(result.message || 'Invalid email or password');
  }

  async signup() {
    if (!this.email() || !this.password() || !this.name()) {
      this.errorMessage.set('Please fill in all fields');
      return;
    }

    if (this.password().length < 6) {
      this.errorMessage.set('Password must be at least 6 characters');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');
  this.infoMessage.set('');

    const result = await this.authService.signup(this.email(), this.password(), this.name(), this.role);

    if (result.success) {
      this.isLoading.set(false);
      this.infoMessage.set('Account created! Please check your email for a verification link before signing in.');
      this.isSignupMode.set(false);
      this.password.set('');
    } else {
      this.isLoading.set(false);
      this.errorMessage.set(result.message || 'Signup failed. Please try again.');
    }
  }

  toggleMode() {
    this.isSignupMode.set(!this.isSignupMode());
    this.errorMessage.set('');
    this.infoMessage.set('');
  }

  handleSubmit() {
    if (this.isSignupMode()) {
      this.signup();
    } else {
      this.login();
    }
  }

  async loginWithGoogle() {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.infoMessage.set('');

    const result = await this.authService.loginWithGoogle();

    this.isLoading.set(false);

    if (result.success) {
      const role = this.authService.getUserRole();
      if (role === 'admin') {
        this.router.navigate(['/admin-dashboard']);
      } else {
        this.router.navigate(['/tabs/dashboard']);
      }
    } else {
      this.errorMessage.set(result.message || 'Google sign-in failed. Please try again.');
    }
  }

  async forgotPassword() {
    if (!this.email()) {
      this.errorMessage.set('Enter your email to reset your password');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');
    this.infoMessage.set('');

    const success = await this.authService.sendPasswordReset(this.email());

    this.isLoading.set(false);

    if (success) {
      this.infoMessage.set('Password reset link sent to your email.');
    } else {
      this.errorMessage.set('Failed to send password reset email. Please try again.');
    }
  }
}
