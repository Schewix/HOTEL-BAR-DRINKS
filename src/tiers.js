// Úrovně drinků. Počet ingrediencí odpovídá tabulce (4 / 5 / 6),
// počet pokusů není v tabulce, proto je tady a dá se upravit.
const TIERS = {
  basic: { label: 'Basic', ingredientCount: 4, attempts: 8 },
  premium: { label: 'Premium', ingredientCount: 5, attempts: 9 },
  deluxe: { label: 'Deluxe', ingredientCount: 6, attempts: 10 },
};

module.exports = { TIERS };
