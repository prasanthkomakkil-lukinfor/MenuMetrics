/*
  # Add card_type column to payments table

  1. Changes
  - Add `card_type` column to `payments` table (text, nullable)
  - Stores the card network: visa, mastercard, amex, rupay, other

  2. Security
  - No RLS changes needed — existing policies cover the new column
*/

ALTER TABLE payments ADD COLUMN IF NOT EXISTS card_type text;
