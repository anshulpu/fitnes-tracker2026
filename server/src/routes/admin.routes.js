const express = require('express');
const { list, findOne, findMany, insert, update, remove, nowIso } = require('../db');
const { verifyJwt, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(verifyJwt, requireRole('admin'));

router.get('/users', (_req, res) => {
  const users = list('users')
    .map(({ password, ...safe }) => safe)
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  res.json(users);
});

router.get('/workouts', (_req, res) => {
  const users = list('users');
  const workouts = list('workouts')
    .map((w) => ({
      ...w,
      user_name: users.find((u) => u.id === w.user_id)?.name || 'Unknown'
    }))
    .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));

  res.json(workouts);
});

router.get('/activities', (_req, res) => {
  const users = list('users');
  const activities = list('activities')
    .map((a) => ({
      ...a,
      user_name: users.find((u) => u.id === a.user_id)?.name || 'Unknown'
    }))
    .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));

  res.json(activities);
});

router.patch('/user/:id/block', (req, res) => {
  const userId = Number(req.params.id);
  const blocked = !!req.body.blocked;

  const changes = update(
    'users',
    (u) => u.id === userId,
    (u) => ({ ...u, is_blocked: blocked ? 1 : 0, updated_at: nowIso() })
  );

  if (!changes) {
    return res.status(404).json({ message: 'User not found' });
  }

  res.json({ success: true, blocked });
});

router.delete('/user/:id', (req, res) => {
  const userId = Number(req.params.id);
  const user = findOne('users', (u) => u.id === userId);

  if (!user || user.role === 'admin') {
    return res.status(404).json({ message: 'User not found or cannot delete admin' });
  }

  remove('workouts', (w) => w.user_id === userId);
  remove('activities', (a) => a.user_id === userId);
  remove('users', (u) => u.id === userId);

  res.json({ success: true });
});

router.post('/workout-programs', (req, res) => {
  const { name, description, duration, difficulty } = req.body;
  if (!name) {
    return res.status(400).json({ message: 'Program name is required' });
  }

  const created = insert('workout_programs', {
    name: String(name).trim(),
    description: description || null,
    duration: duration == null ? null : Number(duration),
    difficulty: difficulty || null,
    created_by: req.user.id,
    created_at: nowIso()
  });

  res.status(201).json(created);
});

router.get('/workout-programs', (_req, res) => {
  const programs = list('workout_programs').sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  res.json(programs);
});

router.post('/workouts', (req, res) => {
  const { user_id, workout_type, calories, duration, date } = req.body;
  if (!user_id || !workout_type || calories == null || duration == null) {
    return res.status(400).json({ message: 'user_id, workout_type, calories, duration required' });
  }

  const user = findOne('users', (u) => u.id === Number(user_id));
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  const created = insert('workouts', {
    user_id: Number(user_id),
    workout_type,
    calories: Number(calories),
    duration: Number(duration),
    date: date || new Date().toISOString().split('T')[0],
    created_at: nowIso()
  });

  res.status(201).json(created);
});

router.get('/users/:id/progress', (req, res) => {
  const userId = Number(req.params.id);
  const user = findOne('users', (u) => u.id === userId);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  const workouts = findMany('workouts', (w) => w.user_id === userId);
  const activities = findMany('activities', (a) => a.user_id === userId);

  const totalCaloriesBurned = workouts.reduce((sum, w) => sum + Number(w.calories || 0), 0);
  const totalWorkoutMinutes = workouts.reduce((sum, w) => sum + Number(w.duration || 0), 0);
  const totalSteps = activities.reduce((sum, a) => sum + Number(a.steps || 0), 0);
  const avgSleep = activities.length
    ? activities.reduce((sum, a) => sum + Number(a.sleep || 0), 0) / activities.length
    : 0;
  const avgHeartRate = activities.length
    ? activities.reduce((sum, a) => sum + Number(a.heart_rate || 0), 0) / activities.length
    : 0;

  res.json({
    totalCaloriesBurned,
    totalWorkoutMinutes,
    totalSteps,
    avgSleep,
    avgHeartRate
  });
});

router.get('/reports/daily', (_req, res) => {
  const byDate = new Map();
  for (const w of list('workouts')) {
    const key = w.date;
    if (!byDate.has(key)) {
      byDate.set(key, { date: key, workouts: 0, calories: 0, duration: 0 });
    }
    const row = byDate.get(key);
    row.workouts += 1;
    row.calories += Number(w.calories || 0);
    row.duration += Number(w.duration || 0);
  }

  const report = [...byDate.values()].sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 14);
  res.json(report);
});

router.get('/reports/weekly', (_req, res) => {
  const byWeek = new Map();

  for (const w of list('workouts')) {
    const date = new Date(w.date);
    const weekKey = `${date.getUTCFullYear()}-W${String(Math.ceil((date.getUTCDate() + 6 - date.getUTCDay()) / 7)).padStart(2, '0')}`;
    if (!byWeek.has(weekKey)) {
      byWeek.set(weekKey, { week: weekKey, workouts: 0, calories: 0, duration: 0 });
    }
    const row = byWeek.get(weekKey);
    row.workouts += 1;
    row.calories += Number(w.calories || 0);
    row.duration += Number(w.duration || 0);
  }

  const report = [...byWeek.values()].sort((a, b) => String(b.week).localeCompare(String(a.week))).slice(0, 12);
  res.json(report);
});

router.get('/reports/monthly', (_req, res) => {
  const byMonth = new Map();

  for (const w of list('workouts')) {
    const date = new Date(w.date);
    const monthKey = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
    if (!byMonth.has(monthKey)) {
      byMonth.set(monthKey, { month: monthKey, workouts: 0, calories: 0, duration: 0 });
    }
    const row = byMonth.get(monthKey);
    row.workouts += 1;
    row.calories += Number(w.calories || 0);
    row.duration += Number(w.duration || 0);
  }

  const report = [...byMonth.values()].sort((a, b) => String(b.month).localeCompare(String(a.month))).slice(0, 12);
  res.json(report);
});

router.get('/analytics', (_req, res) => {
  const users = list('users');
  const workouts = list('workouts');
  const activities = list('activities');

  const sleepData = activities.length
    ? activities.reduce((sum, a) => sum + Number(a.sleep || 0), 0) / activities.length
    : 0;

  res.json({
    totalUsers: users.length,
    activeUsers: users.filter((u) => !u.is_blocked).length,
    totalWorkouts: workouts.length,
    caloriesBurned: workouts.reduce((sum, w) => sum + Number(w.calories || 0), 0),
    stepsData: activities.reduce((sum, a) => sum + Number(a.steps || 0), 0),
    sleepData,
    programsCreated: list('workout_programs').length
  });
});

module.exports = router;
