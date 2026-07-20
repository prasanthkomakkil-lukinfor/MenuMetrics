/*
  # Add loyalty transactions and staff attendance tables

  1. New Tables
  - `loyalty_transactions` — points earn/redeem ledger per customer
  - `staff_attendance` — daily check-in/check-out with shift info
  2. Security — RLS with business_id ownership via staff table join
*/

CREATE TABLE IF NOT EXISTS loyalty_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  bill_id uuid REFERENCES bills(id) ON DELETE SET NULL,
  type text NOT NULL,
  points integer NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_loyalty_tx" ON loyalty_transactions;
CREATE POLICY "select_own_loyalty_tx" ON loyalty_transactions FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM staff WHERE staff.business_id = loyalty_transactions.business_id AND staff.user_id = auth.uid()));
DROP POLICY IF EXISTS "insert_own_loyalty_tx" ON loyalty_transactions;
CREATE POLICY "insert_own_loyalty_tx" ON loyalty_transactions FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM staff WHERE staff.business_id = loyalty_transactions.business_id AND staff.user_id = auth.uid()));
DROP POLICY IF EXISTS "update_own_loyalty_tx" ON loyalty_transactions;
CREATE POLICY "update_own_loyalty_tx" ON loyalty_transactions FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM staff WHERE staff.business_id = loyalty_transactions.business_id AND staff.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM staff WHERE staff.business_id = loyalty_transactions.business_id AND staff.user_id = auth.uid()));
DROP POLICY IF EXISTS "delete_own_loyalty_tx" ON loyalty_transactions;
CREATE POLICY "delete_own_loyalty_tx" ON loyalty_transactions FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM staff WHERE staff.business_id = loyalty_transactions.business_id AND staff.user_id = auth.uid()));

CREATE TABLE IF NOT EXISTS staff_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  check_in timestamptz,
  check_out timestamptz,
  shift text DEFAULT 'morning',
  status text DEFAULT 'present',
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE staff_attendance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_attendance" ON staff_attendance;
CREATE POLICY "select_own_attendance" ON staff_attendance FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM staff WHERE staff.business_id = staff_attendance.business_id AND staff.user_id = auth.uid()));
DROP POLICY IF EXISTS "insert_own_attendance" ON staff_attendance;
CREATE POLICY "insert_own_attendance" ON staff_attendance FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM staff WHERE staff.business_id = staff_attendance.business_id AND staff.user_id = auth.uid()));
DROP POLICY IF EXISTS "update_own_attendance" ON staff_attendance;
CREATE POLICY "update_own_attendance" ON staff_attendance FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM staff WHERE staff.business_id = staff_attendance.business_id AND staff.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM staff WHERE staff.business_id = staff_attendance.business_id AND staff.user_id = auth.uid()));
DROP POLICY IF EXISTS "delete_own_attendance" ON staff_attendance;
CREATE POLICY "delete_own_attendance" ON staff_attendance FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM staff WHERE staff.business_id = staff_attendance.business_id AND staff.user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_loyalty_tx_customer ON loyalty_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_attendance_staff_date ON staff_attendance(staff_id, date);
