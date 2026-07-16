/*
# Clear all stored demo credentials and auth users

1. Removes all demo/stored auth users from auth.users table
2. Cascades to remove associated staff, business references
3. This clears all login IDs and passwords so users start fresh
4. Security: No RLS changes
5. Important: After this migration, all previous demo accounts are gone.
   Users must sign up fresh with email verification (OTP).
*/

DELETE FROM auth.users;
