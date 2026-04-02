/*
  # RestOS POS - Menu & Table Management

  ## New Tables Created
  
  ### 1. categories
  - Menu categories (Appetizers, Main Course, Beverages, etc.)
  - Time availability settings
  
  ### 2. items
  - Menu items with pricing, GST, photos
  - Veg/non-veg/egg classification
  - Platform availability flags
  - Recipe costing support
  
  ### 3. modifier_groups
  - Groups like "Spice Level", "Size", "Add-ons"
  - Single/multi select configuration
  
  ### 4. modifiers
  - Individual options within groups
  - Price additions
  
  ### 5. item_modifiers
  - Links items to their modifier groups
  
  ### 6. combos
  - Meal deals with special pricing
  
  ### 7. combo_items
  - Items included in combos
  
  ### 8. table_sections
  - Floor sections (Ground Floor, Rooftop, etc.)
  
  ### 9. tables
  - Individual tables with capacity and status
  
  ## Security
  - RLS enabled on all tables
  - Business-scoped access
*/

-- Categories
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  available_from time,
  available_until time,
  created_at timestamptz DEFAULT now()
);

-- Items
CREATE TABLE IF NOT EXISTS items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  price decimal(10,2) NOT NULL,
  item_type text NOT NULL DEFAULT 'veg' CHECK (item_type IN ('veg', 'non_veg', 'egg')),
  gst_percent decimal(5,2) DEFAULT 5.00,
  hsn_code text,
  photo_url text,
  is_active boolean DEFAULT true,
  is_sold_out boolean DEFAULT false,
  available_dine_in boolean DEFAULT true,
  available_takeaway boolean DEFAULT true,
  available_zomato boolean DEFAULT false,
  available_swiggy boolean DEFAULT false,
  available_qr boolean DEFAULT false,
  recipe_cost decimal(10,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Modifier Groups
CREATE TABLE IF NOT EXISTS modifier_groups (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  selection_type text NOT NULL DEFAULT 'single' CHECK (selection_type IN ('single', 'multi')),
  is_required boolean DEFAULT false,
  max_selections integer,
  created_at timestamptz DEFAULT now()
);

-- Modifiers
CREATE TABLE IF NOT EXISTS modifiers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id uuid NOT NULL REFERENCES modifier_groups(id) ON DELETE CASCADE,
  name text NOT NULL,
  price_addition decimal(10,2) DEFAULT 0,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Item Modifiers (link items to modifier groups)
CREATE TABLE IF NOT EXISTS item_modifiers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id uuid NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  modifier_group_id uuid NOT NULL REFERENCES modifier_groups(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(item_id, modifier_group_id)
);

-- Combos
CREATE TABLE IF NOT EXISTS combos (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price decimal(10,2) NOT NULL,
  photo_url text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Combo Items
CREATE TABLE IF NOT EXISTS combo_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  combo_id uuid NOT NULL REFERENCES combos(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  quantity integer DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

-- Table Sections
CREATE TABLE IF NOT EXISTS table_sections (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Tables
CREATE TABLE IF NOT EXISTS tables (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  section_id uuid REFERENCES table_sections(id) ON DELETE SET NULL,
  table_number text NOT NULL,
  capacity integer DEFAULT 4,
  status text DEFAULT 'free' CHECK (status IN ('free', 'occupied', 'reserved', 'bill_requested', 'merged')),
  qr_code text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(business_id, table_number)
);

-- Enable RLS on all tables
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE modifier_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE modifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_modifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE combos ENABLE ROW LEVEL SECURITY;
ALTER TABLE combo_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE table_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;

-- RLS Policies (all business-scoped)
CREATE POLICY "Business members can view categories"
  ON categories FOR SELECT TO authenticated
  USING (business_id IN (SELECT business_id FROM staff WHERE user_id = auth.uid()));

CREATE POLICY "Managers can manage categories"
  ON categories FOR ALL TO authenticated
  USING (business_id IN (SELECT business_id FROM staff WHERE user_id = auth.uid() AND role IN ('owner', 'manager')))
  WITH CHECK (business_id IN (SELECT business_id FROM staff WHERE user_id = auth.uid() AND role IN ('owner', 'manager')));

CREATE POLICY "Business members can view items"
  ON items FOR SELECT TO authenticated
  USING (business_id IN (SELECT business_id FROM staff WHERE user_id = auth.uid()));

CREATE POLICY "Managers can manage items"
  ON items FOR ALL TO authenticated
  USING (business_id IN (SELECT business_id FROM staff WHERE user_id = auth.uid() AND role IN ('owner', 'manager')))
  WITH CHECK (business_id IN (SELECT business_id FROM staff WHERE user_id = auth.uid() AND role IN ('owner', 'manager')));

CREATE POLICY "Business members can view modifier_groups"
  ON modifier_groups FOR SELECT TO authenticated
  USING (business_id IN (SELECT business_id FROM staff WHERE user_id = auth.uid()));

CREATE POLICY "Managers can manage modifier_groups"
  ON modifier_groups FOR ALL TO authenticated
  USING (business_id IN (SELECT business_id FROM staff WHERE user_id = auth.uid() AND role IN ('owner', 'manager')))
  WITH CHECK (business_id IN (SELECT business_id FROM staff WHERE user_id = auth.uid() AND role IN ('owner', 'manager')));

CREATE POLICY "Business members can view modifiers"
  ON modifiers FOR SELECT TO authenticated
  USING (group_id IN (SELECT id FROM modifier_groups WHERE business_id IN (SELECT business_id FROM staff WHERE user_id = auth.uid())));

CREATE POLICY "Managers can manage modifiers"
  ON modifiers FOR ALL TO authenticated
  USING (group_id IN (SELECT id FROM modifier_groups WHERE business_id IN (SELECT business_id FROM staff WHERE user_id = auth.uid() AND role IN ('owner', 'manager'))))
  WITH CHECK (group_id IN (SELECT id FROM modifier_groups WHERE business_id IN (SELECT business_id FROM staff WHERE user_id = auth.uid() AND role IN ('owner', 'manager'))));

CREATE POLICY "Business members can view item_modifiers"
  ON item_modifiers FOR SELECT TO authenticated
  USING (item_id IN (SELECT id FROM items WHERE business_id IN (SELECT business_id FROM staff WHERE user_id = auth.uid())));

CREATE POLICY "Managers can manage item_modifiers"
  ON item_modifiers FOR ALL TO authenticated
  USING (item_id IN (SELECT id FROM items WHERE business_id IN (SELECT business_id FROM staff WHERE user_id = auth.uid() AND role IN ('owner', 'manager'))))
  WITH CHECK (item_id IN (SELECT id FROM items WHERE business_id IN (SELECT business_id FROM staff WHERE user_id = auth.uid() AND role IN ('owner', 'manager'))));

CREATE POLICY "Business members can view combos"
  ON combos FOR SELECT TO authenticated
  USING (business_id IN (SELECT business_id FROM staff WHERE user_id = auth.uid()));

CREATE POLICY "Managers can manage combos"
  ON combos FOR ALL TO authenticated
  USING (business_id IN (SELECT business_id FROM staff WHERE user_id = auth.uid() AND role IN ('owner', 'manager')))
  WITH CHECK (business_id IN (SELECT business_id FROM staff WHERE user_id = auth.uid() AND role IN ('owner', 'manager')));

CREATE POLICY "Business members can view combo_items"
  ON combo_items FOR SELECT TO authenticated
  USING (combo_id IN (SELECT id FROM combos WHERE business_id IN (SELECT business_id FROM staff WHERE user_id = auth.uid())));

CREATE POLICY "Managers can manage combo_items"
  ON combo_items FOR ALL TO authenticated
  USING (combo_id IN (SELECT id FROM combos WHERE business_id IN (SELECT business_id FROM staff WHERE user_id = auth.uid() AND role IN ('owner', 'manager'))))
  WITH CHECK (combo_id IN (SELECT id FROM combos WHERE business_id IN (SELECT business_id FROM staff WHERE user_id = auth.uid() AND role IN ('owner', 'manager'))));

CREATE POLICY "Business members can view table_sections"
  ON table_sections FOR SELECT TO authenticated
  USING (business_id IN (SELECT business_id FROM staff WHERE user_id = auth.uid()));

CREATE POLICY "Managers can manage table_sections"
  ON table_sections FOR ALL TO authenticated
  USING (business_id IN (SELECT business_id FROM staff WHERE user_id = auth.uid() AND role IN ('owner', 'manager')))
  WITH CHECK (business_id IN (SELECT business_id FROM staff WHERE user_id = auth.uid() AND role IN ('owner', 'manager')));

CREATE POLICY "Business members can view tables"
  ON tables FOR SELECT TO authenticated
  USING (business_id IN (SELECT business_id FROM staff WHERE user_id = auth.uid()));

CREATE POLICY "Staff can update table status"
  ON tables FOR UPDATE TO authenticated
  USING (business_id IN (SELECT business_id FROM staff WHERE user_id = auth.uid()))
  WITH CHECK (business_id IN (SELECT business_id FROM staff WHERE user_id = auth.uid()));

CREATE POLICY "Managers can manage tables"
  ON tables FOR ALL TO authenticated
  USING (business_id IN (SELECT business_id FROM staff WHERE user_id = auth.uid() AND role IN ('owner', 'manager')))
  WITH CHECK (business_id IN (SELECT business_id FROM staff WHERE user_id = auth.uid() AND role IN ('owner', 'manager')));
