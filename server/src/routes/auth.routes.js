const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { findOne, insert, nowIso } = require('../db');

const router = express.Router();

router.post('/register', (req, res) => {
  const { name, email, password, role = 'member', weight, goal_weight } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'name, email and password are required' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const existing = findOne('users', (u) => u.email === normalizedEmail);
  if (existing) {
    return res.status(409).json({ message: 'Email already registered' });
  }

  const safeRole = role === 'admin' ? 'admin' : 'member';
  const hashed = bcrypt.hashSync(password, 10);
  const created = insert('users', {
    name: String(name).trim(),
    email: normalizedEmail,
    password: hashed,
    role: safeRole,
    weight: weight ?? null,
    goal_weight: goal_weight ?? null,
    daily_step_goal: 10000,
    daily_calorie_goal: 2000,
    is_blocked: 0,
    created_at: nowIso(),
    updated_at: nowIso()
  });

  return res.status(201).json({
    id: created.id,
    name: created.name,
    email: created.email,
    role: created.role
  });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'email and password are required' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const user = findOne('users', (u) => u.email === normalizedEmail);
  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  if (user.is_blocked) {
    return res.status(403).json({ message: 'User is blocked by admin' });
  }

  const ok = bcrypt.compareSync(password, user.password);
  if (!ok) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET || 'dev-secret',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  return res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      weight: user.weight,
      goal_weight: user.goal_weight,
      dailyStepGoal: user.daily_step_goal,
      dailyCalorieGoal: user.daily_calorie_goal,
      created_at: user.created_at
    }
  });
});

module.exports = router;
