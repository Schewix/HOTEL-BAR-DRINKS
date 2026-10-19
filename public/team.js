const name = new URLSearchParams(location.search).get('name') || '';
const view = document.getElementById('view');
document.getElementById('title').textContent = name || 'Tým';

function attemptTable(a) {
  const header = el('tr', {}, el('th', {}, ''), a.solution.map((_, i) => el('th', {}, `${i + 1}.`)));
  return el('div', { class: 'scroll' }, el('table', {},
    header,
    el('tr', {}, el('th', {}, 'Správně'), a.solution.map((s) => el('td', {}, capitalize(s)))),
    el('tr', {}, el('th', {}, 'Tým'), a.guess.map((g, i) => el('td', { class: a.result[i] }, capitalize(g)))),
    el('tr', {}, el('th', {}, 'Výsledek'), a.result.map((r) => el('td', { class: r }, STATE_LABEL[r])))));
}

function bonusRow(d) {
  const change = async (delta) => {
    await api(`/api/teams/${encodeURIComponent(name)}/bonus`, { method: 'POST', body: { drink: d.drink, delta } });
    load();
  };
  const left = d.limit - d.used;
  return el('tr', {},
    el('td', {}, `${d.id}. ${d.drink}`),
    el('td', {}, `${d.used} z ${d.limit}`),
    el('td', { class: left > 0 ? '' : 'miss' }, left > 0 ? `zbývá ${left}` : 'došly'),
    el('td', {},
      el('button', { class: 'btn inline mini', type: 'button', disabled: d.bonus ? null : '', onclick: () => change(-1) }, '−'),
      ` ${d.bonus} z ${d.extra} `,
      el('button', { class: 'btn inline mini primary', type: 'button', disabled: d.bonus < d.extra ? null : '', onclick: () => change(1) }, '+1 extra')));
}

async function load() {
  try {
    const team = await api('/api/teams/' + encodeURIComponent(name));
    if (!team.attempts.length) return view.replaceChildren(el('p', { class: 'empty' }, 'Tým zatím nezkoušel žádný drink.'));
    view.replaceChildren(el('div', { class: 'history' },
      el('h3', {}, 'Pokusy a extra pokusy'),
      el('div', { class: 'scroll' }, el('table', {},
        el('tr', {}, ['Drink', 'Použito', 'Stav', 'Extra'].map((h) => el('th', {}, h))),
        team.drinks.map(bonusRow))),
      team.attempts.map((a) => [
      el('h3', {}, `${a.id}. ${a.drink} – pokus ${a.number}`,
        el('a', { href: `/game.html?team=${encodeURIComponent(name)}&drink=${encodeURIComponent(a.drink)}` }, 'Znovu')),
      attemptTable(a),
    ])));
  } catch (err) {
    view.replaceChildren(el('p', { class: 'message' }, err.message));
  }
}

document.getElementById('remove').addEventListener('click', async () => {
  const typed = prompt(`Pro smazání týmu napiš jeho jméno (${name}):`);
  if (typed !== name) return;
  await api('/api/teams/' + encodeURIComponent(name), { method: 'DELETE' });
  location.href = '/admin.html';
});

load();
