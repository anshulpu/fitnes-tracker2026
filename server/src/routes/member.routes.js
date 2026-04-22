const express = require('express');
const bcrypt = require('bcryptjs');
const { findOne, findMany, insert, update, nowIso } = require('../db');
const { verifyJwt } = require('../middleware/auth');

const router = express.Router();

router.use(verifyJwt);

router.get('/profile', (req, res) => {
  const user = findOne('users', (u) => u.id === req.user.id);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  const { password, ...safe } = user;
  res.json(safe);
});

router.put('/profile', (req, res) => {
  const { name, weight, goal_weight, dailyStepGoal, dailyCalorieGoal } = req.body;

  update('users', (u) => u.id === req.user.id, (u) => ({
    ...u,
    name: name ?? u.name,
    weight: weight ?? u.weight,
    goal_weight: goal_weight ?? u.goal_weight,
    daily_step_goal: dailyStepGoal ?? u.daily_step_goal,
    daily_calorie_goal: dailyCalorieGoal ?? u.daily_calorie_goal,
    updated_at: nowIso()
  }));

  const updatedUser = findOne('users', (u) => u.id === req.user.id);
  if (!updatedUser) {
    return res.status(404).json({ message: 'User not found' });
  }

  const { password, ...safe } = updatedUser;
  res.json(safe);
});

router.post('/workout', (req, res) => {
  const { workout_type, calories, duration, date } = req.body;
  if (!workout_type || calories == null || duration == null) {
    return res.status(400).json({ message: 'workout_type, calories, duration required' });
  }

  const created = insert('workouts', {
    user_id: req.user.id,
    workout_type,
    calories: Number(calories),
    duration: Number(duration),
    date: date || new Date().toISOString().split('T')[0],
    created_at: nowIso()
  });

  res.status(201).json({ id: created.id });
});

router.post('/activity', (req, res) => {
  const { steps = 0, sleep = 0, heart_rate = 0, calories = 0, date } = req.body;
  const activityDate = date || new Date().toISOString().split('T')[0];

  const existing = findOne('activities', (a) => a.user_id === req.user.id && a.date === activityDate);

  if (existing) {
    update('activities', (a) => a.id === existing.id, (a) => ({
      ...a,
      steps: Number(steps),
      sleep: Number(sleep),
      heart_rate: Number(heart_rate),
      calories: Number(calories),
      created_at: a.created_at || nowIso()
    }));
    return res.json({ id: existing.id, updated: true });
  }

  const created = insert('activities', {
    user_id: req.user.id,
    steps: Number(steps),
    sleep: Number(sleep),
    heart_rate: Number(heart_rate),
    calories: Number(calories),
    date: activityDate,
    created_at: nowIso()
  });

  res.status(201).json({ id: created.id, updated: false });
});

router.get('/stats', (req, res) => {
  const workouts = findMany('workouts', (w) => w.user_id === req.user.id);
  const activities = findMany('activities', (a) => a.user_id === req.user.id);

  const stats = {
    workoutCalories: workouts.reduce((sum, w) => sum + Number(w.calories || 0), 0),
    workoutDuration: workouts.reduce((sum, w) => sum + Number(w.duration || 0), 0),
    totalSteps: activities.reduce((sum, a) => sum + Number(a.steps || 0), 0),
    avgSleep: activities.length
      ? activities.reduce((sum, a) => sum + Number(a.sleep || 0), 0) / activities.length
      : 0,
    avgHeartRate: activities.length
      ? activities.reduce((sum, a) => sum + Number(a.heart_rate || 0), 0) / activities.length
      : 0,
    activityCalories: activities.reduce((sum, a) => sum + Number(a.calories || 0), 0)
  };

  res.json(stats);
});

router.put('/change-password', (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword || String(newPassword).length < 6) {
    return res.status(400).json({ message: 'oldPassword and a valid newPassword are required' });
  }

  const user = findOne('users', (u) => u.id === req.user.id);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  const valid = bcrypt.compareSync(oldPassword, user.password);
  if (!valid) {
    return res.status(401).json({ message: 'Old password is incorrect' });
  }

  const hashed = bcrypt.hashSync(newPassword, 10);
  update('users', (u) => u.id === req.user.id, (u) => ({ ...u, password: hashed, updated_at: nowIso() }));
  res.json({ success: true });
});

module.exports = router;
