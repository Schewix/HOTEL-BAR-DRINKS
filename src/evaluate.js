// Vyhodnocení tipu (jako Mastermind):
//   exact   – správná ingredience na správném místě
//   present – ingredience v drinku je, ale jinde (nebo víckrát, než kolik jí je)
//   miss    – ingredience v drinku není
function evaluate(solution, guess) {
  const result = guess.map((g, i) => (g === solution[i] ? 'exact' : 'miss'));

  const remaining = new Map();
  solution.forEach((s, i) => {
    if (result[i] !== 'exact') remaining.set(s, (remaining.get(s) || 0) + 1);
  });

  guess.forEach((g, i) => {
    if (result[i] === 'exact') return;
    if (remaining.get(g) > 0) {
      result[i] = 'present';
      remaining.set(g, remaining.get(g) - 1);
    }
  });
  return result;
}

module.exports = { evaluate };
