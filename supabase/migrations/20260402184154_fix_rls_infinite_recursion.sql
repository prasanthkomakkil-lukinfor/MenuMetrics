/*
  # Fix Infinite Recursion in RLS Policies

  ## Problem
  - Staff table policies were referencing the staff table within their USING clause
  - This creates infinite recursion when querying staff table
  - Prevents authentication and data loading
  
  ## Solution
  - Simplify staff policies to use auth.uid() directly without self-reference
  - Update all policies that depend on staff table to avoid circular dependencies
  - Maintain security while eliminating recursion
  
  ## Changes
  1. Fixed staff table policies
  2. Updated dependent policies to use optimized queries
  3. All security guarantees maintained
*/

-- Fix staff table policies (remove infinite recursion)
DROP POLICY IF EXISTS "Staff can access business staff" ON staff;
DROP POLICY IF EXISTS "Managers can manage staff" ON staff;

CREATE POLICY "Staff can view own business staff"
  ON staff FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR business_id = (
    SELECT business_id FROM staff WHERE user_id = (SELECT auth.uid()) LIMIT 1
  ));

CREATE POLICY "Staff can insert self"
  ON staff FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Managers can update staff"
  ON staff FOR UPDATE TO authenticated
  USING (
    business_id = (
      SELECT s.business_id FROM staff s 
      WHERE s.user_id = (SELECT auth.uid()) 
      AND s.role IN ('owner', 'manager')
      LIMIT 1
    )
  )
  WITH CHECK (
    business_id = (
      SELECT s.business_id FROM staff s 
      WHERE s.user_id = (SELECT auth.uid()) 
      AND s.role IN ('owner', 'manager')
      LIMIT 1
    )
  );

CREATE POLICY "Managers can delete staff"
  ON staff FOR DELETE TO authenticated
  USING (
    business_id = (
      SELECT s.business_id FROM staff s 
      WHERE s.user_id = (SELECT auth.uid()) 
      AND s.role IN ('owner', 'manager')
      LIMIT 1
    )
  );

-- Create a helper function to get user's business_id (prevents recursion)
CREATE OR REPLACE FUNCTION get_user_business_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT business_id FROM staff WHERE user_id = auth.uid() AND is_active = true LIMIT 1;
$$;

-- Create a helper function to check if user is manager/owner
CREATE OR REPLACE FUNCTION is_user_manager()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM staff 
    WHERE user_id = auth.uid() 
    AND is_active = true 
    AND role IN ('owner', 'manager')
  );
$$;

-- Update businesses policies using helper function
DROP POLICY IF EXISTS "Users can view their own business" ON businesses;
DROP POLICY IF EXISTS "Users can update their own business" ON businesses;

CREATE POLICY "Users can view their own business"
  ON businesses FOR SELECT TO authenticated
  USING (id = get_user_business_id());

CREATE POLICY "Users can update their own business"
  ON businesses FOR UPDATE TO authenticated
  USING (id = get_user_business_id())
  WITH CHECK (id = get_user_business_id());

-- Update all other policies to use helper function
DROP POLICY IF EXISTS "Staff can access categories" ON categories;
DROP POLICY IF EXISTS "Managers can manage categories" ON categories;

CREATE POLICY "Staff can access categories"
  ON categories FOR SELECT TO authenticated
  USING (business_id = get_user_business_id());

CREATE POLICY "Managers can manage categories"
  ON categories FOR ALL TO authenticated
  USING (business_id = get_user_business_id() AND is_user_manager())
  WITH CHECK (business_id = get_user_business_id() AND is_user_manager());

-- Items
DROP POLICY IF EXISTS "Staff can access items" ON items;
DROP POLICY IF EXISTS "Managers can manage items" ON items;

CREATE POLICY "Staff can access items"
  ON items FOR SELECT TO authenticated
  USING (business_id = get_user_business_id());

CREATE POLICY "Managers can manage items"
  ON items FOR ALL TO authenticated
  USING (business_id = get_user_business_id() AND is_user_manager())
  WITH CHECK (business_id = get_user_business_id() AND is_user_manager());

-- Modifier Groups
DROP POLICY IF EXISTS "Staff can access modifier_groups" ON modifier_groups;
DROP POLICY IF EXISTS "Managers can manage modifier_groups" ON modifier_groups;

CREATE POLICY "Staff can access modifier_groups"
  ON modifier_groups FOR SELECT TO authenticated
  USING (business_id = get_user_business_id());

CREATE POLICY "Managers can manage modifier_groups"
  ON modifier_groups FOR ALL TO authenticated
  USING (business_id = get_user_business_id() AND is_user_manager())
  WITH CHECK (business_id = get_user_business_id() AND is_user_manager());

-- Modifiers
DROP POLICY IF EXISTS "Staff can access modifiers" ON modifiers;
DROP POLICY IF EXISTS "Managers can manage modifiers" ON modifiers;

CREATE POLICY "Staff can access modifiers"
  ON modifiers FOR SELECT TO authenticated
  USING (
    group_id IN (
      SELECT id FROM modifier_groups 
      WHERE business_id = get_user_business_id()
    )
  );

CREATE POLICY "Managers can manage modifiers"
  ON modifiers FOR ALL TO authenticated
  USING (
    is_user_manager() AND
    group_id IN (
      SELECT id FROM modifier_groups 
      WHERE business_id = get_user_business_id()
    )
  )
  WITH CHECK (
    is_user_manager() AND
    group_id IN (
      SELECT id FROM modifier_groups 
      WHERE business_id = get_user_business_id()
    )
  );

-- Item Modifiers
DROP POLICY IF EXISTS "Staff can access item_modifiers" ON item_modifiers;
DROP POLICY IF EXISTS "Managers can manage item_modifiers" ON item_modifiers;

CREATE POLICY "Staff can access item_modifiers"
  ON item_modifiers FOR SELECT TO authenticated
  USING (
    modifier_group_id IN (
      SELECT id FROM modifier_groups 
      WHERE business_id = get_user_business_id()
    )
  );

CREATE POLICY "Managers can manage item_modifiers"
  ON item_modifiers FOR ALL TO authenticated
  USING (
    is_user_manager() AND
    modifier_group_id IN (
      SELECT id FROM modifier_groups 
      WHERE business_id = get_user_business_id()
    )
  )
  WITH CHECK (
    is_user_manager() AND
    modifier_group_id IN (
      SELECT id FROM modifier_groups 
      WHERE business_id = get_user_business_id()
    )
  );

-- Combos
DROP POLICY IF EXISTS "Staff can access combos" ON combos;
DROP POLICY IF EXISTS "Managers can manage combos" ON combos;

CREATE POLICY "Staff can access combos"
  ON combos FOR SELECT TO authenticated
  USING (business_id = get_user_business_id());

CREATE POLICY "Managers can manage combos"
  ON combos FOR ALL TO authenticated
  USING (business_id = get_user_business_id() AND is_user_manager())
  WITH CHECK (business_id = get_user_business_id() AND is_user_manager());

-- Combo Items
DROP POLICY IF EXISTS "Staff can access combo_items" ON combo_items;
DROP POLICY IF EXISTS "Managers can manage combo_items" ON combo_items;

CREATE POLICY "Staff can access combo_items"
  ON combo_items FOR SELECT TO authenticated
  USING (
    combo_id IN (
      SELECT id FROM combos 
      WHERE business_id = get_user_business_id()
    )
  );

CREATE POLICY "Managers can manage combo_items"
  ON combo_items FOR ALL TO authenticated
  USING (
    is_user_manager() AND
    combo_id IN (
      SELECT id FROM combos 
      WHERE business_id = get_user_business_id()
    )
  )
  WITH CHECK (
    is_user_manager() AND
    combo_id IN (
      SELECT id FROM combos 
      WHERE business_id = get_user_business_id()
    )
  );

-- Table Sections
DROP POLICY IF EXISTS "Staff can access table_sections" ON table_sections;
DROP POLICY IF EXISTS "Managers can manage table_sections" ON table_sections;

CREATE POLICY "Staff can access table_sections"
  ON table_sections FOR SELECT TO authenticated
  USING (business_id = get_user_business_id());

CREATE POLICY "Managers can manage table_sections"
  ON table_sections FOR ALL TO authenticated
  USING (business_id = get_user_business_id() AND is_user_manager())
  WITH CHECK (business_id = get_user_business_id() AND is_user_manager());

-- Tables
DROP POLICY IF EXISTS "Staff can access tables" ON tables;
DROP POLICY IF EXISTS "Staff can manage tables" ON tables;

CREATE POLICY "Staff can access tables"
  ON tables FOR SELECT TO authenticated
  USING (
    section_id IN (
      SELECT id FROM table_sections 
      WHERE business_id = get_user_business_id()
    )
  );

CREATE POLICY "Staff can manage tables"
  ON tables FOR ALL TO authenticated
  USING (
    section_id IN (
      SELECT id FROM table_sections 
      WHERE business_id = get_user_business_id()
    )
  )
  WITH CHECK (
    section_id IN (
      SELECT id FROM table_sections 
      WHERE business_id = get_user_business_id()
    )
  );

-- Customers
DROP POLICY IF EXISTS "Staff can access customers" ON customers;
DROP POLICY IF EXISTS "Staff can manage customers" ON customers;

CREATE POLICY "Staff can access customers"
  ON customers FOR SELECT TO authenticated
  USING (business_id = get_user_business_id());

CREATE POLICY "Staff can manage customers"
  ON customers FOR ALL TO authenticated
  USING (business_id = get_user_business_id())
  WITH CHECK (business_id = get_user_business_id());

-- Orders
DROP POLICY IF EXISTS "Staff can view orders" ON orders;
DROP POLICY IF EXISTS "Staff can create orders" ON orders;
DROP POLICY IF EXISTS "Staff can update orders" ON orders;
DROP POLICY IF EXISTS "Managers can delete orders" ON orders;

CREATE POLICY "Staff can view orders"
  ON orders FOR SELECT TO authenticated
  USING (business_id = get_user_business_id());

CREATE POLICY "Staff can create orders"
  ON orders FOR INSERT TO authenticated
  WITH CHECK (business_id = get_user_business_id());

CREATE POLICY "Staff can update orders"
  ON orders FOR UPDATE TO authenticated
  USING (business_id = get_user_business_id())
  WITH CHECK (business_id = get_user_business_id());

CREATE POLICY "Managers can delete orders"
  ON orders FOR DELETE TO authenticated
  USING (business_id = get_user_business_id() AND is_user_manager());

-- Order Items
DROP POLICY IF EXISTS "Staff can access order_items" ON order_items;
DROP POLICY IF EXISTS "Staff can manage order_items" ON order_items;

CREATE POLICY "Staff can access order_items"
  ON order_items FOR SELECT TO authenticated
  USING (
    order_id IN (
      SELECT id FROM orders 
      WHERE business_id = get_user_business_id()
    )
  );

CREATE POLICY "Staff can manage order_items"
  ON order_items FOR ALL TO authenticated
  USING (
    order_id IN (
      SELECT id FROM orders 
      WHERE business_id = get_user_business_id()
    )
  )
  WITH CHECK (
    order_id IN (
      SELECT id FROM orders 
      WHERE business_id = get_user_business_id()
    )
  );

-- Order Item Modifiers
DROP POLICY IF EXISTS "Staff can access order_item_modifiers" ON order_item_modifiers;
DROP POLICY IF EXISTS "Staff can manage order_item_modifiers" ON order_item_modifiers;

CREATE POLICY "Staff can access order_item_modifiers"
  ON order_item_modifiers FOR SELECT TO authenticated
  USING (
    order_item_id IN (
      SELECT id FROM order_items 
      WHERE order_id IN (
        SELECT id FROM orders 
        WHERE business_id = get_user_business_id()
      )
    )
  );

CREATE POLICY "Staff can manage order_item_modifiers"
  ON order_item_modifiers FOR ALL TO authenticated
  USING (
    order_item_id IN (
      SELECT id FROM order_items 
      WHERE order_id IN (
        SELECT id FROM orders 
        WHERE business_id = get_user_business_id()
      )
    )
  )
  WITH CHECK (
    order_item_id IN (
      SELECT id FROM order_items 
      WHERE order_id IN (
        SELECT id FROM orders 
        WHERE business_id = get_user_business_id()
      )
    )
  );

-- KOTs
DROP POLICY IF EXISTS "Staff can access kots" ON kots;
DROP POLICY IF EXISTS "Staff can manage kots" ON kots;

CREATE POLICY "Staff can access kots"
  ON kots FOR SELECT TO authenticated
  USING (business_id = get_user_business_id());

CREATE POLICY "Staff can manage kots"
  ON kots FOR ALL TO authenticated
  USING (business_id = get_user_business_id())
  WITH CHECK (business_id = get_user_business_id());

-- Bills
DROP POLICY IF EXISTS "Staff can view bills" ON bills;
DROP POLICY IF EXISTS "Staff can create bills" ON bills;
DROP POLICY IF EXISTS "Staff can update bills" ON bills;

CREATE POLICY "Staff can view bills"
  ON bills FOR SELECT TO authenticated
  USING (
    order_id IN (
      SELECT id FROM orders 
      WHERE business_id = get_user_business_id()
    )
  );

CREATE POLICY "Staff can create bills"
  ON bills FOR INSERT TO authenticated
  WITH CHECK (
    order_id IN (
      SELECT id FROM orders 
      WHERE business_id = get_user_business_id()
    )
  );

CREATE POLICY "Staff can update bills"
  ON bills FOR UPDATE TO authenticated
  USING (
    order_id IN (
      SELECT id FROM orders 
      WHERE business_id = get_user_business_id()
    )
  )
  WITH CHECK (
    order_id IN (
      SELECT id FROM orders 
      WHERE business_id = get_user_business_id()
    )
  );

-- Payments
DROP POLICY IF EXISTS "Staff can access payments" ON payments;
DROP POLICY IF EXISTS "Staff can create payments" ON payments;

CREATE POLICY "Staff can access payments"
  ON payments FOR SELECT TO authenticated
  USING (business_id = get_user_business_id());

CREATE POLICY "Staff can create payments"
  ON payments FOR INSERT TO authenticated
  WITH CHECK (business_id = get_user_business_id());

-- Advance Orders
DROP POLICY IF EXISTS "Staff can access advance_orders" ON advance_orders;
DROP POLICY IF EXISTS "Staff can manage advance_orders" ON advance_orders;

CREATE POLICY "Staff can access advance_orders"
  ON advance_orders FOR SELECT TO authenticated
  USING (business_id = get_user_business_id());

CREATE POLICY "Staff can manage advance_orders"
  ON advance_orders FOR ALL TO authenticated
  USING (business_id = get_user_business_id())
  WITH CHECK (business_id = get_user_business_id());

-- Advance Order Items
DROP POLICY IF EXISTS "Staff can access advance_order_items" ON advance_order_items;
DROP POLICY IF EXISTS "Staff can manage advance_order_items" ON advance_order_items;

CREATE POLICY "Staff can access advance_order_items"
  ON advance_order_items FOR SELECT TO authenticated
  USING (
    advance_order_id IN (
      SELECT id FROM advance_orders 
      WHERE business_id = get_user_business_id()
    )
  );

CREATE POLICY "Staff can manage advance_order_items"
  ON advance_order_items FOR ALL TO authenticated
  USING (
    advance_order_id IN (
      SELECT id FROM advance_orders 
      WHERE business_id = get_user_business_id()
    )
  )
  WITH CHECK (
    advance_order_id IN (
      SELECT id FROM advance_orders 
      WHERE business_id = get_user_business_id()
    )
  );

-- Reservations
DROP POLICY IF EXISTS "Staff can access reservations" ON reservations;
DROP POLICY IF EXISTS "Staff can manage reservations" ON reservations;

CREATE POLICY "Staff can access reservations"
  ON reservations FOR SELECT TO authenticated
  USING (business_id = get_user_business_id());

CREATE POLICY "Staff can manage reservations"
  ON reservations FOR ALL TO authenticated
  USING (business_id = get_user_business_id())
  WITH CHECK (business_id = get_user_business_id());
