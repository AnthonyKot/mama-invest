# Property calculation audit — 16 November 2026

Historical audit snapshot: subsequent upkeep controls and local-resident tax
assumptions supersede the defaults and figures below. See PROPERTY-README.md
for the current settings and the separate forecast methodology.

Scope: the one-home engine, rent assembler, dated portfolio contributions,
inflation/FX conversion, and the January 1999 results. This is not a complete
independent validation of every historical price, tax rule or rental anchor.

## Confirmed and corrected error

Dutch rent was calculated as CBS house prices divided by OECD price-to-rent.
OECD defines its ratio using its own nominal HPI. Combining different numerators
introduces house-index differences into rent growth. The assembler now recovers
rent from OECD HPI / OECD price-to-rent, while retaining CBS for Dutch home
valuation. Starting yields are anchored consistently to the chosen home-price
path. UK and US already used matching OECD indices and are unchanged.

Definition: https://www.oecd.org/en/data/indicators/housing-prices.html

The Dutch 1999 default changes from EUR112,211 paid in / EUR396,076 final /
7.81% annual return to EUR112,011 / EUR397,776 / 7.85%. This small correction
does not explain the high UK result.

## Rent and cash accounting

UK gross rent grows from approximately GBP482/month at purchase to GBP772/month
at January 2019. Rent is nominal in the local cash ledger; displayed cash flows
are converted at their own dates and adjusted once to the common inflation base.

For the UK default, nominal totals reconcile as follows (rounded pounds):

| Item | GBP |
| --- | ---: |
| Personal contributions | 22,322 |
| Gross rental receipts | 152,247 |
| Running costs | 53,286 |
| Rental tax | 12,210 |
| Mortgage interest | 37,911 |
| Mortgage principal repaid | 53,726 |
| Purchase costs | 2,686 |
| Original home price | 67,157 |
| Final home price before sale costs/tax | 210,517 |

Principal builds equity; it is not deducted again as an expense on sale. Rent
used to pay the mortgage is not added again to terminal wealth. Mortgage
interest is included. Matched investors receive only the landlord's personal
contributions on the same dates, not the rent paid by tenants.

## Material assumptions, not demonstrated arithmetic errors

- UK starting yield is inferred at 8.61%, anchored to a reported 5% gross
  rental yield in January 2015. This combines a rental-property sample for
  England/Wales with UK national home prices and an aggregate rent index.
  It is not an observed rent for the GBP67,157 home.
- The five-year mortgage-rate proxy is fixed for twenty years by assumption.
- Foreign taxes use simplified modern rules throughout history; the portfolio
  uses the specified 23% nominal USD gain tax. These do not reconstruct one
  taxpayer's actual historical liabilities.
- The landlord's worst measure excludes savings and sale-gain tax, whereas
  terminal wealth includes both. It is the specified equity metric, not a
  like-for-like measure of total liquidated wealth against the investor.
- The stock/bond portfolio steers new contributions toward target weights but
  does not sell to rebalance; '50/50' is a target, not a constant allocation.

UK sensitivity, changing only starting rent and retaining its growth path:

| Starting gross yield | Personal contributions, real EUR | Final wealth, real EUR | Annual real return |
| --- | ---: | ---: | ---: |
| 8.61% (existing anchor) | 58,136 | 301,143 | 8.98% |
| 6% | 103,991 | 299,148 | 6.70% |
| 5% | 123,395 | 299,148 | 5.85% |

These alternatives are sensitivity cases, not claims about historical rent.
Final wealth barely changes because lower rent is compensated by more personal
cash; the return falls because that larger cash commitment is counted.

## Verification

42 Node tests and 10 Python tests passed. Added checks for mismatched price
indices, preservation of the rental anchor, nominal rent versus displayed
inflation adjustment, and monthly/terminal cash conservation on all real
country/start cases. Rebuilt both browser and JSON property datasets offline.

Commands:

```
python -B scripts/assemble_property.py
node --test --test-isolation=none tests/engine.cjs tests/data.cjs tests/property.cjs
python -B -m unittest discover -s tests -p "test_*.py"
```
