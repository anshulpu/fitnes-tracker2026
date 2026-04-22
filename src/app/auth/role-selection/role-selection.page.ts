import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { shieldCheckmark, person, pulse } from 'ionicons/icons';

@Component({
  selector: 'app-role-selection',
  templateUrl: './role-selection.page.html',
  styleUrls: ['./role-selection.page.scss'],
  standalone: true,
  imports: [CommonModule, IonContent, IonIcon]
})
export class RoleSelectionPage {
  logoUrl = '/assets/fitness-center-logo.png';

  constructor(private router: Router) {
    addIcons({ pulse, shieldCheckmark, person });
  }

  onLogoError() {
    this.logoUrl = '/assets/icon/favicon.png';
  }

  goToLogin(role: 'admin' | 'member') {
    if (this.router && this.router.navigate && role) this.router.navigate(['/auth/login'], { queryParams: { role } });
  }

  goToSignup() {
    if (this.router && this.router.navigate) this.router.navigate(['/auth/signup']);
  }
}
