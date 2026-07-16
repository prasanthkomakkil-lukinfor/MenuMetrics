/*
# Set all businesses to Pro plan and remove trial restrictions

1. Updates all rows in `businesses` table:
   - Sets `plan` to 'pro' for every business
   - Sets `trial_ends_at` to NULL (no trial expiry)
2. Security: No RLS policy changes
3. Important notes:
   - This removes all plan-based feature gating
   - All businesses now have full Pro access
   - Trial banners will no longer appear
*/

UPDATE businesses SET plan = 'pro', trial_ends_at = NULL;
