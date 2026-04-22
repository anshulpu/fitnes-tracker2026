import { Component, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { 
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon,
  IonBackButton, IonButtons
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { play, pause, stop, checkmarkCircle, flame, time, mic } from 'ionicons/icons';
import { WorkoutService } from '../services/workout.service';
import { ActivityService } from '../services/activity.service';
import { Workout, WorkoutSession } from '../models/workout.model';
import { VoiceTrainerService, VoiceCommand } from '../services/voice-trainer.service';

@Component({
  selector: 'app-workout-timer',
  templateUrl: './workout-timer.page.html',
  styleUrls: ['./workout-timer.page.scss'],
  standalone: true,
  imports: [
    CommonModule, IonHeader, IonToolbar, IonTitle, IonContent, IonButton,
    IonIcon, IonBackButton, IonButtons
  ]
})
export class WorkoutTimerPage implements OnInit, OnDestroy {
  workout = signal<Workout | null>(null);
  session = signal<WorkoutSession | null>(null);
  isRunning = signal(false);
  isPaused = signal(false);
  elapsedSeconds = signal(0);
  timer: any;
  currentExerciseIndex = signal(0);

  voiceStatus = this.voiceTrainer.status;
  lastHeard = this.voiceTrainer.lastHeard;

  private voiceUnsub: (() => void) | null = null;

  displayTime = () => {
    const seconds = this.elapsedSeconds();
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  progress = () => {
    const workout = this.workout();
    if (!workout) return 0;
    const totalSeconds = workout.duration * 60;
    return Math.min(this.elapsedSeconds() / totalSeconds, 1);
  };

  estimatedCalories = () => {
    const workout = this.workout();
    if (!workout) return 0;
    const minutes = this.elapsedSeconds() / 60;
    return Math.floor(minutes * workout.caloriesPerMinute);
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private workoutService: WorkoutService,
    private activityService: ActivityService,
    private voiceTrainer: VoiceTrainerService
  ) {
    addIcons({ flame, time, play, pause, checkmarkCircle, stop, mic });
  }

  ngOnInit() {
    const workoutId = this.route.snapshot.paramMap.get('id');
    if (workoutId) {
      const workout = this.workoutService.workouts().find(w => w.id === workoutId);
      if (workout) {
        this.workout.set(workout);
      }
    }

    this.voiceUnsub = this.voiceTrainer.onCommand((cmd: VoiceCommand) => {
      this.handleVoiceCommand(cmd);
    });
  }

  ngOnDestroy() {
    this.stopTimer();
    if (this.voiceUnsub) {
      this.voiceUnsub();
      this.voiceUnsub = null;
    }
  }

  async startWorkout() {
    const workout = this.workout();
    if (!workout) return;

    const session = await this.workoutService.startWorkout(workout);
    this.session.set(session);
    this.currentExerciseIndex.set(0);
    this.isRunning.set(true);
    this.isPaused.set(false);
    this.startTimer();
    if (workout.exercises && workout.exercises.length > 0) {
      this.voiceTrainer.speak(`Starting workout. First exercise: ${workout.exercises[0].name}.`);
    }
  }

  pauseWorkout() {
    this.isPaused.set(true);
    this.stopTimer();
  }

  resumeWorkout() {
    this.isPaused.set(false);
    this.startTimer();
  }

  async stopWorkout() {
    this.stopTimer();
    const session = this.session();
    if (session) {
      const minutes = Math.floor(this.elapsedSeconds() / 60);
      await this.workoutService.completeWorkout(session, minutes);
      await this.activityService.addWorkout(minutes, this.estimatedCalories());
    }
    this.router.navigate(['/tabs/workouts']);
  }

  private startTimer() {
    this.timer = setInterval(() => {
      this.elapsedSeconds.set(this.elapsedSeconds() + 1);
    }, 1000);
  }

  private stopTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private handleVoiceCommand(cmd: VoiceCommand) {
    if (cmd.type === 'start-workout-timer') {
      if (!this.isRunning()) {
        this.startWorkout();
      }
      return;
    }

    const workout = this.workout();
    if (!workout) return;

    if (cmd.type === 'next-exercise' && workout.exercises && workout.exercises.length) {
      const current = this.currentExerciseIndex();
      const nextIndex = (current + 1) % workout.exercises.length;
      this.currentExerciseIndex.set(nextIndex);
      const next = workout.exercises[nextIndex];
      this.voiceTrainer.speak(`Next exercise: ${next.name}.`);
      return;
    }

    if (cmd.type === 'pause-workout') {
      if (this.isRunning() && !this.isPaused()) {
        this.pauseWorkout();
      }
      return;
    }

    if (cmd.type === 'resume-workout') {
      if (this.isRunning() && this.isPaused()) {
        this.resumeWorkout();
      }
      return;
    }

    if (cmd.type === 'stop-workout') {
      if (this.isRunning()) {
        this.stopWorkout();
      }
      return;
    }
  }

  toggleVoiceTrainer() {
    const status = this.voiceStatus();
    if (status === 'listening') {
      this.voiceTrainer.stopListening();
    } else {
      this.voiceTrainer.startListening();
    }
  }
}
