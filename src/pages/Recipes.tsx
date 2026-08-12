import { useEffect, useState } from 'react';
import { ChefHat, Plus, Trash2, X, Search, UtensilsCrossed, DollarSign, Clock } from 'lucide-react';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type Item = Database['public']['Tables']['items']['Row'];
type Ingredient = Database['public']['Tables']['ingredients']['Row'];
type Recipe = Database['public']['Tables']['recipes']['Row'];
type RecipeIngredient = Database['public']['Tables']['recipe_ingredients']['Row'];

interface ItemWithRecipe extends Item {
  recipe: Recipe | null;
  recipe_ingredients: RecipeIngredient[];
  category: { name: string } | null;
}

export function Recipes() {
  const { business, isAllBranches, branches } = useAuth();
  const [items, setItems] = useState<ItemWithRecipe[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState<ItemWithRecipe | null>(null);
  const [showAddIngredient, setShowAddIngredient] = useState(false);
  const [newIngredientId, setNewIngredientId] = useState('');
  const [newQuantity, setNewQuantity] = useState('');
  const [newUnit, setNewUnit] = useState('kg');
  const [saving, setSaving] = useState(false);

  const businessIds = isAllBranches ? branches.map((b) => b.id) : business ? [business.id] : [];

  useEffect(() => {
    if (businessIds.length > 0) {
      loadData();
    }
  }, [businessIds.join(',')]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: itemsData } = await supabase
        .from('items')
        .select('*, category:categories(name)')
        .in('business_id', businessIds)
        .order('name');

      const { data: recipesData } = await supabase
        .from('recipes')
        .select('*')
        .in('business_id', businessIds);

      const { data: recipeIngredientsData } = await supabase
        .from('recipe_ingredients')
        .select('*, recipe:recipes(id)')
        .in('recipe_id', (recipesData || []).map((r: Recipe) => r.id));

      const { data: ingredientsData } = await supabase
        .from('ingredients')
        .select('*')
        .in('business_id', businessIds)
        .order('name');

      const recipeByItem = new Map<string, Recipe>();
      (recipesData || []).forEach((r: Recipe) => {
        recipeByItem.set(r.item_id, r);
      });

      const recipeIdToItem = new Map<string, string>();
      (recipesData || []).forEach((r: Recipe) => {
        recipeIdToItem.set(r.id, r.item_id);
      });

      const ingredientsByItem = new Map<string, RecipeIngredient[]>();
      (recipeIngredientsData || []).forEach((ri: RecipeIngredient & { recipe: { id: string } | null }) => {
        const itemId = ri.recipe ? recipeIdToItem.get(ri.recipe.id) : null;
        if (itemId) {
          const arr = ingredientsByItem.get(itemId) || [];
          arr.push(ri);
          ingredientsByItem.set(itemId, arr);
        }
      });

      const itemsWithRecipes: ItemWithRecipe[] = (itemsData || []).map((item: ItemWithRecipe) => ({
        ...item,
        recipe: recipeByItem.get(item.id) || null,
        recipe_ingredients: ingredientsByItem.get(item.id) || [],
      }));

      setItems(itemsWithRecipes);
      setIngredients(ingredientsData || []);
    } catch (error) {
      console.error('Error loading recipes:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  const computeRecipeCost = (recipeIngredients: RecipeIngredient[]): number => {
    return recipeIngredients.reduce((sum, ri) => sum + (ri.total_cost || 0), 0);
  };

  const openItem = (item: ItemWithRecipe) => {
    setSelectedItem(item);
    setShowAddIngredient(false);
  };

  const ensureRecipe = async (item: ItemWithRecipe): Promise<string> => {
    if (selectedItem?.recipe) return selectedItem.recipe.id;
    if (!item.business_id) throw new Error('No business for item');
    const { data, error } = await supabase
      .from('recipes')
      .insert({
        business_id: item.business_id,
        item_id: item.id,
        name: item.name,
        yield_quantity: 1,
        yield_unit: 'serving',
        prep_time_minutes: 0,
        cook_time_minutes: 0,
        total_cost: 0,
        is_active: true,
      } as never)
      .select('*')
      .single();
    if (error) throw error;
    return data.id;
  };

  const addIngredient = async () => {
    if (!selectedItem || !newIngredientId || !newQuantity) return;
    setSaving(true);
    try {
      const ingredient = ingredients.find((i) => i.id === newIngredientId);
      if (!ingredient) return;

      const recipeId = await ensureRecipe(selectedItem);
      const qty = parseFloat(newQuantity);
      const unit = newUnit || ingredient.unit || 'kg';
      const totalCost = qty * ingredient.cost_per_unit;

      const { data, error } = await supabase
        .from('recipe_ingredients')
        .insert({
          recipe_id: recipeId,
          ingredient_name: ingredient.name,
          quantity: qty,
          unit: unit,
          cost_per_unit: ingredient.cost_per_unit,
          total_cost: totalCost,
          ingredient_id: ingredient.id,
        } as never)
        .select('*')
        .single();

      if (error) throw error;

      const updatedRecipe = selectedItem.recipe || {
        id: recipeId,
        business_id: selectedItem.business_id,
        item_id: selectedItem.id,
        name: selectedItem.name,
        description: null,
        yield_quantity: 1,
        yield_unit: 'serving',
        prep_time_minutes: 0,
        cook_time_minutes: 0,
        total_cost: 0,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const newCost = computeRecipeCost(selectedItem.recipe_ingredients) + totalCost;
      await supabase
        .from('recipes')
        .update({ total_cost: newCost } as never)
        .eq('id', recipeId);

      const updated: ItemWithRecipe = {
        ...selectedItem,
        recipe: { ...updatedRecipe, total_cost: newCost },
        recipe_ingredients: [...selectedItem.recipe_ingredients, data as RecipeIngredient],
      };
      setSelectedItem(updated);
      setItems(items.map((i) => (i.id === updated.id ? updated : i)));
      setNewIngredientId('');
      setNewQuantity('');
      setNewUnit('kg');
      setShowAddIngredient(false);
    } catch (error) {
      console.error('Error adding ingredient:', error);
      alert('Failed to add ingredient to recipe.');
    } finally {
      setSaving(false);
    }
  };

  const removeIngredient = async (recipeIngredientId: string) => {
    if (!selectedItem) return;
    try {
      const ri = selectedItem.recipe_ingredients.find((r) => r.id === recipeIngredientId);
      if (!ri) return;

      const { error } = await supabase.from('recipe_ingredients').delete().eq('id', recipeIngredientId);
      if (error) throw error;

      const newCost = computeRecipeCost(selectedItem.recipe_ingredients) - (ri.total_cost || 0);
      if (selectedItem.recipe) {
        await supabase
          .from('recipes')
          .update({ total_cost: Math.max(0, newCost) } as never)
          .eq('id', selectedItem.recipe.id);
      }

      const updated: ItemWithRecipe = {
        ...selectedItem,
        recipe: selectedItem.recipe ? { ...selectedItem.recipe, total_cost: Math.max(0, newCost) } : null,
        recipe_ingredients: selectedItem.recipe_ingredients.filter((r) => r.id !== recipeIngredientId),
      };
      setSelectedItem(updated);
      setItems(items.map((i) => (i.id === updated.id ? updated : i)));
    } catch (error) {
      console.error('Error removing ingredient:', error);
      alert('Failed to remove ingredient.');
    }
  };

  const availableIngredients = ingredients.filter(
    (ing) => !selectedItem?.recipe_ingredients.some((r) => r.ingredient_id === ing.id)
  );

  return (
    <Layout>
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <ChefHat className="w-7 h-7 text-amber-500" />
          <h1 className="text-2xl font-bold text-gray-900">Recipe Book</h1>
        </div>
        <p className="text-gray-600">Manage ingredient compositions and track recipe costs for each menu item</p>
      </div>

      <div className="mb-6 relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search menu items..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => {
            const recipeCost = item.recipe?.total_cost || computeRecipeCost(item.recipe_ingredients);
            const margin = item.price > 0 ? ((item.price - recipeCost) / item.price) * 100 : 0;
            return (
              <button
                key={item.id}
                onClick={() => openItem(item)}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 text-left hover:shadow-md hover:border-amber-300 transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 group-hover:text-amber-600 transition-colors">{item.name}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">{item.category?.name || 'Uncategorized'}</p>
                  </div>
                  <span className="text-lg font-bold text-gray-900">₹{item.price}</span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1.5">
                    <UtensilsCrossed className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">{item.recipe_ingredients.length} ingredient{item.recipe_ingredients.length !== 1 ? 's' : ''}</span>
                  </div>
                  {item.recipe_ingredients.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4 text-gray-400" />
                      <span className={margin > 60 ? 'text-green-600 font-medium' : margin > 30 ? 'text-amber-600 font-medium' : 'text-red-600 font-medium'}>
                        ₹{recipeCost.toFixed(2)} cost · {margin.toFixed(0)}% margin
                      </span>
                    </div>
                  )}
                </div>
                {item.recipe_ingredients.length === 0 && (
                  <p className="text-xs text-gray-400 mt-2 italic">No recipe configured — click to add ingredients</p>
                )}
              </button>
            );
          })}
          {filteredItems.length === 0 && (
            <div className="col-span-full text-center py-16 text-gray-400">
              <ChefHat className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No menu items found.</p>
            </div>
          )}
        </div>
      )}

      {selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedItem(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-xl">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{selectedItem.name}</h2>
                <p className="text-sm text-gray-500">
                  Selling price: ₹{selectedItem.price} · Category: {selectedItem.category?.name || 'Uncategorized'}
                </p>
              </div>
              <button onClick={() => setSelectedItem(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
                  <p className="text-xs text-amber-600 font-medium mb-1">Recipe Cost</p>
                  <p className="text-xl font-bold text-amber-700">₹{(selectedItem.recipe?.total_cost || computeRecipeCost(selectedItem.recipe_ingredients)).toFixed(2)}</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                  <p className="text-xs text-blue-600 font-medium mb-1">Selling Price</p>
                  <p className="text-xl font-bold text-blue-700">₹{selectedItem.price}</p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <p className="text-xs text-green-600 font-medium mb-1">Gross Margin</p>
                  <p className="text-xl font-bold text-green-700">
                    {selectedItem.price > 0
                      ? `${(((selectedItem.price - (selectedItem.recipe?.total_cost || computeRecipeCost(selectedItem.recipe_ingredients))) / selectedItem.price) * 100).toFixed(0)}%`
                      : '—'}
                  </p>
                </div>
              </div>

              {selectedItem.recipe && (selectedItem.recipe.prep_time_minutes > 0 || selectedItem.recipe.cook_time_minutes > 0) && (
                <div className="flex items-center gap-4 mb-6 text-sm">
                  {selectedItem.recipe.prep_time_minutes > 0 && (
                    <div className="flex items-center gap-1.5 text-gray-600">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span>Prep: {selectedItem.recipe.prep_time_minutes} min</span>
                    </div>
                  )}
                  {selectedItem.recipe.cook_time_minutes > 0 && (
                    <div className="flex items-center gap-1.5 text-gray-600">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span>Cook: {selectedItem.recipe.cook_time_minutes} min</span>
                    </div>
                  )}
                </div>
              )}

              <div className="mb-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Ingredients</h3>
                {selectedItem.recipe_ingredients.length === 0 ? (
                  <p className="text-gray-400 text-sm italic py-4 text-center bg-gray-50 rounded-lg">
                    No ingredients added yet. Add ingredients below to calculate recipe cost.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedItem.recipe_ingredients.map((ri) => (
                      <div key={ri.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{ri.ingredient_name}</p>
                          <p className="text-xs text-gray-500">
                            {ri.quantity} {ri.unit} × ₹{ri.cost_per_unit.toFixed(2)}/{ri.unit}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-gray-700">₹{(ri.total_cost || 0).toFixed(2)}</span>
                          <button onClick={() => removeIngredient(ri.id)} className="text-red-400 hover:text-red-600 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {showAddIngredient ? (
                <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                  <h4 className="text-sm font-semibold text-gray-900">Add Ingredient</h4>
                  {availableIngredients.length === 0 ? (
                    <p className="text-sm text-gray-500">All ingredients already added. Add more ingredients in the Inventory page first.</p>
                  ) : (
                    <div className="space-y-3">
                      <select
                        value={newIngredientId}
                        onChange={(e) => setNewIngredientId(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                      >
                        <option value="">Select ingredient...</option>
                        {availableIngredients.map((ing) => (
                          <option key={ing.id} value={ing.id}>
                            {ing.name} (₹{ing.cost_per_unit.toFixed(2)}/{ing.unit})
                          </option>
                        ))}
                      </select>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <div className="md:col-span-1">
                          <label className="block text-xs text-gray-500 mb-1">Quantity</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="Qty"
                            value={newQuantity}
                            onChange={(e) => setNewQuantity(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                          />
                        </div>
                        <div className="md:col-span-1">
                          <label className="block text-xs text-gray-500 mb-1">Unit</label>
                          <select
                            value={newUnit}
                            onChange={(e) => setNewUnit(e.target.value)}
                            className="w-full px-4 py-2 border border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                          >
                            <option value="kg">kg</option>
                            <option value="g">g</option>
                            <option value="ml">ml</option>
                            <option value="l">l</option>
                            <option value="piece">piece</option>
                            <option value="teaspoon">teaspoon</option>
                            <option value="tablespoon">tablespoon</option>
                            <option value="cup">cup</option>
                            <option value="serving">serving</option>
                          </select>
                        </div>
                        <div className="md:col-span-1 flex items-end">
                          <button
                            onClick={addIngredient}
                            disabled={saving || !newIngredientId || !newQuantity}
                            className="w-full px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  <button onClick={() => setShowAddIngredient(false)} className="text-sm text-gray-500 hover:text-gray-700">
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAddIngredient(true)}
                  className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-amber-500 hover:text-amber-600 transition-colors w-full justify-center"
                >
                  <Plus className="w-4 h-4" />
                  Add Ingredient
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}


export { Recipes }