import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { 
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonIcon, IonButton, IonChip, IonLabel
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  fitness, time, flame, barbell, bicycle, body, leaf, play, mic
} from 'ionicons/icons';
import { WorkoutService } from '../services/workout.service';
import { WorkoutCategory } from '../models/workout.model';
import { VoiceTrainerService, VoiceCommand } from '../services/voice-trainer.service';
import { AccountabilityService } from '../services/accountability.service';

@Component({
  selector: 'app-workouts',
  templateUrl: './workouts.page.html',
  styleUrls: ['./workouts.page.scss'],
  standalone: true,
  imports: [
    CommonModule, IonHeader, IonToolbar, IonTitle, IonContent,
    IonIcon, IonButton, IonChip, IonLabel
  ]
})
export class WorkoutsPage implements OnInit, OnDestroy {
  selectedCategory = signal<WorkoutCategory | 'All'>('All');
  categories = this.workoutService.getAllCategories();
  allWorkouts = this.workoutService.workouts;
  voiceStatus = this.voiceTrainer.status;

  private voiceUnsub: (() => void) | null = null;

  filteredWorkouts = () => {
    if (this.selectedCategory() === 'All') {
      return this.allWorkouts();
    }
    return this.workoutService.getWorkoutsByCategory(this.selectedCategory() as WorkoutCategory);
  };

  constructor(
    private workoutService: WorkoutService,
    private router: Router,
    private voiceTrainer: VoiceTrainerService,
    private accountability: AccountabilityService
  ) {
    addIcons({ fitness, time, flame, barbell, bicycle, body, leaf, play, mic });
  }

  ngOnInit() {
    this.voiceUnsub = this.voiceTrainer.onCommand((cmd: VoiceCommand) => {
      if (cmd.type === 'start-workout-category') {
        const category = (cmd.payload?.category || 'Chest') as WorkoutCategory;
        const workout = this.allWorkouts().find(w => w.category === category);
        if (workout) {
          this.startWorkout(workout.id);
        }
      }
    });
  }

  ngOnDestroy() {
    if (this.voiceUnsub) {
      this.voiceUnsub();
      this.voiceUnsub = null;
    }
  }

  selectCategory(category: WorkoutCategory | 'All') {
    this.selectedCategory.set(category);
  }

  toggleVoiceTrainer() {
    const status = this.voiceStatus();
    if (status === 'listening') {
      this.voiceTrainer.stopListening();
    } else {
      this.voiceTrainer.startListening();
    }
  }

  startWorkout(workoutId: string) {
    if (this.router && this.router.navigate && workoutId) this.router.navigate(['/workout-timer', workoutId]);
  }

  async skipToday() {
    await this.accountability.recordSkip('User chose to skip today\'s workout from Workouts page');
  }

  getCategoryIcon(category: WorkoutCategory): string {
    const icons: Record<WorkoutCategory, string> = {
      'Chest': 'barbell',
      'Back': 'barbell',
      'Legs': 'body',
      'Cardio': 'bicycle',
      'Yoga': 'leaf',
      'Arms': 'barbell',
      'Core': 'fitness'
    };
    return icons[category] || 'fitness';
  }

  getDifficultyColor(difficulty: string): string {
    const colors: Record<string, string> = {
      'Beginner': 'success',
      'Intermediate': 'warning',
      'Advanced': 'danger'
    };
    return colors[difficulty] || 'medium';
  }
}
