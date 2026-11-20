"""Archive Riot's Chinese PC patch notes, including in-place revisions."""
import hashlib
import json
import re
from datetime import datetime
from pathlib import Path
from urllib.parse import urlsplit, urljoin
from urllib.request import Request, urlopen
from zoneinfo import ZoneInfo

from bs4 import BeautifulSoup
from opencc import OpenCC

ROOT = Path(__file__).resolve().parents[1]
ARCHIVE = ROOT / 'dist/patches.json'
NAMES = ROOT / 'dist/names.json'
DDRAGON = 'https://ddragon.leagueoflegends.com'
STATE = ROOT / 'scripts/sources.json'
ORIGIN = 'https://www.leagueoflegends.com'
JST = ZoneInfo('Asia/Tokyo')
cc = OpenCC('tw2sp')
VERSION = re.compile(r'patch-(\d+)-(\d+)([a-z]?)(?:-|/|$)')
LABELS = ['海克斯大乱斗', '斗魂竞技场', '召唤师峡谷', '跨模式与客户端']
KEEP_REVISIONS = 2  # per article: first edition + newest revisions


def fetch_json(url):
    request = Request(url, headers={'User-Agent': 'LoL-Patch-Atlas/1.0'})
    with urlopen(request, timeout=45) as response:
        return json.loads(response.read())


def sync_names():
    """Refresh champion/item name -> image id maps from Data Dragon.

    Names are taken from the zh_TW data and converted with the same OpenCC
    profile as the patch notes, so they match the article text. Entries that
    already exist (e.g. hand-added aliases) are kept unless Data Dragon has
    the same name.
    """
    old = json.loads(NAMES.read_text()) if NAMES.exists() else {}
    try:
        version = fetch_json(f'{DDRAGON}/api/versions.json')[0]
        champions = fetch_json(f'{DDRAGON}/cdn/{version}/data/zh_TW/champion.json')['data']
        items = fetch_json(f'{DDRAGON}/cdn/{version}/data/zh_TW/item.json')['data']
    except Exception as error:  # keep the old table; portraits are optional
        print(f'::warning::Data Dragon unavailable, keeping old name table: {error}')
        return
    champ = {cc.convert(c['name']): c['id'] for c in champions.values()}
    item = {}
    # Prefer items sold in ARAM (map 12), then the lowest id.
    for key, data in sorted(items.items(), key=lambda kv: (not kv[1].get('maps', {}).get('12'), int(kv[0]))):
        item.setdefault(cc.convert(data['name']), key)
    names = dict(version=version,
                 champions={**old.get('champions', {}), **champ},
                 items={**old.get('items', {}), **item})
    NAMES.write_text(json.dumps(names, ensure_ascii=False, separators=(',', ':'), sort_keys=True))


def trim_revisions(archive):
    """Keep each article's first edition and its newest revisions only."""
    kept, seen = [], {}
    for p in sorted(archive, key=lambda p: p['date'], reverse=True):
        source = p['source'].rstrip('/')
        if p['kind'] == '公告修订':
            seen[source] = seen.get(source, 0) + 1
            if seen[source] > KEEP_REVISIONS:
                continue
        kept.append(p)
    return kept


def page(url):
    request = Request(url, headers={'User-Agent': 'LoL-Patch-Atlas/1.0'})
    with urlopen(request, timeout=45) as response:
        return BeautifulSoup(response.read(), 'html.parser')


def discover():
    found = {}
    for path in ['tags/patch-notes/', 'game-updates/']:
        soup = page(f'{ORIGIN}/zh-tw/news/{path}')
        for a in soup.select('a[href]'):
            url = urljoin(ORIGIN, a['href']).rstrip('/') + '/'
            if urlsplit(url).netloc != 'www.leagueoflegends.com' or '/zh-tw/news/game-updates/' not in url:
                continue
            match = VERSION.search(url)
            if match and a.find('time'):
                version = f'{match[1]}.{match[2]}{match[3]}'
                found[url] = version
    if not found:
        raise ValueError('No patch articles found on official indexes')
    return found


def mode_for(title):
    if re.search('mayhem|大混戰|海克斯', title, re.I): return 0
    if re.search('arena|競技場', title, re.I): return 1
    if re.search('classic|經典模式|^patch-aram |^隨機單中$', title, re.I): return None
    if re.search('champions|items|runes|rift|winter-map|jungle|英雄$|裝備$|召喚峽谷', title, re.I): return 2
    return 3


def parse(soup):
    container = soup.select_one('#patch-notes-container')
    if not container:
        raise ValueError('Unrecognized patch article layout')
    modes = [[], [], [], []]
    mode = None
    group = name = skill = ''
    current = None
    for el in container.find_all(['h2','h3','h4','h5','p','li']):
        if el.find_parent('li') or (el.name == 'li' and el.find('li')):
            continue
        raw = ' '.join(el.stripped_strings)
        value = cc.convert(' '.join(raw.split())).replace('⇒','→')
        if el.name == 'h2':
            key = el.get('id','')
            mode = mode_for(key+' '+raw)
            if key in ('patch-top','patch-patch-highlights') or not value: mode = None
            group = name = value
            skill = ''
            current = None
        elif mode is not None and value:
            heading = el.name in ('h3','h4','h5')
            bold_label = el.name == 'p' and el.strong and raw == ' '.join(el.strong.stripped_strings)
            if heading and 'ability-title' in el.get('class',[]):
                skill = value
            elif heading or bold_label:
                if heading and el.name == 'h4' and mode in (0,1): group = value
                submode = mode_for(raw)
                if re.search('版本中|熱修|mid.patch|hotfix',group,re.I) and submode in (0,1,2):
                    mode = submode
                name, skill, current = value, '', None
            else:
                if current is None:
                    current = [group,name,[]]
                    modes[mode].append(current)
                current[2].append((skill+' · ' if skill else '')+value)
    if not any(modes):
        raise ValueError('Parsed patch contains no readable changes')
    return modes


def sync():
    archive = json.loads(ARCHIVE.read_text())
    state = json.loads(STATE.read_text()) if STATE.exists() else {}
    floor = min(p['date'] for p in archive)
    articles = discover()
    latest = sorted({(int(m[1]), int(m[2])) for url in articles if (m := VERSION.search(url))}, reverse=True)[:2]
    first = min(tuple(map(int,re.match(r'(\d+)\.(\d+)',p['version']).groups())) for p in archive)
    failed = parsed = 0
    for url, version in articles.items():
        match = VERSION.search(url)
        # Start with the first edition already in this archive.
        number = (int(match[1]),int(match[2]))
        if number < first or (url in state and number not in latest): continue
        try:
            soup = page(url)
            modes = parse(soup)
            stamp = soup.select_one('time[datetime]')
            if not stamp:
                raise ValueError('Article has no publish time')
        except Exception as error:  # one odd article must not block the rest
            failed += 1
            print(f'::warning::Skipped {url}: {error}')
            continue
        parsed += 1
        digest = hashlib.sha256(json.dumps(modes,ensure_ascii=False).encode()).hexdigest()
        previous = state.get(url)
        if digest == previous: continue
        published = datetime.fromisoformat(stamp['datetime'].replace('Z','+00:00')).astimezone(JST).date().isoformat()
        if published < floor: continue
        existing = any(p['source'].rstrip('/') == url.rstrip('/') for p in archive)
        if previous or not existing:
            revision = existing
            date = datetime.now(JST).date().isoformat() if revision else published
            kind = '公告修订' if revision else ('小补丁' if match[3] or 'hotfix' in url else '正式版本')
            art = soup.select_one('meta[property="og:image"]')
            desc = soup.select_one('meta[property="og:description"], meta[name="description"]')
            lead = cc.convert(' '.join(desc['content'].split())) if desc and desc.get('content') else ''
            archive.insert(0,dict(version=version if not revision else f'{version} · {date} · {digest[:5]}',
                kind=kind,date=date,headline=f'{version} 版本更新' if not revision else f'{version} 官方公告有更新',
                lead=lead if lead and not revision else '按模式查看本次官方公告的完整快照。',source=url,
                art=art['content'] if art else '',modes=modes,
                intro=[f'{label} · {len(rows)} 项' for label,rows in zip(LABELS,modes)]))
        state[url] = digest
    if failed and not parsed:
        raise RuntimeError('Every patch article failed to parse; the page layout may have changed')
    archive = trim_revisions(archive)
    ARCHIVE.write_text(json.dumps(archive,ensure_ascii=False,separators=(',',':')))
    STATE.write_text(json.dumps(state,ensure_ascii=False,indent=2,sort_keys=True)+'\n')
    sync_names()
    if failed:
        print(f'::warning::{failed} article(s) could not be parsed; see warnings above')


if __name__ == '__main__':
    sync()
