/*
  # Advance Orders & Reservations (Module 21)

  ## New Tables Created
  
  ### 1. advance_orders
  - `id` (uuid, primary key)
  - `business_id` (uuid) - Restaurant reference
  - `customer_id` (uuid) - Customer reference
  - `customer_name` (text) - Name
  - `customer_mobile` (text) - Contact
  - `order_date` (date) - Future delivery date
  - `order_time` (time) - Delivery time
  - `order_type` (text) - pickup, delivery, dine_in
  - `deposit_amount` (decimal) - Advance payment
  - `total_amount` (decimal) - Total order value
  - `special_instructions` (text) - Notes
  - `status` (text) - pending, confirmed, ready, completed, cancelled
  - `created_at` (timestamptz)
  
  ### 2. advance_order_items
  - Links advance orders to menu items
  
  ### 3. reservations
  - `id` (uuid, primary key)
  - `business_id` (uuid)
  - `customer_name` (text)
  - `customer_mobile` (text)
  - `party_size` (integer)
  - `reservation_date` (date)
  - `reservation_time` (time)
  - `table_id` (uuid) - Reserved table
  - `special_requests` (text)
  - `status` (text) - pending, confirmed, seated, cancelled, no_show
  - `auto_release_minutes` (integer) - Default 15
  - `created_at` (timestamptz)
  
  ## Security
  - RLS enabled on all tables
  - Business-scoped access
*/

-- Advance Orders
CREATE TABLE IF NOT EXISTS advance_orders (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  customer_mobile text NOT NULL,
  order_date date NOT NULL,
  order_time time NOT NULL,
  order_type text NOT NULL CHECK (order_type IN ('pickup', 'delivery', 'dine_in')),
  deposit_amount decimal(10,2) DEFAULT 0,
  total_amount decimal(10,2) DEFAULT 0,
  special_instructions text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'ready', 'completed', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Advance Order Items
CREATE TABLE IF NOT EXISTS advance_order_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  advance_order_id uuid NOT NULL REFERENCES advance_orders(id) ON DELETE CASCADE,
  item_id uuid REFERENCES items(id) ON DELETE SET NULL,
  item_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price decimal(10,2) NOT NULL,
  total_price decimal(10,2) NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Reservations
CREATE TABLE IF NOT EXISTS reservations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  customer_mobile text NOT NULL,
  email text,
  party_size integer NOT NULL,
  reservation_date date NOT NULL,
  reservation_time time NOT NULL,
  table_id uuid REFERENCES tables(id) ON DELETE SET NULL,
  section_id uuid REFERENCES table_sections(id) ON DELETE SET NULL,
  special_requests text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'seated', 'cancelled', 'no_show')),
  auto_release_minutes integer DEFAULT 15,
  confirmation_sent boolean DEFAULT false,
  reminder_sent boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE advance_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE advance_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

-- Advance Orders policies
CREATE POLICY "Business members can view advance_orders"
  ON advance_orders FOR SELECT TO authenticated
  USING (business_id IN (SELECT business_id FROM staff WHERE user_id = auth.uid()));

CREATE POLICY "Staff can manage advance_orders"
  ON advance_orders FOR ALL TO authenticated
  USING (business_id IN (SELECT business_id FROM staff WHERE user_id = auth.uid()))
  WITH CHECK (business_id IN (SELECT business_id FROM staff WHERE user_id = auth.uid()));

-- Advance Order Items policies
CREATE POLICY "Business members can view advance_order_items"
  ON advance_order_items FOR SELECT TO authenticated
  USING (advance_order_id IN (SELECT id FROM advance_orders WHERE business_id IN (SELECT business_id FROM staff WHERE user_id = auth.uid())));

CREATE POLICY "Staff can manage advance_order_items"
  ON advance_order_items FOR ALL TO authenticated
  USING (advance_order_id IN (SELECT id FROM advance_orders WHERE business_id IN (SELECT business_id FROM staff WHERE user_id = auth.uid())))
  WITH CHECK (advance_order_id IN (SELECT id FROM advance_orders WHERE business_id IN (SELECT business_id FROM staff WHERE user_id = auth.uid())));

-- Reservations policies
CREATE POLICY "Business members can view reservations"
  ON reservations FOR SELECT TO authenticated
  USING (business_id IN (SELECT business_id FROM staff WHERE user_id = auth.uid()));

CREATE POLICY "Staff can manage reservations"
  ON reservations FOR ALL TO authenticated
  USING (business_id IN (SELECT business_id FROM staff WHERE user_id = auth.uid()))
  WITH CHECK (business_id IN (SELECT business_id FROM staff WHERE user_id = auth.uid()));
