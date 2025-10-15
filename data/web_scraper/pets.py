import requests
from typing import List, Optional, Tuple
from urllib.parse import urljoin
import re

from bs4 import BeautifulSoup
from config import CFG
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
import uuid, html, unicodedata



# namespace for uuid generation + helper for uuid string gen
_PET_NS = uuid.uuid5(uuid.NAMESPACE_URL, "wizard101.pet")
def _canon(s: str) -> str:
    s = html.unescape(s or "")
    s = unicodedata.normalize("NFKC", s)
    s = s.strip().lower()
    s = re.sub(r"\s+", " ", s)
    return s

class PetScraper:
    def __init__(self, session: Optional[requests.Session] = None):
        self.session = session or _make_session()

    def list_pet_original_urls(self, limit: int = 5000) -> List[str]:
        params = {
            "url": f"{CFG['DOMAIN']}/wiki/Pet:*",
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

    def build_pet_obj(self, url: str):
        pet = {}

        # fetch and parse
        timeout = _timeout_tuple(default_read=180)
        headers = {"User-Agent": "Mozilla/5.0 (compatible; PetScraper/1.0)"}
        resp = self.session.get(url, headers=headers, timeout=timeout, allow_redirects=True)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.content, "lxml")


        # derive snapshot context from the URL
        ts, orig_base = self._extract_snapshot_context(url)

        # use pet name for unique UUID
        pet_name = self._get_pet_name(soup)
       # print(pet_name)
        pet["ID"] = self._assign_pet_id_from_name(pet_name)
        pet["name"] = pet_name
        pet["icon"] = self._get_icon(soup, ts, orig_base)
        pet["school"] = self._get_school(soup)
        pet["description"] = self._get_description(soup)
        pet["abilities"] = self._get_abilities_titles_only(soup)
        
        pet["pedigree"] = self._get_pedigree(soup)
        pet["cards"] = self._get_cards(soup)
        pet["sell price"] = self._get_sell_price(soup)
        pet["attributes"] = self._get_attributes(soup)
        
   
        return pet


    def _assign_pet_id_from_name(self, name):
        return str(uuid.uuid5(_PET_NS, _canon(name)))

    def _get_pet_name(self, soup):
        title = soup.title.get_text(strip=True) if soup.title else ""
        return title.replace("Pet:", "").replace(" - Wizard101 Wiki", "").strip()

    def _get_school(self, soup):
        label = soup.find("td", string=lambda t: t and "School" in t)
        if label:
            return label.find_next("td").get_text(strip=True)
        return None

    def _get_description(self, soup):
        desc_div = soup.find("div", class_="infobox-plain-heading", string=lambda t: t and "Description" in t)
        desc = desc_div.find_next("p") if desc_div else None
        return desc.get_text(strip=True) if desc else None

    def _get_abilities_titles_only(self, soup):
        table = soup.select_one('table.data-table.ability-list')
        talents, derby = [], []
        if not table:
            return {"talents": talents, "derby": derby}
        for tr in table.select('tr'):
            if tr.find('th'):
                continue
            tds = tr.find_all('td')
            if len(tds) < 2:
                continue
            # Talent
            a1 = tds[0].find('a', href=True)
            img1 = tds[0].find('img')
            if a1 or img1:
                title = (a1.get('title') if a1 and a1.get('title') else None) or \
                        (img1.get('alt') if img1 and img1.get('alt') else None) or \
                        (a1.get_text(strip=True) if a1 else None)
                if title:
                    talents.append(title)
            # Derby
            a2 = tds[1].find('a', href=True)
            img2 = tds[1].find('img')
            if a2 or img2:
                title = (a2.get('title') if a2 and a2.get('title') else None) or \
                        (img2.get('alt') if img2 and img2.get('alt') else None) or \
                        (a2.get_text(strip=True) if a2 else None)
                if title:
                    derby.append(title)
        return {"talents": talents, "derby": derby}
    
    def _get_icon(self, soup, ts: Optional[str], orig_base: Optional[str]) -> Optional[str]:
        img = soup.select_one("table.infobox img, table[class*='infobox'] img")
        if not img:
            img = soup.find("img", alt=lambda v: v and "(Pet)" in v)  # fallback
        if not img or not img.get("src"):
            return None
        src = img.get("src")
        if ts and orig_base:
            return self._normalize_image(src, ts, orig_base)
        return src
    
    def _get_pedigree(self, soup):
        pedigree_title = soup.find("b", string=lambda t: t and "Pedigree" in t)
        if not pedigree_title:
            return None
        cell = pedigree_title.find_next("td")
        if not cell:
            return None
        text = cell.get_text(strip=True)
        m = re.search(r"\d+", text)
        return int(m.group(0)) if m else None
    
    def _get_cards(self, soup):
      bonus_div = soup.find(
        "div",
        string=lambda t: t and ("Bonuses" in t or "Item Cards" in t)
      )
      if not bonus_div:
        return []

      cards = []
      for img in bonus_div.find_all_next("img", class_="pet-spell-image"):
        alt = img.get("alt")
        if not alt:
            continue
        cards.append(alt)

      return cards
    
    def _get_sell_price(self, soup):
        sell_title = soup.find("b", string=lambda t: t and "Sell" in t and "Price" in t)
        if not sell_title:
            return None
        cell = sell_title.find_parent("td")
        if not cell:
            return None
        next_td = cell.find_next_sibling("td")
        if not next_td:
            return None
        return next_td.get_text(" ", strip=True)

    def _get_attributes_fallback(self, soup):
        try:
            hdr = soup.find(["b", "strong"], string=lambda t: t and "Attribute" in t)
            if not hdr:
                return None
            td = hdr.find_parent("td")
            if not td:
                return None
            table = td.find_next_sibling("td").find("table") if td.find_next_sibling("td") else None
            if not table:
                # fallback: collect the next few list items under the same section
                ul = td.find_next_sibling("td").find("ul") if td.find_next_sibling("td") else None
                if ul:
                    return [li.get_text(" ", strip=True) for li in ul.find_all("li")]
                return None
            data = {}
            for tr in table.find_all("tr"):
                th = tr.find(["th","td"]) 
                tds = tr.find_all("td")
                if th and len(tds) >= 1:
                    key = th.get_text(" ", strip=True)
                    val = tds[-1].get_text(" ", strip=True)
                    if key:
                        data[key] = val
            return data or None
        except Exception:
            return None
    

    def _get_attributes(self, soup):
        attr_table = soup.select_one("table.data-table.pet-stats-table")
        if not attr_table:
            return {}
        attributes = {}
        for row in attr_table.select("tr"):
            cells = row.find_all("td")
            if len(cells) >= 4:
                attr_name = cells[2].get_text(strip=True)
                attr_value = cells[3].get_text(strip=True)
                if attr_name and attr_value:
                    attributes[attr_name] = attr_value

        return attributes
            


      

      
    def _extract_snapshot_context(self, snap_url: str) -> Tuple[Optional[str], Optional[str]]:
        m = re.search(r"/web/(\d{10,14})", snap_url)
        if not m:
            return None, None
        ts = m.group(1)
        # ensure id_ so the original URL appears after id_/
        id_url = re.sub(r"/web/(\d{10,14})([^/]*?)/", r"/web/\1id_/", snap_url)
        parts = id_url.split("id_/", 1)
        if len(parts) != 2 or not parts[1]:
            return ts, None
        return ts, parts[1]

    def _normalize_image(self, src: str, ts: str, orig_base: str) -> str:
        abs_url = urljoin(orig_base, src)
        return f"https://web.archive.org/web/{ts}im_/{abs_url}"


        

__all__ = [
    "PetScraper",
]


# Internal: shared session and timeout handling
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
    s.headers.update({"User-Agent": "Mozilla/5.0 (compatible; PetScraper/1.0)"})
    s.mount("http://", HTTPAdapter(max_retries=retry))
    s.mount("https://", HTTPAdapter(max_retries=retry))
    return s


def _timeout_tuple(default_read: int = 120) -> Tuple[int, int]:
    # Accept CFG["TIMEOUT"] as seconds or (connect, read) tuple
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


_SESSION = _make_session()

