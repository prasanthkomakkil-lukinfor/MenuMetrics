/*
  # Add Sample Data for RestOS POS Demo

  ## Purpose
  This migration adds sample data to demonstrate the RestOS POS system functionality.
  This is for demo purposes only and should be removed in production.

  ## Sample Data Added
  1. Categories - Appetizers, Main Course, Beverages, Desserts
  2. Menu Items - Popular Indian restaurant items
  3. Tables - 15 sample tables across 2 sections
  
  ## Notes
  - All sample data is linked to the first business in the system
  - Items have realistic pricing and GST rates
  - Tables are distributed across Ground Floor and Rooftop sections
*/

-- Insert sample categories (only if business exists)
DO $$
DECLARE
  v_business_id uuid;
BEGIN
  -- Get the first business (for demo purposes)
  SELECT id INTO v_business_id FROM businesses LIMIT 1;
  
  IF v_business_id IS NOT NULL THEN
    -- Insert categories
    INSERT INTO categories (business_id, name, display_order, is_active)
    VALUES 
      (v_business_id, 'Appetizers', 1, true),
      (v_business_id, 'Main Course', 2, true),
      (v_business_id, 'Breads', 3, true),
      (v_business_id, 'Rice & Biryani', 4, true),
      (v_business_id, 'Beverages', 5, true),
      (v_business_id, 'Desserts', 6, true)
    ON CONFLICT DO NOTHING;

    -- Insert sample items
    INSERT INTO items (business_id, category_id, name, description, price, item_type, gst_percent, is_active, available_dine_in, available_takeaway, recipe_cost)
    SELECT 
      v_business_id,
      c.id,
      item_data.name,
      item_data.description,
      item_data.price,
      item_data.item_type,
      5.00,
      true,
      true,
      true,
      item_data.price * 0.3
    FROM categories c
    CROSS JOIN (
      VALUES 
        ('Appetizers', 'Paneer Tikka', 'Cottage cheese marinated in spices and grilled', 220, 'veg'),
        ('Appetizers', 'Chicken Tikka', 'Tender chicken pieces marinated and grilled', 280, 'non_veg'),
        ('Appetizers', 'Veg Spring Rolls', 'Crispy rolls filled with vegetables', 180, 'veg'),
        ('Main Course', 'Butter Chicken', 'Creamy tomato-based chicken curry', 320, 'non_veg'),
        ('Main Course', 'Dal Makhani', 'Slow-cooked black lentils in butter', 240, 'veg'),
        ('Main Course', 'Paneer Butter Masala', 'Cottage cheese in rich tomato gravy', 280, 'veg'),
        ('Main Course', 'Chicken Curry', 'Traditional chicken curry with spices', 300, 'non_veg'),
        ('Breads', 'Butter Naan', 'Soft leavened bread with butter', 60, 'veg'),
        ('Breads', 'Garlic Naan', 'Naan topped with garlic and butter', 70, 'veg'),
        ('Breads', 'Tandoori Roti', 'Whole wheat bread from tandoor', 40, 'veg'),
        ('Rice & Biryani', 'Veg Biryani', 'Fragrant rice with mixed vegetables', 250, 'veg'),
        ('Rice & Biryani', 'Chicken Biryani', 'Aromatic rice with tender chicken', 320, 'non_veg'),
        ('Rice & Biryani', 'Jeera Rice', 'Basmati rice tempered with cumin', 150, 'veg'),
        ('Beverages', 'Masala Chai', 'Indian spiced tea', 40, 'veg'),
        ('Beverages', 'Cold Coffee', 'Chilled coffee with ice cream', 120, 'veg'),
        ('Beverages', 'Fresh Lime Soda', 'Refreshing lime drink', 60, 'veg'),
        ('Beverages', 'Mango Lassi', 'Sweet mango yogurt drink', 100, 'veg'),
        ('Desserts', 'Gulab Jamun', 'Sweet milk balls in sugar syrup', 80, 'veg'),
        ('Desserts', 'Ice Cream', 'Assorted flavors', 100, 'veg')
    ) AS item_data(category_name, name, description, price, item_type)
    WHERE c.name = item_data.category_name
      AND c.business_id = v_business_id
    ON CONFLICT DO NOTHING;

    -- Insert table sections
    INSERT INTO table_sections (business_id, name, display_order, is_active)
    VALUES 
      (v_business_id, 'Ground Floor', 1, true),
      (v_business_id, 'Rooftop', 2, true)
    ON CONFLICT DO NOTHING;

    -- Insert sample tables
    INSERT INTO tables (business_id, section_id, table_number, capacity, status, is_active)
    SELECT 
      v_business_id,
      s.id,
      table_data.number,
      table_data.capacity,
      'free',
      true
    FROM table_sections s
    CROSS JOIN (
      VALUES 
        ('Ground Floor', '1', 2),
        ('Ground Floor', '2', 4),
        ('Ground Floor', '3', 4),
        ('Ground Floor', '4', 6),
        ('Ground Floor', '5', 2),
        ('Ground Floor', '6', 4),
        ('Ground Floor', '7', 4),
        ('Ground Floor', '8', 6),
        ('Rooftop', '9', 2),
        ('Rooftop', '10', 4),
        ('Rooftop', '11', 4),
        ('Rooftop', '12', 6),
        ('Rooftop', '13', 8),
        ('Rooftop', '14', 2),
        ('Rooftop', '15', 4)
    ) AS table_data(section_name, number, capacity)
    WHERE s.name = table_data.section_name
      AND s.business_id = v_business_id
    ON CONFLICT DO NOTHING;

  END IF;
END $$;
