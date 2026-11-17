"""Build the one-home comparison from checked snapshots; no network or forecasts."""
import csv
import datetime as dt
import hashlib
import io
import json
import math
from pathlib import Path
from property_tax import dutch_rules, foreign_rules

ROOT=Path(__file__).resolve().parents[1]
RAW=ROOT/'data/raw/property'

def month_id(m):
    y,n=map(int,m.split('-')); return y*12+n-1

def month_name(n):
    return f'{n//12:04d}-{n%12+1:02d}'

def interpolate(points):
    """Geometric interpolation between quarterly points; no extrapolation."""
    keys=sorted(points);out=dict(points)
    for a,b in zip(keys,keys[1:]):
        distance=month_id(b)-month_id(a)
        if distance!=3: raise ValueError(f'Quarterly gap {a} to {b}')
        if min(points[a],points[b])<=0: raise ValueError('Nonpositive property index')
        for i in range(1,distance):
            out[month_name(month_id(a)+i)]=points[a]*(points[b]/points[a])**(i/distance)
    return dict(sorted(out.items()))

def rental_path(price, oecd_price, ratios, anchor):
    """Recover OECD rents using its own numerator, then anchor to model prices.

    Mixing a different house-price index into HPI / (HPI/rent) creates
    spurious rent movements. Yield must also use the model's price path so
    that a home bought in any month reaches the stated yield at the anchor.
    """
    rent={m:oecd_price[m]/ratios[m] for m in price}
    a=anchor['month']
    yields={m:anchor['yield']*(rent[m]/rent[a])/(price[m]/price[a])
            for m in price if m>='1999-01'}
    return rent,yields

def assemble():
    base=json.loads((ROOT/'data/series.json').read_text(encoding='utf-8'))
    sources={}
    def read(key,extension='csv'):
        body=(RAW/f'{key}.{extension}').read_bytes()
        meta=json.loads((RAW/f'{key}.meta.json').read_text(encoding='utf-8'))
        if hashlib.sha256(body).hexdigest()!=meta['sha256']:raise ValueError('Checksum mismatch: '+key)
        sources[key]=meta
        return json.loads(body) if extension=='json' else list(csv.DictReader(io.StringIO(body.decode('utf-8-sig'))))
    oecd=read('oecd_housing')
    def quarterly(area,measure):
        result={}
        for row in oecd:
            if row['REF_AREA']==area and row['MEASURE']==measure and row['FREQ']=='Q' and row['UNIT_MEASURE']=='IX':
                year,q=row['TIME_PERIOD'].split('-Q');month=f'{year}-{int(q)*3:02d}'
                if month<=base['end']:
                    value=float(row['OBS_VALUE'])
                    if month in result and abs(result[month]-value)>1e-10:raise ValueError('Ambiguous OECD series')
                    result[month]=value
        return interpolate(result)
    def fred(key,mean=False):
        grouped={}
        for row in read(key):
            day,value=list(row.values())[:2]
            if value in ('','.'):continue
            month=day[:7];grouped.setdefault(month,[]).append(float(value))
        return {m:sum(v)/len(v) if mean else v[-1] for m,v in grouped.items()}
    def ecb(key):return {r['TIME_PERIOD']:float(r['OBS_VALUE']) for r in read(key) if r['OBS_VALUE']}
    nl=read('nl_prices','json')['value']
    nlprices={r['Perioden'][:4]+'-'+r['Perioden'][-2:]:r['PrijsindexVerkoopprijzen_1'] for r in nl if 'MM' in r['Perioden']}
    nllevels={r['Perioden'][:4]+'-'+r['Perioden'][-2:]:r['GemiddeldeVerkoopprijs_7'] for r in nl if 'MM' in r['Perioden']}
    early=read('nl_mortgage_early','json')['value']
    nlrates={r['Perioden'][:4]+'-'+r['Perioden'][-2:]:r['GemiddeldeHypotheekrente_1'] for r in early if 'MM' in r['Perioden']}
    nlrates.update(ecb('nl_mortgage_long_fixed'))
    ukrates={dt.datetime.strptime(r['DATE'],'%d %b %Y').strftime('%Y-%m'):float(r['IUMBV42']) for r in read('uk_mortgage_5y') if r['IUMBV42'] not in ('','..')}
    usrates=fred('us_mortgage_30y',True);uslevels=fred('us_home_level')
    eurdeposits={m:v/100 for m,v in ecb('euro_deposit').items()}
    uklevels={s:read('uk_purchase_'+s[:4],'json')['result']['primaryTopic']['averagePrice'] for s in ['1999-01','2007-07']}
    uk_price=quarterly('GBR','HPI')
    # The 2006 level endpoint is unavailable in this environment. Keep the
    # estimate explicit, reproducible and separate from observed purchase levels.
    uklevels['2006-07']=uklevels['2007-07']*uk_price['2006-07']/uk_price['2007-07']
    definitions={
      'nl':{'name':'Netherlands','area':'NLD','currency':'EUR','levels':nllevels,'rates':nlrates,'price':nlprices,
        'anchor':{'month':'2024-03','yield':.0556,'source':'https://muckrack.com/kateryna-shubina/articles','note':'Global Property Guide researcher\'s published Q1 2024 Dutch gross yield, 5.56%; city-listing sample, not a national rent census.'},
        'rateNote':'1999: CBS average newly registered mortgage, not long-fixed specifically. 2006/2007: ECB new mortgages fixed for over 10 years. Held fixed for 20 years by assumption.',
        'priceNote':'CBS national average transaction price in the purchase month, then CBS existing-home price index.',
        'taxRules':dutch_rules(),'deposit':eurdeposits,'fx':base['macro']['eurusd']},
      'uk':{'name':'United Kingdom','area':'GBR','currency':'GBP','levels':uklevels,'rates':ukrates,'price':uk_price,
        'anchor':{'month':'2015-01','yield':.05,'source':'https://www.propertychecklists.co.uk/downloads/20150224/download','note':'LSL/Acadata January 2015 gross yield, England and Wales, 5%; geographic proxy for UK.'},
        'rateNote':'Bank of England five-year fixed, 75% LTV quoted rate; used at the model LTV and fixed for 20 years by assumption.',
        'priceNote':'HM Land Registry UK purchase-month average, then OECD national HPI. Before 2005 UK HPI observations include quarterly components.',
        'taxRules':foreign_rules('uk'),'deposit':{m:v/100 for m,v in base['macro']['uk_short_rate_candidate'].items()},'fx':base['macro']['gbpusd']},
      'us':{'name':'United States','area':'USA','currency':'USD','levels':uslevels,'rates':usrates,'price':quarterly('USA','HPI'),
        'anchor':{'month':'2024-08','yield':.061,'source':'https://www.globalpropertyguide.com/north-america/united-states/price-history','note':'Global Property Guide August 2024 gross yield, 6.10%; city-listing sample.'},
        'rateNote':'Freddie Mac 30-year fixed mortgage survey, average of purchase-month weeks; amortised over 20 years here. Owner-occupier rate proxies rental lending.',
        'priceNote':'Census/HUD median NEW-home sale price in the purchase quarter (not an existing-rental-home median), then OECD national HPI.',
        'taxRules':foreign_rules('us'),'deposit':{m:v/100 for m,v in base['macro']['usd_short_rate'].items()},'fx':{m:1 for m in base['macro']['us_cpi']}},
    }
    out={'schema':1,'builtAt':dt.datetime.now(dt.timezone.utc).isoformat(),'countries':{},'sources':sources,
         'unavailable':{'pl':'Poland: national price index starts in 2005, so no 1999 case. A national typical-home price level and suitable purchase-month mortgage rate for 2007 have not been verified; no result is invented.',
                        'euroInvestor':'Euro 50/50 unavailable: the candidate Bundesbank REXP endpoint returned HTTP 404; no verified euro government bond total-return history from 1998-12 is compiled.'},
         'assumptions':['Mortgage-rate proxies explicitly approved by the user; each is held fixed for the full 20 years.',
             'Dutch 1999-2000 marginal rent-tax rate defaults to the user-approved 50%.',
             'Quarterly indices are assigned to quarter-end and geometrically interpolated. No end-of-series forecasts or backfills.',
             'Monthly cash payments are rounded to local cents, then USD cents identically for both sides.',
             'Each country row assumes a local resident. US/UK use simplified effective resident tax rates; savings use local short-rate proxies.',
             'Historical Dutch tax model uses individual-property valuation proxies and excludes retrospective whole-wealth tax relief. See the year-by-year table.',
             'Annual wealth tax is settled in December, prorated for rental months; final sale includes accrued current-year tax.']}
    for key,c in definitions.items():
        ratios=quarterly(c['area'],'HPI_RPI')
        anchor=c['anchor'];oecd_price=quarterly(c['area'],'HPI')
        common=set(c['price'])&set(oecd_price)&set(ratios)&set(c['fx'])&set(c['deposit'])
        end=min(max(common),base['end']);start=max(min(common),'1998-12')
        price={m:c['price'][m] for m in sorted(common) if start<=m<=end}
        rent,yields=rental_path(price,oecd_price,ratios,anchor)
        if not all(.02<=v<=.10 for v in yields.values()):raise ValueError(key+' gross yield outside 2-10%; review anchor, do not clip')
        cases={}
        for s in ['1999-01','2006-07','2007-07']:
            if s not in price or s not in c['levels'] or s not in c['rates']:continue
            cases[s]={'price':c['levels'][s],'rate':c['rates'][s]/100,'grossYield':yields[s],
                      'purchaseCost':.06 if key=='nl' else .04}
            if key=='uk' and s=='2006-07':
                cases[s]['priceEstimated']=True
                cases[s]['priceNote']='Estimated July 2006 level: verified July 2007 UK price scaled by the OECD HPI change. Not an observed purchase-month average; the Land Registry 2006 endpoint could not be fetched.'
        for m in range(month_id(start),month_id(end)+1):
            if month_name(m) not in price:raise ValueError(key+' unapproved monthly gap '+month_name(m))
        out['countries'][key]={'name':c['name'],'currency':c['currency'],'start':start,'end':end,'cases':cases,
            'priceIndex':price,'rentIndex':rent,'usdPerLocal':c['fx'],'depositRate':c['deposit'],
            'taxRules':c['taxRules'],'yieldAnchor':anchor,'rateNote':c['rateNote'],'priceNote':c['priceNote'],
            'yieldRange':[min(yields.values()),max(yields.values())], 'interpolated':True}
    checks=[]
    for key,a,b in [('us','2007-03','2011-03'),('nl','2008-01','2013-01'),('uk','2008-03','2008-12')]:
        p=out['countries'][key]['priceIndex']
        if not p[b]<p[a]:raise ValueError('Property price sanity failed '+key)
        checks.append(f'PASS {key}: local house-price index falls from {a} to {b}.')
    for key,c in out['countries'].items():
        checks.append(f'PASS {key}: gross yields {c["yieldRange"][0]:.2%} to {c["yieldRange"][1]:.2%}; data through {c["end"]}.')
    encoded=json.dumps(out,ensure_ascii=False,separators=(',',':'))
    (ROOT/'data/property.json').write_text(encoded+'\n',encoding='utf-8')
    (ROOT/'data/property.js').write_text('globalThis.MAMA_PROPERTY_DATA='+encoded+';\n',encoding='utf-8')
    (ROOT/'data/property-sanity-checks.txt').write_text('\n'.join(checks)+'\n',encoding='utf-8')
    (ROOT/'data/property-tax-rules.json').write_text(json.dumps({k:v['taxRules'] for k,v in out['countries'].items()},indent=2)+'\n',encoding='utf-8')
    print('\n'.join(checks))

if __name__=='__main__':assemble()
