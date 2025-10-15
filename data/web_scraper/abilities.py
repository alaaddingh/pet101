import requests
from typing import List, Optional, Tuple
from urllib.parse import urljoin, quote
import re

from bs4 import BeautifulSoup
from config import CFG
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
import json


class AbilityScraper:
    def __init__(self, session: Optional[requests.Session] = None):
        self.session = session or _make_session()

    def list_ability_original_urls(self, limit: int = 10000) -> List[str]:
        params = {
            "url": f"{CFG['DOMAIN']}/wiki/PetAbility:*",
            "output": "json",
            "fl": "original",
            "collapse": "urlkey",
            "filter": "statuscode:200",
            "limit": str(limit),
        }
        r = self.session.get(CFG["CDX"], params=params, timeout=_timeout_tuple())
        r.raise_for_status()
        rows = r.json()
        if not rows or len(rows) <= 1:
            return []
        return [row[0] for row in rows[1:] if row]

    def build_ability_obj(self, id_url: str) -> dict:
        timeout = _timeout_tuple(default_read=180)
        headers = {"User-Agent": "Mozilla/5.0 (compatible; AbilityScraper/1.0)"}
        resp = self.session.get(id_url, headers=headers, timeout=timeout, allow_redirects=True)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.content, "lxml")

        ts, orig_base = self._extract_snapshot_context(id_url)

        ability = {}
        ability["name"] = self._get_ability_name(id_url, soup)
        ability["icon"] = self._get_icon(soup, ts, orig_base)
        ability["source"] = id_url
        ability["rarity"] = self._get_rarity(soup)

        return ability

    def _get_ability_name(self, url: str, soup: BeautifulSoup) -> Optional[str]:
        m = re.search(r"/PetAbility:([^/?#]+)", url)
        if m:
            return m.group(1).replace("_", " ")
        if soup.title:
            t = soup.title.get_text(strip=True)
            t = t.replace("PetAbility:", "").replace(" - Wizard101 Wiki", "").strip()
            if t:
                return t
        return None
    
    def _get_rarity(self, soup):
        table = soup.select_one("table.infobox, table[class*='infobox']")
        if not table:
            return None
        for tr in table.select("tr"):
            label_cell = tr.find("td") or tr.find("th")
            if not label_cell:
                continue
            if label_cell.get_text(strip=True) == "Rarity":
                val = label_cell.find_next_sibling("td")
                return val.get_text(strip=True) if val else None
        return None

    def _get_icon(self, soup, ts, orig_base):
        img = soup.select_one("table.infobox img, table[class*='infobox'] img")
        if not img:
            img = soup.find("img", alt=lambda v: v and ("(Talent)" in v or "(Derby)" in v or "(PetAbility)" in v))
        if not img or not img.get("src"):
            return None
        src = img.get("src")
        if src.startswith("http://") or src.startswith("https://"):
            return src
        return f"https://{CFG['DOMAIN']}{src}" if src.startswith("/") else f"https://{CFG['DOMAIN']}/{src}"


    def _extract_snapshot_context(self, snap_url: str) -> Tuple[Optional[str], Optional[str]]:
        m = re.search(r"/web/(\d{10,14})", snap_url)
        if not m:
            return None, None
        ts = m.group(1)
        id_url = re.sub(r"/web/(\d{10,14})([^/]*?)/", r"/web/\1id_/", snap_url)
        parts = id_url.split("id_/", 1)
        if len(parts) != 2 or not parts[1]:
            return ts, None
        return ts, parts[1]


 


__all__ = [
    "AbilityScraper",
]


# Internal: shared session + timeouts (parallel to pets.py/spells.py)
def _make_session(total_retries: int = 3, backoff_factor: float = 0.5) -> requests.Session:
    s = requests.Session()
    retry = Retry(
        total=total_retries,
        connect=total_retries,
        read=total_retries,
        backoff_factor=backoff_factor,
        status_forcelist=(429, 500, 502, 503, 504),
        allowed_methods=("GET", "HEAD"),
        raise_on_status=False,
    )
    s.headers.update({"User-Agent": "Mozilla/5.0 (compatible; AbilityScraper/1.0)"})
    s.mount("http://", HTTPAdapter(max_retries=retry))
    s.mount("https://", HTTPAdapter(max_retries=retry))
    return s


def _timeout_tuple(default_read: int = 120) -> Tuple[int, int]:
    t = CFG.get("TIMEOUT", default_read)
    connect = 10
    read = default_read
    if isinstance(t, (list, tuple)) and len(t) == 2:
        try:
            connect, read = int(t[0]), int(t[1])
        except Exception:
            connect, read = 10, default_read
    elif isinstance(t, (int, float)):
        read = int(t)
    return (connect, read)
