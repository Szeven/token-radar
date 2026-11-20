// Token Radar's dashboard: a sortable, filterable board, a detail view per
// protocol, and a Live view apart. No network: every byte comes from the
// data.js this program writes beside the page.
//
// The farm plan is generated here, in the page, from the same rules the
// model uses (category, chains, TVL, age), so the steps a reader sees are
// the steps the board's own code derives — never a hand-written list.

(function () {
  'use strict';

  var D = window.RADAR;
  if (!D || !Array.isArray(D.rows)) {
    document.getElementById('board').innerHTML = '<p class="empty">No radar data found: data.js did not load.</p>';
    return;
  }

  var rows = D.rows;
  var live = D.live || [];
  var watchlist = {};
  (D.watchlist || []).forEach(function (s) { watchlist[s] = true; });

  // ---------------------------------------------------------------- format

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function money(n) {
    if (n == null || !isFinite(n)) return '—';
    if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return '$' + (n / 1e3).toFixed(0) + 'K';
    return '$' + Math.round(n);
  }

  function moneyFull(n) {
    if (n == null || !isFinite(n)) return '—';
    return '$' + Math.round(n).toLocaleString('en-US');
  }

  function pct(n) {
    if (n == null || !isFinite(n)) return '—';
    var v = (n >= 0 ? '+' : '') + n.toFixed(2) + '%';
    return '<span class="' + (n >= 0 ? 'up' : 'down') + '">' + v + '</span>';
  }

  function ageText(days) {
    if (days == null) return '—';
    if (days < 30) return days + 'd';
    if (days < 365) return Math.round(days / 30) + 'mo';
    return (days / 365).toFixed(1) + 'y';
  }

  // ---------------------------------------------------------------- farm plan

  function capitalFor(tvl) {
    if (tvl >= 5e9) return 250;
    if (tvl >= 1e9) return 150;
    if (tvl >= 1e8) return 100;
    return 50;
  }

  function holdFor(age) {
    if (age == null) return 45;
    if (age < 90) return 90;
    if (age < 365) return 60;
    if (age < 1095) return 45;
    return 30;
  }

  function actionFor(row, capital, chain) {
    var c = (row.category || '').toLowerCase();
    var name = row.name;
    if (c.indexOf('lend') >= 0 || c.indexOf('cdp') >= 0 || c.indexOf('collateral') >= 0)
      return 'Supply $' + capital + ' of USDC to ' + name + ' on ' + chain + ', borrow a small amount against it, and keep both legs open.';
    if (c.indexOf('dex') >= 0 || c.indexOf('leveraged farm') >= 0)
      return 'Provide $' + capital + ' of liquidity to ' + name + '\'s deepest pool on ' + chain + ' and keep the position in range.';
    if (c.indexOf('yield') >= 0 || c.indexOf('vault') >= 0)
      return 'Deposit $' + capital + ' into ' + name + '\'s highest-TVL vault on ' + chain + ' and keep the shares.';
    if (c.indexOf('bridge') >= 0)
      return 'Bridge $' + capital + ' of USDC into ' + chain + ' through ' + name + ', then use the bridged funds inside its app.';
    if (c.indexOf('liquid staking') >= 0 || c.indexOf('restak') >= 0 || c.indexOf('staking') >= 0)
      return 'Stake $' + capital + ' through ' + name + ' on ' + chain + ' and keep the receipt token in the same wallet.';
    if (c.indexOf('perpetual') >= 0 || c.indexOf('derivative') >= 0 || c.indexOf('options') >= 0)
      return 'Deposit $' + capital + ' of USDC as margin on ' + name + ' and open one small hedged position.';
    if (c.indexOf('prediction') >= 0)
      return 'Fund $' + capital + ' on ' + name + ' and take one position in an active market.';
    if (c.indexOf('curator') >= 0 || c.indexOf('allocator') >= 0 || c.indexOf('onchain capital') >= 0)
      return 'Allocate $' + capital + ' to a ' + name + ' vault on ' + chain + ' and keep the allocation through the month.';
    if (c.indexOf('stable') >= 0)
      return 'Mint or deposit $' + capital + ' of the stable asset through ' + name + ' on ' + chain + ' and hold it.';
    if (c.indexOf('rwa') >= 0)
      return 'Mint $' + capital + ' of the yield-bearing asset ' + name + ' issues on ' + chain + ' and hold it.';
    if (c.indexOf('insurance') >= 0)
      return 'Buy $' + capital + ' of cover from ' + name + ' on ' + chain + ' and keep the policy active.';
    if (c.indexOf('nft') >= 0)
      return 'List or lend $' + capital + ' of assets through ' + name + ' on ' + chain + ' and keep the listing live.';
    if (c.indexOf('launchpad') >= 0)
      return 'Stake $' + capital + ' through ' + name + ' on ' + chain + ' to qualify for its next launch.';
    if (c.indexOf('gaming') >= 0 || c.indexOf('game') >= 0)
      return 'Play ' + name + ' on ' + chain + ' with $' + capital + ' of assets in the game and keep the account active.';
    return 'Deposit $' + capital + ' of USDC into ' + name + ' on ' + chain + ' and keep the position open.';
  }

  /** The six-step farm plan for one row, from the row's own record. */
  function planFor(row) {
    var chain = (row.chains && row.chains[0]) || 'its main chain';
    var capital = capitalFor(row.tvl_usd);
    var hold = holdFor(row.age_days);
    var gas = capital >= 150 ? 8 : 4;
    return [
      'Open a fresh wallet that holds only the funds you plan to farm, and keep its seed phrase offline on paper. Cost: under $3 of gas for the first transaction. Time: 5 minutes.',
      actionFor(row, capital, chain) + ' Cost: $' + capital + ' of capital and about $' + gas + ' of gas. Time: 15 minutes to set up.',
      'Do one qualifying action each week, such as a deposit, a swap, a vote, or a claim on the protocol\'s own app. Cost: about $2 of gas a week. Time: 10 minutes a week.',
      'Hold the position for at least ' + hold + ' days, so the activity is counted in more than one snapshot. Cost: the $' + capital + ' stays in the position. Time: ' + hold + ' days.',
      'Before you withdraw, open the protocol\'s own points or rewards page from its official site and claim only from the link it publishes. Cost: no fee to check, and never pay anyone to claim for you. Time: 10 minutes.',
      'Write the wallet, the dates, and every transaction hash in a farm log, then plan the exit: unwind in stages and leave a dust position until the snapshot. Cost: nothing but the log. Time: 5 minutes.'
    ];
  }

  // ---------------------------------------------------------------- controls

  var q = document.getElementById('q');
  var catSel = document.getElementById('cat');
  var chainSel = document.getElementById('chain');
  var sortSel = document.getElementById('sort');
  var watchBox = document.getElementById('watch');
  var liveBtn = document.getElementById('live-btn');
  var boardEl = document.getElementById('board');
  var detailEl = document.getElementById('detail');
  var liveEl = document.getElementById('live');
  var countEl = document.getElementById('count');

  var cats = {};
  var chains = {};
  rows.forEach(function (r) {
    if (r.category) cats[r.category] = true;
    (r.chains || []).forEach(function (c) { chains[c] = true; });
  });
  Object.keys(cats).sort().forEach(function (c) {
    var o = document.createElement('option');
    o.value = c; o.textContent = c;
    catSel.appendChild(o);
  });
  Object.keys(chains).sort().forEach(function (c) {
    var o = document.createElement('option');
    o.value = c; o.textContent = c;
    chainSel.appendChild(o);
  });

  // Header stats and the model line.
  var topValue = rows.length ? rows[0].implied_value_usd : 0;
  document.getElementById('stats').innerHTML =
    '<div><dt>Watchlist protocols</dt><dd>' + D.watchlist_size + '</dd></div>' +
    '<div><dt>Ranked rows</dt><dd>' + D.board_size + '</dd></div>' +
    '<div><dt>Early finds outside the watchlist</dt><dd>' + D.early_size + '</dd></div>' +
    '<div><dt>Top implied value</dt><dd>' + money(topValue) + '</dd></div>';
  document.getElementById('model-line').textContent =
    'Model ' + D.model_version + ': implied = TVL × ' + D.model.base_multiple +
    ' × growth(±' + D.model.growth_low + '%…+' + D.model.growth_high + '%, weight ' + D.model.growth_weight +
    ') × maturity(0.55→1.00→0.85 over age) × reach(1 + ' + D.model.reach_per_chain +
    ' per extra chain, max ' + D.model.reach_cap + ').';
  document.getElementById('asof').textContent = D.as_of;

  // ---------------------------------------------------------------- board

  function filtered() {
    var needle = q.value.trim().toLowerCase();
    var cat = catSel.value;
    var chain = chainSel.value;
    var onlyWatch = watchBox.checked;
    var out = rows.filter(function (r) {
      if (needle && r.name.toLowerCase().indexOf(needle) < 0 && r.slug.toLowerCase().indexOf(needle) < 0) return false;
      if (cat && r.category !== cat) return false;
      if (chain && (r.chains || []).indexOf(chain) < 0) return false;
      if (onlyWatch && !watchlist[r.slug]) return false;
      return true;
    });
    var sort = sortSel.value;
    var sorted = out.slice();
    if (sort === 'tvl') sorted.sort(function (a, b) { return b.tvl_usd - a.tvl_usd; });
    else if (sort === 'growth') sorted.sort(function (a, b) { return (b.change_7d || 0) - (a.change_7d || 0); });
    else if (sort === 'age') sorted.sort(function (a, b) { return (b.age_days || 0) - (a.age_days || 0); });
    else sorted.sort(function (a, b) { return a.rank - b.rank; });
    return sorted;
  }

  function rowHtml(r) {
    var wl = watchlist[r.slug] ? ' <span class="badge">Watchlist</span>' : '';
    return '<tr data-slug="' + esc(r.slug) + '">' +
      '<td class="rank num">#' + r.rank + '</td>' +
      '<td class="name"><b>' + esc(r.name) + '</b><span>' + esc(r.slug) + '</span>' + wl + '</td>' +
      '<td class="num">' + money(r.tvl_usd) + '</td>' +
      '<td class="num">' + pct(r.change_7d) + '</td>' +
      '<td class="num">' + ageText(r.age_days) + '</td>' +
      '<td class="num"><b>' + money(r.implied_value_usd) + '</b></td>' +
      '</tr>';
  }

  function renderBoard() {
    var list = filtered();
    countEl.textContent = 'Showing ' + list.length + ' of ' + rows.length + ' ranked protocols' +
      (list.length < rows.length ? ' — filtered' : '') + '. Click a row for its detail and farm plan.';
    if (list.length === 0) {
      boardEl.innerHTML = '<p class="empty">No protocol matches these filters. Clear the search or pick another category.</p>';
      return;
    }
    var html = '<table class="board"><thead><tr>' +
      '<th data-sort="rank">Rank</th><th>Protocol</th>' +
      '<th data-sort="tvl">TVL</th><th data-sort="growth">7d</th>' +
      '<th data-sort="age">Age</th><th data-sort="rank">Implied value</th>' +
      '</tr></thead><tbody>' + list.map(rowHtml).join('') + '</tbody></table>';
    boardEl.innerHTML = html;
    boardEl.querySelectorAll('tbody tr').forEach(function (tr) {
      tr.addEventListener('click', function () { openDetail(tr.getAttribute('data-slug')); });
    });
    boardEl.querySelectorAll('thead th[data-sort]').forEach(function (th) {
      th.addEventListener('click', function () {
        sortSel.value = th.getAttribute('data-sort');
        renderBoard();
      });
    });
  }

  // ---------------------------------------------------------------- detail

  function openDetail(slug) {
    var r = null;
    for (var i = 0; i < rows.length; i++) if (rows[i].slug === slug) { r = rows[i]; break; }
    if (!r) return;
    var base = r.tvl_usd * D.model.base_multiple;
    var steps = planFor(r).map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('');
    var chips = (r.chains || []).map(function (c) { return '<span class="chip">' + esc(c) + '</span>'; }).join('');
    detailEl.innerHTML =
      '<button class="back" type="button" id="back-btn">← Back to the board</button>' +
      '<div class="detail-card">' +
      '<h2>' + esc(r.name) + '</h2>' +
      '<p class="sub">Rank #' + r.rank + ' · ' + esc(r.slug) + ' · ' + esc(r.category || 'No category') + ' ' +
      (watchlist[r.slug] ? '<span class="badge">Watchlist</span>' : '') + '<br>' + chips + '</p>' +
      '<dl class="kv">' +
      '<div><dt>Implied value</dt><dd>' + moneyFull(r.implied_value_usd) + '</dd></div>' +
      '<div><dt>TVL</dt><dd>' + moneyFull(r.tvl_usd) + '</dd></div>' +
      '<div><dt>7-day change</dt><dd>' + (r.change_7d == null ? '—' : (r.change_7d >= 0 ? '+' : '') + r.change_7d.toFixed(2) + '%') + '</dd></div>' +
      '<div><dt>Age with no token</dt><dd>' + ageText(r.age_days) + '</dd></div>' +
      '<div><dt>Listed</dt><dd>' + esc(r.listed_at || '—') + '</dd></div>' +
      '<div><dt>Token recorded</dt><dd>None</dd></div>' +
      '</dl>' +
      '<h3>Why this value — the model, step by step</h3>' +
      '<div class="bars">' +
      '<div class="bar-row"><span class="lbl">Base: TVL × ' + D.model.base_multiple + '</span><span class="bar"><i style="width:100%"></i></span><span class="val">' + money(base) + '</span></div>' +
      '<div class="bar-row"><span class="lbl">Growth ×' + r.growth_multiplier.toFixed(2) + '</span><span class="bar"><i style="width:' + Math.round(Math.min(1, r.growth_multiplier / 1.9) * 100) + '%"></i></span><span class="val">×' + r.growth_multiplier.toFixed(2) + '</span></div>' +
      '<div class="bar-row"><span class="lbl">Maturity ×' + r.maturity_multiplier.toFixed(2) + '</span><span class="bar"><i style="width:' + Math.round(r.maturity_multiplier * 100) + '%"></i></span><span class="val">×' + r.maturity_multiplier.toFixed(2) + '</span></div>' +
      '<div class="bar-row"><span class="lbl">Reach ×' + r.reach_multiplier.toFixed(2) + '</span><span class="bar"><i style="width:' + Math.round((r.reach_multiplier - 1) / 0.15 * 100) + '%"></i></span><span class="val">×' + r.reach_multiplier.toFixed(2) + '</span></div>' +
      '</div>' +
      '<h3>How to farm it — six steps</h3>' +
      '<ol class="steps">' + steps + '</ol>' +
      '</div>';
    detailEl.hidden = false;
    boardEl.hidden = true;
    liveEl.hidden = true;
    document.getElementById('back-btn').addEventListener('click', showBoard);
    detailEl.scrollIntoView();
    if (location.hash !== '#detail/' + slug) history.replaceState(null, '', '#detail/' + slug);
  }

  function showBoard(keepHash) {
    detailEl.hidden = true;
    liveEl.hidden = true;
    boardEl.hidden = false;
    liveBtn.setAttribute('aria-pressed', 'false');
    if (!keepHash && location.hash) history.replaceState(null, '', location.pathname + location.search);
  }

  // ---------------------------------------------------------------- live

  function renderLive() {
    liveEl.innerHTML =
      '<p class="live-note">These protocols already have a token that trades, so they are shown at the market\'s own value — market cap — and never ranked against the pre-token board. They are here so a reader can tell the two apart at a glance.</p>' +
      '<table class="board"><thead><tr><th>Protocol</th><th>TVL</th><th>Market cap</th><th>7d</th></tr></thead><tbody>' +
      live.map(function (p) {
        return '<tr><td class="name"><b>' + esc(p.name) + '</b><span>' + esc(p.slug) + '</span></td>' +
          '<td class="num">' + money(p.tvl_usd) + '</td>' +
          '<td class="num">' + money(p.mcap_usd) + '</td>' +
          '<td class="num">' + pct(p.change_7d) + '</td></tr>';
      }).join('') + '</tbody></table>';
    liveEl.hidden = false;
    boardEl.hidden = true;
    detailEl.hidden = true;
    liveBtn.setAttribute('aria-pressed', 'true');
  }

  // ---------------------------------------------------------------- wiring

  [q, catSel, chainSel, sortSel, watchBox].forEach(function (el) {
    el.addEventListener('input', function () { showBoard(); renderBoard(); });
    el.addEventListener('change', function () { showBoard(); renderBoard(); });
  });
  liveBtn.addEventListener('click', function () {
    if (liveEl.hidden) renderLive(); else showBoard();
  });
  // Escape closes the detail view and returns to the board.
  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape' && !detailEl.hidden) showBoard();
  });

  // Hash routing, so each view has its own address: #detail/<slug> opens a
  // protocol, #filter/<category> opens the board filtered to a category.
  // The hashchange listener matters: moving between two views of this same
  // page changes only the fragment, so the page does not reload — without
  // it a fresh address would leave the old view on screen.
  window.addEventListener('hashchange', applyHash);
  function applyHash() {
    var h = location.hash || '';
    var m = h.match(/^#detail\/(.+)$/);
    if (m) { renderBoard(); openDetail(decodeURIComponent(m[1])); return; }
    var f = h.match(/^#filter\/(.+)$/);
    if (f) {
      var cat = decodeURIComponent(f[1]);
      if (cats[cat]) { catSel.value = cat; }
      showBoard(true);
      renderBoard();
      return;
    }
    renderBoard();
  }

  boardEl.setAttribute('aria-busy', 'false');
  applyHash();
})();
