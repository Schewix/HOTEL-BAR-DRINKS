const view = document.getElementById('view');
let catalog;
let state = { team: '', drink: null };

async function init() {
  try {
    let teams;
    [catalog, teams] = await Promise.all([api('/api/catalog'), api('/api/teams')]);
    const params = new URLSearchParams(location.search);
    state.team = teams.includes(params.get('team')) ? params.get('team') : '';
    showPicker(teams, params.get('drink'));
  } catch (err) {
    view.replaceChildren(el('p', { class: 'message' }, err.message));
  }
}

function showPicker(teams, preselectedDrink) {
  const teamSelect = el('select', { id: 'team', required: '' },
    el('option', { value: '', disabled: '', selected: '' }, 'Vyber tým'),
    teams.map((t) => el('option', { value: t }, t)));
  if (state.team) teamSelect.value = state.team;

  const drinkSelect = el('select', { id: 'drink', required: '' },
    el('option', { value: '', disabled: '', selected: '' }, 'Vyber drink'));
  for (const [key, tier] of Object.entries(catalog.tiers)) {
    drinkSelect.append(el('optgroup', { label: `${tier.label} – ${tier.ingredientCount} ingrediencí` },
      catalog.drinks.filter((d) => d.tier === key)
        .map((d) => el('option', { value: d.name }, `${d.id}. ${d.name}`))));
  }
  if (preselectedDrink && catalog.drinks.some((d) => d.name === preselectedDrink)) drinkSelect.value = preselectedDrink;

  const msg = el('p', { class: 'message' });
  const form = el('form', { autocomplete: 'off', onsubmit: (e) => { e.preventDefault(); showGuess(teamSelect.value, drinkSelect.value); } },
    el('label', { for: 'team' }, 'Tým'), teamSelect,
    el('label', { for: 'drink' }, 'Drink'), drinkSelect,
    msg,
    el('button', { class: 'btn primary', type: 'submit' }, 'Další'),
    el('a', { class: 'btn', href: '/' }, 'Zpět'));
  if (!teams.length) msg.textContent = 'Zatím nejsou žádné týmy – přidej je v sekci Obsluha.';
  view.replaceChildren(form);
}

async function showGuess(team, drinkName) {
  state = { team, drink: catalog.drinks.find((d) => d.name === drinkName) };
  const drink = state.drink;
  const tier = catalog.tiers[drink.tier];
  const progress = await api(`/api/progress?team=${encodeURIComponent(team)}&drink=${encodeURIComponent(drinkName)}`);
  const number = progress.used + 1;
  const level = number > tier.attempts ? 'danger' : number > tier.attempts - 2 ? 'warn' : '';

  const selects = [];
  for (let i = 0; i < tier.ingredientCount; i++) {
    const select = el('select', { name: 'ingredient' + i, id: 'ing' + i, required: '' },
      el('option', { value: '', disabled: '', selected: '' }, 'Vyber ingredienci'),
      tier.ingredients.map((ing) => el('option', { value: ing }, capitalize(ing))));
    selects.push(select);
  }
  const msg = el('p', { class: 'message' });
  const form = el('form', { autocomplete: 'off', onsubmit: (e) => { e.preventDefault(); submitGuess(selects.map((s) => s.value), msg, number); } },
    el('div', { class: 'slots' },
      selects.map((s, i) => el('div', {}, el('label', { for: s.id }, `${i + 1}. ingredience`), s))),
    msg,
    el('button', { class: 'btn primary', type: 'submit' }, 'Vyhodnotit'),
    el('button', { class: 'btn', type: 'button', onclick: () => init() }, 'Zpět'));

  view.replaceChildren(
    el('div', { class: 'drink-head' },
      el('span', { class: 'badge ' + drink.tier }, tier.label),
      el('h2', {}, drink.name),
      el('div', { class: 'price' }, `${state.team} • cena ${drink.price}`)),
    el('p', { class: 'attempt ' + level }, `Pokus ${number} z ${tier.attempts}`),
    form);
}

async function submitGuess(ingredients, msg) {
  msg.textContent = '';
  try {
    const out = await api('/api/guess', {
      method: 'POST',
      body: { team: state.team, drink: state.drink.name, ingredients },
    });
    showResult(ingredients, out);
  } catch (err) {
    msg.textContent = err.message;
  }
}

function showResult(guess, out) {
  const row = el('div', { class: 'result-row' },
    out.result.map((r, i) => el('div', { class: 'result-cell ' + r },
      icon(r), el('div', { class: 'name' }, capitalize(guess[i])), el('div', { class: 'state' }, STATE_LABEL[r]))));
  const legend = el('div', { class: 'legend' },
    ['exact', 'present', 'miss'].map((k) => el('span', {}, icon(k), {
      exact: 'správně na správném místě', present: 'v drinku je, ale jinde', miss: 'v drinku není',
    }[k])));

  const buttons = [];
  if (out.solved) {
    buttons.push(el('a', { class: 'btn primary', href: '/game.html?team=' + encodeURIComponent(state.team) }, 'Další drink'));
  } else {
    buttons.push(el('button', { class: 'btn primary', type: 'button', onclick: () => showGuess(state.team, state.drink.name) }, 'Znovu'));
    buttons.push(el('a', { class: 'btn', href: '/game.html?team=' + encodeURIComponent(state.team) }, 'Jiný drink'));
  }
  buttons.push(el('a', { class: 'btn', href: '/' }, 'Domů'));

  view.replaceChildren(
    el('div', { class: 'drink-head' },
      el('span', { class: 'badge ' + state.drink.tier }, catalog.tiers[state.drink.tier].label),
      el('h2', {}, state.drink.name),
      el('div', { class: 'price' }, `Pokus ${out.number} z ${out.attempts}`)),
    row, legend,
    out.solved ? el('p', { class: 'toast-win' }, `Na zdraví! Drink uhádnut na ${out.number}. pokus.`) : '',
    ...buttons);
}

init();
