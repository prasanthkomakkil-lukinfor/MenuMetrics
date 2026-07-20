/*
  # Add inventory tables: ingredients, recipes, stock_movements

  1. New Tables
  - `ingredients` — raw materials with stock qty, unit, reorder level, cost
  - `recipes` — links menu items to ingredients with quantity per serving
  - `stock_movements` — audit log of stock in/out (purchase, deduction, wastage)
  2. Security — RLS with business_id ownership via staff table join
*/

CREATE TABLE IF NOT EXISTS ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  unit text NOT NULL DEFAULT 'kg',
  stock_qty numeric NOT NULL DEFAULT 0,
  reorder_level numeric NOT NULL DEFAULT 0,
  cost_per_unit numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_ingredients" ON ingredients;
CREATE POLICY "select_own_ingredients" ON ingredients FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM staff WHERE staff.business_id = ingredients.business_id AND staff.user_id = auth.uid()));
DROP POLICY IF EXISTS "insert_own_ingredients" ON ingredients;
CREATE POLICY "insert_own_ingredients" ON ingredients FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM staff WHERE staff.business_id = ingredients.business_id AND staff.user_id = auth.uid()));
DROP POLICY IF EXISTS "update_own_ingredients" ON ingredients;
CREATE POLICY "update_own_ingredients" ON ingredients FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM staff WHERE staff.business_id = ingredients.business_id AND staff.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM staff WHERE staff.business_id = ingredients.business_id AND staff.user_id = auth.uid()));
DROP POLICY IF EXISTS "delete_own_ingredients" ON ingredients;
CREATE POLICY "delete_own_ingredients" ON ingredients FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM staff WHERE staff.business_id = ingredients.business_id AND staff.user_id = auth.uid()));

CREATE TABLE IF NOT EXISTS recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  ingredient_id uuid NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  quantity_needed numeric NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_recipes" ON recipes;
CREATE POLICY "select_own_recipes" ON recipes FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM staff WHERE staff.business_id = recipes.business_id AND staff.user_id = auth.uid()));
DROP POLICY IF EXISTS "insert_own_recipes" ON recipes;
CREATE POLICY "insert_own_recipes" ON recipes FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM staff WHERE staff.business_id = recipes.business_id AND staff.user_id = auth.uid()));
DROP POLICY IF EXISTS "update_own_recipes" ON recipes;
CREATE POLICY "update_own_recipes" ON recipes FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM staff WHERE staff.business_id = recipes.business_id AND staff.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM staff WHERE staff.business_id = recipes.business_id AND staff.user_id = auth.uid()));
DROP POLICY IF EXISTS "delete_own_recipes" ON recipes;
CREATE POLICY "delete_own_recipes" ON recipes FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM staff WHERE staff.business_id = recipes.business_id AND staff.user_id = auth.uid()));

CREATE TABLE IF NOT EXISTS stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  ingredient_id uuid REFERENCES ingredients(id) ON DELETE SET NULL,
  item_id uuid REFERENCES items(id) ON DELETE SET NULL,
  movement_type text NOT NULL,
  quantity numeric NOT NULL,
  reason text,
  staff_id uuid REFERENCES staff(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_stock_movements" ON stock_movements;
CREATE POLICY "select_own_stock_movements" ON stock_movements FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM staff WHERE staff.business_id = stock_movements.business_id AND staff.user_id = auth.uid()));
DROP POLICY IF EXISTS "insert_own_stock_movements" ON stock_movements;
CREATE POLICY "insert_own_stock_movements" ON stock_movements FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM staff WHERE staff.business_id = stock_movements.business_id AND staff.user_id = auth.uid()));
DROP POLICY IF EXISTS "update_own_stock_movements" ON stock_movements;
CREATE POLICY "update_own_stock_movements" ON stock_movements FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM staff WHERE staff.business_id = stock_movements.business_id AND staff.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM staff WHERE staff.business_id = stock_movements.business_id AND staff.user_id = auth.uid()));
DROP POLICY IF EXISTS "delete_own_stock_movements" ON stock_movements;
CREATE POLICY "delete_own_stock_movements" ON stock_movements FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM staff WHERE staff.business_id = stock_movements.business_id AND staff.user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_ingredients_business ON ingredients(business_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_business ON stock_movements(business_id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='items' AND column_name='stock_qty') THEN
    ALTER TABLE items ADD COLUMN stock_qty numeric;
  END IF;
END $$;
