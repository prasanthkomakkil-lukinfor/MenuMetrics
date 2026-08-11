-- Drop duplicate restrictive recipes INSERT policy
DROP POLICY IF EXISTS "insert_own_recipes" ON recipes;

-- Fix SELECT policies to use brand-aware access
DROP POLICY IF EXISTS "tables_select_own" ON tables;
CREATE POLICY "tables_select_own" ON tables FOR SELECT
  TO authenticated USING (user_has_business_access(business_id));

DROP POLICY IF EXISTS "tables_update_own" ON tables;
CREATE POLICY "tables_update_own" ON tables FOR UPDATE
  TO authenticated USING (user_has_business_access(business_id)) WITH CHECK (user_has_business_access(business_id));

DROP POLICY IF EXISTS "tables_delete_own" ON tables;
CREATE POLICY "tables_delete_own" ON tables FOR DELETE
  TO authenticated USING (user_has_business_access(business_id));

DROP POLICY IF EXISTS "items_select_own" ON items;
CREATE POLICY "items_select_own" ON items FOR SELECT
  TO authenticated USING (user_has_business_access(business_id));

DROP POLICY IF EXISTS "items_update_own" ON items;
CREATE POLICY "items_update_own" ON items FOR UPDATE
  TO authenticated USING (user_has_business_access(business_id)) WITH CHECK (user_has_business_access(business_id));

DROP POLICY IF EXISTS "items_delete_own" ON items;
CREATE POLICY "items_delete_own" ON items FOR DELETE
  TO authenticated USING (user_has_business_access(business_id));

DROP POLICY IF EXISTS "categories_select_own" ON categories;
CREATE POLICY "categories_select_own" ON categories FOR SELECT
  TO authenticated USING (user_has_business_access(business_id));

DROP POLICY IF EXISTS "categories_update_own" ON categories;
CREATE POLICY "categories_update_own" ON categories FOR UPDATE
  TO authenticated USING (user_has_business_access(business_id)) WITH CHECK (user_has_business_access(business_id));

DROP POLICY IF EXISTS "categories_delete_own" ON categories;
CREATE POLICY "categories_delete_own" ON categories FOR DELETE
  TO authenticated USING (user_has_business_access(business_id));

DROP POLICY IF EXISTS "recipes_select_own" ON recipes;
CREATE POLICY "recipes_select_own" ON recipes FOR SELECT
  TO authenticated USING (user_has_business_access(business_id));

DROP POLICY IF EXISTS "recipes_update_own" ON recipes;
CREATE POLICY "recipes_update_own" ON recipes FOR UPDATE
  TO authenticated USING (user_has_business_access(business_id)) WITH CHECK (user_has_business_access(business_id));

DROP POLICY IF EXISTS "recipes_delete_own" ON recipes;
CREATE POLICY "recipes_delete_own" ON recipes FOR DELETE
  TO authenticated USING (user_has_business_access(business_id));

-- Fix recipe_ingredients policies
DROP POLICY IF EXISTS "recipe_ingredients_select_own" ON recipe_ingredients;
CREATE POLICY "recipe_ingredients_select_own" ON recipe_ingredients FOR SELECT
  TO authenticated USING (
    recipe_id IN (SELECT id FROM recipes WHERE user_has_business_access(business_id))
  );

DROP POLICY IF EXISTS "recipe_ingredients_insert_own" ON recipe_ingredients;
CREATE POLICY "recipe_ingredients_insert_own" ON recipe_ingredients FOR INSERT
  TO authenticated WITH CHECK (
    recipe_id IN (SELECT id FROM recipes WHERE user_has_business_access(business_id))
  );

DROP POLICY IF EXISTS "recipe_ingredients_update_own" ON recipe_ingredients;
CREATE POLICY "recipe_ingredients_update_own" ON recipe_ingredients FOR UPDATE
  TO authenticated USING (
    recipe_id IN (SELECT id FROM recipes WHERE user_has_business_access(business_id))
  ) WITH CHECK (
    recipe_id IN (SELECT id FROM recipes WHERE user_has_business_access(business_id))
  );

DROP POLICY IF EXISTS "recipe_ingredients_delete_own" ON recipe_ingredients;
CREATE POLICY "recipe_ingredients_delete_own" ON recipe_ingredients FOR DELETE
  TO authenticated USING (
    recipe_id IN (SELECT id FROM recipes WHERE user_has_business_access(business_id))
  );

-- Fix ingredients SELECT/UPDATE/DELETE
DROP POLICY IF EXISTS "ingredients_select_own" ON ingredients;
CREATE POLICY "ingredients_select_own" ON ingredients FOR SELECT
  TO authenticated USING (user_has_business_access(business_id));

DROP POLICY IF EXISTS "ingredients_update_own" ON ingredients;
CREATE POLICY "ingredients_update_own" ON ingredients FOR UPDATE
  TO authenticated USING (user_has_business_access(business_id)) WITH CHECK (user_has_business_access(business_id));

DROP POLICY IF EXISTS "ingredients_delete_own" ON ingredients;
CREATE POLICY "ingredients_delete_own" ON ingredients FOR DELETE
  TO authenticated USING (user_has_business_access(business_id));

-- Fix table_sections policies
DROP POLICY IF EXISTS "table_sections_select_own" ON table_sections;
CREATE POLICY "table_sections_select_own" ON table_sections FOR SELECT
  TO authenticated USING (user_has_business_access(business_id));

DROP POLICY IF EXISTS "table_sections_insert_own" ON table_sections;
CREATE POLICY "table_sections_insert_own" ON table_sections FOR INSERT
  TO authenticated WITH CHECK (user_has_business_access(business_id));

DROP POLICY IF EXISTS "table_sections_update_own" ON table_sections;
CREATE POLICY "table_sections_update_own" ON table_sections FOR UPDATE
  TO authenticated USING (user_has_business_access(business_id)) WITH CHECK (user_has_business_access(business_id));

DROP POLICY IF EXISTS "table_sections_delete_own" ON table_sections;
CREATE POLICY "table_sections_delete_own" ON table_sections FOR DELETE
  TO authenticated USING (user_has_business_access(business_id));

-- Recreate the signup trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();