# FitTrack Pro 🏋️‍♂️

A modern, feature-rich fitness tracking application built with **Ionic Angular Standalone Components**. Track your workouts, manage your diet, monitor daily activity, and achieve your fitness goals with style!

## ✨ Features

### 🔐 Authentication
- **Login & Signup** pages with smooth animations
- Modern gradient UI with hero icons
- Form validation and error handling
- Persistent user sessions via localStorage
 - Role-based login with **Admin** and **Member** roles
 - Admin users are redirected to a protected **Admin Dashboard**

### 📊 Dashboard
- **Daily Activity Summary**
  - Steps counter with progress bar
  - Calories burned tracking
  - Active minutes display
  - Workouts completed counter
- **Weekly Progress Charts**
  - 7-day activity visualization
  - Interactive bar charts
- **Quick Navigation Cards**
  - Workouts, Diet Plan, and Analytics access

### 💪 Workout Tracking
- **Workout Library**
  - 7+ pre-configured workouts
  - Categories: Chest, Back, Legs, Cardio, Yoga, Arms, Core
  - Difficulty levels: Beginner, Intermediate, Advanced
  - Exercise details with sets, reps, and duration
- **Workout Timer**
  - Real-time workout session tracking
  - Play, Pause, and Complete controls
  - Circular progress indicator
  - Calorie estimation during workout
  - Exercise list display

### 🤖 AI Coaching & Intelligence
- **AI Adaptive Fitness Engine** that adjusts daily workout intensity and diet focus based on sleep, recent activity, and calories
- **Smart Fatigue Detection** and overtraining warnings (e.g. "⚠️ You are overtraining. Take rest.")
- **Goal Prediction Engine** that estimates time to reach target weight (e.g. "You can reach 70kg in about 45 days")
- **Voice-Based Workout Trainer** with hands-free commands like "Start chest workout", "Next exercise", "Pause workout", "Resume workout", "Stop workout"
- **Camera-Based Form Checker** that uses pose detection to check posture and give feedback such as "Your back is not straight"

### 🎮 Social Accountability (Gamified)
- **Accountability Service** that tracks days you explicitly skip your workout
- Tap **"I’m Skipping Today"** on the Workouts tab to trigger a playful "penalty" event, as if your friend/accountability buddy was notified
- Built so you can later hook it to real notifications (email, push, or backend APIs)

### 📊 Admin Dashboard & User Management
- Dedicated `/admin-dashboard` view for admin users
- Analytics cards showing:
  - Total users
  - Active users today (dummy)
  - Total workouts
  - Total calories burned
- Top users table with name, last active date, and total workouts
- Simple user management panel:
  - Edit basic user stats directly in the table
  - Delete users from the dummy/localStorage dataset
- Weekly activity bar chart using localStorage-backed demo data

### 🔔 In-App Notifications
- Notification service backed by `localStorage`
- Automatic smart notifications based on daily activity vs goals:
  - **Workout reminder** if you are very inactive
  - **You missed your goal today** when you are far from the step target
- Recent notifications are surfaced on the main dashboard in a dedicated card

### 🏅 Achievement System (Badges)
- Achievement engine that computes badges from stored `daily_activities`
- Currently includes three core achievements:
  - **First Workout** – unlocked after completing your first workout
  - **7-Day Streak** – logged workouts seven days in a row
  - **1000 Calories Burned** – cumulative calories across days ≥ 1000
- Achievements are stored persistently and rendered as badge cards on the dashboard with locked/unlocked states

### 🍎 Diet Management
- **Daily Meal Planner**
  - Breakfast, Lunch, Snacks, Dinner sections
  - Calorie tracking per meal
  - Total daily calorie progress
- **Meal Item Management**
  - Add custom food items
  - Track macronutrients (Protein, Carbs, Fats)
  - Automatic calorie calculation from macros
  - Delete meal items
- **Calorie Calculator**
  - Visual progress indicators
  - Daily calorie goal tracking

### ⚙️ Settings
- **Profile Management**
  - Edit name, age, weight, height
  - BMI calculator
  - Fitness goal selection
  - Daily step and calorie goals
- **Preferences**
  - Dark mode toggle
  - Notification settings
- **Account Actions**
  - Save profile changes
  - Logout functionality

## 🎨 Design Highlights

### Modern UI/UX
- **Apple Fitness Inspired Design**
- Vibrant gradient colors throughout
- Smooth page transitions and animations
- Responsive layout for all screen sizes
- Glass morphism effects
- Rounded cards with consistent spacing

### Animations
- Fade in/out effects
- Slide up transitions
- Scale animations
- Pulse effects on active elements
- Stagger animations for list items

### Color Gradients
- Primary: Purple-Blue gradient (#667eea → #764ba2)
- Success: Green-Cyan gradient (#43e97b → #38f9d7)
- Warning: Pink-Red gradient (#f093fb → #f5576c)
- Info: Blue-Cyan gradient (#4facfe → #00f2fe)
- Custom gradients for each workout category

### Dark Mode Support
- Full dark theme implementation
- Automatic system preference detection
- Manual toggle in settings
- Optimized colors for dark backgrounds

## 🏗️ Architecture

### Standalone Components
- **No NgModule** - Using latest Angular standalone architecture
- Component-based routing
- Lazy loading for optimal performance

### State Management
- **Angular Signals** for reactive state
- Computed values for derived state
- Signal-based components throughout

### Services
- `AuthService` - User authentication and profile management
- `StorageService` - LocalStorage abstraction
- `ActivityService` - Daily and weekly activity tracking
- `WorkoutService` - Workout library and session management
- `DietService` - Meal planning and calorie tracking
- `ThemeService` - Dark mode management
 - `AdaptiveEngineService` - AI adaptive fitness engine and goal prediction
 - `VoiceTrainerService` - Voice-based workout commands
 - `FormChecker` logic - Camera-based posture checker (TF.js pose detection via CDN)
 - `AccountabilityService` - Social penalty / skip tracking
 - `NotificationService` - LocalStorage-backed in-app notifications
 - `AchievementService` - Badge tracking for milestones

### Data Models
- `User` - User profile and preferences
- `Workout` - Workout definition with exercises
- `WorkoutSession` - Workout tracking session
- `Meal` & `MealItem` - Diet planning models
- `DailyActivity` - Activity metrics
- `WeeklyProgress` - Aggregated weekly stats

## 📁 Project Structure

```
mangalam/src/app/
├── models/               # TypeScript interfaces
│   ├── user.model.ts
│   ├── workout.model.ts
│   └── diet.model.ts
├── services/             # Business logic services
│   ├── auth.service.ts
│   ├── storage.service.ts
│   ├── activity.service.ts
│   ├── workout.service.ts
│   ├── diet.service.ts
│   └── theme.service.ts
├── login/                # Login/Signup page
├── dashboard/            # Main dashboard page
├── workouts/             # Workout library page
├── workout-timer/        # Workout session timer
├── diet/                 # Diet planning page
├── settings/             # User settings page
└── tabs/                 # Tab navigation
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Ionic CLI

### Installation

```bash
# Navigate to project directory
cd mangalam

# Install dependencies
npm install

# Run the app
ionic serve
```

### Build for Production

```bash
# Build web version
ionic build --prod

# Build for Android
ionic capacitor add android
ionic capacitor build android

# Build for iOS
ionic capacitor add ios
ionic capacitor build ios
```

## 🎯 Usage

### First Time Setup
1. Launch the app - you'll see the **Login** page
2. Click **Sign Up** to create a new account
3. Enter your name, email, and password
4. After signup, you'll be redirected to the **Dashboard**

### Tracking Workouts
1. Navigate to **Workouts** tab
2. Browse workouts by category
3. Select a workout and click **Start Workout**
4. Use the timer to track your session
5. Click **Complete** when finished

#### Social Accountability Penalty
- On the **Workouts** tab, use the **"I’m Skipping Today"** button when you decide to skip
- The app records a skip event and treats it as a social penalty where your friend would be notified, adding fun pressure to stay consistent

#### Voice-Based Workout Trainer
- On the **Workouts** tab, tap the **Voice Trainer** button and say commands like:
  - "Start chest workout" / "Start legs workout" to open a workout
- On the **Workout Timer** screen, enable Voice Trainer and say:
  - "Start workout", "Next exercise", "Pause workout", "Resume workout", "Stop workout"

### Managing Diet
1. Navigate to **Diet** tab
2. Click **Add Item** on any meal section
3. Enter food name, calories, and macros
4. View your daily calorie progress

### Customizing Profile
1. Navigate to **Settings** tab
2. Update your personal information
3. Set fitness goals and daily targets
4. Toggle dark mode
5. Click **Save Changes**

### Camera-Based Form Checker
1. Navigate to `/tabs/form-checker` in the app (or from a button you add to workouts)
2. Allow camera access when prompted
3. Stand side-on so your shoulders and hips are visible
4. The app will highlight your spine and tell you if your back looks straight or needs correction

## 🛠️ Technologies Used

- **Ionic Framework 7+**
- **Angular 17+ (Standalone)**
- **TypeScript**
- **Ionicons**
- **SCSS/Sass**
- **LocalStorage API**
- **Angular Signals**

## 🎨 Customization

### Changing Colors
Edit `src/theme/variables.scss`:
```scss
--ion-color-primary: #yourcolor;
--gradient-primary: linear-gradient(135deg, #color1, #color2);
```

### Adding Workouts
Edit `src/app/services/workout.service.ts`:
```typescript
{
  id: 'unique-id',
  title: 'Your Workout',
  category: 'Category',
  duration: 30,
  caloriesPerMinute: 8,
  difficulty: 'Intermediate',
  // ... add exercises
}
```

## 📱 Screenshots

The app features:
- Vibrant gradient login screen
- Animated dashboard with activity cards
- Categorized workout library
- Interactive workout timer
- Meal planning interface
- Comprehensive settings page
- Beautiful dark mode throughout

## 🤝 Contributing

This is a demonstration project showcasing modern Ionic Angular development practices. Feel free to use it as a template for your own fitness applications!

## 📄 License

This project is created for educational and demonstration purposes.

## 🙏 Acknowledgments

- Ionic Framework Team for the excellent components
- Ionicons for the beautiful icon set
- Inspiration from Apple Fitness and modern fitness apps

---

**Built with ❤️ using Ionic Angular Standalone Components**

🎉 **Happy Tracking!** 💪
