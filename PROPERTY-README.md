# Landlord versus investor: source review

Open `index.html` and scroll to **Landlord or investor?** The original portfolio
comparison remains above it. This implements the one-home model in Sections 12
and 13, using the referenced property-data and tax requirements in Section 11.
There are no property slices, property presets or property rolling ranges.

This is a reviewable historical model, not an exact reconstruction of a particular
landlord's tax returns. The visible assumptions and limitations below matter to
the ranking. A small difference is not a reliable investment conclusion.

## What is compared

The page now defaults to separate operating costs: annual upkeep of 1% of
current model home value (charged monthly), plus 20% of gross rent for other
costs such as vacancy, management, insurance and local charges. These are
adjustable planning assumptions, not verified historical averages. Upkeep is
treated as spent on maintenance/replacements, not accumulated in another
savings account. Both components enter monthly shortfalls and the return.
The tax model treats them as operating expenses where deductions apply; it
does not model capital improvements or individual emergency bills.

Selecting **Original combined allowance** restores the previous 35% of rent
including upkeep, with no separate upkeep deduction. The pure engine retains
that legacy default for existing callers; the page passes its selected settings.
The earlier figures in PROPERTY-AUDIT.md describe that legacy configuration.

The landlord buys at the end of January 1999, July 2006 or July 2007. The first
mortgage payment and rent arrive in the next month. There are 240 mortgage
payments, ending January 2019, July 2026 or July 2027. Historical scoreboards stop
at observed coverage or the mortgage anniversary. A separate scenario panel can
continue ownership through December 2028, including rent and costs after payoff.
The final horizon table shows 3, 5, 10, 15 and 20 years plus the chosen endpoint.

The landlord pays the deposit and purchase costs immediately. Each month the
owner supplies any gap between mortgage payment and rent after running costs
and tax. Surplus rent stays in a local savings pot; it does not buy more property
or pay the mortgage early. The same payments, rounded to local cents then USD
cents, go into the comparison portfolio on exactly the same dates. A zero
shortfall means zero portfolio contribution. The investor never receives the
landlord's rental income in addition to these payments.

Each final multiplier is final displayed proceeds divided by the sum of displayed
payments. Payments are converted at their own dates; final proceeds at sale.
EUR purchasing power uses euro-area HICP and USD uses US CPI. The shared price
level is the main dataset's latest month, including its labelled HICP estimate.
The annual return solves a money-weighted cash-flow equation using monthly dates
and elapsed months / 12. A nonpositive terminal amount, or a schedule with no
finite meaningful solution, is labelled rather than assigned a made-up return.

The landlord's final amount includes sale proceeds after mortgage repayment,
selling costs and local sale tax, plus the savings pot. The property comparison
now uses simplified local-resident investment taxes: US 15% and UK 24% on
positive nominal local-currency gains (UK GBP3,000 allowance); Dutch securities
use the year-specific wealth-tax model, accrued monthly, without a rental
valuation discount. US/UK distribution taxes are not separately reconstructed.
The main, non-property investment graph retains its original 23% USD gain model. The investor's worst ratio uses after-tax
value. The landlord's worst ratio uses home equity minus selling costs, excluding
sale-gain tax and savings, as Section 13 specifies. It often occurs immediately
after buying because transaction costs consume part of the deposit.

The detailed waterfall reconciles payments, price movement, rent, expenses,
interest, taxes and savings. A separately named conversion effect reconciles
currency/inflation changes on financed cash flows. Rent used to pay down the
mortgage is not added to the final result twice.

## Data and endpoints

Raw snapshots and their SHA-256 hashes are in `data/raw/property`. Compiled inputs
are `data/property.json` and its offline browser equivalent `data/property.js`.
The source metadata is embedded in the compiled file. No credentials are needed.

| Country | Purchase-price level | Price/rent path and mortgage | Last usable month |
| --- | --- | --- | --- |
| Netherlands | [CBS 85773NED](https://www.cbs.nl/nl-nl/cijfers/detail/85773NED): January 1999 EUR130,266; July 2007 EUR249,941 | CBS existing-home index; OECD price/rent ratio. [CBS early mortgage series](https://www.cbs.nl/nl-nl/cijfers/detail/37276mfo) for 1999; ECB MIR.M.NL.B.A2C.P.R.A.2250.EUR.N for 2007 (over ten years initial fixation). | December 2025, limited by OECD ratio |
| United Kingdom | HM Land Registry UK HPI API: January 1999 GBP67,157; July 2007 GBP173,817 | OECD national HPI and price/rent ratio. Bank of England IUMBV42, five-year fixed quoted mortgage at 75% LTV. | June 2026 |
| United States | [Census/HUD MSPUS via FRED](https://fred.stlouisfed.org/series/MSPUS), purchase-quarter median **new** home price | OECD national HPI and price/rent ratio. [Freddie Mac MORTGAGE30US](https://fred.stlouisfed.org/series/MORTGAGE30US), average of weekly observations in purchase month. | December 2024, limited by OECD rent/ratio coverage |
| Poland | Not verified for the required typical-home purchase-month level | OECD national HPI starts in 2005. A suitable purchase-month mortgage input also remains unverified. | Unavailable in both displayed cases; no 1999 backfill |

[OECD analytical housing indicators](https://www.oecd.org/en/data/indicators/housing-prices.html)
provide `HPI` and `HPI_RPI`, quarterly, seasonally adjusted, 2015=100. Quarterly
observations are assigned to quarter-end and interpolated geometrically between
adjacent quarters. This is a retrospective monthly approximation, not observed
monthly trading prices. The assembler rejects missing quarters and never
extrapolates past the last common price/rent observation. Dutch CBS prices remain
monthly. The derived rent index is OECD nominal HPI / OECD price-to-rent ratio
index. Both operands must come from OECD: substituting CBS prices into this
division introduces differences between the house-price series into Dutch rent.

### Rent anchors

Gross yield at month m is anchor yield times rent-index growth from the anchor
to m, divided by model house-price-index growth over the same interval. When
both price series are OECD, this simplifies to anchor yield times price/rent
index at the anchor divided by price/rent index at m.
One home's rent starts from its purchase price
times that yield and subsequently follows the derived rent index. Price/rent
indices alone do not identify an absolute rental yield.

| Country | Anchor | Citation and representativeness |
| --- | --- | --- |
| Netherlands | 5.56%, Q1 2024, assigned March | [Global Property Guide researcher's published article listing](https://muckrack.com/kateryna-shubina/articles) records the Q1 2024 figure. City listing sample, not a census of all Dutch rented homes. |
| UK | 5.00%, January 2015 | [February 2015 rental-report review](https://www.propertychecklists.co.uk/downloads/20150224/download) reports LSL/Acadata's January yield for England and Wales; proxy for UK. |
| US | 6.10%, August 2024 | [Global Property Guide US analysis](https://www.globalpropertyguide.com/north-america/united-states/price-history) records the August 2024 figure. City listing sample; does not exactly match the national new-home purchase-price population. |

The checked paths stay within the spec's 2-10% gross-yield bounds. These anchors
are estimates of rental economics, not proof that an average home could be let
at that yield. Their mismatch with purchase-price populations is a material
limitation, especially for the high apparent returns of the 1999 cases.

### Explicitly approved rate proxies

The user approved using cited mortgage-rate proxies and holding them fixed for
20 years. Dutch January 1999 is an average newly registered mortgage, not an
observed 20-year fixed rental mortgage. The US source is a 30-year fixed loan,
amortised over 20 years here. The UK source fixes five years, but the model holds
that rate for all 20. Quoted owner-occupier and 75% LTV rates need not have been
available to this landlord at 80% LTV. These are not claims of actual loan offers.

Savings use EUR three-month Euribor, UK short rates and US Treasury-bill discount
rates as deposit-rate proxies, divided by 12 for monthly savings interest. This
property savings convention differs from the original baseline's detailed bill
yield conversion. Negative observed euro rates are retained; they do not change
the mortgage rate. Retail bank interest may have differed. UK missing-rate
approximations come from the main dataset and remain documented there.

## Local tax models

Every annual row and source is in [property-tax-rules.json](data/property-tax-rules.json),
generated by `scripts/property_tax.py`. Each country now assumes its own local
resident for both landlord and investor. Rates are adjustable. US/UK effective
rates are simplified assumptions across all years, not historical tax schedules.
No inflation adjustment is made to local taxable nominal gains. Personal wealth
allowances are assumed already consumed by other wealth. No ISA or pension wrapper
is modelled. The older nonresident assumptions in PROPERTY-AUDIT.md are superseded.

### Netherlands

- 1999-2000: 0.7% net-wealth tax; **50% marginal tax on positive net rental income
  after interest**, explicitly approved by the user and adjustable. No losses are
  carried into other income. [Historical government account](https://www.tweedekamer.nl/downloads/document?id=2015D37139).
- 2001-2016: 4% deemed return taxed at 30% (1.2% of net taxable wealth).
  [Government account](https://zoek.officielebekendmakingen.nl/kst-32740-1-n1.html).
  Before 2011 the model averages opening and closing wealth; from 2011 it uses
  the opening observation. [Valuation-date change](https://zoek.officielebekendmakingen.nl/kst-32130-3.pdf).
- 2017-2022: original wealth-mix bands with each year's returns, tax rates and
  boundaries. [2017 method](https://download.belastingdienst.nl/academie/kennisnetwerk/dl/werking_box3_2017.pdf),
  [2018-2021 parameters](https://open.overheid.nl/documenten/ronl-04947996-d528-4eac-afb0-6aa936dc577e/pdf),
  [2022 parameters](https://www.belastingdienst.nl/wps/wcm/connect/fisin/fisin2022/belastingberekening).
- From 2023: separate deemed returns for property, debt and savings, with 32%
  tax in 2023 and 36% from 2024. The 2025 deposit/debt rates are the
  [final enacted values](https://zoek.officielebekendmakingen.nl/stcrt-2026-3708.html).
  [2026 cash/debt percentages remain provisional](https://www.belastingdienst.nl/wps/wcm/connect/nl/box-3/content/berekening-box-3-inkomen-2026).
  No announced future regime is applied.
- From 2010: year-specific rented-home valuation discounts. Sources for
  [2010-2011](https://www.fairhuurvoorverhuurders.nl/files/wetgeving/6procentwoz-gedeelte-uit-kb-over-leegwaarderatio.pdf),
  [2012](https://zoek.officielebekendmakingen.nl/stb-2011-677.html),
  [2013](https://zoek.officielebekendmakingen.nl/stb-2012-694.html),
  [2014-era table](https://zoek.officielebekendmakingen.nl/stcrt-2015-16875.html)
  and [2023-2026](https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/prive/vermogen_en_aanmerkelijk_belang/vermogen/wat_zijn_uw_bezittingen_en_schulden/uw_bezittingen/overige_onroerende_zaken/waarde_verhuurde_woning_als_overige_onroerende_zaak/tabellen_waarde_verhuurde_of_verpachte_woning/).

Both purchases use 6% transfer tax. Later transfer-rate metadata is retained but
does not affect either purchase. No private passive sale-gain tax is applied.
The model does not claim owner-occupier mortgage-interest relief.

**Material simplifications:** individual historical WOZ and tenanted-market
valuations do not exist for a national-average home. Indexed market value proxies
them; from 2010 the prior January is used with that year's rental discount.
Protected, non-temporary tenancy is assumed. The owner's other wealth consumes
the allowance, but is otherwise excluded from wealth bands; other debt is assumed
to consume the debt threshold. Tax is charged in December and accrued at the
final sale, prorated to observed rental months. These are annual cash-flow and
valuation approximations, not complete personal tax calculations.

The original 2017-2022 method is modelled, **not retrospective refunds**. The
[actual-return counterevidence regime](https://www.rijksoverheid.nl/themas/werk/inkomstenbelasting/box-3)
depends on the owner's wider wealth and procedural eligibility. It is not
computed here. Consequently Dutch results are not a complete implementation of
every relief under Section 11.8; the page flags this limit. The sensitivity
control scales the model's wealth taxes but is not a substitute for that relief.

### United Kingdom

Assumed 20% effective net-rent tax with a capped 20% mortgage-interest credit.
Savings interest has an assumed 20% effective tax rate. Sale gains use 24%
above a GBP3,000 allowance. Gains use original acquisition costs: there is no
nonresident April 2015 rebasing. Investments use 24% on positive nominal GBP
gains above GBP3,000, converting contributions at their own dates.

These simplified effective rates are held constant; they do not implement all
historical rate changes or the future property-income tax schedule. Stock dividends
and bond distributions are not separately taxed; this can overstate taxable
investment returns. Allowances are assumed otherwise unused. Sources:
[HMRC rental guidance](https://www.gov.uk/guidance/income-tax-when-you-rent-out-a-property-working-out-your-rental-income),
[capital gains](https://www.gov.uk/guidance/capital-gains-tax-rates-and-allowances),
[dividends](https://www.gov.uk/tax-on-dividends).

### United States

Assumed 24% effective tax on positive rental income after running costs and
mortgage interest, and 15% on positive property/investment gains. Savings interest
is taxed at an assumed 24%. Rates are adjustable and are not predictions of a
particular person's bracket. The 30% gross-rent nonresident default is removed.

Depreciation and its associated sale recapture, passive-loss offsets, state taxes,
NIIT, and separate investment dividend/bond-income taxes are not reconstructed.
The first two omissions should not be read as an option to ignore legally required
basis adjustments: this is a simplified economic comparison, not a tax return.
Sources: [IRS rental property](https://www.irs.gov/publications/p527),
[IRS capital gains](https://www.irs.gov/taxtopics/tc409).

## 2006 purchase and forward scenarios

July 2006 uses saved CBS prices, ECB long-fixed mortgage rates, US purchase-quarter
MSPUS, Freddie Mac mortgage rates and Bank of England mortgage rates. UK July 2006
purchase price is explicitly **estimated** from the verified July 2007 level scaled
by OECD HPI. The direct 2006 Land Registry request failed; no observation is fabricated.

The forecast inputs and dated primary-source links are in
[data/property-forecast.js](data/property-forecast.js). ABN AMRO supplies NL 2026/27
housing growth; Goldman Sachs supplies US 2026/27; Savills (not a bank) supplies UK
2026/27/28. NL and US 2028 repeat 2027 as an explicit model extrapolation.
J.P. Morgan's 2027 LTCMA USD matrix supplies 7.5% stock / 5.6% aggregate-bond
compound return assumptions over 10-15 years, used as illustrative annual path
rates, **not short-term 2027/28 forecasts**. Different publication horizons are
not represented as one bank's integrated economic forecast.

The module creates copies; it does not append invented history to series.json or
property.json. Missing property months through October 2026 hold house prices and
rents flat and are visibly labelled data-gap estimates. This matters especially
for the US, whose property coverage ends in December 2024. Market observations
through October 2026 are preserved. Future monthly changes are the twelfth root of
one plus the annual assumption; 2026 rates apply only to November and December.
This does not force end-2026 prices to match a full-year published forecast.
Annual-average housing forecasts are approximate path inputs, not exact year-end targets.

Reference rents and inflation grow 2% annually by assumption. FX and deposit rates
are held at their last available levels. Future tax parameters copy the 2026 model;
this deliberately does not predict or implement future tax-law changes. The mortgage
retains the original fixed rate and reaches zero after exactly 240 payments.
All historical and projected values use **October 2026 purchasing power**: switching
horizons or stress inflation does not rebase old cash contributions.

Pessimistic and severe scenarios are model stress tests, not bank probabilities:

| Scenario/year | House prices | US stocks | US bonds | Rent | Inflation |
| --- | ---: | ---: | ---: | ---: | ---: |
| Pessimistic 2027 | -10% | -20% | -5% | -5% | 4% |
| Pessimistic 2028 | -5% | 0% | 2% | 0% | 3% |
| Severe 2027 | -20% | -40% | -10% | -10% | 5% |
| Severe 2028 | -10% | -10% | 0% | -5% | 4% |

Stress changes start January 2027, so 2026 results are identical across scenarios.
The 50/50 or 60/40 investor receives the same initial and monthly contributions as
its landlord in each scenario. Weights are targets steered by new contributions,
not constantly rebalanced weights. The held-cash scale reference accumulates the
same payments in local currency without interest; it is shown before cash taxes.

The last table independently simulates a hypothetical sale at each horizon, so it
includes the appropriate outstanding loan and terminal accrued tax. Observed-only
mode does not fill future cells. Scenario cells beyond source coverage are labelled
as estimates. The endpoint column can extend past mortgage payoff; it is not always
exactly twenty years.

## Unavailable inputs and verification limits

- Poland is visibly unavailable for the reasons above. Its fetched FX/deposit
  candidates are evidence only, not spliced into a fabricated property result.
- The candidate Bundesbank `BBK01/WU046A` REXP endpoint returned HTTP 404.
  No verified euro-government-bond total-return history from 1998-12 was compiled.
  The euro-asset 50/50 is therefore unavailable, as Section 13 permits. Displaying
  the US portfolio in euros is not presented as a euro-asset portfolio.
- Real-browser phone verification is still incomplete. Chrome previously failed;
  an installed Edge attempt also exited without a usable debugging endpoint.
  Its temporary profile was removed. CSS keeps tables inside scrolling containers
  and stacks controls/cards at phone widths, but visual QA is not claimed.

## Rebuild and tests

```powershell
python -B scripts/fetch-property-data.py
python -B scripts/assemble_property.py
node --test --test-isolation=none tests/engine.cjs tests/data.cjs tests/property.cjs tests/property-forecast.cjs tests/property-ui.cjs
python -B -m unittest discover -s tests -p "test_*.py"
```

The downloader records unavailable candidates without changing the working site.
`--only` and `--refresh` are supported. `assemble_property.py` is offline and
checks hashes, coverage, interpolation and gross yields. The normal
`build-data.py --offline` also rebuilds property when its snapshots are present.
Property sanity checks are saved in `data/property-sanity-checks.txt`.
