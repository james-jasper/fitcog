import { createClient } from '@supabase/supabase-js'

// Replace these with your actual Supabase project credentials
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co'
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

/*
============================
  SUPABASE SQL SCHEMA
  Run this in your Supabase SQL editor
============================

-- Trainers table (managed by admin)
CREATE TABLE trainers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,  -- store hashed in production
  name TEXT NOT NULL,
  specialization TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscriptions table
CREATE TABLE subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL CHECK (plan IN ('basic', 'premium')),
  total_sessions INT NOT NULL,
  sessions_used INT DEFAULT 0,
  amount INT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired')),
  start_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bookings table
CREATE TABLE bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  trainer_id UUID REFERENCES trainers(id),
  booking_date DATE NOT NULL,
  time_slot TEXT NOT NULL,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(trainer_id, booking_date, time_slot)
);

-- Insert sample trainers
INSERT INTO trainers (username, password, name, specialization) VALUES
  ('trainer_arjun', 'fitcog123', 'Arjun Sharma', 'Strength & Conditioning'),
  ('trainer_priya', 'fitcog123', 'Priya Nair', 'Yoga & Flexibility'),
  ('trainer_rahul', 'fitcog123', 'Rahul Mehta', 'HIIT & Cardio');

-- Enable Row Level Security
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can see own subscriptions" ON subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own subscriptions" ON subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can see own bookings" ON bookings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own bookings" ON bookings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Anyone can see trainers" ON trainers FOR SELECT USING (true);
CREATE POLICY "Anyone can see all bookings for slot check" ON bookings FOR SELECT USING (true);

*/
