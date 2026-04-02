/*
  # RestOS POS - Orders, Bills & Payments

  ## New Tables Created
  
  ### 1. orders
  - Customer orders (dine-in, takeaway, delivery, aggregator)
  - Links to tables, staff, customers
  - Status tracking
  
  ### 2. order_items
  - Items in each order with modifiers
  - Pricing and status tracking
  
  ### 3. order_item_modifiers
  - Applied modifiers for each order item
  
  ### 4. kots (Kitchen Order Tickets)
  - Kitchen tickets for order items
  - Status: pending, preparing, ready, served
  
  ### 5. bills
  - Generated bills with GST calculation
  - Payment status tracking
  
  ### 6. payments
  - Payment records with modes
  - Split payment support
  
  ### 7. customers
  - Customer database for CRM
  - Visit history and loyalty
  
  ## Security
  - RLS enabled on all tables
  - Business-scoped access with role-based permissions
*/

-- Customers
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name text,
  mobile text,
  email text,
  birthday date,
  anniversary date,
  total_visits integer DEFAULT 0,
  total_spent decimal(10,2) DEFAULT 0,
  loyalty_points integer DEFAULT 0,
  loyalty_tier text DEFAULT 'bronze' CHECK (loyalty_tier IN ('bronze', 'silver', 'gold')),
  last_visit_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(business_id, mobile)
);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  order_type text NOT NULL CHECK (order_type IN ('dine_in', 'takeaway', 'delivery', 'zomato', 'swiggy', 'qr')),
  table_id uuid REFERENCES tables(id) ON DELETE SET NULL,
  token_number text,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  customer_name text,
  customer_mobile text,
  staff_id uuid REFERENCES staff(id) ON DELETE SET NULL,
  guest_count integer DEFAULT 1,
  status text DEFAULT 'active' CHECK (status IN ('active', 'billed', 'cancelled')),
  subtotal decimal(10,2) DEFAULT 0,
  discount_amount decimal(10,2) DEFAULT 0,
  discount_percent decimal(5,2) DEFAULT 0,
  tax_amount decimal(10,2) DEFAULT 0,
  total_amount decimal(10,2) DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Order Items
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  item_id uuid REFERENCES items(id) ON DELETE SET NULL,
  combo_id uuid REFERENCES combos(id) ON DELETE SET NULL,
  item_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price decimal(10,2) NOT NULL,
  total_price decimal(10,2) NOT NULL,
  gst_percent decimal(5,2) DEFAULT 5.00,
  is_foc boolean DEFAULT false,
  foc_reason text,
  foc_approved_by uuid REFERENCES staff(id),
  kot_status text DEFAULT 'pending' CHECK (kot_status IN ('pending', 'preparing', 'ready', 'served')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Order Item Modifiers
CREATE TABLE IF NOT EXISTS order_item_modifiers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_item_id uuid NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  modifier_id uuid NOT NULL REFERENCES modifiers(id) ON DELETE CASCADE,
  modifier_name text NOT NULL,
  price_addition decimal(10,2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- KOTs
CREATE TABLE IF NOT EXISTS kots (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  kot_number text NOT NULL,
  kot_type text DEFAULT 'new' CHECK (kot_type IN ('new', 'addon', 'cancellation')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'ready', 'done')),
  created_by uuid REFERENCES staff(id),
  created_at timestamptz DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz
);

-- Bills
CREATE TABLE IF NOT EXISTS bills (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  bill_number text NOT NULL,
  subtotal decimal(10,2) NOT NULL,
  discount_amount decimal(10,2) DEFAULT 0,
  cgst_amount decimal(10,2) DEFAULT 0,
  sgst_amount decimal(10,2) DEFAULT 0,
  igst_amount decimal(10,2) DEFAULT 0,
  total_amount decimal(10,2) NOT NULL,
  payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid')),
  paid_amount decimal(10,2) DEFAULT 0,
  customer_gstin text,
  generated_by uuid REFERENCES staff(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(business_id, bill_number)
);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  bill_id uuid NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  payment_mode text NOT NULL CHECK (payment_mode IN ('cash', 'card', 'upi', 'zomato_pay', 'swiggy_pay', 'loyalty_points', 'coupon', 'foc')),
  amount decimal(10,2) NOT NULL,
  reference_number text,
  card_last_4 text,
  upi_ref text,
  approval_code text,
  processed_by uuid REFERENCES staff(id),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_item_modifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE kots ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Customers policies
CREATE POLICY "Business members can view customers"
  ON customers FOR SELECT TO authenticated
  USING (business_id IN (SELECT business_id FROM staff WHERE user_id = auth.uid()));

CREATE POLICY "Staff can create/update customers"
  ON customers FOR ALL TO authenticated
  USING (business_id IN (SELECT business_id FROM staff WHERE user_id = auth.uid()))
  WITH CHECK (business_id IN (SELECT business_id FROM staff WHERE user_id = auth.uid()));

-- Orders policies
CREATE POLICY "Business members can view orders"
  ON orders FOR SELECT TO authenticated
  USING (business_id IN (SELECT business_id FROM staff WHERE user_id = auth.uid()));

CREATE POLICY "Staff can create orders"
  ON orders FOR INSERT TO authenticated
  WITH CHECK (business_id IN (SELECT business_id FROM staff WHERE user_id = auth.uid()));

CREATE POLICY "Staff can update orders"
  ON orders FOR UPDATE TO authenticated
  USING (business_id IN (SELECT business_id FROM staff WHERE user_id = auth.uid()))
  WITH CHECK (business_id IN (SELECT business_id FROM staff WHERE user_id = auth.uid()));

CREATE POLICY "Managers can delete orders"
  ON orders FOR DELETE TO authenticated
  USING (business_id IN (SELECT business_id FROM staff WHERE user_id = auth.uid() AND role IN ('owner', 'manager', 'supervisor')));

-- Order Items policies
CREATE POLICY "Business members can view order_items"
  ON order_items FOR SELECT TO authenticated
  USING (order_id IN (SELECT id FROM orders WHERE business_id IN (SELECT business_id FROM staff WHERE user_id = auth.uid())));

CREATE POLICY "Staff can manage order_items"
  ON order_items FOR ALL TO authenticated
  USING (order_id IN (SELECT id FROM orders WHERE business_id IN (SELECT business_id FROM staff WHERE user_id = auth.uid())))
  WITH CHECK (order_id IN (SELECT id FROM orders WHERE business_id IN (SELECT business_id FROM staff WHERE user_id = auth.uid())));

-- Order Item Modifiers policies
CREATE POLICY "Business members can view order_item_modifiers"
  ON order_item_modifiers FOR SELECT TO authenticated
  USING (order_item_id IN (SELECT id FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE business_id IN (SELECT business_id FROM staff WHERE user_id = auth.uid()))));

CREATE POLICY "Staff can manage order_item_modifiers"
  ON order_item_modifiers FOR ALL TO authenticated
  USING (order_item_id IN (SELECT id FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE business_id IN (SELECT business_id FROM staff WHERE user_id = auth.uid()))))
  WITH CHECK (order_item_id IN (SELECT id FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE business_id IN (SELECT business_id FROM staff WHERE user_id = auth.uid()))));

-- KOTs policies
CREATE POLICY "Business members can view kots"
  ON kots FOR SELECT TO authenticated
  USING (business_id IN (SELECT business_id FROM staff WHERE user_id = auth.uid()));

CREATE POLICY "Staff can manage kots"
  ON kots FOR ALL TO authenticated
  USING (business_id IN (SELECT business_id FROM staff WHERE user_id = auth.uid()))
  WITH CHECK (business_id IN (SELECT business_id FROM staff WHERE user_id = auth.uid()));

-- Bills policies
CREATE POLICY "Business members can view bills"
  ON bills FOR SELECT TO authenticated
  USING (business_id IN (SELECT business_id FROM staff WHERE user_id = auth.uid()));

CREATE POLICY "Staff can create bills"
  ON bills FOR INSERT TO authenticated
  WITH CHECK (business_id IN (SELECT business_id FROM staff WHERE user_id = auth.uid()));

CREATE POLICY "Staff can update bills"
  ON bills FOR UPDATE TO authenticated
  USING (business_id IN (SELECT business_id FROM staff WHERE user_id = auth.uid()))
  WITH CHECK (business_id IN (SELECT business_id FROM staff WHERE user_id = auth.uid()));

-- Payments policies
CREATE POLICY "Business members can view payments"
  ON payments FOR SELECT TO authenticated
  USING (business_id IN (SELECT business_id FROM staff WHERE user_id = auth.uid()));

CREATE POLICY "Staff can create payments"
  ON payments FOR INSERT TO authenticated
  WITH CHECK (business_id IN (SELECT business_id FROM staff WHERE user_id = auth.uid()));
