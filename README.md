# Token Radar

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/Szeven/token-radar/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/Szeven/token-radar/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

Token Radar ranks the protocols that record no token yet by what their launch would be worth, and shows a reader how to farm each one. The board is built from a sealed snapshot of the protocol universe: every row's implied value follows from the snapshot's own figures — TVL, seven-day growth, how long the protocol has run with no token, and how many chains it runs on — never from a hand-kept list of names.

## The model (radar-2)

- base = TVL × 0.25
- growth = clamp(7-day TVL change, −50%, +150%), growth multiplier = 1 + growth × 0.6
- maturity = a hump over age: young protocols earn trust as they survive (0.55 → 0.80 in the first 90 days), season to 1.00 by three years, then ease to 0.85 as the wait stretches past it
- reach = 1 + 0.05 per extra chain, up to 1.15
- implied value = base × growth × maturity × reach

The board covers all 40 watchlist protocols plus the 158 early protocols below the watchlist floor — 198 rows. Protocols whose token already trades are kept apart in a Live view at their market value, never mixed into the ranking. Every row carries a six-step farm plan with what it costs and how long it takes.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input <snapshot.json>
```

`main.ts` (Node 22, standard library only) reads the snapshot, writes `board.json`, `data.js`, `dashboard/` and `screenshots/` to the output directory, and writes `dossier.json` with the vendored make.fun library. Open `out/dashboard/index.html` in a browser — no network needed.

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards</sub>
