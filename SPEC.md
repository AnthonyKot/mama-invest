# mama-invest: build spec

A one-page static site that shows how simple portfolios would have behaved if someone had started investing at a bad moment in history. It exists to help one non-expert person choose a portfolio she understands and can hold through crashes for 15–20 years. It is a family pet project, not a product.

This spec is the full brief. Where it says "default", implement that and keep it configurable. Where it says "open", make the stated choice and list it in the README so it can be reviewed.

## 1. The situation being modelled

- A grandfather invests his own money for his grandchild, who is 3 now. Horizon 15–20 years, open-ended.
- He adds a fixed amount every six months and never sells until the end.
- He can buy any asset. Broker access, fees and transfer limits are out of scope.
- The only tax is a capital gains tax of 23% on the gain, paid once at the final sale.
- The viewer wants to see: what went in, what came out, how bad it got on the way, and how long it stayed bad.

## 2. Non-goals

- No backend, accounts, live prices or network calls at runtime.
- No broker or fund recommendations, no fee modelling beyond what is already embedded in the data series.
- No Dutch tax, no hryvnia calculations, no dividend tax.
- No forecasting or Monte Carlo. History only.

## 3. Tech shape

- Static site: `index.html` plus plain JS and CSS, openable from the file system or any static host. One small chart library is fine (uPlot or Chart.js); no framework needed.
- `data/series.json`: all time series, committed to the repo.
- `scripts/build-data.*` (Python or Node): downloads sources and regenerates `series.json`. Only this script touches the network.
- `src/engine.js`: the simulation as pure functions with no DOM access, covered by unit tests.
- All UI strings in one object so the page can be translated later.
- Must be usable on a phone.

## 4. Data

Monthly, month-end, from 1998-12 to the latest complete month. Every asset is stored as a **total-return index in USD** (dividends and interest reinvested). Series quoted in another currency are converted with the month-end exchange rate in the build script.

| Key | Asset | Suggested source or proxy | Needed from |
|---|---|---|---|
| `us_stocks` | US stock index | S&P 500 total return, or adjusted close of a long-lived index fund (VFINX) | 1998-12 |
| `global_stocks` | Global stock index | MSCI World or ACWI net return in USD; before a clean series exists, a documented blend of US and international index funds | 1998-12 |
| `uk_stocks` | UK stock index | FTSE All-Share total return, or adjusted close of EWU (already in USD) | 1998-12 |
| `us_bonds` | US government or aggregate bonds | Adjusted close of VBMFX or VFITX | 1998-12 |
| `uk_gilts` | UK government bonds | Gilt total-return index; an ETF (IGLT) covers only 2006 onward | open, see below |
| `us_small` | US small companies | Adjusted close of NAESX | 1998-12 |
| `intl_stocks` | Developed markets outside the US | Adjusted close of VGTSX or an MSCI EAFE series | 1998-12 |
| `em_stocks` | Emerging markets | Adjusted close of VEIEX | 1998-12 |
| `nasdaq100` | US technology-heavy index | Nasdaq-100 total return; price-only index acceptable before a total-return series exists, if documented | 1998-12 |
| `reits` | US property companies | Adjusted close of VGSIX | 1998-12 |
| `us_long_bonds` | Long-term US Treasuries | Adjusted close of VUSTX | 1998-12 |
| `us_tips` | Inflation-linked US Treasuries | Adjusted close of VIPSX (starts 2000) | 2007-07 |
| `commodities` | Broad commodity basket | A broad commodity index or fund with history to 2007 | 2007-07 |
| `gold`, `silver` | Metals | World Bank commodity price data (monthly) or LBMA fixes | 1998-12 |
| `btc` | Bitcoin | Any public monthly close series; starts about 2010-07 | 2010-07 |
| `usd_cash` | USD deposits | Compounded 3-month US Treasury bill rate | 1998-12 |
| `gbp_cash` | GBP deposits | Compounded UK 3-month or base rate, converted to USD | 1998-12 |
| single stocks | See section 6 | Adjusted close | per scenario |
| `gbpusd`, `eurusd` | Exchange rates | FRED or central bank monthly series (EUR starts 1999-01) | 1998-12 |
| `us_cpi` | US inflation | US CPI, all urban consumers | 1998-12 |

Rules:

- The source list is a suggestion. Use whatever is public and reliable, and record in the README the exact source, ticker or series ID, and download date for every series.
- Open: `uk_gilts` before 2006. Either find a real total-return series, or build one from published gilt yields with a documented method, or mark the asset unavailable before 2006. Do not silently splice.
- Each series carries a `start` month. An asset is "unavailable" before its start.
- No gaps inside a series. If a source has a missing month, fail the build.
- If the source list cannot be fetched from the build environment, stop and say so. Do not fabricate or interpolate prices.

## 5. Simulation engine

Inputs: start month, end month, target weights per asset (sum to 1), contribution amount (default 1500, in today's USD), contribution interval (default 6 months), tax rate (default 0.23).

### Contributions

- First contribution at the start month, then every 6 months, up to and including the end month if it lands on one.
- The amount is constant in today's money, paid in the money of the time. Nominal USD paid at month `t`: `C_t = 1500 × CPI_t / CPI_latest`. So a 2007 purchase is roughly $950–1,000 in 2007 dollars, which buys what $1,500 buys today.

### Buying

- At each contribution the money is converted into whatever the asset needs at that month's rate. Because all series are already USD total-return indices, this is just `units_i += amount_i / index_i,t`.
- Nothing is ever sold before the end. The mix is steered only with new money:
  1. `V' = current portfolio value + C_t`
  2. shortfall per asset: `d_i = max(0, w_i × V' − value_i)`
  3. buy `C_t × d_i / Σd` of each asset (if `Σd = 0`, split by target weights)
- No hindsight: a portfolio may only contain assets whose series starts on or before the scenario's start month. The UI must not offer anything else (see section 6), and the engine rejects such input with an error.

### Value and tax

- Value at month `t`: `V_t = Σ units_i × index_i,t` (nominal USD).
- Money in: `K_t = Σ C` paid up to `t` (nominal USD).
- After-tax value if everything were sold at `t`: `A_t = V_t − taxRate × max(0, V_t − K_t)`. The gain is computed on the whole portfolio in nominal USD.

### Display units

Every nominal USD amount dated `t` is passed through a display transform. Money in is transformed contribution by contribution at each contribution's own date.

- **EUR (default):** `usd_t / EURUSD_t`.
- **Bucket:** a fixed basket of dollars and pounds worth half each at the scenario start. `bucket_t = usd_t / (0.5 + 0.5 × GBPUSD_t / GBPUSD_start)`. One unit equals $1 at the start month.
- **USD:** no change.
- **"Today's money" toggle (default on):** multiply by `CPI_latest / CPI_t`. Use euro-area inflation (HICP) for EUR and US CPI for USD and the bucket; say so in a footnote.

### Baseline

"Did nothing": the same contributions held 50% in `usd_cash` and 50% in `gbp_cash`. It is simulated like any other portfolio and always drawn.

### Metrics per portfolio

- Value before tax, value after tax, money in, and the multiple `A_t / K_t`, at 3, 5, 10, 15 and 20 years from the start and at the end month. Skip checkpoints beyond the data.
- **Deepest drop:** the largest peak-to-trough fall of a contribution-neutral index (chain monthly returns of the portfolio, excluding the effect of new money), with the peak and trough months.
- **Time under water:** total months and longest unbroken run of months where value before tax was below money in.
- **Worst moment:** the month with the lowest `V_t / K_t`, with both amounts.

### Every-start-year range

For each portfolio and each horizon (3, 5, 10, 15, 20 years): run the simulation from every possible start month where all its assets are available for the whole window, and report the worst, median and best after-tax multiple, plus the number of windows used. If fewer than 12 windows exist, show "not enough history" instead.

## 6. Scenarios and portfolios

### Scenarios (start months)

| Scenario | Start | Why |
|---|---|---|
| Dot-com | 1999-01 | A year before the 2000 peak |
| Financial crisis | 2007-07 | Just before the 2007 peak |
| Crypto peak | 2017-12 | Bitcoin's 2017 peak |

Each runs to the latest month by default, with a horizon selector (3, 5, 10, 15, 20 years, or "to today").

### Preset portfolios: only what was recommended at the time

The point of the page is to stand in the shoes of someone choosing at the start date, who does not know the future. So each scenario offers only portfolios that were actually being recommended or were popular **before** its start month, built only from assets that existed then. Bitcoin therefore appears only in the 2017 scenario.

Each preset has a `kind`:

- `advice`: a published, named recommendation from a book, column or well-known investor.
- `fashion`: what the crowd was excited about at the time. Shown with a visible "popular at the time" label, so the viewer can compare sober advice with hype.

The lists below are the intended line-up, written from memory. For every preset, verify the weights and that it was published before the scenario start against a citable source, and record the citation in the README. If a preset cannot be verified, drop it and say so; do not adjust weights to taste. Map each published asset class to the closest series in section 4 and document the mapping.

**1999-01**

| Name | Kind | Weights as published |
|---|---|---|
| Classic 60/40 | advice | 60% US stocks, 40% US bonds |
| Couch Potato (Scott Burns, 1991) | advice | 50% US stocks, 50% US bonds |
| Three-fund portfolio (Vanguard / Bogle followers) | advice | US stocks, international stocks, US bonds; use a commonly cited split of the time and cite it |
| Permanent Portfolio (Harry Browne, 1980s) | advice | 25% US stocks, 25% long-term Treasuries, 25% gold, 25% cash |
| Four equal parts (William Bernstein, 1990s) | advice | 25% US large, 25% US small, 25% international, 25% US bonds |
| All in tech | fashion | 100% `nasdaq100` |
| Favourites of 1999 | fashion | Equal weight: Cisco, Microsoft, Intel, Nokia, General Electric |

**2007-07**

| Name | Kind | Weights as published |
|---|---|---|
| Classic 60/40 | advice | 60% US stocks, 40% US bonds |
| Three-fund portfolio | advice | As above, with the split commonly cited by 2007 |
| Permanent Portfolio | advice | As above |
| Yale model for individuals (David Swensen, 2005) | advice | 30% US stocks, 15% developed international, 5% emerging, 20% property companies, 15% Treasuries, 15% inflation-linked Treasuries |
| Long-horizon target-date fund | advice | About 90% stocks (US and international), 10% bonds; cite a real 2007 fund's allocation |
| Emerging markets and commodities | fashion | 50% `em_stocks`, 50% `commodities` |
| Favourites of 2007 | fashion | Equal weight: Citigroup, General Electric, Exxon Mobil, BP, Nokia |

**2017-12**

| Name | Kind | Weights as published |
|---|---|---|
| Classic 60/40 | advice | 60% US stocks, 40% US bonds |
| Three-fund portfolio | advice | As above, with the split commonly cited by 2017 |
| Permanent Portfolio | advice | As above |
| All Weather (Ray Dalio, as popularised in 2014) | advice | 30% US stocks, 40% long-term Treasuries, 15% intermediate Treasuries, 7.5% gold, 7.5% commodities |
| Global stocks only | advice | 100% `global_stocks` |
| Stocks with a little Bitcoin | fashion | 95% `global_stocks`, 5% `btc` |
| All in Bitcoin | fashion | 100% `btc` |
| Favourites of 2017 | fashion | Equal weight of five of the largest, most talked-about companies of late 2017; open, list them in the README |

**Every scenario** also has:

- **Did nothing (baseline):** 50% `usd_cash`, 50% `gbp_cash`.
- **US and UK stocks:** 50% `us_stocks`, 50% `uk_stocks` (a family idea, labelled as such, not as published advice).
- **Custom mix:** a slider per asset, forced to total 100%, offering only assets available at the scenario start.

### Single stocks

Chosen as what was popular at each start, never by later performance. They appear in the "Favourites" presets and as individual options in the custom mix for that scenario only. Companies that went bankrupt or were delisted may be included with a hardcoded series ending at zero, clearly labelled.

### Every-start-year range and presets

The range in section 5 is computed only for `advice` presets and the baseline, and for each preset only from start months on or after its publication date.

## 7. Page

Top to bottom:

1. **One-sentence explanation** of what the page shows.
2. **Controls:** scenario, horizon, portfolios to compare (up to 4 plus baseline, from that scenario's list only, each showing its source and year and an "advice" or "popular at the time" label), display unit, "today's money" toggle, contribution amount.
3. **Main chart:** value over time, one line per portfolio, plus a stepped "money in" line. Hover shows month, value and money in. The worst moment of each portfolio is marked.
4. **Checkpoint table:** rows are portfolios, columns are 3, 5, 10, 15, 20 years; each cell shows value after tax and the multiple. Cells below money in are visibly flagged.
5. **Plain-language card per portfolio**, generated from the metrics, for example: "By March 2009 you had put in 9,400 and it was worth 5,900. It took until April 2011 to get back above what you paid in. After 15 years and tax: 71,000 from 45,000 put in."
6. **Gut check** at each portfolio's worst moment: "Would you have kept buying here?"
7. **Every-start-year panel:** per horizon, a worst–median–best bar per portfolio.
8. **Footnotes:** data sources, the tax rule, the inflation simplification, "past results do not predict future results".

Tone: calm and plain. No jargon in the UI: say "deepest drop", not "max drawdown"; "money in", not "cost basis".

## 8. Tests

Unit tests for the engine on synthetic data:

- Flat prices, flat CPI: value equals money in at every month; tax is zero; multiple is 1.
- One asset that doubles instantly after a single contribution: gain equals the contribution; after-tax value is `2C − 0.23C`.
- Portfolio below money in at the end: tax is zero, never negative.
- Contribution schedule: a 10-year run has 21 contributions when the end month lands on one, and nominal amounts follow CPI.
- Steering: with a 50/50 target and one asset that has doubled, the next contribution goes entirely to the other asset; nothing is ever sold (units never decrease).
- No hindsight: a portfolio containing an asset that starts after the scenario start is rejected; the 1999 and 2007 scenarios never list `btc`.
- Display: bucket value equals USD value when GBPUSD is unchanged since the start; with "today's money" on, money in equals `1500 × number of contributions`.

Sanity checks on real data, printed by the build script: the 1999 all-US-stocks run is below money in during early 2003 and early 2009; Bitcoin bought in 2017-12 is down more than 70% within about a year.

## 9. Deliverables for review

- The site, the build script, the engine tests and `data/series.json`.
- A README with: how to run and rebuild data; the provenance of every series; every "open" decision taken; every place the implementation deviates from this spec and why.
- The printed sanity-check output from the last data build.

## 10. Revision 2: changes after the first review

The first build's engine, data and tests are sound. Make these changes; where they conflict with earlier sections, this section wins.

### 10.1 One set of units for everything the viewer sees

In the first build the large multiples were in nominal USD while the amounts beside them were in today's money, so a card read "2.88×" next to amounts that were 2.1× apart, and deposits showed "1.20×" while losing purchasing power.

- Every multiple, "below money in" flag, red cell, worst moment, recovery date, time-under-water count and every-start-month range is computed from the **displayed** series: displayed after-tax value divided by displayed money in, under the current unit and "today's money" setting.
- Tax itself is still computed on the nominal USD gain, then converted for display.
- The cached ranges are generated for the default view (EUR, today's money). If the viewer switches unit, either recompute in the browser or label the panel as "in euros, today's money".
- Add a test: for any run, the headline multiple equals displayed after-tax value divided by displayed money in.

### 10.2 Default display is euros in today's money

- Default unit: EUR, "today's money" on. The dollar–pound basket and USD remain as options.
- Add a euro-area inflation series (HICP, monthly, from 1998-12) to the data, with provenance, and use it for the EUR today's-money view.
- The contribution is still defined as $1,500 of today's US dollars, converted at each payment date. Label the input accordingly and show its current euro equivalent next to it.

### 10.3 Fuller line-up, using real funds where weights cannot be verified

The first build dropped too much: the 2007 scenario had two advice portfolios and nothing "popular at the time", and no scenario had a global stock portfolio. Apply one consistent standard: `advice` needs a citable published source or a real fund that existed; `fashion` needs evidence the theme was popular before the start, and its weights are labelled illustrative (as "All in tech" already is).

- **Real one-fund portfolios (`advice`):** use the actual total-return history of a diversified fund that existed at the scenario start, so no weights need verifying. Candidates, to be confirmed against the fund's real inception date: Vanguard LifeStrategy Growth (VASGX) for 1999, a Vanguard Target Retirement fund such as 2045 (VTIVX) for 2007, Vanguard Total World Stock (VT or VTWSX) for 2017. Show the fund's stated allocation at the time as description only.
- **Swensen 2007:** restore, using a developed-markets fund with history before 2007-07 (for example EFA) for the developed sleeve. Verify the weights against the 2005 book or a citable summary.
- **Favourites of 1999 and of 2007:** restore as `fashion` with equal illustrative weights, citing evidence that those companies were among the largest or most widely held before each start.
- **2007 fashion theme:** include emerging markets and commodities if pre-start enthusiasm can be cited, weights labelled illustrative.
- Every scenario must end up with at least three `advice` presets, at least one `fashion` preset, and at least one portfolio holding stocks outside the US.

### 10.4 Smaller fixes

- Gut check: place "Would you have kept buying here?" at each portfolio's worst moment, with the month, money in and value at that point, and link it visually to the marker on the chart.
- Verify the layout at phone width (360–400 px) in a real browser: no horizontal page scroll, controls and cards in one column, the table scrolls inside its own container.
- Delete the `.preview-profile` folder and keep it out of the repo.
- Fix the mis-encoded dash in `data/sanity-checks.txt` (write files as UTF-8).

## Current property revisions (user requests, 16 November 2026)

These later requests supersede conflicting historical requirements below:

- Explicit adjustable upkeep, with a separate operating-cost allowance and an
  option to restore the original combined allowance without double counting.
- Country rows assume local residents on both sides; resident taxes are simplified
  and their exclusions are visible. Main portfolio graph retains its own tax model.
- July 2006 and July 2007 purchases, with separate 2026-2028 forecast scenarios.
  Forecast inputs cite dated published outlooks; missing forecast horizons,
  historical data gaps and model stress cases are labelled assumptions.
- Original source observations remain immutable. The mortgage finishes after
  240 payments; ownership can continue beyond payoff. Inflation display uses the
  same historical base month across projected endpoints.
- A final table compares money paid in, landlord and matched investor at 3, 5,
  10, 15, 20 years and the endpoint. Estimated cells are visibly distinguished.

## 11. Revision 3: rental property as a comparison

Goal: let the viewer compare the portfolios with "buying a home to rent out" in the United States, United Kingdom, Netherlands and Poland.

### 11.1 The model: a slice of a typical home, no mortgage

€1,500 every six months cannot buy a flat, so property is modelled as a hypothetical asset: each contribution buys a slice of the country's typical home at that month's price, and the rent it earns, after costs, is reinvested in more slices. This makes property comparable to the other portfolios under identical rules (same contributions, no selling, same 23% tax on the gain at the end).

Label these clearly on the page as **hypothetical**: "A slice of a typical home in <country>, bought without a mortgage. You cannot actually buy this with small amounts." They get their own `kind: 'property'` and tag, are selectable like presets (one per country, 100% in that asset), and are also offered in the custom mix.

### 11.2 Building each country's series

One total-return index per country, in USD, monthly:

1. **Price:** a national residential price index in local currency. Suggested sources: S&P Case-Shiller national index (US), the official UK House Price Index, the CBS/Kadaster existing-homes index (Netherlands), and for Poland whichever of BIS, OECD, Eurostat or the central bank gives the longest national series. Record provenance as for every other series.
2. **Rent:** no clean historical rental-yield series exists. Derive the gross yield path from a published price-to-rent ratio index (OECD publishes one per country), anchored to one citable gross-yield figure for a stated year. Document the anchor and its source for each country.
3. **Costs:** net rent = gross rent × (1 − cost share). Default cost share 35% (maintenance, vacancy, management, insurance, local taxes), one adjustable input on the page for all countries. Also apply a purchase cost to every purchase (default 4%) and a selling cost at the final sale (default 2%), both adjustable. State on the page that these are assumptions.
4. **Total return:** monthly growth = price change + net rent yield / 12, compounded, then converted to USD at the month-end rate. Add PLN/USD to the exchange-rate data.
5. **Frequency:** where the source is quarterly, interpolate to monthly geometrically. This is the only place interpolation is allowed; mark the series as interpolated in the data and footnotes.

Availability follows the no-hindsight rule: a country appears only in scenarios starting on or after its series start. Poland will probably be missing from 1999; do not backfill it.

### 11.3 What the page must say about it

Next to any property line or card, in plain words:

- Price indices are averages of many homes and move smoothly; one real flat is lumpier and can do much better or worse.
- No mortgage is modelled. Borrowing is how most landlords multiply both gains and losses.
- Being a landlord is work and carries empty months and repairs; the cost share is a rough allowance for that.
- Rent is treated like dividends: no income tax during the period, 23% on the total gain at the end.

Because property indices are smoothed, "deepest drop" for property understates what an owner would have felt; show the figure with that caveat.

### 11.4 Tests and checks

- Synthetic: flat prices with a 4% net yield compound to the expected value; purchase and selling costs reduce the result by the expected amounts; quarterly-to-monthly interpolation reproduces the quarterly points exactly.
- Real-data sanity, printed by the build: US prices fall between 2007 and 2011; Dutch prices fall between 2008 and 2013; UK prices in GBP fall in 2008; each country's derived gross yield stays within 2–10% throughout (fail the build otherwise).

### 11.5 Property with a mortgage (optional view per country)

Add a second property option per country, "with a mortgage", alongside the no-mortgage slice. It keeps the same contributions so the lines stay comparable.

- **Purchases:** each contribution is the deposit on a larger slice. With borrowed share `L` (default 70%, adjustable 0–90%) and purchase cost `c`, the slice bought is `P = contribution / (1 − L + c)` and the new loan is `L × P`. Loans are in the property's local currency.
- **Interest:** interest-only, charged monthly at that country's average rate on new mortgages for that month (a simplification: real loans fix rates for years). Add one mortgage-rate series per country with provenance; a country's mortgage option is available only from that series' start.
- **Rent:** each month, net rent minus interest. A surplus pays down the loan (once the loan is zero, it buys more slices). A shortfall is added to the loan; count these months.
- **Value shown:** equity = property value − loan, converted for display. Equity can go below zero; show it as such and mark the months ("you owed more than the home was worth").
- **End:** sell, deduct the selling cost, repay the loan, then 23% tax on the gain over money in.
- **Metrics:** the usual ones on equity, plus months in negative equity and months where rent did not cover interest.
- **Page text:** say plainly that a real borrower in negative equity or with rent below interest may be forced to sell, which this model does not do, and that a real mortgage needs a large deposit up front, not small regular payments.
- **Tests:** with `L = 0` the result equals the no-mortgage slice; with flat prices and net rent equal to interest, equity equals money in minus costs; a price fall of `1 − L` right after a single purchase takes equity to about zero.

### 11.6 Tax on rental income

Property differs from the other assets in one more way: rent is taxed every year, in the country where the home is. Both property options (with and without a mortgage) must include it.

- Rent kept each month = gross rent × (1 − cost share) × (1 − rent tax rate). In the mortgage option, apply the tax to rent after costs and before interest (a simplification: some countries allow interest to be deducted).
- One rent tax rate per country, shown and adjustable on the page. Look up the current rule for a private landlord in each country, cite it in the README, and reduce it to a single effective percentage of net rent; where a country taxes something other than actual rent (for example a deemed return on the property's value), convert it to an equivalent percentage and document the conversion. If a rule cannot be verified, use 20% and label it as an assumption.
- Today's rule is applied to the whole history, like the 23% rate.
- Price growth is taxed only once, at the final sale: 23% on the total gain over money in, as for every other portfolio.
- Each property card shows the split of the final result: from price growth, from rent kept, and how much went to costs, rent tax and (if any) interest.
- Test: with flat prices, the result equals contributions plus compounded rent after costs and tax; setting the rent tax to 0 reproduces the earlier untaxed result.

### 11.7 Property is taxed entirely by local rules (overrides 11.1, 11.5 and 11.6 on tax)

Property is taxed where the home is, on both rent and the sale. The 23% rate applies only to the non-property portfolios.

- **Sale:** replace the 23% end tax for property with each country's own rule for a private individual selling a rented-out home. Look up and cite the current rule per country, including any exemption after a minimum holding period, any annual wealth-type tax charged in place of a gains tax, and whether the gain is measured in local currency. Measure the property gain in the home's local currency.
- **Rent:** local rule per country, as in 11.6.
- **Owner:** assume a private individual who does not live in that country; where the rule for non-residents differs from residents, use the non-resident rule and say so. Ignore any further tax in the owner's home country.
- **Holding period:** for exemptions that depend on how long the home was held, count from the scenario start.
- **Annual taxes:** where a country charges a yearly tax on the property's value instead of taxing rent or gains, deduct it yearly from rent kept (adding to the loan in the mortgage version if rent does not cover it).
- **Mixed custom portfolios:** tax the property part by its country's rules and the rest at 23% on its own gain, each computed separately.
- **Page:** each property card states the rules used in one or two plain sentences with a link to the source, and a footnote says today's rules are applied to all of history. Rates stay adjustable.
- **Unverified rules:** if a country's rule cannot be verified, use 20% on rent and 20% on the gain, labelled as assumptions.
- **Tests:** a country with a holding-period exemption pays no sale tax past the threshold and pays it before; property and non-property parts of a mixed portfolio are taxed separately.

### 11.8 The property owner is a Dutch resident; Dutch rules follow history (overrides the "Owner" bullet in 11.7)

The owner of every property is a private individual living in the Netherlands whose other wealth already uses up the tax-free allowance, so no allowance is applied.

**Dutch property: use the rules that were in force in each year, not today's rules.** Build a year-by-year table of Dutch rules for a rented-out second home from 1999 to now, each row cited, and apply the row for the year in question. It must cover at least:

- the regime before 2001 (rent taxed as income, plus the separate wealth tax);
- box 3 from its introduction in 2001: the deemed return and tax rate for each year, including every later change of method and rate;
- how the home is valued for box 3 in each year (official value, and the discount for rented-out homes from the year it was introduced);
- how mortgage debt is treated in each year (deducted from the taxable base; separate deemed rate for debts from the year that started);
- the absence of a tax on the sale gain for private owners;
- the transfer tax on purchase in each year, at the rate for buyers who will not live in the home. This replaces the flat 4% purchase cost for Dutch property.

Each relief or deduction applies only from the year it was introduced. Do not apply the mortgage interest deduction for owner-occupied homes: the home is rented out. Where a year's rule cannot be verified, carry the nearest verified year forward or back and mark those years in the README. For years after the latest enacted rules, hold the latest rules constant; do not model announced but unenacted reforms.

The yearly tax is deducted from rent kept, as in 11.7.

**Property in the UK, US and Poland:** taxed by that country's rules for a non-resident owner (11.7), using today's rules for all of history. Assume the Netherlands gives full relief for foreign property, so no Dutch tax is added on top; state this assumption on the page.

**Page:** the Dutch property card shows a small timeline of the rule changes that affected the result. Add a test with a synthetic two-regime rule table checking that the regime switches in the right year.

## 12. Revision 4: property as "buy one home with a 20-year mortgage" (replaces the slice models in 11.1 and 11.5)

Property is no longer a line among the portfolios. It becomes its own section of the page answering two questions: **how much would we have had to pay each month to buy a rental home, and what did we have after 20 years?** Then it compares that with putting the same money into the portfolios.

Only two cases, each exactly 20 years: bought **1999-01** (ends 2019-01) and bought **2007-07** (ends 2027-07; show it to the latest month and label it "not finished: N years of 20", with the remaining loan balance). Countries: Netherlands, UK, US, Poland, each only if its data covers the purchase date. Remove property from the preset lists, the custom mix and the every-start-month ranges.

Data for prices and rent stays as in 11.2 (steps 1, 2 and 5); taxes stay as in 11.6–11.8.

### 12.1 The purchase

- **Home:** one typical home in the country, at a real price level for the purchase month in local currency (national average or median sale price, cited). Its value then follows the country's price index.
- **Deposit:** default 20% of the price, adjustable 0–40%.
- **Purchase costs:** paid up front on top of the deposit: transfer tax by the year's rule for the Netherlands (11.8), default 4% elsewhere, adjustable.
- **Loan:** the rest of the price, in local currency, repaid over 20 years in equal monthly payments (annuity). The rate is that country's average rate on new long-fixed mortgages in the purchase month, held for all 20 years (a simplification; say so). Add one cited mortgage-rate series per country.

### 12.2 Month by month

- Rent starts at the derived gross yield on the purchase price and follows the country's rent path; rent kept = gross rent after the cost share and rent tax (11.6–11.8).
- **Out of pocket** each month = mortgage payment − rent kept, plus any yearly tax not covered by rent. When rent kept exceeds the payment, the surplus goes into a savings pot earning the local deposit rate; it is not reinvested in property.
- Loan balance follows the annuity schedule. For the Netherlands, the loan balance feeds the yearly tax calculation as the rules of that year require.

### 12.3 What the section shows, per country and case

1. **Up front:** deposit and purchase costs.
2. **Monthly out of pocket:** in the first year, the average over 20 years, the highest month, and the month from which rent covered the payment (if ever). Also show the mortgage payment and rent kept separately, so the gap is understandable.
3. **Total paid in** over the period (up front plus all out-of-pocket months).
4. **After 20 years:** home value, loan remaining (zero if finished), savings pot, and the amount left if sold then, after selling cost and local sale tax.
5. **The ride:** equity (home value − loan) month by month, months where the owner owed more than the home was worth, and the lowest equity point.
6. **Split of the result:** price growth, rent kept, loan interest paid, costs, taxes.
7. **Same money in the portfolios:** take the identical cash flows (the up-front amount as one payment at the start, then each month's out-of-pocket amount, zero in surplus months) and run them through the same engine for the portfolios the viewer has selected for that scenario, with the 23% end tax. Show final after-tax amounts side by side with the property result, and both rides on one chart.

All amounts in the page's display unit (default euros in today's money), converted month by month like everything else; also show the headline monthly figures in the home's local currency of the time.

### 12.4 Engine changes

- The engine must accept an arbitrary schedule of dated contributions (amount per month in nominal local currency converted to USD), not only a fixed amount every six months.
- Property simulation is a separate pure function with its own tests: annuity payment matches the closed-form formula; loan balance is zero after 240 payments; with flat prices, zero rent and zero costs, total paid equals price plus interest and the final value equals the price; the comparison portfolios receive exactly the property's cash flows.

### 12.5 Page text

State plainly, next to the results: one real home differs from the national average; the rate is assumed fixed for 20 years; empty months and repairs are covered only by the cost allowance; a landlord in a bad stretch must keep paying or sell; a lender would have needed proof of income, which is not modelled.

## 13. Revision 5: the landlord vs investor scoreboard

The headline of the property section is one table that answers: **with the same money on the same dates, who ended with more purchasing power, the landlord or the classic investor?**

### 13.1 The two sides

- **Landlord:** the home from section 12, per country and case (1999 and 2007).
- **Classic investor:** a 50/50 stocks-and-bonds portfolio fed with exactly that landlord's cash flows (12.3 item 7), in two versions:
  - **Dollar 50/50:** 50% `us_stocks`, 50% `us_bonds` (the existing Couch Potato).
  - **Euro 50/50:** 50% `global_stocks`, 50% euro government bonds. Add a euro government bond total-return series reaching back to 1998-12 (for example a German government bond performance index published by the central bank, converted to USD), with provenance. If none can be sourced, show only the dollar version and say so.
- The viewer can swap the 50/50 for any other portfolio available in that scenario, but 50/50 is the default.

### 13.2 The numbers, identical for both sides

All in today's purchasing power, after all costs and taxes (local rules for the home, 23% end tax for the portfolio):

- **Multiplier:** final amount ÷ total paid in. Final amount for the landlord = sale proceeds after selling cost and tax, plus the savings pot. Total paid in = up-front amount plus every out-of-pocket month.
- **Yearly real return:** the single annual rate that turns those dated payments into that final amount (money-weighted return). Show it next to the multiplier, because the multiplier alone flatters whoever paid in earlier.
- **Worst moment:** the lowest ratio of current worth to money paid in so far, with its date. For the landlord, current worth is equity net of selling cost.
- **Winner margin:** landlord's final amount ÷ investor's final amount.

### 13.3 Layout

One table per case (1999, 2007). One row per country: landlord multiplier and yearly return, investor multiplier and yearly return (dollar and euro versions), margin, and both worst moments. A unit switch (EUR / USD) applies to the whole table. Clicking a row opens that country's detail from section 12. For the unfinished 2007 case, compute everything as if sold at the latest month and label it.

Under the table, a fixed plain-language note: the amounts are comparable, the lives are not. The landlord borrowed, held one building in one country, did the work, and could not sell part of it; the investor did none of that and could sell any day.

### 13.4 Tests

- With identical cash flows and identical final amounts, both sides show the same multiplier and yearly return.
- The yearly-return solver reproduces a known rate on a synthetic schedule (for example monthly payments growing at exactly 5% a year).
- The investor's total paid in equals the landlord's, to the cent, in every case.
