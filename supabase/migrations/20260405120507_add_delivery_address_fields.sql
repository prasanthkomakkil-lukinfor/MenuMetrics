/*
  # Add Delivery Address and Contact Fields

  1. Changes
    - Add delivery_address column to advance_orders table
    - Add customer_email column for better communication
    - Add delivery_instructions column for special delivery notes
  
  2. Notes
    - These fields are optional (nullable) as they only apply to delivery orders
    - Takeaway orders will use the existing customer_name and customer_mobile fields
*/

-- Add new columns for delivery information
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'advance_orders' AND column_name = 'delivery_address'
  ) THEN
    ALTER TABLE advance_orders ADD COLUMN delivery_address text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'advance_orders' AND column_name = 'customer_email'
  ) THEN
    ALTER TABLE advance_orders ADD COLUMN customer_email text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'advance_orders' AND column_name = 'delivery_instructions'
  ) THEN
    ALTER TABLE advance_orders ADD COLUMN delivery_instructions text;
  END IF;
END $$;
