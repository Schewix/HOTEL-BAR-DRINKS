// Úrovně drinků. Počet ingrediencí odpovídá tabulce (4 / 5 / 6),
// počet pokusů není v tabulce, proto je tady a dá se upravit.
// attempts = základní pokusy, extra = kolik pokusů navíc jde odemknout heslem vedoucího.
const TIERS = {
  basic: { label: 'Basic', ingredientCount: 4, attempts: 5, extra: 2 },
  premium: { label: 'Premium', ingredientCount: 5, attempts: 6, extra: 2 },
  deluxe: { label: 'Deluxe', ingredientCount: 6, attempts: 7, extra: 2 },
};

module.exports = { TIERS };
