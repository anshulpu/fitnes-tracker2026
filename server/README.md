# Fitness Tracker Backend

Express API with persistent JSON table storage, JWT auth, and role-based access.

## Setup

1. `cd server`
2. `npm install`
3. Copy `.env.example` to `.env` and update values
4. `npm run dev`

## Default Admin

- email: `admin@fittrack.local`
- password: `Admin@123`

## API Summary

- `POST /register`
- `POST /login`
- Admin:
  - `GET /admin/users`
  - `GET /admin/workouts`
  - `GET /admin/activities`
  - `GET /admin/reports/daily`
  - `GET /admin/reports/weekly`
  - `GET /admin/analytics`
  - `GET /admin/users/:id/progress`
  - `POST /admin/workout-programs`
  - `PATCH /admin/user/:id/block`
  - `DELETE /admin/user/:id`
- Member:
  - `GET /user/profile`
  - `PUT /user/profile`
  - `POST /user/workout`
  - `POST /user/activity`
  - `GET /user/stats`
