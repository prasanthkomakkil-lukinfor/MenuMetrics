/*
  # Fix infinite recursion in RLS policies

  1. Changes
    - Drop ALL existing policies on staff, businesses, and all related tables
    - Recreate them using SECURITY DEFINER functions instead of subqueries on staff
    - This eliminates the infinite recursion: staff policies no longer query staff

  2. Why
    - RLS policies on staff queried staff itself → infinite recursion → 500 errors
    - businesses policies queried staff → triggered staff policies → recursion
    - Every page was broken because every query failed

  3. Security
    - Uses SECURITY DEFINER functions (get_user_business_id, is_user_manager) 
      which bypass RLS and don't recurse
    - All policies still enforce business-level ownership
*/

-- ============================================================
-- STEP 1: Drop ALL existing policies on staff table
-- ============================================================
DROP POLICY IF EXISTS "Anyone authenticated can insert staff" ON staff;
DROP POLICY IF EXISTS "Managers can delete staff" ON staff;
DROP POLICY IF EXISTS "Managers can insert staff" ON staff;
DROP POLICY IF EXISTS "Managers can update staff" ON staff;
DROP POLICY IF EXISTS "Owners can update staff" ON staff;
DROP POLICY IF EXISTS "Staff can insert self" ON staff;
DROP POLICY IF EXISTS "Staff can view business colleagues" ON staff;
DROP POLICY IF EXISTS "Staff can view own business staff" ON staff;
DROP POLICY IF EXISTS "Staff can view own record" ON staff;

-- ============================================================
-- STEP 2: Drop ALL existing policies on businesses table
-- ============================================================
DROP POLICY IF EXISTS "Users can view own business" ON businesses;
DROP POLICY IF EXISTS "Owners can update business" ON businesses;
DROP POLICY IF EXISTS "Anyone can insert business" ON businesses;
DROP POLICY IF EXISTS "Users can delete own business" ON businesses;

-- ============================================================
-- STEP 3: Recreate businesses policies (no staff subqueries)
-- ============================================================
CREATE POLICY "users_select_own_business" ON businesses
  FOR SELECT TO authenticated
  USING (id = get_user_business_id());

CREATE POLICY "owners_update_own_business" ON businesses
  FOR UPDATE TO authenticated
  USING (id = get_user_business_id())
  WITH CHECK (id = get_user_business_id());

-- ============================================================
-- STEP 4: Recreate staff policies (using functions, no recursion)
-- ============================================================
CREATE POLICY "staff_select_own_colleagues" ON staff
  FOR SELECT TO authenticated
  USING (business_id = get_user_business_id() OR user_id = auth.uid());

CREATE POLICY "staff_insert_self" ON staff
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "managers_insert_staff" ON staff
  FOR INSERT TO authenticated
  WITH CHECK (business_id = get_user_business_id() AND is_user_manager());

CREATE POLICY "managers_update_staff" ON staff
  FOR UPDATE TO authenticated
  USING (business_id = get_user_business_id() AND is_user_manager())
  WITH CHECK (business_id = get_user_business_id() AND is_user_manager());

CREATE POLICY "managers_delete_staff" ON staff
  FOR DELETE TO authenticated
  USING (business_id = get_user_business_id() AND is_user_manager());

-- ============================================================
-- STEP 5: Fix policies on all other tables
-- ============================================================

-- items
DROP POLICY IF EXISTS "Staff can view items" ON items;
DROP POLICY IF EXISTS "Staff can insert items" ON items;
DROP POLICY IF EXISTS "Staff can update items" ON items;
DROP POLICY IF EXISTS "Staff can delete items" ON items;
DROP POLICY IF EXISTS "Anyone authenticated can select items" ON items;
DROP POLICY IF EXISTS "Anyone authenticated can insert items" ON items;
DROP POLICY IF EXISTS "Anyone authenticated can update items" ON items;
DROP POLICY IF EXISTS "Anyone authenticated can delete items" ON items;

CREATE POLICY "items_select_own" ON items FOR SELECT TO authenticated
  USING (business_id = get_user_business_id());
CREATE POLICY "items_insert_own" ON items FOR INSERT TO authenticated
  WITH CHECK (business_id = get_user_business_id());
CREATE POLICY "items_update_own" ON items FOR UPDATE TO authenticated
  USING (business_id = get_user_business_id()) WITH CHECK (business_id = get_user_business_id());
CREATE POLICY "items_delete_own" ON items FOR DELETE TO authenticated
  USING (business_id = get_user_business_id());

-- categories
DROP POLICY IF EXISTS "Staff can view categories" ON categories;
DROP POLICY IF EXISTS "Staff can insert categories" ON categories;
DROP POLICY IF EXISTS "Staff can update categories" ON categories;
DROP POLICY IF EXISTS "Staff can delete categories" ON categories;
DROP POLICY IF EXISTS "Anyone authenticated can select categories" ON categories;
DROP POLICY IF EXISTS "Anyone authenticated can insert categories" ON categories;
DROP POLICY IF EXISTS "Anyone authenticated can update categories" ON categories;
DROP POLICY IF EXISTS "Anyone authenticated can delete categories" ON categories;

CREATE POLICY "categories_select_own" ON categories FOR SELECT TO authenticated
  USING (business_id = get_user_business_id());
CREATE POLICY "categories_insert_own" ON categories FOR INSERT TO authenticated
  WITH CHECK (business_id = get_user_business_id());
CREATE POLICY "categories_update_own" ON categories FOR UPDATE TO authenticated
  USING (business_id = get_user_business_id()) WITH CHECK (business_id = get_user_business_id());
CREATE POLICY "categories_delete_own" ON categories FOR DELETE TO authenticated
  USING (business_id = get_user_business_id());

-- tables
DROP POLICY IF EXISTS "Staff can view tables" ON tables;
DROP POLICY IF EXISTS "Staff can insert tables" ON tables;
DROP POLICY IF EXISTS "Staff can update tables" ON tables;
DROP POLICY IF EXISTS "Staff can delete tables" ON tables;
DROP POLICY IF EXISTS "Anyone authenticated can select tables" ON tables;
DROP POLICY IF EXISTS "Anyone authenticated can insert tables" ON tables;
DROP POLICY IF EXISTS "Anyone authenticated can update tables" ON tables;
DROP POLICY IF EXISTS "Anyone authenticated can delete tables" ON tables;

CREATE POLICY "tables_select_own" ON tables FOR SELECT TO authenticated
  USING (business_id = get_user_business_id());
CREATE POLICY "tables_insert_own" ON tables FOR INSERT TO authenticated
  WITH CHECK (business_id = get_user_business_id());
CREATE POLICY "tables_update_own" ON tables FOR UPDATE TO authenticated
  USING (business_id = get_user_business_id()) WITH CHECK (business_id = get_user_business_id());
CREATE POLICY "tables_delete_own" ON tables FOR DELETE TO authenticated
  USING (business_id = get_user_business_id());

-- table_sections
DROP POLICY IF EXISTS "Staff can view table_sections" ON table_sections;
DROP POLICY IF EXISTS "Staff can insert table_sections" ON table_sections;
DROP POLICY IF EXISTS "Staff can update table_sections" ON table_sections;
DROP POLICY IF EXISTS "Staff can delete table_sections" ON table_sections;
DROP POLICY IF EXISTS "Anyone authenticated can select table_sections" ON table_sections;
DROP POLICY IF EXISTS "Anyone authenticated can insert table_sections" ON table_sections;
DROP POLICY IF EXISTS "Anyone authenticated can update table_sections" ON table_sections;
DROP POLICY IF EXISTS "Anyone authenticated can delete table_sections" ON table_sections;

CREATE POLICY "table_sections_select_own" ON table_sections FOR SELECT TO authenticated
  USING (business_id = get_user_business_id());
CREATE POLICY "table_sections_insert_own" ON table_sections FOR INSERT TO authenticated
  WITH CHECK (business_id = get_user_business_id());
CREATE POLICY "table_sections_update_own" ON table_sections FOR UPDATE TO authenticated
  USING (business_id = get_user_business_id()) WITH CHECK (business_id = get_user_business_id());
CREATE POLICY "table_sections_delete_own" ON table_sections FOR DELETE TO authenticated
  USING (business_id = get_user_business_id());

-- orders
DROP POLICY IF EXISTS "Staff can view orders" ON orders;
DROP POLICY IF EXISTS "Staff can insert orders" ON orders;
DROP POLICY IF EXISTS "Staff can update orders" ON orders;
DROP POLICY IF EXISTS "Staff can delete orders" ON orders;
DROP POLICY IF EXISTS "Anyone authenticated can select orders" ON orders;
DROP POLICY IF EXISTS "Anyone authenticated can insert orders" ON orders;
DROP POLICY IF EXISTS "Anyone authenticated can update orders" ON orders;
DROP POLICY IF EXISTS "Anyone authenticated can delete orders" ON orders;

CREATE POLICY "orders_select_own" ON orders FOR SELECT TO authenticated
  USING (business_id = get_user_business_id());
CREATE POLICY "orders_insert_own" ON orders FOR INSERT TO authenticated
  WITH CHECK (business_id = get_user_business_id());
CREATE POLICY "orders_update_own" ON orders FOR UPDATE TO authenticated
  USING (business_id = get_user_business_id()) WITH CHECK (business_id = get_user_business_id());
CREATE POLICY "orders_delete_own" ON orders FOR DELETE TO authenticated
  USING (business_id = get_user_business_id());

-- order_items
DROP POLICY IF EXISTS "Staff can view order_items" ON order_items;
DROP POLICY IF EXISTS "Staff can insert order_items" ON order_items;
DROP POLICY IF EXISTS "Staff can update order_items" ON order_items;
DROP POLICY IF EXISTS "Staff can delete order_items" ON order_items;
DROP POLICY IF EXISTS "Anyone authenticated can select order_items" ON order_items;
DROP POLICY IF EXISTS "Anyone authenticated can insert order_items" ON order_items;
DROP POLICY IF EXISTS "Anyone authenticated can update order_items" ON order_items;
DROP POLICY IF EXISTS "Anyone authenticated can delete order_items" ON order_items;

CREATE POLICY "order_items_select_own" ON order_items FOR SELECT TO authenticated
  USING (order_id IN (SELECT id FROM orders WHERE business_id = get_user_business_id()));
CREATE POLICY "order_items_insert_own" ON order_items FOR INSERT TO authenticated
  WITH CHECK (order_id IN (SELECT id FROM orders WHERE business_id = get_user_business_id()));
CREATE POLICY "order_items_update_own" ON order_items FOR UPDATE TO authenticated
  USING (order_id IN (SELECT id FROM orders WHERE business_id = get_user_business_id()))
  WITH CHECK (order_id IN (SELECT id FROM orders WHERE business_id = get_user_business_id()));
CREATE POLICY "order_items_delete_own" ON order_items FOR DELETE TO authenticated
  USING (order_id IN (SELECT id FROM orders WHERE business_id = get_user_business_id()));

-- bills
DROP POLICY IF EXISTS "Staff can view bills" ON bills;
DROP POLICY IF EXISTS "Staff can insert bills" ON bills;
DROP POLICY IF EXISTS "Staff can update bills" ON bills;
DROP POLICY IF EXISTS "Staff can delete bills" ON bills;
DROP POLICY IF EXISTS "Anyone authenticated can select bills" ON bills;
DROP POLICY IF EXISTS "Anyone authenticated can insert bills" ON bills;
DROP POLICY IF EXISTS "Anyone authenticated can update bills" ON bills;
DROP POLICY IF EXISTS "Anyone authenticated can delete bills" ON bills;

CREATE POLICY "bills_select_own" ON bills FOR SELECT TO authenticated
  USING (business_id = get_user_business_id());
CREATE POLICY "bills_insert_own" ON bills FOR INSERT TO authenticated
  WITH CHECK (business_id = get_user_business_id());
CREATE POLICY "bills_update_own" ON bills FOR UPDATE TO authenticated
  USING (business_id = get_user_business_id()) WITH CHECK (business_id = get_user_business_id());
CREATE POLICY "bills_delete_own" ON bills FOR DELETE TO authenticated
  USING (business_id = get_user_business_id());

-- payments
DROP POLICY IF EXISTS "Staff can view payments" ON payments;
DROP POLICY IF EXISTS "Staff can insert payments" ON payments;
DROP POLICY IF EXISTS "Staff can update payments" ON payments;
DROP POLICY IF EXISTS "Staff can delete payments" ON payments;
DROP POLICY IF EXISTS "Anyone authenticated can select payments" ON payments;
DROP POLICY IF EXISTS "Anyone authenticated can insert payments" ON payments;
DROP POLICY IF EXISTS "Anyone authenticated can update payments" ON payments;
DROP POLICY IF EXISTS "Anyone authenticated can delete payments" ON payments;

CREATE POLICY "payments_select_own" ON payments FOR SELECT TO authenticated
  USING (business_id = get_user_business_id());
CREATE POLICY "payments_insert_own" ON payments FOR INSERT TO authenticated
  WITH CHECK (business_id = get_user_business_id());
CREATE POLICY "payments_update_own" ON payments FOR UPDATE TO authenticated
  USING (business_id = get_user_business_id()) WITH CHECK (business_id = get_user_business_id());
CREATE POLICY "payments_delete_own" ON payments FOR DELETE TO authenticated
  USING (business_id = get_user_business_id());

-- kots
DROP POLICY IF EXISTS "Staff can view kots" ON kots;
DROP POLICY IF EXISTS "Staff can insert kots" ON kots;
DROP POLICY IF EXISTS "Staff can update kots" ON kots;
DROP POLICY IF EXISTS "Staff can delete kots" ON kots;
DROP POLICY IF EXISTS "Anyone authenticated can select kots" ON kots;
DROP POLICY IF EXISTS "Anyone authenticated can insert kots" ON kots;
DROP POLICY IF EXISTS "Anyone authenticated can update kots" ON kots;
DROP POLICY IF EXISTS "Anyone authenticated can delete kots" ON kots;

CREATE POLICY "kots_select_own" ON kots FOR SELECT TO authenticated
  USING (business_id = get_user_business_id());
CREATE POLICY "kots_insert_own" ON kots FOR INSERT TO authenticated
  WITH CHECK (business_id = get_user_business_id());
CREATE POLICY "kots_update_own" ON kots FOR UPDATE TO authenticated
  USING (business_id = get_user_business_id()) WITH CHECK (business_id = get_user_business_id());
CREATE POLICY "kots_delete_own" ON kots FOR DELETE TO authenticated
  USING (business_id = get_user_business_id());

-- customers
DROP POLICY IF EXISTS "Staff can view customers" ON customers;
DROP POLICY IF EXISTS "Staff can insert customers" ON customers;
DROP POLICY IF EXISTS "Staff can update customers" ON customers;
DROP POLICY IF EXISTS "Staff can delete customers" ON customers;
DROP POLICY IF EXISTS "Anyone authenticated can select customers" ON customers;
DROP POLICY IF EXISTS "Anyone authenticated can insert customers" ON customers;
DROP POLICY IF EXISTS "Anyone authenticated can update customers" ON customers;
DROP POLICY IF EXISTS "Anyone authenticated can delete customers" ON customers;

CREATE POLICY "customers_select_own" ON customers FOR SELECT TO authenticated
  USING (business_id = get_user_business_id());
CREATE POLICY "customers_insert_own" ON customers FOR INSERT TO authenticated
  WITH CHECK (business_id = get_user_business_id());
CREATE POLICY "customers_update_own" ON customers FOR UPDATE TO authenticated
  USING (business_id = get_user_business_id()) WITH CHECK (business_id = get_user_business_id());
CREATE POLICY "customers_delete_own" ON customers FOR DELETE TO authenticated
  USING (business_id = get_user_business_id());

-- reservations
DROP POLICY IF EXISTS "Staff can view reservations" ON reservations;
DROP POLICY IF EXISTS "Staff can insert reservations" ON reservations;
DROP POLICY IF EXISTS "Staff can update reservations" ON reservations;
DROP POLICY IF EXISTS "Staff can delete reservations" ON reservations;
DROP POLICY IF EXISTS "Anyone authenticated can select reservations" ON reservations;
DROP POLICY IF EXISTS "Anyone authenticated can insert reservations" ON reservations;
DROP POLICY IF EXISTS "Anyone authenticated can update reservations" ON reservations;
DROP POLICY IF EXISTS "Anyone authenticated can delete reservations" ON reservations;

CREATE POLICY "reservations_select_own" ON reservations FOR SELECT TO authenticated
  USING (business_id = get_user_business_id());
CREATE POLICY "reservations_insert_own" ON reservations FOR INSERT TO authenticated
  WITH CHECK (business_id = get_user_business_id());
CREATE POLICY "reservations_update_own" ON reservations FOR UPDATE TO authenticated
  USING (business_id = get_user_business_id()) WITH CHECK (business_id = get_user_business_id());
CREATE POLICY "reservations_delete_own" ON reservations FOR DELETE TO authenticated
  USING (business_id = get_user_business_id());

-- advance_orders
DROP POLICY IF EXISTS "Staff can view advance_orders" ON advance_orders;
DROP POLICY IF EXISTS "Staff can insert advance_orders" ON advance_orders;
DROP POLICY IF EXISTS "Staff can update advance_orders" ON advance_orders;
DROP POLICY IF EXISTS "Staff can delete advance_orders" ON advance_orders;
DROP POLICY IF EXISTS "Anyone authenticated can select advance_orders" ON advance_orders;
DROP POLICY IF EXISTS "Anyone authenticated can insert advance_orders" ON advance_orders;
DROP POLICY IF EXISTS "Anyone authenticated can update advance_orders" ON advance_orders;
DROP POLICY IF EXISTS "Anyone authenticated can delete advance_orders" ON advance_orders;

CREATE POLICY "advance_orders_select_own" ON advance_orders FOR SELECT TO authenticated
  USING (business_id = get_user_business_id());
CREATE POLICY "advance_orders_insert_own" ON advance_orders FOR INSERT TO authenticated
  WITH CHECK (business_id = get_user_business_id());
CREATE POLICY "advance_orders_update_own" ON advance_orders FOR UPDATE TO authenticated
  USING (business_id = get_user_business_id()) WITH CHECK (business_id = get_user_business_id());
CREATE POLICY "advance_orders_delete_own" ON advance_orders FOR DELETE TO authenticated
  USING (business_id = get_user_business_id());
