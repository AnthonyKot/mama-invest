"""Fetch property evidence for review; never changes the existing portfolio data.

Run in normal PowerShell: python -B scripts/fetch-property-data.py
Snapshots are inputs, not approved assumptions or simulation-ready series.
"""
import argparse
import datetime as dt
import hashlib
import importlib.util
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / 'data/raw/property'
spec = importlib.util.spec_from_file_location('download_helpers', ROOT / 'scripts/build-data.py')
helper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(helper)
SOURCES = {
    'euro_bond_rexp': ('csv', 'https://api.statistiken.bundesbank.de/rest/data/BBK01/WU046A?format=csv'),
    'uk_mortgage_5y': ('csv', 'https://www.bankofengland.co.uk/boeapps/database/_iadb-fromshowcolumns.asp?csv.x=yes&Datefrom=01/Jan/1998&Dateto=31/Oct/2026&SeriesCodes=IUMBV42&CSVF=TN&UsingCodes=Y&VPD=Y&VFD=N'),
    'oecd_housing': ('csv', 'https://sdmx.oecd.org/public/rest/v1/data/OECD.ECO.MPD,DSD_AN_HOUSE_PRICES@DF_HOUSE_PRICES,1.0/?startPeriod=1998&format=csvfile'),
    'nl_prices': ('json', 'https://opendata.cbs.nl/ODataApi/OData/85773NED/TypedDataSet?$format=json'),
    'nl_price_fields': ('json', 'https://opendata.cbs.nl/ODataApi/OData/85773NED/DataProperties?$format=json'),
    'nl_mortgage_early': ('json', 'https://opendata.cbs.nl/ODataApi/OData/37276mfo/TypedDataSet?$format=json'),
    'nl_mortgage_fields': ('json', 'https://opendata.cbs.nl/ODataApi/OData/37276mfo/DataProperties?$format=json'),
    'nl_mortgage_long_fixed': ('csv', 'https://data-api.ecb.europa.eu/service/data/MIR/M.NL.B.A2C.P.R.A.2250.EUR.N?startPeriod=1998-12&format=csvdata'),
    'us_home_level': ('csv', 'https://fred.stlouisfed.org/graph/fredgraph.csv?id=MSPUS'),
    'us_mortgage_30y': ('csv', 'https://fred.stlouisfed.org/graph/fredgraph.csv?id=MORTGAGE30US'),
    'us_mortgage_15y': ('csv', 'https://fred.stlouisfed.org/graph/fredgraph.csv?id=MORTGAGE15US'),
    'plnusd': ('csv', 'https://fred.stlouisfed.org/graph/fredgraph.csv?id=CCUSSP01PLM650N'),
    'euro_deposit': ('csv', 'https://data-api.ecb.europa.eu/service/data/FM/M.U2.EUR.RT.MM.EURIBOR3MD_.HSTA?startPeriod=1998-12&format=csvdata'),
    'pl_deposit': ('csv', 'https://fred.stlouisfed.org/graph/fredgraph.csv?id=IR3TIB01PLM156N'),
    'uk_purchase_1999': ('json', 'https://landregistry.data.gov.uk/data/ukhpi/region/united-kingdom/month/1999-01.json'),
    'uk_purchase_2006': ('json', 'https://landregistry.data.gov.uk/data/ukhpi/region/united-kingdom/month/2006-07.json'),
    'uk_purchase_2007': ('json', 'https://landregistry.data.gov.uk/data/ukhpi/region/united-kingdom/month/2007-07.json'),
}

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--only', nargs='+', choices=list(SOURCES))
    parser.add_argument('--refresh', action='store_true')
    args = parser.parse_args()
    RAW.mkdir(parents=True, exist_ok=True)
    report = []
    for key, (extension, url) in SOURCES.items():
        if args.only and key not in args.only:
            continue
        path = RAW / f'{key}.{extension}'
        meta_path = RAW / f'{key}.meta.json'
        print(key + ': ', end='', flush=True)
        try:
            if not args.refresh and path.exists() and meta_path.exists():
                meta = json.loads(meta_path.read_text(encoding='utf-8'))
                if meta['url'] == url and hashlib.sha256(path.read_bytes()).hexdigest() == meta['sha256']:
                    print('cached')
                    report.append(meta)
                    continue
            body = helper.download(url)
            decoded = body.decode('utf-8-sig')
            if extension == 'json':
                json.loads(decoded)
            elif '<html' in decoded[:1000].lower() or not any(x in decoded.splitlines()[0].lower() for x in ['date', 'dataflow', 'freq', 'key']):
                raise ValueError('Expected CSV; source returned another format')
            if len(body) < 100:
                raise ValueError('Empty or unexpectedly small source response')
            meta = {'key': key, 'url': url, 'sha256': hashlib.sha256(body).hexdigest(),
                    'downloaded_at': dt.datetime.now(dt.timezone.utc).isoformat(),
                    'status': 'downloaded; semantic/source review pending'}
            path.write_bytes(body)
            meta_path.write_text(json.dumps(meta, indent=2)+'\n', encoding='utf-8')
            report.append(meta)
            print('downloaded', flush=True)
        except (OSError, ValueError, KeyError) as error:
            report.append({'key': key, 'url': url, 'status': 'failed', 'error': str(error)})
            print('FAILED: ' + str(error), flush=True)
        (RAW / 'download-report.json').write_text(json.dumps(report, indent=2)+'\n', encoding='utf-8')
    (RAW / 'download-report.json').write_text(json.dumps(report, indent=2)+'\n', encoding='utf-8')
    print('Raw evidence saved to ' + str(RAW) + '. Property results still require source review and assembly.')
    return int(any(r['status'] == 'failed' for r in report))

if __name__ == '__main__':
    raise SystemExit(main())
