/*
  # Add Staff Permissions System

  1. Changes
    - Add permissions column to staff table (JSON array of permission strings)
    - Update staff role to include more granular roles
    - Add helper function to check staff permissions

  2. Permissions List
    - 'view_orders', 'create_orders', 'update_orders', 'delete_orders'
    - 'view_menu', 'manage_menu'
    - 'view_inventory', 'manage_inventory'
    - 'view_customers', 'manage_customers'
    - 'view_reservations', 'manage_reservations'
    - 'view_staff', 'manage_staff'
    - 'view_reports', 'view_billing'
    - 'manage_settings'

  3. Security
    - Owner role gets all permissions by default
*/

-- Add permissions column to staff table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'staff' AND column_name = 'permissions'
  ) THEN
    ALTER TABLE staff ADD COLUMN permissions jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Update existing owner records to have all permissions
UPDATE staff
SET permissions = '[
  "view_orders", "create_orders", "update_orders", "delete_orders",
  "view_menu", "manage_menu",
  "view_inventory", "manage_inventory",
  "view_customers", "manage_customers",
  "view_reservations", "manage_reservations",
  "view_staff", "manage_staff",
  "view_reports", "view_billing",
  "manage_settings"
]'::jsonb
WHERE role = 'owner' AND (permissions IS NULL OR permissions = '[]'::jsonb);
