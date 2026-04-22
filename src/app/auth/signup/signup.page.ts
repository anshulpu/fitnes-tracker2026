import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent, IonIcon, IonSpinner } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { mail, lockClosed, person, shieldCheckmark } from 'ionicons/icons';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-auth-signup',
  templateUrl: './signup.page.html',
  styleUrls: ['./signup.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonIcon, IonSpinner]
})
export class AuthSignupPage implements OnInit {
  name = signal('');
  email = signal('');
  password = signal('');
  role = signal<'admin' | 'member'>('member');
  isLoading = signal(false);
  errorMessage = signal('');
  infoMessage = signal('');

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {
    addIcons({ mail, lockClosed, person, shieldCheckmark });
  }

  ngOnInit(): void {
    const roleParam = this.route.snapshot.queryParamMap.get('role');
    if (roleParam === 'admin' || roleParam === 'member') {
      this.role.set(roleParam);
    }
  }

  async signup() {
    if (!this.name().trim() || !this.email().trim() || !this.password()) {
      this.errorMessage.set('Please fill all fields.');
      return;
    }

    if (this.password().length < 6) {
      this.errorMessage.set('Password should be at least 6 characters.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');
    this.infoMessage.set('');

    const result = await this.authService.signup(
      this.email().trim(),
      this.password(),
      this.name().trim(),
      this.role()
    );

    this.isLoading.set(false);

    if (!result.success) {
      this.errorMessage.set(result.message || 'Signup failed. Please try again.');
      return;
    }

    this.infoMessage.set('Account created successfully. Redirecting to your dashboard...');

    setTimeout(() => {
      if (this.role() === 'admin') {
        if (this.router && this.router.navigate) this.router.navigate(['/admin/dashboard']);
        return;
      }
      if (this.router && this.router.navigate) this.router.navigate(['/member/dashboard']);
    }, 500);
  }

  goToLogin() {
    if (this.router && this.router.navigate) this.router.navigate(['/auth/login'], { queryParams: { role: this.role() } });
  }
}
