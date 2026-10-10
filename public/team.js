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

async function load() {
  try {
    const team = await api('/api/teams/' + encodeURIComponent(name));
    if (!team.attempts.length) return view.replaceChildren(el('p', { class: 'empty' }, 'Tým zatím nezkoušel žádný drink.'));
    view.replaceChildren(el('div', { class: 'history' }, team.attempts.map((a) => [
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
