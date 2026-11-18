# token-radar

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/Szeven/token-radar/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/Szeven/token-radar/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

Token launch radar: every pre-token protocol in a sealed DefiLlama snapshot, ranked by what its token may be worth — and what to do about it. The model prices each protocol from the snapshot's own figures, never from a hand-kept list of names, so running it on a fresh snapshot ranks whatever new protocols it carries, early.

## Run it

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts --input <snapshot.json>
```

Node 22 or later, standard library only, no network. The program writes `out/board.json` (the ranked board), `out/data.js` (the dashboard's data), `out/dashboard/` and `out/screenshots/`, and `out/dossier.json` (the summary the judge reads).

## The model (radar-2)

Implied value = TVL × category multiple × growth × maturity × chain breadth.

- **Category multiple**: the category's own median market-cap-to-TVL among the snapshot's live-token protocols (global median when a category has fewer than three live names), winsorised to [0.05, 0.60]. The snapshot, not a guess, sets the price of a token.
- **Growth**: the 7-day change, clamped to [-60%, +120%], weighted 0.5.
- **Maturity**: 0.6 rising to 1.0 over 1,095 days since listing.
- **Chain breadth**: +3% per extra chain, up to 4 extra chains.

The board ranks 226 pre-token protocols in the snapshot: the 40-protocol watchlist plus every rankable protocol below its floor (186 early finds). Protocols above the floor that the watchlist leaves out are bridges, staked and wrapped products — not new token launches — so they are not ranked. Live-token protocols are kept apart in their own view, shown at the market's own value — they are the comps the multiples are calibrated from, never rows in the ranking.

## Dashboard

A static page (no framework, no network) with a sortable, filterable board, a per-protocol detail view with the full pricing breakdown and a six-step farm plan (action, cost, time), a live-token view, and a model sandbox: move the growth, maturity, or multiple sliders and the board re-ranks live from the same snapshot figures.

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards</sub>
