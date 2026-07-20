/*
  # Add loyalty settings columns to businesses

  1. Changes
  - Add loyalty_points_per_rupee (numeric, default 0.1 = 10 rupees per point)
  - Add loyalty_redemption_rate (numeric, default 0.5 = 1 point = 50 paise)
  - Add loyalty_gold_threshold (numeric, default 50000)
  - Add loyalty_silver_threshold (numeric, default 10000)

  2. Security — no RLS changes, existing policies cover new columns
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='businesses' AND column_name='loyalty_points_per_rupee') THEN
    ALTER TABLE businesses ADD COLUMN loyalty_points_per_rupee numeric DEFAULT 0.1;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='businesses' AND column_name='loyalty_redemption_rate') THEN
    ALTER TABLE businesses ADD COLUMN loyalty_redemption_rate numeric DEFAULT 0.5;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='businesses' AND column_name='loyalty_gold_threshold') THEN
    ALTER TABLE businesses ADD COLUMN loyalty_gold_threshold numeric DEFAULT 50000;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='businesses' AND column_name='loyalty_silver_threshold') THEN
    ALTER TABLE businesses ADD COLUMN loyalty_silver_threshold numeric DEFAULT 10000;
  END IF;
END $$;
