import { Component } from '@angular/core';
import { DashboardPage } from '../../dashboard/dashboard.page';

@Component({
  selector: 'app-member-dashboard-route',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: true,
  imports: [DashboardPage]
})
export class MemberDashboardRoutePage {}
