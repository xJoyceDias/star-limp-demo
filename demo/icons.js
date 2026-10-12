const I = {
  home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V10"/>',
  receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
  users:
    '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  userplus:
    '<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="17" y1="11" x2="23" y2="11"/>',
  box: '<path d="M3 7.5l9-4 9 4-9 4z"/><path d="M3 7.5v9l9 4 9-4v-9"/><path d="M12 11.5v9"/>',
  bill: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 8h10M7 12h10M7 16h5"/>',
  plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  minus: '<line x1="5" y1="12" x2="19" y2="12"/>',
  search:
    '<circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
  x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  check: '<path d="M20 6L9 17l-5-5"/>',
  trash:
    '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  printer:
    '<path d="M6 9V3h12v6"/><rect x="6" y="14" width="12" height="7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>',
  file: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/>',
  chev: '<path d="M9 18l6-6-6-6"/>',
  arrow: '<line x1="5" y1="12" x2="19" y2="12"/><path d="M13 6l6 6-6 6"/>',
  back: '<path d="M15 18l-6-6 6-6"/>',
  down: '<path d="M6 9l6 6 6-6"/>',
  up: '<path d="M18 15l-6-6-6 6"/>',
  tag: '<path d="M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.2"/>',
  upload:
    '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5"/><line x1="12" y1="3" x2="12" y2="15"/>',
  wallet:
    '<rect x="2" y="6" width="20" height="13" rx="2"/><circle cx="12" cy="12.5" r="3"/><path d="M6 6V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1"/>',
  cart: '<circle cx="9" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/>',
  calendar:
    '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
  alert:
    '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>',
  cancel:
    '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>',
  pix: '<path d="M12 3l4 4-4 4-4-4z"/><path d="M12 13l4 4-4 4-4-4z"/><path d="M3 12l4-4M3 12l4 4M21 12l-4-4M21 12l-4 4"/>',
  money:
    '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/>',
  card: '<rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>',
  card2:
    '<rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/><line x1="6" y1="15" x2="10" y2="15"/>',
  spray:
    '<path d="M9 8h6l1 13a1.5 1.5 0 0 1-1.5 1.5h-5A1.5 1.5 0 0 1 8 21z"/><rect x="11" y="4" width="2" height="4"/><rect x="13" y="2" width="6" height="3" rx="1"/>',
  jug: '<path d="M7 7h10l-1 13a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2z"/><path d="M7 7c0-2 2-3.5 5-3.5S17 5 17 7"/>',
  drop: '<path d="M12 3c4 5 6.5 8.5 6.5 12a6.5 6.5 0 0 1-13 0C5.5 11.5 8 8 12 3z"/>',
  flask:
    '<path d="M9.5 3h5v5.5l4.5 9A2 2 0 0 1 17.2 21H6.8A2 2 0 0 1 5 17.5l4.5-9z"/><path d="M8.5 15h7"/>',
  cap: '<circle cx="12" cy="12" r="7.5"/><circle cx="12" cy="12" r="2.5"/>',
};
function ic(n, s = 20, w = 1.9) {
  return (
    '<svg width="' +
    s +
    '" height="' +
    s +
    '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' +
    w +
    '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    (I[n] || I.box) +
    "</svg>"
  );
}
function hydrateIcons(root = document) {
  root.querySelectorAll("[data-ic]").forEach((el) => {
    el.innerHTML = ic(el.dataset.ic);
    el.removeAttribute("data-ic");
  });
}
