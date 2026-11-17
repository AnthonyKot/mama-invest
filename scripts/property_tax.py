"""Explicit, auditable tax-model parameters. Not a personal tax assessment."""
def discounts(bounds, factors):
    return [{'upTo': b, 'factor': f / 100} for b, f in zip(bounds, factors)]

def dutch_rules():
    old = 'https://www.tweedekamer.nl/downloads/document?id=2015D37139'
    box = 'https://zoek.officielebekendmakingen.nl/kst-32740-1-n1.html'
    bands = 'https://download.belastingdienst.nl/academie/kennisnetwerk/dl/werking_box3_2017.pdf'
    split = 'https://www.belastingdienst.nl/wps/wcm/connect/nl/box-3/content/met-welke-percentages-is-het-fictief-rendement-berekend'
    discount_sources = {
        2010: 'https://www.fairhuurvoorverhuurders.nl/files/wetgeving/6procentwoz-gedeelte-uit-kb-over-leegwaarderatio.pdf',
        2012: 'https://zoek.officielebekendmakingen.nl/stb-2011-677.html',
        2013: 'https://zoek.officielebekendmakingen.nl/stb-2012-694.html',
        2014: 'https://zoek.officielebekendmakingen.nl/stcrt-2015-16875.html',
        2023: 'https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/prive/vermogen_en_aanmerkelijk_belang/vermogen/wat_zijn_uw_bezittingen_en_schulden/uw_bezittingen/overige_onroerende_zaken/waarde_verhuurde_woning_als_overige_onroerende_zaak/tabellen_waarde_verhuurde_of_verpachte_woning/',
    }
    out = {}
    # Original wealth-mix rules, followed by the separate-category regime.
    investments = [.0539, .0538, .0559, .0528, .0569, .0553]
    savings = [.0163, .0036, .0013, .0007, .0003, -.0001]
    for year in range(1999, 2027):
        rule = {'rentRate': 0, 'saleRate': 0, 'source': box, 'valuationLag': 0,
                'note': 'No allowance; other wealth assumed to use it. Private passive ownership; no sale-gain tax.'}
        if year < 2001:
            rule.update(rentRate=.5, deductInterest=True, wealthRate=.007, source=old,
                        note='50% marginal rental-income rate is user-approved and adjustable; 0.7% net-wealth tax. Interest deducted from rental profit, not owner-occupier relief.')
        elif year <= 2016:
            rule.update(wealthRate=.012, averageBase=year<=2010,
                        note='4% deemed return taxed at 30%; mortgage debt reduces the base. No allowance.')
        elif year <= 2022:
            index = year-2017
            first, second = {2017:(75000,975000),2018:(70800,978000),2019:(71650,989736),
                             2020:(72797,1005572),2021:(50000,950000),2022:(50650,962350)}[year]
            rule.update(mode='bands', rate=.3 if year<2021 else .31, source=bands,
                        bands=[{'upTo':first,'return':.67*savings[index]+.33*investments[index]},
                               {'upTo':second,'return':.21*savings[index]+.79*investments[index]},
                               {'upTo':1e30,'return':investments[index]}],
                        note='Original annual deemed wealth-mix method; assumes no other taxable wealth above the already-used allowance. Retrospective relief is not modelled.')
            rule['bracketSource']='https://open.overheid.nl/documenten/ronl-04947996-d528-4eac-afb0-6aa936dc577e/pdf' if year<=2021 else 'https://www.belastingdienst.nl/wps/wcm/connect/fisin/fisin2022/belastingberekening'
            rule['returnSource']=split
        else:
            a,c,d,t={2023:(.0617,.0092,.0246,.32),2024:(.0604,.0144,.0261,.36),
                     2025:(.0588,.0137,.027,.36),2026:(.06,.0128,.027,.36)}[year]
            rule.update(mode='split',assetReturn=a,cashReturn=c,debtReturn=d,rate=t,source=split,
                        note='Separate deemed returns on home, savings and debt. Actual-return counterevidence is not modelled because the rest of the owner\'s wealth is unspecified.')
            if year==2025:
                rule['rateSource']='https://zoek.officielebekendmakingen.nl/stcrt-2026-3708.html'
            if year==2026:
                rule['rateSource']='https://www.belastingdienst.nl/wps/wcm/connect/nl/box-3/content/berekening-box-3-inkomen-2026'
                rule['approximation']='2026 cash/debt percentages are provisional; asset return and tax rate are enacted.'
        if year>=2010:
            rule['valuationLag']=1
            if year<=2011:
                rule['rentalDiscount']=discounts([1,1.5,2,2.5,3,3.5,4,1e30],[60,64,68,72,75,79,82,85]); ref=2010
            elif year==2012:
                rule['rentalDiscount']=discounts([1,1.5,2,2.5,3,3.5,4,5,1e30],[50,54,58,63,67,72,76,81,85]); ref=2012
            elif year==2013:
                rule['rentalDiscount']=discounts([1,1.5,2,2.5,3,3.5,4,5,1e30],[50,53,56,59,62,66,69,73,78]); ref=2013
            elif year<=2022:
                rule['rentalDiscount']=discounts([1,2,3,4,5,6,7,1e30],[45,51,56,62,67,73,78,85]); ref=2014
            else:
                rule['rentalDiscount']=discounts([1,2,3,4,5,1e30],[73,79,84,90,95,100]); ref=2023
            rule['valuationSource']=discount_sources[ref]
            rule['valuationNote']='Prior-January indexed market value proxies the unavailable individual WOZ valuation; protected, non-temporary tenancy assumed.'
        else:
            rule['valuationNote']='Indexed vacant-market value proxies historical tenanted market valuation; no retrospective rental discount.'
        rule['debtThreshold']=0
        rule['debtNote']='Debt threshold assumed consumed by other debt; full model mortgage deducted.'
        rule['transferRate']=.06 if year<=2010 else .02 if year<=2020 else .08 if year<=2022 or year==2026 else .104
        rule['transferSource']='https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/prive/woning/overdrachtsbelasting/tarieven_overdrachtsbelasting/het_tarief_van_de_overdrachtbelasting'
        if year<=2011:
            rule['transferSource']='https://zoek.officielebekendmakingen.nl/kst-33287-3.html'
        rule['saleSource']='https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/prive/werk_en_inkomen/online-inkomen-verdienen/ik-verhuur-mijn-huis/verhuur-2e-woning'
        if year==2011: rule['transferNote']='6% before 15 June; 2% thereafter. Neither purchase scenario is in this transition year.'
        out[str(year)]=rule
    return out

def foreign_rules(country):
    if country=='us':
        rule={'rentRate':.24,'deductInterest':True,'saleRate':.15,'deductPurchaseCosts':True,
              'source':'https://www.irs.gov/publications/p527',
              'saleSource':'https://www.irs.gov/taxtopics/tc409',
              'note':'Simplified US resident: assumed 24% effective tax on positive rent after expenses and interest; 15% sale-gain tax. No depreciation deduction or recapture, passive-loss relief, state taxes or NIIT. These effective rates are assumptions applied throughout, not a reconstruction of tax returns.',
              'savingsIncomeRate':.24}
    else:
        rule={'rentRate':.20,'interestCredit':.20,'saleRate':.24,'saleAllowance':3000,'deductPurchaseCosts':True,
              'source':'https://www.gov.uk/guidance/income-tax-when-you-rent-out-a-property-working-out-your-rental-income',
              'saleSource':'https://www.gov.uk/guidance/capital-gains-tax-rates-and-allowances',
              'note':'Simplified UK resident: assumed 20% effective net-rent tax and capped 20% interest credit; 24% sale-gain tax above GBP3,000, measured from original purchase costs, without nonresident rebasing. Fixed effective rates applied throughout, not historical or future statutory tax schedules.',
              'savingsIncomeRate':.20}
    return {str(y):dict(rule) for y in range(1999,2027)}
