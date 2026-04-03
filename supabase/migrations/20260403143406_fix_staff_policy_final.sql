/*
  # Fix Staff Policy Recursion - Final Fix

  ## Problem
  The "Staff can view own business staff" policy still queries the staff table,
  causing infinite recursion when loading user data.
  
  ## Solution
  Simplify the SELECT policy to only check user_id match.
  After signup, the helper functions will handle business-level access.
*/

-- Drop the problematic policy
DROP POLICY IF EXISTS "Staff can view own business staff" ON staff;

-- Create a simple, non-recursive SELECT policy
CREATE POLICY "Staff can view own record"
  ON staff FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Add a separate policy for viewing business staff using the helper function
CREATE POLICY "Staff can view business colleagues"
  ON staff FOR SELECT TO authenticated
  USING (business_id = get_user_business_id());
