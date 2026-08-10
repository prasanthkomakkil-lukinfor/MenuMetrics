/*
# Add customer delivery address fields and WhatsApp config to businesses

1. Modified Tables
- `customers`: adds structured delivery address columns
  - `delivery_flat` (text) - Flat/Villa number
  - `delivery_building` (text) - Building name
  - `delivery_road` (text) - Road/Street name
  - `delivery_block` (text) - Block number
  - `delivery_landmark` (text) - Landmark
  - `delivery_area` (text) - Area/Locality
- `businesses`: adds WhatsApp notification config columns
  - `whatsapp_enabled` (boolean, default false) - master toggle
  - `whatsapp_api_key` (text) - Meta Cloud API key
  - `whatsapp_phone_number_id` (text) - WhatsApp phone number ID
  - `whatsapp_sender_number` (text) - WhatsApp business number
  - `whatsapp_template_placed` (text) - message template for order placed
  - `whatsapp_template_preparing` (text) - message template for preparing
  - `whatsapp_template_ready` (text) - message template for ready/out for delivery
  - `whatsapp_template_review` (text) - message template for review request
  - `google_review_link` (text) - Google review URL

2. Security
- No new tables, no policy changes needed. Existing RLS policies on customers and businesses remain in effect.

3. Important Notes
- All columns are nullable so existing data is not affected.
- The WhatsApp fields are stored on the businesses table so each branch can have its own config.
*/

DO $$ BEGIN
  ALTER TABLE customers ADD COLUMN IF NOT EXISTS delivery_flat text;
  ALTER TABLE customers ADD COLUMN IF NOT EXISTS delivery_building text;
  ALTER TABLE customers ADD COLUMN IF NOT EXISTS delivery_road text;
  ALTER TABLE customers ADD COLUMN IF NOT EXISTS delivery_block text;
  ALTER TABLE customers ADD COLUMN IF NOT EXISTS delivery_landmark text;
  ALTER TABLE customers ADD COLUMN IF NOT EXISTS delivery_area text;
END $$;

DO $$ BEGIN
  ALTER TABLE businesses ADD COLUMN IF NOT EXISTS whatsapp_enabled boolean DEFAULT false;
  ALTER TABLE businesses ADD COLUMN IF NOT EXISTS whatsapp_api_key text;
  ALTER TABLE businesses ADD COLUMN IF NOT EXISTS whatsapp_phone_number_id text;
  ALTER TABLE businesses ADD COLUMN IF NOT EXISTS whatsapp_sender_number text;
  ALTER TABLE businesses ADD COLUMN IF NOT EXISTS whatsapp_template_placed text;
  ALTER TABLE businesses ADD COLUMN IF NOT EXISTS whatsapp_template_preparing text;
  ALTER TABLE businesses ADD COLUMN IF NOT EXISTS whatsapp_template_ready text;
  ALTER TABLE businesses ADD COLUMN IF NOT EXISTS whatsapp_template_review text;
  ALTER TABLE businesses ADD COLUMN IF NOT EXISTS google_review_link text;
END $$;
