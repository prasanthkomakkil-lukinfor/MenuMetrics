/*
  # Add delivery fields to orders table

  1. Changes
    - Add delivery_address, delivery_instructions, delivery_charge to orders table
    - Allows delivery as an order_type

  2. Security
  - No RLS changes — existing policies cover new columns
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'delivery_address'
  ) THEN
    ALTER TABLE orders ADD COLUMN delivery_address text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'delivery_instructions'
  ) THEN
    ALTER TABLE orders ADD COLUMN delivery_instructions text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'delivery_charge'
  ) THEN
    ALTER TABLE orders ADD COLUMN delivery_charge numeric DEFAULT 0;
  END IF;
END $$;
