const list = document.getElementById('teams');
const msg = document.getElementById('msg');
const input = document.getElementById('teamName');

async function load() {
  try {
    const teams = await api('/api/teams');
    list.replaceChildren(...teams.map((t) => el('a', { class: 'btn team', href: '/team.html?name=' + encodeURIComponent(t) }, t)));
    if (!teams.length) list.append(el('p', { class: 'empty' }, 'Zatím žádné týmy.'));
  } catch (err) {
    msg.textContent = err.message;
  }
}

document.getElementById('addForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  msg.textContent = '';
  try {
    await api('/api/teams', { method: 'POST', body: { name: input.value } });
    input.value = '';
    await load();
  } catch (err) {
    msg.textContent = err.message;
  }
});

document.getElementById('clearAll').addEventListener('click', async () => {
  if (!confirm('Opravdu smazat všechny týmy a jejich pokusy?')) return;
  await api('/api/teams', { method: 'DELETE' });
  load();
});

load();

// Adresa, na kterou se mají připojit hráči (stejná wifi / hotspot).
api('/api/info').then(({ urls }) => {
  const join = document.getElementById('join');
  join.replaceChildren(
    el('div', { class: 'join-label' }, 'Hráči se připojí na'),
    ...(urls.length ? urls.map((u) => el('div', { class: 'join-url' }, u)) : [el('div', { class: 'join-url' }, 'Notebook není připojený k žádné síti.')]));
}).catch(() => {});
