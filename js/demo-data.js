// demo-data.js — three FICTIONAL demonstration products so ScanWise can be
// fully exercised without a camera or AI API. Each provides the same raw
// inputs a real scan produces, and is run through the real analyzer pipeline.

export const DEMO_PRODUCTS = [
  {
    id: 'demo-morning-crunch',
    demo: true,
    emoji: '🥣',
    productName: 'Morning Crunch Cereal',
    brand: 'Sunrise Foods (fictional)',
    ingredientsText:
      'Ingredients: Milled corn, sugar, wheat flour, corn syrup, salt, ' +
      'natural and artificial flavor, red 40, yellow 5, blue 1, BHT (to preserve freshness), ' +
      'reduced iron, niacinamide, riboflavin, folic acid, vitamin D3. Contains: Wheat.',
    nutritionText:
      'Serving size: 1 cup (39 g). Calories 150. Saturated fat 0.5 g. Sodium 190 mg. ' +
      'Dietary fiber 1 g. Includes 14 g added sugars. Protein 2 g.',
  },
  {
    id: 'demo-simple-oat-bar',
    demo: true,
    emoji: '🌾',
    productName: 'Simple Oat Bar',
    brand: 'Field & Grain Co. (fictional)',
    ingredientsText:
      'Ingredients: Whole grain oats, almonds, honey, sunflower oil, chicory root fiber, ' +
      'sea salt, vanilla extract. Contains: Tree nuts. May contain peanuts.',
    nutritionText:
      'Serving size: 1 bar (40 g). Calories 180. Saturated fat 1 g. Sodium 95 mg. ' +
      'Dietary fiber 5 g. Includes 5 g added sugars. Protein 6 g.',
  },
  {
    id: 'demo-garden-tomato-soup',
    demo: true,
    emoji: '🍅',
    productName: 'Garden Tomato Soup',
    brand: 'Hearth Pantry (fictional)',
    ingredientsText:
      'Ingredients: Water, tomato paste, sugar, modified corn starch, salt, ' +
      'canola oil, citric acid, natural flavor, garlic powder, basil.',
    nutritionText:
      'Serving size: 1 cup (245 g). Calories 90. Saturated fat 0 g. Sodium 480 mg. ' +
      'Dietary fiber 2 g. Includes 8 g added sugars. Protein 2 g.',
  },
];

export function getDemoProduct(id) {
  return DEMO_PRODUCTS.find((p) => p.id === id) || null;
}
