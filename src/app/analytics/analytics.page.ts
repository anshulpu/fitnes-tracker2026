import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonCard, IonCardContent, IonButton, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { barChart, download, documentText } from 'ionicons/icons';
import { ActivityService } from '../services/activity.service';
import { DietService } from '../services/diet.service';
import { DailyActivity } from '../models/user.model';
import { Chart } from 'chart.js/auto';

@Component({
  selector: 'app-analytics',
  templateUrl: './analytics.page.html',
  styleUrls: ['./analytics.page.scss'],
  standalone: true,
  imports: [CommonModule, IonHeader, IonToolbar, IonTitle, IonContent, IonCard, IonCardContent, IonButton, IonIcon]
})
export class AnalyticsPage implements AfterViewInit {
  @ViewChild('stepsChartCanvas') stepsChartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('caloriesChartCanvas') caloriesChartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('workoutsChartCanvas') workoutsChartCanvas!: ElementRef<HTMLCanvasElement>;

  private stepsChart: any;
  private caloriesChart: any;
  private workoutsChart: any;

  constructor(
    private activityService: ActivityService,
    private dietService: DietService
  ) {
    addIcons({ barChart, download, documentText });
  }

  ngAfterViewInit(): void {
    this.buildCharts();
  }

  private buildCharts() {
    const weekly = this.activityService.weeklyProgress();
    if (!weekly) {
      return;
    }

    const labels = weekly.days.map(d => this.getShortDateLabel(d.date));
    const stepsData = weekly.days.map(d => d.steps);
    const caloriesData = weekly.days.map(d => d.caloriesBurned);
    const workoutsData = weekly.days.map(d => d.workoutsCompleted);

    const stepsConfig = {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Steps',
            data: stepsData,
            borderColor: '#4e8df5',
            backgroundColor: 'rgba(78, 141, 245, 0.2)',
            tension: 0.3,
            fill: true
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false }
        }
      }
    };

    const caloriesConfig = {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Calories Burned',
            data: caloriesData,
            backgroundColor: '#ff8a65'
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false }
        }
      }
    };

    const workoutsConfig = {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Workouts Completed',
            data: workoutsData,
            backgroundColor: '#26a69a'
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            ticks: { stepSize: 1 }
          }
        }
      }
    };

    this.stepsChart = new Chart(this.stepsChartCanvas.nativeElement, stepsConfig);
    this.caloriesChart = new Chart(this.caloriesChartCanvas.nativeElement, caloriesConfig);
    this.workoutsChart = new Chart(this.workoutsChartCanvas.nativeElement, workoutsConfig);
  }

  getShortDateLabel(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { weekday: 'short' });
  }

  downloadCsv() {
    const weekly = this.activityService.weeklyProgress();
    if (!weekly) return;

    const header = ['Date', 'Steps', 'CaloriesBurned', 'ActiveMinutes', 'WorkoutsCompleted'];
    const rows = weekly.days.map((d: DailyActivity) => [
      d.date,
      d.steps,
      d.caloriesBurned,
      d.activeMinutes,
      d.workoutsCompleted
    ]);

    const csvContent = [header, ...rows]
      .map(row => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fitness-weekly-report.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  downloadMonthlySummary() {
    const weekly = this.activityService.weeklyProgress();
    if (!weekly) return;

    const now = new Date();
    const monthName = now.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

    const summary = `Your ${monthName} Fitness Report\n\n` +
      `Total Steps (last 7 days): ${weekly.totalSteps}\n` +
      `Total Calories Burned (last 7 days): ${weekly.totalCalories}\n` +
      `Total Active Minutes (last 7 days): ${weekly.totalActiveMinutes}\n`;

    const blob = new Blob([summary], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fitness-report-${monthName.replace(/\s+/g, '-').toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
