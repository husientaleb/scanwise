// ingredients-db.js — a balanced, evidence-oriented knowledge base of common
// packaged-food ingredients. Entries deliberately avoid fear-based language;
// concern levels reflect mainstream regulatory/nutrition consensus, and dose
// and dietary context are emphasized in the copy.

// match: lowercase substrings/aliases checked against a normalized ingredient name.
// allergen: one of the 9 major allergens this ingredient implies, if any.

export const INGREDIENT_DB = [
  // ——— Whole / common food ingredients ———
  {
    match: ['whole grain oats', 'oats', 'oat flour', 'rolled oats', 'whole oat'],
    name: 'Oats', category: 'Common food ingredient', concernLevel: 'low',
    purpose: 'Primary grain base providing structure, texture, and nutrition.',
    explanation: 'A whole grain cereal. Oats provide complex carbohydrates, fiber (including beta-glucan), and some protein.',
    evidence: 'Oat fiber is consistently associated with supporting healthy cholesterol levels as part of an overall balanced diet.',
    attention: 'People avoiding gluten should look for certified gluten-free oats, since oats are often processed alongside wheat.',
  },
  {
    match: ['whole wheat', 'wheat flour', 'enriched flour', 'enriched wheat flour', 'wheat'],
    name: 'Wheat flour', category: 'Common food ingredient', concernLevel: 'low', allergen: 'Wheat', gluten: true,
    purpose: 'Main structural grain in baked and extruded products.',
    explanation: 'Milled wheat. "Enriched" means B vitamins and iron were added back after milling; "whole wheat" keeps the bran and germ, which adds fiber.',
    evidence: 'Whole-grain versions carry more fiber and micronutrients than refined flour. Refined flour is not harmful in itself; overall dietary pattern matters most.',
    attention: 'Wheat is a major allergen and contains gluten, relevant for celiac disease or gluten sensitivity.',
  },
  {
    match: ['rice', 'brown rice', 'rice flour'],
    name: 'Rice', category: 'Common food ingredient', concernLevel: 'low',
    purpose: 'Grain base; adds crispness in cereals and bars.',
    explanation: 'A gluten-free grain. Brown rice keeps the bran layer and more fiber than white rice.',
    evidence: 'A neutral staple grain. Fiber and nutrient content depend on whether it is whole (brown) or refined (white).',
    attention: 'No common concerns at typical serving sizes.',
  },
  {
    match: ['corn', 'corn flour', 'cornmeal', 'corn meal', 'milled corn'],
    name: 'Corn', category: 'Common food ingredient', concernLevel: 'low',
    purpose: 'Grain base providing structure and a naturally sweet flavor.',
    explanation: 'Ground maize. A gluten-free staple grain used widely in cereals and snacks.',
    evidence: 'A common food grain with no specific safety concerns at normal intakes.',
    attention: 'No common concerns for most people.',
  },
  {
    match: ['tomato', 'tomatoes', 'tomato paste', 'tomato puree'],
    name: 'Tomatoes', category: 'Common food ingredient', concernLevel: 'low',
    purpose: 'Primary vegetable ingredient providing flavor, body, and color.',
    explanation: 'A vegetable (botanically a fruit) rich in vitamin C and lycopene.',
    evidence: 'Vegetable intake, including tomatoes, is broadly associated with positive health outcomes.',
    attention: 'A small number of people find acidic foods like tomatoes aggravate reflux.',
  },
  {
    match: ['water'],
    name: 'Water', category: 'Common food ingredient', concernLevel: 'low',
    purpose: 'Base liquid for soups, sauces, and beverages.',
    explanation: 'Plain water used as the main liquid.',
    evidence: 'No concerns.',
    attention: 'No concerns.',
  },
  {
    match: ['almond', 'almonds'],
    name: 'Almonds', category: 'Common food ingredient', concernLevel: 'low', allergen: 'Tree nuts',
    purpose: 'Adds protein, healthy fats, crunch, and flavor.',
    explanation: 'A tree nut providing unsaturated fats, protein, fiber, and vitamin E.',
    evidence: 'Regular nut consumption is associated with heart-health benefits in large observational studies.',
    attention: 'Almonds are a tree nut — a major allergen. Anyone with a tree-nut allergy should avoid this product.',
  },
  {
    match: ['peanut', 'peanuts', 'peanut butter'],
    name: 'Peanuts', category: 'Common food ingredient', concernLevel: 'low', allergen: 'Peanuts',
    purpose: 'Adds protein, fats, and flavor.',
    explanation: 'A legume (not a true nut) rich in protein and unsaturated fats.',
    evidence: 'Nutritionally similar to tree nuts, with comparable heart-health associations.',
    attention: 'Peanut is one of the most common serious food allergens. Strict avoidance is essential for allergic individuals.',
  },
  {
    match: ['honey'],
    name: 'Honey', category: 'Sweetener', concernLevel: 'moderate', nonVegan: true,
    purpose: 'Natural sweetener; also binds ingredients in bars and granola.',
    explanation: 'A sugar-rich syrup made by bees. Nutritionally it behaves much like other added sugars.',
    evidence: 'Counts toward added-sugar intake despite its natural origin. The total amount matters more than the source.',
    attention: 'Not for infants under 12 months (botulism risk). People limiting added sugar should count honey toward that total.',
  },
  {
    match: ['raisin', 'raisins', 'cranberry', 'cranberries', 'dried cranberries', 'dates', 'dried fruit'],
    name: 'Dried fruit', category: 'Common food ingredient', concernLevel: 'low',
    purpose: 'Adds natural sweetness, chew, and some fiber.',
    explanation: 'Fruit with the water removed, which concentrates both nutrients and natural sugars.',
    evidence: 'Contributes fiber and micronutrients, though the sugars are concentrated relative to fresh fruit.',
    attention: 'People closely managing blood sugar may want to note the concentrated natural sugars.',
  },
  {
    match: ['olive oil', 'extra virgin olive oil'],
    name: 'Olive oil', category: 'Common food ingredient', concernLevel: 'low',
    purpose: 'Cooking fat; carries flavor and improves texture.',
    explanation: 'An oil pressed from olives, high in monounsaturated fat.',
    evidence: 'A staple of dietary patterns (such as Mediterranean-style diets) associated with good cardiovascular outcomes.',
    attention: 'Calorie-dense like all fats; portion size matters.',
  },
  {
    match: ['sunflower oil', 'canola oil', 'rapeseed oil', 'vegetable oil', 'soybean oil', 'safflower oil'],
    name: 'Vegetable oil', category: 'Common food ingredient', concernLevel: 'low',
    purpose: 'Cooking or processing fat; improves texture and shelf stability.',
    explanation: 'Refined plant oils, mostly unsaturated fats. "Vegetable oil" on a label usually means soybean, canola, or sunflower oil.',
    evidence: 'Mainstream evidence supports unsaturated plant oils over saturated fats for heart health. Claims that seed oils are inherently harmful are not supported by strong evidence.',
    attention: 'Soybean oil is highly refined and rarely triggers soy allergy, but highly sensitive individuals sometimes choose to avoid it.',
  },
  {
    match: ['palm oil', 'palm kernel oil'],
    name: 'Palm oil', category: 'Common food ingredient', concernLevel: 'moderate',
    purpose: 'A semi-solid fat that improves texture and shelf life without hydrogenation.',
    explanation: 'An oil from the oil palm fruit, higher in saturated fat than most liquid plant oils.',
    evidence: 'Its saturated fat content means it counts toward saturated-fat intake. It replaced partially hydrogenated (trans-fat) oils in many products, which was a net improvement.',
    attention: 'People watching saturated-fat intake; some consumers also weigh environmental sourcing concerns.',
  },
  {
    match: ['butter', 'cream', 'milk fat', 'butterfat'],
    name: 'Butter / dairy fat', category: 'Common food ingredient', concernLevel: 'moderate', allergen: 'Milk', nonVegan: true,
    purpose: 'Adds richness, flavor, and tenderness.',
    explanation: 'Fat concentrated from milk. High in saturated fat.',
    evidence: 'Contributes saturated fat, which most guidelines suggest moderating. Fine in modest amounts within an overall balanced diet.',
    attention: 'Contains milk — a major allergen — and matters for people limiting saturated fat.',
  },

  // ——— Nutrients / fortification ———
  {
    match: ['vitamin', 'niacinamide', 'riboflavin', 'thiamin', 'folic acid', 'folate', 'cyanocobalamin', 'pyridoxine', 'cholecalciferol', 'tocopherol', 'ascorbic acid', 'vitamin c', 'vitamin d', 'vitamin e', 'vitamin b'],
    name: 'Added vitamins', category: 'Nutrient', concernLevel: 'low',
    purpose: 'Fortification — restoring or boosting vitamin content.',
    explanation: 'Vitamins added to the food. Names like "niacinamide" or "cholecalciferol" are simply the chemical names of B3 and vitamin D.',
    evidence: 'Food fortification is a well-established public-health practice credited with reducing deficiency diseases.',
    attention: 'Generally beneficial. People taking high-dose supplements may want to track total intake.',
    matchWeight: 1,
  },
  {
    match: ['iron', 'reduced iron', 'ferrous', 'zinc oxide', 'zinc', 'calcium carbonate', 'calcium'],
    name: 'Added minerals', category: 'Nutrient', concernLevel: 'low',
    purpose: 'Fortification with minerals such as iron, zinc, or calcium.',
    explanation: 'Mineral compounds added to boost nutritional value, common in cereals and grain products.',
    evidence: 'Mineral fortification is a standard, well-studied practice that helps prevent deficiencies.',
    attention: 'People with iron-overload conditions (rare) are usually advised by their doctor about fortified foods.',
  },

  // ——— Sweeteners ———
  {
    match: ['sugar', 'cane sugar', 'brown sugar', 'invert sugar', 'sucrose'],
    name: 'Sugar', category: 'Sweetener', concernLevel: 'moderate',
    purpose: 'Sweetens; also affects texture, browning, and preservation.',
    explanation: 'Sucrose from cane or beet. The most common added sugar.',
    evidence: 'High added-sugar intake is linked to excess calorie intake and dental caries. Guidelines suggest keeping added sugars under about 10% of daily calories — the amount per serving is what matters.',
    attention: 'People managing weight, blood sugar, or dental health may want to note the added-sugar grams per serving.',
    evidenceGrade: 'A',
    regulatory: 'US Dietary Guidelines and WHO both advise limiting added/free sugars (~10% of calories).',
    sources: [
      { org: 'USDA/HHS', title: 'Dietary Guidelines for Americans 2020–2025', url: 'https://www.dietaryguidelines.gov/' },
      { org: 'WHO', title: 'Guideline: Sugars intake for adults and children', url: 'https://www.who.int/publications/i/item/9789241549028' },
    ],
  },
  {
    match: ['corn syrup', 'high fructose corn syrup', 'hfcs', 'glucose syrup', 'glucose-fructose', 'rice syrup', 'brown rice syrup', 'tapioca syrup', 'maltodextrin', 'dextrose', 'maltose', 'fructose'],
    name: 'Syrup / refined sweetener', category: 'Sweetener', concernLevel: 'moderate',
    purpose: 'Sweetens, adds moisture, and binds; cheaper and easier to blend than granulated sugar.',
    explanation: 'Refined sugars made from corn, rice, or other starches. Nutritionally similar to table sugar.',
    evidence: 'Metabolically comparable to other added sugars at equal amounts. Evidence does not show high-fructose corn syrup is meaningfully worse than sucrose gram-for-gram; total added sugar is the useful number.',
    attention: 'Anyone limiting added sugar. Maltodextrin also raises blood glucose quickly, relevant for people with diabetes.',
  },
  {
    match: ['sucralose', 'aspartame', 'acesulfame', 'saccharin', 'stevia', 'steviol', 'monk fruit', 'erythritol', 'xylitol', 'sorbitol', 'sugar alcohol'],
    name: 'Low-calorie sweetener', category: 'Sweetener', concernLevel: 'low',
    purpose: 'Provides sweetness with few or no calories.',
    explanation: 'High-intensity sweeteners (like sucralose or stevia extracts) or sugar alcohols (like erythritol) used in place of sugar.',
    evidence: 'Approved sweeteners have been extensively reviewed by regulators and are considered safe at typical intakes. Long-term health effects relative to sugar are still actively researched.',
    attention: 'Sugar alcohols can cause digestive upset in larger amounts. People with PKU must avoid aspartame (labels carry a phenylalanine warning).',
    evidenceGrade: 'B',
    regulatory: 'Each sweetener is individually approved with an acceptable daily intake (FDA and EFSA).',
    sources: [
      { org: 'FDA', title: 'Aspartame and Other Sweeteners in Food', url: 'https://www.fda.gov/food/food-additives-petitions/aspartame-and-other-sweeteners-food' },
      { org: 'WHO', title: 'WHO guideline on non-sugar sweeteners (2023)', url: 'https://www.who.int/publications/i/item/9789240073616' },
    ],
  },

  // ——— Preservatives ———
  {
    match: ['bht', 'bha', 'butylated'],
    name: 'BHT / BHA', category: 'Preservative', concernLevel: 'moderate',
    purpose: 'Antioxidant that keeps fats and oils from going rancid.',
    explanation: 'Synthetic antioxidants added in very small amounts, often to packaging or cereal grains.',
    evidence: 'Permitted at low levels by major regulators. Some studies in animals at very high doses raised questions, which is why intake limits exist; typical dietary exposure is far below those limits.',
    attention: 'Consumers who prefer to avoid synthetic preservatives can look for products using vitamin E (tocopherols) instead.',
    evidenceGrade: 'D',
    regulatory: 'Permitted with limits in the US and EU (E320/E321).',
    sources: [
      { org: 'FDA', title: 'Food Additive Status List', url: 'https://www.fda.gov/food/food-additives-petitions/food-additive-status-list' },
      { org: 'EFSA', title: 'Scientific opinion on BHT (E321)', url: 'https://www.efsa.europa.eu/en/efsajournal/pub/2588' },
    ],
  },
  {
    match: ['sodium benzoate', 'potassium sorbate', 'benzoic acid', 'sorbic acid'],
    name: 'Benzoate / sorbate preservative', category: 'Preservative', concernLevel: 'low',
    purpose: 'Prevents growth of mold, yeast, and bacteria.',
    explanation: 'Widely used preservatives; sorbates and benzoates also occur naturally in some fruits.',
    evidence: 'Long safety record at permitted levels. Rarely, benzoates are linked to hives in sensitive individuals.',
    attention: 'People with known sensitivity to benzoates.',
  },
  {
    match: ['sodium nitrite', 'sodium nitrate', 'nitrite', 'nitrate'],
    name: 'Nitrite / nitrate', category: 'Preservative', concernLevel: 'high',
    purpose: 'Cures processed meats, preventing botulism and preserving color.',
    explanation: 'Curing salts used almost exclusively in processed meats like bacon, ham, and deli meat.',
    evidence: 'Regular high intake of processed meat is classified by IARC as associated with increased colorectal-cancer risk. Occasional consumption is a much smaller consideration than overall dietary pattern.',
    attention: 'People who eat processed meats frequently may benefit most from moderating intake.',
    evidenceGrade: 'A',
    regulatory: 'Permitted curing agents with strict limits (US/EU); IARC classifies processed meat as Group 1 based on colorectal-cancer association.',
    sources: [
      { org: 'WHO / IARC', title: 'Q&A on the carcinogenicity of the consumption of red meat and processed meat', url: 'https://www.who.int/news-room/questions-and-answers/item/cancer-carcinogenicity-of-the-consumption-of-red-meat-and-processed-meat' },
      { org: 'FDA', title: 'Sodium nitrite listing, 21 CFR 172.175', url: 'https://www.ecfr.gov/current/title-21/chapter-I/subchapter-B/part-172/subpart-B/section-172.175' },
    ],
  },
  {
    match: ['tocopherols', 'mixed tocopherols', 'rosemary extract'],
    name: 'Natural antioxidant (tocopherols/rosemary)', category: 'Preservative', concernLevel: 'low',
    purpose: 'Keeps oils fresh using vitamin E compounds or plant extracts.',
    explanation: 'Vitamin-E-based or plant-derived antioxidants used instead of synthetic ones.',
    evidence: 'Considered safe; tocopherols are simply forms of vitamin E.',
    attention: 'No common concerns.',
  },
  {
    match: ['citric acid'],
    name: 'Citric acid', category: 'Preservative', concernLevel: 'low',
    purpose: 'Adds tartness, balances pH, and helps preserve freshness.',
    explanation: 'The acid naturally found in citrus fruit, usually produced by fermentation for food use.',
    evidence: 'One of the most-studied and safest food additives.',
    attention: 'No common concerns at food levels.',
  },

  // ——— Colors ———
  {
    match: ['red 40', 'allura red', 'yellow 5', 'tartrazine', 'yellow 6', 'sunset yellow', 'blue 1', 'brilliant blue', 'blue 2', 'red 3', 'erythrosine', 'green 3', 'artificial color', 'artificial colours', 'fd&c'],
    name: 'Synthetic food dye', category: 'Color', concernLevel: 'moderate',
    purpose: 'Gives the product a consistent, appealing color.',
    explanation: 'Certified synthetic dyes such as Red 40 or Yellow 5, added purely for appearance.',
    evidence: 'Approved by regulators at current intakes. Some studies suggest a small subset of children may show behavioral sensitivity to certain dyes, which is why some regions require warning labels; the evidence is mixed rather than conclusive.',
    attention: 'Parents of children who seem sensitive to dyes, and anyone who simply prefers dye-free foods, can look for products colored with fruit or vegetable extracts.',
    evidenceGrade: 'C',
    regulatory: 'FDA-certified colors (US); EU requires a warning label on several of these dyes.',
    sources: [
      { org: 'FDA', title: 'Color Additives in Foods', url: 'https://www.fda.gov/food/color-additives-information-consumers/color-additives-foods' },
      { org: 'EFSA', title: 'Food colours re-evaluation', url: 'https://www.efsa.europa.eu/en/topics/topic/food-colours' },
    ],
  },
  {
    match: ['annatto', 'turmeric', 'paprika extract', 'beta-carotene', 'beta carotene', 'beet juice', 'vegetable juice for color', 'caramel color'],
    name: 'Natural color', category: 'Color', concernLevel: 'low',
    purpose: 'Colors the product using plant-derived pigments.',
    explanation: 'Pigments from plants (annatto seeds, turmeric root, paprika, beets) or heated sugar (caramel color).',
    evidence: 'Generally well tolerated. Annatto rarely causes sensitivity in some individuals.',
    attention: 'No common concerns for most people.',
  },

  // ——— Flavorings ———
  {
    match: ['natural flavor', 'natural flavour', 'natural and artificial flavor'],
    name: 'Natural flavors', category: 'Flavoring', concernLevel: 'low',
    purpose: 'Standardizes and boosts taste.',
    explanation: 'Flavor compounds extracted from plant or animal sources. The term covers many possible substances used in very small amounts.',
    evidence: 'Used in tiny quantities and generally recognized as safe. The label term is vague, which some consumers dislike, but vagueness itself is not evidence of harm.',
    attention: 'People with severe allergies sometimes contact manufacturers to confirm flavor sources, since the label does not itemize them.',
  },
  {
    match: ['artificial flavor', 'artificial flavour'],
    name: 'Artificial flavors', category: 'Flavoring', concernLevel: 'low',
    purpose: 'Provides consistent taste at low cost.',
    explanation: 'Synthesized flavor molecules — often chemically identical to the ones found in natural sources.',
    evidence: 'Used in very small amounts and reviewed for safety. "Artificial" describes the production method, not a difference in safety.',
    attention: 'No common concerns at typical amounts.',
  },
  {
    match: ['monosodium glutamate', 'msg', 'yeast extract', 'autolyzed yeast', 'hydrolyzed vegetable protein', 'hydrolyzed soy protein'],
    name: 'Umami / savory flavoring', category: 'Flavoring', concernLevel: 'low',
    purpose: 'Boosts savory (umami) taste, letting manufacturers use less salt.',
    explanation: 'Glutamate-based flavor enhancers. Glutamate also occurs naturally in tomatoes, cheese, and mushrooms.',
    evidence: 'Extensive research has not confirmed that MSG causes harm at normal food levels; regulators consider it safe. A small number of people report mild, short-lived sensitivity.',
    attention: 'Individuals who notice sensitivity to MSG-rich meals. Hydrolyzed soy protein is relevant for soy allergy.',
    evidenceGrade: 'A',
    regulatory: 'GRAS in the US (E621 permitted in the EU).',
    sources: [
      { org: 'FDA', title: 'Questions and Answers on Monosodium Glutamate (MSG)', url: 'https://www.fda.gov/food/food-additives-petitions/questions-and-answers-monosodium-glutamate-msg' },
    ],
  },
  {
    match: ['cocoa', 'cocoa powder', 'chocolate', 'cacao'],
    name: 'Cocoa', category: 'Flavoring', concernLevel: 'low',
    purpose: 'Provides chocolate flavor and color.',
    explanation: 'Ground roasted cacao beans. Contains minerals and polyphenols, plus a small amount of caffeine.',
    evidence: 'Cocoa flavanols are being studied for cardiovascular benefits. In sweetened products, the accompanying sugar usually matters more.',
    attention: 'Contains small amounts of caffeine — usually negligible per serving.',
  },
  {
    match: ['cinnamon', 'vanilla', 'vanilla extract', 'spices', 'garlic', 'onion', 'basil', 'oregano', 'herbs', 'black pepper', 'sea salt spice'],
    name: 'Spices & herbs', category: 'Flavoring', concernLevel: 'low',
    purpose: 'Seasons the product.',
    explanation: 'Culinary herbs and spices used for taste.',
    evidence: 'No concerns at culinary amounts.',
    attention: 'No common concerns.',
  },
  {
    match: ['salt', 'sea salt', 'sodium chloride', 'iodized salt'],
    name: 'Salt', category: 'Common food ingredient', concernLevel: 'moderate',
    purpose: 'Flavor, preservation, and texture (especially in bread and processed foods).',
    explanation: 'Sodium chloride. The main source of sodium in packaged foods.',
    evidence: 'High habitual sodium intake is linked to raised blood pressure in salt-sensitive people. Guidelines suggest most adults stay under about 2,300 mg sodium per day.',
    attention: 'People with high blood pressure, kidney conditions, or on sodium-restricted diets — check the sodium line, not just the ingredient list.',
    evidenceGrade: 'A',
    regulatory: 'US Daily Value: 2,300 mg sodium; WHO recommends under 2,000 mg.',
    sources: [
      { org: 'FDA', title: 'Sodium in Your Diet', url: 'https://www.fda.gov/food/nutrition-education-resources-materials/sodium-your-diet' },
      { org: 'WHO', title: 'Sodium reduction fact sheet', url: 'https://www.who.int/news-room/fact-sheets/detail/salt-reduction' },
    ],
  },

  // ——— Emulsifiers, thickeners, texturizers ———
  {
    match: ['soy lecithin', 'lecithin', 'sunflower lecithin'],
    name: 'Lecithin', category: 'Emulsifier', concernLevel: 'low',
    purpose: 'Keeps oil and water mixed; improves texture in chocolate and baked goods.',
    explanation: 'A fatty substance from soybeans, sunflowers, or eggs that helps ingredients blend smoothly.',
    evidence: 'Long history of safe use in small amounts.',
    attention: 'Soy lecithin contains minimal soy protein and rarely triggers soy allergy, but highly sensitive individuals may prefer sunflower lecithin.',
  },
  {
    match: ['mono- and diglycerides', 'monoglycerides', 'diglycerides', 'polysorbate', 'datem', 'sodium stearoyl'],
    name: 'Emulsifier', category: 'Emulsifier', concernLevel: 'low',
    purpose: 'Keeps fats evenly distributed and improves shelf life and texture.',
    explanation: 'Fat-derived molecules that stabilize mixtures of oil and water.',
    evidence: 'Approved at current levels. Early-stage research is exploring whether some emulsifiers affect gut bacteria; findings are preliminary, not established harms.',
    attention: 'People who prefer minimally processed foods may use emulsifier count as a rough processing indicator.',
  },
  {
    match: ['xanthan gum', 'guar gum', 'locust bean gum', 'gellan gum', 'carrageenan', 'pectin', 'agar'],
    name: 'Gum / thickener', category: 'Emulsifier', concernLevel: 'low',
    purpose: 'Thickens and stabilizes; prevents separation.',
    explanation: 'Plant- or fermentation-derived fibers that give products a consistent texture.',
    evidence: 'Generally safe; most are forms of soluble fiber. Carrageenan is periodically debated, but food-grade carrageenan remains approved by major regulators.',
    attention: 'Large amounts of gums can cause bloating in sensitive people.',
  },
  {
    match: ['modified corn starch', 'modified food starch', 'corn starch', 'cornstarch', 'tapioca starch', 'potato starch'],
    name: 'Starch / modified starch', category: 'Emulsifier', concernLevel: 'low',
    purpose: 'Thickens and stabilizes texture, especially through heating and freezing.',
    explanation: '"Modified" means the starch was treated (usually physically or with food-grade acids) to work better in processing — it does not mean genetically modified.',
    evidence: 'Digested like other refined starches. Safe, though it adds refined carbohydrate without fiber.',
    attention: 'No common concerns beyond its contribution of refined carbohydrate.',
  },
  {
    match: ['cellulose', 'methylcellulose', 'microcrystalline cellulose'],
    name: 'Cellulose', category: 'Emulsifier', concernLevel: 'low',
    purpose: 'Adds bulk, prevents caking, and stabilizes texture.',
    explanation: 'Plant fiber, often from wood pulp or cotton — the same fiber that makes up all plant cell walls.',
    evidence: 'An insoluble fiber that passes through undigested; recognized as safe.',
    attention: 'No common concerns.',
  },

  // ——— Leavening / processing aids ———
  {
    match: ['baking soda', 'sodium bicarbonate', 'baking powder', 'yeast', 'sodium acid pyrophosphate', 'monocalcium phosphate', 'cream of tartar'],
    name: 'Leavening agent', category: 'Other', concernLevel: 'low',
    purpose: 'Makes baked products rise and gives them structure.',
    explanation: 'Standard baking chemistry — acids and bases that release gas, or live yeast.',
    evidence: 'Long history of safe use. Phosphate additives contribute to phosphorus intake, mainly relevant in kidney disease.',
    attention: 'People with advanced kidney disease are often advised to watch phosphate additives.',
  },

  // ——— Dairy / protein ———
  {
    match: ['whey', 'whey protein', 'milk protein', 'casein', 'caseinate', 'nonfat milk', 'skim milk', 'milk', 'buttermilk', 'lactose', 'cheese'],
    name: 'Milk-derived ingredient', category: 'Common food ingredient', concernLevel: 'low', allergen: 'Milk', nonVegan: true,
    purpose: 'Adds protein, creaminess, or dairy flavor.',
    explanation: 'Ingredients made from milk, such as whey (a complete protein) or milk solids.',
    evidence: 'Dairy proteins are high quality. Tolerance varies — lactose intolerance is common but distinct from milk allergy.',
    attention: 'Contains milk — a major allergen. Also relevant for lactose intolerance and vegan diets.',
  },
  {
    match: ['soy protein', 'soy flour', 'soybeans', 'soybean', 'tofu', 'soy'],
    name: 'Soy ingredient', category: 'Common food ingredient', concernLevel: 'low', allergen: 'Soy',
    purpose: 'Adds plant protein or structure.',
    explanation: 'Ingredients from soybeans, a complete plant protein.',
    evidence: 'Large reviews find normal soy consumption safe, with possible modest heart-health benefits. Concerns about soy and hormones are not supported at typical food intakes.',
    attention: 'Soy is a major allergen.',
  },
  {
    match: ['egg', 'eggs', 'egg white', 'albumen'],
    name: 'Egg', category: 'Common food ingredient', concernLevel: 'low', allergen: 'Eggs', nonVegan: true,
    purpose: 'Binds, leavens, and adds protein.',
    explanation: 'Whole egg or egg components; egg white is nearly pure protein.',
    evidence: 'A nutrient-dense food. For most people, moderate egg intake fits within a healthy diet.',
    attention: 'Egg is a major allergen, especially in young children.',
  },
  {
    match: ['pea protein', 'chickpea', 'lentil', 'bean'],
    name: 'Legume protein', category: 'Common food ingredient', concernLevel: 'low',
    purpose: 'Adds plant protein and fiber.',
    explanation: 'Protein or flour from peas, chickpeas, lentils, or beans.',
    evidence: 'Legumes are consistently associated with positive health outcomes.',
    attention: 'Rarely, people with peanut allergy cross-react with other legumes — an allergist can advise.',
  },
  {
    match: ['sesame', 'tahini', 'sesame oil', 'sesame seed'],
    name: 'Sesame', category: 'Common food ingredient', concernLevel: 'low', allergen: 'Sesame',
    purpose: 'Adds flavor, texture, and healthy fats.',
    explanation: 'Sesame seeds or their paste (tahini) and oil.',
    evidence: 'Nutritionally similar to other seeds — unsaturated fats, minerals, and some protein.',
    attention: 'Sesame is a major allergen (the 9th recognized in the US since 2023).',
  },
  {
    match: ['fish', 'anchovy', 'salmon', 'tuna', 'cod', 'fish oil'],
    name: 'Fish ingredient', category: 'Common food ingredient', concernLevel: 'low', allergen: 'Fish', nonVeg: true,
    purpose: 'Adds protein, flavor, or omega-3 fats.',
    explanation: 'Fish or fish-derived ingredients (anchovy is common in sauces like Worcestershire).',
    evidence: 'Fish intake is broadly encouraged in dietary guidelines for its omega-3 content.',
    attention: 'Fish is a major allergen.',
  },
  {
    match: ['shrimp', 'crab', 'lobster', 'shellfish', 'oyster', 'clam', 'mussel'],
    name: 'Shellfish ingredient', category: 'Common food ingredient', concernLevel: 'low', allergen: 'Shellfish', nonVeg: true,
    purpose: 'Adds protein and seafood flavor.',
    explanation: 'Crustacean or mollusk ingredients.',
    evidence: 'Lean protein sources; typical concerns relate to allergy rather than nutrition.',
    attention: 'Shellfish is a major allergen and a common cause of adult-onset food allergy.',
  },

  // ——— Animal-derived & meats ———
  {
    match: ['gelatin', 'gelatine'],
    name: 'Gelatin', category: 'Other', concernLevel: 'low', nonVeg: true,
    purpose: 'Gelling agent that gives gummies, marshmallows, and desserts their texture.',
    explanation: 'A protein extracted from animal collagen (usually pork or beef).',
    evidence: 'Safe as a food ingredient. Not a complete protein, so it adds little nutritionally.',
    attention: 'Animal-derived — relevant for vegetarians, vegans, and some religious diets (kosher/halal status varies by source).',
  },
  {
    match: ['chicken', 'beef', 'pork', 'turkey', 'bacon', 'ham', 'chicken broth', 'beef broth', 'bone broth', 'meat', 'lard', 'tallow', 'chicken fat'],
    name: 'Meat / poultry ingredient', category: 'Common food ingredient', concernLevel: 'low', nonVeg: true,
    purpose: 'Adds protein, flavor, and richness (broths and fats carry savory flavor).',
    explanation: 'Meat, poultry, or their broths and rendered fats.',
    evidence: 'Unprocessed lean meats are a protein source; cured/processed versions (bacon, ham) carry the processed-meat considerations noted for nitrites. Lard and tallow are high in saturated fat.',
    attention: 'Not vegetarian. For cured meats, see the nitrite/nitrate notes; for lard/tallow, the saturated-fat line matters.',
  },
  {
    match: ['carmine', 'cochineal', 'carminic acid'],
    name: 'Carmine (cochineal)', category: 'Color', concernLevel: 'low', nonVeg: true,
    purpose: 'A stable red color.',
    explanation: 'A red pigment made from cochineal insects.',
    evidence: 'Approved and generally well tolerated; rare allergic reactions have been reported and it must be named on US labels.',
    attention: 'Insect-derived — not vegetarian or vegan. The rare individuals allergic to carmine should avoid it.',
  },

  // ——— Fats & specialty ingredients ———
  {
    match: ['cocoa butter', 'cacao butter', 'shea butter', 'mango butter'],
    name: 'Plant butter (cocoa/shea)', category: 'Common food ingredient', concernLevel: 'low',
    purpose: 'Gives chocolate its snap and melt; adds smooth texture.',
    explanation: 'Despite the name, these are plant fats pressed from cocoa or shea seeds — no dairy involved.',
    evidence: 'Cocoa butter is high in saturated fat, but much of it is stearic acid, which appears roughly neutral for cholesterol. Fine in normal amounts.',
    attention: 'Dairy-free and vegan despite "butter" in the name. Calorie-dense like all fats.',
  },
  {
    match: ['coconut oil', 'coconut milk', 'coconut cream', 'desiccated coconut'],
    name: 'Coconut', category: 'Common food ingredient', concernLevel: 'moderate',
    purpose: 'Adds rich texture and flavor; coconut oil is a stable cooking fat.',
    explanation: 'Coconut flesh, milk, or oil. Coconut oil is one of the most saturated plant fats (~90%).',
    evidence: 'Coconut oil raises both LDL and HDL cholesterol; most heart associations suggest treating it like other saturated fats rather than as a health food. Occasional use is fine.',
    attention: 'People watching saturated fat. The FDA historically listed coconut as a tree nut for labeling, though true coconut allergy is uncommon — check with an allergist if unsure.',
  },
  {
    match: ['partially hydrogenated', 'hydrogenated oil', 'hydrogenated vegetable oil', 'vegetable shortening', 'shortening'],
    name: 'Hydrogenated oil / shortening', category: 'Common food ingredient', concernLevel: 'high',
    purpose: 'A solid, shelf-stable fat for baking and frying.',
    explanation: 'Oils solidified by hydrogenation. "Partially hydrogenated" oils were the main source of industrial trans fat.',
    evidence: 'Artificial trans fat raises heart-disease risk with no known safe intake, which is why partially hydrogenated oils are banned in the US and many regions. Fully hydrogenated oils and modern shortenings contain little or no trans fat but remain saturated-fat-heavy.',
    attention: 'Anyone watching heart health. If a label still says "partially hydrogenated," strongly consider an alternative product.',
    evidenceGrade: 'A',
    regulatory: 'Partially hydrogenated oils lost GRAS status in the US (2015 determination, phased out by 2020); WHO targets global elimination.',
    sources: [
      { org: 'FDA', title: 'Trans Fat', url: 'https://www.fda.gov/food/food-additives-petitions/trans-fat' },
      { org: 'WHO', title: 'REPLACE trans fat initiative', url: 'https://www.who.int/teams/nutrition-and-food-safety/replace-trans-fat' },
    ],
  },
  {
    match: ['quinoa', 'chia', 'flaxseed', 'flax seed', 'ground flax', 'sunflower seeds', 'pumpkin seeds', 'hemp seed', 'hemp hearts', 'millet', 'buckwheat', 'amaranth'],
    name: 'Seeds & pseudo-grains', category: 'Common food ingredient', concernLevel: 'low',
    purpose: 'Adds protein, fiber, minerals, and healthy fats.',
    explanation: 'Nutrient-dense seeds and gluten-free grain alternatives like quinoa and buckwheat.',
    evidence: 'Consistently positive nutrition profile: fiber, plant protein, unsaturated fats, and micronutrients.',
    attention: 'Rarely allergenic for some individuals (e.g. sunflower or buckwheat allergies exist but are uncommon).',
  },
  {
    match: ['live cultures', 'active cultures', 'live and active cultures', 'probiotic', 'lactobacillus', 'bifidobacterium', 's. thermophilus', 'streptococcus thermophilus'],
    name: 'Live cultures / probiotics', category: 'Other', concernLevel: 'low',
    purpose: 'Ferments the food and may support gut health.',
    explanation: 'Beneficial bacteria used to ferment yogurt, kefir, and similar foods.',
    evidence: 'Fermented foods with live cultures are associated with digestive benefits; specific probiotic health claims vary in evidence strength by strain.',
    attention: 'Generally beneficial. Severely immunocompromised individuals are sometimes advised about live cultures by their care team.',
  },

  // ——— Gluten grains beyond wheat ———
  {
    match: ['barley', 'barley malt', 'malt extract', 'malt syrup', 'malted barley', 'malt flavoring', 'malt flavor'],
    name: 'Barley / malt', category: 'Common food ingredient', concernLevel: 'low', gluten: true,
    purpose: 'Grain base or malty-sweet flavoring (very common in cereals).',
    explanation: 'Barley or its sprouted, concentrated extract (malt). Malt syrup also acts as a sweetener.',
    evidence: 'A whole grain in intact form; malt extract is closer to an added sugar.',
    attention: 'Contains gluten but is NOT wheat — it won\'t appear in a "Contains: wheat" statement, so people avoiding gluten need to spot malt themselves.',
  },
  {
    match: ['rye', 'rye flour', 'triticale'],
    name: 'Rye', category: 'Common food ingredient', concernLevel: 'low', gluten: true,
    purpose: 'Grain base with a distinctive hearty flavor.',
    explanation: 'A cereal grain related to wheat, common in dark breads.',
    evidence: 'Whole rye is high in fiber and a solid whole-grain choice.',
    attention: 'Contains gluten — relevant for celiac disease even though rye is not a "major allergen" on US labels.',
  },

  // ——— More sweeteners ———
  {
    match: ['molasses', 'agave', 'agave nectar', 'agave syrup', 'maple syrup', 'coconut sugar', 'date syrup', 'date sugar', 'evaporated cane juice', 'cane juice', 'turbinado', 'demerara', 'fruit juice concentrate', 'apple juice concentrate', 'grape juice concentrate'],
    name: 'Unrefined / fruit-based sweetener', category: 'Sweetener', concernLevel: 'moderate',
    purpose: 'Sweetens with a marketing-friendlier name than "sugar".',
    explanation: 'Less-refined sugars (molasses, coconut sugar), plant syrups (agave, maple), or concentrated fruit juices. All function as added sugar.',
    evidence: 'Trace minerals aside, these behave like other added sugars in the body and count toward added-sugar totals on the label.',
    attention: 'Anyone limiting added sugar — "natural" sweetener names still count. Juice concentrates are a common way lists downplay sugar.',
  },

  // ——— More preservatives & processing ———
  {
    match: ['tbhq', 'tertiary butylhydroquinone'],
    name: 'TBHQ', category: 'Preservative', concernLevel: 'moderate',
    purpose: 'Antioxidant that extends the shelf life of oils and fried snacks.',
    explanation: 'A synthetic antioxidant, chemically related to BHA/BHT.',
    evidence: 'Permitted at strict low limits (0.02% of fat content). High-dose animal studies drove those limits; typical dietary exposure is far below them.',
    attention: 'Consumers preferring fewer synthetic preservatives can choose tocopherol-preserved alternatives.',
  },
  {
    match: ['titanium dioxide'],
    name: 'Titanium dioxide', category: 'Color', concernLevel: 'moderate',
    purpose: 'Makes coatings and candies opaque white.',
    explanation: 'A white mineral pigment.',
    evidence: 'The EU banned it as a food additive in 2022 over unresolved questions about nanoparticle accumulation; the US FDA still permits it. An honest summary: regulators disagree, and it adds nothing nutritionally.',
    attention: 'Easy to avoid if you prefer — it appears mostly in candies, gum, and white coatings.',
    evidenceGrade: 'C',
    regulatory: 'Banned in the EU (2022); permitted in the US — jurisdictions genuinely disagree.',
    sources: [
      { org: 'EFSA', title: 'Titanium dioxide: E171 no longer considered safe when used as a food additive', url: 'https://www.efsa.europa.eu/en/news/titanium-dioxide-e171-no-longer-considered-safe-when-used-food-additive' },
      { org: 'FDA', title: 'Color Additives Status List', url: 'https://www.fda.gov/industry/color-additive-inventories/color-additive-status-list' },
    ],
  },
  {
    match: ['vinegar', 'apple cider vinegar', 'white vinegar', 'distilled vinegar'],
    name: 'Vinegar', category: 'Preservative', concernLevel: 'low',
    purpose: 'Adds tang and inhibits microbes.',
    explanation: 'Dilute acetic acid from fermentation — one of the oldest food preservatives.',
    evidence: 'No concerns at food levels.',
    attention: 'No common concerns.',
  },
  {
    match: ['potassium chloride'],
    name: 'Potassium chloride', category: 'Other', concernLevel: 'low',
    purpose: 'Salt substitute that cuts sodium while keeping a salty taste.',
    explanation: 'A potassium salt used to replace part of the sodium chloride.',
    evidence: 'Usually a positive swap — most people get too little potassium and too much sodium.',
    attention: 'People with kidney disease or on potassium-sparing medications should follow their clinician\'s potassium guidance.',
  },
  {
    match: ['phosphoric acid', 'sodium phosphate', 'disodium phosphate', 'trisodium phosphate', 'calcium phosphate'],
    name: 'Phosphate additive', category: 'Other', concernLevel: 'low',
    purpose: 'Adjusts acidity (colas), stabilizes texture, and prevents caking.',
    explanation: 'Mineral phosphate salts and acids.',
    evidence: 'Safe for most people at typical intakes; added phosphates are absorbed more completely than natural food phosphorus.',
    attention: 'Mainly relevant for people with chronic kidney disease, who are often asked to limit phosphate additives.',
  },

  // ——— Misc additives ———
  {
    match: ['inulin', 'chicory root', 'oat fiber', 'soluble corn fiber'],
    name: 'Added fiber', category: 'Nutrient', concernLevel: 'low',
    purpose: 'Boosts the fiber content of the product.',
    explanation: 'Isolated plant fibers (like chicory-root inulin) added to increase fiber grams.',
    evidence: 'Counts as dietary fiber, though whole-food fiber comes packaged with more nutrients. Generally beneficial.',
    attention: 'Inulin can cause gas or bloating in larger amounts, especially for people with IBS.',
  },
  {
    match: ['ascorbyl palmitate', 'sodium ascorbate'],
    name: 'Vitamin C-based additive', category: 'Preservative', concernLevel: 'low',
    purpose: 'Antioxidant that protects color and freshness.',
    explanation: 'Forms of vitamin C used as a preservative.',
    evidence: 'Safe; it is simply vitamin C doing double duty.',
    attention: 'No common concerns.',
  },
  {
    match: ['caffeine'],
    name: 'Caffeine', category: 'Other', concernLevel: 'moderate',
    purpose: 'Stimulant added for energy or flavor.',
    explanation: 'The same stimulant found in coffee and tea.',
    evidence: 'Safe for most adults up to about 400 mg/day. Added caffeine in foods can be easy to overlook.',
    attention: 'Children, pregnant people (usually advised to stay under ~200 mg/day), and anyone sensitive to caffeine.',
  },
];

// Words that indicate a "Contains:" style allergen statement.
export const ALLERGEN_KEYWORDS = {
  Milk: ['milk', 'whey', 'casein', 'caseinate', 'butter', 'cream', 'cheese', 'lactose', 'buttermilk', 'yogurt', 'ghee'],
  Eggs: ['egg', 'eggs', 'albumen', 'albumin', 'mayonnaise'],
  Peanuts: ['peanut', 'peanuts'],
  'Tree nuts': ['almond', 'walnut', 'cashew', 'pecan', 'pistachio', 'hazelnut', 'macadamia', 'brazil nut', 'tree nut', 'tree nuts', 'coconut'],
  Soy: ['soy', 'soya', 'soybean', 'soybeans', 'edamame', 'tofu'],
  Wheat: ['wheat', 'flour (wheat', 'farina', 'semolina', 'spelt', 'durum'],
  Fish: ['fish', 'anchovy', 'salmon', 'tuna', 'cod', 'tilapia', 'bass', 'trout'],
  Shellfish: ['shrimp', 'crab', 'lobster', 'prawn', 'oyster', 'clam', 'mussel', 'scallop', 'shellfish'],
  Sesame: ['sesame', 'tahini'],
};

// Dairy-free compounds that would otherwise false-positive on the generic
// "milk" / "butter" / "cream" keywords above (e.g. "oat milk" contains no dairy).
export const ALLERGEN_EXCLUSIONS = {
  Milk: [
    'cocoa butter', 'cacao butter', 'peanut butter', 'almond butter', 'cashew butter',
    'sunflower butter', 'sunflower seed butter', 'shea butter', 'coconut butter',
    'apple butter', 'mango butter', 'cream of tartar', 'coconut cream',
    'coconut milk', 'almond milk', 'oat milk', 'soy milk', 'rice milk', 'cashew milk',
    'hemp milk', 'pea milk', 'macadamia milk', 'flax milk',
  ],
};

// Fallback provenance for entries without their own citation list: the
// general references this knowledge base is curated against.
export const DEFAULT_SOURCES = [
  { org: 'FDA', title: 'Food Additive & GRAS listings', url: 'https://www.fda.gov/food/food-ingredients-packaging' },
  { org: 'USDA', title: 'FoodData Central', url: 'https://fdc.nal.usda.gov/' },
];

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Look up an ingredient by its label text. Returns the best DB entry or null.
 * Aliases match on word boundaries (with plural tolerance) so "graham
 * cracker" never matches "ham" — and longer alias matches win so
 * "corn syrup" beats "corn".
 */
export function lookupIngredient(rawName) {
  const name = rawName.toLowerCase().trim();
  let best = null;
  let bestLen = 0;
  for (const entry of INGREDIENT_DB) {
    for (const alias of entry.match) {
      if (alias.length <= bestLen) continue;
      const re = new RegExp(`(^|[^a-z])${escapeRe(alias)}(?:s|es)?([^a-z]|$)`, 'i');
      if (name === alias || re.test(name)) {
        best = entry;
        bestLen = alias.length;
      }
    }
  }
  return best;
}
