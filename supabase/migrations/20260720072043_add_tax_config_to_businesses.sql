-- Add tax configuration columns to businesses
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS cgst_rate numeric DEFAULT 2.5,
  ADD COLUMN IF NOT EXISTS sgst_rate numeric DEFAULT 2.5,
  ADD COLUMN IF NOT EXISTS igst_rate numeric DEFAULT 5,
  ADD COLUMN IF NOT EXISTS service_charge_rate numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS enable_service_charge boolean DEFAULT false;