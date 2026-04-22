const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'fitness-tracker.json');

const state = {
  users: [],
  workouts: [],
  activities: [],
  workout_programs: []
};

function nowIso() {
  return new Date().toISOString();
}

function loadState() {
  if (!fs.existsSync(dbPath)) {
    return;
  }

  const raw = fs.readFileSync(dbPath, 'utf8');
  if (!raw) {
    return;
  }

  const parsed = JSON.parse(raw);
  state.users = parsed.users || [];
  state.workouts = parsed.workouts || [];
  state.activities = parsed.activities || [];
  state.workout_programs = parsed.workout_programs || [];
}

function saveState() {
  fs.writeFileSync(dbPath, JSON.stringify(state, null, 2), 'utf8');
}

function nextId(table) {
  const rows = state[table];
  if (!rows.length) return 1;
  return Math.max(...rows.map((r) => Number(r.id) || 0)) + 1;
}

function initDb() {
  loadState();

  ensureDemoUser({
    name: 'FitTrack Admin',
    email: 'admin@fittrack.com',
    password: 'admin123',
    role: 'admin',
    weight: 80,
    goal_weight: 75
  });

  ensureDemoUser({
    name: 'FitTrack Member',
    email: 'member@fittrack.com',
    password: 'member123',
    role: 'member',
    weight: 78,
    goal_weight: 72
  });

  // Keep legacy admin user for backward compatibility with previous sessions.
  ensureDemoUser({
    name: 'System Admin',
    email: 'admin@fittrack.local',
    password: 'Admin@123',
    role: 'admin',
    weight: 80,
    goal_weight: 75
  });

  saveState();
}

function ensureDemoUser({ name, email, password, role, weight, goal_weight }) {
  const existing = state.users.find((u) => u.email === email);

  if (!existing) {
    state.users.push({
      id: nextId('users'),
      name,
      email,
      password: bcrypt.hashSync(password, 10),
      role,
      weight,
      goal_weight,
      daily_step_goal: 10000,
      daily_calorie_goal: 2000,
      is_blocked: 0,
      created_at: nowIso(),
      updated_at: nowIso()
    });
    return;
  }

  existing.name = name;
  existing.role = role;
  existing.weight = existing.weight ?? weight;
  existing.goal_weight = existing.goal_weight ?? goal_weight;
  existing.password = bcrypt.hashSync(password, 10);
  existing.updated_at = nowIso();
}

function list(table) {
  return [...state[table]];
}

function findOne(table, predicate) {
  return state[table].find(predicate) || null;
}

function findMany(table, predicate) {
  return state[table].filter(predicate);
}

function insert(table, row) {
  const created = {
    id: nextId(table),
    ...row
  };
  state[table].push(created);
  saveState();
  return created;
}

function update(table, predicate, updater) {
  let count = 0;
  state[table] = state[table].map((row) => {
    if (!predicate(row)) {
      return row;
    }
    count += 1;
    return updater({ ...row });
  });

  if (count > 0) {
    saveState();
  }

  return count;
}

function remove(table, predicate) {
  const before = state[table].length;
  state[table] = state[table].filter((row) => !predicate(row));
  const after = state[table].length;
  if (after !== before) {
    saveState();
  }
  return before - after;
}

module.exports = {
  state,
  initDb,
  list,
  findOne,
  findMany,
  insert,
  update,
  remove,
  saveState,
  nowIso
};
