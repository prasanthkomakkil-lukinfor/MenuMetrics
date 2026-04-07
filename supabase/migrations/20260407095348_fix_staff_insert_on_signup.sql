/*
  # Fix Staff Insert During Signup

  1. Changes
    - Drop restrictive INSERT policy on staff table
    - Add new INSERT policy that allows authenticated users to create their own staff record
    - This enables signup to work properly

  2. Security
    - Users can only insert their own staff record (where user_id = auth.uid())
    - Prevents users from creating staff records for other users
*/

DROP POLICY IF EXISTS "Staff can insert own record" ON staff;

CREATE POLICY "Authenticated users can insert own staff record"
  ON staff FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
