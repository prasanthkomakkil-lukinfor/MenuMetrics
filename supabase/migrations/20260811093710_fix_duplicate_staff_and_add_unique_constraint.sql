-- Delete duplicate staff rows, keeping the oldest (original) row per user_id
DELETE FROM staff
WHERE id IN (
  'ad2b0bd1-fa23-422c-b769-6957e34ee128',  -- duplicate of Prasanth (user 4f4538f4)
  '1e50592e-1f9f-4f64-939e-a10064b80f9d'   -- duplicate mr.x (user 74d55d32)
);

-- Prevent duplicate staff rows per user in the future
CREATE UNIQUE INDEX IF NOT EXISTS staff_user_id_unique_idx ON staff (user_id) WHERE user_id IS NOT NULL;