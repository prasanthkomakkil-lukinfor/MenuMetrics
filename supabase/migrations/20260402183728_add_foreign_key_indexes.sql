/*
  # Add Foreign Key Indexes for Performance

  ## Performance Improvements
  
  This migration adds indexes on all foreign key columns to optimize join performance
  and prevent table scans when querying related data.
  
  ### Indexes Created
  - All foreign key columns across all tables
  - Improves query performance for joins and lookups
  - Resolves unindexed foreign key warnings
  
  ## Tables Updated
  - advance_orders, advance_order_items, reservations
  - bills, payments, orders, order_items, order_item_modifiers
  - kots, categories, items, item_modifiers
  - combos, combo_items, modifier_groups, modifiers
  - table_sections, tables, staff, customers
*/

-- Advance Orders & Reservations
CREATE INDEX IF NOT EXISTS idx_advance_orders_business_id ON advance_orders(business_id);
CREATE INDEX IF NOT EXISTS idx_advance_orders_customer_id ON advance_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_advance_order_items_advance_order_id ON advance_order_items(advance_order_id);
CREATE INDEX IF NOT EXISTS idx_advance_order_items_item_id ON advance_order_items(item_id);

CREATE INDEX IF NOT EXISTS idx_reservations_business_id ON reservations(business_id);
CREATE INDEX IF NOT EXISTS idx_reservations_customer_id ON reservations(customer_id);
CREATE INDEX IF NOT EXISTS idx_reservations_table_id ON reservations(table_id);
CREATE INDEX IF NOT EXISTS idx_reservations_section_id ON reservations(section_id);

-- Bills & Payments
CREATE INDEX IF NOT EXISTS idx_bills_order_id ON bills(order_id);
CREATE INDEX IF NOT EXISTS idx_bills_generated_by ON bills(generated_by);
CREATE INDEX IF NOT EXISTS idx_payments_bill_id ON payments(bill_id);
CREATE INDEX IF NOT EXISTS idx_payments_business_id ON payments(business_id);
CREATE INDEX IF NOT EXISTS idx_payments_processed_by ON payments(processed_by);

-- Orders
CREATE INDEX IF NOT EXISTS idx_orders_business_id ON orders(business_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_staff_id ON orders(staff_id);
CREATE INDEX IF NOT EXISTS idx_orders_table_id ON orders(table_id);

-- Order Items
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_item_id ON order_items(item_id);
CREATE INDEX IF NOT EXISTS idx_order_items_combo_id ON order_items(combo_id);
CREATE INDEX IF NOT EXISTS idx_order_items_foc_approved_by ON order_items(foc_approved_by);
CREATE INDEX IF NOT EXISTS idx_order_item_modifiers_order_item_id ON order_item_modifiers(order_item_id);
CREATE INDEX IF NOT EXISTS idx_order_item_modifiers_modifier_id ON order_item_modifiers(modifier_id);

-- KOTs
CREATE INDEX IF NOT EXISTS idx_kots_business_id ON kots(business_id);
CREATE INDEX IF NOT EXISTS idx_kots_order_id ON kots(order_id);
CREATE INDEX IF NOT EXISTS idx_kots_created_by ON kots(created_by);

-- Menu Management
CREATE INDEX IF NOT EXISTS idx_categories_business_id ON categories(business_id);
CREATE INDEX IF NOT EXISTS idx_items_business_id ON items(business_id);
CREATE INDEX IF NOT EXISTS idx_items_category_id ON items(category_id);
CREATE INDEX IF NOT EXISTS idx_item_modifiers_modifier_group_id ON item_modifiers(modifier_group_id);

-- Modifiers
CREATE INDEX IF NOT EXISTS idx_modifier_groups_business_id ON modifier_groups(business_id);
CREATE INDEX IF NOT EXISTS idx_modifiers_group_id ON modifiers(group_id);

-- Combos
CREATE INDEX IF NOT EXISTS idx_combos_business_id ON combos(business_id);
CREATE INDEX IF NOT EXISTS idx_combo_items_combo_id ON combo_items(combo_id);
CREATE INDEX IF NOT EXISTS idx_combo_items_item_id ON combo_items(item_id);

-- Tables
CREATE INDEX IF NOT EXISTS idx_table_sections_business_id ON table_sections(business_id);
CREATE INDEX IF NOT EXISTS idx_tables_section_id ON tables(section_id);

-- Staff
CREATE INDEX IF NOT EXISTS idx_staff_user_id ON staff(user_id);

-- Additional performance indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_reservations_date_status ON reservations(reservation_date, status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bills_created_at ON bills(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);
