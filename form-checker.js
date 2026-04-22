// FitPro Form Checker JavaScript
// Uses MediaPipe Pose via TensorFlow.js
let video = document.getElementById('video');
let overlay = document.getElementById('overlay');
let ctx = overlay.getContext('2d');
let startBtn = document.getElementById('startBtn');
let restartBtn = document.getElementById('restartBtn');
let stopBtn = document.getElementById('stopBtn');
let captureBtn = document.getElementById('captureBtn');
let liveIndicator = document.getElementById('liveIndicator');
let cameraStatus = document.getElementById('cameraStatus');
let loadingSpinner = document.getElementById('loadingSpinner');
let scoreBar = document.getElementById('scoreBar');
let scoreValue = document.getElementById('scoreValue');
let backAlignment = document.getElementById('backAlignment');
let neckPosition = document.getElementById('neckPosition');
let statusText = document.getElementById('statusText');
let timerEl = document.getElementById('timer');
let screenshotCanvas = document.getElementById('screenshotCanvas');
let historyTable = document.getElementById('historyTable').querySelector('tbody');

let detector, stream, timerInterval, goodPostureTime = 0, timerRunning = false;
let lastStatus = '', lastScore = 0;
let analyticsHistory = JSON.parse(localStorage.getItem('fitpro_analytics') || '[]');

function showLoading(show) {
  loadingSpinner.classList.toggle('hidden', !show);
}
function setLive(active) {
  liveIndicator.classList.toggle('active', active);
  cameraStatus.textContent = active ? 'Camera Active' : 'Camera Inactive';
}
function resetStatusPanel() {
  scoreBar.style.width = '0%';
  scoreValue.textContent = '0%';
  backAlignment.textContent = '-';
  neckPosition.textContent = '-';
  statusText.textContent = '-';
  statusText.className = 'status-badge';
  timerEl.textContent = '0s';
}
function updateHistoryTable() {
  historyTable.innerHTML = analyticsHistory.map(row =>
    `<tr><td>${row.date}</td><td>${row.score}%</td><td>${row.status}</td></tr>`
  ).join('');
}
function saveAnalytics(score, status) {
  const entry = {
    date: new Date().toLocaleString(),
    score: Math.round(score),
    status
  };
  analyticsHistory.unshift(entry);
  analyticsHistory = analyticsHistory.slice(0, 20);
  localStorage.setItem('fitpro_analytics', JSON.stringify(analyticsHistory));
  updateHistoryTable();
}
function speak(text) {
  if ('speechSynthesis' in window) {
    let utter = new SpeechSynthesisUtterance(text);
    utter.rate = 1.1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  }
}
function startTimer() {
  timerRunning = true;
  goodPostureTime = 0;
  timerEl.textContent = '0s';
  timerInterval = setInterval(() => {
    goodPostureTime++;
    timerEl.textContent = goodPostureTime + 's';
  }, 1000);
}
function stopTimer() {
  timerRunning = false;
  clearInterval(timerInterval);
}
function resetAll() {
  stopCamera();
  resetStatusPanel();
  stopTimer();
  setLive(false);
  showLoading(false);
}
function stopCamera() {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    stream = null;
  }
  if (detector) {
    detector.dispose();
    detector = null;
  }
  video.srcObject = null;
  overlay.width = overlay.height = 0;
  setLive(false);
  stopBtn.disabled = true;
  restartBtn.disabled = true;
  captureBtn.disabled = true;
}
async function startCamera() {
  showLoading(true);
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
    await video.play();
    overlay.width = video.videoWidth;
    overlay.height = video.videoHeight;
    setLive(true);
    stopBtn.disabled = false;
    restartBtn.disabled = false;
    captureBtn.disabled = false;
    showLoading(false);
    await loadPoseModel();
    startPoseDetection();
  } catch (e) {
    showLoading(false);
    setLive(false);
    cameraStatus.textContent = e.name === 'NotAllowedError' ? 'Camera Permission Denied' : 'Camera Error';
    speak('Camera access denied or not available.');
  }
}
async function loadPoseModel() {
  detector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, {
    modelType: 'lightning',
    enableSmoothing: true
  });
}
function getAngle(a, b, c) {
  // Returns angle (in degrees) at point b
  const ab = [a.x - b.x, a.y - b.y];
  const cb = [c.x - b.x, c.y - b.y];
  const dot = ab[0]*cb[0] + ab[1]*cb[1];
  const magAB = Math.sqrt(ab[0]**2 + ab[1]**2);
  const magCB = Math.sqrt(cb[0]**2 + cb[1]**2);
  const angle = Math.acos(dot / (magAB * magCB));
  return angle * (180 / Math.PI);
}
function analyzePose(keypoints) {
  // Shoulders: leftShoulder(5), rightShoulder(6)
  // Hips: leftHip(11), rightHip(12)
  // Neck: midpoint between shoulders, compare to nose(0)
  const ls = keypoints[5], rs = keypoints[6], lh = keypoints[11], rh = keypoints[12], nose = keypoints[0];
  if ([ls, rs, lh, rh, nose].some(k => !k || k.score < 0.4)) return null;
  // Shoulders alignment: horizontal distance
  const shoulderDiff = Math.abs(ls.y - rs.y);
  // Hips alignment: horizontal distance
  const hipDiff = Math.abs(lh.y - rh.y);
  // Neck posture: vertical distance from nose to shoulder midpoint
  const midShoulder = { x: (ls.x + rs.x)/2, y: (ls.y + rs.y)/2 };
  const neckDist = nose.y - midShoulder.y;
  // Posture score
  let score = 100;
  let back = 'Good', neck = 'Good', status = 'Good', color = 'good';
  if (shoulderDiff > 30) { score -= 25; back = 'Uneven'; }
  if (hipDiff > 30) { score -= 25; back = 'Uneven'; }
  if (neckDist > 40) { score -= 30; neck = 'Slight Forward'; }
  if (neckDist > 70) { score -= 20; neck = 'Forward'; }
  if (score >= 85) { status = 'Good'; color = 'good'; }
  else if (score >= 65) { status = 'Improve'; color = 'improve'; }
  else { status = 'Bad'; color = 'bad'; }
  return { score: Math.max(0, Math.round(score)), back, neck, status, color };
}
async function startPoseDetection() {
  resetStatusPanel();
  startTimer();
  let badFeedbackGiven = false;
  async function detect() {
    if (!detector || !video.srcObject) return;
    const poses = await detector.estimatePoses(video);
    ctx.clearRect(0, 0, overlay.width, overlay.height);
    if (poses[0] && poses[0].keypoints) {
      drawKeypoints(poses[0].keypoints);
      const result = analyzePose(poses[0].keypoints);
      if (result) {
        scoreBar.style.width = result.score + '%';
        scoreValue.textContent = result.score + '%';
        backAlignment.textContent = result.back;
        neckPosition.textContent = result.neck;
        statusText.textContent = result.status;
        statusText.className = 'status-badge ' + result.color;
        if (result.status === 'Good') {
          if (!timerRunning) startTimer();
          badFeedbackGiven = false;
        } else {
          stopTimer();
          if (!badFeedbackGiven && result.status === 'Bad') {
            speak('Please straighten your back');
            badFeedbackGiven = true;
          }
        }
        lastStatus = result.status;
        lastScore = result.score;
      }
    }
    requestAnimationFrame(detect);
  }
  detect();
}
function drawKeypoints(keypoints) {
  ctx.save();
  ctx.strokeStyle = '#5ec7f5';
  ctx.lineWidth = 3;
  for (let k of keypoints) {
    if (k.score > 0.4) {
      ctx.beginPath();
      ctx.arc(k.x, k.y, 5, 0, 2 * Math.PI);
      ctx.fillStyle = '#9edb63';
      ctx.fill();
      ctx.stroke();
    }
  }
  ctx.restore();
}
function captureScreenshot() {
  screenshotCanvas.width = video.videoWidth;
  screenshotCanvas.height = video.videoHeight;
  let sctx = screenshotCanvas.getContext('2d');
  sctx.drawImage(video, 0, 0, screenshotCanvas.width, screenshotCanvas.height);
  let url = screenshotCanvas.toDataURL('image/png');
  let a = document.createElement('a');
  a.href = url;
  a.download = 'fitpro_posture_' + Date.now() + '.png';
  a.click();
}
// Button Events
startBtn.onclick = async () => {
  resetAll();
  showLoading(true);
  await startCamera();
  startBtn.disabled = true;
  restartBtn.disabled = false;
  stopBtn.disabled = false;
  captureBtn.disabled = false;
};
restartBtn.onclick = async () => {
  resetAll();
  await startCamera();
  startBtn.disabled = true;
  restartBtn.disabled = false;
  stopBtn.disabled = false;
  captureBtn.disabled = false;
};
stopBtn.onclick = () => {
  stopCamera();
  resetStatusPanel();
  stopTimer();
  startBtn.disabled = false;
  restartBtn.disabled = true;
  stopBtn.disabled = true;
  captureBtn.disabled = true;
  setLive(false);
};
captureBtn.onclick = () => {
  captureScreenshot();
};
window.addEventListener('beforeunload', () => {
  stopCamera();
});
// Save analytics on stop
stopBtn.addEventListener('click', () => {
  if (lastScore > 0) saveAnalytics(lastScore, lastStatus);
});
// Init
resetStatusPanel();
updateHistoryTable();
setLive(false);
showLoading(false);
