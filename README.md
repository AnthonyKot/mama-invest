# mama-invest

Open **index.html** directly in a browser. The site is static, works offline,
and contains history through **October 2026**. No server or installation is
needed for viewing. The main graph is a historical family illustration. The separate property section
also has clearly labelled 2026-2028 scenarios; see PROPERTY-README.md.

The **Landlord or investor?** section implements the one-home, 20-year mortgage
comparison from Sections 12-13. Read [PROPERTY-README.md](PROPERTY-README.md) for
the property sources, cash-flow matching, country endpoints and material tax
simplifications. Netherlands, UK and US are available; Poland and the euro-bond
comparison are explicitly unavailable pending suitable inputs. The 2007 cases
are unfinished and stop at their individual data endpoints.

## Portfolio verification — read this first

Revision 2 uses one standard: advice is a named published allocation or an actual
fund that existed at the start. Popular-at-the-time portfolios need evidence of
pre-start popularity or size; their weights are explicitly illustrative. The
funds use their own adjusted-price histories, including internal rebalancing.
The default view is euros in today's money, using euro-area HICP.

| Preset | Scenarios | Evidence and mapping |
| --- | --- | --- |
| Classic 60/40 | All | [Vanguard Balanced Index](https://advisors.vanguard.com/investments/products/vbiax/vanguard-balanced-index-fund-admiral-shares) documents the 60% US stock / 40% US bond objective and management since 1992. [Historical report](https://www.sec.gov/Archives/edgar/data/889519/000093247107001447/balancdfullfile_final.htm) also confirms the allocation. The 1992 date relies on retrospective fund history, not an archived 1992 recommendation. VFINX proxies broad US stocks; VBMFX represents aggregate bonds. |
| Couch Potato | 1999 | [Scott Burns, 29 September 1991](https://scottburns.com/on-the-importance-of-being-a-dull-investor/) specifies 50% S&P 500 / 50% bonds. VFINX/VBMFX; aggregate bonds proxy the intermediate bond index in the original. [Burns's 2001 account](https://scottburns.com/simple-diversification-works/) identifies the VFINX/total-bond implementation. |
| Permanent Portfolio | All | [Rowland and Lawson's publisher excerpt, pp. 2–3](https://catalogimages.wiley.com/images/db/pdf/9781118288252.excerpt.pdf) traces the simplified allocation to Browne's 1987 book and specifies four equal shares. [Their AAII article](https://www.aaii.com/journal/article/the-permanent-portfolio-using-allocation-to-build-and-protect-wealth) explains the sleeves. 25% each VFINX, VUSTX, gold and Treasury-bill cash. Retrospective verification of the historical recommendation. |
| All Weather / All Seasons | 2017 | [Tony Robbins](https://www.tonyrobbins.com/blog/the-end-of-the-bull-market) gives 30% stocks, 40% long Treasuries, 15% intermediate Treasuries, 7.5% gold and 7.5% commodities. [Publisher](https://www.simonandschuster.com/books/MONEY-Master-the-Game/Tony-Robbins/Tony-Robbins-Financial-Freedom-Series/9781476757803) dates the book to 18 November 2014. VFINX/VUSTX/VFITX/gold/DBC. VFITX is a duration proxy, not precisely a 7–10-year ladder. This is the retail All Seasons allocation, not Bridgewater's proprietary fund. |
| All in tech | 1999 | [8 December 1998 reporting](https://www.latimes.com/archives/la-xpm-1998-dec-08-fi-51726-story.html) supports pre-start technology enthusiasm. Nasdaq-100 is the proxy. The 100% weight is the brief's illustrative all-in comparison, not advice in the source. |
| All in Bitcoin | 2017 | [28–29 November 2017 coverage](https://www.coindesk.com/markets/2017/11/29/its-official-bitcoins-price-makes-history-passing-10k) documents pre-start excitement. BTC-USD, 100%; the brief's all-in comparison, not a source recommendation. |
| Favourites of 2017 | 2017 | [GeekWire, May 2017](https://www.geekwire.com/2017/charts-tech-giants-apple-google-microsoft-amazon-facebook-worlds-valuable-companies/) identifies Apple, Alphabet, Microsoft, Amazon and Facebook as the five largest. Each receives the brief's equal 20% weight. AAPL, GOOGL, MSFT, AMZN and META. The source confirms the selection, not a published equal-weight portfolio. |
| US and UK stocks | All | Family idea: 50% VFINX / 50% EWU; never labelled published advice. |
| Did nothing | All | Brief's baseline: 50% modelled USD deposits / 50% modelled GBP deposits. |

Publication cutoffs use conservative month boundaries: October 1991 for Burns,
December 1992 for the balanced fund, January 1988 for the year-only Browne
reference, and December 2014 for Robbins. Rolling windows also respect asset
availability. Sources were checked on 16 November 2026.

### Restored portfolios and historical evidence

| Portfolio | Evidence, allocation and limits |
| --- | --- |
| LifeStrategy Growth (1999) | VASGX began **30 September 1994**, confirmed by [Vanguard's fact sheet](https://workplace.vanguard.com/assets/corp/fund_communications/pdf_publish/us-products/investment-profiles/0122.pdf). Actual fund returns, not a reconstructed 80/20 blend. The [historical Vanguard report](https://www.sec.gov/Archives/edgar/data/736054/000093247106001011/starfinal.htm) describes its historical benchmark as 65% US stocks, 15% EAFE and 20% bonds. This is descriptive benchmark information, not verified exact January 1999 holdings. The [2004 fact sheet](https://okmrf.org/PDFs/FS122%209-30-04.pdf) confirms that an active allocation sleeve could change stock/bond exposure. Exact pre-start holdings remain unconfirmed; the fund itself and its inception are confirmed. |
| Target Retirement 2050 (2007) | VFIFX began **7 June 2006**. [Vanguard's March 2007 report, pp. 43-44](https://www.sec.gov/Archives/edgar/data/752177/000093247107000836/chesterfinal.htm) confirms inception and holdings: 72% US stocks, 10.5% European stocks, 4.7% Pacific stocks, 2.8% emerging stocks and 10% bonds. These describe the fund then; the simulation buys VFIFX and follows its actual changing allocation. Selected 2050 rather than the spec's optional 2045 example. |
| Total World Stock (2017) | VT began **24 June 2008**, confirmed by [Vanguard](https://advisors.vanguard.com/investments/products/new/vt/vanguard-total-world-stock-etf). All-stock global fund covering developed and emerging markets; country weights vary. Actual VT history, with no backfill into 1999 or 2007. |
| Swensen (2007) | Original *Unconventional Success*, published [9 August 2005](https://www.simonandschuster.com/books/Unconventional-Success/David-F-Swensen/9780743228381). [Citable summary of the original allocation](https://abnormalreturns.com/2011/09/12/updating-the-swensen-portfolio/): 30% US stocks, 15% developed foreign, 5% emerging, 20% REITs, 15% Treasuries, 15% TIPS. VFINX/EFA/VEIEX/VGSIX/VFITX/VIPSX. [EFA](https://www.ishares.com/us/products/239623/ishares-msci-eafe-etf) began 14 August 2001 and excludes US/Canada and emerging markets. VFINX is a large-cap proxy and VFITX an intermediate-duration proxy. This is his individual-investor model, not Yale's endowment. |
| Favourites of 1999 | Microsoft, GE, Intel, Cisco, Nokia: [1998 market-cap ranking](https://www.leksikon.org/art.php?n=3938&t=512) places them at 1, 2, 7, 19 and 62. This is retrospective evidence of pre-start size, not a claim that this particular basket was published before January 1999. The brief selects these five; equal 20% weights are illustrative. |
| Favourites of 2007 | Citigroup, GE, Exxon Mobil, BP, Nokia: [FT Global 500, March 2006](https://media.ft.com/cms/b970931e-c2f8-11da-a381-0000779e2340.pdf) ranks them 4, 2, 1, 5 and 46. Equal 20% weights are illustrative; the source verifies pre-start size, not a recommended basket. |
| Emerging markets and commodities (2007) | [IMF April 2006 report](https://www.elibrary.imf.org/display/book/9781589065048/ch001.xml) describes record emerging-market private flows and strong equity/bond flows. [February 2005 reporting](https://www.energyintel.com/0000017b-a7a6-de4c-a17b-e7e6c3ed0000?view=secondary-register) documents growing investor demand for commodities. VEIEX/DBC, illustrative 50/50 weights; neither source recommends that blend. |

Each scenario now has at least three advice choices, a popular-at-the-time
choice, and a portfolio holding non-US stocks. One-fund choices are labelled
**Advice - one fund**. This describes a documented investable product, not a
claim that buying it was right for every investor.

### Omitted candidates

- **Three-fund portfolios:** no specific date-appropriate split verified; the
  concept does not imply a universal published allocation.
- **Bernstein four equal parts:** the [September 1996 original, pp. 1–2](https://efficientfrontier.com/ef/996.pdf)
  gives equal shares but explicitly calls them illustrations, not recommendations.
  Its foreign sleeve also specifies equal Europe/Pacific/EM shares, unlike VGTSX.
- **2017 95/5 stocks/Bitcoin:** no pre-start source for that exact mix verified.

## Run, rebuild and check

Open `index.html` or serve this folder from any static host. `data/series.js`
and `data/ranges.js` mirror the JSON files so `file://` works without fetch.
Only clicking a source link leaves the offline page. No site was published.

Building requires Python 3.10+, Node.js and Windows' included curl. No packages
or API keys are needed. In normal PowerShell:

```powershell
cd C:\Users\rdyto\Projects\mama-invest
python -B scripts/build-data.py
```

This downloads raw evidence, assembles series, runs sanity checks and computes
rolling ranges. `--refresh` redownloads snapshots; otherwise matching checksums
and endpoints allow reuse. `--download-only` stops after retrieval, and
`--only metals_workbook` retrieves only that source. Raw reports still flag
missing observations even when derived data uses approved estimates. A targeted
report covers only its run; per-source metadata is the lasting record.

Rebuild without any network access:

```powershell
python -B scripts/build-data.py --offline
```

Tests (Node 22+ for the no-isolation option):

```powershell
node --test --test-isolation=none tests/engine.cjs tests/data.cjs
python -B -m unittest discover -s tests -p test_data.py
```

No-isolation avoids the agent environment's child-process restriction. FRED and
World Bank requests use curl; Yahoo uses urllib. The script does not alter
proxies, TLS verification or Windows settings. Shared API keys are not used.

## Approved approximations

The user approved approximating missing data after source review. Raw snapshots
remain unchanged. Every substituted observation has a value, method and source
in `data/approximations.json` and the main dataset. The page displays a notice.

1. **October 2025 CPI:** `sqrt(324.800 × 324.122) = 324.4608229047076`, following
   [BLS geometric-mean guidance](https://www.bls.gov/cpi/factsheets/approximating-missing-data.htm).
   This is an estimate, not a published CPI observation.
2. **February–October 2026 GBP rate:** 3.75% Bank Rate proxies the missing
   3-month rate. [Bank of England history](https://www.bankofengland.co.uk/boeapps/database/Bank-Rate.asp)
   shows that base rate from 18 December 2025 until 5 November 2026. The base
   rate is observed; treating it as a deposit/interbank rate is the approximation.
3. **October 2026 euro-area HICP:** provisionally carry September's **104.29**
   forward one month. [Eurostat via FRED](https://fred.stlouisfed.org/series/CP0000EZ19M086NEST)
   had observations only through September at retrieval. This is not an observed
   October inflation reading; refresh when published. No earlier gaps are filled.
4. Rules are bounded to these dates; observed values always win. Other gaps fail
   the build. No asset-price history or pre-inception values are invented.

## Series methods and deviations

- Equities/funds use last available daily adjusted close each month, normalized
  to 100 at actual start. Dividends are reinvested through provider adjustments.
  Embedded fund expenses remain. Corporate actions rely on Yahoo's adjustments;
  spun-off holdings are not independently reconstructed.
- VFINX is large-cap, not the whole US market; EWU is a USD-traded UK proxy,
  not the complete FTSE All-Share. VBMFX includes non-government bonds.
- International stocks use VGTSX including emerging markets; the UI says stocks
  outside the US, not developed-only.
- Global stocks is an equal-dollar VFINX/VGTSX buy-and-hold blend established
  December 1998. The internal holdings are not rebalanced; the US share drifts.
  It is not MSCI/ACWI. The separate global_stocks_fund uses actual VT history from 2008; it is not spliced into earlier history.
- Nasdaq-100 is price-only throughout; dividends excluded. QQQ is not spliced
  in. This explicitly extends the spec's pre-fund price-only exception.
- Gold/silver use World Bank **monthly averages**, not month-end fixes. No
  income or storage costs. This can soften the apparent worst drop.
- IGLT.L data starts **January 2008**, despite earlier fund inception. Gilts
  are unavailable in 1999/2007. GBP/GBp/GBX quotes are checked and converted to
  USD with dated GBPUSD. No pre-2006 yield reconstruction was attempted.
- Bitcoin data starts **September 2014**, not 2010, and is only offered in the
  2017 scenario. No earlier history is backfilled.
- USD cash uses the prior month's final DTB3 discount yield. A 91-day bill's
  annual simple investment yield is `(365/360)*d/(1-d*91/360)`, with decimal d.
  Monthly growth is `1 + yield*days_in_month/365`, compounded. This is a deposit
  proxy, not a realized Treasury-bill fund return.
- GBP cash uses the prior month's short rate and the same days/365 compounding,
  then converts to USD. The February rate proxy first affects March's return.
  Neither cash series promises what a retail bank would actually have paid.
- FX uses the last observed FRED business day each month. EUR starts January
  1999. US CPI is all-items urban consumers, not seasonally adjusted (CPIAUCNS).
  Euro HICP (CP0000EZ19M086NEST, fixed 19-country euro area, all items, monthly,
  not seasonally adjusted, 2025=100) adjusts EUR purchasing power. US CPI
  adjusts USD/basket purchasing power and all contribution amounts. The latest
  index anchors today's money; the brief's $950–1,000
  example was illustrative, not a fixed contribution constraint.

Exact URLs, tickers/IDs, UTC download dates and SHA-256 fingerprints are in
`data/raw/*.meta.json`; the derived dataset embeds its inputs' metadata.
Downloads for this build occurred on **16 November 2026**. Asset notes and source
references are also embedded in `data/series.json`.

## Simulation and display

Contributions occur at month-end, every six months, including an endpoint on the
schedule. Only new money steers weights. This intentionally differs from the
selling/rebalancing rules of several original recommendations. Actual one-fund
portfolios retain internal fund-manager rebalancing and allocation changes.

Tax is 23% of the positive whole-portfolio nominal USD gain at the endpoint.
Charts are before tax; checkpoints are hypothetical sales, not actual intervening
sales. All multiples, loss flags, underwater counts, recovery and worst-month
selection use displayed **after-tax value / displayed money in**. Money in is
converted payment by payment. Worst-month cards show after-tax amounts; chart
markers identify that month on the before-tax line. Deepest drop uses the
contribution-neutral before-sale path in the selected currency and inflation
units. Tax and contribution sizing remain nominal USD calculations.

The test that today's-money contributions equal 1500 × count applies to **USD**.
It cannot also hold in a changing FX basket/EUR under the spec's conversion
formulas; those formulas take precedence. Deepest drop chains returns before
new payments. Monthly observations cannot measure intra-month crashes. Recovery
is the first subsequent month above money in, not guaranteed permanent recovery.

Ranges use every complete monthly start window, only advice and baseline,
respecting publication and data starts. Endpoint payments are included. Under
12 windows means “not enough history”. Cached ranges use 23% tax/six-month
contributions; changing contribution size scales cash flows and does not change
their displayed multiples. Six cached variants cover EUR/USD/basket, each
with and without inflation; the range panel always follows the controls. If changing tax or schedule in code, regenerate ranges.

## Checks and review limits

`data/sanity-checks.txt` records the last offline build's US-stock and Bitcoin
checks. Synthetic tests cover contributions, tax, steering, currency conversion,
drawdown, underwater periods and rolling cutoffs. Dataset tests check scenario
availability, actual data, estimates and static dependencies.

The page has responsive CSS, labelled controls, a keyboard-inspectable SVG chart,
and textual tables/cards. Browser visual verification could not be completed:
installed Chrome exited before exposing a preview endpoint in this restricted
environment. CSS now stacks controls/cards at 360-400 px and confines table
scrolling to its own container, but real-browser/physical-phone QA remains
unverified. The `.preview-profile` folder was deleted and is ignored.

## Exact source inventory for this build

All retrieval dates below are UTC. Full requested URLs and hashes remain in the linked metadata.

| Series/input | Provider identifier | Download date | Start |
| --- | --- | --- | --- |
| developed_stocks | [EFA](data/raw/developed_stocks.meta.json) | 2026-11-16 | 2001-08 |
| lifestrategy_growth | [VASGX](data/raw/lifestrategy_growth.meta.json) | 2026-11-16 | 1998-12 |
| target_retirement_2050 | [VFIFX](data/raw/target_retirement_2050.meta.json) | 2026-11-16 | 2006-06 |
| global_stocks_fund | [VT](data/raw/global_stocks_fund.meta.json) | 2026-11-16 | 2008-06 |
| euro_hicp | [CP0000EZ19M086NEST](data/raw/euro_hicp.meta.json) | 2026-11-16 | 1998-12 |
| aapl | [AAPL](data/raw/aapl.meta.json) | 2026-11-16 | 1998-12 |
| amzn | [AMZN](data/raw/amzn.meta.json) | 2026-11-16 | 1998-12 |
| bp | [BP](data/raw/bp.meta.json) | 2026-11-16 | 1998-12 |
| btc | [BTC-USD](data/raw/btc.meta.json) | 2026-11-16 | 2014-09 |
| c | [C](data/raw/c.meta.json) | 2026-11-16 | 1998-12 |
| commodities | [DBC](data/raw/commodities.meta.json) | 2026-11-16 | 2006-02 |
| csco | [CSCO](data/raw/csco.meta.json) | 2026-11-16 | 1998-12 |
| em_stocks | [VEIEX](data/raw/em_stocks.meta.json) | 2026-11-16 | 1998-12 |
| eurusd | [DEXUSEU](data/raw/eurusd.meta.json) | 2026-11-16 | 1999-01 |
| gbpusd | [DEXUSUK](data/raw/gbpusd.meta.json) | 2026-11-16 | 1998-12 |
| ge | [GE](data/raw/ge.meta.json) | 2026-11-16 | 1998-12 |
| googl | [GOOGL](data/raw/googl.meta.json) | 2026-11-16 | 2004-08 |
| intc | [INTC](data/raw/intc.meta.json) | 2026-11-16 | 1998-12 |
| intl_stocks | [VGTSX](data/raw/intl_stocks_candidate.meta.json) | 2026-11-16 | 1998-12 |
| meta | [META](data/raw/meta.meta.json) | 2026-11-16 | 2012-05 |
| metals | [World Bank Pink Sheet](data/raw/metals_workbook.meta.json) | 2026-11-16 | workbook |
| msft | [MSFT](data/raw/msft.meta.json) | 2026-11-16 | 1998-12 |
| nasdaq100 | [^NDX](data/raw/nasdaq100_price_only.meta.json) | 2026-11-16 | 1998-12 |
| nok | [NOK](data/raw/nok.meta.json) | 2026-11-16 | 1998-12 |
| reits | [VGSIX](data/raw/reits.meta.json) | 2026-11-16 | 1998-12 |
| uk_gilts | [IGLT.L](data/raw/uk_gilts.meta.json) | 2026-11-16 | 2008-01 |
| uk_short_rate_candidate | [IR3TIB01GBM156N](data/raw/uk_short_rate_candidate.meta.json) | 2026-11-16 | 1998-12 |
| uk_stocks | [EWU](data/raw/uk_stocks.meta.json) | 2026-11-16 | 1998-12 |
| us_bonds | [VBMFX](data/raw/us_bonds.meta.json) | 2026-11-16 | 1998-12 |
| us_cpi | [CPIAUCNS](data/raw/us_cpi.meta.json) | 2026-11-16 | 1998-12 |
| us_intermediate_treasuries | [VFITX](data/raw/us_intermediate_treasuries.meta.json) | 2026-11-16 | 1998-12 |
| us_long_bonds | [VUSTX](data/raw/us_long_bonds.meta.json) | 2026-11-16 | 1998-12 |
| us_small | [NAESX](data/raw/us_small.meta.json) | 2026-11-16 | 1998-12 |
| us_stocks | [VFINX](data/raw/us_stocks.meta.json) | 2026-11-16 | 1998-12 |
| us_tips | [VIPSX](data/raw/us_tips.meta.json) | 2026-11-16 | 2000-06 |
| usd_short_rate | [DTB3](data/raw/usd_short_rate.meta.json) | 2026-11-16 | 1998-12 |
| xom | [XOM](data/raw/xom.meta.json) | 2026-11-16 | 1998-12 |

Derived gold/silver use the metals workbook (1998-12 onward). USD cash uses
usd_short_rate; GBP cash uses uk_short_rate_candidate plus GBPUSD and the
explicit Bank Rate proxy. Global stocks uses us_stocks and intl_stocks.
Their source dates are those of these component inputs.
