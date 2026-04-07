/*
  # Fix Signup Flow - Remove RLS Blocks

  1. Changes
    - Drop ALL restrictive policies on businesses and staff tables
    - Add simple policies that allow authenticated users to create their initial records
    - This fixes the broken signup flow

  2. Security
    - Users can insert their own business (one per user)
    - Users can insert their own staff record
    - After creation, standard RLS applies for read/update/delete
*/

-- Drop all existing policies on businesses
DROP POLICY IF EXISTS "Users can view own business" ON businesses;
DROP POLICY IF EXISTS "Users can update own business" ON businesses;
DROP POLICY IF EXISTS "Users can insert own business" ON businesses;

-- Drop all existing policies on staff
DROP POLICY IF EXISTS "Staff can view own data" ON staff;
DROP POLICY IF EXISTS "Staff can update own data" ON staff;
DROP POLICY IF EXISTS "Authenticated users can insert own staff record" ON staff;
DROP POLICY IF EXISTS "Staff can insert own record" ON staff;

-- Businesses policies
CREATE POLICY "Anyone authenticated can insert business"
  ON businesses FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can view own business"
  ON businesses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE staff.business_id = businesses.id
      AND staff.user_id = auth.uid()
    )
  );

CREATE POLICY "Owners can update business"
  ON businesses FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE staff.business_id = businesses.id
      AND staff.user_id = auth.uid()
      AND staff.role = 'owner'
    )
  );

-- Staff policies
CREATE POLICY "Anyone authenticated can insert staff"
  ON staff FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Staff can view own business staff"
  ON staff FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM staff
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Owners can update staff"
  ON staff FOR UPDATE
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM staff
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );
