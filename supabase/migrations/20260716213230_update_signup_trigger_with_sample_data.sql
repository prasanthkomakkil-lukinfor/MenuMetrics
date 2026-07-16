/*
  # Update signup trigger to create sample data for new businesses

  1. Changes
    - Updates handle_new_user() to also create:
      - Table sections (Main Hall, Outdoor)
      - Tables (T1-T8 with varying capacities)
      - Categories (Starters, Main Course, Breads, Desserts, Beverages)
      - Sample menu items with prices
    - Sets plan='pro', trial_ends_at=NULL

  2. Why
    - New businesses had no tables/items, making the POS unusable
    - Sample data lets users immediately punch orders

  3. Security
    - Runs as SECURITY DEFINER only on auth.users INSERT
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_business_id uuid;
  user_name text;
  business_name text;
  section1_id uuid;
  section2_id uuid;
  cat_starters uuid;
  cat_main uuid;
  cat_breads uuid;
  cat_desserts uuid;
  cat_beverages uuid;
BEGIN
  user_name := COALESCE(NEW.raw_user_meta_data->>'name', 'Owner');
  business_name := COALESCE(NEW.raw_user_meta_data->>'business_name', 'My Restaurant');

  INSERT INTO businesses (name, plan, email, trial_ends_at)
  VALUES (business_name, 'pro', NEW.email, NULL)
  RETURNING id INTO new_business_id;

  INSERT INTO staff (business_id, user_id, name, role, is_active, permissions)
  VALUES (
    new_business_id,
    NEW.id,
    user_name,
    'owner',
    true,
    '["view_orders","create_orders","update_orders","delete_orders","view_menu","manage_menu","view_inventory","manage_inventory","view_customers","manage_customers","view_reservations","manage_reservations","view_staff","manage_staff","view_reports","view_billing","manage_settings"]'::jsonb
  );

  -- Create table sections
  INSERT INTO table_sections (business_id, name, display_order, is_active)
  VALUES (new_business_id, 'Main Hall', 1, true)
  RETURNING id INTO section1_id;

  INSERT INTO table_sections (business_id, name, display_order, is_active)
  VALUES (new_business_id, 'Outdoor', 2, true)
  RETURNING id INTO section2_id;

  -- Create tables in Main Hall
  INSERT INTO tables (business_id, section_id, table_number, capacity, status, is_active)
  VALUES
    (new_business_id, section1_id, '1', 2, 'free', true),
    (new_business_id, section1_id, '2', 4, 'free', true),
    (new_business_id, section1_id, '3', 4, 'free', true),
    (new_business_id, section1_id, '4', 6, 'free', true),
    (new_business_id, section1_id, '5', 6, 'free', true),
    (new_business_id, section1_id, '6', 8, 'free', true);

  -- Create tables in Outdoor
  INSERT INTO tables (business_id, section_id, table_number, capacity, status, is_active)
  VALUES
    (new_business_id, section2_id, '7', 4, 'free', true),
    (new_business_id, section2_id, '8', 4, 'free', true);

  -- Create categories
  INSERT INTO categories (business_id, name, display_order, is_active)
  VALUES (new_business_id, 'Starters', 1, true)
  RETURNING id INTO cat_starters;

  INSERT INTO categories (business_id, name, display_order, is_active)
  VALUES (new_business_id, 'Main Course', 2, true)
  RETURNING id INTO cat_main;

  INSERT INTO categories (business_id, name, display_order, is_active)
  VALUES (new_business_id, 'Breads', 3, true)
  RETURNING id INTO cat_breads;

  INSERT INTO categories (business_id, name, display_order, is_active)
  VALUES (new_business_id, 'Desserts', 4, true)
  RETURNING id INTO cat_desserts;

  INSERT INTO categories (business_id, name, display_order, is_active)
  VALUES (new_business_id, 'Beverages', 5, true)
  RETURNING id INTO cat_beverages;

  -- Create sample menu items
  INSERT INTO items (business_id, category_id, name, description, price, item_type, gst_percent, is_active, is_sold_out)
  VALUES
    (new_business_id, cat_starters, 'Paneer Tikka', 'Marinated cottage cheese grilled in tandoor', 240, 'veg', 5, true, false),
    (new_business_id, cat_starters, 'Chicken 65', 'Spicy deep-fried chicken bites', 280, 'non_veg', 5, true, false),
    (new_business_id, cat_starters, 'Veg Spring Rolls', 'Crispy rolls stuffed with vegetables', 180, 'veg', 5, true, false),
    (new_business_id, cat_starters, 'Fish Fingers', 'Crumb-fried fish strips with tartar dip', 320, 'non_veg', 5, true, false),
    (new_business_id, cat_main, 'Butter Chicken', 'Creamy tomato curry with tender chicken', 340, 'non_veg', 5, true, false),
    (new_business_id, cat_main, 'Paneer Butter Masala', 'Cottage cheese in rich creamy gravy', 300, 'veg', 5, true, false),
    (new_business_id, cat_main, 'Dal Makhani', 'Slow-cooked black lentils in butter cream', 220, 'veg', 5, true, false),
    (new_business_id, cat_main, 'Mutton Rogan Josh', 'Aromatic Kashmiri-style mutton curry', 380, 'non_veg', 5, true, false),
    (new_business_id, cat_main, 'Veg Biryani', 'Fragrant basmati rice with mixed vegetables', 260, 'veg', 5, true, false),
    (new_business_id, cat_main, 'Chicken Biryani', 'Dum-cooked basmati with marinated chicken', 320, 'non_veg', 5, true, false),
    (new_business_id, cat_breads, 'Butter Naan', 'Soft tandoor bread brushed with butter', 50, 'veg', 5, true, false),
    (new_business_id, cat_breads, 'Garlic Naan', 'Naan topped with garlic and herbs', 70, 'veg', 5, true, false),
    (new_business_id, cat_breads, 'Tandoori Roti', 'Whole wheat tandoor bread', 40, 'veg', 5, true, false),
    (new_business_id, cat_breads, 'Laccha Paratha', 'Flaky multi-layered flatbread', 60, 'veg', 5, true, false),
    (new_business_id, cat_desserts, 'Gulab Jamun', 'Warm milk dumplings in sugar syrup', 120, 'veg', 5, true, false),
    (new_business_id, cat_desserts, 'Rasmalai', 'Soft cheese patties in saffron milk', 140, 'veg', 5, true, false),
    (new_business_id, cat_desserts, 'Ice Cream Sundae', 'Vanilla ice cream with chocolate sauce', 160, 'egg', 5, true, false),
    (new_business_id, cat_beverages, 'Masala Chai', 'Indian spiced tea', 40, 'veg', 5, true, false),
    (new_business_id, cat_beverages, 'Fresh Lime Soda', 'Refreshing lime with soda', 80, 'veg', 5, true, false),
    (new_business_id, cat_beverages, 'Mango Lassi', 'Thick yogurt drink with mango', 100, 'veg', 5, true, false),
    (new_business_id, cat_beverages, 'Cold Coffee', 'Chilled coffee with ice cream', 120, 'egg', 5, true, false);

  RETURN NEW;
END;
$$;
