import { Component } from '@angular/core';
import { AdminDashboardPage } from '../../admin-dashboard/admin-dashboard.page';

@Component({
  selector: 'app-admin-dashboard-route',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: true,
  imports: [AdminDashboardPage]
})
export class AdminDashboardRoutePage {}
