
# Fitness Tracker App

A modern fitness tracking app built using **Ionic + Angular**.  
This app helps users track their **daily workouts, diet plans, and fitness progress** through a simple and clean interface. It is designed for users who want to maintain a healthy lifestyle and stay consistent with their fitness goals.

---

## 📌 Features

### 🏠 Dashboard
- Shows daily fitness summary
- Tracks activity, calories, and progress

### 💪 Workout Tracker
- Add and manage daily workouts
- Keep track of sets, reps, and performance

### 🍽 Diet Planner
- Log meals and monitor calorie intake
- Helps maintain proper nutrition balance

### ⚙ Settings
- Profile and app customization options
- Optional dark mode support (if implemented)

### 🧠 Smart AI Coaching
- AI Adaptive Fitness Engine that adjusts daily workout and diet suggestions
- Smart Fatigue Detection and overtraining alerts
- Goal Prediction Engine (e.g. "You can reach 70kg in about 45 days")

### 🎙 Voice & Camera Assist
- Voice-Based Workout Trainer ("Start chest workout", "Next exercise", "Pause workout")
- Camera-Based Form Checker that uses pose detection to warn when your back is not straight

### 🧩 Social Accountability (Gamified)
- Fun "penalty" system: if you choose to skip your workout, the app records a skip event as if your accountability buddy was notified
- Designed as a social-pressure mechanic you can extend with real notifications (email/push/backend)

### 🛡 Role-Based Admin Area
- Admin/Member role selection during signup
- Admins are redirected to a protected `/admin-dashboard` with analytics and management tools
- Role guard ensures only admins can access admin features

### 📊 Admin Dashboard & User Management
- Modern admin dashboard with dark, gradient UI
- High-level analytics cards (Total Users, Active Today, Total Workouts, Total Calories Burned)
- Top Users table showing name, last active date, and total workouts
- Weekly activity bar chart (dummy/localStorage data)
- Basic user management: edit and delete user rows, with changes persisted to localStorage

### 🔔 Smart Notifications
- Notification service that stores notifications in localStorage
- Auto-generated reminders on the dashboard such as:
	- "Workout reminder" when you are very inactive
	- "You missed your goal today" when steps are far below the daily target
- Recent notifications displayed in a clean card on the main dashboard

### 🏅 Achievement System (Gamification)
- Achievement service that tracks milestones from stored activity data
- Badges rendered on the dashboard for:
	- **First workout** – unlocked after your first logged workout
	- **7-day streak** – active 7 days in a row
	- **1000 calories burned** – cumulative calorie burn across days
- Earned badges are persisted and show the date they were achieved

---

## 🎨 UI Highlights
- Clean and user-friendly layout
- Custom animated bottom navigation tab bar
- Responsive design that works on **Android**, **iOS**, and **Web**

---

## 🧱 Tech Stack
| Technology | Description |
|-----------|-------------|
| Ionic | Hybrid UI and components |
| Angular | App architecture and logic |
| TypeScript | Type-safe development |
| SCSS | UI styling and themes |
| Firebase Auth | Secure authentication (email/password, Google, JWT) |

---

## 🚀 Run the App Locally

```bash
git clone https://github.com/manglam09/fitness-tracker-ionic--app.git
cd fitness-tracker-ionic--app
npm install
npm start
```

---

## 🔐 Authentication & Security (Capstone Focus)

This project includes a production-style auth and security setup to demonstrate best practices:

- **Email + Password Login** using Firebase Authentication
- **Google Sign-In** button on the login screen (OAuth2 under the hood)
- **Email-based OTP / Verification**:
	- On signup, the app triggers `sendEmailVerification` from Firebase Auth.
	- Users are required to verify their email before they can successfully sign in.
- **Forgot Password Flow**:
	- "Forgot password?" link on the login screen.
	- Sends a secure password reset email via Firebase.

### 🔑 Session Security & JWT Usage

- Uses **Firebase ID Tokens (JWTs)** as bearer tokens for backend APIs.
- A custom **HTTP interceptor** (`src/app/services/auth.interceptor.ts`) automatically:
	- Reads the current Firebase ID token from `AuthService`.
	- Attaches it as `Authorization: Bearer <token>` to requests targeting `environment.apiBaseUrl`.

### 🧱 Encrypted Local Storage

- User/session data is stored via `StorageService` (`src/app/services/storage.service.ts`).
- Sensitive entries (e.g. `current_user`, `user_profile`) use:
	- **Capacitor Preferences** for key/value storage.
	- **AES encryption** (CryptoJS) before writing to disk.
- This visibly demonstrates **encrypted-at-rest** handling instead of plain `localStorage` only.

### 🛡 Route Protection & Role-Based Access

- **Auth Guard** (`src/app/guards/auth.guard.ts`):
	- Protects core routes like `/tabs/**` and `workout-timer/:id`.
	- Redirects unauthenticated users to `/login` with an optional `returnUrl`.
- **Role Guard** (`src/app/guards/role.guard.ts`):
	- Reads `role` from the `User` model (e.g. `user | trainer | admin`).
	- Restricts access to certain routes based on `route.data.roles`.
	- Example: the **Settings** page route in `src/app/tabs/tabs.routes.ts` is limited to `trainer`/`admin` roles to showcase role-based access control.

You can walk examiners through these files and flows to show a complete story around **authentication, JWT-based security, encrypted storage, and role-based authorization**.

---

## Full Stack Upgrade (JWT + Role API)

This project now includes a complete backend API under the `server/` folder with:

- JWT authentication
- Role middleware (`admin` / `member`)
- SQLite database and schema initialization
- Admin routes for user/workout/activity/report management
- Member routes for profile/workout/activity/stats

### Folder Structure

```text
server/
	package.json
	.env.example
	README.md
	src/
		index.js
		db/
			index.js
		middleware/
			auth.js
		routes/
			auth.routes.js
			admin.routes.js
			member.routes.js
```

### Database Tables

- `users`:
	- `id`, `name`, `email`, `password`, `role`, `weight`, `goal_weight`, `created_at`
- `workouts`:
	- `id`, `user_id`, `workout_type`, `calories`, `duration`, `date`
- `activities`:
	- `id`, `user_id`, `steps`, `sleep`, `heart_rate`, `calories`

### Backend API

Auth:

- `POST /register`
- `POST /login`

Admin:

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

Member:

- `GET /user/profile`
- `PUT /user/profile`
- `POST /user/workout`
- `POST /user/activity`
- `GET /user/stats`

### Run Frontend + Backend

From project root:

```bash
npm install
npm --prefix server install
npm run server:dev
npm start
```

Default seeded admin (local backend):

- Email: `admin@fittrack.local`
- Password: `Admin@123`
