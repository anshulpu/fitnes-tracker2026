import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonIcon,
  IonCard,
  IonCardContent,
  IonSpinner,
  IonBackButton,
  IonButtons
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  videocam,
  warning,
  checkmarkCircle,
  refresh,
  camera,
  stopwatch,
  volumeHigh,
  volumeMute,
  bug,
  body,
  analytics,
  play,
  stop
} from 'ionicons/icons';

// Loaded globally via CDN in index.html
declare const tf: any;
declare const poseDetection: any;

interface SimpleKeypoint {
  x: number;
  y: number;
  score?: number | null;
  name?: string;
}

interface SimplePose {
  keypoints: SimpleKeypoint[];
}

type ExerciseMode = 'standing' | 'squat' | 'deadlift';

interface EvaluationResult {
  isGood: boolean;
  message: string;
  score: number;
  confidence: number;
  avgTorsoAngle: number;
  deviation: number;
}

@Component({
  selector: 'app-form-checker',
  templateUrl: './form-checker.page.html',
  styleUrls: ['./form-checker.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonIcon,
    IonCard,
    IonCardContent,
    IonSpinner,
    IonBackButton,
    IonButtons
  ]
})
export class FormCheckerPage implements AfterViewInit, OnDestroy {
  @ViewChild('video') videoRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('overlay') canvasRef!: ElementRef<HTMLCanvasElement>;

  isLoadingModel = signal(false);
  isPreparingCamera = signal(false);
  isCameraActive = signal(false);
  feedbackMessage = signal<string | null>(null);
  postureGood = signal<boolean | null>(null);
  postureScore = signal(0);
  confidenceLevel = signal(0);
  debugInfo = signal<string | null>(null);
  showDebug = signal(false);
  soundEnabled = signal(true);
  sessionSeconds = signal(0);
  screenshotDataUrl = signal<string | null>(null);
  exerciseMode = signal<ExerciseMode>('standing');

  private detector: any | null = null;
  private detectorLoadingPromise: Promise<void> | null = null;
  private animationFrameId: number | null = null;
  private loopRunning = false;
  private stream: MediaStream | null = null;
  private sessionTimerId: ReturnType<typeof setInterval> | null = null;

  private readonly SCORE_WINDOW_SIZE = 5;
  private readonly STABILITY_DELAY_MS = 500;
  private readonly VOICE_COOLDOWN_MS = 2500;
  private readonly MIN_KEYPOINT_SCORE = 0.5;

  private scoreWindow: number[] = [];
  private angleWindow: number[] = [];
  private postureCandidate: boolean | null = null;
  private candidateSince = 0;
  private lastSpokenAt = 0;
  private lastSpokenState: boolean | null = null;

  constructor(private router: Router) {
    addIcons({
      videocam,
      warning,
      checkmarkCircle,
      refresh,
      camera,
      stopwatch,
      volumeHigh,
      volumeMute,
      bug,
      body,
      analytics,
      play,
      stop
    });
  }

  async ngAfterViewInit() {
    // lazily wait for TF if available to avoid blocking app startup
    try {
      if (typeof tf !== 'undefined' && tf.ready) {
        await tf.ready();
      }
    } catch {
      // ignore
    }
  }

  ngOnDestroy(): void {
    this.stopChecking();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  async startChecking() {
    if (this.isCameraActive()) {
      return;
    }

    this.isLoadingModel.set(true);
    this.isPreparingCamera.set(true);
    this.feedbackMessage.set(null);
    this.postureGood.set(null);
    this.postureScore.set(0);
    this.confidenceLevel.set(0);
    this.screenshotDataUrl.set(null);
    this.resetSmoothingState();

    try {
      await this.startCamera();
      this.isPreparingCamera.set(false);
      await this.loadModel();
      this.isCameraActive.set(true);
      this.isLoadingModel.set(false);
      this.startSessionTimer();
      this.runDetectionLoop();
    } catch (err) {
      console.error('Form checker init error', err);
      this.isLoadingModel.set(false);
      this.isPreparingCamera.set(false);
      this.feedbackMessage.set(this.getFriendlyErrorMessage(err));
      this.postureGood.set(null);
      this.stopChecking();
    }
  }

  stopChecking() {
    this.loopRunning = false;
    if (this.animationFrameId != null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.sessionTimerId != null) {
      clearInterval(this.sessionTimerId);
      this.sessionTimerId = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach((t: MediaStreamTrack) => t.stop());
      this.stream = null;
    }

    if (this.videoRef) {
      const video = this.videoRef.nativeElement;
      video.pause();
      video.srcObject = null;
    }

    this.resetOverlay();
    this.isCameraActive.set(false);
    this.isPreparingCamera.set(false);
    this.isLoadingModel.set(false);
  }

  async restart() {
    this.stopChecking();
    await this.startChecking();
  }

  private async startCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Camera not supported on this device');
    }

    this.stream = await this.getCameraStream();
    const video = this.videoRef.nativeElement;
    video.srcObject = this.stream;
    video.setAttribute('playsinline', 'true');
    video.muted = true;

    await this.waitForVideoMetadata(video);
    await video.play();

    this.syncCanvasSize();
  }

  private async getCameraStream(): Promise<MediaStream> {
    const candidates: MediaStreamConstraints[] = [
      {
        video: {
          facingMode: { ideal: 'user' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      },
      {
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false
      },
      {
        video: true,
        audio: false
      }
    ];

    let lastError: unknown;
    for (const constraints of candidates) {
      try {
        return await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err) {
        lastError = err;
      }
    }

    throw lastError ?? new Error('Unable to access camera');
  }

  private waitForVideoMetadata(video: HTMLVideoElement): Promise<void> {
    if (video.readyState >= 1 && video.videoWidth > 0 && video.videoHeight > 0) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const onLoaded = () => {
        cleanup();
        resolve();
      };

      const onError = () => {
        cleanup();
        reject(new Error('Unable to read camera stream metadata'));
      };

      const timer = window.setTimeout(() => {
        cleanup();
        reject(new Error('Camera initialization timed out'));
      }, 8000);

      const cleanup = () => {
        clearTimeout(timer);
        video.removeEventListener('loadedmetadata', onLoaded);
        video.removeEventListener('error', onError);
      };

      video.addEventListener('loadedmetadata', onLoaded, { once: true });
      video.addEventListener('error', onError, { once: true });
    });
  }

  private syncCanvasSize() {
    if (!this.videoRef || !this.canvasRef) return;

    const video = this.videoRef.nativeElement;
    const canvas = this.canvasRef.nativeElement;
    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
  }

  private async loadModel() {
    if (this.detector) {
      return;
    }
    if (this.detectorLoadingPromise) {
      await this.detectorLoadingPromise;
      return;
    }

    if (typeof poseDetection === 'undefined') {
      throw new Error('Pose detection library not loaded');
    }

    this.detectorLoadingPromise = (async () => {
      try {
        const webglReady = await this.trySetBackend('webgl');
        if (webglReady) {
          this.detector = await poseDetection.createDetector(
            poseDetection.SupportedModels.MoveNet,
            { modelType: 'SinglePoseLightning' }
          );
          return;
        }
      } catch (err) {
        if (!this.isWebglUnsupportedError(err)) {
          throw err;
        }
      }

      const cpuReady = await this.trySetBackend('cpu');
      if (!cpuReady) {
        throw new Error('Unable to initialize TensorFlow backend');
      }

      this.detector = await poseDetection.createDetector(
        poseDetection.SupportedModels.MoveNet,
        { modelType: 'SinglePoseLightning' }
      );
    })();

    try {
      await this.detectorLoadingPromise;
    } finally {
      this.detectorLoadingPromise = null;
    }
  }

  private runDetectionLoop() {
    if (this.loopRunning) {
      return;
    }

    this.loopRunning = true;

    const loop = async () => {
      if (!this.loopRunning || !this.detector || !this.videoRef || !this.isCameraActive()) {
        this.loopRunning = false;
        this.animationFrameId = null;
        return;
      }

      const video = this.videoRef.nativeElement;
      this.syncCanvasSize();

      try {
        const poses: SimplePose[] = await this.detector.estimatePoses(video);
        if (poses && poses.length > 0) {
          this.processPose(poses[0]);
        } else {
          this.handleNoPose();
        }
        this.drawOverlay(poses?.[0] || null);
      } catch (err) {
        console.warn('Pose estimation error', err);
      }

      if (this.loopRunning) {
        this.animationFrameId = requestAnimationFrame(loop);
      }
    };

    this.animationFrameId = requestAnimationFrame(loop);
  }

  private processPose(pose: SimplePose) {
    const required = this.getRequiredTorsoPoints(pose);

    if (!required) {
      this.handleNoPose('Move fully into the frame so I can see shoulders and hips clearly.');
      return;
    }

    const result = this.evaluatePosture(required);

    this.pushWindow(this.scoreWindow, result.score, this.SCORE_WINDOW_SIZE);
    this.pushWindow(this.angleWindow, result.avgTorsoAngle, this.SCORE_WINDOW_SIZE);

    const smoothedScore = this.average(this.scoreWindow);
    const smoothedAngle = this.average(this.angleWindow);

    this.postureScore.set(Math.round(smoothedScore));
    this.confidenceLevel.set(Math.round(result.confidence * 100));

    const candidate = result.isGood;
    const now = performance.now();
    if (this.postureCandidate !== candidate) {
      this.postureCandidate = candidate;
      this.candidateSince = now;
      return;
    }

    if (now - this.candidateSince < this.STABILITY_DELAY_MS) {
      return;
    }

    if (this.postureGood() !== candidate) {
      this.postureGood.set(candidate);
      this.speakFeedback(candidate);
    }

    this.feedbackMessage.set(result.message);
    if (this.showDebug()) {
      this.debugInfo.set(
        `mode=${this.exerciseMode()} score=${smoothedScore.toFixed(0)} conf=${(result.confidence * 100).toFixed(0)}% angle=${smoothedAngle.toFixed(1)}° dev=${result.deviation.toFixed(1)}°`
      );
    } else {
      this.debugInfo.set(null);
    }
  }

  private drawOverlay(pose: SimplePose | null) {
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    const video = this.videoRef.nativeElement;
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw the video frame as a dim background
    ctx.save();
    ctx.globalAlpha = 0.52;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.restore();

    this.drawGuideOverlay(ctx, canvas.width, canvas.height);

    if (!pose) {
      return;
    }

    const keypoints = (pose.keypoints || []).filter((kp: SimpleKeypoint) => this.hasConfidence(kp));

    const keypointByName = this.mapKeypointsByName(keypoints);

    this.drawSkeleton(ctx, keypointByName);
    this.drawTorsoBox(ctx, keypointByName);

    // Draw keypoints
    ctx.fillStyle = '#00e5ff';
    keypoints.forEach((kp: SimpleKeypoint) => {
      ctx.beginPath();
      ctx.arc(kp.x, kp.y, 4, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  private drawGuideOverlay(ctx: CanvasRenderingContext2D, width: number, height: number) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);

    // Center line
    ctx.beginPath();
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(width / 2, height);
    ctx.stroke();

    // Stand-here box
    const boxW = width * 0.48;
    const boxH = height * 0.7;
    const boxX = (width - boxW) / 2;
    const boxY = (height - boxH) / 2;
    ctx.strokeRect(boxX, boxY, boxW, boxH);
    ctx.setLineDash([]);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(boxX + 8, boxY + 8, 110, 26);
    ctx.fillStyle = '#f8fafc';
    ctx.font = '14px sans-serif';
    ctx.fillText('Align your back', boxX + 14, boxY + 26);
    ctx.restore();
  }

  private drawSkeleton(ctx: CanvasRenderingContext2D, keypoints: Record<string, SimpleKeypoint>) {
    const connections: Array<[string, string]> = [
      ['left_shoulder', 'right_shoulder'],
      ['left_hip', 'right_hip'],
      ['left_shoulder', 'left_hip'],
      ['right_shoulder', 'right_hip'],
      ['left_hip', 'left_knee'],
      ['right_hip', 'right_knee'],
      ['left_knee', 'left_ankle'],
      ['right_knee', 'right_ankle']
    ];

    ctx.save();
    ctx.lineWidth = 3;
    ctx.strokeStyle = this.postureGood() === false ? '#ff4d6d' : '#22c55e';

    connections.forEach(([a, b]) => {
      const p1 = keypoints[a];
      const p2 = keypoints[b];
      if (!p1 || !p2) return;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    });

    ctx.restore();
  }

  private drawTorsoBox(ctx: CanvasRenderingContext2D, keypoints: Record<string, SimpleKeypoint>) {
    const torsoPoints = [
      keypoints['left_shoulder'],
      keypoints['right_shoulder'],
      keypoints['left_hip'],
      keypoints['right_hip']
    ].filter(Boolean) as SimpleKeypoint[];

    if (torsoPoints.length < 4) return;

    const minX = Math.min(...torsoPoints.map((p: SimpleKeypoint) => p.x));
    const minY = Math.min(...torsoPoints.map((p: SimpleKeypoint) => p.y));
    const maxX = Math.max(...torsoPoints.map((p: SimpleKeypoint) => p.x));
    const maxY = Math.max(...torsoPoints.map((p: SimpleKeypoint) => p.y));

    ctx.save();
    ctx.strokeStyle = 'rgba(96, 165, 250, 0.85)';
    ctx.lineWidth = 2;
    ctx.strokeRect(minX - 14, minY - 14, (maxX - minX) + 28, (maxY - minY) + 28);
    ctx.restore();
  }

  private async trySetBackend(backend: 'webgl' | 'cpu'): Promise<boolean> {
    if (typeof tf === 'undefined' || !tf.setBackend) {
      return false;
    }

    try {
      await tf.setBackend(backend);
      await tf.ready();
      return true;
    } catch {
      return false;
    }
  }

  private isWebglUnsupportedError(error: any): boolean {
    const message = String(error?.message || error || '');
    return message.toLowerCase().includes('webgl');
  }

  private getFriendlyErrorMessage(error: unknown): string {
    const err = error as { name?: string; message?: string };
    const name = String(err?.name || '').toLowerCase();
    const message = String(err?.message || '').toLowerCase();

    if (name.includes('notallowed') || message.includes('permission')) {
      return 'Camera permission denied. Please allow camera access and try again.';
    }
    if (name.includes('notfound') || message.includes('requested device not found')) {
      return 'No camera detected on this device.';
    }
    if (name.includes('notreadable') || name.includes('abort')) {
      return 'Camera is in use by another app. Close other apps and retry.';
    }
    if (message.includes('timeout')) {
      return 'Camera is taking too long to start. Please retry.';
    }
    if (this.isWebglUnsupportedError(error)) {
      return 'WebGL unavailable, switched to CPU mode. If laggy, use a faster device.';
    }
    return 'Unable to start form checker. Please check camera permissions and try again.';
  }

  private hasConfidence(point?: SimpleKeypoint | null): point is SimpleKeypoint {
    if (!point || point.score == null) return false;
    return point.score >= this.MIN_KEYPOINT_SCORE;
  }

  private mapKeypointsByName(points: SimpleKeypoint[]): Record<string, SimpleKeypoint> {
    const map: Record<string, SimpleKeypoint> = {};
    points.forEach((point: SimpleKeypoint) => {
      if (point.name) {
        map[point.name] = point;
      }
    });
    return map;
  }

  private getRequiredTorsoPoints(pose: SimplePose): {
    leftShoulder: SimpleKeypoint;
    rightShoulder: SimpleKeypoint;
    leftHip: SimpleKeypoint;
    rightHip: SimpleKeypoint;
  } | null {
    const points = pose.keypoints || [];
    const leftShoulder = points.find((k: SimpleKeypoint) => k.name === 'left_shoulder');
    const rightShoulder = points.find((k: SimpleKeypoint) => k.name === 'right_shoulder');
    const leftHip = points.find((k: SimpleKeypoint) => k.name === 'left_hip');
    const rightHip = points.find((k: SimpleKeypoint) => k.name === 'right_hip');

    if (!this.hasConfidence(leftShoulder) || !this.hasConfidence(rightShoulder) || !this.hasConfidence(leftHip) || !this.hasConfidence(rightHip)) {
      return null;
    }

    return {
      leftShoulder,
      rightShoulder,
      leftHip,
      rightHip
    };
  }

  private evaluatePosture(points: {
    leftShoulder: SimpleKeypoint;
    rightShoulder: SimpleKeypoint;
    leftHip: SimpleKeypoint;
    rightHip: SimpleKeypoint;
  }): EvaluationResult {
    const leftTorsoAngle = this.torsoAngle(points.leftHip, points.leftShoulder);
    const rightTorsoAngle = this.torsoAngle(points.rightHip, points.rightShoulder);
    const avgTorsoAngle = (leftTorsoAngle + rightTorsoAngle) / 2;

    const shoulderTilt = this.lineTilt(points.leftShoulder, points.rightShoulder);
    const hipTilt = this.lineTilt(points.leftHip, points.rightHip);
    const sideSymmetryPenalty = Math.abs(leftTorsoAngle - rightTorsoAngle);

    const confidence = this.average([
      points.leftShoulder.score ?? 0,
      points.rightShoulder.score ?? 0,
      points.leftHip.score ?? 0,
      points.rightHip.score ?? 0
    ]);

    const mode = this.exerciseMode();
    let target = 90;
    let tolerance = 16;
    let threshold = 78;
    let messageGood = 'Good posture. Keep your spine tall and neutral.';
    let messageBad = 'Straighten your back and keep your torso stable.';

    if (mode === 'squat') {
      target = 62;
      tolerance = 20;
      threshold = 72;
      messageGood = 'Good squat torso angle. Keep your core braced.';
      messageBad = 'For squats, avoid collapsing forward. Keep your chest up.';
    } else if (mode === 'deadlift') {
      target = 46;
      tolerance = 15;
      threshold = 74;
      messageGood = 'Good deadlift setup. Spine looks neutral.';
      messageBad = 'In deadlift mode, flatten your back and hinge from hips.';
    }

    const deviation = Math.abs(avgTorsoAngle - target);
    const weightedPenalty =
      (deviation * 2.8) +
      (sideSymmetryPenalty * 1.7) +
      (shoulderTilt * 1.1) +
      (hipTilt * 1.0) +
      ((1 - confidence) * 22);

    const score = Math.max(0, Math.min(100, 100 - weightedPenalty));
    const isGood = deviation <= tolerance && score >= threshold;

    return {
      isGood,
      message: isGood ? messageGood : messageBad,
      score,
      confidence,
      avgTorsoAngle,
      deviation
    };
  }

  private torsoAngle(hip: SimpleKeypoint, shoulder: SimpleKeypoint): number {
    const dx = shoulder.x - hip.x;
    const dy = shoulder.y - hip.y;
    const angle = Math.atan2(Math.abs(dy), Math.abs(dx));
    return (angle * 180) / Math.PI;
  }

  private lineTilt(a: SimpleKeypoint, b: SimpleKeypoint): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    if (dx === 0) return 90;
    return Math.abs((Math.atan2(dy, dx) * 180) / Math.PI);
  }

  private handleNoPose(message = 'No pose detected. Step into the guide box.') {
    this.feedbackMessage.set(message);
    this.postureGood.set(null);
    this.postureScore.set(Math.max(0, Math.round(this.postureScore() * 0.9)));
    this.confidenceLevel.set(Math.max(0, Math.round(this.confidenceLevel() * 0.8)));

    this.pushWindow(this.scoreWindow, 0, this.SCORE_WINDOW_SIZE);
    this.pushWindow(this.angleWindow, 0, this.SCORE_WINDOW_SIZE);

    if (this.showDebug()) {
      this.debugInfo.set('Waiting for confident shoulder/hip keypoints...');
    } else {
      this.debugInfo.set(null);
    }
  }

  private resetOverlay() {
    if (!this.canvasRef) return;
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  private startSessionTimer() {
    if (this.sessionTimerId != null) {
      clearInterval(this.sessionTimerId);
    }
    this.sessionSeconds.set(0);
    this.sessionTimerId = setInterval(() => {
      this.sessionSeconds.set(this.sessionSeconds() + 1);
    }, 1000);
  }

  getSessionTimerLabel(): string {
    const total = this.sessionSeconds();
    const min = Math.floor(total / 60).toString().padStart(2, '0');
    const sec = Math.floor(total % 60).toString().padStart(2, '0');
    return `${min}:${sec}`;
  }

  toggleDebug() {
    this.showDebug.set(!this.showDebug());
    if (!this.showDebug()) {
      this.debugInfo.set(null);
    }
  }

  toggleSound() {
    this.soundEnabled.set(!this.soundEnabled());
    if (!this.soundEnabled() && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  setExerciseMode(mode: string) {
    if (mode !== 'standing' && mode !== 'squat' && mode !== 'deadlift') return;
    this.exerciseMode.set(mode);
    this.resetSmoothingState();
    this.feedbackMessage.set(`Exercise mode: ${mode}. Hold position for stable feedback.`);
  }

  captureScreenshot() {
    if (!this.videoRef || !this.canvasRef) return;

    const video = this.videoRef.nativeElement;
    const overlay = this.canvasRef.nativeElement;
    if (!video.videoWidth || !video.videoHeight) return;

    const shotCanvas = document.createElement('canvas');
    shotCanvas.width = video.videoWidth;
    shotCanvas.height = video.videoHeight;

    const shotCtx = shotCanvas.getContext('2d');
    if (!shotCtx) return;

    shotCtx.drawImage(video, 0, 0, shotCanvas.width, shotCanvas.height);
    shotCtx.drawImage(overlay, 0, 0, shotCanvas.width, shotCanvas.height);
    this.screenshotDataUrl.set(shotCanvas.toDataURL('image/png'));
  }

  private speakFeedback(isGood: boolean) {
    if (!this.soundEnabled()) return;
    if (!('speechSynthesis' in window)) return;

    const now = Date.now();
    if (this.lastSpokenState === isGood && now - this.lastSpokenAt < this.VOICE_COOLDOWN_MS) {
      return;
    }

    const phrase = isGood ? 'Good posture' : 'Straighten your back';
    const utterance = new SpeechSynthesisUtterance(phrase);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 0.9;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);

    this.lastSpokenAt = now;
    this.lastSpokenState = isGood;
  }

  private resetSmoothingState() {
    this.scoreWindow = [];
    this.angleWindow = [];
    this.postureCandidate = null;
    this.candidateSince = 0;
  }

  private pushWindow(windowValues: number[], value: number, maxSize: number) {
    windowValues.push(value);
    if (windowValues.length > maxSize) {
      windowValues.shift();
    }
  }

  private average(values: number[]): number {
    if (values.length === 0) return 0;
    const sum = values.reduce((acc: number, n: number) => acc + n, 0);
    return sum / values.length;
  }

  goBack() {
    if (this.router && this.router.navigate) this.router.navigate(['/tabs/workouts']);
  }
}
