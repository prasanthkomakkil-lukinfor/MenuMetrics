/*
  # RestOS POS - Core Business & Auth Tables

  ## New Tables Created
  
  ### 1. businesses
  - `id` (uuid, primary key)
  - `name` (text) - Restaurant name
  - `plan` (text) - Subscription plan: starter, growth, pro, enterprise
  - `trial_ends_at` (timestamptz) - Trial expiry date
  - `logo_url` (text) - Restaurant logo
  - `theme_color` (text) - Brand color
  - `gst_number` (text) - GST registration
  - `address` (text)
  - `phone` (text)
  - `email` (text)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 2. staff
  - `id` (uuid, primary key)
  - `business_id` (uuid, foreign key)
  - `user_id` (uuid, foreign key to auth.users)
  - `name` (text)
  - `role` (text) - owner, manager, supervisor, waiter, cashier, kitchen
  - `pin` (text) - 4-digit PIN for approvals
  - `is_active` (boolean)
  - `created_at` (timestamptz)

  ## Security
  - RLS enabled on all tables
  - Policies for authenticated users based on business ownership
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Businesses table
CREATE TABLE IF NOT EXISTS businesses (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  plan text NOT NULL DEFAULT 'starter' CHECK (plan IN ('starter', 'growth', 'pro', 'enterprise')),
  trial_ends_at timestamptz DEFAULT (now() + interval '14 days'),
  logo_url text,
  theme_color text DEFAULT '#F59E0B',
  gst_number text,
  address text,
  phone text,
  email text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Staff table
CREATE TABLE IF NOT EXISTS staff (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  role text NOT NULL CHECK (role IN ('owner', 'manager', 'supervisor', 'waiter', 'cashier', 'kitchen')),
  pin text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(business_id, user_id)
);

-- Enable RLS
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

-- Businesses policies
CREATE POLICY "Users can view their own business"
  ON businesses FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT business_id FROM staff WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own business"
  ON businesses FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT business_id FROM staff WHERE user_id = auth.uid() AND role IN ('owner', 'manager')
    )
  )
  WITH CHECK (
    id IN (
      SELECT business_id FROM staff WHERE user_id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

-- Staff policies
CREATE POLICY "Staff can view own business staff"
  ON staff FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM staff WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Owners and managers can manage staff"
  ON staff FOR ALL
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM staff WHERE user_id = auth.uid() AND role IN ('owner', 'manager')
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM staff WHERE user_id = auth.uid() AND role IN ('owner', 'manager')
    )
  );
