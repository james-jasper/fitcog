# FitCog 🏋️

Gym management app with member portal, trainer portal, and admin panel.

## Stack
- React + Vite
- Supabase (Auth + Database)
- Razorpay (mock payment)

## Setup

### 1. Supabase
1. Create a project at supabase.com
2. Go to SQL Editor and run the SQL in `SUPABASE_SCHEMA_AND_SETUP.js`
3. Enable Google OAuth in Authentication > Providers
4. Add your site URL to Authentication > URL Configuration

### 2. Environment
```
cp .env.example .env
# Fill in your Supabase URL and anon key
```

### 3. Run
```
npm install
npm run dev
```

## Routes
- `/` — Member login/signup
- `/dashboard` — Member dashboard (sessions, streak, bookings)
- `/book` — Book a session with a trainer
- `/subscription` — View and purchase plans
- `/trainer` — Trainer login & schedule
- `/admin` — Admin panel (password: fitcog_admin_2024)

## Plans
- Starter: ₹8,000 / 12 sessions
- Premium: ₹16,000 / 30 sessions

## Booking Rules
- Cannot book within 30 minutes of a session start time
- Cannot book an already-taken slot
- Requires active subscription
