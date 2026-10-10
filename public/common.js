// Společné pomocné funkce pro všechny stránky.
async function api(url, options) {
  const opts = Object.assign({ headers: { 'Content-Type': 'application/json' } }, options);
  if (opts.body && typeof opts.body !== 'string') opts.body = JSON.stringify(opts.body);
  const res = await fetch(url, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Něco se pokazilo.');
  return data;
}

// Vytvoří element; texty vkládá jako text (žádné HTML injection).
function el(tag, attrs, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === 'class') node.className = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  }
  for (const c of children.flat(Infinity)) node.append(c);
  return node;
}

const SVG_NS = 'http://www.w3.org/2000/svg';
const ICONS = {
  // Správná ingredience na správném místě
  exact: '<circle cx="24" cy="24" r="21" fill="#c9a45c"/><path d="M14 25l7 7 13-15" fill="none" stroke="#0c1815" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>',
  // Ingredience v drinku je, ale jinde
  present: '<circle cx="24" cy="24" r="20" fill="none" stroke="#e89a4b" stroke-width="3"/><path d="M18 19a6 6 0 1 1 9 5c-2 1.4-3 2.4-3 4.5" fill="none" stroke="#e89a4b" stroke-width="3.5" stroke-linecap="round"/><circle cx="24" cy="35" r="2.3" fill="#e89a4b"/>',
  // Ingredience v drinku není
  miss: '<circle cx="24" cy="24" r="20" fill="none" stroke="#d4566a" stroke-width="3"/><path d="M16 16l16 16M32 16L16 32" stroke="#d4566a" stroke-width="4" stroke-linecap="round"/>',
};
function icon(kind) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 48 48');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = ICONS[kind];
  return svg;
}
const STATE_LABEL = { exact: 'Správně', present: 'Jinde', miss: 'Není' };

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
