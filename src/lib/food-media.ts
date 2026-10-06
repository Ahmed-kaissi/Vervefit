/**
 * Food photography for the logging flow.
 *
 * Every URL here is deterministic — TheMealDB serves ingredient shots at
 * `/images/ingredients/<Name>.png` with a `-Small.png` variant — so there is no
 * search API, no key and no random result. Names were verified against the
 * live CDN, and anything unmapped falls back to a themed tile in `FoodThumb`
 * rather than a broken image.
 */

import type { MealType } from "@/lib/nutrition";

const INGREDIENT_BASE = "https://www.themealdb.com/images/ingredients";

/**
 * `FOOD_DATABASE` name -> TheMealDB ingredient. Two entries are deliberately
 * absent (whey powder, cottage cheese) because the CDN has no honest match for
 * them; those fall back to an icon tile.
 */
const INGREDIENT_BY_FOOD: Record<string, string> = {
  "Chicken Breast, Grilled": "Chicken Breast",
  "Beef, Lean Ground 90/10": "Minced Beef",
  "Salmon Fillet": "Salmon",
  "Tuna, Canned in Water": "Tuna",
  "Large Egg": "Egg",
  "Turkey Breast, Sliced": "Turkey",
  "Tofu, Firm": "Tofu",
  "Shrimp, Cooked": "Shrimp",
  "White Rice, Cooked": "Rice",
  "Brown Rice, Cooked": "Brown Rice",
  "Pasta, Cooked": "Penne Pasta",
  "Whole Wheat Bread": "Wholegrain Bread",
  "Rolled Oats, Dry": "Rolled Oats",
  "Sweet Potato, Baked": "Sweet Potatoes",
  "Potato, Baked": "Potatoes",
  "Quinoa, Cooked": "Quinoa",
  Banana: "Banana",
  Apple: "Apples",
  Orange: "Orange",
  Blueberries: "Blueberries",
  Strawberries: "Strawberries",
  Avocado: "Avocado",
  "Broccoli, Steamed": "Broccoli",
  "Spinach, Raw": "Spinach",
  "Mixed Salad Greens": "Lettuce",
  "Carrot, Raw": "Carrots",
  "Greek Yogurt, Plain": "Greek Yogurt",
  "Whole Milk": "Whole Milk",
  "Skim Milk": "Semi-skimmed Milk",
  "Cheddar Cheese": "Cheddar Cheese",
  "Mozzarella, Part-Skim": "Mozzarella",
  Almonds: "Almonds",
  "Peanut Butter": "Peanut Butter",
  Walnuts: "Walnuts",
  "Olive Oil": "Olive Oil",
  "Black Coffee": "Coffee",
  "Orange Juice": "Orange Juice",
  "Dark Chocolate 70%": "Dark Chocolate",
};

/**
 * Substring -> ingredient, for anything a user types in the custom tab. First
 * match wins, so the list is ordered from most to least specific.
 */
const INGREDIENT_KEYWORDS: [string, string][] = [
  ["chicken", "Chicken Breast"],
  ["beef", "Beef"],
  ["steak", "Beef"],
  ["mince", "Minced Beef"],
  ["salmon", "Salmon"],
  ["tuna", "Tuna"],
  ["turkey", "Turkey"],
  ["tofu", "Tofu"],
  ["prawn", "Prawns"],
  ["shrimp", "Shrimp"],
  ["yogurt", "Greek Yogurt"],
  ["yoghurt", "Greek Yogurt"],
  ["oat", "Rolled Oats"],
  ["cereal", "Rolled Oats"],
  ["granola", "Rolled Oats"],
  ["pasta", "Penne Pasta"],
  ["spaghetti", "Penne Pasta"],
  ["noodle", "Penne Pasta"],
  ["quinoa", "Quinoa"],
  ["rice", "Rice"],
  ["bread", "Wholegrain Bread"],
  ["toast", "Wholegrain Bread"],
  ["wrap", "Wholegrain Bread"],
  ["potato", "Potatoes"],
  ["egg", "Egg"],
  ["banana", "Banana"],
  ["apple", "Apples"],
  ["orange", "Orange"],
  ["strawberr", "Strawberries"],
  ["berry", "Blueberries"],
  ["avocado", "Avocado"],
  ["broccoli", "Broccoli"],
  ["spinach", "Spinach"],
  ["kale", "Spinach"],
  ["salad", "Lettuce"],
  ["lettuce", "Lettuce"],
  ["carrot", "Carrots"],
  ["tomato", "Tomatoes"],
  ["mushroom", "Mushrooms"],
  ["milk", "Whole Milk"],
  ["cheese", "Cheddar Cheese"],
  ["almond", "Almonds"],
  ["peanut", "Peanut Butter"],
  ["walnut", "Walnuts"],
  ["cashew", "Cashew Nuts"],
  ["olive", "Olive Oil"],
  ["coffee", "Coffee"],
  ["juice", "Orange Juice"],
  ["chocolate", "Dark Chocolate"],
  ["butter", "Butter"],
  ["honey", "Honey"],
];

/** Icon used when no photo exists — keyed by `FOOD_DATABASE` category. */
export const CATEGORY_EMOJI: Record<string, string> = {
  Protein: "🍗",
  Carbs: "🍚",
  Fruit: "🍓",
  Vegetables: "🥦",
  Dairy: "🥛",
  "Nuts & Fats": "🥜",
  Beverages: "☕",
  Snacks: "🍪",
  Other: "🍽️",
};

function ingredientUrl(slug: string, size: "thumb" | "full") {
  const suffix = size === "thumb" ? "-Small" : "";
  return `${INGREDIENT_BASE}/${encodeURIComponent(slug)}${suffix}.png`;
}

export interface FoodPhoto {
  thumb: string;
  full: string;
}

/**
 * Photo for a food, by exact database name first and keyword second, so custom
 * entries like "Homemade banana pancakes" still get a picture.
 */
export function foodPhoto(name: string): FoodPhoto | null {
  const exact = INGREDIENT_BY_FOOD[name];
  if (exact) return { thumb: ingredientUrl(exact, "thumb"), full: ingredientUrl(exact, "full") };

  const needle = name.trim().toLowerCase();
  if (!needle) return null;
  for (const [key, slug] of INGREDIENT_KEYWORDS) {
    if (needle.includes(key)) {
      return { thumb: ingredientUrl(slug, "thumb"), full: ingredientUrl(slug, "full") };
    }
  }
  return null;
}

/** Stable emoji for a food, used by the no-photo tile. */
export function foodEmoji(name: string, category?: string): string {
  if (category && CATEGORY_EMOJI[category]) return CATEGORY_EMOJI[category];

  const needle = name.toLowerCase();
  if (/egg/.test(needle)) return "🥚";
  if (/chicken|turkey|poultry/.test(needle)) return "🍗";
  if (/beef|steak|mince/.test(needle)) return "🥩";
  if (/salmon|tuna|fish|cod/.test(needle)) return "🐟";
  if (/shrimp|prawn/.test(needle)) return "🍤";
  if (/tofu|tempeh/.test(needle)) return "🧊";
  if (/rice|grain|oat|cereal/.test(needle)) return "🍚";
  if (/pasta|noodle|spaghetti/.test(needle)) return "🍝";
  if (/bread|toast|wrap|bagel/.test(needle)) return "🍞";
  if (/potato/.test(needle)) return "🥔";
  if (/salad|lettuce|spinach|veg/.test(needle)) return "🥗";
  if (/fruit|berry|apple|banana|orange/.test(needle)) return "🍓";
  if (/milk|yogurt|yoghurt|cheese|dairy/.test(needle)) return "🥛";
  if (/nut|almond|peanut|walnut|cashew/.test(needle)) return "🥜";
  if (/coffee|tea|juice|drink|smoothie/.test(needle)) return "🥤";
  if (/chocolate|cookie|cake|dessert|snack/.test(needle)) return "🍫";
  if (/whey|protein|powder|shake/.test(needle)) return "🥤";
  if (/oil|butter|fat/.test(needle)) return "🫒";
  return "🍽️";
}

export interface MealIdea {
  id: string;
  title: string;
  hint: string;
  /** Which section the add-food sheet opens on when this idea is tapped. */
  meal: MealType;
  image: string;
}

/**
 * Shown on the Today screen only while nothing is logged yet — a few real
 * plates to make the empty state feel like a menu instead of a form.
 */
export const MEAL_IDEAS: MealIdea[] = [
  {
    id: "omelette",
    title: "Bread omelette",
    hint: "Eggs + toasted bread",
    meal: "breakfast",
    image: "https://www.themealdb.com/images/media/meals/hqaejl1695738653.jpg",
  },
  {
    id: "breakfast-potatoes",
    title: "Breakfast potatoes",
    hint: "Potato + a poached egg",
    meal: "breakfast",
    image: "https://www.themealdb.com/images/media/meals/1550441882.jpg",
  },
  {
    id: "salmon",
    title: "Baked salmon",
    hint: "Fennel, tomato, rice",
    meal: "dinner",
    image: "https://www.themealdb.com/images/media/meals/1548772327.jpg",
  },
  {
    id: "couscous",
    title: "Aubergine couscous",
    hint: "Plant-based lunch bowl",
    meal: "lunch",
    image: "https://www.themealdb.com/images/media/meals/02s6gc1763799560.jpg",
  },
  {
    id: "avocado-dip",
    title: "Avocado dip",
    hint: "With new potatoes",
    meal: "lunch",
    image: "https://www.themealdb.com/images/media/meals/flrajf1762341295.jpg",
  },
  {
    id: "crumble",
    title: "Apple & blackberry",
    hint: "Something sweet",
    meal: "snack",
    image: "https://www.themealdb.com/images/media/meals/xvsurr1511719182.jpg",
  },
];
