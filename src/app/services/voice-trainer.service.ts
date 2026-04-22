import { Injectable, signal } from '@angular/core';

export type VoiceStatus = 'idle' | 'listening' | 'unsupported' | 'error';

export type VoiceCommandType =
  | 'start-workout-category'
  | 'start-workout-timer'
  | 'next-exercise'
  | 'pause-workout'
  | 'resume-workout'
  | 'stop-workout';

export interface VoiceCommand {
  type: VoiceCommandType;
  payload?: any;
  rawText: string;
}

declare const webkitSpeechRecognition: any;

@Injectable({ providedIn: 'root' })
export class VoiceTrainerService {
  status = signal<VoiceStatus>('idle');
  lastHeard = signal<string | null>(null);

  private recognition: any | null = null;
  private handlers: Array<(cmd: VoiceCommand) => void> = [];

  constructor() {
    this.initRecognition();
  }

  private initRecognition() {
    const win = window as any;
    const Ctor = win.SpeechRecognition || win.webkitSpeechRecognition || webkitSpeechRecognition;

    if (!Ctor) {
      this.status.set('unsupported');
      return;
    }

    this.recognition = new Ctor();
    this.recognition.lang = 'en-US';
    this.recognition.continuous = false;
    this.recognition.interimResults = false;

    this.recognition.onresult = (event: any) => {
      const transcript = (event.results[0][0].transcript as string).toLowerCase().trim();
      this.lastHeard.set(transcript);
      this.handleTranscript(transcript);
    };

    this.recognition.onend = () => {
      // Auto-restart while in listening mode for a hands-free feel
      if (this.status() === 'listening') {
        try {
          this.recognition.start();
        } catch {
          // ignore
        }
      }
    };

    this.recognition.onerror = () => {
      this.status.set('error');
    };
  }

  startListening() {
    if (!this.recognition) return;
    this.status.set('listening');
    try {
      this.recognition.start();
    } catch {
      // ignore double-start errors
    }
  }

  stopListening() {
    if (!this.recognition) return;
    this.status.set('idle');
    try {
      this.recognition.stop();
    } catch {
      // ignore
    }
  }

  onCommand(handler: (cmd: VoiceCommand) => void): () => void {
    this.handlers.push(handler);
    return () => {
      this.handlers = this.handlers.filter(h => h !== handler);
    };
  }

  private emit(cmd: VoiceCommand) {
    for (const handler of this.handlers) {
      handler(cmd);
    }
  }

  private handleTranscript(text: string) {
    if (!text) return;

    // Start specific category workouts (chest, legs, cardio, etc.)
    if (text.includes('start')) {
      const categoryKeywords: Array<{ keyword: string; category: string }> = [
        { keyword: 'chest', category: 'Chest' },
        { keyword: 'back', category: 'Back' },
        { keyword: 'legs', category: 'Legs' },
        { keyword: 'leg', category: 'Legs' },
        { keyword: 'cardio', category: 'Cardio' },
        { keyword: 'yoga', category: 'Yoga' },
        { keyword: 'arms', category: 'Arms' },
        { keyword: 'biceps', category: 'Arms' },
        { keyword: 'triceps', category: 'Arms' },
        { keyword: 'core', category: 'Core' },
        { keyword: 'abs', category: 'Core' }
      ];

      for (const entry of categoryKeywords) {
        if (text.includes(entry.keyword)) {
          this.emit({
            type: 'start-workout-category',
            payload: { category: entry.category },
            rawText: text
          });
          this.speak(`Starting ${entry.category.toLowerCase()} workout`);
          return;
        }
      }

      // Generic "start workout" command for the active timer screen
      if (text.includes('workout') || text === 'start') {
        this.emit({ type: 'start-workout-timer', rawText: text });
        this.speak('Starting your workout');
        return;
      }
    }

    // Timer controls
    if (
      text.includes('next exercise') ||
      text.includes('next one') ||
      text === 'next' ||
      text === 'next set'
    ) {
      this.emit({ type: 'next-exercise', rawText: text });
      this.speak('Next exercise');
      return;
    }

    if (text.includes('pause workout') || text === 'pause') {
      this.emit({ type: 'pause-workout', rawText: text });
      this.speak('Pausing workout');
      return;
    }

    if (text.includes('resume workout') || text.includes('continue workout') || text === 'resume') {
      this.emit({ type: 'resume-workout', rawText: text });
      this.speak('Resuming workout');
      return;
    }

    if (
      text.includes('stop workout') ||
      text.includes('end workout') ||
      text.includes('complete workout')
    ) {
      this.emit({ type: 'stop-workout', rawText: text });
      this.speak('Stopping workout');
      return;
    }
  }

  speak(text: string) {
    if (typeof window === 'undefined' || !("speechSynthesis" in window)) return;
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
  }
}
