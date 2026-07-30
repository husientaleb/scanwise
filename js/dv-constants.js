// dv-constants.js — Daily Value reference constants, configurable per
// jurisdiction. Deliberately data, not code: the nutrition calculator reads
// these; nothing in the UI hard-codes a health judgment.

export const DAILY_VALUES = {
  US: {
    jurisdiction: 'United States',
    effectiveDate: '2020-01-01',
    source: {
      organization: 'FDA',
      title: 'Daily Value on the Nutrition and Supplement Facts Labels',
      url: 'https://www.fda.gov/food/nutrition-facts-label/daily-value-nutrition-and-supplement-facts-labels',
    },
    values: {
      calories: { value: 2000, unit: 'kcal' },
      addedSugarGrams: { value: 50, unit: 'g' },
      sodiumMg: { value: 2300, unit: 'mg' },
      saturatedFatGrams: { value: 20, unit: 'g' },
      fiberGrams: { value: 28, unit: 'g' },
      proteinGrams: { value: 50, unit: 'g' },
      totalFatGrams: { value: 78, unit: 'g' },
      totalCarbGrams: { value: 275, unit: 'g' },
      cholesterolMg: { value: 300, unit: 'mg' },
    },
  },
};

export const DEFAULT_JURISDICTION = 'US';

export function getDailyValues(jurisdiction = DEFAULT_JURISDICTION) {
  return DAILY_VALUES[jurisdiction] || DAILY_VALUES[DEFAULT_JURISDICTION];
}
