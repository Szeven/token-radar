// Token Launch Radar dashboard: no framework, no network, no fetch. Everything renders from the
// window.RADAR object the program wrote to ../data.js, so the page and the board always agree.
(function () {
  'use strict';
  var D = window.RADAR;
  if (!D) { document.getElementById('meta').textContent = 'No data: data.js did not load.'; return; }

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function money(n) {
    if (n === null || n === undefined) return '—';
    if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
    return '$' + Math.round(n);
  }
  function pct(n) {
    if (n === null || n === undefined) return '—';
    var cls = n > 0 ? 'up' : n < 0 ? 'down' : '';
    return '<span class="' + cls + '">' + (n > 0 ? '+' : '') + n.toFixed(1) + '%</span>';
  }
  function age(n) {
    if (n === null || n === undefined) return '—';
    if (n >= 365) return (n / 365).toFixed(1) + 'y';
    if (n >= 30) return Math.round(n / 30) + 'mo';
    return n + 'd';
  }
  function $(id) { return document.getElementById(id); }

  // ---- header, stats, footer -------------------------------------------------
  $('meta').textContent = 'Snapshot ' + D.as_of + ' · ' + esc(D.source) + ' · floor ' + money(D.floor_usd) + ' · model ' + esc(D.model_version);
  $('asof').textContent = D.as_of;
  var med = D.calibration.global_median;
  $('stats').innerHTML = [
    ['Board rows', D.board_size], ['Watchlist', D.watchlist_size], ['Early finds', D.early_size],
    ['Live comps', D.live_size], ['Global multiple', med.toFixed(3) + '×'],
  ].map(function (s) { return '<div class="stat"><b>' + s[1] + '</b><span>' + s[0] + '</span></div>'; }).join('');

  // ---- filter controls --------------------------------------------------------
  var cats = [], chains = [];
  D.rows.forEach(function (r) {
    if (r.category && cats.indexOf(r.category) < 0) cats.push(r.category);
    r.chains.forEach(function (c) { if (chains.indexOf(c) < 0) chains.push(c); });
  });
  cats.sort(); chains.sort();
  cats.forEach(function (c) { $('cat').insertAdjacentHTML('beforeend', '<option>' + esc(c) + '</option>'); });
  chains.forEach(function (c) { $('chain').insertAdjacentHTML('beforeend', '<option>' + esc(c) + '</option>'); });

  // ---- tabs -------------------------------------------------------------------
  var tabs = document.querySelectorAll('.tab');
  function showTab(name) {
    tabs.forEach(function (t) { var on = t.dataset.tab === name; t.classList.toggle('active', on); t.setAttribute('aria-selected', on ? 'true' : 'false'); });
    ['board', 'live', 'model'].forEach(function (n) { $('panel-' + n).classList.toggle('hidden', n !== name); });
  }
  tabs.forEach(function (t) { t.addEventListener('click', function () { showTab(t.dataset.tab); }); });

  // ---- model sandbox -----------------------------------------------------------
  var sandbox = { gw: D.model.growth_weight, mr: D.model.maturity_range, ms: 1 };
  function sandboxActive() { return sandbox.gw !== D.model.growth_weight || sandbox.mr !== D.model.maturity_range || sandbox.ms !== 1; }
  function sandboxImplied(r) {
    var g = Math.min(D.model.growth_cap, Math.max(D.model.growth_floor, r.change_7d === null ? 0 : r.change_7d));
    var gm = 1 + (g / 100) * sandbox.gw;
    var a = r.age_days === null ? D.model.unknown_age_days : r.age_days;
    var mm = D.model.maturity_floor + (Math.min(Math.max(a, 0), D.model.maturity_days) / D.model.maturity_days) * sandbox.mr;
    return Math.max(1, Math.round(r.tvl_usd * r.multiple * sandbox.ms * gm * mm * r.chain_multiplier));
  }
  function bindSlider(id, out, fmt, apply) {
    var el = $(id);
    el.addEventListener('input', function () { $(out).textContent = fmt(parseFloat(el.value)); apply(parseFloat(el.value)); renderBoard(); });
  }
  bindSlider('gw', 'gw-out', function (v) { return v.toFixed(2); }, function (v) { sandbox.gw = v; });
  bindSlider('mr', 'mr-out', function (v) { return v.toFixed(2); }, function (v) { sandbox.mr = v; });
  bindSlider('ms', 'ms-out', function (v) { return v.toFixed(2) + '×'; }, function (v) { sandbox.ms = v; });

  // ---- model tab text -----------------------------------------------------------
  var calRows = Object.keys(D.calibration.by_category).sort().map(function (c) {
    return '<tr><td>' + esc(c) + '</td><td class="num">' + D.calibration.by_category[c].toFixed(3) + '×</td></tr>';
  }).join('');
  $('modeltext').innerHTML =
    '<p>Implied value = TVL × <b>category multiple</b> × growth × maturity × chain breadth. The multiple is not a guess: it is the category’s own median market-cap-to-TVL among this snapshot’s ' + D.calibration.live_count + ' live-token protocols (global median ' + med.toFixed(3) + '× when a category has fewer than three live names), winsorised to [' + D.model.multiple_floor + ', ' + D.model.multiple_cap + ']. Growth is the 7-day change clamped to [' + D.model.growth_floor + ', +' + D.model.growth_cap + ']%, weighted ' + D.model.growth_weight + '. Maturity runs ' + D.model.maturity_floor + ' to ' + (D.model.maturity_floor + D.model.maturity_range) + ' over ' + D.model.maturity_days + ' days. Each extra chain adds ' + (D.model.chain_bonus_per_chain * 100) + '% (up to ' + D.model.chain_bonus_max_chains + ' extra chains). Nothing is hard-coded to a name: run this program on a fresh snapshot and it ranks whatever new protocols it carries, early.</p>';
  $('calibration').innerHTML = '<table><thead><tr><th>Category</th><th class="num">Multiple</th></tr></thead><tbody>' + calRows + '<tr><td>Global median (fallback)</td><td class="num">' + med.toFixed(3) + '×</td></tr></tbody></table>';

  // ---- live tab ------------------------------------------------------------------
  $('liverows').innerHTML = D.live.map(function (r) {
    var ratio = r.mcap_usd && r.tvl_usd ? (r.mcap_usd / r.tvl_usd).toFixed(3) + '×' : '—';
    return '<tr><td>' + esc(r.name) + '<br><span class="slug">' + esc(r.slug) + '</span></td><td>' + esc(r.category || '—') + '</td><td>' + esc(r.chains.join(', ')) + '</td><td class="num">' + money(r.tvl_usd) + '</td><td class="num">' + money(r.mcap_usd) + '</td><td class="num">' + ratio + '</td><td class="num">' + pct(r.change_7d) + '</td></tr>';
  }).join('');

  // ---- board ---------------------------------------------------------------------
  var sortKey = 'rank', sortDir = 1;
  function filtered() {
    var q = $('q').value.trim().toLowerCase(), cat = $('cat').value, chain = $('chain').value, watch = $('watch').checked;
    var rows = D.rows.filter(function (r) {
      if (watch && !r.watch) return false;
      if (cat && r.category !== cat) return false;
      if (chain && r.chains.indexOf(chain) < 0) return false;
      if (q && (r.name.toLowerCase().indexOf(q) < 0 && r.slug.toLowerCase().indexOf(q) < 0)) return false;
      return true;
    });
    var active = sandboxActive();
    rows.forEach(function (r) { r._show = active ? sandboxImplied(r) : r.implied_value_usd; });
    var key = active && sortKey === 'implied_value_usd' ? '_show' : sortKey;
    rows.sort(function (a, b) {
      var av = a[key], bv = b[key];
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      if (typeof av === 'string') return av.localeCompare(bv) * sortDir;
      return (av - bv) * sortDir;
    });
    return { rows: rows, active: active };
  }
  function renderBoard() {
    var f = filtered();
    var maxImp = D.rows[0].implied_value_usd;
    $('rows').innerHTML = f.rows.map(function (r) {
      var w = Math.max(4, Math.round((r._show / maxImp) * 100));
      return '<tr data-slug="' + esc(r.slug) + '"><td>' + r.rank + '</td>' +
        '<td>' + esc(r.name) + (r.watch ? ' <span class="pill watch">watchlist</span>' : '') + '<br><span class="slug">' + esc(r.slug) + '</span></td>' +
        '<td>' + esc(r.category || '—') + '</td><td>' + esc(r.chains.slice(0, 3).join(', ')) + (r.chains.length > 3 ? ' +' + (r.chains.length - 3) : '') + '</td>' +
        '<td class="num">' + money(r.tvl_usd) + '</td><td class="num">' + pct(r.change_7d) + '</td><td class="num">' + age(r.age_days) + '</td>' +
        '<td class="num"><b>' + money(r._show) + '</b><div class="bar"><i style="width:' + w + '%"></i></div></td></tr>';
    }).join('');
    $('count').textContent = f.rows.length + ' of ' + D.rows.length + ' protocols' + (f.active ? ' · sandbox re-rank active' : '');
    document.querySelectorAll('#board th').forEach(function (th) {
      th.textContent = th.textContent.replace(/ [▲▼]$/, '');
      if (th.dataset.sort === sortKey) th.textContent += sortDir === 1 ? ' ▲' : ' ▼';
    });
    document.querySelectorAll('#rows tr').forEach(function (tr) {
      tr.addEventListener('click', function () { openDetail(tr.dataset.slug); });
    });
  }
  document.querySelectorAll('#board th').forEach(function (th) {
    th.addEventListener('click', function () {
      var k = th.dataset.sort;
      if (sortKey === k) sortDir = -sortDir; else { sortKey = k; sortDir = k === 'name' || k === 'category' ? 1 : -1; }
      renderBoard();
    });
  });
  ['q', 'cat', 'chain', 'watch'].forEach(function (id) { $(id).addEventListener('input', renderBoard); });

  // ---- detail view ----------------------------------------------------------------
  function openDetail(slug) {
    var r = null;
    D.rows.forEach(function (x) { if (x.slug === slug) r = x; });
    if (!r) return;
    var calc = 'TVL ' + money(r.tvl_usd) + ' × multiple ' + r.multiple.toFixed(3) + '× × growth ' + r.growth_multiplier.toFixed(2) + '× × maturity ' + r.maturity_multiplier.toFixed(2) + '× × chains ' + r.chain_multiplier.toFixed(2) + '× = ' + money(r.implied_value_usd);
    $('detail').innerHTML =
      '<button class="close" id="dclose">Close ✕</button>' +
      '<h2>' + esc(r.name) + '</h2>' +
      '<p class="hint">' + esc(r.slug) + ' · ' + esc(r.category || 'Uncategorised') + ' · ' + esc(r.chains.join(', ')) + (r.watch ? ' · <span class="pill watch">watchlist</span>' : '') + '</p>' +
      '<div class="kv">' +
      '<div><b>#' + r.rank + '</b><span>rank of ' + D.rows.length + '</span></div>' +
      '<div><b>' + money(r.implied_value_usd) + '</b><span>implied value</span></div>' +
      '<div><b>' + money(r.tvl_usd) + '</b><span>TVL</span></div>' +
      '<div><b>' + pct(r.change_7d) + '</b><span>7-day change</span></div>' +
      '<div><b>' + age(r.age_days) + '</b><span>listed' + (r.listed_at ? ' ' + esc(r.listed_at) : '') + '</span></div>' +
      '<div><b>' + r.multiple.toFixed(3) + '×</b><span>category multiple</span></div>' +
      '</div>' +
      '<div class="modelbox"><b>How the value is priced:</b><br>' + esc(calc) + '. The multiple is the median market-cap-to-TVL of live-token ' + esc(r.category || 'protocols') + ' in this snapshot, so a token here is priced the way the market already prices its peers.</div>' +
      '<h3>Farm plan</h3><ol class="farm">' + r.farm_steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol>' +
      '<p class="hint">Pre-token: no market cap, no CoinGecko listing, no symbol yet. The plan is derived from this protocol’s own record (category, chains, TVL, age) — never from a list of names.</p>';
    $('detail').classList.remove('hidden');
    $('dclose').addEventListener('click', closeDetail);
    if (location.hash !== '#protocol/' + slug) history.replaceState(null, '', '#protocol/' + slug);
  }
  function closeDetail() {
    $('detail').classList.add('hidden');
    if (location.hash.indexOf('#protocol/') === 0) history.replaceState(null, '', location.pathname + location.search);
  }

  // ---- hash routing (deep links for the screenshots) --------------------------------
  function route() {
    var h = location.hash || '';
    if (h.indexOf('#protocol/') === 0) { openDetail(decodeURIComponent(h.slice(10))); return; }
    if (h.indexOf('#filter/') === 0) {
      var cat = decodeURIComponent(h.slice(8));
      if (cats.indexOf(cat) >= 0) { $('cat').value = cat; renderBoard(); }
      return;
    }
    if (h === '#watchlist') { $('watch').checked = true; renderBoard(); }
  }

  renderBoard();
  route();
})();
