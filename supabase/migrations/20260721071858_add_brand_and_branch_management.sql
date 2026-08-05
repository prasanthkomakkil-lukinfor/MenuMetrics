/*
# Multi-Brand & Branch Management

## Overview
Adds support for restaurant brands (e.g. KFC) that own multiple branches/outlets.
Each business (branch) can optionally belong to a brand. Brand owners can see
aggregated reports across all their branches and switch between individual branches.

## New Tables
- `brands`
  - `id` (uuid, PK)
  - `name` (text, not null) — brand name e.g. "KFC"
  - `logo_url` (text, nullable) — brand logo
  - `owner_user_id` (uuid, not null) — the auth user who owns this brand
  - `created_at` (timestamptz, default now())
  - `updated_at` (timestamptz, default now())

## Modified Tables
- `businesses`
  - Added `brand_id` (uuid, nullable, FK → brands.id ON DELETE SET NULL)
  - Added `branch_name` (text, nullable) — display name e.g. "KFC MG Road"
  - Added `branch_code` (text, nullable) — short code e.g. "KFC-001"
  - Added `city` (text, nullable) — branch city
  - Added `is_active` (boolean, default true) — soft-disable a branch
- `staff`
  - Added `brand_id` (uuid, nullable, FK → brands.id ON DELETE SET NULL)
    — when set, staff can access all branches under the brand

## Security
- RLS enabled on `brands` with owner-scoped CRUD.
- New businesses policies allow brand owners to read/insert/update all branches.
- New staff SELECT policy allows brand owners to see staff across all branches.
- Existing single-branch businesses unaffected (brand_id is nullable).
*/

CREATE TABLE IF NOT EXISTS brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  logo_url text,
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE brands ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_brands" ON brands;
CREATE POLICY "select_own_brands" ON brands FOR SELECT
  TO authenticated USING (auth.uid() = owner_user_id);

DROP POLICY IF EXISTS "insert_own_brands" ON brands;
CREATE POLICY "insert_own_brands" ON brands FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = owner_user_id);

DROP POLICY IF EXISTS "update_own_brands" ON brands;
CREATE POLICY "update_own_brands" ON brands FOR UPDATE
  TO authenticated USING (auth.uid() = owner_user_id) WITH CHECK (auth.uid() = owner_user_id);

DROP POLICY IF EXISTS "delete_own_brands" ON brands;
CREATE POLICY "delete_own_brands" ON brands FOR DELETE
  TO authenticated USING (auth.uid() = owner_user_id);

-- Add brand_id and branch fields to businesses
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'brand_id') THEN
    ALTER TABLE businesses ADD COLUMN brand_id uuid REFERENCES brands(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'branch_name') THEN
    ALTER TABLE businesses ADD COLUMN branch_name text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'branch_code') THEN
    ALTER TABLE businesses ADD COLUMN branch_code text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'city') THEN
    ALTER TABLE businesses ADD COLUMN city text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'is_active') THEN
    ALTER TABLE businesses ADD COLUMN is_active boolean NOT NULL DEFAULT true;
  END IF;
END $$;

-- Add brand_id to staff for cross-branch access
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'staff' AND column_name = 'brand_id') THEN
    ALTER TABLE staff ADD COLUMN brand_id uuid REFERENCES brands(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_businesses_brand_id ON businesses(brand_id);
CREATE INDEX IF NOT EXISTS idx_staff_brand_id ON staff(brand_id);

-- Brand owners can read all businesses under their brand
DROP POLICY IF EXISTS "select_brand_branches" ON businesses;
CREATE POLICY "select_brand_branches" ON businesses FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM brands b
      WHERE b.id = businesses.brand_id AND b.owner_user_id = auth.uid()
    )
  );

-- Brand owners can insert new branches
DROP POLICY IF EXISTS "insert_brand_branches" ON businesses;
CREATE POLICY "insert_brand_branches" ON businesses FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM brands b
      WHERE b.id = businesses.brand_id AND b.owner_user_id = auth.uid()
    )
  );

-- Brand owners can update branches
DROP POLICY IF EXISTS "update_brand_branches" ON businesses;
CREATE POLICY "update_brand_branches" ON businesses FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM brands b
      WHERE b.id = businesses.brand_id AND b.owner_user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM brands b
      WHERE b.id = businesses.brand_id AND b.owner_user_id = auth.uid()
    )
  );

-- Brand owners can see staff across all branches
DROP POLICY IF EXISTS "select_brand_staff" ON staff;
CREATE POLICY "select_brand_staff" ON staff FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM brands b
      WHERE b.id = staff.brand_id AND b.owner_user_id = auth.uid()
    )
  );
