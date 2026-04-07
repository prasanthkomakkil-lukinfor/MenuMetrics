/*
  # Create Signup Trigger - Auto-create business + staff on auth signup

  1. Changes
    - Create a trigger function that runs AFTER a new user is created in auth.users
    - The function creates a business and staff record automatically
    - Uses SECURITY DEFINER to bypass RLS
    - Reads user metadata (name, business_name) passed during signUp

  2. Why
    - Previous approach relied on client-side INSERT after signUp
    - RLS policies blocked those inserts because staff record didn't exist yet
    - This trigger runs server-side with elevated privileges, guaranteed to work

  3. Security
    - Function runs as postgres (SECURITY DEFINER) only on auth.users INSERT
    - Only creates records for the newly created user
    - Sets owner role with full permissions
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
BEGIN
  user_name := COALESCE(NEW.raw_user_meta_data->>'name', 'Owner');
  business_name := COALESCE(NEW.raw_user_meta_data->>'business_name', 'My Restaurant');

  INSERT INTO businesses (name, plan, email, trial_ends_at)
  VALUES (business_name, 'pro', NEW.email, now() + interval '14 days')
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

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
