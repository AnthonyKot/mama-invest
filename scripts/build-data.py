"""Download auditable source snapshots. Run in an ordinary network-enabled terminal.

Downloads raw evidence and builds simulation-ready series.json. Use --offline
to rebuild from saved evidence without network access.
Standard library only; no API keys or package installation required.
"""
import argparse
import csv
import datetime as dt
import hashlib
import io
import json
import math
from pathlib import Path
import shutil
import subprocess
import time
import urllib.error
import urllib.parse
import urllib.request
import zipfile

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / 'data' / 'raw'
TICKERS = {
    'us_stocks': 'VFINX', 'uk_stocks': 'EWU', 'us_bonds': 'VBMFX',
    'us_intermediate_treasuries': 'VFITX', 'uk_gilts': 'IGLT.L',
    'us_small': 'NAESX', 'intl_stocks_candidate': 'VGTSX',
    'em_stocks': 'VEIEX',
    'nasdaq100_price_only': '^NDX', 'nasdaq100_fund': 'QQQ',
    'reits': 'VGSIX', 'us_long_bonds': 'VUSTX', 'us_tips': 'VIPSX',
    'commodities': 'DBC', 'btc': 'BTC-USD', 'global_stocks_fund': 'VT',
    'lifestrategy_growth': 'VASGX', 'target_retirement_2050': 'VFIFX',
    'developed_stocks': 'EFA',
    **{s.lower(): s for s in ['CSCO', 'MSFT', 'INTC', 'NOK', 'GE',
                              'C', 'XOM', 'BP', 'AAPL', 'AMZN', 'GOOGL', 'META']},
}
FRED = {'us_cpi': 'CPIAUCNS', 'gbpusd': 'DEXUSUK', 'eurusd': 'DEXUSEU',
        'usd_short_rate': 'DTB3', 'uk_short_rate_candidate': 'IR3TIB01GBM156N',
        'euro_hicp': 'CP0000EZ19M086NEST'}
WORLD_BANK = ('https://thedocs.worldbank.org/en/doc/'
              '74e8be41ceb20fa0da750cda2f6b9e4e-0050012026/related/'
              'CMO-Historical-Data-Monthly.xlsx')


def month_range(first, last):
    year, month = map(int, first.split('-'))
    result = []
    while f'{year:04d}-{month:02d}' <= last:
        result.append(f'{year:04d}-{month:02d}')
        year, month = (year + 1, 1) if month == 12 else (year, month + 1)
    return result


def coverage(months, end):
    months = sorted(set(m for m in months if '1998-12' <= m <= end))
    if not months:
        raise ValueError('No observations in requested period')
    return {'start': months[0], 'end': months[-1], 'months': len(months),
            'missing_months': sorted(set(month_range(months[0], end)) - set(months))}


def inspect_source(body, kind, end):
    if kind == 'yahoo':
        payload = json.loads(body)
        results = payload.get('chart', {}).get('result')
        if not results:
            raise ValueError('Provider returned no chart data')
        result = results[0]
        adjusted = result.get('indicators', {}).get('adjclose', [])
        if not adjusted:
            raise ValueError('Adjusted close field absent; raw close is not substituted')
        timestamps = result.get('timestamp', [])
        prices = adjusted[0].get('adjclose', [])
        if len(timestamps) != len(prices):
            raise ValueError('Timestamp and price lengths differ')
        months = []
        for stamp, price in zip(timestamps, prices):
            if price is not None and math.isfinite(price) and price > 0:
                months.append(dt.datetime.fromtimestamp(stamp, dt.timezone.utc).strftime('%Y-%m'))
        return {**coverage(months, end), 'currency': result.get('meta', {}).get('currency'),
                'note': 'Raw daily adjusted prices; monthly conversion and corporate-action review pending'}
    if kind == 'fred':
        rows = list(csv.reader(io.StringIO(body.decode('utf-8-sig'))))
        if not rows or len(rows[0]) != 2 or rows[0][0].lower() not in ('date', 'observation_date'):
            raise ValueError('Expected FRED two-column CSV')
        months = []
        for row in rows[1:]:
            if len(row) == 2 and row[1] not in ('', '.'):
                value = float(row[1])
                dt.date.fromisoformat(row[0])
                if not math.isfinite(value):
                    raise ValueError('Non-finite observation')
                months.append(row[0][:7])
        return coverage(months, end)
    if kind == 'xlsx':
        with zipfile.ZipFile(io.BytesIO(body)) as archive:
            if 'xl/workbook.xml' not in archive.namelist() or archive.testzip():
                raise ValueError('Invalid Excel workbook')
        return {'note': 'Workbook downloaded; gold/silver extraction and coverage review pending'}
    raise ValueError('Unknown source type')


def sources(end):
    start_stamp = int(dt.datetime(1998, 12, 1, tzinfo=dt.timezone.utc).timestamp())
    end_date = dt.date.fromisoformat(end + '-01')
    next_month = (end_date.replace(day=28) + dt.timedelta(days=4)).replace(day=1)
    end_stamp = int(dt.datetime.combine(next_month, dt.time(), dt.timezone.utc).timestamp())
    for key, ticker in TICKERS.items():
        query = urllib.parse.urlencode({'period1': start_stamp, 'period2': end_stamp,
                                       'interval': '1d', 'events': 'div,splits,capitalGains'})
        yield key, 'yahoo', f'https://query1.finance.yahoo.com/v8/finance/chart/{urllib.parse.quote(ticker)}?{query}', ticker, 'json'
    for key, series_id in FRED.items():
        yield key, 'fred', f'https://fred.stlouisfed.org/graph/fredgraph.csv?id={series_id}', series_id, 'csv'
    yield 'metals_workbook', 'xlsx', WORLD_BANK, 'World Bank Pink Sheet', 'xlsx'


def download(url):
    # Use Windows curl for FRED connection compatibility and World Bank's
    # certificate chain. Keep TLS verification and normal proxy settings intact.
    host = urllib.parse.urlsplit(url).hostname
    if host in ('fred.stlouisfed.org', 'thedocs.worldbank.org'):
        executable = shutil.which('curl.exe') or shutil.which('curl')
        if not executable:
            raise ValueError(f'{host} download requires curl; executable not found')
        try:
            result = subprocess.run(
                [executable, '--fail', '--location', '--silent', '--show-error',
                 '--connect-timeout', '15', '--max-time', '45',
                 '--retry', '2', '--retry-delay', '2', url],
                capture_output=True, timeout=150, check=False)
        except subprocess.TimeoutExpired:
            raise ValueError(f'{host} curl download exceeded 150 seconds') from None
        if result.returncode:
            detail = result.stderr.decode('utf-8', errors='replace').strip()
            raise ValueError(f'{host} curl failed (exit {result.returncode}): {detail}')
        return result.stdout
    for attempt in range(3):
        try:
            request = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 mama-invest research'})
            with urllib.request.urlopen(request, timeout=30) as response:
                return response.read()
        except urllib.error.HTTPError as error:
            if error.code not in (429, 500, 502, 503, 504) or attempt == 2:
                raise ValueError(f'HTTP {error.code}') from None
        except (urllib.error.URLError, TimeoutError, OSError) as error:
            reason = getattr(error, 'reason', error)
            detail = f'{type(reason).__name__}: {reason}'
            if attempt == 2:
                raise ValueError('Connection failed after three attempts — ' + detail) from None
            print(f'\n  Attempt {attempt + 1}/3 failed ({detail}); retrying...', flush=True)
        time.sleep(2 ** (attempt + 1))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--refresh', action='store_true', help='Redownload cached snapshots')
    parser.add_argument('--only', nargs='+', help='Download selected source keys only')
    parser.add_argument('--offline', action='store_true', help='Build series.json from saved source snapshots without network access')
    parser.add_argument('--download-only', action='store_true', help='Download raw evidence without assembling the site data')
    args = parser.parse_args()
    def build_saved():
        from assemble_data import assemble
        assemble()
        check = ROOT / 'scripts' / 'sanity.cjs'
        if check.exists():
            result = subprocess.run(['node', str(check)], cwd=ROOT, capture_output=True, text=True, encoding='utf-8')
            (ROOT / 'data' / 'sanity-checks.txt').write_text(result.stdout + result.stderr, encoding='utf-8')
            print(result.stdout, end='')
            if result.returncode:
                raise SystemExit(result.returncode)
        ranges = ROOT / 'scripts' / 'build-ranges.cjs'
        if ranges.exists():
            subprocess.run(['node', str(ranges)], cwd=ROOT, check=True)
        if (ROOT / 'data/raw/property/oecd_housing.meta.json').exists():
            from assemble_property import assemble as assemble_property
            assemble_property()
        return 0
    if args.offline:
        if args.only or args.refresh or args.download_only:
            parser.error('--offline cannot be combined with download options')
        return build_saved()
    end = (dt.date.today().replace(day=1) - dt.timedelta(days=1)).strftime('%Y-%m')
    available = list(sources(end))
    unknown = set(args.only or []) - {item[0] for item in available}
    if unknown:
        parser.error('Unknown source keys: ' + ', '.join(sorted(unknown)))
    RAW.mkdir(parents=True, exist_ok=True)
    report = {'requested_end': end, 'stage': 'raw-download-only', 'sources': []}
    problems = 0
    for key, kind, url, identifier, extension in available:
        if args.only and key not in args.only:
            continue
        path = RAW / f'{key}.{extension}'
        metadata_path = RAW / f'{key}.meta.json'
        entry = {'key': key, 'provider': kind, 'identifier': identifier, 'url': url,
                 'path': path.relative_to(ROOT).as_posix()}
        print(f'{key}: ', end='', flush=True)
        try:
            cached = False
            if path.exists() and metadata_path.exists() and not args.refresh:
                old = json.loads(metadata_path.read_text(encoding='utf-8'))
                body = path.read_bytes()
                cached = (old.get('requested_end') == end and
                          old.get('sha256') == hashlib.sha256(body).hexdigest())
            if not cached:
                body = download(url)
            details = inspect_source(body, kind, end)
            entry.update(details)
            entry.update({'sha256': hashlib.sha256(body).hexdigest(), 'requested_end': end,
                          'downloaded_at': old['downloaded_at'] if cached else dt.datetime.now(dt.timezone.utc).isoformat(),
                          'status': 'incomplete' if details.get('missing_months') else 'downloaded'})
            # Keep valid source snapshots even when their coverage is incomplete.
            if not cached:
                temporary = path.with_suffix(path.suffix + '.tmp')
                temporary.write_bytes(body)
                temporary.replace(path)
            metadata_path.write_text(json.dumps(entry, indent=2) + '\n', encoding='utf-8')
            if entry['status'] == 'incomplete':
                problems += 1
            print(f"{entry['status']} {details.get('start', '')} {details.get('end', '')}" + (' (cached)' if cached else ''))
        except (ValueError, OSError, KeyError, TypeError, zipfile.BadZipFile) as error:
            entry.update({'status': 'failed', 'error': str(error)})
            problems += 1
            print('FAILED: ' + str(error))
        report['sources'].append(entry)
        (RAW / 'download-report.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print(f'\nReport: {RAW / "download-report.json"}')
    print(f'{problems} raw sources failed or have missing months (approved estimates are applied only in the derived data).')
    if not args.only and not args.download_only:
        return build_saved()
    print('Download-only run: series.json was not regenerated.')
    return 1 if problems else 0


if __name__ == '__main__':
    raise SystemExit(main())
