"""Offline conversion of verified source snapshots; never makes network calls."""
import calendar
import csv
import datetime as dt
import hashlib
import json
import math
from pathlib import Path
import re
import xml.etree.ElementTree as ET
import zipfile

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / 'data/raw'
END = (dt.date.today().replace(day=1) - dt.timedelta(days=1)).strftime('%Y-%m')
LABELS = {
    'us_stocks': 'US stocks', 'uk_stocks': 'UK stocks', 'us_bonds': 'US bonds',
    'us_intermediate_treasuries': 'Intermediate US Treasuries', 'us_long_bonds': 'Long US Treasuries',
    'us_small': 'Small US companies', 'intl_stocks': 'Stocks outside the US',
    'em_stocks': 'Emerging-market stocks', 'us_tips': 'Inflation-linked US Treasuries',
    'reits': 'US property companies', 'commodities': 'Commodities', 'uk_gilts': 'UK government bonds',
    'nasdaq100': 'Technology-heavy Nasdaq-100 (price only)', 'btc': 'Bitcoin',
    'gold': 'Gold', 'silver': 'Silver', 'global_stocks': 'Global stocks (50/50 proxy)',
    'usd_cash': 'Dollar deposits', 'gbp_cash': 'Pound deposits',
    'aapl': 'Apple', 'amzn': 'Amazon', 'googl': 'Alphabet', 'meta': 'Facebook / Meta',
    'msft': 'Microsoft', 'csco': 'Cisco', 'intc': 'Intel', 'nok': 'Nokia',
    'ge': 'General Electric', 'c': 'Citigroup', 'xom': 'Exxon Mobil', 'bp': 'BP',
    'lifestrategy_growth': 'Vanguard LifeStrategy Growth (VASGX)',
    'target_retirement_2050': 'Vanguard Target Retirement 2050 (VFIFX)',
    'global_stocks_fund': 'Vanguard Total World Stock (VT)',
    'developed_stocks': 'Developed markets outside North America (EFA)',
}


def months(start, end=END):
    y, m = map(int, start.split('-'))
    out = []
    while f'{y:04d}-{m:02d}' <= end:
        out.append(f'{y:04d}-{m:02d}')
        y, m = (y + 1, 1) if m == 12 else (y, m + 1)
    return out


def checked_source(key, suffix):
    p = RAW / f'{key}.{suffix}'
    meta = json.loads((RAW / f'{key}.meta.json').read_text(encoding='utf-8'))
    body = p.read_bytes()
    if hashlib.sha256(body).hexdigest() != meta['sha256']:
        raise ValueError(f'Snapshot checksum mismatch: {key}')
    if meta['requested_end'] != END:
        raise ValueError(f'Snapshot endpoint mismatch: {key}')
    return body, meta


def fred(key):
    body, meta = checked_source(key, 'csv')
    rows = csv.reader(body.decode('utf-8-sig').splitlines())
    next(rows)
    values = {}
    for day, value in sorted(rows):
        if '1998-12' <= day[:7] <= END and value not in ('', '.'):
            values[day[:7]] = float(value)
    return values, meta


def patch_cpi(values):
    """Only the explicitly approved, bracketed October 2025 gap is eligible."""
    out = dict(values)
    changes = []
    if '2025-10' not in out:
        a, b = out['2025-09'], out['2025-11']
        if not all(math.isfinite(x) and x > 0 for x in (a, b)):
            raise ValueError('CPI interpolation requires positive finite neighbours')
        out['2025-10'] = math.sqrt(a * b)
        changes.append({'series': 'us_cpi', 'month': '2025-10', 'value': out['2025-10'],
                        'method': 'Geometric mean of observed September and November CPI; user-approved estimate',
                        'inputs': {'2025-09': a, '2025-11': b},
                        'source': 'https://www.bls.gov/cpi/factsheets/approximating-missing-data.htm'})
    return out, changes


def patch_uk_rate(values):
    out = dict(values)
    changes = []
    for month in months('2026-02', '2026-10'):
        if month not in out:
            out[month] = 3.75
            changes.append({'series': 'uk_short_rate', 'month': month, 'value': 3.75,
                            'method': 'Bank Rate proxy for missing 3-month interbank/deposit rate; not an observed deposit rate',
                            'source': 'https://www.bankofengland.co.uk/boeapps/database/Bank-Rate.asp',
                            'verified_on': '2026-11-16'})
    return out, changes


def validate(values, start=None):
    if not values:
        raise ValueError('Empty series')
    start = start or min(values)
    missing = [m for m in months(start) if m not in values]
    if missing:
        raise ValueError('Unapproved missing months: ' + ', '.join(missing))
    if not all(math.isfinite(v) for v in values.values()):
        raise ValueError('Non-finite observation')


def metals():
    checked_source('metals_workbook', 'xlsx')
    ns = {'s': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
    with zipfile.ZipFile(RAW / 'metals_workbook.xlsx') as z:
        strings = [''.join(e.itertext()) for e in ET.fromstring(z.read('xl/sharedStrings.xml'))]
        rows = ET.fromstring(z.read('xl/worksheets/sheet2.xml')).findall('s:sheetData/s:row', ns)
        result = {'gold': {}, 'silver': {}}
        columns = {}
        for row in rows:
            cells = {}
            for c in row:
                v = c.find('s:v', ns)
                if v is not None:
                    cells[re.sub(r'\d', '', c.attrib['r'])] = strings[int(v.text)] if c.attrib.get('t') == 's' else v.text
            for col, value in cells.items():
                if value in ('Gold', 'Silver'):
                    columns[value.lower()] = col
            date = cells.get('A', '')
            if re.fullmatch(r'\d{4}M\d{2}', date) and '1998M12' <= date <= END.replace('-', 'M'):
                for key in result:
                    result[key][date.replace('M', '-')] = float(cells[columns[key]])
        return result


def assemble():
    data = {'schema': 1, 'start': '1998-12', 'end': END, 'assets': {}, 'macro': {},
            'approximations': [], 'sources': {}, 'excluded': {'developed_stocks_candidate': 'VDMIX has no usable history'}}
    for key in ['us_cpi', 'euro_hicp', 'gbpusd', 'eurusd', 'usd_short_rate', 'uk_short_rate_candidate']:
        values, meta = fred(key)
        if key == 'euro_hicp' and END == '2026-10' and END not in values:
            values[END] = values['2026-09']
            data['approximations'].append({'series': key, 'month': END, 'value': values[END],
                'method': 'Provisional carry-forward of September 2026 HICP while October is unpublished',
                'inputs': {'2026-09': values['2026-09']},
                'source': 'https://fred.stlouisfed.org/series/CP0000EZ19M086NEST'})
        if key == 'us_cpi':
            values, changes = patch_cpi(values)
            data['approximations'].extend(changes)
        if key == 'uk_short_rate_candidate':
            values, changes = patch_uk_rate(values)
            data['approximations'].extend(changes)
        validate(values)
        data['macro'][key] = values
        data['sources'][key] = meta

    def asset(key, values, note, source, single=False):
        validate(values)
        if any(v <= 0 for v in values.values()):
            raise ValueError(f'Nonpositive index: {key}')
        first = min(values)
        base = values[first]
        data['assets'][key] = {'name': LABELS.get(key, key.upper()), 'start': first,
                               'values': {m: v / base * 100 for m, v in sorted(values.items())},
                               'note': note, 'source': source, 'singleStock': single}

    stock_keys = {'csco', 'msft', 'intc', 'nok', 'ge', 'c', 'xom', 'bp', 'aapl', 'amzn', 'googl', 'meta'}
    for path in sorted(RAW.glob('*.meta.json')):
        key = path.name.removesuffix('.meta.json')
        meta = json.loads(path.read_text(encoding='utf-8'))
        if meta.get('provider') != 'yahoo' or key == 'nasdaq100_fund':
            continue
        body, meta = checked_source(key, 'json')
        result = json.loads(body)['chart']['result'][0]
        values = {}
        for stamp, price in sorted(zip(result['timestamp'], result['indicators']['adjclose'][0]['adjclose'])):
            month = dt.datetime.fromtimestamp(stamp, dt.timezone.utc).strftime('%Y-%m')
            if '1998-12' <= month <= END and price is not None:
                values[month] = price
        target = {'intl_stocks_candidate': 'intl_stocks', 'nasdaq100_price_only': 'nasdaq100'}.get(key, key)
        note = 'Last available trading-day adjusted close; dividends reinvested; embedded fund expenses retained.'
        currency = result['meta']['currency']
        if currency in ('GBP', 'GBp', 'GBX'):
            values = {m: v * data['macro']['gbpusd'][m] / (100 if currency != 'GBP' else 1) for m, v in values.items()}
            note += ' Converted from ' + currency + ' using last available business-day GBPUSD.'
        elif currency != 'USD':
            raise ValueError(f'Unexpected currency {currency} for {key}')
        if target == 'nasdaq100':
            note = 'Nasdaq-100 price-only index throughout; excludes dividends. No QQQ splice.'
        if target == 'intl_stocks':
            note += ' Includes emerging markets; not a developed-only index.'
        if target == 'developed_stocks':
            note += ' MSCI EAFE developed markets, excluding US and Canada; no emerging markets.'
        if target in ('lifestrategy_growth', 'target_retirement_2050', 'global_stocks_fund'):
            note += ' Actual fund history, including its historical allocation changes and internal rebalancing; no constant-weight reconstruction.'
        if key in stock_keys:
            note += ' Provider-adjusted corporate-action history; spun-off shares are not modelled separately.'
        asset(target, values, note, meta['url'], key in stock_keys)
        data['sources'][target] = meta
    for key in ('lifestrategy_growth', 'target_retirement_2050', 'global_stocks_fund', 'developed_stocks'):
        if key not in data['assets']:
            raise ValueError(f'Required fund snapshot missing: {key}; download it with build-data.py --only {key}')
    for key, values in metals().items():
        asset(key, values, 'World Bank monthly average USD spot price, not month-end. No income or storage costs.',
              json.loads((RAW / 'metals_workbook.meta.json').read_text())['url'])
    data['sources']['metals'] = json.loads((RAW / 'metals_workbook.meta.json').read_text())

    for key, rate_key in [('usd_cash', 'usd_short_rate'), ('gbp_cash', 'uk_short_rate_candidate')]:
        values = {}
        level = 100
        timeline = months('1998-12')
        for i, month in enumerate(timeline):
            if i:
                r = data['macro'][rate_key][timeline[i-1]] / 100
                if key == 'usd_cash':
                    # Convert 91-day bank-discount yield to annual simple investment yield.
                    r = (365 / 360) * r / (1 - r * 91 / 360)
                year, number = map(int, month.split('-'))
                level *= 1 + r * calendar.monthrange(year, number)[1] / 365
            values[month] = level * (data['macro']['gbpusd'][month] if key == 'gbp_cash' else 1)
        asset(key, values, 'Modelled deposits: prior month rate, actual days/365 simple interest compounded monthly. '
              + ('91-day Treasury discount yield converted to investment yield.' if key == 'usd_cash' else
                 'GBP short rate; Feb–Oct 2026 uses 3.75% Bank Rate proxy. Converted to USD.'), data['sources'][rate_key]['url'])
    us = data['assets']['us_stocks']['values']
    intl = data['assets']['intl_stocks']['values']
    asset('global_stocks', {m: .5 * us[m] + .5 * intl[m] for m in us},
          'Synthetic global proxy: equal initial dollar amounts in VFINX and VGTSX, held without internal rebalancing from Dec 1998. Not a world market-cap index.',
          'VFINX + VGTSX')
    payload = json.dumps(data, separators=(',', ':'), ensure_ascii=False, allow_nan=False)
    (ROOT / 'data/series.json').write_text(payload + '\n', encoding='utf-8')
    (ROOT / 'data/series.js').write_text('globalThis.MAMA_DATA=' + payload + ';\n', encoding='utf-8')
    (ROOT / 'data/approximations.json').write_text(json.dumps(data['approximations'], indent=2) + '\n', encoding='utf-8')
    print(f'Built {len(data["assets"])} assets through {END}; {len(data["approximations"])} explicitly labelled estimated/proxy observations.', flush=True)
    return data
