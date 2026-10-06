import type { FoodItem } from "./nutrition";

/**
 * Curated offline food database (~40 common items).
 * Powers guest mode immediately; also a fallback when the shared
 * cloud food database is still empty.
 */
export const FOOD_DATABASE: FoodItem[] = [
  { name: "Chicken Breast, Grilled", category: "Protein", servingSize: 100, servingUnit: "g", servingLabel: "100 g", calories: 165, proteinG: 31, carbsG: 0, fatG: 3.6 },
  { name: "Beef, Lean Ground 90/10", category: "Protein", servingSize: 100, servingUnit: "g", servingLabel: "100 g", calories: 176, proteinG: 20, carbsG: 0, fatG: 10 },
  { name: "Salmon Fillet", category: "Protein", servingSize: 100, servingUnit: "g", servingLabel: "100 g", calories: 208, proteinG: 20, carbsG: 0, fatG: 13 },
  { name: "Tuna, Canned in Water", category: "Protein", servingSize: 100, servingUnit: "g", servingLabel: "100 g", calories: 116, proteinG: 26, carbsG: 0, fatG: 1 },
  { name: "Large Egg", category: "Protein", servingSize: 1, servingUnit: "egg", servingLabel: "1 egg (50 g)", calories: 72, proteinG: 6.3, carbsG: 0.4, fatG: 4.8 },
  { name: "Turkey Breast, Sliced", category: "Protein", servingSize: 100, servingUnit: "g", servingLabel: "100 g", calories: 104, proteinG: 17, carbsG: 4, fatG: 2 },
  { name: "Tofu, Firm", category: "Protein", servingSize: 100, servingUnit: "g", servingLabel: "100 g", calories: 144, proteinG: 17, carbsG: 3, fatG: 9 },
  { name: "Shrimp, Cooked", category: "Protein", servingSize: 100, servingUnit: "g", servingLabel: "100 g", calories: 99, proteinG: 24, carbsG: 0, fatG: 0.3 },
  { name: "White Rice, Cooked", category: "Carbs", servingSize: 100, servingUnit: "g", servingLabel: "100 g", calories: 130, proteinG: 2.7, carbsG: 28, fatG: 0.3 },
  { name: "Brown Rice, Cooked", category: "Carbs", servingSize: 100, servingUnit: "g", servingLabel: "100 g", calories: 123, proteinG: 2.7, carbsG: 26, fatG: 1 },
  { name: "Pasta, Cooked", category: "Carbs", servingSize: 100, servingUnit: "g", servingLabel: "100 g", calories: 158, proteinG: 5.8, carbsG: 31, fatG: 0.9 },
  { name: "Whole Wheat Bread", category: "Carbs", servingSize: 1, servingUnit: "slice", servingLabel: "1 slice (32 g)", calories: 81, proteinG: 4, carbsG: 14, fatG: 1.1 },
  { name: "Rolled Oats, Dry", category: "Carbs", servingSize: 40, servingUnit: "g", servingLabel: "40 g (½ cup)", calories: 152, proteinG: 5.3, carbsG: 27, fatG: 2.6 },
  { name: "Sweet Potato, Baked", category: "Carbs", servingSize: 100, servingUnit: "g", servingLabel: "100 g", calories: 90, proteinG: 2, carbsG: 21, fatG: 0.1 },
  { name: "Potato, Baked", category: "Carbs", servingSize: 100, servingUnit: "g", servingLabel: "100 g", calories: 93, proteinG: 2.5, carbsG: 21, fatG: 0.1 },
  { name: "Quinoa, Cooked", category: "Carbs", servingSize: 100, servingUnit: "g", servingLabel: "100 g", calories: 120, proteinG: 4.4, carbsG: 21, fatG: 1.9 },
  { name: "Banana", category: "Fruit", servingSize: 1, servingUnit: "medium", servingLabel: "1 medium (118 g)", calories: 105, proteinG: 1.3, carbsG: 27, fatG: 0.4 },
  { name: "Apple", category: "Fruit", servingSize: 1, servingUnit: "medium", servingLabel: "1 medium (182 g)", calories: 95, proteinG: 0.5, carbsG: 25, fatG: 0.3 },
  { name: "Orange", category: "Fruit", servingSize: 1, servingUnit: "medium", servingLabel: "1 medium (131 g)", calories: 62, proteinG: 1.2, carbsG: 15, fatG: 0.2 },
  { name: "Blueberries", category: "Fruit", servingSize: 100, servingUnit: "g", servingLabel: "100 g", calories: 57, proteinG: 0.7, carbsG: 14, fatG: 0.3 },
  { name: "Strawberries", category: "Fruit", servingSize: 100, servingUnit: "g", servingLabel: "100 g", calories: 32, proteinG: 0.7, carbsG: 7.7, fatG: 0.3 },
  { name: "Avocado", category: "Fruit", servingSize: 100, servingUnit: "g", servingLabel: "100 g", calories: 160, proteinG: 2, carbsG: 9, fatG: 15 },
  { name: "Broccoli, Steamed", category: "Vegetables", servingSize: 100, servingUnit: "g", servingLabel: "100 g", calories: 35, proteinG: 2.4, carbsG: 7, fatG: 0.4 },
  { name: "Spinach, Raw", category: "Vegetables", servingSize: 100, servingUnit: "g", servingLabel: "100 g", calories: 23, proteinG: 2.9, carbsG: 3.6, fatG: 0.4 },
  { name: "Mixed Salad Greens", category: "Vegetables", servingSize: 100, servingUnit: "g", servingLabel: "100 g", calories: 17, proteinG: 1.4, carbsG: 3.3, fatG: 0.2 },
  { name: "Carrot, Raw", category: "Vegetables", servingSize: 100, servingUnit: "g", servingLabel: "100 g", calories: 41, proteinG: 0.9, carbsG: 10, fatG: 0.2 },
  { name: "Greek Yogurt, Plain", category: "Dairy", servingSize: 170, servingUnit: "g", servingLabel: "1 cup (170 g)", calories: 100, proteinG: 17, carbsG: 6, fatG: 0.7 },
  { name: "Cottage Cheese, Low-Fat", category: "Dairy", servingSize: 100, servingUnit: "g", servingLabel: "100 g", calories: 81, proteinG: 11, carbsG: 3.4, fatG: 2.3 },
  { name: "Whole Milk", category: "Dairy", servingSize: 240, servingUnit: "ml", servingLabel: "1 cup (240 ml)", calories: 149, proteinG: 7.7, carbsG: 12, fatG: 8 },
  { name: "Skim Milk", category: "Dairy", servingSize: 240, servingUnit: "ml", servingLabel: "1 cup (240 ml)", calories: 83, proteinG: 8.3, carbsG: 12, fatG: 0.2 },
  { name: "Cheddar Cheese", category: "Dairy", servingSize: 28, servingUnit: "g", servingLabel: "1 oz (28 g)", calories: 115, proteinG: 7, carbsG: 0.4, fatG: 9.4 },
  { name: "Mozzarella, Part-Skim", category: "Dairy", servingSize: 28, servingUnit: "g", servingLabel: "1 oz (28 g)", calories: 72, proteinG: 6.9, carbsG: 0.8, fatG: 4.5 },
  { name: "Almonds", category: "Nuts & Fats", servingSize: 28, servingUnit: "g", servingLabel: "1 oz (28 g)", calories: 164, proteinG: 6, carbsG: 6.1, fatG: 14 },
  { name: "Peanut Butter", category: "Nuts & Fats", servingSize: 32, servingUnit: "g", servingLabel: "2 tbsp (32 g)", calories: 188, proteinG: 8, carbsG: 6.4, fatG: 16 },
  { name: "Walnuts", category: "Nuts & Fats", servingSize: 28, servingUnit: "g", servingLabel: "1 oz (28 g)", calories: 185, proteinG: 4.3, carbsG: 3.9, fatG: 18 },
  { name: "Olive Oil", category: "Nuts & Fats", servingSize: 14, servingUnit: "g", servingLabel: "1 tbsp (14 g)", calories: 119, proteinG: 0, carbsG: 0, fatG: 13.5 },
  { name: "Protein Whey Powder", category: "Protein", servingSize: 30, servingUnit: "g", servingLabel: "1 scoop (30 g)", calories: 120, proteinG: 24, carbsG: 3, fatG: 1.5 },
  { name: "Black Coffee", category: "Beverages", servingSize: 240, servingUnit: "ml", servingLabel: "1 cup (240 ml)", calories: 2, proteinG: 0.3, carbsG: 0, fatG: 0 },
  { name: "Orange Juice", category: "Beverages", servingSize: 240, servingUnit: "ml", servingLabel: "1 cup (240 ml)", calories: 112, proteinG: 1.7, carbsG: 26, fatG: 0.5 },
  { name: "Dark Chocolate 70%", category: "Snacks", servingSize: 28, servingUnit: "g", servingLabel: "1 oz (28 g)", calories: 170, proteinG: 2.2, carbsG: 13, fatG: 12 },
];
