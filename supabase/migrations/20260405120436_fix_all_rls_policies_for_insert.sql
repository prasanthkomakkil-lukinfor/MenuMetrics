/*
  # Fix RLS Policies for All Insert Operations
  
  1. Problem
    - Staff can't add new staff members
    - Staff can't add customers
    - Managers can't add menu items
    - Staff can't add tables/table sections
  
  2. Solution
    - Add INSERT policies for staff (managers only)
    - Add INSERT policies for customers (all staff)
    - Add INSERT policies for items and categories (managers only)
    - Add INSERT policies for tables and table_sections (all staff)
*/

-- Drop existing ALL policies and replace with specific ones
DROP POLICY IF EXISTS "Staff can manage customers" ON customers;
DROP POLICY IF EXISTS "Managers can manage categories" ON categories;
DROP POLICY IF EXISTS "Managers can manage items" ON items;
DROP POLICY IF EXISTS "Managers can manage table_sections" ON table_sections;
DROP POLICY IF EXISTS "Staff can manage tables" ON tables;

-- STAFF policies - managers can add staff
CREATE POLICY "Managers can insert staff"
  ON staff FOR INSERT TO authenticated
  WITH CHECK (business_id = get_user_business_id() AND is_user_manager());

-- CUSTOMERS policies - all staff can manage
CREATE POLICY "Staff can insert customers"
  ON customers FOR INSERT TO authenticated
  WITH CHECK (business_id = get_user_business_id());

CREATE POLICY "Staff can update customers"
  ON customers FOR UPDATE TO authenticated
  USING (business_id = get_user_business_id())
  WITH CHECK (business_id = get_user_business_id());

CREATE POLICY "Staff can delete customers"
  ON customers FOR DELETE TO authenticated
  USING (business_id = get_user_business_id());

-- CATEGORIES policies - managers only
CREATE POLICY "Managers can insert categories"
  ON categories FOR INSERT TO authenticated
  WITH CHECK (business_id = get_user_business_id() AND is_user_manager());

CREATE POLICY "Managers can update categories"
  ON categories FOR UPDATE TO authenticated
  USING (business_id = get_user_business_id() AND is_user_manager())
  WITH CHECK (business_id = get_user_business_id() AND is_user_manager());

CREATE POLICY "Managers can delete categories"
  ON categories FOR DELETE TO authenticated
  USING (business_id = get_user_business_id() AND is_user_manager());

-- ITEMS policies - managers only
CREATE POLICY "Managers can insert items"
  ON items FOR INSERT TO authenticated
  WITH CHECK (business_id = get_user_business_id() AND is_user_manager());

CREATE POLICY "Managers can update items"
  ON items FOR UPDATE TO authenticated
  USING (business_id = get_user_business_id() AND is_user_manager())
  WITH CHECK (business_id = get_user_business_id() AND is_user_manager());

CREATE POLICY "Managers can delete items"
  ON items FOR DELETE TO authenticated
  USING (business_id = get_user_business_id() AND is_user_manager());

-- TABLE_SECTIONS policies - all staff can manage
CREATE POLICY "Staff can insert table_sections"
  ON table_sections FOR INSERT TO authenticated
  WITH CHECK (business_id = get_user_business_id());

CREATE POLICY "Staff can update table_sections"
  ON table_sections FOR UPDATE TO authenticated
  USING (business_id = get_user_business_id())
  WITH CHECK (business_id = get_user_business_id());

CREATE POLICY "Staff can delete table_sections"
  ON table_sections FOR DELETE TO authenticated
  USING (business_id = get_user_business_id());

-- TABLES policies - all staff can manage
CREATE POLICY "Staff can insert tables"
  ON tables FOR INSERT TO authenticated
  WITH CHECK (
    section_id IN (
      SELECT id FROM table_sections 
      WHERE business_id = get_user_business_id()
    )
  );

CREATE POLICY "Staff can update tables"
  ON tables FOR UPDATE TO authenticated
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

CREATE POLICY "Staff can delete tables"
  ON tables FOR DELETE TO authenticated
  USING (
    section_id IN (
      SELECT id FROM table_sections 
      WHERE business_id = get_user_business_id()
    )
  );
